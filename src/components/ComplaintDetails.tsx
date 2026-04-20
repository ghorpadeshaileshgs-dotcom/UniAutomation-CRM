import React, { useState } from 'react';
import { Complaint, ComplaintStatus, Employee } from '../types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  ArrowLeft,
  Calendar,
  User,
  Tag,
  FileText,
  ShieldAlert,
  FileDown
} from 'lucide-react';
import { toast } from 'sonner';
import ExportActions from './ExportActions';
import AuditHistory from './AuditHistory';

interface ComplaintDetailsProps {
  complaint: Complaint;
  employees: Employee[];
  onUpdate: (id: string, updates: Partial<Complaint>) => Promise<void>;
  onBack: () => void;
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

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(complaint.id, updates);
      toast.success("Complaint updated successfully");
    } catch (err: any) {
      toast.error("Failed to update: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const exportData = React.useMemo(() => [
    {
      'Field': 'Complaint ID',
      'Value': complaint.complaintId
    },
    {
      'Field': 'Customer',
      'Value': complaint.customerName
    },
    {
      'Field': 'Date',
      'Value': format(complaint.complaintDate.toDate(), 'PPP')
    },
    {
      'Field': 'Type',
      'Value': complaint.complaintType
    },
    {
      'Field': 'Severity',
      'Value': complaint.severity
    },
    {
      'Field': 'Status',
      'Value': complaint.status
    },
    {
      'Field': 'Description',
      'Value': complaint.description
    },
    {
      'Field': 'Assigned To',
      'Value': complaint.assignedTo || 'Unassigned'
    },
    {
      'Field': 'Root Cause',
      'Value': updates.rootCause || 'Under review'
    },
    {
      'Field': 'Corrective Action',
      'Value': updates.correctiveAction || 'Pending'
    },
    {
      'Field': 'Preventive Action',
      'Value': updates.preventiveAction || 'Pending'
    }
  ], [complaint, updates]);

  const getStatusIcon = (status: ComplaintStatus) => {
    switch (status) {
      case 'Open': return <AlertCircle className="text-red-500" />;
      case 'Under Investigation': return <Clock className="text-amber-500" />;
      case 'Action Implemented': return <ShieldAlert className="text-blue-500" />;
      case 'Closed': return <CheckCircle2 className="text-green-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft size={18} className="mr-2" />
          Back to List
        </Button>
        <h2 className="text-2xl font-bold text-slate-900">Complaint Details</h2>
        <Badge variant="outline" className="font-mono text-xs">
          {complaint.complaintId}
        </Badge>
        <div className="ml-auto">
          <ExportActions 
            data={exportData} 
            fileName={`complaint_${complaint.complaintId}`} 
            title="Customer Quality Report" 
            subtitle={`${complaint.customerName} | Severity: ${complaint.severity}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <FileText size={18} className="text-primary" />
              Basic Information
            </h3>
            
            <div className="space-y-3">
              <InfoItem icon={<User size={14} />} label="Customer" value={complaint.customerName} />
              <InfoItem icon={<Tag size={14} />} label="Product" value={complaint.productType || 'N/A'} />
              <InfoItem icon={<Calendar size={14} />} label="Date" value={format(complaint.complaintDate.toDate(), 'MMM dd, yyyy')} />
              <InfoItem icon={<AlertCircle size={14} />} label="Type" value={complaint.complaintType} />
              <InfoItem icon={<ShieldAlert size={14} />} label="Severity" value={complaint.severity} />
            </div>

            <div className="pt-4 border-t">
              <Label className="text-xs text-slate-500 uppercase font-bold">Initial Description</Label>
              <p className="mt-1 text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 italic">
                "{complaint.description}"
              </p>
            </div>
          </div>

          <AuditHistory auditData={complaint} />

          {complaint.status === 'Closed' && (
            <div className="bg-green-50 p-6 rounded-xl border border-green-100 shadow-sm space-y-3">
              <h3 className="font-bold text-green-900 flex items-center gap-2">
                <CheckCircle2 size={18} />
                Resolution Summary
              </h3>
              <div className="space-y-2 text-sm text-green-800">
                <div className="flex justify-between">
                  <span>Closed On:</span>
                  <span className="font-bold">{complaint.closureDate ? format(complaint.closureDate.toDate(), 'MMM dd, yyyy') : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Turnaround Time:</span>
                  <span className="font-bold">{complaint.turnaroundTime} days</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Investigation & Actions */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2">
                {getStatusIcon(updates.status as ComplaintStatus)}
                Investigation & Resolution
              </h3>
              <div className="w-48">
                <Select 
                  value={updates.status} 
                  onValueChange={(val: ComplaintStatus) => setUpdates({ ...updates, status: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="Under Investigation">Under Investigation</SelectItem>
                    <SelectItem value="Action Implemented">Action Taken</SelectItem>
                    <SelectItem value="Closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Assigned To</Label>
                <Select 
                  value={updates.assignedToId} 
                  onValueChange={(val) => {
                    const emp = employees.find(e => e.id === val);
                    setUpdates({ ...updates, assignedToId: val, assignedTo: emp?.name || '' });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign to Employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.id}>{emp.name} ({emp.departmentName})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="rootCause">Root Cause Analysis</Label>
                <Textarea 
                  id="rootCause" 
                  value={updates.rootCause} 
                  onChange={(e) => setUpdates({ ...updates, rootCause: e.target.value })}
                  placeholder="Identify why this issue occurred..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="correctiveAction">Corrective Action</Label>
                <Textarea 
                  id="correctiveAction" 
                  value={updates.correctiveAction} 
                  onChange={(e) => setUpdates({ ...updates, correctiveAction: e.target.value })}
                  placeholder="What was done to fix the immediate issue?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="preventiveAction">Preventive Action</Label>
                <Textarea 
                  id="preventiveAction" 
                  value={updates.preventiveAction} 
                  onChange={(e) => setUpdates({ ...updates, preventiveAction: e.target.value })}
                  placeholder="How will we prevent this from happening again?"
                  rows={3}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Progress"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="text-slate-400">{icon}</div>
      <span className="text-slate-500 w-20">{label}:</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}
