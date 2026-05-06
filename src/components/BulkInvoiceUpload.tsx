import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Upload, Download, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import Papa from 'papaparse';
import { Timestamp, collection, writeBatch, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Customer, InvoiceSegment } from '../types';
import { toast } from 'sonner';
import { addDays, parse, isValid } from 'date-fns';

interface BulkInvoiceUploadProps {
  customers: Customer[];
  onClose: () => void;
  onDone: () => void;
}

const HEADERS = 'invoice_number,invoice_date,customer_name,so_number,part_description,qty,unit_price,gst_percent,payment_terms_days,remarks';

interface ParsedRow {
  invoice_number: string;
  invoice_date: string;
  customer_name: string;
  so_number: string;
  part_description: string;
  qty: string;
  unit_price: string;
  gst_percent: string;
  payment_terms_days: string;
  remarks: string;
}

interface ProcessedRow {
  raw: ParsedRow;
  valid: boolean;
  errors: string[];
  customer?: Customer;
  invoiceDate?: Date;
  dueDate?: Date;
  subtotal?: number;
  gstAmount?: number;
  total?: number;
  segment?: InvoiceSegment;
}

function getSegment(customer: Customer): InvoiceSegment {
  if (customer.region === 'Export') return 'E';
  if (customer.industry === 'Defence') return 'AD';
  return 'D';
}

function downloadTemplate() {
  const sample = [
    HEADERS,
    '26D1,01-05-2026,Bharat Electronics Ltd,SO-001,Pressure Transmitter 4-20mA,10,8500,18,30,Sample import'
  ].join('\n');
  const blob = new Blob([sample], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'invoice_import_template.csv'; a.click();
  URL.revokeObjectURL(url);
}

export default function BulkInvoiceUpload({ customers, onClose, onDone }: BulkInvoiceUploadProps) {
  const [rows, setRows] = useState<ProcessedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState('');
  const [done, setDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    Papa.parse<ParsedRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const processed: ProcessedRow[] = data.map(row => {
          const errors: string[] = [];
          const customer = customers.find(c =>
            c.name.toLowerCase().includes(row.customer_name?.toLowerCase() || '') ||
            row.customer_name?.toLowerCase().includes(c.name.toLowerCase())
          );
          if (!customer) errors.push(`Customer "${row.customer_name}" not found`);
          if (!row.part_description) errors.push('Part description required');
          const qty = Number(row.qty);
          if (!qty || qty <= 0) errors.push('Qty must be > 0');
          const unitPrice = Number(row.unit_price);
          if (isNaN(unitPrice) || unitPrice < 0) errors.push('Invalid unit price');

          let invoiceDate: Date | undefined;
          try {
            invoiceDate = parse(row.invoice_date, 'dd-MM-yyyy', new Date());
            if (!isValid(invoiceDate)) errors.push('Date must be DD-MM-YYYY');
          } catch { errors.push('Invalid date format'); }

          const gstPct = Number(row.gst_percent) || 0;
          const subtotal = qty * unitPrice;
          const gstAmount = Math.round(subtotal * gstPct / 100);
          const total = subtotal + gstAmount;
          const days = Number(row.payment_terms_days) || 0;
          const dueDate = invoiceDate ? addDays(invoiceDate, days) : undefined;

          return {
            raw: row,
            valid: errors.length === 0,
            errors,
            customer,
            invoiceDate,
            dueDate,
            subtotal,
            gstAmount,
            total,
            segment: customer ? getSegment(customer) : undefined,
          };
        });
        setRows(processed);
      },
      error: () => toast.error('Failed to parse CSV'),
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleImport = async () => {
    const valid = rows.filter(r => r.valid);
    if (!valid.length) return;
    setImporting(true);
    const failed: ProcessedRow[] = [];
    const now = Timestamp.now();

    // Process in batches of 500 (Firestore limit)
    const CHUNK = 400;
    let imported = 0;
    for (let i = 0; i < valid.length; i += CHUNK) {
      const chunk = valid.slice(i, i + CHUNK);
      const batch = writeBatch(db);
      chunk.forEach(row => {
        try {
          const ref = doc(collection(db, 'invoices'));
          const days = Number(row.raw.payment_terms_days) || 0;
          batch.set(ref, {
            invoiceNumber: row.raw.invoice_number || '',
            segment: row.segment || 'D',
            invoiceDate: row.invoiceDate ? Timestamp.fromDate(row.invoiceDate) : now,
            customerId: row.customer!.id,
            customerName: row.customer!.name,
            soNumber: row.raw.so_number || '',
            lineItems: [{ description: row.raw.part_description, qty: Number(row.raw.qty), unitPrice: Number(row.raw.unit_price), amount: row.subtotal || 0 }],
            subtotal: row.subtotal || 0,
            gstPercent: Number(row.raw.gst_percent) || 0,
            gstAmount: row.gstAmount || 0,
            amount: row.total || 0,
            paymentTermsDays: days,
            dueDate: row.dueDate ? Timestamp.fromDate(row.dueDate) : now,
            paymentStatus: 'Open',
            amountReceived: 0,
            balanceDue: row.total || 0,
            remarks: row.raw.remarks || '',
            createdAt: now,
            createdBy: 'Bulk Import',
            createdById: 'system',
            updatedAt: now,
            updatedBy: 'Bulk Import',
            updatedById: 'system',
          });
          imported++;
        } catch { failed.push(row); }
      });
      await batch.commit();
      setProgress(`Importing ${Math.min(i + CHUNK, valid.length)} of ${valid.length}...`);
    }

    setImporting(false);
    setDone(true);
    toast.success(`${imported} invoice(s) imported successfully`);
    if (failed.length) toast.error(`${failed.length} row(s) failed`);
    onDone();
  };

  const downloadFailed = () => {
    const bad = rows.filter(r => !r.valid);
    const csv = [HEADERS, ...bad.map(r => Object.values(r.raw).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'failed_rows.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = rows.filter(r => r.valid).length;
  const invalidCount = rows.filter(r => !r.valid).length;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <DialogTitle className="text-xl font-bold">Bulk Invoice Import</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5 space-y-4">
            {/* Step 1 */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">1</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">Download Template</p>
                <p className="text-xs text-slate-400">Fill with your invoice data and upload below</p>
              </div>
              <Button size="sm" variant="outline" onClick={downloadTemplate}>
                <Download size={14} className="mr-1" />Template
              </Button>
            </div>

            {/* Step 2 */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shrink-0">2</div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-700">Upload CSV</p>
                <p className="text-xs text-slate-400">Only .csv files. Date format: DD-MM-YYYY</p>
              </div>
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
              <Button size="sm" onClick={() => fileRef.current?.click()}>
                <Upload size={14} className="mr-1" />Choose File
              </Button>
            </div>

            {/* Preview */}
            {rows.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm">
                  <Badge className="bg-green-100 text-green-700">{validCount} Ready</Badge>
                  {invalidCount > 0 && <Badge variant="destructive">{invalidCount} Errors</Badge>}
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-left">Inv No</th>
                        <th className="px-3 py-2 text-left">Customer</th>
                        <th className="px-3 py-2 text-left">Description</th>
                        <th className="px-3 py-2 text-right">Total</th>
                        <th className="px-3 py-2 text-left">Issue</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {rows.map((row, idx) => (
                        <tr key={idx} className={row.valid ? 'bg-green-50/30' : 'bg-red-50/30'}>
                          <td className="px-3 py-2">
                            {row.valid ? <CheckCircle2 size={14} className="text-green-600" /> : <AlertCircle size={14} className="text-red-500" />}
                          </td>
                          <td className="px-3 py-2 font-mono">{row.raw.invoice_number}</td>
                          <td className="px-3 py-2">{row.raw.customer_name}</td>
                          <td className="px-3 py-2 truncate max-w-[180px]">{row.raw.part_description}</td>
                          <td className="px-3 py-2 text-right font-medium">₹{(row.total || 0).toLocaleString()}</td>
                          <td className="px-3 py-2 text-red-600 text-[10px]">{row.errors.join('; ')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {done && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm font-medium">
                <CheckCircle2 size={16} />Import complete!
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0 flex-wrap gap-2">
          {invalidCount > 0 && (
            <Button size="sm" variant="outline" onClick={downloadFailed}>
              <Download size={14} className="mr-1" />Download Failed Rows
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outline" onClick={onClose}>Close</Button>
          {validCount > 0 && !done && (
            <Button onClick={handleImport} disabled={importing}>
              {importing ? <><Loader2 size={14} className="mr-1 animate-spin" />{progress}</> : `Import ${validCount} Valid Row${validCount > 1 ? 's' : ''}`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
