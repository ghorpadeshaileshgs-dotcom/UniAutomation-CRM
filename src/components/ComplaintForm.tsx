import React, { useState } from 'react';
import { Complaint, ComplaintSource, ComplaintType, ComplaintSeverity, ComplaintStatus, RCAMethod, EffectivenessResult, Customer, Employee, Part } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ComplaintFormProps {
  customers: Customer[];
  employees: Employee[];
  parts: Part[];
  onSubmit: (complaint: Omit<Complaint, 'id' | 'createdAt'>) => Promise<any>;
  onCancel: () => void;
  initialData?: Complaint;
}

const STATUS_STEPS: ComplaintStatus[] = ['Open','Acknowledged','Containment Done','Under Investigation','CAPA Submitted','Verification Pending','Closed'];

function severityBadgeClass(s: ComplaintSeverity) {
  if (s === 'Critical') return 'bg-red-100 text-red-700 border-red-300';
  if (s === 'Major') return 'bg-amber-100 text-amber-700 border-amber-300';
  return 'bg-blue-100 text-blue-700 border-blue-300';
}

function addDays(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function toTimestamp(dateStr: string | undefined): Timestamp | undefined {
  if (!dateStr) return undefined;
  return Timestamp.fromDate(new Date(dateStr));
}

function fromTimestamp(ts: Timestamp | undefined): string {
  if (!ts) return '';
  return ts.toDate().toISOString().split('T')[0];
}

export default function ComplaintForm({ customers, employees, parts, onSubmit, onCancel, initialData }: ComplaintFormProps) {
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState<Partial<Complaint>>(initialData || {
    complaintDate: Timestamp.now(),
    complaintSource: 'Email',
    complaintType: 'Quality',
    severity: 'Minor',
    status: 'Open',
    customerName: '',
    productType: '',
    description: '',
    assignedTo: '',
    containmentStatus: 'Pending',
    acknowledgementSentToCustomer: false,
    sampleReturnRequired: false,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const set = (patch: Partial<Complaint>) => setFormData(prev => ({ ...prev, ...patch }));

  const slaDay = formData.severity === 'Critical' ? 1 : formData.severity === 'Major' ? 2 : 5;

  const handleSubmit = async () => {
    if (!formData.customerName || !formData.description) {
      toast.error('Customer and Description are required');
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit(formData as Omit<Complaint, 'id' | 'createdAt'>);
      toast.success(initialData ? 'Complaint updated' : 'Complaint registered');
      onCancel();
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Status step indicator
  const currentStepIdx = STATUS_STEPS.indexOf(formData.status as ComplaintStatus);

  const StatusBar = () => (
    <div className="border-t pt-4 mt-4">
      <p className="text-xs font-semibold text-slate-400 uppercase mb-2">Workflow Status</p>
      <div className="flex items-center gap-1 flex-wrap">
        {STATUS_STEPS.map((s, i) => (
          <React.Fragment key={s}>
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${i === currentStepIdx ? 'bg-primary text-white' : i < currentStepIdx ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-400'}`}>{s}</span>
            {i < STATUS_STEPS.length - 1 && <span className="text-slate-300 text-xs">→</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-2 border-b">
          <DialogTitle className="text-xl font-bold">
            {initialData ? `Edit Complaint — ${initialData.complaintId}` : 'Register New Complaint'}
            {formData.severity && (
              <Badge className={`ml-3 text-xs ${severityBadgeClass(formData.severity as ComplaintSeverity)}`}>{formData.severity}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          <Tabs defaultValue="receipt" className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="receipt">1. Receipt</TabsTrigger>
              <TabsTrigger value="containment">2. Acknowledgement</TabsTrigger>
              <TabsTrigger value="rca">3. RCA</TabsTrigger>
              <TabsTrigger value="capa">4. CAPA</TabsTrigger>
              <TabsTrigger value="closure">5. Effectiveness</TabsTrigger>
            </TabsList>

            {/* TAB 1: Receipt */}
            <TabsContent value="receipt" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Complaint ID</Label>
                  <Input value={formData.complaintId || 'Auto-generated on save'} readOnly className="bg-slate-50 font-mono text-sm" />
                </div>
                <div className="space-y-1">
                  <Label>Date of Complaint *</Label>
                  <Input type="date" value={fromTimestamp(formData.complaintDate) || today} onChange={e => set({ complaintDate: toTimestamp(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>Customer *</Label>
                  <Select value={formData.customerId || ''} onValueChange={val => {
                    const c = customers.find(x => x.id === val);
                    set({ customerId: val, customerName: c?.name || '' });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Contact Person</Label>
                  <Input value={formData.contactPerson || ''} onChange={e => set({ contactPerson: e.target.value })} placeholder="Customer contact name" />
                </div>
                <div className="space-y-1">
                  <Label>Source</Label>
                  <Select value={formData.complaintSource} onValueChange={val => set({ complaintSource: val as ComplaintSource })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['Email','Call','Visit','Portal'] as ComplaintSource[]).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Complaint Type</Label>
                  <Select value={formData.complaintType} onValueChange={val => set({ complaintType: val as ComplaintType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['Quality','Functional Failure','Fitment','Delivery','Documentation','Cosmetic'] as ComplaintType[]).map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Severity</Label>
                  <Select value={formData.severity} onValueChange={val => set({ severity: val as ComplaintSeverity })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Critical"><span className="text-red-600 font-bold">Critical</span></SelectItem>
                      <SelectItem value="Major"><span className="text-amber-600 font-bold">Major</span></SelectItem>
                      <SelectItem value="Minor"><span className="text-blue-600 font-bold">Minor</span></SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Part No.</Label>
                  <Select value={formData.partId || ''} onValueChange={val => {
                    const p = parts.find(x => x.id === val);
                    set({ partId: p?.id, partNo: p?.partId, productType: p?.partName });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select part" /></SelectTrigger>
                    <SelectContent>{parts.map(p => <SelectItem key={p.id} value={p.id}>{p.partId} – {p.partName}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Product / Part Name</Label>
                  <Input value={formData.productType || ''} readOnly className="bg-slate-50" placeholder="Auto-filled from part" />
                </div>
                <div className="space-y-1">
                  <Label>SO Number / Project ID</Label>
                  <Input value={formData.projectId || ''} onChange={e => set({ projectId: e.target.value })} placeholder="e.g. SO-12345" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Batch Number</Label>
                  <Input value={formData.batchNumber || ''} onChange={e => set({ batchNumber: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Serial Number</Label>
                  <Input value={formData.serialNumber || ''} onChange={e => set({ serialNumber: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Quantity Affected</Label>
                  <Input type="number" value={formData.quantityAffected || ''} onChange={e => set({ quantityAffected: Number(e.target.value) })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Description *</Label>
                <Textarea rows={4} value={formData.description || ''} onChange={e => set({ description: e.target.value })} placeholder="Detailed description of the complaint..." />
              </div>
              <StatusBar />
            </TabsContent>

            {/* TAB 2: Acknowledgement & Containment */}
            <TabsContent value="containment" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="ackSent" checked={formData.acknowledgementSentToCustomer || false} onCheckedChange={v => set({ acknowledgementSentToCustomer: v as boolean })} />
                    <Label htmlFor="ackSent">Acknowledgement sent to customer</Label>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Contact Person Notified</Label>
                  <Input value={formData.contactPerson || ''} onChange={e => set({ contactPerson: e.target.value })} placeholder="Name of person notified" />
                </div>
                <div className="space-y-1">
                  <Label>Containment Status</Label>
                  <Select value={formData.containmentStatus || 'Pending'} onValueChange={val => set({ containmentStatus: val as 'Pending' | 'Done' })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Containment Action</Label>
                  <Textarea rows={3} value={formData.containmentAction || ''} onChange={e => set({ containmentAction: e.target.value })} placeholder="Immediate actions taken to contain the issue..." />
                </div>
                <div className="space-y-1">
                  <Label>Containment Owner</Label>
                  <Select value={formData.containmentOwnerId || ''} onValueChange={val => {
                    const e = employees.find(x => x.id === val);
                    set({ containmentOwnerId: val, containmentOwner: e?.name });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.departmentName})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Containment Target Date <span className="text-xs text-slate-400">(SLA: {slaDay}d for {formData.severity})</span></Label>
                  <Input type="date" value={fromTimestamp(formData.containmentDate) || addDays(slaDay)} onChange={e => set({ containmentDate: toTimestamp(e.target.value) })} />
                </div>
                <div className="space-y-1 col-span-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="sampleReturn" checked={formData.sampleReturnRequired || false} onCheckedChange={v => set({ sampleReturnRequired: v as boolean })} />
                    <Label htmlFor="sampleReturn">Sample return required</Label>
                  </div>
                </div>
                {formData.sampleReturnRequired && (
                  <div className="space-y-1">
                    <Label>Sample Return Status</Label>
                    <Select value={formData.sampleReturnStatus || 'Pending'} onValueChange={val => set({ sampleReturnStatus: val as any })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Received">Received</SelectItem>
                        <SelectItem value="Not Required">Not Required</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <StatusBar />
            </TabsContent>

            {/* TAB 3: RCA */}
            <TabsContent value="rca" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Assigned To</Label>
                  <Select value={formData.assignedToId || ''} onValueChange={val => {
                    const e = employees.find(x => x.id === val);
                    set({ assignedToId: val, assignedTo: e?.name || '' });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name} ({e.departmentName})</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>RCA Method</Label>
                  <Select value={formData.rcaMethod || ''} onValueChange={val => set({ rcaMethod: val as RCAMethod })}>
                    <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
                    <SelectContent>
                      {(['5-Why','Fishbone','FMEA','Fault Tree','Other'] as RCAMethod[]).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>RCA Team Members</Label>
                  <Input value={formData.rcaTeamMembers || ''} onChange={e => set({ rcaTeamMembers: e.target.value })} placeholder="Comma-separated names" />
                </div>
                <div className="space-y-1">
                  <Label>RCA Completed Date</Label>
                  <Input type="date" value={fromTimestamp(formData.rcaCompletedDate)} onChange={e => set({ rcaCompletedDate: toTimestamp(e.target.value) })} />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Root Cause</Label>
                  <Textarea rows={3} value={formData.rootCause || ''} onChange={e => set({ rootCause: e.target.value })} placeholder="Why did this occur?" />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Contributing Factors</Label>
                  <Textarea rows={2} value={formData.contributingFactors || ''} onChange={e => set({ contributingFactors: e.target.value })} placeholder="Other factors that contributed..." />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Escape Point — Where was this defect not detected?</Label>
                  <Textarea rows={2} value={formData.escapePoint || ''} onChange={e => set({ escapePoint: e.target.value })} placeholder="Which inspection/process failed to catch this?" />
                </div>
                <div className="space-y-1 col-span-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="similarCheck" checked={formData.similarComplaintsChecked || false} onCheckedChange={v => set({ similarComplaintsChecked: v as boolean })} />
                    <Label htmlFor="similarCheck">Similar complaints checked (lateral spread)</Label>
                  </div>
                  {formData.isRepeatComplaint && (
                    <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-700 flex items-center gap-2">
                      <AlertTriangle size={14} /> This is a repeat complaint. Linked to: {formData.linkedComplaintId}
                    </div>
                  )}
                </div>
              </div>
              <StatusBar />
            </TabsContent>

            {/* TAB 4: CAPA */}
            <TabsContent value="capa" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <Label>Corrective Action</Label>
                  <Textarea rows={3} value={formData.correctiveAction || ''} onChange={e => set({ correctiveAction: e.target.value })} placeholder="What was done to fix the root cause?" />
                </div>
                <div className="space-y-1">
                  <Label>Corrective Action Owner</Label>
                  <Select value={formData.correctiveActionOwner || ''} onValueChange={val => {
                    const e = employees.find(x => x.id === val);
                    set({ correctiveActionOwner: e?.name || val });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>CA Target Date</Label>
                  <Input type="date" value={fromTimestamp(formData.correctiveActionTargetDate)} onChange={e => set({ correctiveActionTargetDate: toTimestamp(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>CA Done Date</Label>
                  <Input type="date" value={fromTimestamp(formData.correctiveActionDoneDate)} onChange={e => set({ correctiveActionDoneDate: toTimestamp(e.target.value) })} />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Preventive Action</Label>
                  <Textarea rows={3} value={formData.preventiveAction || ''} onChange={e => set({ preventiveAction: e.target.value })} placeholder="How will we prevent recurrence?" />
                </div>
                <div className="space-y-1">
                  <Label>Preventive Action Owner</Label>
                  <Select value={formData.preventiveActionOwner || ''} onValueChange={val => {
                    const e = employees.find(x => x.id === val);
                    set({ preventiveActionOwner: e?.name || val });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Process / Document Updated</Label>
                  <Input value={formData.processDocumentUpdated || ''} onChange={e => set({ processDocumentUpdated: e.target.value })} placeholder="e.g. WI-QA-05 updated" />
                </div>
                <div className="space-y-1 col-span-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="lateralCheck" checked={formData.similarComplaintsChecked || false} onCheckedChange={v => set({ similarComplaintsChecked: v as boolean })} />
                    <Label htmlFor="lateralCheck">Lateral spread check done</Label>
                  </div>
                </div>
              </div>
              <StatusBar />
            </TabsContent>

            {/* TAB 5: Effectiveness & Closure */}
            <TabsContent value="closure" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Current Status</Label>
                  <Select value={formData.status || 'Open'} onValueChange={val => set({ status: val as ComplaintStatus })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['Open','Acknowledged','Containment Done','Under Investigation','CAPA Submitted','Verification Pending','Closed','Re-Opened'] as ComplaintStatus[]).map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Verification Due Date <span className="text-xs text-slate-400">(auto-set on closure)</span></Label>
                  <Input value={fromTimestamp(formData.verificationDueDate)} readOnly className="bg-slate-50" placeholder="Set automatically on closure" />
                </div>
                <div className="space-y-1">
                  <Label>Verification Date</Label>
                  <Input type="date" value={fromTimestamp(formData.verificationDate)} onChange={e => set({ verificationDate: toTimestamp(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label>Verification Method</Label>
                  <Input value={formData.verificationMethod || ''} onChange={e => set({ verificationMethod: e.target.value })} placeholder="e.g. Field audit, Customer feedback" />
                </div>
                <div className="space-y-1">
                  <Label>Verified By</Label>
                  <Select value={formData.verifiedById || ''} onValueChange={val => {
                    const e = employees.find(x => x.id === val);
                    set({ verifiedById: val, verifiedBy: e?.name });
                  }}>
                    <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                    <SelectContent>{employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Effectiveness Result</Label>
                  <Select value={formData.effectivenessResult || ''} onValueChange={val => set({ effectivenessResult: val as EffectivenessResult })}>
                    <SelectTrigger><SelectValue placeholder="Select result" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Effective"><span className="text-green-600 font-semibold">Effective</span></SelectItem>
                      <SelectItem value="Not Effective"><span className="text-red-600 font-semibold">Not Effective</span></SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  {formData.effectivenessResult === 'Not Effective' && (
                    <p className="text-xs text-red-600 mt-1 flex items-center gap-1"><AlertTriangle size={12} /> Complaint will be automatically Re-Opened on save.</p>
                  )}
                  {formData.effectivenessResult === 'Effective' && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><CheckCircle2 size={12} /> CAPA verified as effective.</p>
                  )}
                </div>
                <div className="space-y-1 col-span-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="custNotified" checked={!!formData.customerNotifiedDate} onCheckedChange={v => set({ customerNotifiedDate: v ? Timestamp.now() : undefined })} />
                    <Label htmlFor="custNotified">Customer notified of closure</Label>
                  </div>
                  {formData.customerNotifiedDate && (
                    <Input type="date" className="mt-1 w-48" value={fromTimestamp(formData.customerNotifiedDate)} onChange={e => set({ customerNotifiedDate: toTimestamp(e.target.value) })} />
                  )}
                </div>
                <div className="space-y-1 col-span-2">
                  <div className="flex items-center gap-2">
                    <Checkbox id="custAccepted" checked={formData.customerAccepted || false} onCheckedChange={v => set({ customerAccepted: v as boolean })} />
                    <Label htmlFor="custAccepted">Customer accepted resolution</Label>
                  </div>
                </div>
                <div className="space-y-1 col-span-2">
                  <Label>Internal Remarks</Label>
                  <Textarea rows={3} value={(formData as any).remarks || ''} onChange={e => set({ ...(formData as any), remarks: e.target.value } as any)} placeholder="Internal notes for this status update..." />
                </div>
              </div>
              <StatusBar />
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <div className="px-6 py-4 border-t flex justify-end gap-3 bg-white">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : (initialData ? 'Update Complaint' : 'Register Complaint')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
