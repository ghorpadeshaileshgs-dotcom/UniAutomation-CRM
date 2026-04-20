import React, { useMemo } from 'react';
import { 
  Users, 
  UserCheck, 
  TrendingUp, 
  Clock, 
  PieChart as PieChartIcon, 
  BarChart,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  BarChart as RechartsBarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  AreaChart,
  Area
} from 'recharts';
import { UserProfile, Lead, Task } from '../types';
import { format, subDays, isWithinInterval, startOfDay } from 'date-fns';

interface AdminDashboardProps {
  users: UserProfile[];
  leads: Lead[];
  tasks: Task[];
}

export default function AdminDashboard({ users, leads, tasks }: AdminDashboardProps) {
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter(u => u.isActive).length;
    const leadsCreated = leads.length;
    const pendingTasks = tasks.filter(t => t.status !== 'Completed').length;

    return { totalUsers, activeUsers, leadsCreated, pendingTasks };
  }, [users, leads, tasks]);

  const usageTrendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), i);
      return format(date, 'MMM dd');
    }).reverse();

    return last7Days.map(dayStr => {
      const dayLeads = leads.filter(l => 
        l.createdAt && format(l.createdAt.toDate(), 'MMM dd') === dayStr
      ).length;
      
      const dayTasks = tasks.filter(t => 
        t.createdAt && format(t.createdAt.toDate(), 'MMM dd') === dayStr
      ).length;

      return {
        name: dayStr,
        leads: dayLeads,
        tasks: dayTasks
      };
    });
  }, [leads, tasks]);

  const industryDistribution = useMemo(() => {
    const industries = leads.reduce((acc: Record<string, number>, lead) => {
      acc[lead.industry] = (acc[lead.industry] || 0) + 1;
      return acc;
    }, {});

    return Object.entries(industries).map(([name, value]) => ({ name, value }));
  }, [leads]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Total Users</p>
                <h3 className="text-2xl font-bold text-slate-900">{stats.totalUsers}</h3>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="text-blue-600 h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-[10px] text-slate-500">
              <span className="text-green-600 font-bold">●</span> Registered accounts
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Active Users</p>
                <h3 className="text-2xl font-bold text-slate-900">{stats.activeUsers}</h3>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <UserCheck className="text-green-600 h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-[10px] text-slate-500">
              <span className="text-blue-600 font-bold">{Math.round((stats.activeUsers / stats.totalUsers) * 100)}%</span> of total users
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Leads Created</p>
                <h3 className="text-2xl font-bold text-slate-900">{stats.leadsCreated}</h3>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <TrendingUp className="text-purple-600 h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-[10px] text-slate-500">
              <span className="text-purple-600 font-bold">Global</span> cumulative leads
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Tasks Pending</p>
                <h3 className="text-2xl font-bold text-slate-900">{stats.pendingTasks}</h3>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg">
                <Clock className="text-amber-600 h-5 w-5" />
              </div>
            </div>
            <div className="mt-4 flex items-center gap-1 text-[10px] text-slate-500">
              <span className="text-amber-600 font-bold">Action</span> items required
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="text-primary h-5 w-5" />
              <div>
                <CardTitle className="text-lg">System Usage Trends</CardTitle>
                <CardDescription>Daily lead and task creation (Last 7 Days)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usageTrendData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorTasks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#9333ea" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#9333ea" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b' }}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="leads" 
                  stroke="#2563eb" 
                  fillOpacity={1} 
                  fill="url(#colorLeads)" 
                  strokeWidth={2}
                />
                <Area 
                  type="monotone" 
                  dataKey="tasks" 
                  stroke="#9333ea" 
                  fillOpacity={1} 
                  fill="url(#colorTasks)" 
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <PieChartIcon className="text-primary h-5 w-5" />
              <div>
                <CardTitle className="text-lg">Leads by Industry</CardTitle>
                <CardDescription>Distribution of active business opportunities</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={industryDistribution} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  width={80}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="value" 
                  fill="#2563eb" 
                  radius={[0, 4, 4, 0]} 
                  barSize={12}
                />
              </RechartsBarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
