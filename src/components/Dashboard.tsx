import React, { useMemo, useState } from 'react';
import { Lead, LeadStage, Debtor, Task, DesignReview, Quote, Complaint, Industry, CustomerType } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  Users, 
  Target, 
  CheckCircle2, 
  IndianRupee, 
  BarChart3, 
  AlertCircle, 
  Clock, 
  FileText, 
  ShieldAlert, 
  CheckSquare,
  Filter,
  ArrowUpRight,
  Zap,
  Briefcase
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, isPast, isToday } from 'date-fns';
import { useFirebase } from '../hooks/useFirebase';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

interface DashboardProps {
  leads: Lead[];
  debtors: Debtor[];
  tasks: Task[];
  designReviews: DesignReview[];
  quotes: Quote[];
  complaints: Complaint[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

import ExportActions from './ExportActions';

export default function Dashboard({ leads, debtors, tasks, designReviews, quotes, complaints }: DashboardProps) {
  const { user, team } = useFirebase();
  const [industryFilter, setIndustryFilter] = useState<Industry | 'All'>('All');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<CustomerType | 'All'>('All');

  const filteredLeads = useMemo(() => {
    return leads.filter(l => {
      const industryMatch = industryFilter === 'All' || l.industry === industryFilter;
      const customerTypeMatch = customerTypeFilter === 'All' || l.customerType === customerTypeFilter;
      return industryMatch && customerTypeMatch;
    });
  }, [leads, industryFilter, customerTypeFilter]);

  const exportSummaryData = useMemo(() => {
    return [
      { metric: 'Total Leads', value: filteredLeads.length },
      { metric: 'Total Estimated Value', value: filteredLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0) },
      { metric: 'Total Won Leads', value: filteredLeads.filter(l => l.stage === 'Closed Won').length },
      { metric: 'Pending Tasks', value: tasks.filter(t => t.status !== 'Completed').length },
      { metric: 'Outstanding Debtors', value: debtors.filter(d => d.status !== 'Paid').length },
      { metric: 'Total Complaints', value: complaints.length },
    ];
  }, [filteredLeads, tasks, debtors, complaints]);

  const stats = useMemo(() => {
    const totalLeads = filteredLeads.length;
    const totalValue = filteredLeads.reduce((acc, l) => acc + (l.estimatedValue || 0), 0);
    const wonLeads = filteredLeads.filter(l => l.stage === 'Closed Won' || l.poReceived);
    const totalWonValue = wonLeads.reduce((acc, l) => acc + (l.poValue || l.estimatedValue || 0), 0);
    const conversionRate = totalLeads > 0 ? (wonLeads.length / totalLeads) * 100 : 0;
    
    // High Priority Leads
    const highPriorityLeads = filteredLeads.filter(l => l.priority === 'High' && !['Closed Won', 'Closed Lost'].includes(l.stage));
    
    // Feasibility Pending
    const feasibilityPending = filteredLeads.filter(l => l.productCategory !== 'Standard' && l.feasibilityStatus === 'Pending');

    // Overdue Tasks (Global for Management)
    const overdueTasks = tasks.filter(t => t.status !== 'Completed' && isPast(t.nextActionDate.toDate()) && !isToday(t.nextActionDate.toDate()));

    // Overdue Invoices
    const overdueInvoices = debtors.filter(d => 
      d.status !== 'Paid' && 
      isPast(d.dueDate.toDate()) && 
      !isToday(d.dueDate.toDate())
    );

    const totalOutstanding = debtors.reduce((sum, d) => d.status !== 'Paid' ? sum + d.amount : sum, 0);
    const totalCollected = debtors.reduce((sum, d) => d.status === 'Paid' ? sum + d.amount : sum, 0);
    const collectionRate = totalOutstanding + totalCollected > 0 
      ? (totalCollected / (totalOutstanding + totalCollected)) * 100 
      : 0;

    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const pendingTasks = tasks.filter(t => t.status !== 'Completed').length;
    const taskCompletionRate = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0;

    // Design Review Stats
    const totalDesignRequests = designReviews.length;
    const pendingDesignReviews = designReviews.filter(r => r.feasibilityStatus === 'Pending').length;
    const completedDesignReviews = designReviews.filter(r => r.feasibilityStatus !== 'Pending');
    const avgTurnaroundTime = completedDesignReviews.length > 0 
      ? completedDesignReviews.reduce((acc, r) => acc + (r.turnaroundTime || 0), 0) / completedDesignReviews.length 
      : 0;

    // Quote Stats (Enhanced with Lead-embedded Quote data)
    const quoteDataFromLeads = leads.filter(l => l.quote && l.quote.revisions.length > 0);
    const totalQuoteValue = quoteDataFromLeads.reduce((acc, l) => acc + (l.quote?.latestRevision?.totalAmount || 0), 0);
    const totalRevisionCount = quoteDataFromLeads.reduce((acc, l) => acc + (l.quote?.revisions.length || 0), 0);
    const avgRevisionsPerLead = quoteDataFromLeads.length > 0 ? (totalRevisionCount / quoteDataFromLeads.length).toFixed(1) : '0';
    
    // Status metrics
    const acceptedLeadQuotes = leads.filter(l => l.quote?.latestRevision?.status === 'Accepted').length;
    const totalLeadsWithQuotes = quoteDataFromLeads.length;
    const quoteWinRate = totalLeadsWithQuotes > 0 ? (acceptedLeadQuotes / totalLeadsWithQuotes) * 100 : 0;

    // Complaint Stats
    const totalComplaints = complaints.length;
    const openComplaints = complaints.filter(c => c.status !== 'Closed').length;
    const closedComplaints = complaints.filter(c => c.status === 'Closed').length;
    const criticalComplaints = complaints.filter(c => c.severity === 'Critical' && c.status !== 'Closed').length;
    const avgClosureTime = closedComplaints > 0 
      ? complaints.filter(c => c.status === 'Closed').reduce((acc, c) => acc + (c.turnaroundTime || 0), 0) / closedComplaints 
      : 0;

    // Engineer Performance
    const engineers = Array.from(new Set(designReviews.map(r => r.assignedTo)));
    const engineerPerformance = engineers.map(eng => {
      const engReviews = designReviews.filter(r => r.assignedTo === eng);
      const engCompleted = engReviews.filter(r => r.feasibilityStatus !== 'Pending');
      const engAvgTAT = engCompleted.length > 0 
        ? engCompleted.reduce((acc, r) => acc + (r.turnaroundTime || 0), 0) / engCompleted.length 
        : 0;
      return {
        name: eng,
        total: engReviews.length,
        completed: engCompleted.length,
        avgTAT: engAvgTAT.toFixed(1)
      };
    });

    // Funnel Data (Management View: Count and Value)
    const stages: LeadStage[] = ["Lead", "Qualified", "Requirement Understanding", "Techno-Commercial Offer", "Quoted", "Follow-up", "Negotiation", "PO Expected", "PO Received", "Closed Won"];
    const funnelData = stages.map(stage => ({
      name: stage,
      count: filteredLeads.filter(l => l.stage === stage).length,
      value: filteredLeads.filter(l => l.stage === stage).reduce((acc, l) => acc + (l.estimatedValue || 0), 0) / 100000 // In Lakhs for chart
    }));

    // Industry Data
    const industries = ["Defence", "Locomotive", "Industrial", "Automobile", "Other"];
    const industryData = industries.map(ind => ({
      name: ind,
      value: filteredLeads.filter(l => l.industry === ind).length
    }));

    // Monthly Booking
    const last6Months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date()
    });

    const monthlyData = last6Months.map(month => {
      const monthLeads = filteredLeads.filter(l => {
        if (!l.poDate) return false;
        const d = l.poDate.toDate();
        return d >= startOfMonth(month) && d <= endOfMonth(month);
      });
      return {
        name: format(month, 'MMM'),
        value: monthLeads.reduce((acc, l) => acc + (l.poValue || 0), 0)
      };
    });

    // Salesperson Performance
    const salesPeople = Array.from(new Set(filteredLeads.map(l => l.salespersonName)));
    const salesPerformance = salesPeople.map(sp => {
      const spLeads = filteredLeads.filter(l => l.salespersonName === sp);
      const spWon = spLeads.filter(l => l.stage === 'Closed Won' || l.poReceived);
      return {
        name: sp,
        leads: spLeads.length,
        won: spWon.length,
        conversion: spLeads.length > 0 ? (spWon.length / spLeads.length * 100).toFixed(1) : '0'
      };
    });

    return { 
      totalLeads, 
      totalValue, 
      totalWonValue, 
      conversionRate, 
      funnelData, 
      industryData, 
      monthlyData, 
      salesPerformance, 
      overdueTasks,
      highPriorityLeads,
      feasibilityPending,
      teamPerformance: salesPerformance,
      totalOutstanding,
      collectionRate,
      taskCompletionRate,
      completedTasks,
      pendingTasks,
      totalDesignRequests,
      pendingDesignReviews,
      avgTurnaroundTime,
      engineerPerformance,
      totalQuoteValue,
      totalRevisionCount,
      avgRevisionsPerLead,
      quoteWinRate,
      totalComplaints,
      openComplaints,
      criticalComplaints,
      avgClosureTime,
      overdueInvoices
    };
  }, [filteredLeads, debtors, tasks, designReviews, quotes, complaints]);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Management Dashboard</h2>
          <p className="text-slate-500 text-sm">Strategic performance & pipeline analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1 text-xs shadow-sm">
            <Filter size={14} className="text-slate-400" />
            <span className="font-semibold text-slate-500 mr-2">Filters:</span>
            <Select value={industryFilter} onValueChange={(val) => setIndustryFilter(val as Industry | 'All')}>
              <SelectTrigger className="w-[140px] h-8 border-none shadow-none focus:ring-0">
                <SelectValue placeholder="Industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Industries</SelectItem>
                <SelectItem value="Defence">Defence</SelectItem>
                <SelectItem value="Locomotive">Locomotive</SelectItem>
                <SelectItem value="Industrial">Industrial</SelectItem>
                <SelectItem value="Automobile">Automobile</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>

            <div className="w-px h-4 bg-slate-200 mx-1" />

            <Select value={customerTypeFilter} onValueChange={(val) => setCustomerTypeFilter(val as CustomerType | 'All')}>
              <SelectTrigger className="w-[140px] h-8 border-none shadow-none focus:ring-0">
                <SelectValue placeholder="Customer Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Types</SelectItem>
                <SelectItem value="OEM">OEM</SelectItem>
                <SelectItem value="End User">End User</SelectItem>
                <SelectItem value="Project">Project</SelectItem>
                <SelectItem value="Design House">Design House</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <ExportActions data={exportSummaryData} fileName="management_dashboard" title="Management Dashboard Summary" />
        </div>
      </div>

      {/* Sales Team Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Users className="text-primary" />
              Industry BDMs & Sales Support
            </CardTitle>
            <CardDescription>
              Business Development Managers responsible for specific industry sectors.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {["Defence", "Locomotive", "Industrial", "Automobile", "Other"].map(industry => (
                <div key={industry} className="p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{industry}</p>
                  <p className="text-sm font-semibold text-slate-700">{industry} BDM</p>
                </div>
              ))}
              <div className="p-3 rounded-lg border border-indigo-100 bg-indigo-50/30">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Support</p>
                <p className="text-sm font-semibold text-indigo-700">Sales Support</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-primary text-white">
          <CardHeader>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Target className="text-white/80" />
              BDM Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-white/80">
              Leads are automatically assigned to the respective Industry BDM upon creation.
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs border-b border-white/10 pb-2">
                <span>Industry Leads</span>
                <span className="font-bold">Auto-assigned</span>
              </div>
              <div className="flex justify-between text-xs border-b border-white/10 pb-2">
                <span>Debtors Follow-up</span>
                <span className="font-bold">BDM Responsible</span>
              </div>
              <div className="flex justify-between text-xs">
                <span>Sales Support</span>
                <span className="font-bold">Cross-Industry</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overdue Reminders */}
      {stats.overdueInvoices.length > 0 && (
        <Card className="border-red-100 bg-red-50/30 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-red-800 flex items-center gap-2 text-lg">
              <AlertCircle size={20} />
              Overdue Invoice Reminders
            </CardTitle>
            <CardDescription className="text-red-600">
              There are {stats.overdueInvoices.length} overdue invoices that require immediate follow-up.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {stats.overdueInvoices.slice(0, 6).map(invoice => (
                <div key={invoice.id} className="bg-white p-3 rounded-lg border border-red-100 shadow-sm flex flex-col gap-2">
                  <div className="flex justify-between items-start">
                    <span className="font-bold text-slate-900 truncate">{invoice.customerName}</span>
                    <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Inv: #{invoice.invoiceNumber}</span>
                    <span className="font-bold text-red-600">₹{invoice.amount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400">
                    <Clock size={10} />
                    <span>Due: {format(invoice.dueDate.toDate(), 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Priority & Critical Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm h-full overflow-hidden">
          <CardHeader className="bg-rose-50/50 pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-rose-700">
              <Zap size={16} />
              High Priority Leads
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {stats.highPriorityLeads.length > 0 ? (
                stats.highPriorityLeads.slice(0, 5).map(lead => (
                  <div key={lead.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <p className="font-bold text-slate-900 text-sm truncate">{lead.customerName}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] text-slate-500 font-medium">{lead.stage}</span>
                      <span className="font-mono text-[11px] font-bold text-slate-700">₹{lead.estimatedValue.toLocaleString()}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-xs">No high priority leads</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm h-full overflow-hidden">
          <CardHeader className="bg-amber-50/50 pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-amber-700">
              <Clock size={16} />
              Feasibility Pending
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {stats.feasibilityPending.length > 0 ? (
                stats.feasibilityPending.slice(0, 5).map(lead => (
                  <div key={lead.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <p className="font-bold text-slate-900 text-sm truncate">{lead.customerName}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] text-slate-500 font-medium">{lead.partName}</span>
                      <Badge variant="outline" className="text-[9px] h-4 py-0 border-amber-200 text-amber-600">Pending</Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-xs">No pending feasibility reviews</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm h-full overflow-hidden">
          <CardHeader className="bg-slate-50 pb-4">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-700">
              <CheckSquare size={16} />
              Overdue Tasks
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-100">
              {stats.overdueTasks.length > 0 ? (
                stats.overdueTasks.slice(0, 5).map(task => (
                  <div key={task.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <p className="font-bold text-slate-900 text-sm truncate">{task.nextAction}</p>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{task.customerName}</span>
                      <span className="text-[11px] font-bold text-rose-600">{format(task.nextActionDate.toDate(), 'dd MMM')}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400">
                  <p className="text-xs">No overdue tasks</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Pipeline" 
          value={`₹${(stats.totalValue / 100000).toFixed(1)}L`} 
          icon={<TrendingUp className="text-blue-600" />}
          description={`${filteredLeads.length} leads in funnel`}
          trend={+12}
        />
        <StatCard 
          title="Conversion %" 
          value={`${stats.conversionRate.toFixed(1)}%`} 
          icon={<Target className="text-emerald-600" />}
          description="Lead to PO conversion"
          trend={+4.2}
        />
        <StatCard 
          title="Avg Deal Value" 
          value={`₹${(stats.totalValue / Math.max(stats.totalLeads, 1) / 1000).toFixed(1)}K`} 
          icon={<ArrowUpRight className="text-indigo-600" />}
          description="Per opportunity"
        />
        <StatCard 
          title="Success Value" 
          value={`₹${(stats.totalWonValue / 100000).toFixed(1)}L`} 
          icon={<CheckCircle2 className="text-green-600" />}
          description="Revenue booked"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Sales Funnel Value Analysis */}
        <Card className="shadow-sm border-none bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 size={20} className="text-primary" />
                  Sales Funnel Analytics
                </CardTitle>
                <CardDescription>Opportunity Volume vs Value (₹ Lakhs)</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={stats.funnelData} 
                layout="vertical" 
                margin={{ left: 40, right: 40 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" width={140} fontSize={10} stroke="#64748b" />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                <Bar name="Count" dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                <Bar name="Value (L)" dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Booking */}
        <Card className="shadow-sm border-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp size={20} className="text-green-600" />
              Order Booking
            </CardTitle>
            <CardDescription>Monthly PO value (Last 6 months)</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => `₹${value.toLocaleString()}`}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Industry Performance */}
        <Card className="shadow-sm border-none">
          <CardHeader>
            <CardTitle>Industry Distribution</CardTitle>
            <CardDescription>Leads by sector</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.industryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.industryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Metrics */}
        <Card className="shadow-sm border-none">
          <CardHeader>
            <CardTitle>Conversion Metrics</CardTitle>
            <CardDescription>Key performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <MetricRow 
              label="Lead → Quote" 
              value={leads.length > 0 ? (leads.filter(l => l.quoteCreated).length / leads.length * 100).toFixed(1) : '0'} 
              color="bg-blue-500"
            />
            <MetricRow 
              label="Quote → PO" 
              value={leads.filter(l => l.quoteCreated).length > 0 ? (leads.filter(l => l.poReceived).length / leads.filter(l => l.quoteCreated).length * 100).toFixed(1) : '0'} 
              color="bg-green-500"
            />
            <MetricRow 
              label="Win Rate" 
              value={stats.conversionRate.toFixed(1)} 
              color="bg-purple-500"
            />
          </CardContent>
        </Card>

        {/* Salesperson Performance */}
        <Card className="shadow-sm border-none lg:col-span-2">
          <CardHeader>
            <CardTitle>Salesperson Performance</CardTitle>
            <CardDescription>Leads and conversions by team member</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Name</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Leads</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Won</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Conversion %</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {stats.salesPerformance.map((sp) => (
                    <tr key={sp.name} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <td className="p-4 align-middle font-medium">{sp.name}</td>
                      <td className="p-4 align-middle">{sp.leads}</td>
                      <td className="p-4 align-middle">{sp.won}</td>
                      <td className="p-4 align-middle">
                        <Badge variant={parseFloat(sp.conversion) > 20 ? "default" : "secondary"}>
                          {sp.conversion}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Engineer Performance */}
        <Card className="shadow-sm border-none lg:col-span-2">
          <CardHeader>
            <CardTitle>Design Engineer Performance</CardTitle>
            <CardDescription>Review turnaround time and completion</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <table className="w-full caption-bottom text-sm">
                <thead className="[&_tr]:border-b">
                  <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Engineer</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Total Requests</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Completed</th>
                    <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Avg TAT (h)</th>
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {stats.engineerPerformance.map((eng) => (
                    <tr key={eng.name} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <td className="p-4 align-middle font-medium">{eng.name || 'Unassigned'}</td>
                      <td className="p-4 align-middle">{eng.total}</td>
                      <td className="p-4 align-middle">{eng.completed}</td>
                      <td className="p-4 align-middle">
                        <Badge variant={parseFloat(eng.avgTAT) < 24 ? "default" : "secondary"}>
                          {eng.avgTAT}h
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, description, trend }: { title: string, value: string | number, icon: React.ReactNode, description: string, trend?: number }) {
  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-2.5 bg-slate-50 rounded-xl text-primary">
            {icon}
          </div>
          {trend && (
            <div className={`flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${trend > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
              <TrendingUp size={10} className={trend < 0 ? 'rotate-180' : ''} />
              {Math.abs(trend)}%
            </div>
          )}
        </div>
        <div className="space-y-1">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{title}</p>
          <div className="flex items-baseline gap-1.5">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900">{value}</h3>
          </div>
          <p className="text-[10px] text-slate-500 font-medium leading-none mt-1">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, value, color }: { label: string, value: string, color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-sm font-medium text-slate-600">{label}</span>
        <span className="text-lg font-bold text-slate-900">{value}%</span>
      </div>
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div 
          className={`${color} h-full transition-all duration-500`} 
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}
