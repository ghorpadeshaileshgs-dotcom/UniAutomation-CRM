import React, { useState, useMemo } from 'react';
import {
  Timestamp, updateDoc, doc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Task, Lead, Employee } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Calendar as CalendarIcon, Clock, CheckCircle2, AlertCircle,
  Plus, User as UserIcon, Users as UsersIcon, MessageSquare,
  ShieldCheck, TrendingUp, Search, X, Filter
} from 'lucide-react';
import {
  format, isToday, isPast, isFuture,
  startOfMonth, endOfMonth, isWithinInterval, addDays
} from 'date-fns';
import { toast } from 'sonner';
import TaskForm from './TaskForm';
import TaskDetailPanel from './TaskDetailPanel';
import ExportActions from './ExportActions';
import { useFirebase } from '../hooks/useFirebase';

interface TaskBoardProps {
  leads: Lead[];
  onNavigate?: (tab: string) => void;
}

export default function TaskBoard({ leads, onNavigate }: TaskBoardProps) {
  const { tasks, profile, user, customers, employees } = useFirebase();
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Filter state
  const [search, setSearch] = useState('');
  const [filterAssignee, setFilterAssignee] = useState('all');
  const [filterRelated, setFilterRelated] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [myTasksOnly, setMyTasksOnly] = useState(false);

  const isAdmin = profile?.role === 'Admin';

  const activeFilterCount = [
    search, filterAssignee !== 'all', filterRelated !== 'all',
    filterPriority !== 'all', filterStatus !== 'all', filterDateFrom, filterDateTo
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch('');
    setFilterAssignee('all');
    setFilterRelated('all');
    setFilterPriority('all');
    setFilterStatus('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // Base filter: lead visibility + my tasks toggle
  const baseTasks = useMemo(() => tasks.filter(t => {
    if (myTasksOnly && t.assignedTo !== user?.uid && t.ownerId !== user?.uid) return false;
    if (t.leadId) return leads.some(l => l.id === t.leadId);
    return true;
  }), [tasks, leads, myTasksOnly, user]);

  // Apply all filters
  const filteredTasks = useMemo(() => baseTasks.filter(t => {
    if (search && !t.customerName?.toLowerCase().includes(search.toLowerCase()) &&
        !t.nextAction?.toLowerCase().includes(search.toLowerCase()) &&
        !t.type?.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterAssignee !== 'all' && t.assignedTo !== filterAssignee) return false;
    if (filterRelated !== 'all' && t.relatedTo !== filterRelated) return false;
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterStatus !== 'all') {
      if (filterStatus === 'Overdue' && !(isPast(t.nextActionDate.toDate()) && !isToday(t.nextActionDate.toDate()) && t.status !== 'Completed')) return false;
      else if (filterStatus !== 'Overdue' && t.status !== filterStatus) return false;
    }
    if (filterDateFrom && t.nextActionDate.toDate() < new Date(filterDateFrom)) return false;
    if (filterDateTo && t.nextActionDate.toDate() > new Date(filterDateTo)) return false;
    return true;
  }), [baseTasks, search, filterAssignee, filterRelated, filterPriority, filterStatus, filterDateFrom, filterDateTo]);

  const pendingApproval = filteredTasks.filter(t => t.status === 'Pending Approval');
  const authorizedTasks = filteredTasks.filter(t => t.status === 'Authorized');
  const completedTasks = filteredTasks.filter(t => t.status === 'Completed');

  const overdueTasks = authorizedTasks.filter(t => isPast(t.nextActionDate.toDate()) && !isToday(t.nextActionDate.toDate()));
  const todayTasks = authorizedTasks.filter(t => isToday(t.nextActionDate.toDate()));
  const thisWeek = authorizedTasks.filter(t => {
    const d = t.nextActionDate.toDate();
    return isFuture(d) && !isToday(d) && d <= addDays(new Date(), 7);
  });
  const upcomingTasks = authorizedTasks.filter(t => isFuture(t.nextActionDate.toDate()) && !isToday(t.nextActionDate.toDate()));

  // KPI: completed this month
  const now = new Date();
  const completedThisMonth = completedTasks.filter(t =>
    t.updatedAt && isWithinInterval(t.updatedAt.toDate(), {
      start: startOfMonth(now), end: endOfMonth(now)
    })
  ).length;

  const openCount = authorizedTasks.length + pendingApproval.length;
  const completionRate = filteredTasks.length > 0 ? Math.round(completedTasks.length / filteredTasks.length * 100) : 0;

  const handleComplete = async (task: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', task.id), { status: 'Completed', updatedAt: Timestamp.now() });
      toast.success('Task marked as completed');
    } catch (err: any) { toast.error('Error: ' + err.message); }
  };

  const handleAuthorize = async (task: Task) => {
    try {
      await updateDoc(doc(db, 'tasks', task.id), {
        status: 'Authorized',
        authorizedBy: user?.displayName || user?.email || '',
        authorizedAt: Timestamp.now()
      });
      toast.success('Task authorized');
    } catch (err: any) { toast.error('Error: ' + err.message); }
  };

  const exportData = filteredTasks.map(t => ({
    summary: t.summary, type: t.type, priority: t.priority,
    status: t.status, owner: t.assignedToName || t.owner,
    customer: t.customerName, due_date: t.nextActionDate?.toDate().toLocaleDateString('en-IN'),
  }));

  return (
    <div className="space-y-6">
      {/* ── Overview KPI Bar ─────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <KpiCard label="Open Tasks" value={openCount} color="text-slate-800" bg="bg-white" border="border-slate-200" />
        <KpiCard label="Overdue" value={overdueTasks.length} color="text-red-700" bg="bg-red-50" border="border-red-200"
          sub={overdueTasks.length > 0 ? `oldest ${Math.max(...overdueTasks.map(t => Math.floor((Date.now() - t.nextActionDate.toDate().getTime()) / 86400000)))}d` : undefined} />
        <KpiCard label="Due Today" value={todayTasks.length} color="text-blue-700" bg="bg-blue-50" border="border-blue-200" />
        <KpiCard label="Due This Week" value={thisWeek.length} color="text-amber-700" bg="bg-amber-50" border="border-amber-200" />
        <KpiCard label="Done This Month" value={completedThisMonth} color="text-green-700" bg="bg-green-50" border="border-green-200" />
        <KpiCard label="Completion %" value={`${completionRate}%`} color="text-violet-700" bg="bg-violet-50" border="border-violet-200" />
      </div>

      {/* ── Header row ───────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMyTasksOnly(!myTasksOnly)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${myTasksOnly ? 'bg-primary text-white border-primary' : 'bg-white text-slate-600 border-slate-200 hover:border-primary'}`}
          >
            {myTasksOnly ? '✓ My Tasks Only' : 'My Tasks Only'}
          </button>
          {isAdmin && pendingApproval.length > 0 && (
            <div className="flex items-center gap-1.5 bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-medium animate-pulse border border-amber-200">
              <ShieldCheck size={14} />{pendingApproval.length} Pending Approval
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <ExportActions data={exportData} fileName="tasks_report" title="Operational Tasks Report" />
          <Button onClick={() => setShowTaskForm(true)}>
            <Plus size={16} className="mr-2" />Add Task
          </Button>
        </div>
      </div>

      {/* ── Filter Bar ───────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks, customers..." className="pl-8 h-8 text-sm" />
          </div>
          <Select value={filterAssignee} onValueChange={setFilterAssignee}>
            <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="Assignee" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {employees.map(e => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterRelated} onValueChange={setFilterRelated}>
            <SelectTrigger className="w-32 h-8 text-sm"><SelectValue placeholder="Related To" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Lead">Lead</SelectItem>
              <SelectItem value="Customer">Customer</SelectItem>
              <SelectItem value="General">General</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-28 h-8 text-sm"><SelectValue placeholder="Priority" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="High">High</SelectItem>
              <SelectItem value="Medium">Medium</SelectItem>
              <SelectItem value="Low">Low</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-32 h-8 text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="Authorized">Open</SelectItem>
              <SelectItem value="Overdue">Overdue</SelectItem>
              <SelectItem value="Completed">Completed</SelectItem>
              <SelectItem value="Pending Approval">Pending Approval</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="h-8 text-sm w-36" placeholder="From" />
            <span className="text-slate-400 text-xs">–</span>
            <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="h-8 text-sm w-36" placeholder="To" />
          </div>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded border border-red-200 bg-red-50 hover:bg-red-100 transition-colors">
              <X size={12} />Clear ({activeFilterCount})
            </button>
          )}
        </div>
      </div>

      {/* ── 3-Tab Layout ─────────────────────────────────── */}
      <Tabs defaultValue="board" className="space-y-4">
        <TabsList className="bg-white border border-slate-200 shadow-sm">
          <TabsTrigger value="board">Board View</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Activities
            {(overdueTasks.length + todayTasks.length) > 0 && (
              <Badge variant="destructive" className="ml-2 text-[10px] py-0 h-4">{overdueTasks.length + todayTasks.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed <Badge className="ml-2 text-[10px] py-0 h-4 bg-green-100 text-green-700">{completedTasks.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* BOARD VIEW */}
        <TabsContent value="board">
          <div className={`grid grid-cols-1 ${isAdmin ? 'md:grid-cols-5' : 'md:grid-cols-4'} gap-4`}>
            {isAdmin && (
              <TaskColumn title="Pending Approval" tasks={pendingApproval} leads={leads}
                color="border-amber-500" bgColor="bg-amber-50/10"
                onAction={handleAuthorize} actionIcon={<ShieldCheck size={18} />} actionLabel="Authorize"
                onCardClick={setSelectedTask} />
            )}
            <TaskColumn title="Overdue" tasks={overdueTasks} leads={leads}
              color="border-red-500" bgColor="bg-red-50/30" isOverdue
              onAction={handleComplete} actionIcon={<CheckCircle2 size={18} />} actionLabel="Complete"
              onCardClick={setSelectedTask} />
            <TaskColumn title="Today" tasks={todayTasks} leads={leads}
              color="border-blue-500" bgColor="bg-blue-50/10"
              onAction={handleComplete} actionIcon={<CheckCircle2 size={18} />} actionLabel="Complete"
              onCardClick={setSelectedTask} />
            <TaskColumn title="Upcoming" tasks={upcomingTasks} leads={leads}
              color="border-slate-300" bgColor="bg-slate-50/10"
              onAction={handleComplete} actionIcon={<CheckCircle2 size={18} />} actionLabel="Complete"
              onCardClick={setSelectedTask} />
            <TaskColumn title="Completed" tasks={completedTasks} leads={leads}
              color="border-green-500" bgColor="bg-green-50/10" isCompleted
              onAction={() => {}} actionIcon={<CheckCircle2 size={18} />} actionLabel=""
              onCardClick={setSelectedTask} />
          </div>
        </TabsContent>

        {/* PENDING ACTIVITIES */}
        <TabsContent value="pending">
          <div className="space-y-6">
            <ActivityGroup label="🔴 OVERDUE" tasks={overdueTasks} isOverdue onCardClick={setSelectedTask} />
            <ActivityGroup label="🔵 DUE TODAY" tasks={todayTasks} isToday onCardClick={setSelectedTask} />
            <ActivityGroup label="🟡 DUE THIS WEEK" tasks={thisWeek} onCardClick={setSelectedTask} />
            <ActivityGroup
              label="⬜ UPCOMING (next 30 days)"
              tasks={upcomingTasks.filter(t => t.nextActionDate.toDate() > addDays(new Date(), 7))}
              onCardClick={setSelectedTask}
            />
          </div>
        </TabsContent>

        {/* COMPLETED */}
        <TabsContent value="completed">
          <div className="space-y-2">
            {completedTasks.length === 0 ? (
              <p className="text-center py-16 text-slate-400">No completed tasks yet.</p>
            ) : (
              completedTasks.map(t => (
                <div key={t.id}
                  onClick={() => setSelectedTask(t)}
                  className="flex items-center gap-4 p-4 bg-white border border-slate-100 rounded-xl hover:shadow-sm transition-all cursor-pointer opacity-75 hover:opacity-100">
                  <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{t.nextAction}</p>
                    <p className="text-xs text-slate-400">{t.type} · {t.customerName || 'General'}</p>
                  </div>
                  <div className="text-xs text-slate-400 shrink-0">{t.assignedToName || t.owner}</div>
                </div>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Task Form */}
      {showTaskForm && (
        <TaskForm leads={leads} customers={customers} onClose={() => setShowTaskForm(false)} />
      )}

      {/* Task Detail Drawer */}
      <TaskDetailPanel
        task={selectedTask}
        employees={employees}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        currentUser={user}
        onNavigate={onNavigate}
      />
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────
function KpiCard({ label, value, color, bg, border, sub }: { label: string; value: string | number; color: string; bg: string; border: string; sub?: string }) {
  return (
    <div className={`${bg} border ${border} rounded-xl p-3 text-center`}>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Task Column (Board View) ──────────────────────────────────────
function TaskColumn({ title, tasks, leads, color, bgColor, isOverdue, isCompleted, onAction, actionIcon, actionLabel, onCardClick }: {
  title: string; tasks: Task[]; leads: Lead[]; color: string; bgColor?: string;
  isOverdue?: boolean; isCompleted?: boolean;
  onAction: (task: Task) => void; actionIcon: React.ReactNode; actionLabel: string;
  onCardClick: (task: Task) => void;
}) {
  return (
    <div className={`flex flex-col gap-3 p-2 rounded-xl ${bgColor}`}>
      <div className={`flex items-center justify-between border-b-2 ${color} pb-2 px-1`}>
        <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
        <Badge variant={isOverdue ? 'destructive' : 'secondary'} className="text-xs">{tasks.length}</Badge>
      </div>
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-center py-8 text-slate-400 text-xs bg-white/50 rounded-lg border border-dashed">No tasks</p>
        ) : (
          tasks.map(task => (
            <Card key={task.id}
              className={`shadow-sm hover:shadow-md transition-all cursor-pointer ${isOverdue ? 'border-red-200' : isCompleted ? 'border-green-200 opacity-80' : ''}`}
              onClick={() => onCardClick(task)}>
              <CardHeader className="p-3 pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1 mb-1 flex-wrap">
                      {isOverdue && <Badge variant="destructive" className="py-0 h-4 text-[9px] animate-pulse">OVERDUE</Badge>}
                      {isCompleted && <Badge className="py-0 h-4 text-[9px] bg-emerald-100 text-emerald-700">DONE</Badge>}
                      <Badge variant="outline" className="text-[9px] h-4 px-1">{task.relatedTo}</Badge>
                      <PriorityDot priority={task.priority} />
                    </div>
                    <CardTitle className="text-xs font-bold line-clamp-2">{task.nextAction}</CardTitle>
                  </div>
                  {!isCompleted && (
                    <button
                      title={actionLabel}
                      className="text-slate-300 hover:text-green-600 transition-colors shrink-0 p-1"
                      onClick={e => { e.stopPropagation(); onAction(task); }}
                    >
                      {actionIcon}
                    </button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <UsersIcon size={11} /><span className="truncate">{task.customerName || 'General'}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <CalendarIcon size={11} /><span>{format(task.nextActionDate.toDate(), 'MMM dd, yyyy')}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <UserIcon size={11} /><span>{task.assignedToName || task.owner || 'Unassigned'}</span>
                </div>
                {task.activityLog && task.activityLog.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-primary mt-1">
                    <MessageSquare size={10} />{task.activityLog.length} update{task.activityLog.length > 1 ? 's' : ''}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// ── Pending Activities Group ──────────────────────────────────────
function ActivityGroup({ label, tasks, isOverdue, isToday: isTodayProp, onCardClick }: {
  label: string; tasks: Task[]; isOverdue?: boolean; isToday?: boolean;
  onCardClick: (task: Task) => void;
}) {
  const sorted = [...tasks].sort((a, b) => {
    if (isOverdue) return a.nextActionDate.seconds - b.nextActionDate.seconds; // oldest first
    const priorityOrder = { High: 0, Medium: 1, Low: 2 };
    return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
  });

  if (sorted.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
        {label} <span className="text-slate-400">({sorted.length})</span>
      </h3>
      <div className="space-y-2">
        {sorted.map(task => {
          const ageMs = Date.now() - task.nextActionDate.toDate().getTime();
          const ageDays = Math.floor(ageMs / 86400000);
          return (
            <div key={task.id}
              onClick={() => onCardClick(task)}
              className={`flex items-center gap-4 p-3 rounded-xl border bg-white cursor-pointer hover:shadow-md transition-all ${isOverdue ? 'border-red-200 bg-red-50/30' : isTodayProp ? 'border-blue-200' : 'border-slate-200'}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <PriorityDot priority={task.priority} />
                  <span className="text-xs font-bold text-slate-700 truncate">{task.nextAction}</span>
                </div>
                <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
                  <span>{task.type}</span>
                  <span>·</span>
                  <span>{task.customerName || 'General'}</span>
                  <span>·</span>
                  <span>{task.assignedToName || task.owner}</span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className={`text-xs font-bold ${isOverdue ? 'text-red-600' : isTodayProp ? 'text-blue-600' : 'text-slate-500'}`}>
                  {isOverdue ? `${ageDays}d overdue` : format(task.nextActionDate.toDate(), 'MMM dd')}
                </div>
                <Badge className={`text-[9px] mt-0.5 ${task.priority === 'High' ? 'bg-red-100 text-red-700' : task.priority === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                  {task.priority}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PriorityDot({ priority }: { priority: string }) {
  const colors = { High: 'bg-red-500', Medium: 'bg-amber-500', Low: 'bg-blue-400' };
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${colors[priority] || 'bg-slate-400'}`} />;
}
