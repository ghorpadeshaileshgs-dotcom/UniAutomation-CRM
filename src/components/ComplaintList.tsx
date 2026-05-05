import React, { useState, useMemo } from 'react';
import { Complaint, ComplaintSeverity, ComplaintStatus } from '../types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Plus, Eye, Trash2, MoreVertical, AlertTriangle, RotateCcw, Clock, CheckCircle2, TrendingDown } from 'lucide-react';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ExportActions from './ExportActions';

interface ComplaintListProps {
  complaints: Complaint[];
  onView: (complaint: Complaint) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

const SLA_DAYS: Record<ComplaintSeverity, number> = { Critical: 10, Major: 21, Minor: 30 };

function getSeverityColor(s: ComplaintSeverity) {
  if (s === 'Critical') return 'bg-red-100 text-red-700 border-red-200';
  if (s === 'Major') return 'bg-amber-100 text-amber-700 border-amber-200';
  return 'bg-blue-100 text-blue-700 border-blue-200';
}

function getStatusBadge(status: ComplaintStatus) {
  const map: Record<string, string> = {
    'Open': 'text-red-600 border-red-200 bg-red-50',
    'Acknowledged': 'text-sky-600 border-sky-200 bg-sky-50',
    'Containment Done': 'text-violet-600 border-violet-200 bg-violet-50',
    'Under Investigation': 'text-amber-600 border-amber-200 bg-amber-50',
    'CAPA Submitted': 'text-orange-600 border-orange-200 bg-orange-50',
    'Verification Pending': 'text-blue-600 border-blue-200 bg-blue-50',
    'Closed': 'text-green-600 border-green-200 bg-green-50',
    'Re-Opened': 'text-red-600 border-red-200 bg-red-50',
  };
  return <Badge variant="outline" className={`text-xs ${map[status] || ''}`}>{status}</Badge>;
}

export default function ComplaintList({ complaints, onView, onDelete, onAdd }: ComplaintListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const today = new Date();

  const filtered = complaints.filter(c =>
    c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.complaintId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.productType || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // ── KPI calculations ──────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalOpen = complaints.filter(c => c.status !== 'Closed').length;

    const overdue = complaints.filter(c => {
      if (c.effectivenessResult === 'Effective') return false;
      if (!c.verificationDueDate) return false;
      return c.verificationDueDate.toDate() < today && c.status !== 'Closed';
    }).length;

    const criticalOpen = complaints.filter(c => c.severity === 'Critical' && c.status !== 'Closed').length;
    const repeatCount = complaints.filter(c => c.isRepeatComplaint).length;

    // Avg TAT for closed this month
    const thisMonthStart = startOfMonth(today);
    const thisMonthEnd = endOfMonth(today);
    const closedThisMonth = complaints.filter(c =>
      c.status === 'Closed' && c.closureDate &&
      isWithinInterval(c.closureDate.toDate(), { start: thisMonthStart, end: thisMonthEnd }) &&
      c.turnaroundTime != null
    );
    const avgTat = closedThisMonth.length > 0
      ? (closedThisMonth.reduce((s, c) => s + (c.turnaroundTime || 0), 0) / closedThisMonth.length).toFixed(1)
      : 'N/A';

    // % Closed within SLA
    const closedAll = complaints.filter(c => c.status === 'Closed' && c.turnaroundTime != null);
    const withinSla = closedAll.filter(c => c.turnaroundTime! <= SLA_DAYS[c.severity]).length;
    const slaPercent = closedAll.length > 0 ? Math.round((withinSla / closedAll.length) * 100) : null;

    return { totalOpen, overdue, criticalOpen, repeatCount, avgTat, slaPercent };
  }, [complaints]);

  // ── 6-month trend chart ──────────────────────────────────────────
  const trendData = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(today, 5 - i);
      return { label: format(d, 'MMM yy'), start: startOfMonth(d), end: endOfMonth(d) };
    });
    return months.map(m => {
      const inMonth = complaints.filter(c =>
        isWithinInterval(c.complaintDate.toDate(), { start: m.start, end: m.end })
      );
      return {
        month: m.label,
        Critical: inMonth.filter(c => c.severity === 'Critical').length,
        Major: inMonth.filter(c => c.severity === 'Major').length,
        Minor: inMonth.filter(c => c.severity === 'Minor').length,
      };
    });
  }, [complaints]);

  const exportData = filtered.map(c => ({
    complaint_id: c.complaintId,
    customer: c.customerName,
    severity: c.severity,
    type: c.complaintType,
    status: c.status,
    date: format(c.complaintDate.toDate(), 'dd/MM/yyyy'),
    assigned_to: c.assignedTo,
    tat_days: c.turnaroundTime ?? '',
    repeat: c.isRepeatComplaint ? 'Yes' : 'No',
  }));

  return (
    <div className="space-y-6">
      {/* ── KPI Row ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard icon={<AlertTriangle className="text-red-500" size={18} />} label="Open" value={kpis.totalOpen} color="bg-red-50 border-red-200" />
        <KpiCard icon={<Clock className="text-orange-500" size={18} />} label="Overdue" value={kpis.overdue} color="bg-orange-50 border-orange-200" />
        <KpiCard icon={<AlertTriangle className="text-red-700" size={18} />} label="Critical Open" value={kpis.criticalOpen} color="bg-red-50 border-red-300" />
        <KpiCard icon={<RotateCcw className="text-amber-500" size={18} />} label="Repeat" value={kpis.repeatCount} color="bg-amber-50 border-amber-200" />
        <KpiCard icon={<CheckCircle2 className="text-green-500" size={18} />} label="Avg TAT (days)" value={kpis.avgTat} color="bg-green-50 border-green-200" />
        <KpiCard icon={<TrendingDown className="text-blue-500" size={18} />} label="Within SLA %" value={kpis.slaPercent != null ? `${kpis.slaPercent}%` : 'N/A'} color="bg-blue-50 border-blue-200" />
      </div>

      {/* ── Trend Chart ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Complaints by Month (Last 6 Months)</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={trendData} barCategoryGap="30%">
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Critical" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Major" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Minor" stackId="a" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Search + Actions ──────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input placeholder="Search complaints, customers, products..." className="pl-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <ExportActions data={exportData} fileName="complaints_report" title="Customer Complaints Report" />
          <Button onClick={onAdd} className="flex-1 sm:flex-initial">
            <Plus size={18} className="mr-2" />Register Complaint
          </Button>
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold">Complaint ID</TableHead>
              <TableHead className="font-semibold">Customer</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Severity</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Assigned To</TableHead>
              <TableHead className="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-500">No complaints found.</TableCell>
              </TableRow>
            ) : (
              filtered.map(complaint => (
                <TableRow key={complaint.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-mono text-xs font-bold text-slate-600">
                    {complaint.complaintId}
                    {complaint.isRepeatComplaint && (
                      <Badge className="ml-1 text-[10px] bg-orange-100 text-orange-600 border-orange-200">REPEAT</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">{complaint.customerName}</span>
                      <span className="text-xs text-slate-500">{complaint.productType}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{complaint.complaintType}</TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${getSeverityColor(complaint.severity)}`}>{complaint.severity}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {format(complaint.complaintDate.toDate(), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>{getStatusBadge(complaint.status)}</TableCell>
                  <TableCell className="text-sm text-slate-600">{complaint.assignedTo || 'Unassigned'}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <MoreVertical size={18} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(complaint)}>
                          <Eye size={14} className="mr-2 text-blue-600" />View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(complaint.id)} className="text-red-600">
                          <Trash2 size={14} className="mr-2" />Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  return (
    <Card className={`border ${color} shadow-sm`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-slate-500 font-medium">{label}</span></div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </CardContent>
    </Card>
  );
}
