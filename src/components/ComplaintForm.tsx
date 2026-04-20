import React, { useState } from 'react';
import { Complaint, ComplaintSource, ComplaintType, ComplaintSeverity, ComplaintStatus, Customer, Employee } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';

interface ComplaintFormProps {
  customers: Customer[];
  employees: Employee[];
  onSubmit: (complaint: Omit<Complaint, 'id' | 'createdAt'>) => Promise<any>;
  onCancel: () => void;
  initialData?: Complaint;
}

export default function ComplaintForm({ customers, employees, onSubmit, onCancel, initialData }: ComplaintFormProps) {
  const [formData, setFormData] = useState<Partial<Complaint>>(initialData || {
    complaintId: `CMP-${Date.now().toString().slice(-6)}`,
    complaintDate: Timestamp.now(),
    complaintSource: 'Email',
    complaintType: 'Quality',
    severity: 'Minor',
    status: 'Open',
    customerName: '',
    productType: '',
    description: '',
    assignedTo: '',
    assignedToId: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.description) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData as Omit<Complaint, 'id' | 'createdAt'>);
      toast.success(initialData ? "Complaint updated" : "Complaint registered successfully");
      onCancel();
    } catch (err: any) {
      toast.error("Failed to save complaint: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="complaintId">Complaint ID</Label>
          <Input 
            id="complaintId" 
            value={formData.complaintId} 
            readOnly 
            className="bg-slate-50 font-mono"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="customer">Customer *</Label>
          <Select 
            value={formData.customerId} 
            onValueChange={(val) => {
              const cust = customers.find(c => c.id === val);
              setFormData({ ...formData, customerId: val, customerName: cust?.name || '' });
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Customer" />
            </SelectTrigger>
            <SelectContent>
              {customers.map(cust => (
                <SelectItem key={cust.id} value={cust.id}>{cust.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectId">SO Number / Project ID</Label>
          <Input 
            id="projectId" 
            value={formData.projectId || ''} 
            onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
            placeholder="e.g. SO-12345"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="productType">Product Type</Label>
          <Input 
            id="productType" 
            value={formData.productType || ''} 
            onChange={(e) => setFormData({ ...formData, productType: e.target.value })}
            placeholder="e.g. Pressure Sensor X1"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="source">Source *</Label>
          <Select 
            value={formData.complaintSource} 
            onValueChange={(val: ComplaintSource) => setFormData({ ...formData, complaintSource: val })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Email">Email</SelectItem>
              <SelectItem value="Call">Call</SelectItem>
              <SelectItem value="Visit">Visit</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="type">Type *</Label>
          <Select 
            value={formData.complaintType} 
            onValueChange={(val: ComplaintType) => setFormData({ ...formData, complaintType: val })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Quality">Quality</SelectItem>
              <SelectItem value="Functional Failure">Functional Failure</SelectItem>
              <SelectItem value="Fitment">Fitment</SelectItem>
              <SelectItem value="Delivery">Delivery</SelectItem>
              <SelectItem value="Documentation">Documentation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="severity">Severity *</Label>
          <Select 
            value={formData.severity} 
            onValueChange={(val: ComplaintSeverity) => setFormData({ ...formData, severity: val })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Critical">Critical</SelectItem>
              <SelectItem value="Major">Major</SelectItem>
              <SelectItem value="Minor">Minor</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="assignedTo">Assign To</Label>
          <Select 
            value={formData.assignedToId} 
            onValueChange={(val) => {
              const emp = employees.find(e => e.id === val);
              setFormData({ ...formData, assignedToId: val, assignedTo: emp?.name || '' });
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

      <div className="space-y-2">
        <Label htmlFor="description">Description *</Label>
        <Textarea 
          id="description" 
          value={formData.description} 
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Detailed description of the complaint..."
          rows={4}
        />
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : (initialData ? "Update Complaint" : "Register Complaint")}
        </Button>
      </div>
    </form>
  );
}
