import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2 } from 'lucide-react';
import { Timestamp, collection, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Invoice, InvoiceLineItem, InvoiceSegment, Customer } from '../types';
import { toast } from 'sonner';
import { addDays, format } from 'date-fns';

interface InvoiceFormProps {
  invoice?: Invoice;
  customers: Customer[];
  onClose: () => void;
  onSubmit: (data: any) => Promise<any>;
}

const PAYMENT_TERMS = [{ label: 'Immediate', days: 0 }, { label: '30 Days', days: 30 }, { label: '45 Days', days: 45 }, { label: '60 Days', days: 60 }, { label: '90 Days', days: 90 }];
const GST_RATES = [0, 5, 12, 18, 28];
const emptyLine = (): InvoiceLineItem => ({ description: '', partNo: '', qty: 1, unitPrice: 0, amount: 0 });

async function generateInvoiceNumber(segment: InvoiceSegment): Promise<string> {
  const now = new Date();
  const fyStart = now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
  const yy = String(fyStart).slice(-2);
  const fyStartTs = Timestamp.fromDate(new Date(fyStart, 3, 1));
  const fyEndTs = Timestamp.fromDate(new Date(fyStart + 1, 2, 31, 23, 59, 59));
  const snap = await getDocs(
    collection(db, 'invoices')
  );
  // Count only matching segment+FY locally to avoid composite index requirement
  const count = snap.docs.filter(d => {
    const data = d.data();
    return data.segment === segment &&
      data.invoiceDate?.seconds >= fyStartTs.seconds &&
      data.invoiceDate?.seconds <= fyEndTs.seconds;
  }).length;
  return `${yy}${segment}${count + 1}`;
}

function getSegment(customer?: Customer): InvoiceSegment {
  if (!customer) return 'D';
  if (customer.region === 'Export') return 'E';
  if (customer.industry === 'Defence') return 'AD';
  return 'D';
}

export default function InvoiceForm({ invoice, customers, onClose, onSubmit }: InvoiceFormProps) {
  const [customerId, setCustomerId] = useState(invoice?.customerId || '');
  const [soNumber, setSoNumber] = useState(invoice?.soNumber || '');
  const [invoiceDateStr, setInvoiceDateStr] = useState(invoice ? format(invoice.invoiceDate.toDate(), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'));
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>(invoice?.lineItems?.length ? invoice.lineItems : [emptyLine()]);
  const [gstPercent, setGstPercent] = useState(invoice?.gstPercent ?? 18);
  const [paymentTermsDays, setPaymentTermsDays] = useState(invoice?.paymentTermsDays ?? 30);
  const [paymentStatus, setPaymentStatus] = useState<Invoice['paymentStatus']>(invoice?.paymentStatus || 'Open');
  const [amountReceived, setAmountReceived] = useState(invoice?.amountReceived ?? 0);
  const [remarks, setRemarks] = useState(invoice?.remarks || '');
  const [loading, setLoading] = useState(false);
  const [generatedNumber, setGeneratedNumber] = useState(invoice?.invoiceNumber || '');

  const selectedCustomer = customers.find(c => c.id === customerId);
  const segment = getSegment(selectedCustomer);

  useEffect(() => {
    if (!invoice && customerId) {
      generateInvoiceNumber(segment).then(setGeneratedNumber).catch(() => {});
    }
  }, [customerId, segment, invoice]);

  const updateLine = (idx: number, field: keyof InvoiceLineItem, value: string | number) => {
    const updated = [...lineItems];
    (updated[idx] as any)[field] = value;
    if (field === 'qty' || field === 'unitPrice') {
      updated[idx].amount = Number(updated[idx].qty) * Number(updated[idx].unitPrice);
    }
    setLineItems(updated);
  };

  const subtotal = lineItems.reduce((s, l) => s + (l.amount || 0), 0);
  const gstAmount = Math.round(subtotal * gstPercent / 100);
  const total = subtotal + gstAmount;
  const balanceDue = Math.max(0, total - amountReceived);
  const dueDate = paymentTermsDays === 0 ? new Date(invoiceDateStr) : addDays(new Date(invoiceDateStr), paymentTermsDays);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) { toast.error('Please select a customer'); return; }
    if (!lineItems.length || lineItems.some(l => !l.description || l.qty <= 0)) {
      toast.error('All line items need a description and qty > 0'); return;
    }
    setLoading(true);
    try {
      await onSubmit({
        invoiceNumber: generatedNumber || invoice?.invoiceNumber || '',
        segment,
        invoiceDate: Timestamp.fromDate(new Date(invoiceDateStr)),
        customerId,
        customerName: selectedCustomer?.name || '',
        soNumber: soNumber || '',
        lineItems,
        subtotal,
        gstPercent,
        gstAmount,
        amount: total,
        paymentTermsDays,
        dueDate: Timestamp.fromDate(dueDate),
        paymentStatus,
        amountReceived,
        balanceDue,
        remarks,
      });
      toast.success(invoice ? 'Invoice updated' : `Invoice ${generatedNumber} created`);
      onClose();
    } catch (err: any) {
      toast.error('Failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <DialogTitle className="text-xl font-bold">
            {invoice ? `Edit Invoice — ${invoice.invoiceNumber}` : 'New Invoice'}
          </DialogTitle>
          {generatedNumber && !invoice && <p className="text-sm text-primary font-semibold">Number: {generatedNumber}</p>}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="px-6 py-5 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Customer *</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger><SelectValue placeholder="Select customer" /></SelectTrigger>
                    <SelectContent>{customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                  {selectedCustomer && <p className="text-[10px] text-slate-400">Segment: <strong>{segment}</strong></p>}
                </div>
                <div className="space-y-1.5">
                  <Label>Invoice Date *</Label>
                  <Input type="date" value={invoiceDateStr} onChange={e => setInvoiceDateStr(e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>SO / PO Number</Label>
                  <Input value={soNumber} onChange={e => setSoNumber(e.target.value)} placeholder="Optional" />
                </div>
                <div className="space-y-1.5">
                  <Label>Payment Terms</Label>
                  <Select value={String(paymentTermsDays)} onValueChange={v => setPaymentTermsDays(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{PAYMENT_TERMS.map(t => <SelectItem key={t.days} value={String(t.days)}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-[10px] text-slate-400">Due: {format(dueDate, 'dd MMM yyyy')}</p>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label className="text-sm font-semibold">Line Items</Label>
                  <Button type="button" size="sm" variant="outline" onClick={() => setLineItems([...lineItems, emptyLine()])}>
                    <Plus size={14} className="mr-1" />Add Row
                  </Button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left">Part No</th>
                        <th className="px-3 py-2 text-left">Description *</th>
                        <th className="px-3 py-2 text-right w-16">Qty</th>
                        <th className="px-3 py-2 text-right w-28">Unit Price</th>
                        <th className="px-3 py-2 text-right w-28">Amount</th>
                        <th className="px-3 py-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {lineItems.map((line, idx) => (
                        <tr key={idx}>
                          <td className="px-2 py-1.5"><Input className="h-8 text-sm" value={line.partNo} onChange={e => updateLine(idx, 'partNo', e.target.value)} placeholder="Optional" /></td>
                          <td className="px-2 py-1.5"><Input className="h-8 text-sm" value={line.description} onChange={e => updateLine(idx, 'description', e.target.value)} placeholder="Description" required /></td>
                          <td className="px-2 py-1.5"><Input className="h-8 text-sm text-right" type="number" min={1} value={line.qty} onChange={e => updateLine(idx, 'qty', Number(e.target.value))} /></td>
                          <td className="px-2 py-1.5"><Input className="h-8 text-sm text-right" type="number" min={0} value={line.unitPrice} onChange={e => updateLine(idx, 'unitPrice', Number(e.target.value))} /></td>
                          <td className="px-3 py-1.5 text-right font-medium">₹{(line.amount || 0).toLocaleString()}</td>
                          <td className="px-2 py-1.5">
                            {lineItems.length > 1 && (
                              <button type="button" onClick={() => setLineItems(lineItems.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>GST %</Label>
                  <Select value={String(gstPercent)} onValueChange={v => setGstPercent(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{GST_RATES.map(r => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>₹{subtotal.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">GST ({gstPercent}%)</span><span>₹{gstAmount.toLocaleString()}</span></div>
                  <div className="flex justify-between border-t pt-1 font-bold"><span>Total</span><span>₹{total.toLocaleString()}</span></div>
                </div>
              </div>

              {/* Payment */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Payment Status</Label>
                  <Select value={paymentStatus} onValueChange={v => setPaymentStatus(v as any)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(['Open', 'Partially Paid', 'Paid', 'Overdue'] as const).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Amount Received (₹)</Label>
                  <Input type="number" min={0} value={amountReceived} onChange={e => setAmountReceived(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Balance Due</Label>
                  <div className={`px-3 py-2 rounded-md border text-sm font-bold ${balanceDue > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700'}`}>
                    ₹{balanceDue.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Remarks</Label>
                <Textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} placeholder="Internal notes..." />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" disabled={loading || !customerId}>
              {loading ? 'Saving...' : invoice ? 'Update Invoice' : 'Save Invoice'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
