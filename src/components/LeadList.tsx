import React from 'react';
import { Lead, Task } from '../types';
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
import { Edit2, MoreVertical, ExternalLink, Calendar, ShieldCheck, FileText, AlertCircle, CheckCircle2, Users } from 'lucide-react';
import { format, isPast, isToday } from 'date-fns';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

import ExportActions from './ExportActions';

interface LeadListProps {
  leads: Lead[];
  tasks: Task[];
  onEdit: (id: string) => void;
  onView: (id: string) => void;
  onSendToDesign: (lead: Lead) => void;
  onCreateQuote: (lead: Lead) => void;
  onCreateComplaint: (lead: Lead) => void;
}

const stageColors: Record<string, string> = {
  'Lead': 'bg-slate-100 text-slate-700',
  'Qualified': 'bg-blue-100 text-blue-700',
  'Requirement Understanding': 'bg-indigo-100 text-indigo-700',
  'Techno-Commercial Offer': 'bg-purple-100 text-purple-700',
  'Quoted': 'bg-amber-100 text-amber-700',
  'Follow-up': 'bg-orange-100 text-orange-700',
  'Negotiation': 'bg-cyan-100 text-cyan-700',
  'PO Expected': 'bg-emerald-100 text-emerald-700',
  'PO Received': 'bg-green-100 text-green-700',
  'Closed Won': 'bg-green-600 text-white',
  'Closed Lost': 'bg-red-100 text-red-700',
};

const priorityColors: Record<string, string> = {
  'High': 'bg-red-100 text-red-700 border-red-200',
  'Medium': 'bg-amber-100 text-amber-700 border-amber-200',
  'Low': 'bg-green-100 text-green-700 border-green-200',
};

export default function LeadList({ leads, tasks, onEdit, onView, onSendToDesign, onCreateQuote, onCreateComplaint }: LeadListProps) {
  const exportData = React.useMemo(() => {
    return leads.map(lead => ({
      customer_name: lead.customerName,
      customer_type: lead.customerType,
      priority: lead.priority,
      contact_person: lead.contactPerson,
      industry: lead.industry,
      product: lead.productType,
      stage: lead.stage,
      value: lead.estimatedValue,
      probability: lead.probability,
      sales_person: lead.salespersonName,
      created_at: lead.createdAt
    }));
  }, [leads]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <ExportActions data={exportData} fileName="leads_report" title="Sales Leads Report" />
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table>
        <TableHeader className="bg-slate-50 border-y border-slate-200">
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 py-3">Customer & Region</TableHead>
            <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 py-3">Type</TableHead>
            <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 py-3">Industry</TableHead>
            <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 py-3">Priority</TableHead>
            <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 py-3 text-center">Feasibility</TableHead>
            <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 py-3">Stage</TableHead>
            <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 py-3">Quote Status</TableHead>
            <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 py-3">Value (Est.)</TableHead>
            <TableHead className="font-bold text-[10px] uppercase tracking-wider text-slate-500 py-3">Next Action</TableHead>
            <TableHead className="text-right py-3"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.length === 0 ? (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-16 text-slate-400">
                <div className="flex flex-col items-center gap-2">
                  <div className="p-3 bg-slate-50 rounded-full">
                    <Users size={24} className="text-slate-300" />
                  </div>
                  <span className="text-sm">No leads found. Create your first lead to get started.</span>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            leads.map((lead) => {
              const leadTasks = tasks.filter(t => t.leadId === lead.id && t.status === 'Authorized');
              const nextTask = leadTasks.length > 0 
                ? leadTasks.reduce((prev, curr) => 
                    curr.nextActionDate.toMillis() < prev.nextActionDate.toMillis() ? curr : prev
                  )
                : null;

              const isOverdue = nextTask && isPast(nextTask.nextActionDate.toDate()) && !isToday(nextTask.nextActionDate.toDate());
              const isDueToday = nextTask && isToday(nextTask.nextActionDate.toDate());

              // Formatting quote status
              const quoteStatus = lead.quote?.latestRevision?.status || (lead.quoteCreated ? 'Sent' : 'N/A');

              return (
                <TableRow key={lead.id} className="group hover:bg-slate-50 transition-colors border-b border-slate-100">
                  <TableCell className="cursor-pointer py-4" onClick={() => onView(lead.id)}>
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900 group-hover:text-primary transition-colors leading-tight">{lead.customerName}</span>
                      <span className="text-[10px] text-slate-400 font-medium uppercase tracking-tighter mt-0.5">{lead.region}</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge variant="outline" className="font-bold text-[9px] uppercase border-slate-200 text-slate-500 bg-slate-50/50">
                      {lead.customerType}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <span className="text-[11px] text-slate-600 font-medium">{lead.industry}</span>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge className={`${priorityColors[lead.priority] || 'bg-slate-100'} border-none shadow-none font-bold text-[9px] uppercase px-2`}>
                      {lead.priority}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center py-4">
                    {lead.productCategory === 'Standard' ? (
                      <span className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.2em]">Standard</span>
                    ) : (
                      <Badge 
                        variant="outline" 
                        className={`font-bold text-[9px] uppercase px-2 ${
                          !lead.feasibilityStatus ? 'text-slate-400 border-slate-200 bg-slate-50' :
                          lead.feasibilityStatus === 'Pending' ? 'text-yellow-600 border-yellow-200 bg-yellow-50' :
                          lead.feasibilityStatus === 'Need More Details' ? 'text-orange-500 border-orange-200 bg-orange-50' :
                          lead.feasibilityStatus === 'Feasible' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' :
                          'text-red-500 border-red-200 bg-red-50'
                        }`}
                      >
                        {lead.feasibilityStatus === 'Feasible' && <CheckCircle2 size={10} className="mr-1 inline" />}
                        {lead.feasibilityStatus || 'N/A'}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge className={`${stageColors[lead.stage]} border-none font-bold text-[9px] uppercase px-2`}>
                      {(lead.stage === 'PO Received' || lead.stage === 'Closed Won') && <CheckCircle2 size={10} className="mr-1 inline" />}
                      {lead.stage}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <Badge 
                      variant="outline" 
                      className={`font-bold text-[9px] uppercase px-2 ${
                        quoteStatus === 'Draft' ? 'text-slate-500 border-slate-200 bg-slate-50' :
                        quoteStatus === 'Sent' ? 'text-sky-600 border-sky-200 bg-sky-50' :
                        quoteStatus === 'Revised' ? 'text-indigo-600 border-indigo-200 bg-indigo-50' :
                        quoteStatus === 'Accepted' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' :
                        quoteStatus === 'Rejected' ? 'text-rose-600 border-rose-200 bg-rose-50' :
                        'text-slate-300 border-slate-100'
                      }`}
                    >
                      {quoteStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="flex flex-col items-start">
                      <span className="font-mono text-xs font-bold text-slate-700">₹{lead.estimatedValue?.toLocaleString()}</span>
                      <div className="h-1 w-12 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div 
                          className="h-full bg-primary transition-all duration-500" 
                          style={{ width: `${lead.probability}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-0.5">{lead.probability}% Prob.</span>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    {nextTask ? (
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={12} className={isOverdue ? "text-red-500" : isDueToday ? "text-blue-500" : "text-slate-400"} />
                          <span className={`font-mono text-[11px] font-bold ${
                            isOverdue ? "text-red-600 underline decoration-red-200" : isDueToday ? "text-blue-600" : "text-slate-600"
                          }`}>
                            {format(nextTask.nextActionDate.toDate(), 'dd MMM')}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 truncate max-w-[120px] font-medium leading-none">{nextTask.nextAction}</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-300 italic font-medium">No tasks</span>
                    )}
                  </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                      <MoreVertical size={18} />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(lead.id)}>
                        <Edit2 size={14} className="mr-2" />
                        Edit Lead
                      </DropdownMenuItem>
                      {(lead.productCategory === 'New Development' || lead.productCategory === 'Variant') && (
                        <DropdownMenuItem onClick={() => onSendToDesign(lead)}>
                          <ShieldCheck size={14} className="mr-2 text-indigo-600" />
                          Send to Design
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onCreateQuote(lead)}>
                        <FileText size={14} className="mr-2 text-blue-600" />
                        Create Quote
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onCreateComplaint(lead)}>
                        <AlertCircle size={14} className="mr-2 text-red-600" />
                        Register Complaint
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onView(lead.id)}>
                        <ExternalLink size={14} className="mr-2" />
                        View Details
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })
        )}
        </TableBody>
      </Table>
    </div>
  </div>
);
}
