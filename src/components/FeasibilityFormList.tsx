import React, { useState } from 'react';
import { FeasibilityForm, UserProfile } from '../types';
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
  ClipboardCheck, 
  Clock, 
  User, 
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

interface FeasibilityFormListProps {
  forms: FeasibilityForm[];
  onView: (form: FeasibilityForm) => void;
}

export default function FeasibilityFormList({ forms, onView }: FeasibilityFormListProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Feasible': return 'bg-green-100 text-green-700 border-green-200';
      case 'Not Feasible': return 'bg-red-100 text-red-700 border-red-200';
      case 'Need More Details': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Pending': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <ClipboardCheck size={18} className="text-primary" />
          Technical Feasibility Requests
        </h3>
        <Badge variant="outline" className="font-mono text-[10px]">
          {forms.filter(f => f.status === 'Open').length} PENDING
        </Badge>
      </div>
      <Table>
        <TableHeader className="bg-slate-50">
          <TableRow>
            <TableHead className="font-semibold text-xs uppercase tracking-wider">Product Info</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider">Requested By</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider">Date</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider text-center">Outcome</TableHead>
            <TableHead className="font-semibold text-xs uppercase tracking-wider text-center">Status</TableHead>
            <TableHead className="text-right"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {forms.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                No technical feasibility requests found.
              </TableCell>
            </TableRow>
          ) : (
            forms.map((form) => {
              const isOverdue = form.status === 'Open' && 
                               differenceInDays(new Date(), form.createdAt.toDate()) >= 2;

              return (
                <TableRow key={form.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">{form.category}</span>
                      <span className="text-xs text-slate-500 truncate max-w-[200px]">{form.subCategory}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-slate-600">
                      <User size={14} className="text-slate-400" />
                      <span className="text-sm font-medium">{form.submittedBy}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-700">{format(form.createdAt.toDate(), 'MMM dd, yyyy')}</span>
                      {isOverdue && (
                        <span className="text-[10px] font-bold text-red-500 flex items-center gap-1">
                          <Clock size={10} />
                          URGENT
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge className={`${getStatusColor(form.overallStatus)} border font-bold text-[10px] uppercase`}>
                      {form.overallStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={form.status === 'Open' ? 'default' : 'secondary'} className="text-[10px] uppercase tracking-tighter">
                      {form.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-primary hover:text-primary hover:bg-primary/5 font-bold text-xs"
                      onClick={() => onView(form)}
                    >
                      REVIEW
                      <ArrowRight size={14} className="ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
