import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  IndianRupee, 
  Search, 
  Filter, 
  Download, 
  TrendingUp, 
  Calendar, 
  Activity, 
  Plus,
  ArrowUpRight,
  Target,
  BarChart3,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { Invoice, MonthlyTarget, Forecast, Debtor } from '../types';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  LineChart, 
  Line 
} from 'recharts';

interface FinanceManagementProps {
  invoices: Invoice[];
  targets: MonthlyTarget[];
  forecasts: Forecast[];
  debtors: Debtor[];
  onAddInvoice: () => void;
  onUpdateTarget: (target: MonthlyTarget) => void;
  onUpdateForecast: (forecast: Forecast) => void;
}

export default function FinanceManagement({ 
  invoices, 
  targets, 
  forecasts, 
  debtors,
  onAddInvoice,
  onUpdateTarget,
  onUpdateForecast
}: FinanceManagementProps) {
  const [activeTab, setActiveTab] = useState('invoices');
  const [invoiceSearch, setInvoiceSearch] = useState('');

  const filteredInvoices = invoices.filter(inv => 
    inv.invoiceNumber.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
    inv.customerName.toLowerCase().includes(invoiceSearch.toLowerCase())
  );

  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentMonthTarget = targets.find(t => t.month === currentMonth);
  const currentMonthActual = invoices
    .filter(inv => format(inv.invoiceDate.toDate(), 'yyyy-MM') === currentMonth)
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  
  const achievementPercentage = currentMonthTarget?.targetAmount 
    ? (currentMonthActual / currentMonthTarget.targetAmount) * 100 
    : 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Finance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Target size={14} />
              Monthly Goal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-end mb-2">
              <div className="text-2xl font-bold">₹{(currentMonthActual / 100000).toFixed(1)}L / ₹{((currentMonthTarget?.targetAmount || 0) / 100000).toFixed(1)}L</div>
              <Badge variant="outline" className="bg-primary/5 text-primary text-[10px] font-bold">
                {achievementPercentage.toFixed(1)}%
              </Badge>
            </div>
            <Progress value={achievementPercentage} className="h-2" />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Clock size={14} />
              Outstanding Collection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(debtors.reduce((sum, d) => sum + d.amount, 0) / 100000).toFixed(1)}L</div>
            <p className="text-xs text-slate-400 mt-1 font-medium">Across {debtors.length} customers</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={14} />
              Forecast Value (Next 3M)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(forecasts.flatMap(f => f.forecasts || []).reduce((sum, e) => sum + e.amount, 0) / 100000).toFixed(1)}L</div>
            <p className="text-xs text-green-600 mt-1 font-bold flex items-center gap-1">
              <ArrowUpRight size={14} />
              +15% vs LY
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList className="bg-white p-1 shadow-sm border border-slate-200 w-full md:w-auto overflow-x-auto justify-start">
          <TabsTrigger value="invoices" className="gap-2">
            <FileText size={16} />
            Invoices & Payments
          </TabsTrigger>
          <TabsTrigger value="targets" className="gap-2">
            <Target size={16} />
            Targets
          </TabsTrigger>
          <TabsTrigger value="forecasting" className="gap-2">
            <BarChart3 size={16} />
            Forecasting
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input 
                placeholder="Search invoices..." 
                className="pl-10 h-10 border-slate-200 bg-white"
                value={invoiceSearch}
                onChange={(e) => setInvoiceSearch(e.target.value)}
              />
            </div>
            <Button onClick={onAddInvoice} className="h-10 gap-2 font-bold shadow-sm">
              <Plus size={18} />
              Generate Invoice
            </Button>
          </div>

          <Card className="shadow-sm border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50">
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Invoice Info</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{inv.invoiceNumber}</div>
                        <div className="text-[10px] font-bold text-slate-400 font-mono tracking-tighter mt-0.5">
                          {format(inv.invoiceDate.toDate(), 'dd MMM yyyy')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold text-slate-700">{inv.customerName}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 font-bold text-slate-900">
                          <IndianRupee size={14} className="text-slate-400" />
                          {inv.amount.toLocaleString()}
                        </div>
                        <div className="text-[10px] font-bold text-emerald-600 mt-0.5">
                          Paid: ₹{inv.paymentReceived?.toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="secondary" className={`font-bold text-[10px] ${
                          inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                          inv.status === 'Overdue' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {inv.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8 font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="targets">
           {/* Add targets UI here */}
           <div className="py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
             <Target className="h-12 w-12 text-slate-200 mx-auto mb-4" />
             <h3 className="text-lg font-bold text-slate-900">Performance Targets</h3>
             <p className="text-slate-500 max-w-sm mx-auto mt-2">Manage monthly revenue targets for individual sales team members and tracking achievement.</p>
           </div>
        </TabsContent>

        <TabsContent value="forecasting">
           {/* Add forecasting UI here */}
           <div className="py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
             <BarChart3 className="h-12 w-12 text-slate-200 mx-auto mb-4" />
             <h3 className="text-lg font-bold text-slate-900">Strategic Forecasting</h3>
             <p className="text-slate-500 max-w-sm mx-auto mt-2">Project future sales based on pipeline probability and historical performance trends.</p>
           </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
