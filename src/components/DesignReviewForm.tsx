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
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useFirebase } from '../hooks/useFirebase';
import { Lead, DesignReview, UserProfile } from '../types';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';

interface DesignReviewFormProps {
  lead: Lead;
  onClose: () => void;
}

export default function DesignReviewForm({ lead, onClose }: DesignReviewFormProps) {
  const { addDesignReview, user, team } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    assignedToId: '',
    requirementSummary: '',
  });

  const designEngineers = team.filter(m => m.role === 'Sales Support' || m.role === 'Admin'); // Assuming design engineers are under these roles for now

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assignedToId) {
      toast.error("Please assign a design engineer");
      return;
    }

    setLoading(true);
    try {
      const assignedUser = team.find(m => m.uid === formData.assignedToId);
      
      const review: Omit<DesignReview, 'id'> = {
        leadId: lead.id,
        customerName: lead.customerName,
        requestedBy: user?.displayName || user?.email || 'Unknown',
        requestedById: user?.uid || '',
        assignedTo: assignedUser?.displayName || assignedUser?.email || 'Unknown',
        assignedToId: formData.assignedToId,
        requestDate: Timestamp.now(),
        requirementSummary: formData.requirementSummary,
        feasibilityStatus: 'Pending',
        status: 'Pending',
        slaDays: 3,
        isDelayed: false
      };

      await addDesignReview(review);
      toast.success("Design review request sent successfully");
      onClose();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Request Design Review</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">Customer</p>
            <p className="font-semibold">{lead.customerName}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500">Product Type</p>
            <p className="font-semibold">{lead.productType}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assignedTo">Assign Design Engineer *</Label>
            <Select 
              value={formData.assignedToId} 
              onValueChange={v => setFormData({...formData, assignedToId: v})}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select engineer" />
              </SelectTrigger>
              <SelectContent>
                {designEngineers.map(m => (
                  <SelectItem key={m.uid} value={m.uid}>
                    {m.displayName || m.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Requirement Summary</Label>
            <Textarea 
              id="summary" 
              value={formData.requirementSummary} 
              onChange={e => setFormData({...formData, requirementSummary: e.target.value})}
              placeholder="Describe the technical requirements..."
              rows={4}
            />
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send to Design'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
