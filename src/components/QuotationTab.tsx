import React, { useState } from 'react';
import { Lead, QuoteRevision, UserProfile, Part, Customer, FeasibilityForm, Task } from '../types';
import { format } from 'date-fns';
import { 
  Plus, 
  History, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Download,
  AlertCircle,
  MoreVertical,
  ArrowRight,
  Printer,
  FileSpreadsheet,
  FileEdit,
  FileCheck,
  IndianRupee,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import QuotationRevisionForm from './QuotationRevisionForm';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { validateAction } from '../lib/workflow';
import { exportToExcel, exportToPDF, exportToWord } from '../lib/exportUtils';

interface QuotationTabProps {
  lead: Lead;
  tasks: Task[];
  onUpdateLead: (id: string, updates: Partial<Lead>) => Promise<any>;
  userProfile: UserProfile | null;
  parts: Part[];
  customer: Customer | undefined;
  feasibilityForm?: FeasibilityForm;
}

export default function QuotationTab({ lead, tasks, onUpdateLead, userProfile, parts, customer, feasibilityForm }: QuotationTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingRevision, setEditingRevision] = useState<QuoteRevision | null>(null);
  const [previewRev, setPreviewRev] = useState<QuoteRevision | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [viewingRevIdx, setViewingRevIdx] = useState<number | null>(null);

  const revisions = lead.quote?.revisions || [];
  const activeRevision = viewingRevIdx !== null ? revisions[viewingRevIdx] : lead.quote?.latestRevision;
  const latestRevision = lead.quote?.latestRevision;

  const exportPDF = (rev: QuoteRevision) => {
    const data = rev.items.map((item, idx) => ({
      '#': idx + 1,
      'Item': item.partName || 'Service',
      'Description': item.description,
      'Qty': item.quantity,
      'Unit Rate': `INR ${item.unitPrice.toLocaleString()}`,
      'Total': `INR ${(item.quantity * item.unitPrice).toLocaleString()}`
    }));

    // Add summary row as data if needed, or just standard table
    exportToPDF(
      data, 
      `Quotation_${lead.customerName.replace(/\s+/g, '_')}_Rev${rev.revisionNo}`, 
      'Commercial Quotation',
      `${lead.customerName} | Rev: ${rev.revisionNo} | Total: INR ${rev.totalAmount.toLocaleString()}`
    );
    toast.success("PDF Exported successfully");
  };

  const exportExcel = (rev: QuoteRevision) => {
    const data = rev.items.map(item => ({
      'Item Name': item.partName,
      'Description': item.description,
      'Quantity': item.quantity,
      'Unit Price': item.unitPrice,
      'Line Total': item.quantity * item.unitPrice
    }));
    
    // Add summary rows
    const summaryData = [
      ...data,
      { 'Item Name': '', 'Description': 'SUBTOTAL', 'Quantity': '', 'Unit Price': '', 'Line Total': rev.subtotal },
      { 'Item Name': '', 'Description': `GST (${rev.taxRate}%)`, 'Quantity': '', 'Unit Price': '', 'Line Total': rev.taxAmount },
      { 'Item Name': '', 'Description': 'GRAND TOTAL', 'Quantity': '', 'Unit Price': '', 'Line Total': rev.totalAmount }
    ];

    exportToExcel(summaryData, `Quotation_${lead.customerName.replace(/\s+/g, '_')}_Rev${rev.revisionNo}`);
    toast.success("Excel Exported successfully");
  };

  const exportWord = async (rev: QuoteRevision) => {
    const data = rev.items.map((item, idx) => ({
      'Item': item.partName || 'Service',
      'Qty': item.quantity,
      'Rate': item.unitPrice,
      'Total': item.quantity * item.unitPrice
    }));

    await exportToWord(
      data, 
      `Quotation_${lead.customerName.replace(/\s+/g, '_')}_Rev${rev.revisionNo}`, 
      `QUOTATION FOR ${lead.customerName.toUpperCase()}`
    );
    toast.success("Word Document Exported successfully");
  };

  const handleCreateNewRevision = () => {
    const validation = validateAction(lead, 'CREATE_QUOTE', undefined, tasks);
    if (!validation.isValid) {
      toast.error(validation.message || "Cannot create quotation at this stage");
      return;
    }
    setEditingRevision(null);
    setShowForm(true);
  };

  const handleEditRevision = (rev: QuoteRevision) => {
    setEditingRevision(rev);
    setShowForm(true);
  };

  const handleSubmitRevision = async (revision: QuoteRevision) => {
    try {
      const updatedRevisions = [...revisions];
      const existingIdx = updatedRevisions.findIndex(r => r.revisionNo === revision.revisionNo);
      
      if (existingIdx >= 0) {
        updatedRevisions[existingIdx] = revision;
      } else {
        updatedRevisions.push(revision);
      }

      // Sort revisions by number desc
      updatedRevisions.sort((a, b) => b.revisionNo - a.revisionNo);

      await onUpdateLead(lead.id, {
        quoteCreated: true,
        quoteValue: revision.totalAmount,
        quoteDate: revision.quoteDate,
        quote: {
          revisions: updatedRevisions,
          latestRevision: updatedRevisions[0] // Since sorted desc
        }
      });

      toast.success(existingIdx >= 0 ? "Revision updated" : "New revision created");
      setShowForm(false);
    } catch (error) {
      toast.error("Failed to save quotation revision");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Accepted': return 'bg-green-100 text-green-700 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
      case 'Sent': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'Draft': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'Revised': return 'bg-amber-100 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  if (showForm) {
    return (
      <QuotationRevisionForm 
        lead={lead}
        parts={parts}
        customer={customer}
        userProfile={userProfile}
        initialRevision={editingRevision}
        nextRevisionNo={revisions.length + 1}
        feasibilityForm={feasibilityForm}
        onCancel={() => setShowForm(false)}
        onSubmit={handleSubmitRevision}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-100 shadow-sm border-l-4 border-l-primary">
        <div>
          <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
            Quotations
            {revisions.length > 0 && (
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                {revisions.length} {revisions.length === 1 ? 'Version' : 'Versions'}
              </Badge>
            )}
          </h3>
          <p className="text-xs text-slate-500 font-medium tracking-wide">Commercial offers and active negotiation pipeline</p>
        </div>
        <div className="flex gap-2">
          {revisions.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
              className={`gap-2 ${showHistory ? 'bg-slate-100' : ''}`}
            >
              <History size={16} />
              {showHistory ? 'Hide History' : 'Revision History'}
            </Button>
          )}
          <Button onClick={handleCreateNewRevision} className="gap-2 shadow-lg shadow-primary/20">
            <Plus size={18} />
            {revisions.length > 0 ? 'Create New Revision' : 'Create Quotation'}
          </Button>
        </div>
      </div>

      {showHistory && revisions.length > 0 && (
        <Card className="border-none shadow-sm bg-slate-50/50 animate-in slide-in-from-top-4 duration-300">
          <CardHeader className="py-3 px-4 flex flex-row items-center justify-between border-b bg-white/50">
            <CardTitle className="text-xs font-black uppercase tracking-widest text-slate-400">Previous Versions Timeline</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => { setViewingRevIdx(null); setShowHistory(false); }} className="h-6 text-[10px] font-bold">
              Return to Latest
            </Button>
          </CardHeader>
          <CardContent className="p-4 overflow-x-auto">
            <div className="flex gap-4 pb-2">
              {revisions.map((rev, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setViewingRevIdx(idx)}
                  className={`min-w-[200px] p-3 rounded-xl border transition-all cursor-pointer group relative ${
                    (viewingRevIdx === idx) || (viewingRevIdx === null && rev.revisionNo === latestRevision?.revisionNo) 
                      ? 'border-primary bg-white ring-2 ring-primary/10 shadow-md' 
                      : 'border-slate-200 bg-white/40 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      rev.revisionNo === latestRevision?.revisionNo ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                    }`}>
                      REV {rev.revisionNo}
                      {rev.revisionNo === latestRevision?.revisionNo && ' (LATEST)'}
                    </span>
                    <Badge variant="outline" className={`text-[9px] h-4 px-1 ${getStatusColor(rev.status)}`}>
                      {rev.status}
                    </Badge>
                  </div>
                  <p className="text-sm font-black text-slate-900">₹{rev.totalAmount.toLocaleString()}</p>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-medium">
                      <User size={10} /> {rev.createdBy || 'System'}
                    </div>
                  </div>
                  <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-50">
                    <span className="text-[10px] text-slate-400 font-medium">{format(rev.quoteDate.toDate(), 'dd MMM yy')}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setPreviewRev(rev); }}>
                        <Download size={12} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); handleEditRevision(rev); }}>
                        <FileEdit size={12} />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeRevision ? (
        <div className="grid grid-cols-1 gap-6">
          <Card className="border-none shadow-sm overflow-hidden animate-in fade-in duration-500">
            <CardHeader className="bg-slate-900 text-white py-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-primary/20 text-primary flex items-center justify-center border border-primary/30">
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">
                        {viewingRevIdx !== null ? `Archived Quotation (Rev ${activeRevision.revisionNo})` : `Latest Commercial Offer (Rev ${activeRevision.revisionNo})`}
                      </CardTitle>
                      {activeRevision.revisionNo === latestRevision?.revisionNo && (
                        <Badge className="bg-primary text-white border-none animate-pulse">Active</Badge>
                      )}
                    </div>
                    <CardDescription className="text-slate-400 font-medium">
                      Terms finalized on {format(activeRevision.quoteDate.toDate(), 'PPP')} • Valid until {format(activeRevision.validUntil.toDate(), 'dd MMM yyyy')}
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <Badge className={`px-4 py-1.5 text-xs font-bold ${getStatusColor(activeRevision.status)}`}>
                    {activeRevision.status}
                  </Badge>
                  <p className="text-[10px] text-slate-500 mt-2 font-bold uppercase tracking-wider">Proposal Selection</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:scale-110 transition-transform">
                    <IndianRupee size={48} />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Commercial Value</p>
                  <p className="text-2xl font-black text-slate-900">₹{activeRevision.totalAmount.toLocaleString()}</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">Incl. {activeRevision.taxRate}% GST</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Presentation Format</p>
                  <p className="text-2xl font-black text-slate-900">{activeRevision.format}</p>
                  <p className="text-[10px] text-slate-500 font-medium mt-1">Template Selection</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className={`h-2 w-2 rounded-full ${activeRevision.status === 'Accepted' ? 'bg-green-500' : 'bg-primary'}`} />
                    <p className="text-xl font-black text-slate-900">{activeRevision.status}</p>
                  </div>
                </div>
                <div className="flex flex-col justify-center gap-2">
                  <Button variant="outline" className="h-10 gap-2 border-slate-200" onClick={() => handleEditRevision(activeRevision)}>
                    <FileEdit size={16} className="text-slate-400" />
                    Modify This Rev
                  </Button>
                  {activeRevision.revisionNo !== latestRevision?.revisionNo && (
                    <Button variant="default" className="h-10 gap-2" onClick={() => handleCreateNewRevision()}>
                      <Plus size={16} />
                      Branch to New
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                  <ArrowRight size={14} />
                  Detailed Line Items & Technical Scope
                </h4>
                <div className="border rounded-2xl overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 font-bold border-b">
                      <tr>
                        <th className="px-6 py-4 text-left">Line Item / Specifications</th>
                        <th className="px-6 py-4 text-center w-24">Qty</th>
                        <th className="px-6 py-4 text-right">Unit Rate</th>
                        <th className="px-6 py-4 text-right">Ext. Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {activeRevision.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <p className="font-black text-slate-900">{item.partName || 'Service/Item'}</p>
                            <p className="text-xs text-slate-500 mt-1 leading-relaxed bg-white/50 p-2 rounded-lg border border-slate-100 group-hover:bg-white">{item.description}</p>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-600">{item.quantity}</td>
                          <td className="px-6 py-4 text-right font-medium italic text-slate-500">₹{item.unitPrice.toLocaleString()}</td>
                          <td className="px-6 py-4 text-right font-black text-slate-900">₹{(item.quantity * item.unitPrice).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50/80 font-bold border-t-2 border-slate-100">
                      <tr>
                        <td colSpan={3} className="px-6 py-3 text-right text-slate-500 uppercase tracking-widest text-[10px]">Commercial Subtotal</td>
                        <td className="px-6 py-3 text-right bg-white font-black">₹{activeRevision.subtotal.toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-6 py-3 text-right text-slate-500 uppercase tracking-widest text-[10px]">Applicable Tax ({activeRevision.taxRate}%)</td>
                        <td className="px-6 py-3 text-right bg-white font-black">₹{activeRevision.taxAmount.toLocaleString()}</td>
                      </tr>
                      <tr className="bg-slate-900 text-white">
                        <td colSpan={3} className="px-6 py-4 text-right text-xs font-black uppercase tracking-[0.2em]">Grand Total Payable</td>
                        <td className="px-6 py-4 text-right text-xl font-black">₹{activeRevision.totalAmount.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button className="flex-1 h-12 gap-3 text-base shadow-lg shadow-primary/20">
                      <Download size={20} />
                      Export Professional Document
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="w-[300px] p-2">
                    <DropdownMenuItem className="py-3 px-4 gap-3 cursor-pointer hover:bg-red-50" onClick={() => exportPDF(activeRevision)}>
                      <Printer size={18} className="text-red-500" />
                      <div>
                        <p className="font-bold">PDF Format</p>
                        <p className="text-[10px] text-slate-400">Best for professional customer sharing</p>
                      </div>
                    </DropdownMenuItem>
                    <Separator className="my-1" />
                    <DropdownMenuItem className="py-3 px-4 gap-3 cursor-pointer hover:bg-green-50" onClick={() => exportExcel(activeRevision)}>
                      <FileSpreadsheet size={18} className="text-green-500" />
                      <div>
                        <p className="font-bold">Excel Worksheet</p>
                        <p className="text-[10px] text-slate-400">Detailed data for internal costing</p>
                      </div>
                    </DropdownMenuItem>
                    <Separator className="my-1" />
                    <DropdownMenuItem className="py-3 px-4 gap-3 cursor-pointer hover:bg-blue-50" onClick={() => exportWord(activeRevision)}>
                      <FileEdit size={18} className="text-blue-500" />
                      <div>
                        <p className="font-bold">Word Document</p>
                        <p className="text-[10px] text-slate-400">Editable format for custom adjustments</p>
                      </div>
                    </DropdownMenuItem>
                    <Separator className="my-1" />
                    <DropdownMenuItem className="py-3 px-4 gap-3 cursor-pointer hover:bg-primary/5" onClick={() => setPreviewRev(activeRevision)}>
                      <FileCheck size={18} className="text-primary" />
                      <div>
                        <p className="font-bold text-primary">Live Preview</p>
                        <p className="text-[10px] text-slate-400">Verify content layout before export</p>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button variant="outline" className="h-12 px-8 font-bold border-slate-200" onClick={() => setPreviewRev(activeRevision)}>
                  Full Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="border-dashed border-2 py-20 text-center">
          <CardContent className="space-y-4">
            <div className="h-16 w-16 bg-slate-50 text-slate-300 rounded-full flex items-center justify-center mx-auto mb-2">
              <FileEdit size={32} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-700">No Quotation Created</h4>
              <p className="text-sm text-slate-400">Initiate your first price offer for this customer.</p>
            </div>
            <Button onClick={handleCreateNewRevision} className="gap-2">
              <Plus size={18} />
              Create First Quotation
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewRev} onOpenChange={() => setPreviewRev(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2">
              <FileCheck className="text-primary" />
              Document Preview: Rev {previewRev?.revisionNo}
            </DialogTitle>
            <DialogDescription>Review quotation details before exporting</DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="flex-1 p-6 bg-slate-50/50">
            {previewRev && (
              <div className="bg-white shadow-lg border rounded-lg p-8 mx-auto w-full max-w-[800px] min-h-[600px] space-y-8 font-sans">
                <div className="flex justify-between">
                   <div>
                     <h2 className="text-2xl font-black text-slate-900">QUOTATION</h2>
                     <p className="text-xs text-slate-500 mt-1">Ref: QT-{lead.id.slice(-6).toUpperCase()}-R{previewRev.revisionNo}</p>
                   </div>
                   <div className="text-right">
                     <p className="text-sm font-bold">{format(previewRev.quoteDate.toDate(), 'PPP')}</p>
                     <p className="text-xs text-slate-400 uppercase tracking-widest mt-1">PROPOSAL</p>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-8 border-y py-6 border-slate-100">
                  <div>
                    <h5 className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-2">Bill To:</h5>
                    <p className="font-bold text-slate-800">{lead.customerName}</p>
                    <p className="text-sm text-slate-600">{lead.contactPerson}</p>
                    <p className="text-sm text-slate-600 truncate">{customer?.address}</p>
                  </div>
                  <div>
                    <h5 className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-2">Validity:</h5>
                    <p className="text-sm text-slate-600">Valid until: {format(previewRev.validUntil.toDate(), 'PP')}</p>
                    <p className="text-sm text-slate-600">Format: {previewRev.format}</p>
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead className="border-b-2 border-slate-900">
                    <tr>
                      <th className="py-2 text-left">Line Item</th>
                      <th className="py-2 text-center">Qty</th>
                      <th className="py-2 text-right">Unit Rate</th>
                      <th className="py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewRev.items.map((item, i) => (
                      <tr key={i}>
                        <td className="py-4 pr-4">
                          <p className="font-bold">{item.partName || 'Item'}</p>
                          <p className="text-xs text-slate-500 mt-1 whitespace-pre-wrap">{item.description}</p>
                        </td>
                        <td className="py-4 text-center">{item.quantity}</td>
                        <td className="py-4 text-right italic">₹{item.unitPrice.toLocaleString()}</td>
                        <td className="py-4 text-right font-bold text-slate-900">₹{(item.quantity * item.unitPrice).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex justify-end pt-4">
                  <div className="w-64 space-y-2 border-t border-slate-900 pt-4">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Subtotal</span>
                      <span>₹{previewRev.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>GST ({previewRev.taxRate}%)</span>
                      <span>₹{previewRev.taxAmount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-lg font-black text-slate-900 pt-2">
                      <span>TOTAL</span>
                      <span>₹{previewRev.totalAmount.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100">
                   <h5 className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-3">Terms & Conditions:</h5>
                   <ul className="text-xs text-slate-600 space-y-2">
                     {previewRev.standardTerms.map((term, i) => (
                       <li key={i} className="flex gap-2">
                         <span className="text-slate-300">•</span>
                         {term}
                       </li>
                     ))}
                   </ul>
                </div>
              </div>
            )}
          </ScrollArea>

          <DialogFooter className="p-6 border-t bg-slate-50">
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1 gap-2" onClick={() => exportPDF(previewRev!)}>
                <Printer size={16} className="text-red-500" />
                PDF
              </Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={() => exportExcel(previewRev!)}>
                <FileSpreadsheet size={16} className="text-green-500" />
                EXCEL
              </Button>
              <Button variant="outline" className="flex-1 gap-2" onClick={() => exportWord(previewRev!)}>
                <FileEdit size={16} className="text-blue-500" />
                WORD
              </Button>
              <Button className="shrink-0" onClick={() => setPreviewRev(null)}>Close</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
