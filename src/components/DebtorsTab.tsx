import React, { useState, useMemo } from 'react';
import { Invoice, PaymentEntry, Customer } from '../types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Timestamp, doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';
import { format, isPast, isToday, differenceInDays } from 'date-fns';
import { ChevronDown, ChevronRight, Download, Send, IndianRupee } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useFirebase } from '../hooks/useFirebase';

interface DebtorsTabProps {
  invoices: Invoice[];
  customers: Customer[];
}

// ── Ageing bucket ────────────────────────────────────────────────────────
function getAgeing(dueDate: Date): { label: string; color: string; days: number } {
  const today = new Date();
  if (!isPast(dueDate) || isToday(dueDate)) return { label: 'Current', color: 'bg-green-100 text-green-700', days: 0 };
  const overdueDays = differenceInDays(today, dueDate);
  if (overdueDays <= 30) return { label: '1-30 Days', color: 'bg-yellow-100 text-yellow-700', days: overdueDays };
  if (overdueDays <= 60) return { label: '31-60 Days', color: 'bg-amber-100 text-amber-700', days: overdueDays };
  if (overdueDays <= 90) return { label: '61-90 Days', color: 'bg-orange-100 text-orange-700', days: overdueDays };
  return { label: '90+ Days', color: 'bg-red-100 text-red-700', days: overdueDays };
}

interface CustomerDebt {
  customerId: string;
  customerName: string;
  totalInvoiced: number;
  totalReceived: number;
  balanceDue: number;
  oldestInvoiceDate: Date;
  worstAgeingLabel: string;
  worstAgeingColor: string;
  openInvoices: Invoice[];
}

// ── Record Payment Dialog ────────────────────────────────────────────────
function RecordPaymentDialog({ invoice, currentUser, onClose }: { invoice: Invoice; currentUser: any; onClose: () => void }) {
  const [amount, setAmount] = useState(invoice.balanceDue || 0);
  const [dateStr, setDateStr] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [mode, setMode] = useState<PaymentEntry['mode']>('NEFT');
  const [reference, setReference] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!amount || amount <= 0) { toast.error('Enter a valid amount'); return; }
    setLoading(true);
    try {
      const newReceived = (invoice.amountReceived || 0) + amount;
      const newBalance = Math.max(0, (invoice.amount || 0) - newReceived);
      const newStatus = newBalance === 0 ? 'Paid' : 'Partially Paid';
      const entry: PaymentEntry = {
        date: Timestamp.fromDate(new Date(dateStr)),
        amount,
        mode,
        reference,
        recordedBy: currentUser?.displayName || currentUser?.email || 'System',
        recordedById: currentUser?.uid || 'system',
      };
      await updateDoc(doc(db, 'invoices', invoice.id), {
        amountReceived: newReceived,
        balanceDue: newBalance,
        paymentStatus: newStatus,
        paymentHistory: arrayUnion(entry),
        updatedAt: Timestamp.now(),
      });
      toast.success(`₹${amount.toLocaleString()} payment recorded. Status: ${newStatus}`);
      onClose();
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Record Payment — {invoice.invoiceNumber}</DialogTitle></DialogHeader>
        <div className="space-y-4 py-2">
          <div className="bg-slate-50 rounded-lg px-4 py-3 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-slate-500">Invoice Total</span><span className="font-bold">₹{(invoice.amount || 0).toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Already Received</span><span className="font-bold text-green-600">₹{(invoice.amountReceived || 0).toLocaleString()}</span></div>
            <div className="flex justify-between border-t pt-1"><span className="text-slate-500">Balance Due</span><span className="font-bold text-red-600">₹{(invoice.balanceDue || 0).toLocaleString()}</span></div>
          </div>
          <div className="space-y-1.5">
            <Label>Amount Received (₹)</Label>
            <Input type="number" min={1} max={invoice.balanceDue} value={amount} onChange={e => setAmount(Number(e.target.value))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Payment Date</Label>
              <Input type="date" value={dateStr} onChange={e => setDateStr(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Mode</Label>
              <Select value={mode} onValueChange={v => setMode(v as PaymentEntry['mode'])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(['NEFT', 'RTGS', 'Cheque', 'Cash', 'UPI'] as const).map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Reference (UTR / Cheque No.)</Label>
            <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={loading}>{loading ? 'Saving...' : 'Record Payment'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main DebtorsTab ──────────────────────────────────────────────────────
export default function DebtorsTab({ invoices, customers }: DebtorsTabProps) {
  const { user } = useFirebase();
  const [expandedCustomer, setExpandedCustomer] = useState<string | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<Invoice | null>(null);

  // Only unpaid invoices
  const openInvoices = useMemo(() =>
    invoices.filter(inv => inv.paymentStatus !== 'Paid' && (inv.balanceDue ?? inv.balance ?? 0) > 0),
    [invoices]
  );

  // Group by customer
  const debtors = useMemo((): CustomerDebt[] => {
    const map = new Map<string, CustomerDebt>();
    openInvoices.forEach(inv => {
      const key = inv.customerId || inv.customerName;
      if (!map.has(key)) {
        map.set(key, {
          customerId: inv.customerId || '',
          customerName: inv.customerName,
          totalInvoiced: 0,
          totalReceived: 0,
          balanceDue: 0,
          oldestInvoiceDate: inv.invoiceDate.toDate(),
          worstAgeingLabel: 'Current',
          worstAgeingColor: 'bg-green-100 text-green-700',
          openInvoices: [],
        });
      }
      const d = map.get(key)!;
      d.totalInvoiced += inv.amount || 0;
      d.totalReceived += inv.amountReceived || 0;
      d.balanceDue += inv.balanceDue || inv.balance || 0;
      if (inv.invoiceDate.toDate() < d.oldestInvoiceDate) d.oldestInvoiceDate = inv.invoiceDate.toDate();
      d.openInvoices.push(inv);
      const ageing = getAgeing(inv.dueDate.toDate());
      // Keep worst ageing
      const order = ['Current', '1-30 Days', '31-60 Days', '61-90 Days', '90+ Days'];
      if (order.indexOf(ageing.label) > order.indexOf(d.worstAgeingLabel)) {
        d.worstAgeingLabel = ageing.label;
        d.worstAgeingColor = ageing.color;
      }
    });
    return Array.from(map.values()).sort((a, b) => b.balanceDue - a.balanceDue);
  }, [openInvoices]);

  // KPI buckets
  const kpi = useMemo(() => {
    let current = 0, d30 = 0, d60 = 0, d90 = 0, d90plus = 0;
    openInvoices.forEach(inv => {
      const ag = getAgeing(inv.dueDate.toDate());
      const bal = inv.balanceDue || inv.balance || 0;
      if (ag.label === 'Current') current += bal;
      else if (ag.label === '1-30 Days') d30 += bal;
      else if (ag.label === '31-60 Days') d60 += bal;
      else if (ag.label === '61-90 Days') d90 += bal;
      else d90plus += bal;
    });
    return { total: current + d30 + d60 + d90 + d90plus, current, d30, d60, d90, d90plus };
  }, [openInvoices]);

  const exportExcel = () => {
    const rows = debtors.flatMap(d =>
      d.openInvoices.map(inv => ({
        Customer: d.customerName,
        'Invoice No': inv.invoiceNumber,
        'Invoice Date': format(inv.invoiceDate.toDate(), 'dd-MM-yyyy'),
        'Due Date': format(inv.dueDate.toDate(), 'dd-MM-yyyy'),
        'Total (₹)': inv.amount || 0,
        'Received (₹)': inv.amountReceived || 0,
        'Balance (₹)': inv.balanceDue || 0,
        'Ageing': getAgeing(inv.dueDate.toDate()).label,
        'Status': inv.paymentStatus,
      }))
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Debtors');
    XLSX.writeFile(wb, `debtors_report_${format(new Date(), 'yyyyMMdd')}.xlsx`);
  };

  const fmt = (n: number) => `₹${(n / 100000).toFixed(1)}L`;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Total Outstanding', value: fmt(kpi.total), color: 'text-slate-800', bg: 'bg-white', border: 'border-slate-200' },
          { label: 'Current', value: fmt(kpi.current), color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
          { label: '1–30 Days', value: fmt(kpi.d30), color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
          { label: '31–60 Days', value: fmt(kpi.d60), color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
          { label: '61–90 Days', value: fmt(kpi.d90), color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
          { label: '90+ Days', value: fmt(kpi.d90plus), color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
        ].map(k => (
          <div key={k.label} className={`${k.bg} border ${k.border} rounded-xl p-3 text-center`}>
            <p className={`text-xl font-bold ${k.color}`}>{k.value}</p>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{debtors.length} customer{debtors.length !== 1 ? 's' : ''} with outstanding balance</p>
        <Button size="sm" variant="outline" onClick={exportExcel}>
          <Download size={14} className="mr-1" />Export Excel
        </Button>
      </div>

      {/* Debtors table */}
      {debtors.length === 0 ? (
        <div className="text-center py-16 text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl">
          <IndianRupee size={36} className="mx-auto mb-2 opacity-30" />
          <p className="font-medium">No outstanding balances</p>
        </div>
      ) : (
        <div className="space-y-2">
          {debtors.map(d => (
            <div key={d.customerId || d.customerName} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              {/* Customer row */}
              <div className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedCustomer(expandedCustomer === d.customerName ? null : d.customerName)}>
                <button className="text-slate-400">
                  {expandedCustomer === d.customerName ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 text-sm truncate">{d.customerName}</p>
                  <p className="text-[11px] text-slate-400">{d.openInvoices.length} open invoice{d.openInvoices.length > 1 ? 's' : ''} · Oldest: {format(d.oldestInvoiceDate, 'dd MMM yyyy')}</p>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-xs text-slate-400">Invoiced</p>
                  <p className="text-sm font-medium">₹{d.totalInvoiced.toLocaleString()}</p>
                </div>
                <div className="text-right shrink-0 hidden sm:block">
                  <p className="text-xs text-slate-400">Received</p>
                  <p className="text-sm font-medium text-green-600">₹{d.totalReceived.toLocaleString()}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-slate-400">Balance Due</p>
                  <p className="text-sm font-bold text-red-600">₹{d.balanceDue.toLocaleString()}</p>
                </div>
                <Badge className={`text-[10px] shrink-0 ${d.worstAgeingColor}`}>{d.worstAgeingLabel}</Badge>
                <button
                  onClick={e => { e.stopPropagation(); toast.info('Reminder email feature coming soon'); }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shrink-0"
                  title="Send Payment Reminder"
                >
                  <Send size={14} />
                </button>
              </div>

              {/* Expanded: individual invoices */}
              {expandedCustomer === d.customerName && (
                <div className="border-t border-slate-100">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-2 text-left">Invoice</th>
                        <th className="px-4 py-2 text-left hidden sm:table-cell">Date</th>
                        <th className="px-4 py-2 text-left hidden sm:table-cell">Due Date</th>
                        <th className="px-4 py-2 text-right">Total</th>
                        <th className="px-4 py-2 text-right">Balance</th>
                        <th className="px-4 py-2 text-center">Ageing</th>
                        <th className="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {d.openInvoices.map(inv => {
                        const ageing = getAgeing(inv.dueDate.toDate());
                        return (
                          <tr key={inv.id} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2 font-mono font-bold text-xs">{inv.invoiceNumber}</td>
                            <td className="px-4 py-2 text-xs text-slate-500 hidden sm:table-cell">{format(inv.invoiceDate.toDate(), 'dd MMM yy')}</td>
                            <td className="px-4 py-2 text-xs hidden sm:table-cell">
                              <span className={ageing.days > 0 ? 'text-red-600 font-bold' : 'text-slate-500'}>
                                {format(inv.dueDate.toDate(), 'dd MMM yy')}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-right text-xs font-medium">₹{(inv.amount || 0).toLocaleString()}</td>
                            <td className="px-4 py-2 text-right text-xs font-bold text-red-600">₹{(inv.balanceDue || 0).toLocaleString()}</td>
                            <td className="px-4 py-2 text-center">
                              <Badge className={`text-[9px] ${ageing.color}`}>{ageing.label}</Badge>
                            </td>
                            <td className="px-4 py-2">
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPayingInvoice(inv)}>
                                Record Payment
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Record Payment Dialog */}
      {payingInvoice && (
        <RecordPaymentDialog
          invoice={payingInvoice}
          currentUser={user}
          onClose={() => setPayingInvoice(null)}
        />
      )}
    </div>
  );
}
