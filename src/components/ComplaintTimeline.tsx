import React from 'react';
import { Complaint, ComplaintHistoryEntry, ComplaintStatus } from '../types';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { CheckCircle2, AlertCircle, Clock, ShieldCheck, RotateCcw, XCircle } from 'lucide-react';

interface ComplaintTimelineProps {
  complaint: Complaint;
}

function statusColor(status: ComplaintStatus): string {
  switch (status) {
    case 'Open': return 'bg-red-100 text-red-700 border-red-200';
    case 'Acknowledged': return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'Containment Done': return 'bg-violet-100 text-violet-700 border-violet-200';
    case 'Under Investigation': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'CAPA Submitted': return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'Verification Pending': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'Closed': return 'bg-green-100 text-green-700 border-green-200';
    case 'Re-Opened': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
}

function StatusIcon({ status }: { status: ComplaintStatus }) {
  const cls = 'w-4 h-4';
  switch (status) {
    case 'Closed': return <CheckCircle2 className={`${cls} text-green-600`} />;
    case 'Open': return <AlertCircle className={`${cls} text-red-500`} />;
    case 'Re-Opened': return <RotateCcw className={`${cls} text-red-500`} />;
    case 'Verification Pending': return <Clock className={`${cls} text-blue-500`} />;
    case 'CAPA Submitted': return <ShieldCheck className={`${cls} text-orange-500`} />;
    default: return <Clock className={`${cls} text-amber-500`} />;
  }
}

export default function ComplaintTimeline({ complaint }: ComplaintTimelineProps) {
  const history: ComplaintHistoryEntry[] = complaint.history || [];

  if (history.length === 0) {
    return (
      <div className="py-12 text-center text-slate-400 text-sm">
        No history entries yet. Status changes will appear here.
      </div>
    );
  }

  // Sort ascending by date
  const sorted = [...history].sort((a, b) => a.date.seconds - b.date.seconds);

  return (
    <div className="space-y-0">
      {sorted.map((entry, idx) => (
        <div key={idx} className="flex gap-4 group">
          {/* Line + dot */}
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-white border-2 border-slate-200 flex items-center justify-center shadow-sm z-10 group-hover:border-primary transition-colors">
              <StatusIcon status={entry.status} />
            </div>
            {idx < sorted.length - 1 && (
              <div className="w-0.5 flex-1 bg-slate-200 my-1" />
            )}
          </div>

          {/* Content */}
          <div className={`pb-6 flex-1 ${idx === sorted.length - 1 ? 'pb-2' : ''}`}>
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <Badge className={`text-xs font-semibold ${statusColor(entry.status)}`}>
                  {entry.status}
                </Badge>
                <span className="text-xs text-slate-400 font-mono">
                  {format(entry.date.toDate(), 'dd MMM yyyy, hh:mm a')}
                </span>
              </div>
              <div className="mt-2 text-sm font-medium text-slate-700">
                {entry.updatedBy}
              </div>
              {entry.remarks && (
                <p className="mt-1 text-sm text-slate-500 italic">"{entry.remarks}"</p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
