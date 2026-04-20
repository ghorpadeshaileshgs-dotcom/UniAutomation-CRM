import React, { useState, useEffect, useMemo } from 'react';
import { 
  Lead, 
  QuoteRevision, 
  QuoteFormat, 
  QuoteStatus, 
  UserProfile, 
  Part, 
  Customer,
  QuoteItem,
  FeasibilityForm
} from '../types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { 
  X, 
  Save, 
  Plus, 
  Trash2, 
  Settings2, 
  Info, 
  FileCheck,
  Building,
  ShieldCheck,
  ArrowLeft,
  Clock,
  Briefcase
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface QuotationRevisionFormProps {
  lead: Lead;
  parts: Part[];
  customer: Customer | undefined;
  userProfile: UserProfile | null;
  initialRevision: QuoteRevision | null;
  nextRevisionNo: number;
  feasibilityForm?: FeasibilityForm;
  onSubmit: (revision: QuoteRevision) => Promise<void>;
  onCancel: () => void;
}

const quoteFormats: QuoteFormat[] = ["Basic", "Standard", "Special"];
const quoteStatuses: QuoteStatus[] = ["Draft", "Sent", "Revised", "Accepted", "Rejected"];

export default function QuotationRevisionForm({ 
  lead, 
  parts, 
  customer, 
  userProfile, 
  initialRevision, 
  nextRevisionNo, 
  feasibilityForm,
  onSubmit, 
  onCancel 
}: QuotationRevisionFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState<Partial<QuoteRevision>>({
    revisionNo: initialRevision?.revisionNo || nextRevisionNo,
    quoteDate: initialRevision?.quoteDate || Timestamp.now(),
    validUntil: initialRevision?.validUntil || Timestamp.fromDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    format: initialRevision?.format || 'Basic',
    status: initialRevision?.status || 'Draft',
    items: initialRevision?.items || [{ description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }],
    taxRate: initialRevision?.taxRate || 18,
    standardTerms: initialRevision?.standardTerms || [
      'Validity: 30 days from the date of quotation.',
      'Delivery: 4-6 weeks from receipt of technically and commercially clear PO.',
      'Payment: 30% advance, balance against PI before dispatch.',
      'Warranty: 12 months from date of commissioning or 18 months from supply.'
    ],
    specialTerms: initialRevision?.specialTerms || '',
    complianceDetails: initialRevision?.complianceDetails || '',
    technicalSpecs: initialRevision?.technicalSpecs || '',
    linkedFeasibilityId: initialRevision?.linkedFeasibilityId || '',
    linkedFeasibilityParams: initialRevision?.linkedFeasibilityParams || []
  });

  const isFeasibilityLinked = useMemo(() => {
    return !!formData.linkedFeasibilityId || (feasibilityForm?.overallStatus === 'Feasible');
  }, [formData.linkedFeasibilityId, feasibilityForm?.overallStatus]);

  // Pre-fill from feasibility if available and it's a new revision
  useEffect(() => {
    if (!initialRevision && feasibilityForm?.overallStatus === 'Feasible' && !formData.linkedFeasibilityId) {
      setFormData(prev => ({
        ...prev,
        linkedFeasibilityId: feasibilityForm.id,
        linkedFeasibilityParams: feasibilityForm.parameters,
        technicalSpecs: `Linked to Feasibility: ${feasibilityForm.category} - ${feasibilityForm.subCategory}\n\nIteration: ${feasibilityForm.revisionCount}`
      }));
    }
  }, [initialRevision, feasibilityForm, formData.linkedFeasibilityId]);

  // Auto-suggest format based on customer or customerType
  useEffect(() => {
    if (!initialRevision) {
      if (customer?.defaultQuoteFormat) {
        setFormData(prev => ({ ...prev, format: customer.defaultQuoteFormat }));
      } else {
        const type = customer?.customerType || lead.customerType;
        let suggestedFormat: QuoteFormat = 'Basic';
        if (type === 'OEM') suggestedFormat = 'Standard';
        else if (type === 'Design House') suggestedFormat = 'Special';
        else if (type === 'End User') suggestedFormat = 'Basic';
        
        setFormData(prev => ({ ...prev, format: suggestedFormat }));
      }
    }
  }, [customer, lead.customerType, initialRevision]);

  const subtotal = useMemo(() => {
    return (formData.items || []).reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
  }, [formData.items]);

  const taxAmount = useMemo(() => {
    return (subtotal * (formData.taxRate || 0)) / 100;
  }, [subtotal, formData.taxRate]);

  const totalAmount = useMemo(() => {
    return subtotal + taxAmount;
  }, [subtotal, taxAmount]);

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...(formData.items || []), { description: '', quantity: 1, unitPrice: 0, totalPrice: 0 }]
    });
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...(formData.items || [])];
    updated.splice(index, 1);
    setFormData({ ...formData, items: updated });
  };

  const handleItemChange = (index: number, field: keyof QuoteItem, value: any) => {
    const updated = [...(formData.items || [])];
    updated[index] = { ...updated[index], [field]: value };
    
    if (field === 'quantity' || field === 'unitPrice') {
      const q = field === 'quantity' ? Number(value) : updated[index].quantity;
      const p = field === 'unitPrice' ? Number(value) : updated[index].unitPrice;
      updated[index].totalPrice = q * p;
    }
    
    setFormData({ ...formData, items: updated });
  };

  const handlePartSelect = (index: number, partId: string) => {
    const part = parts.find(p => p.id === partId || p.partId === partId);
    if (part) {
      const updated = [...(formData.items || [])];
      updated[index] = {
        ...updated[index],
        partId: part.id,
        partName: part.partName,
        partNumber: part.partId,
        description: part.description || part.partName
      };
      setFormData({ ...formData, items: updated });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.items?.length || formData.items.some(item => !item.description || item.quantity <= 0)) {
      toast.error("Please provide valid line items");
      return;
    }

    setSubmitting(true);
    try {
      const finalRevision: QuoteRevision = {
        ...formData,
        subtotal,
        taxAmount,
        totalAmount,
        createdBy: userProfile?.displayName || userProfile?.email || 'System',
        createdById: userProfile?.uid || 'system',
        createdAt: Timestamp.now()
      } as QuoteRevision;

      await onSubmit(finalRevision);
    } catch (error) {
      toast.error("An error occurred while saving");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <ArrowLeft className="mr-2" size={18} />
            Back to Revisions
          </Button>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Settings2 className="text-primary" />
            {initialRevision ? `Edit Revision ${formData.revisionNo}` : `New Quote Revision ${formData.revisionNo}`}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel} disabled={submitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
            <Save size={18} />
            {submitting ? 'Saving...' : 'Save Revision'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck size={18} className="text-blue-500" />
                Line Items & Pricing
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-6">
                {formData.items?.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-xl border border-slate-100 bg-slate-50/30 relative group">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="absolute top-2 right-2 text-slate-300 hover:text-red-500"
                      onClick={() => handleRemoveItem(idx)}
                      disabled={formData.items!.length === 1}
                    >
                      <Trash2 size={16} />
                    </Button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-500">Product / Service Selection</Label>
                        <div className="flex gap-2">
                          <Select
                            value={item.partId}
                            onValueChange={(val) => handlePartSelect(idx, val)}
                          >
                            <SelectTrigger className="bg-white">
                              <SelectValue placeholder="Search from Part Master..." />
                            </SelectTrigger>
                            <SelectContent>
                              {parts.map(p => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.partId} - {p.partName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <textarea
                          placeholder="Detailed description..."
                          className="flex min-h-[60px] w-full rounded-md border border-input bg-white px-3 py-2 text-xs"
                          value={item.description}
                          onChange={e => handleItemChange(idx, 'description', e.target.value)}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-500">Quanity</Label>
                        <Input 
                          type="number" 
                          className="bg-white"
                          value={item.quantity} 
                          onChange={e => handleItemChange(idx, 'quantity', e.target.value)} 
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-slate-500">Unit Rate (₹)</Label>
                        <Input 
                          type="number" 
                          className="bg-white"
                          value={item.unitPrice} 
                          onChange={e => handleItemChange(idx, 'unitPrice', e.target.value)} 
                        />
                        <p className="text-[10px] font-bold text-right text-slate-400 mt-1">
                          Total: ₹{(item.quantity * item.unitPrice).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button variant="outline" className="w-full border-dashed gap-2 py-6" onClick={handleAddItem}>
                  <Plus size={18} />
                  Add Another Line Item
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Conditional Sections based on Format */}
          {isFeasibilityLinked && formData.linkedFeasibilityParams && formData.linkedFeasibilityParams.length > 0 && (
            <Card className="border-none shadow-sm border-l-4 border-l-emerald-500">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck size={18} className="text-emerald-500" />
                    Technical Parameters (Authorized)
                  </CardTitle>
                  <CardDescription>Validated via Engineering Feasibility</CardDescription>
                </div>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 uppercase text-[9px] font-black">
                  LOCKED
                </Badge>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {formData.linkedFeasibilityParams.map((param, idx) => (
                    <div key={idx} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                      <Label className="text-[10px] font-black uppercase text-slate-400 block mb-1">{param.name}</Label>
                      <p className="text-sm font-bold text-slate-900">{param.customerInput}</p>
                      {param.remark && (
                        <p className="text-[10px] text-slate-500 italic mt-1 font-medium italic">Note: {param.remark}</p>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-emerald-50/50 rounded-lg border border-dashed border-emerald-100 flex gap-2">
                  <Info size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-emerald-800 font-medium">
                    These parameters are locked to the approved feasibility study. If technical requirements have changed, a new feasibility revision must be initiated from the Requirements tab.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {formData.format !== 'Basic' && (
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building size={18} className="text-purple-500" />
                  Technical Specifications
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <textarea
                  placeholder={isFeasibilityLinked ? "Technical specifications are locked to the linked feasibility study." : "Detailed technical features, scope of supply, or exclusions..."}
                  readOnly={isFeasibilityLinked}
                  className={`flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ${isFeasibilityLinked ? 'opacity-70 bg-slate-50 cursor-not-allowed' : ''}`}
                  value={formData.technicalSpecs}
                  onChange={e => !isFeasibilityLinked && setFormData({...formData, technicalSpecs: e.target.value})}
                />
              </CardContent>
            </Card>
          )}

          {formData.format === 'Special' && (
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldCheck size={18} className="text-emerald-500" />
                  Compliance & Quality Details
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <textarea
                  placeholder="Compliance to standards (ISO, ASME, etc.), quality assurance plans, or special documentation..."
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={formData.complianceDetails}
                  onChange={e => setFormData({...formData, complianceDetails: e.target.value})}
                />
              </CardContent>
            </Card>
          )}

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-base">Terms & Conditions</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500">Standard Terms (One per line)</Label>
                <textarea
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  value={formData.standardTerms?.join('\n')}
                  onChange={e => setFormData({...formData, standardTerms: e.target.value.split('\n')})}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500">Special Notes / Exceptions</Label>
                <textarea
                  placeholder="Optional..."
                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-xs"
                  value={formData.specialTerms}
                  onChange={e => setFormData({...formData, specialTerms: e.target.value})}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-none shadow-sm border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle>Quotation Config</CardTitle>
              <CardDescription>Format and status control</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label className="flex items-center gap-2 text-primary">
                  <FileCheck size={14} />
                  Format Selection
                </Label>
                <Select
                  value={formData.format}
                  onValueChange={(val) => setFormData({ ...formData, format: val as QuoteFormat })}
                >
                  <SelectTrigger className="font-bold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {quoteFormats.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="p-2 bg-blue-50 rounded border border-blue-100 flex gap-2">
                  <Info size={12} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-blue-700">
                    {formData.format === 'Basic' && "Minimal view focused on itemized pricing."}
                    {formData.format === 'Standard' && "Exposes technical specifications and common terms."}
                    {formData.format === 'Special' && "Detailed format including compliance and quality controls."}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Current Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val as QuoteStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {quoteStatuses.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Subtotal</span>
                  <span className="font-bold">₹{subtotal.toLocaleString()}</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">GST Rate (%)</span>
                    <Input 
                      type="number" 
                      className="w-20 text-right h-8"
                      value={formData.taxRate}
                      onChange={e => setFormData({...formData, taxRate: Number(e.target.value)})}
                    />
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Tax Amount</span>
                    <span className="font-bold">₹{taxAmount.toLocaleString()}</span>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold">Grand Total</span>
                  <span className="text-xl font-bold text-primary">₹{totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-none shadow-sm bg-slate-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">SLA Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Validity Period (Days)</Label>
                <Input 
                  type="number" 
                  defaultValue={30}
                  className="bg-white"
                  onChange={(e) => {
                    const days = Number(e.target.value);
                    const newDate = new Date();
                    newDate.setDate(newDate.getDate() + days);
                    setFormData({...formData, validUntil: Timestamp.fromDate(newDate)});
                  }}
                />
              </div>
              <div className="p-3 bg-white rounded border border-slate-100 flex items-center gap-2">
                <Clock size={14} className="text-slate-400" />
                <span className="text-[10px] text-slate-500">
                  Calculated Validity: <strong>{format(formData.validUntil?.toDate() || new Date(), 'dd/MM/yyyy')}</strong>
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
