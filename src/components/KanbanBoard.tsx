import React from 'react';
import { Lead, LeadStage } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { LEAD_STAGES } from '../lib/workflow';
import { IndianRupee, MoreVertical, Edit2 } from 'lucide-react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface KanbanBoardProps {
  leads: Lead[];
  onEdit: (id: string) => void;
  onView: (id: string) => void;
}

const STAGES_TO_SHOW: LeadStage[] = [
  'Lead',
  'Qualified',
  'Requirement Understanding',
  'Techno-Commercial Offer',
  'Quoted',
  'Follow-up',
  'Negotiation',
  'PO Expected'
];

export default function KanbanBoard({ leads, onEdit, onView }: KanbanBoardProps) {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[600px]">
      {STAGES_TO_SHOW.map(stage => {
        const stageLeads = leads.filter(l => l.stage === stage);
        const totalValue = stageLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);

        return (
          <div key={stage} className="flex-shrink-0 w-80 flex flex-col gap-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="font-bold text-slate-700 flex items-center gap-2">
                {stage}
                <Badge variant="secondary" className="bg-slate-200 text-slate-700">
                  {stageLeads.length}
                </Badge>
              </h3>
              <span className="text-xs font-semibold text-slate-500 flex items-center">
                <IndianRupee size={12} className="mr-0.5" />
                {totalValue.toLocaleString()}
              </span>
            </div>

            <ScrollArea className="flex-1 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
              <div className="space-y-3">
                {stageLeads.map(lead => (
                  <Card key={lead.id} className="shadow-sm border-slate-200 hover:border-primary/50 transition-colors group cursor-pointer" onClick={() => onView(lead.id)}>
                    <CardHeader className="p-3 pb-0 space-y-1">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{lead.industry}</span>
                        <DropdownMenu>
                          <DropdownMenuTrigger onClick={(e) => e.stopPropagation()} className="p-1 hover:bg-slate-100 rounded-full transition-colors opacity-0 group-hover:opacity-100">
                            <MoreVertical size={14} />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(lead.id); }}>
                              <Edit2 size={12} className="mr-2" />
                              Edit
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <CardTitle className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors">
                        {lead.customerName}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 pt-2 space-y-2">
                      <p className="text-xs text-slate-500 line-clamp-1">{lead.productType}</p>
                      
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-1 text-slate-900 font-bold text-sm">
                          <IndianRupee size={12} />
                          {lead.estimatedValue.toLocaleString()}
                        </div>
                        <Badge className={`${lead.probability >= 70 ? 'bg-green-100 text-green-700' : lead.probability >= 40 ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'} text-[10px] h-5 px-1.5`}>
                          {lead.probability}%
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
        );
      })}
    </div>
  );
}
