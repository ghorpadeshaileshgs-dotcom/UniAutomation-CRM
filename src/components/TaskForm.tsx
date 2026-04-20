import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useFirebase } from '../hooks/useFirebase';
import { Task, ActivityType, Lead, Customer, TaskCategory } from '../types';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';

interface TaskFormProps {
  leads: Lead[];
  customers: Customer[];
  onClose: () => void;
  initialData?: Partial<Task>;
}

const activityTypes: ActivityType[] = [
  "Call", 
  "Visit", 
  "Email", 
  "Customer Query", 
  "Internal Coordination", 
  "Payment Follow-up", 
  "Technical Support"
];

export default function TaskForm({ leads, customers, onClose, initialData }: TaskFormProps) {
  const { addTask, user, employees, departments, team } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [formData, setFormData] = useState<Partial<Task>>({
    relatedTo: initialData?.relatedTo || 'Lead',
    leadId: initialData?.leadId || '',
    leadName: initialData?.leadName || '',
    customerId: initialData?.customerId || '',
    customerName: initialData?.customerName || '',
    type: initialData?.type || 'Call',
    summary: initialData?.summary || '',
    nextAction: initialData?.nextAction || '',
    nextActionDate: initialData?.nextActionDate || undefined,
    owner: user?.displayName || user?.email || 'System',
    ownerId: user?.uid || 'system',
    assignedTo: initialData?.assignedTo || '',
    assignedToName: initialData?.assignedToName || '',
    assignedToEmail: initialData?.assignedToEmail || '',
    status: 'Authorized', // Default to authorized if created by user
    priority: initialData?.priority || 'Medium'
  });

  // FIX: User selection using employees master
  const activeEmployees = employees.filter(emp => 
    emp.status === 'Active' && (deptFilter === 'all' || emp.departmentId === deptFilter)
  );
  
  const activeTeam = activeEmployees.length > 0 ? activeEmployees : employees.filter(e => e.status === 'Active');
  
  console.log("Employees for Task Assignment:", employees);
  console.log("Active Employees (filtered or fallback):", activeTeam);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.relatedTo === 'Lead' && !formData.leadId) {
      toast.error("Please select a lead");
      return;
    }
    if (formData.relatedTo === 'Customer' && !formData.customerId) {
      toast.error("Please select a customer");
      return;
    }
    if (!formData.nextActionDate) {
      toast.error("Please select a next action date");
      return;
    }
    if (!formData.assignedTo || !formData.assignedToEmail) {
      toast.error("Please select an assignee with a valid email");
      return;
    }

    setLoading(true);
    try {
      await addTask({
        ...formData,
        date: Timestamp.now(),
        nextActionDate: Timestamp.fromDate(new Date(formData.nextActionDate as any)),
      } as any);
      toast.success("Task created and assigned successfully");
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Related To *</Label>
            <Select 
              value={formData.relatedTo} 
              onValueChange={v => setFormData({...formData, relatedTo: v as TaskCategory, leadId: '', customerId: '', customerName: ''})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Lead">Lead</SelectItem>
                <SelectItem value="Customer">Customer</SelectItem>
                <SelectItem value="General">General/Internal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.relatedTo === 'Lead' && (
            <div className="space-y-2">
              <Label>Select Lead *</Label>
              <Select 
                value={formData.leadId} 
                onValueChange={v => {
                  const lead = leads.find(l => l.id === v);
                  setFormData({
                    ...formData, 
                    leadId: v, 
                    leadName: lead?.customerName || '',
                    customerName: lead?.customerName || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a lead" />
                </SelectTrigger>
                <SelectContent>
                  {leads.map(l => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.customerName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {formData.relatedTo === 'Customer' && (
            <div className="space-y-2">
              <Label>Select Customer *</Label>
              <Select 
                value={formData.customerId} 
                onValueChange={v => {
                  const customer = customers.find(c => c.id === v);
                  setFormData({...formData, customerId: v, customerName: customer?.name});
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>Activity Type *</Label>
            <Select 
              value={formData.type} 
              onValueChange={v => setFormData({...formData, type: v as ActivityType})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {activityTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Activity Summary *</Label>
            <Input 
              id="summary" 
              required 
              value={formData.summary} 
              onChange={e => setFormData({...formData, summary: e.target.value})}
              placeholder="What happened?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextAction">Next Action *</Label>
            <Input 
              id="nextAction" 
              required 
              value={formData.nextAction} 
              onChange={e => setFormData({...formData, nextAction: e.target.value})}
              placeholder="What needs to be done next?"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextActionDate">Next Action Date *</Label>
            <Input 
              id="nextActionDate" 
              type="date" 
              required 
              onChange={e => setFormData({...formData, nextActionDate: e.target.value as any})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Filter by Dept</Label>
              <Select value={deptFilter} onValueChange={setDeptFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assign To *</Label>
              <Select 
                value={formData.assignedTo} 
                onValueChange={v => {
                  const emp = activeTeam.find(m => m.id === v);
                  setFormData({
                    ...formData, 
                    assignedTo: v, 
                    assignedToName: emp?.name || (emp as any)?.employeeName || '',
                    assignedToEmail: emp?.email || ''
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select team member" />
                </SelectTrigger>
                <SelectContent>
                  {activeTeam.map(emp => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.name || (emp as any).employeeName} ({emp.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Create Task'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
