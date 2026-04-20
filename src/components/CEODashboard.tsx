import React, { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  PieChart, 
  Pie, 
  Cell,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Briefcase, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  PieChart as PieChartIcon,
  Activity
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval, isPast } from 'date-fns';
import { 
  Lead, 
  Task, 
  Quote, 
  SalesOrder, 
  Invoice, 
  MonthlyTarget, 
  Forecast, 
  ApprovalRequest, 
  Debtor 
} from '../types';

interface CEODashboardProps {
  leads: Lead[];
  tasks: Task[];
  quotes: Quote[];
  salesOrders: SalesOrder[];
  invoices: Invoice[];
  targets: MonthlyTarget[];
  forecasts: Forecast[];
  approvals: ApprovalRequest[];
  debtors: Debtor[];
}

const COLORS = ['#0f172a', '#334155', '#64748b', '#94a3b8', '#cbd5e1'];

export default function CEODashboard({ 
  leads, 
  tasks, 
  quotes, 
  salesOrders, 
  invoices, 
  targets, 
  forecasts, 
  approvals, 
  debtors 
}: CEODashboardProps) {
  
  // 1. Financial Metrics
  const metrics = useMemo(() => {
    const totalOrderValue = salesOrders.reduce((sum, order) => sum + (order.soValue || 0), 0);
    const totalInvoiced = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
    const totalCollection = invoices.reduce((sum, inv) => sum + (inv.paymentReceived || 0), 0);
    const totalOutstanding = debtors.reduce((sum, debtor) => sum + (debtor.amount || 0), 0);
    
    // Performance vs Target
    const currentMonth = format(new Date(), 'yyyy-MM');
    const monthlyTarget = targets.find(t => t.month === currentMonth)?.targetAmount || 0;
    const monthlyActual = invoices
      .filter(inv => format(inv.invoiceDate.toDate(), 'yyyy-MM') === currentMonth)
      .reduce((sum, inv) => sum + (inv.amount || 0), 0);
    
    const achievementRatio = monthlyTarget > 0 ? (monthlyActual / monthlyTarget) * 100 : 0;

    return {
      totalOrderValue,
      totalInvoiced,
      totalCollection,
      totalOutstanding,
      monthlyTarget,
      monthlyActual,
      achievementRatio
    };
  }, [salesOrders, invoices, debtors, targets]);

  // 2. Sales Funnel Data
  const funnelData = useMemo(() => {
    const stages = [
      'Lead', 
      'Qualified', 
      'Requirement Understanding', 
      'Techno-Commercial Offer', 
      'Quoted', 
      'Follow-up', 
      'Negotiation', 
      'PO Expected', 
      'PO Received', 
      'Closed Won', 
      'Closed Lost'
    ];
    return stages.map(stage => ({
      name: stage,
      value: leads.filter(l => l.stage === stage).length
    }));
  }, [leads]);

  // 3. Revenue Trend (Last 6 Months)
  const revenueTrend = useMemo(() => {
    const months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), 5 - i);
      return format(date, 'MMM yy');
    });

    return months.map(month => {
      const monthDate = format(new Date(month + ' 01'), 'yyyy-MM');
      const monthlyRevenue = invoices
        .filter(inv => format(inv.invoiceDate.toDate(), 'yyyy-MM') === monthDate)
        .reduce((sum, inv) => sum + (inv.amount || 0), 0);
      
      const forecastVal = forecasts
        .flatMap(f => f.forecasts || [])
        .find(e => e.month === monthDate)?.amount || 0;

      return {
        name: month,
        Revenue: monthlyRevenue,
        Forecast: forecastVal
      };
    });
  }, [invoices, forecasts]);

  // 4. Governance & Quality
  const pendingApprovals = approvals.filter(a => a.status === 'Pending').length;
  const criticalComplaints = tasks.filter(t => t.priority === 'High' && t.status !== 'Completed').length;
  const overdueTasks = tasks.filter(t => isPast(t.nextActionDate.toDate()) && t.status !== 'Completed').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Top Level Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          title="Total Order Book" 
          value={`₹${(metrics.totalOrderValue / 1000000).toFixed(2)}M`} 
          description="Total confirmed orders"
          icon={<Briefcase className="h-4 w-4" />}
          trend="+12% vs last month"
          trendUp={true}
        />
        <MetricCard 
          title="Month Revenue" 
          value={`₹${(metrics.monthlyActual / 1000000).toFixed(2)}M`} 
          description={`${metrics.achievementRatio.toFixed(1)}% of Target`}
          icon={<DollarSign className="h-4 w-4" />}
          trend={`${metrics.achievementRatio >= 100 ? '+' : ''}${(metrics.achievementRatio - 100).toFixed(1)}%`}
          trendUp={metrics.achievementRatio >= 100}
        />
        <MetricCard 
          title="Outstanding" 
          value={`₹${(metrics.totalOutstanding / 1000000).toFixed(2)}M`} 
          description="Awaiting collection"
          icon={<Activity className="h-4 w-4" />}
          trend="8% Overdue"
          trendUp={false}
        />
        <MetricCard 
          title="Efficiency" 
          value={`${((leads.filter(l => l.stage === 'Closed Won').length / Math.max(leads.length, 1)) * 100).toFixed(1)}%`} 
          description="Lead-to-Order conversion"
          icon={<TrendingUp className="h-4 w-4" />}
          trend="Target 25%"
          trendUp={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Revenue Trend Chart */}
        <Card className="lg:col-span-2 shadow-sm border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="text-lg font-bold">Revenue Performance</CardTitle>
              <CardDescription>Actual Revenue vs Forecast (Last 6 Months)</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueTrend}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0f172a" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748b' }}
                    tickFormatter={(value) => `₹${value / 1000}k`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="Revenue" stroke="#0f172a" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                  <Line type="monotone" dataKey="Forecast" stroke="#94a3b8" strokeDasharray="5 5" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Sales Funnel State */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Sales Pipeline</CardTitle>
            <CardDescription>Count by stage</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={funnelData} margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    width={80} 
                    axisLine={false} 
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="value" fill="#0f172a" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Governance & Critical Alerts */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Governance & Controls</CardTitle>
            <CardDescription>Operational health and compliance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <AlertItem 
              icon={<ShieldCheck className="h-5 w-5 text-blue-600" />}
              label="Pending Approvals"
              value={pendingApprovals}
              status={pendingApprovals > 5 ? 'Warning' : 'Good'}
              action="Review and approve high-value quotes"
            />
            <AlertItem 
              icon={<AlertCircle className="h-5 w-5 text-red-600" />}
              label="Critical Open Tasks"
              value={criticalComplaints}
              status={criticalComplaints > 0 ? 'Urgent' : 'Good'}
              action="Resource allocation required for urgent issues"
            />
            <AlertItem 
              icon={<Clock className="h-5 w-5 text-orange-600" />}
              label="Overdue Actions"
              value={overdueTasks}
              status={overdueTasks > 10 ? 'Urgent' : 'Warning'}
              action="Follow up on delayed project milestones"
            />
          </CardContent>
        </Card>

        {/* Collection Efficiency */}
        <Card className="shadow-sm border-slate-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold">Collection Efficiency</CardTitle>
            <CardDescription>Payment cycle status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="text-sm font-medium text-slate-600">Overall Success Rate</span>
                <span className="text-2xl font-bold">
                  {metrics.totalInvoiced > 0 ? ((metrics.totalCollection / metrics.totalInvoiced) * 100).toFixed(1) : 0}%
                </span>
              </div>
              <Progress value={metrics.totalInvoiced > 0 ? (metrics.totalCollection / metrics.totalInvoiced) * 100 : 0} className="h-2" />
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Invoiced this Month</p>
                <p className="text-lg font-bold">₹{(metrics.monthlyActual / 100000).toFixed(1)}L</p>
              </div>
              <div className="p-4 rounded-xl bg-orange-50 border border-orange-100">
                <p className="text-xs text-orange-600 font-medium uppercase tracking-wider mb-1">Overdue 90+ Days</p>
                <p className="text-lg font-bold text-orange-700">₹{(debtors.filter(d => d.amount > 10000).reduce((s,d) => s + d.amount, 0) / 100000).toFixed(1)}L</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ title, value, description, icon, trend, trendUp }: any) {
  return (
    <Card className="shadow-sm border-slate-200 hover:border-slate-300 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {title}
        </CardTitle>
        <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="flex items-center gap-2 mt-1">
          <Badge variant={trendUp ? 'outline' : 'destructive'} className={`text-[10px] px-1.5 py-0 h-4 ${trendUp ? 'bg-green-50 text-green-700 border-green-200' : ''}`}>
            {trendUp ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
            {trend}
          </Badge>
          <span className="text-[11px] text-slate-400 font-medium">{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}

function AlertItem({ icon, label, value, status, action }: any) {
  const statusColors = {
    Good: 'bg-green-100 text-green-700',
    Warning: 'bg-orange-100 text-orange-700',
    Urgent: 'bg-red-100 text-red-700'
  };

  return (
    <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
      <div className="shrink-0 mt-1">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-sm font-semibold text-slate-800">{label}</h4>
          <Badge variant="secondary" className={`text-[10px] font-bold ${statusColors[status as keyof typeof statusColors]}`}>
            {value}
          </Badge>
        </div>
        <p className="text-xs text-slate-500 mb-2 truncate">{action}</p>
        <Progress value={Math.min((value / 20) * 100, 100)} className="h-1" />
      </div>
    </div>
  );
}

function ShieldCheck(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
