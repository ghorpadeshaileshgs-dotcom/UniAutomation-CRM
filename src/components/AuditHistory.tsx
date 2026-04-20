import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, User, Clock, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { AuditFields, StageHistoryEntry } from '../types';

interface AuditHistoryProps {
  auditData: AuditFields;
  history?: StageHistoryEntry[];
  title?: string;
}

const AuditHistory: React.FC<AuditHistoryProps> = ({ auditData, history, title = "Audit Trail" }) => {
  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Creation & Last Update Info */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="space-y-1.5 p-3 rounded-lg bg-slate-50 border border-slate-100">
            <p className="text-slate-500 font-medium flex items-center gap-1.5">
              <User className="w-3 h-3" /> Created By
            </p>
            <p className="font-semibold text-slate-900">{auditData.createdBy || 'System'}</p>
            <p className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> 
              {auditData.createdAt ? format(auditData.createdAt.toDate(), 'PPP p') : 'N/A'}
            </p>
          </div>
          
          <div className="space-y-1.5 p-3 rounded-lg bg-blue-50/50 border border-blue-100">
            <p className="text-blue-600 font-medium flex items-center gap-1.5">
              <User className="w-3 h-3" /> Updated By
            </p>
            <p className="font-semibold text-slate-900">{auditData.updatedBy || auditData.createdBy || 'System'}</p>
            <p className="text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> 
              {auditData.updatedAt ? format(auditData.updatedAt.toDate(), 'PPP p') : (auditData.createdAt ? format(auditData.createdAt.toDate(), 'PPP p') : 'N/A')}
            </p>
          </div>
        </div>

        {/* Temporal History Log */}
        {history && history.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Workflow Progression</h4>
            <ScrollArea className="h-[200px] pr-4">
              <div className="space-y-4">
                {history.slice().reverse().map((entry, idx) => (
                  <div key={idx} className="relative pl-6 pb-2 border-l-2 border-slate-100 last:border-0 last:pb-0">
                    <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-white border-2 border-blue-500" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-[10px] py-0">{entry.from}</Badge>
                        <ArrowRight className="w-3 h-3 text-slate-400" />
                        <Badge className="text-[10px] py-0 bg-blue-600">{entry.to}</Badge>
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><User className="w-2.5 h-2.5" /> {entry.updatedBy}</span>
                        <span className="flex items-center gap-1"><Clock className="w-2.5 h-2.5" /> {format(entry.date.toDate(), 'dd/MM/yy HH:mm')}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AuditHistory;
