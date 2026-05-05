import React, { useState } from 'react';
import { Complaint, ComplaintStatus, Employee } from '../types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import {
  AlertCircle, Clock, CheckCircle2, ArrowLeft, Calendar,
  User, Tag, FileText, ShieldAlert, FileDown, Printer
} from 'lucide-react';
import { toast } from 'sonner';
import ExportActions from './ExportActions';
import AuditHistory from './AuditHistory';
import ComplaintTimeline from './ComplaintTimeline';

interface ComplaintDetailsProps {
  complaint: Complaint;
  employees: Employee[];
  onUpdate: (id: string, updates: Partial<Complaint>) => Promise<void>;
  onBack: () => void;
}

const STATUS_LIST: ComplaintStatus[] = [
  'Open','Acknowledged','Containment Done','Under Investigation',
  'CAPA Submitted','Verification Pending','Closed','Re-Opened'
];

const CAPA_ELIGIBLE: ComplaintStatus[] = ['CAPA Submitted','Verification Pending','Closed','Re-Opened'];

function generate8DReport(complaint: Complaint): string {
  const fmt = (ts: any) => ts ? format(ts.toDate(), 'dd MMM yyyy') : 'N/A';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>8D Report — ${complaint.complaintId}</title>
  <style>
    @media print { body { margin: 0; } }
    body { font-family: Arial, sans-serif; font-size: 12px; color: #000; background: #fff; padding: 20px; }
    h1 { font-size: 18px; border-bottom: 2px solid #000; padding-bottom: 8px; }
    h2 { font-size: 13px; background: #000; color: #fff; padding: 4px 8px; margin: 16px 0 6px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
    td, th { border: 1px solid #000; padding: 5px 8px; vertical-align: top; }
    th { background: #eee; font-weight: bold; width: 28%; }
    .header-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px; border: 1px solid #000; padding: 8px; }
    .hf { display: flex; flex-direction: column; }
    .hf label { font-size: 10px; font-weight: bold; text-transform: uppercase; color: #555; }
    .hf span { font-size: 12px; font-weight: bold; }
    .print-btn { display: inline-block; margin: 12px 0; padding: 8px 20px; background: #000; color: #fff; border: none; cursor: pointer; font-size: 13px; }
    @media print { .print-btn { display: none; } }
  </style></head><body>
  <h1>8D Problem Solving Report</h1>
  <div class="header-grid">
    <div class="hf"><label>Company</label><span>UniAutomation Pvt. Ltd.</span></div>
    <div class="hf"><label>Complaint ID</label><span>${complaint.complaintId}</span></div>
    <div class="hf"><label>Date</label><span>${fmt(complaint.complaintDate)}</span></div>
    <div class="hf"><label>Customer</label><span>${complaint.customerName}</span></div>
    <div class="hf"><label>Part No.</label><span>${complaint.partNo || 'N/A'}</span></div>
    <div class="hf"><label>Severity</label><span>${complaint.severity}</span></div>
  </div>
  <button class="print-btn" onclick="window.print()">🖨 Print / Save as PDF</button>

  <h2>D1 — Team</h2>
  <table><tr><th>Assigned To (Lead)</th><td>${complaint.assignedTo || 'N/A'}</td></tr>
  <tr><th>RCA Team Members</th><td>${complaint.rcaTeamMembers || 'N/A'}</td></tr></table>

  <h2>D2 — Problem Description</h2>
  <table><tr><th>Description</th><td>${complaint.description}</td></tr>
  <tr><th>Type</th><td>${complaint.complaintType}</td></tr>
  <tr><th>Quantity Affected</th><td>${complaint.quantityAffected ?? 'N/A'}</td></tr>
  <tr><th>Batch / Serial</th><td>${complaint.batchNumber || 'N/A'} / ${complaint.serialNumber || 'N/A'}</td></tr></table>

  <h2>D3 — Containment Action</h2>
  <table><tr><th>Action</th><td>${complaint.containmentAction || 'N/A'}</td></tr>
  <tr><th>Owner</th><td>${complaint.containmentOwner || 'N/A'}</td></tr>
  <tr><th>Containment Date</th><td>${fmt(complaint.containmentDate)}</td></tr>
  <tr><th>Status</th><td>${complaint.containmentStatus || 'Pending'}</td></tr></table>

  <h2>D4 — Root Cause</h2>
  <table><tr><th>RCA Method</th><td>${complaint.rcaMethod || 'N/A'}</td></tr>
  <tr><th>Root Cause</th><td>${complaint.rootCause || 'N/A'}</td></tr>
  <tr><th>Contributing Factors</th><td>${complaint.contributingFactors || 'N/A'}</td></tr>
  <tr><th>Escape Point</th><td>${complaint.escapePoint || 'N/A'}</td></tr></table>

  <h2>D5 — Corrective Action</h2>
  <table><tr><th>Corrective Action</th><td>${complaint.correctiveAction || 'N/A'}</td></tr>
  <tr><th>Owner</th><td>${complaint.correctiveActionOwner || 'N/A'}</td></tr>
  <tr><th>Target Date</th><td>${fmt(complaint.correctiveActionTargetDate)}</td></tr></table>

  <h2>D6 — Implementation</h2>
  <table><tr><th>CA Done Date</th><td>${fmt(complaint.correctiveActionDoneDate)}</td></tr>
  <tr><th>Process / Document Updated</th><td>${complaint.processDocumentUpdated || 'N/A'}</td></tr></table>

  <h2>D7 — Preventive Action & Effectiveness</h2>
  <table><tr><th>Preventive Action</th><td>${complaint.preventiveAction || 'N/A'}</td></tr>
  <tr><th>Effectiveness Result</th><td>${complaint.effectivenessResult || 'Pending'}</td></tr>
  <tr><th>Verification Date</th><td>${fmt(complaint.verificationDate)}</td></tr>
  <tr><th>Verified By</th><td>${complaint.verifiedBy || 'N/A'}</td></tr></table>

  <h2>D8 — Closure & Customer Communication</h2>
  <table><tr><th>Closure Date</th><td>${fmt(complaint.closureDate)}</td></tr>
  <tr><th>Customer Accepted</th><td>${complaint.customerAccepted ? 'Yes' : 'No'}</td></tr>
  <tr><th>Turnaround Time</th><td>${complaint.turnaroundTime != null ? `${complaint.turnaroundTime} days` : 'N/A'}</td></tr>
  <tr><th>Customer Notified Date</th><td>${fmt(complaint.customerNotifiedDate)}</td></tr></table>

  <p style="margin-top:24px;font-size:10px;color:#555;">Generated by SensorCRM Pro — UniAutomation Pvt. Ltd. | ${new Date().toLocaleString('en-IN')}</p>
  </body></html>`;
}

export default function ComplaintDetails({ complaint, employees, onUpdate, onBack }: ComplaintDetailsProps) {
  const [updates, setUpdates] = useState<Partial<Complaint>>({
    status: complaint.status,
    rootCause: complaint.rootCause || '',
    correctiveAction: complaint.correctiveAction || '',
    preventiveAction: complaint.preventiveAction || '',
    assignedToId: complaint.assignedToId || '',
    assignedTo: complaint.assignedTo || ''
  });
  const [remarks, setRemarks] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const show8D = CAPA_ELIGIBLE.includes(complaint.status);

  const handle8DReport = () => {
    const html = generate8DReport(complaint);
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(complaint.id, { ...updates, ...(remarks ? { remarks } : {}) } as any);
      toast.success('Complaint updated successfully');
    } catch (err: any) {
      toast.error('Failed to update: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const exportData = [
    { Field: 'Complaint ID', Value: complaint.complaintId },
    { Field: 'Customer', Value: complaint.customerName },
    { Field: 'Date', Value: format(complaint.complaintDate.toDate(), 'PPP') },
    { Field: 'Type', Value: complaint.complaintType },
    { Field: 'Severity', Value: complaint.severity },
    { Field: 'Status', Value: complaint.status },
    { Field: 'Description', Value: complaint.description },
    { Field: 'Root Cause', Value: complaint.rootCause || '' },
    { Field: 'Corrective Action', Value: complaint.correctiveAction || '' },
    { Field: 'Preventive Action', Value: complaint.preventiveAction || '' },
  ];

  const getStatusIcon = (status: ComplaintStatus) => {
    switch (status) {
      case 'Open': return <AlertCircle className="text-red-500" />;
      case 'Under Investigation': return <Clock className="text-amber-500" />;
      case 'CAPA Submitted': return <ShieldAlert className="text-orange-500" />;
      case 'Closed': return <CheckCircle2 className="text-green-500" />;
      default: return <Clock className="text-slate-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={18} className="mr-2" />Back to List
        </Button>
        <h2 className="text-2xl font-bold text-slate-900">Complaint Details</h2>
        <Badge variant="outline" className="font-mono text-xs">{complaint.complaintId}</Badge>
        {complaint.isRepeatComplaint && (
          <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">⚠ Repeat</Badge>
        )}
        <div className="ml-auto flex items-center gap-2">
          {show8D && (
            <Button variant="outline" size="sm" onClick={handle8DReport}>
              <Printer size={16} className="mr-2" />Generate 8D Report
            </Button>
          )}
          <ExportActions data={exportData} fileName={`complaint_${complaint.complaintId}`} title="Customer Quality Report" subtitle={`${complaint.customerName} | Severity: ${complaint.severity}`} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <FileText size={18} className="text-primary" />Basic Information
            </h3>
            <div className="space-y-3">
              <InfoItem icon={<User size={14} />} label="Customer" value={complaint.customerName} />
              <InfoItem icon={<Tag size={14} />} label="Part No." value={complaint.partNo || 'N/A'} />
              <InfoItem icon={<Tag size={14} />} label="Product" value={complaint.productType || 'N/A'} />
              <InfoItem icon={<Calendar size={14} />} label="Date" value={format(complaint.complaintDate.toDate(), 'MMM dd, yyyy')} />
              <InfoItem icon={<AlertCircle size={14} />} label="Type" value={complaint.complaintType} />
              <InfoItem icon={<ShieldAlert size={14} />} label="Severity" value={complaint.severity} />
              {complaint.quantityAffected != null && (
                <InfoItem icon={<Tag size={14} />} label="Qty Affected" value={String(complaint.quantityAffected)} />
              )}
              {complaint.batchNumber && (
                <InfoItem icon={<Tag size={14} />} label="Batch" value={complaint.batchNumber} />
              )}
            </div>
            <div className="pt-4 border-t">
              <Label className="text-xs text-slate-500 uppercase font-bold">Description</Label>
              <p className="mt-1 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">"{complaint.description}"</p>
            </div>
          </div>

          <AuditHistory auditData={complaint} />

          {complaint.status === 'Closed' && (
            <div className="bg-green-50 p-6 rounded-xl border border-green-100 space-y-3">
              <h3 className="font-bold text-green-900 flex items-center gap-2"><CheckCircle2 size={18} />Resolution Summary</h3>
              <div className="space-y-2 text-sm text-green-800">
                <div className="flex justify-between">
                  <span>Closed On:</span>
                  <span className="font-bold">{complaint.closureDate ? format(complaint.closureDate.toDate(), 'MMM dd, yyyy') : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>TAT:</span>
                  <span className="font-bold">{complaint.turnaroundTime} days</span>
                </div>
                <div className="flex justify-between">
                  <span>Effectiveness:</span>
                  <span className="font-bold">{complaint.effectivenessResult || 'Pending'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Customer Accepted:</span>
                  <span className="font-bold">{complaint.customerAccepted ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="investigation" className="space-y-4">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="investigation">Investigation &amp; Actions</TabsTrigger>
              <TabsTrigger value="history">History &amp; Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="investigation">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 flex items-center gap-2">
                    {getStatusIcon(updates.status as ComplaintStatus)}Investigation &amp; Resolution
                  </h3>
                  <div className="w-52">
                    <Select value={updates.status} onValueChange={(val: ComplaintStatus) => setUpdates({ ...updates, status: val })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_LIST.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Assigned To</Label>
                  <Select value={updates.assignedToId} onValueChange={val => {
                    const emp = employees.find(e => e.id === val);
                    setUpdates({ ...updates, assignedToId: val, assignedTo: emp?.name || '' });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Assign to Employee" /></SelectTrigger>
                    <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.departmentName})</SelectItem>)}</SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label>Root Cause Analysis</Label>
                    <Textarea rows={3} value={updates.rootCause} onChange={e => setUpdates({ ...updates, rootCause: e.target.value })} placeholder="Why did this occur?" />
                  </div>
                  <div className="space-y-1">
                    <Label>Corrective Action</Label>
                    <Textarea rows={3} value={updates.correctiveAction} onChange={e => setUpdates({ ...updates, correctiveAction: e.target.value })} placeholder="What was done to fix the issue?" />
                  </div>
                  <div className="space-y-1">
                    <Label>Preventive Action</Label>
                    <Textarea rows={3} value={updates.preventiveAction} onChange={e => setUpdates({ ...updates, preventiveAction: e.target.value })} placeholder="How will we prevent recurrence?" />
                  </div>
                  <div className="space-y-1">
                    <Label>Remarks for this status change</Label>
                    <Textarea rows={2} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add notes for the history log..." />
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t">
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Progress'}
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="history">
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                  <Clock size={18} className="text-primary" />Complaint History &amp; Timeline
                </h3>
                <ComplaintTimeline complaint={complaint} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="text-slate-400">{icon}</div>
      <span className="text-slate-500 w-24 shrink-0">{label}:</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
