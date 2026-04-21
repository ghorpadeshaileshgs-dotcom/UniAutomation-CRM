import React, { useState, useEffect } from 'react';
import { 
  Timestamp,
  updateDoc,
  doc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Task, Lead } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  User as UserIcon,
  Users as UsersIcon,
  MessageSquare,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { format, isToday, isPast, isFuture } from 'date-fns';
import { toast } from 'sonner';
import TaskForm from './TaskForm';
import { useFirebase } from '../hooks/useFirebase';

interface TaskBoardProps {
  leads: Lead[];
}

import ExportActions from './ExportActions';

export default function TaskBoard({ leads }: TaskBoardProps) {
  const { tasks, profile, user, customers } = useFirebase();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [filterMode, setFilterMode] = useState<'all' | 'mine'>('mine');

  const filteredTasks = tasks.filter(t => {
    if (filterMode === 'mine' && t.ownerId !== user?.uid) return false;
    if (t.leadId) {
      return leads.some(l => l.id === t.leadId);
    }
    return true;
  });

  // FIX 6: Export includes status and dueDate
  const exportData = React.useMemo(() => {
    return filteredTasks.map(t => ({
      summary: t.summary,
      type: t.type,
      priority: t.priority,
      status: t.status,
      owner: t.assignedToName || t.owner,
      customer: t.customerName,
      date: t.date,
      next_action: t.nextAction,
      due_date: t.nextActionDate?.toDate().toLocaleDateString('en-IN'),
    }));
  }, [filteredTasks]);

  const handleComplete = async (task: Task) => {
    try {
      const taskRef = doc(db, 'tasks', task.id);
      await updateDoc(taskRef, { status: 'Completed' });
      toast.success("Task marked as completed");
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  };

  const handleAuthorize = async (task: Task) => {
    try {
      const taskRef = doc(db, 'tasks', task.id);
      await updateDoc(taskRef, { 
        status: 'Authorized',
        authorizedBy: user?.displayName || user?.email || '',
        authorizedAt: Timestamp.now()
      });
      toast.success("Task authorized successfully");
    } catch (err: any) {
      toast.error("Error: " + err.message);
    }
  };

  const isAdmin = profile?.role === 'Admin';

  const pendingApproval = filteredTasks.filter(t => t.status === 'Pending Approval');
  const authorizedTasks = filteredTasks.filter(t => t.status === 'Authorized');
  const completedTasks = filteredTasks.filter(t => t.status === 'Completed');
  
  const overdueTasks = authorizedTasks.filter(t => isPast(t.nextActionDate.toDate()) && !isToday(t.nextActionDate.toDate()));
  const todayTasks = authorizedTasks.filter(t => isToday(t.nextActionDate.toDate()));
  const upcomingTasks = authorizedTasks.filter(t => isFuture(t.nextActionDate.toDate()) && !isToday(t.nextActionDate.toDate()));

  const completionRate = filteredTasks.length > 0 
    ? Math.round(completedTasks.length / filteredTasks.length * 100) 
    : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <Button 
              size="sm" 
              variant={filterMode === 'mine' ? 'default' : 'ghost'} 
              className="h-8 px-3 text-xs"
              onClick={() => setFilterMode('mine')}
            >
              My Tasks
            </Button>
            <Button 
              size="sm" 
              variant={filterMode === 'all' ? 'default' : 'ghost'} 
              className="h-8 px-3 text-xs"
              onClick={() => setFilterMode('all')}
            >
              Team Tasks
            </Button>
          </div>
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2 bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium border border-red-200">
            <AlertCircle size={16} />
            {overdueTasks.length} Overdue
          </div>
          <div className="flex items-center gap-2 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-200">
            <Clock size={16} />
            {todayTasks.length} Today
          </div>
          {isAdmin && pendingApproval.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-sm font-medium animate-pulse border border-amber-200">
              <ShieldCheck size={16} />
              {pendingApproval.length} Pending Approval
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <ExportActions data={exportData} fileName="tasks_report" title="Operational Tasks Report" />
          <Button onClick={() => setShowTaskForm(true)}>
            <Plus size={18} className="mr-2" />
            Add Task
          </Button>
        </div>
      </div>

      {/* Task Kanban Grid — FIX 6: 4 cols (non-admin) / 5 cols (admin) */}
      <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-6`}>
        {isAdmin && (
          <TaskColumn 
            title="Pending Approval" 
            tasks={pendingApproval} 
            leads={leads}
            color="border-amber-500" 
            bgColor="bg-amber-50/10"
            onAction={handleAuthorize}
            actionIcon={<ShieldCheck size={20} />}
            actionLabel="Authorize"
          />
        )}
        <TaskColumn 
          title="Overdue" 
          tasks={overdueTasks} 
          leads={leads}
          color="border-red-500" 
          bgColor="bg-red-50/30"
          isOverdue
          onAction={handleComplete}
          actionIcon={<CheckCircle2 size={20} />}
          actionLabel="Complete"
        />
        <TaskColumn 
          title="Today" 
          tasks={todayTasks} 
          leads={leads}
          color="border-blue-500" 
          bgColor="bg-blue-50/10"
          onAction={handleComplete}
          actionIcon={<CheckCircle2 size={20} />}
          actionLabel="Complete"
        />
        <TaskColumn 
          title="Upcoming" 
          tasks={upcomingTasks} 
          leads={leads}
          color="border-slate-300" 
          bgColor="bg-slate-50/10"
          onAction={handleComplete}
          actionIcon={<CheckCircle2 size={20} />}
          actionLabel="Complete"
        />
        {/* FIX 6: Completed column */}
        <TaskColumn 
          title="Completed" 
          tasks={completedTasks} 
          leads={leads}
          color="border-green-500" 
          bgColor="bg-green-50/10"
          isCompleted
          onAction={() => {}}
          actionIcon={<CheckCircle2 size={20} />}
          actionLabel=""
        />
      </div>

      {/* FIX 6: Task Summary Report */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-slate-500" />
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Task Summary Report</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <SummaryCard label="Total Tasks" value={filteredTasks.length} color="text-slate-800" bg="bg-slate-50" border="border-slate-200" />
          <SummaryCard label="Completed" value={completedTasks.length} color="text-emerald-700" bg="bg-emerald-50" border="border-emerald-200" />
          <SummaryCard label="Overdue" value={overdueTasks.length} color="text-red-700" bg="bg-red-50" border="border-red-200" />
          <SummaryCard label="Due Today" value={todayTasks.length} color="text-blue-700" bg="bg-blue-50" border="border-blue-200" />
          <SummaryCard label="Upcoming" value={upcomingTasks.length} color="text-slate-600" bg="bg-slate-100" border="border-slate-200" />
          <SummaryCard label="Completion Rate" value={`${completionRate}%`} color="text-violet-700" bg="bg-violet-50" border="border-violet-200" />
        </div>
      </div>

      {showTaskForm && (
        <TaskForm 
          leads={leads} 
          customers={customers}
          onClose={() => setShowTaskForm(false)} 
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, color, bg, border }: { label: string; value: string | number; color: string; bg: string; border: string }) {
  return (
    <div className={`${bg} border ${border} rounded-xl p-3 text-center`}>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{label}</p>
    </div>
  );
}

function TaskColumn({ title, tasks, leads, color, bgColor, isOverdue, isCompleted, onAction, actionIcon, actionLabel }: { 
  title: string, 
  tasks: Task[], 
  leads: Lead[],
  color: string,
  bgColor?: string,
  isOverdue?: boolean,
  isCompleted?: boolean,
  onAction: (task: Task) => void,
  actionIcon: React.ReactNode,
  actionLabel: string
}) {
  return (
    <div className={`flex flex-col gap-4 p-2 rounded-xl transition-colors ${bgColor}`}>
      <div className={`flex items-center justify-between border-b-2 ${color} pb-2 px-1`}>
        <h3 className="font-bold text-slate-800">{title}</h3>
        <Badge variant={isOverdue ? "destructive" : "secondary"}>{tasks.length}</Badge>
      </div>
      <div className="space-y-4">
        {tasks.length === 0 ? (
          <p className="text-center py-8 text-slate-400 text-sm bg-white/50 rounded-lg border border-dashed">
            No tasks
          </p>
        ) : (
          tasks.map(task => {
            return (
              <Card key={task.id} className={`shadow-sm hover:shadow-md transition-all ${isOverdue ? 'border-red-200' : isCompleted ? 'border-green-200 opacity-80' : ''}`}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {isOverdue && <Badge variant="destructive" className="py-0 h-4 text-[10px] animate-pulse">OVERDUE</Badge>}
                        {isCompleted && <Badge className="py-0 h-4 text-[10px] bg-emerald-100 text-emerald-700">DONE</Badge>}
                        <Badge variant="outline" className="text-[10px] h-4 px-1 uppercase">
                          {task.relatedTo}
                        </Badge>
                        <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">
                          {task.type}
                        </p>
                      </div>
                      <CardTitle className="text-sm font-bold line-clamp-2">
                        {task.nextAction}
                      </CardTitle>
                    </div>
                    {/* Hide action button for completed tasks */}
                    {!isCompleted && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title={actionLabel}
                        className={`h-8 w-8 text-slate-400 hover:text-green-600 ${isOverdue ? 'hover:bg-red-50' : ''}`}
                        onClick={() => onAction(task)}
                      >
                        {actionIcon}
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <UsersIcon size={14} />
                    <span className="truncate font-medium text-slate-700">
                      {task.customerName || 'General Task'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <CalendarIcon size={14} />
                    <span>{format(task.nextActionDate.toDate(), 'MMM dd, yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <UserIcon size={14} />
                    <span>Assigned to: {task.assignedToName || 'Unassigned'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <UserIcon size={12} />
                    <span>Created by: {task.createdBy || 'System'}</span>
                  </div>
                  <Separator />
                  <div className="flex items-start gap-2 text-xs text-slate-600 italic">
                    <MessageSquare size={14} className="mt-0.5 shrink-0" />
                    <p className="line-clamp-2">{task.summary}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
