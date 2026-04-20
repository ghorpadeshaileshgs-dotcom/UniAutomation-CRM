import React, { useState } from 'react';
import { Debtor, Task } from '../types';
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
  IndianRupee, 
  Calendar, 
  User, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Plus,
  Upload
} from 'lucide-react';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { useFirebase } from '../hooks/useFirebase';
import { masterDataService } from '../services/masterDataService';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import TaskForm from './TaskForm';
import BulkUpload from './BulkUpload';

interface DebtorsListProps {
  debtors: Debtor[];
}

export default function DebtorsList({ debtors }: DebtorsListProps) {
  const { profile, user, leads, customers, updateDebtor } = useFirebase();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [selectedDebtor, setSelectedDebtor] = useState<Debtor | null>(null);

  const handleMarkPaid = async (debtor: Debtor) => {
    try {
      await updateDebtor(debtor.id, { status: 'Paid' });
      toast.success("Invoice marked as paid");
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  };

  const handleAddFollowUp = (debtor: Debtor) => {
    setSelectedDebtor(debtor);
    setShowTaskForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800">Debtors Management</h3>
        <Button variant="outline" onClick={() => setShowBulkUpload(true)} className="gap-2">
          <Upload size={18} />
          Bulk Upload Data
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold">Customer</TableHead>
              <TableHead className="font-semibold">Invoice Details</TableHead>
              <TableHead className="font-semibold">Amount</TableHead>
              <TableHead className="font-semibold">Due Date</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Sales Person</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {debtors.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                  No debtors found. Upload your debtors list to get started.
                </TableCell>
              </TableRow>
            ) : (
              debtors.map((debtor) => {
                const dueDate = debtor.dueDate.toDate();
                const isOverdue = isPast(dueDate) && !isToday(dueDate) && debtor.status !== 'Paid';
                const daysOverdue = differenceInDays(new Date(), dueDate);

                return (
                  <TableRow key={debtor.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <span className="font-medium text-slate-900">{debtor.customerName}</span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">#{debtor.invoiceNumber}</span>
                        <span className="text-xs text-slate-500">
                          {format(debtor.invoiceDate.toDate(), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-bold text-slate-900">
                        <IndianRupee size={14} />
                        {debtor.amount.toLocaleString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className={isOverdue ? "text-red-500" : "text-slate-400"} />
                          <span className={`text-sm font-medium ${isOverdue ? "text-red-600" : "text-slate-700"}`}>
                            {format(dueDate, 'MMM dd, yyyy')}
                          </span>
                        </div>
                        {isOverdue && (
                          <span className="text-[10px] font-bold text-red-500 uppercase">
                            {daysOverdue} Days Overdue
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={
                        debtor.status === 'Paid' ? 'bg-green-100 text-green-700' :
                        isOverdue ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }>
                        {debtor.status === 'Paid' ? 'Paid' : isOverdue ? 'Overdue' : 'Pending'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-slate-600">
                        <User size={14} />
                        <span className="text-sm">{debtor.salespersonName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {debtor.status !== 'Paid' && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 gap-1"
                              onClick={() => handleAddFollowUp(debtor)}
                            >
                              <MessageSquare size={14} />
                              Follow-up
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-green-600 hover:bg-green-50"
                              onClick={() => handleMarkPaid(debtor)}
                            >
                              <CheckCircle2 size={18} />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {showBulkUpload && (
        <BulkUpload 
          initialType="Debtors"
          onClose={() => setShowBulkUpload(false)} 
        />
      )}

      {showTaskForm && (
        <TaskForm 
          leads={leads} 
          customers={customers}
          onClose={() => {
            setShowTaskForm(false);
            setSelectedDebtor(null);
          }}
          initialData={selectedDebtor ? {
            summary: `Payment follow-up for Invoice #${selectedDebtor.invoiceNumber}`,
            ownerId: selectedDebtor.salespersonId,
            owner: selectedDebtor.salespersonName,
            relatedTo: 'Customer',
            customerName: selectedDebtor.customerName,
            type: 'Payment Follow-up'
          } : undefined}
        />
      )}
    </div>
  );
}
