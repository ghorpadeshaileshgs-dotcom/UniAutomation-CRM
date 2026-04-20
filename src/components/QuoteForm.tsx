import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Search, FileText } from 'lucide-react';
import { Lead, Customer, Part, Quote, QuoteItem, UserProfile } from '../types';
import { Button } from '@/components/ui/button';
import { Timestamp } from 'firebase/firestore';

interface QuoteFormProps {
  quote?: Quote | null;
  leads: Lead[];
  customers: Customer[];
  parts: Part[];
  profile: UserProfile | null;
  onClose: () => void;
  onSubmit: (data: Omit<Quote, 'id' | 'createdAt'>) => Promise<void>;
}

const STANDARD_TERMS = [
  'Payment: 100% advance along with PO.',
  'Payment: 30 days from the date of invoice.',
  'Delivery: 4-6 weeks from the date of receipt of technically and commercially clear PO.',
  'Taxes: GST 18% extra as applicable.',
  'Validity: This quotation is valid for 30 days.',
  'Warranty: 12 months from the date of commissioning or 18 months from the date of supply, whichever is earlier.',
  'Freight: Extra at actuals.',
  'P&F: Extra at 2% of basic value.'
];

import { validateAction } from '../lib/workflow';
import { toast } from 'sonner';

export const QuoteForm: React.FC<QuoteFormProps> = ({
  quote,
  leads,
  customers,
  parts,
  profile,
  onClose,
  onSubmit
}) => {
  const [formData, setFormData] = useState({
    quoteNumber: quote?.quoteNumber || `QTN-${Date.now().toString().slice(-6)}`,
    leadId: quote?.leadId || '',
    customerId: quote?.customerId || '',
    customerName: quote?.customerName || '',
    contactPerson: quote?.contactPerson || '',
    date: quote?.date ? quote.date.toDate().toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    validUntil: quote?.validUntil ? quote.validUntil.toDate().toISOString().split('T')[0] : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    items: quote?.items || [] as QuoteItem[],
    taxRate: quote?.taxRate || 18,
    standardTerms: quote?.standardTerms || [],
    specialTerms: quote?.specialTerms || '',
    status: quote?.status || 'Draft'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (formData.leadId) {
      const lead = leads.find(l => l.id === formData.leadId);
      if (lead) {
        setFormData(prev => ({
          ...prev,
          customerName: lead.customerName,
          contactPerson: lead.contactPerson
        }));
      }
    }
  }, [formData.leadId, leads]);

  const handleAddItem = () => {
    const newItem: QuoteItem = {
      description: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0
    };
    setFormData({ ...formData, items: [...formData.items, newItem] });
  };

  const handleRemoveItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...formData.items];
    const item = { ...newItems[index], [field]: value };
    
    if (field === 'partId') {
      const part = parts.find(p => p.id === value);
      if (part) {
        item.partId = part.partId;
        item.partName = part.partName;
        item.description = `${part.partId} - ${part.partName}`;
      }
    }

    if (field === 'quantity' || field === 'unitPrice') {
      item.totalPrice = Number(item.quantity) * Number(item.unitPrice);
    }
    
    newItems[index] = item;
    setFormData({ ...formData, items: newItems });
  };

  const handleTermToggle = (term: string) => {
    const newTerms = formData.standardTerms.includes(term)
      ? formData.standardTerms.filter(t => t !== term)
      : [...formData.standardTerms, term];
    setFormData({ ...formData, standardTerms: newTerms });
  };

  const calculateTotals = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxAmount = (subtotal * formData.taxRate) / 100;
    const totalAmount = subtotal + taxAmount;
    return { subtotal, taxAmount, totalAmount };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.leadId || formData.items.length === 0) {
      toast.error('Please select a lead and add at least one item.');
      return;
    }

    const lead = leads.find(l => l.id === formData.leadId);
    if (lead) {
      const validation = validateAction(lead, 'CREATE_QUOTE');
      if (!validation.isValid) {
        toast.error(validation.message || 'Action blocked by workflow rules.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const { subtotal, taxAmount, totalAmount } = calculateTotals();
      const submissionData: Omit<Quote, 'id' | 'createdAt'> = {
        ...formData,
        date: Timestamp.fromDate(new Date(formData.date)),
        validUntil: Timestamp.fromDate(new Date(formData.validUntil)),
        subtotal,
        taxAmount,
        totalAmount,
        createdBy: profile?.displayName || profile?.email || 'System',
        createdById: profile?.uid || 'system'
      } as any;

      await onSubmit(submissionData);
      toast.success('Quotation saved successfully');
      onClose();
    } catch (error) {
      console.error('Error saving quote:', error);
      toast.error('Failed to save quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {quote ? 'Edit Quotation' : 'Create New Quotation'}
              </h3>
              <p className="text-xs text-gray-500">Quote #: {formData.quoteNumber}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link to Lead *</label>
              <select
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={formData.leadId}
                onChange={(e) => setFormData({ ...formData, leadId: e.target.value })}
              >
                <option value="">Select Lead</option>
                {leads.map(lead => (
                  <option key={lead.id} value={lead.id}>{lead.customerName} - {lead.productType}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quote Date</label>
              <input
                type="date"
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
              <input
                type="date"
                required
                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                value={formData.validUntil}
                onChange={(e) => setFormData({ ...formData, validUntil: e.target.value })}
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Line Items</h4>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
            </div>
            
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-gray-600">Part / Description</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 w-24">Qty</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 w-32">Unit Price</th>
                    <th className="px-4 py-3 font-semibold text-gray-600 w-32">Total</th>
                    <th className="px-4 py-3 text-right w-16"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {formData.items.map((item, index) => (
                    <tr key={index}>
                      <td className="px-4 py-3 space-y-2">
                        <select
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                          value={item.partId || ''}
                          onChange={(e) => handleItemChange(index, 'partId', e.target.value)}
                        >
                          <option value="">Select Part (Optional)</option>
                          {parts.map(p => (
                            <option key={p.id} value={p.id}>{p.partId} - {p.partName}</option>
                          ))}
                        </select>
                        <textarea
                          placeholder="Technical description or variant details..."
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm min-h-[60px]"
                          value={item.description}
                          onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="1"
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        ₹{item.totalPrice.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(index)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Terms and Totals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Terms & Conditions</h4>
              <div className="space-y-2 max-h-[200px] overflow-y-auto border border-gray-100 rounded-xl p-3">
                {STANDARD_TERMS.map((term, i) => (
                  <label key={i} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer group">
                    <input
                      type="checkbox"
                      className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      checked={formData.standardTerms.includes(term)}
                      onChange={() => handleTermToggle(term)}
                    />
                    <span className="text-sm text-gray-600 group-hover:text-gray-900">{term}</span>
                  </label>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Special Terms</label>
                <textarea
                  placeholder="Add any additional or special conditions here..."
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all min-h-[100px]"
                  value={formData.specialTerms}
                  onChange={(e) => setFormData({ ...formData, specialTerms: e.target.value })}
                />
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 space-y-4 h-fit">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span className="font-medium text-gray-900">₹{calculateTotals().subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <span>GST Rate (%)</span>
                  <input
                    type="number"
                    className="w-16 px-2 py-1 border border-gray-200 rounded-lg text-xs"
                    value={formData.taxRate}
                    onChange={(e) => setFormData({ ...formData, taxRate: Number(e.target.value) })}
                  />
                </div>
                <span className="font-medium text-gray-900">₹{calculateTotals().taxAmount.toLocaleString()}</span>
              </div>
              <div className="pt-4 border-t border-gray-200 flex justify-between items-center">
                <span className="text-lg font-bold text-gray-900">Total Amount</span>
                <span className="text-2xl font-bold text-blue-600">₹{calculateTotals().totalAmount.toLocaleString()}</span>
              </div>
              <div className="pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                >
                  <option value="Draft">Draft</option>
                  <option value="Sent">Sent</option>
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Expired">Expired</option>
                </select>
              </div>
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : quote ? 'Update Quotation' : 'Create Quotation'}
          </Button>
        </div>
      </div>
    </div>
  );
};
