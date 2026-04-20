import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Customer } from '../types';

interface LeadFiltersProps {
  leadSearch: string;
  setLeadSearch: (v: string) => void;
  leadViewMode?: 'list' | 'kanban';
  setLeadViewMode?: (v: 'list' | 'kanban') => void;
  selectedCustomerFilter: string;
  setSelectedCustomerFilter: (v: string) => void;
  industryFilter: string;
  setIndustryFilter: (v: string) => void;
  customerTypeFilter: string;
  setCustomerTypeFilter: (v: string) => void;
  stageFilter: string;
  setStageFilter: (v: string) => void;
  priorityFilter: string;
  setPriorityFilter: (v: string) => void;
  customers: Customer[];
  showViewToggle?: boolean;
}

export default function LeadFilters({
  leadSearch,
  setLeadSearch,
  leadViewMode,
  setLeadViewMode,
  selectedCustomerFilter,
  setSelectedCustomerFilter,
  industryFilter,
  setIndustryFilter,
  customerTypeFilter,
  setCustomerTypeFilter,
  stageFilter,
  setStageFilter,
  priorityFilter,
  setPriorityFilter,
  customers,
  showViewToggle = false
}: LeadFiltersProps) {
  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex-1 w-full max-w-md relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder="Search leads, customers or products..." 
            className="pl-10 h-10 bg-slate-50 border-slate-200 focus-visible:ring-primary/20"
            value={leadSearch}
            onChange={(e) => setLeadSearch(e.target.value)}
          />
        </div>
        {showViewToggle && setLeadViewMode && (
          <div className="flex items-center gap-2">
            <Button 
              variant={leadViewMode === 'kanban' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setLeadViewMode('kanban')}
              className="h-10 px-4"
            >
              Kanban Board
            </Button>
            <Button 
              variant={leadViewMode === 'list' ? 'default' : 'outline'} 
              size="sm" 
              onClick={() => setLeadViewMode('list')}
              className="h-10 px-4"
            >
              List View
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Customer</label>
          <select 
            className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            value={selectedCustomerFilter}
            onChange={(e) => setSelectedCustomerFilter(e.target.value)}
          >
            <option value="all">All Customers</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Industry</label>
          <select 
            className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            value={industryFilter}
            onChange={(e) => setIndustryFilter(e.target.value)}
          >
            <option value="all">All Industries</option>
            {['Defence', 'Locomotive', 'Industrial', 'Automobile', 'Other'].map(i => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Type</label>
          <select 
            className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            value={customerTypeFilter}
            onChange={(e) => setCustomerTypeFilter(e.target.value)}
          >
            <option value="all">All Types</option>
            {['OEM', 'End User', 'Project', 'Design House'].map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Stage</label>
          <select 
            className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
          >
            <option value="all">All Stages</option>
            {['Lead', 'Qualified', 'Requirement Understanding', 'Techno-Commercial Offer', 'Quoted', 'Follow-up', 'Negotiation', 'PO Expected', 'PO Received', 'Closed Won', 'Closed Lost'].map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Priority</label>
          <select 
            className="w-full h-9 rounded-lg border border-slate-200 bg-slate-50 px-3 text-xs focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
          >
            <option value="all">All Priorities</option>
            {['High', 'Medium', 'Low'].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
