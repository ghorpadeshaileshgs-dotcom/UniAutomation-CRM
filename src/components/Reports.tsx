import React, { useState, useMemo } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  IndianRupee,
  Filter,
  ShieldCheck
} from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { Lead, Task, Debtor, UserProfile, DesignReview } from '../types';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface ReportsProps {
  leads: Lead[];
  tasks: Task[];
  debtors: Debtor[];
  designReviews: DesignReview[];
  team: UserProfile[];
}

type ReportType = 'Leads' | 'Tasks' | 'Payments' | 'Design';

import ExportActions from './ExportActions';

export default function Reports({ leads, tasks, debtors, designReviews, team }: ReportsProps) {
  const [reportType, setReportType] = useState<ReportType>('Leads');

  const leadReportData = useMemo(() => {
    return leads.map(l => ({
      customer: l.customerName,
      contact: l.contactPerson,
      industry: l.industry,
      region: l.region,
      stage: l.stage,
      value: l.estimatedValue,
      probability: l.probability,
      sales_person: l.salespersonName,
      created_date: l.createdAt
    }));
  }, [leads]);

  const taskReportData = useMemo(() => {
    return tasks.map(t => ({
      related_to: t.relatedTo,
      customer_lead: t.customerName || 'General',
      activity_type: t.type,
      summary: t.summary,
      next_action: t.nextAction,
      due_date: t.nextActionDate,
      owner: t.owner,
      status: t.status,
      authorized_by: t.authorizedBy || 'N/A'
    }));
  }, [tasks]);

  const paymentReportData = useMemo(() => {
    return debtors.map(d => ({
      customer: d.customerName,
      invoice_number: d.invoiceNumber,
      amount: d.amount,
      due_date: d.dueDate,
      status: d.status,
      sales_person: d.salespersonName
    }));
  }, [debtors]);

  const designReportData = useMemo(() => {
    return designReviews.map(r => ({
      customer: r.customerName,
      requested_by: r.requestedBy,
      assigned_to: r.assignedTo,
      request_date: r.requestDate,
      status: r.feasibilityStatus,
      response_date: r.responseDate || 'N/A',
      tat_hours: r.turnaroundTime || 0,
      remarks: r.responseRemarks || ''
    }));
  }, [designReviews]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Reports & Analytics</h2>
          <p className="text-slate-500 text-sm">Generate and export detailed business reports.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={reportType} onValueChange={(v) => setReportType(v as ReportType)}>
            <SelectTrigger className="w-[180px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Leads">Leads Report</SelectItem>
              <SelectItem value="Tasks">Tasks Report</SelectItem>
              <SelectItem value="Payments">Payments Report</SelectItem>
              <SelectItem value="Design">Design Reviews Report</SelectItem>
            </SelectContent>
          </Select>
          <ExportActions 
            data={
              reportType === 'Leads' ? leadReportData :
              reportType === 'Tasks' ? taskReportData :
              reportType === 'Payments' ? paymentReportData :
              designReportData
            } 
            fileName={`${reportType}_Report`} 
            title={`${reportType} Detailed Report`} 
          />
        </div>
      </div>

      {reportType === 'Leads' && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="text-blue-600" />
              Lead Performance Report
            </CardTitle>
            <CardDescription>Detailed breakdown of all active and closed leads.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Value</TableHead>
                  <TableHead>Sales Person</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map(l => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.customerName}</TableCell>
                    <TableCell>{l.industry}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{l.stage}</Badge>
                    </TableCell>
                    <TableCell>₹{l.estimatedValue.toLocaleString()}</TableCell>
                    <TableCell>{l.salespersonName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {reportType === 'Tasks' && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="text-green-600" />
              Task Activity Report
            </CardTitle>
            <CardDescription>Tracking team activities and follow-up performance.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Related To</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Next Action</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map(t => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Badge variant="outline">{t.relatedTo}</Badge>
                    </TableCell>
                    <TableCell>{t.customerName || 'N/A'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{t.nextAction}</TableCell>
                    <TableCell>{format(t.nextActionDate.toDate(), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>{t.owner}</TableCell>
                    <TableCell>
                      <Badge className={t.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}>
                        {t.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {reportType === 'Payments' && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="text-emerald-600" />
              Payment Collection Report
            </CardTitle>
            <CardDescription>Status of outstanding invoices and collection efficiency.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sales Person</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {debtors.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.customerName}</TableCell>
                    <TableCell>{d.invoiceNumber}</TableCell>
                    <TableCell>₹{d.amount.toLocaleString()}</TableCell>
                    <TableCell>{format(d.dueDate.toDate(), 'MMM dd, yyyy')}</TableCell>
                    <TableCell>
                      <Badge className={d.status === 'Paid' ? 'bg-green-100 text-green-700' : d.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}>
                        {d.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{d.salespersonName}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {reportType === 'Design' && (
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="text-purple-600" />
              Design Review Report
            </CardTitle>
            <CardDescription>Technical feasibility reviews and turnaround time analysis.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Requested By</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>TAT (h)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {designReviews.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.customerName}</TableCell>
                    <TableCell>{r.requestedBy}</TableCell>
                    <TableCell>{r.assignedTo}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{r.feasibilityStatus}</Badge>
                    </TableCell>
                    <TableCell>{r.turnaroundTime || 'N/A'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
