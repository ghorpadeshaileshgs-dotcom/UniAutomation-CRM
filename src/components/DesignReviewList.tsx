import React, { useState } from 'react';
import { DesignReview } from '../types';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Clock, 
  User, 
  FileText,
  MessageSquare,
  History
} from 'lucide-react';
import { format, differenceInDays, differenceInHours } from 'date-fns';
import { useFirebase } from '../hooks/useFirebase';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';

interface DesignReviewListProps {
  reviews: DesignReview[];
}

export default function DesignReviewList({ reviews }: DesignReviewListProps) {
  const { updateDesignReview, profile } = useFirebase();
  const [selectedReview, setSelectedReview] = useState<DesignReview | null>(null);
  const [responseRemarks, setResponseRemarks] = useState('');
  const [feasibilityStatus, setFeasibilityStatus] = useState<DesignReview['feasibilityStatus']>('Feasible');

  const handleUpdate = async () => {
    if (!selectedReview) return;
    
    try {
      const responseDate = Timestamp.now();
      const requestDate = selectedReview.requestDate.toDate();
      const turnaroundTime = differenceInHours(responseDate.toDate(), requestDate);

      await updateDesignReview(selectedReview.id, {
        feasibilityStatus,
        responseRemarks,
        responseDate,
        turnaroundTime
      });
      
      toast.success("Design review updated");
      setSelectedReview(null);
      setResponseRemarks('');
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Feasible': return 'bg-green-100 text-green-700';
      case 'Not Feasible': return 'bg-red-100 text-red-700';
      case 'Feasible with Modification': return 'bg-amber-100 text-amber-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold">Customer</TableHead>
              <TableHead className="font-semibold">Requested By</TableHead>
              <TableHead className="font-semibold">Assigned To</TableHead>
              <TableHead className="font-semibold">Request Date</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">TAT</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                  No design reviews found.
                </TableCell>
              </TableRow>
            ) : (
              reviews.map((review) => {
                const isOverdue = review.feasibilityStatus === 'Pending' && 
                                 differenceInDays(new Date(), review.requestDate.toDate()) >= 2;

                return (
                  <TableRow key={review.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{review.customerName}</span>
                        <span className="text-xs text-slate-500 truncate max-w-[200px]">{review.requirementSummary}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-600">
                        <User size={14} />
                        <span className="text-sm">{review.requestedBy}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-600">
                        <User size={14} />
                        <span className="text-sm">{review.assignedTo}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm">{format(review.requestDate.toDate(), 'MMM dd, yyyy')}</span>
                        {isOverdue && (
                          <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                            <AlertCircle size={10} />
                            DELAYED
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getStatusColor(review.feasibilityStatus)}>
                        {review.feasibilityStatus}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {review.turnaroundTime ? (
                        <span className="text-sm text-slate-600 font-medium">
                          {review.turnaroundTime}h
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">In progress</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {review.feasibilityStatus === 'Pending' && (profile?.role === 'Admin' || profile?.role === 'Sales Support') ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setSelectedReview(review);
                            setFeasibilityStatus('Feasible');
                          }}
                        >
                          Review
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" className="text-slate-400" disabled>
                          <History size={16} />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {selectedReview && (
        <Dialog open onOpenChange={() => setSelectedReview(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Submit Design Review</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Feasibility Status *</Label>
                <Select 
                  value={feasibilityStatus} 
                  onValueChange={v => setFeasibilityStatus(v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Feasible">Feasible</SelectItem>
                    <SelectItem value="Not Feasible">Not Feasible</SelectItem>
                    <SelectItem value="Feasible with Modification">Feasible with Modification</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="remarks">Response Remarks *</Label>
                <Textarea 
                  id="remarks" 
                  required 
                  value={responseRemarks} 
                  onChange={e => setResponseRemarks(e.target.value)}
                  placeholder="Provide technical justification..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedReview(null)}>Cancel</Button>
              <Button onClick={handleUpdate}>Submit Review</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
