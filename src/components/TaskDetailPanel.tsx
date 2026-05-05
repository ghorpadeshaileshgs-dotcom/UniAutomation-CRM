import React, { useState } from 'react';
import { Task, Employee } from '../types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { format, isPast, isToday } from 'date-fns';
import { Timestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import {
  CheckCircle2, User, Calendar, Tag, MessageSquare,
  Send, AlertCircle, Clock, Link2, Users
} from 'lucide-react';

interface TaskDetailPanelProps {
  task: Task | null;
  employees: Employee[];
  open: boolean;
  onClose: () => void;
  currentUser: any;
  onNavigate?: (tab: string) => void;
}

const priorityStyles: Record<string, string> = {
  High: 'bg-red-100 text-red-700 border-red-200',
  Medium: 'bg-amber-100 text-amber-700 border-amber-200',
  Low: 'bg-blue-100 text-blue-700 border-blue-200',
};

const statusStyles: Record<string, string> = {
  'Pending Approval': 'bg-orange-100 text-orange-700',
  'Authorized': 'bg-blue-100 text-blue-700',
  'Completed': 'bg-green-100 text-green-700',
};

export default function TaskDetailPanel({ task, employees, open, onClose, currentUser, onNavigate }: TaskDetailPanelProps) {
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [newAssigneeId, setNewAssigneeId] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [showReassign, setShowReassign] = useState(false);
  const [showDateChange, setShowDateChange] = useState(false);

  if (!task) return null;

  const isOverdue = isPast(task.nextActionDate.toDate()) && !isToday(task.nextActionDate.toDate()) && task.status !== 'Completed';
  const isDueToday = isToday(task.nextActionDate.toDate());

  const handleAddUpdate = async () => {
    if (!newMessage.trim()) return;
    setIsSending(true);
    try {
      const entry = {
        date: Timestamp.now(),
        author: currentUser?.displayName || currentUser?.email || 'System',
        authorId: currentUser?.uid || 'system',
        message: newMessage.trim(),
      };
      await updateDoc(doc(db, 'tasks', task.id), {
        activityLog: arrayUnion(entry),
        updatedAt: Timestamp.now(),
      });
      setNewMessage('');
      toast.success('Update added');
    } catch (err: any) {
      toast.error('Failed to add update: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleComplete = async () => {
    setIsCompleting(true);
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        status: 'Completed',
        updatedAt: Timestamp.now(),
        activityLog: arrayUnion({
          date: Timestamp.now(),
          author: currentUser?.displayName || currentUser?.email || 'System',
          authorId: currentUser?.uid || 'system',
          message: 'Task marked as completed.',
        }),
      });
      toast.success('Task marked as complete');
      onClose();
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setIsCompleting(false);
    }
  };

  const handleReassign = async () => {
    if (!newAssigneeId) return;
    const emp = employees.find(e => e.id === newAssigneeId);
    if (!emp) return;
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        assignedTo: emp.id,
        assignedToName: emp.name,
        assignedToEmail: emp.email,
        updatedAt: Timestamp.now(),
        activityLog: arrayUnion({
          date: Timestamp.now(),
          author: currentUser?.displayName || currentUser?.email || 'System',
          authorId: currentUser?.uid || 'system',
          message: `Task reassigned to ${emp.name}.`,
        }),
      });
      toast.success(`Reassigned to ${emp.name}`);
      setShowReassign(false);
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
  };

  const handleChangeDueDate = async () => {
    if (!newDueDate) return;
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        nextActionDate: Timestamp.fromDate(new Date(newDueDate)),
        updatedAt: Timestamp.now(),
        activityLog: arrayUnion({
          date: Timestamp.now(),
          author: currentUser?.displayName || currentUser?.email || 'System',
          authorId: currentUser?.uid || 'system',
          message: `Due date changed to ${format(new Date(newDueDate), 'dd MMM yyyy')}.`,
        }),
      });
      toast.success('Due date updated');
      setShowDateChange(false);
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    }
  };

  const logs = [...(task.activityLog || [])].sort((a, b) => b.date.seconds - a.date.seconds);

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:w-[480px] p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge className={`text-xs ${priorityStyles[task.priority]}`}>{task.priority}</Badge>
            <Badge className={`text-xs ${statusStyles[task.status]}`}>{task.status}</Badge>
            {isOverdue && <Badge variant="destructive" className="text-xs animate-pulse">OVERDUE</Badge>}
            {isDueToday && <Badge className="text-xs bg-blue-600 text-white">DUE TODAY</Badge>}
          </div>
          <SheetTitle className="text-base font-bold mt-2 leading-snug">{task.nextAction}</SheetTitle>
          <p className="text-xs text-slate-500 font-medium">{task.type} — {task.relatedTo}</p>
        </SheetHeader>

        <ScrollArea className="flex-1 px-6 py-4">
          {/* Task Meta */}
          <div className="space-y-3 mb-6">
            <InfoRow icon={<Users size={14} />} label="Customer" value={task.customerName || '—'} />
            <InfoRow icon={<User size={14} />} label="Assigned To" value={task.assignedToName || task.owner || '—'} />
            <InfoRow
              icon={<Calendar size={14} />}
              label="Due Date"
              value={format(task.nextActionDate.toDate(), 'dd MMM yyyy')}
              valueClass={isOverdue ? 'text-red-600 font-bold' : isDueToday ? 'text-blue-600 font-bold' : ''}
            />
            <InfoRow icon={<Tag size={14} />} label="Summary" value={task.summary} />
            {task.leadId && (
              <div className="flex items-center gap-2 text-xs">
                <Link2 size={14} className="text-slate-400" />
                <span className="text-slate-500">Lead:</span>
                <button
                  className="text-primary font-medium hover:underline"
                  onClick={() => { onNavigate?.('leads'); onClose(); }}
                >
                  View Lead →
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {task.status !== 'Completed' && (
            <div className="flex flex-wrap gap-2 mb-6">
              <Button size="sm" onClick={handleComplete} disabled={isCompleting} className="bg-green-600 hover:bg-green-700 text-white">
                <CheckCircle2 size={14} className="mr-1" />
                {isCompleting ? 'Completing...' : 'Mark Complete'}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowReassign(!showReassign); setShowDateChange(false); }}>
                <User size={14} className="mr-1" />Reassign
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setShowDateChange(!showDateChange); setShowReassign(false); }}>
                <Calendar size={14} className="mr-1" />Change Due Date
              </Button>
            </div>
          )}

          {/* Reassign Panel */}
          {showReassign && (
            <div className="p-3 bg-slate-50 rounded-lg border mb-4 space-y-2">
              <Label className="text-xs font-semibold">Reassign to</Label>
              <Select value={newAssigneeId} onValueChange={setNewAssigneeId}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map(e => (
                    <SelectItem key={e.id} value={e.id}>{e.name} ({e.departmentName})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={handleReassign} disabled={!newAssigneeId}>Confirm Reassign</Button>
            </div>
          )}

          {/* Change Due Date Panel */}
          {showDateChange && (
            <div className="p-3 bg-slate-50 rounded-lg border mb-4 space-y-2">
              <Label className="text-xs font-semibold">New Due Date</Label>
              <Input type="date" className="h-8 text-sm" value={newDueDate} onChange={e => setNewDueDate(e.target.value)} />
              <Button size="sm" onClick={handleChangeDueDate} disabled={!newDueDate}>Confirm Change</Button>
            </div>
          )}

          <Separator className="mb-4" />

          {/* Activity Log */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare size={12} />Activity Log
            </h4>

            {/* Add Update */}
            <div className="flex gap-2">
              <Textarea
                rows={2}
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                placeholder="Add an update..."
                className="text-sm resize-none"
                onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAddUpdate(); }}
              />
              <Button size="icon" className="h-auto shrink-0" onClick={handleAddUpdate} disabled={isSending || !newMessage.trim()}>
                <Send size={14} />
              </Button>
            </div>
            <p className="text-[10px] text-slate-400">Ctrl+Enter to submit</p>

            {/* Log entries */}
            {logs.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-4">No activity yet. Add the first update above.</p>
            ) : (
              <div className="space-y-3 mt-2">
                {logs.map((entry, idx) => (
                  <div key={idx} className="flex gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <User size={10} className="text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-800">{entry.author}</span>
                        <span className="text-[10px] text-slate-400">{format(entry.date.toDate(), 'dd MMM, hh:mm a')}</span>
                      </div>
                      <p className="text-sm text-slate-600 mt-0.5">{entry.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function InfoRow({ icon, label, value, valueClass = '' }: { icon: React.ReactNode; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="text-slate-400 mt-0.5 shrink-0">{icon}</div>
      <span className="text-slate-500 w-24 shrink-0 text-xs font-medium">{label}</span>
      <span className={`text-slate-800 text-xs flex-1 ${valueClass}`}>{value}</span>
    </div>
  );
}
