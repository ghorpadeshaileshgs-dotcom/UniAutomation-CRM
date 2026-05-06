import React, { useState, useMemo } from 'react';
import { FileText, IndianRupee, Search, TrendingUp, Calendar, BarChart3, Plus, ArrowUpRight, Target, Clock, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { Invoice, MonthlyTarget, Forecast, Customer } from '../types';
import InvoiceForm from './InvoiceForm';
import BulkInvoiceUpload from './BulkInvoiceUpload';
import DebtorsTab from './DebtorsTab';
import { financeService } from '../services/financeService';
import { useFirebase } from '../hooks/useFirebase';
import { toast } from 'sonner';

interface FinanceManagementProps {
  invoices: Invoice[];
  targets: MonthlyTarget[];
  forecasts: Forecast[];
  customers: Customer[];
  onUpdateTarget: (target: MonthlyTarget) => void;
  onUpdateForecast: (forecast: Forecast) => void;
}

const paymentStatusColor = (s: string) => {
  if (s === 'Paid') return 'bg-emerald-100 text-emerald-700';
  if (s === 'Overdue') return 'bg-red-100 text-red-700';
  if (s === 'Partially Paid') return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
};

export default function FinanceManagement({ invoices, targets, forecasts, customers, onUpdateTarget, onUpdateForecast }: FinanceManagementProps) {
  const { user } = useFirebase();
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [invoiceSearch, setInvoiceSearch] = useState('');

  const filteredInvoices = useMemo(() =>
    invoices.filter(inv =>
      inv.invoiceNumber?.toLowerCase().includes(invoiceSearch.toLowerCase()) ||
      inv.customerName?.toLowerCase().includes(invoiceSearch.toLowerCase())
    ), [invoices, invoiceSearch]);

  const currentMonth = format(new Date(), 'yyyy-MM');
  const currentMonthTarget = targets.find(t => t.month === currentMonth);
  const currentMonthActual = invoices
    .filter(inv => inv.invoiceDate && format(inv.invoiceDate.toDate(), 'yyyy-MM') === currentMonth)
    .reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const achievementPct = currentMonthTarget?.targetAmount ? Math.min(100, (currentMonthActual / currentMonthTarget.targetAmount) * 100) : 0;

  const totalOutstanding = invoices
    .filter(inv => inv.paymentStatus !== 'Paid')
    .reduce((sum, inv) => sum + (inv.balanceDue || 0), 0);

  const handleAddInvoice = async (data: any) => {
    await financeService.addInvoice(data, user);
  };

  const handleUpdateInvoice = async (data: any) => {
    if (!editingInvoice) return;
    await financeService.updateInvoice(editingInvoice.id, data, user);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Overview KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Target size={14} />Monthly Goal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-end mb-2">
              <div className="text-2xl font-bold">₹{(currentMonthActual / 100000).toFixed(1)}L / ₹{((currentMonthTarget?.targetAmount || 0) / 100000).toFixed(1)}L</div>
              <Badge variant="outline" className="bg-primary/5 text-primary text-[10px] font-bold">{achievementPct.toFixed(1)}%</Badge>
            </div>
            <Progress value={achievementPct} className="h-2" />
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Clock size={14} />Outstanding Collection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(totalOutstanding / 100000).toFixed(1)}L</div>
            <p className="text-xs text-slate-400 mt-1 font-medium">Across {invoices.filter(i => i.paymentStatus !== 'Paid').length} unpaid invoices</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={14} />Total Invoiced (All Time)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(invoices.reduce((s, i) => s + (i.amount || 0), 0) / 100000).toFixed(1)}L</div>
            <p className="text-xs text-green-600 mt-1 font-bold flex items-center gap-1"><ArrowUpRight size={14} />{invoices.length} invoices</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList className="bg-white p-1 shadow-sm border border-slate-200 flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="invoices" className="gap-2"><FileText size={16} />Invoices</TabsTrigger>
          <TabsTrigger value="debtors" className="gap-2"><IndianRupee size={16} />Debtors</TabsTrigger>
          <TabsTrigger value="targets" className="gap-2"><Target size={16} />Targets</TabsTrigger>
          <TabsTrigger value="forecasting" className="gap-2"><BarChart3 size={16} />Forecasting</TabsTrigger>
        </TabsList>

        {/* INVOICES TAB */}
        <TabsContent value="invoices" className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input placeholder="Search invoices..." className="pl-10 h-10" value={invoiceSearch} onChange={e => setInvoiceSearch(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="h-10 gap-2" onClick={() => setShowBulkUpload(true)}>
                <Upload size={16} />Bulk Import
              </Button>
              <Button className="h-10 gap-2 font-bold shadow-sm" onClick={() => { setEditingInvoice(null); setShowInvoiceForm(true); }}>
                <Plus size={18} />New Invoice
              </Button>
            </div>
          </div>

          <Card className="shadow-sm border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50">
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Invoice</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Due Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Amount</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right hidden sm:table-cell">Balance</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInvoices.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-12 text-slate-400 text-sm">No invoices yet. Click "New Invoice" to create the first one.</td></tr>
                  ) : filteredInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 font-mono">{inv.invoiceNumber}</div>
                        <div className="text-[10px] font-bold text-slate-400 mt-0.5">{inv.invoiceDate ? format(inv.invoiceDate.toDate(), 'dd MMM yyyy') : '—'}</div>
                      </td>
                      <td className="px-6 py-4"><div className="text-sm font-semibold text-slate-700">{inv.customerName}</div></td>
                      <td className="px-6 py-4 hidden sm:table-cell text-sm text-slate-500">{inv.dueDate ? format(inv.dueDate.toDate(), 'dd MMM yyyy') : '—'}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-900">₹{(inv.amount || 0).toLocaleString()}</td>
                      <td className="px-6 py-4 text-right hidden sm:table-cell">
                        <span className={`text-sm font-bold ${(inv.balanceDue || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ₹{(inv.balanceDue || 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant="secondary" className={`font-bold text-[10px] ${paymentStatusColor(inv.paymentStatus || inv.status || '')}`}>
                          {inv.paymentStatus || inv.status || 'Open'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8 font-bold text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => { setEditingInvoice(inv); setShowInvoiceForm(true); }}>
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* DEBTORS TAB */}
        <TabsContent value="debtors">
          <DebtorsTab invoices={invoices} customers={customers} />
        </TabsContent>

        {/* TARGETS */}
        <TabsContent value="targets">
          <div className="py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <Target className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">Performance Targets</h3>
            <p className="text-slate-500 max-w-sm mx-auto mt-2">Manage monthly revenue targets for individual sales team members.</p>
          </div>
        </TabsContent>

        {/* FORECASTING */}
        <TabsContent value="forecasting">
          <div className="py-20 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
            <BarChart3 className="h-12 w-12 text-slate-200 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-900">Strategic Forecasting</h3>
            <p className="text-slate-500 max-w-sm mx-auto mt-2">Project future sales based on pipeline probability and historical trends.</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      {showInvoiceForm && (
        <InvoiceForm
          invoice={editingInvoice || undefined}
          customers={customers}
          onClose={() => { setShowInvoiceForm(false); setEditingInvoice(null); }}
          onSubmit={editingInvoice ? handleUpdateInvoice : handleAddInvoice}
        />
      )}
      {showBulkUpload && (
        <BulkInvoiceUpload
          customers={customers}
          onClose={() => setShowBulkUpload(false)}
          onDone={() => setShowBulkUpload(false)}
        />
      )}
    </div>
  );
}
