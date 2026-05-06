import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useFirebase } from '../hooks/useFirebase';
import { Customer, Industry, Region, CustomerType, ContactPerson, QuoteFormat } from '../types';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Trash2, FileText } from 'lucide-react';

interface CustomerFormProps {
  customer?: Customer;
  onClose: () => void;
}

const industries: Industry[] = ["Defence", "Locomotive", "Industrial", "Automobile", "Other"];
const regions: Region[] = ["Domestic", "Export"];
const customerTypes: CustomerType[] = ["OEM", "End User", "Project", "Design House"];
const quoteFormats: QuoteFormat[] = ["Basic", "Standard", "Special"];

export default function CustomerForm({ customer, onClose }: CustomerFormProps) {
  const { addCustomer, updateCustomer, profile, customers } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>({
    customerId: '',
    name: '',
    industry: 'Industrial',
    customerType: 'OEM',
    region: 'Domestic',
    contactPersons: [{ name: '', email: '', phone: '' }],
    address: '',
    gstNumber: '',
    defaultQuoteFormat: 'Standard',
  });

  useEffect(() => {
    if (customer) {
      setFormData(customer);
    }
  }, [customer]);

  const handleAddContact = () => {
    setFormData({
      ...formData,
      contactPersons: [...(formData.contactPersons || []), { name: '', email: '', phone: '' }]
    });
  };

  const handleRemoveContact = (index: number) => {
    const updated = [...(formData.contactPersons || [])];
    updated.splice(index, 1);
    setFormData({ ...formData, contactPersons: updated });
  };

  const handleContactChange = (index: number, field: keyof ContactPerson, value: string) => {
    const updated = [...(formData.contactPersons || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, contactPersons: updated });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.industry || !formData.customerType) {
      toast.error("Please fill all mandatory fields");
      return;
    }

    // Role Check
    const canManage = profile?.role === 'Admin' || profile?.role === 'Sales';
    if (!canManage) {
      toast.error("You do not have permission to add customers");
      return;
    }

    // Duplicate Check
    const isDuplicate = customers.some(c => 
      c.name.trim().toLowerCase() === formData.name?.trim().toLowerCase() && 
      c.id !== customer?.id
    );

    if (isDuplicate) {
      const existing = customers.find(c => c.name.trim().toLowerCase() === formData.name?.trim().toLowerCase());
      toast.error(`Customer "${formData.name}" already exists (ID: ${existing?.customerId}). Please use the existing record.`);
      return;
    }
    
    setLoading(true);
    try {
      if (customer) {
        await updateCustomer(customer.id, formData);
        toast.success("Customer updated successfully");
      } else {
        await addCustomer({
          ...formData,
          createdBy: profile?.displayName || profile?.email || 'System'
        } as any);
        toast.success("Customer added successfully");
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
          <DialogTitle className="text-2xl font-bold">
            {customer ? 'Edit Customer' : 'Add New Customer Master'}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6 py-4">
          <form id="customer-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customerId">Customer ID *</Label>
                <Input 
                  id="customerId" 
                  required 
                  value={formData.customerId} 
                  onChange={e => setFormData({...formData, customerId: e.target.value})}
                  placeholder="CUST-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Customer Name *</Label>
                <Input 
                  id="name" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="Company Name"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Industry *</Label>
                <Select 
                  value={formData.industry} 
                  onValueChange={v => setFormData({...formData, industry: v as Industry})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Customer Type *</Label>
                <Select 
                  value={formData.customerType} 
                  onValueChange={v => setFormData({...formData, customerType: v as CustomerType})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {customerTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Region *</Label>
                <Select 
                  value={formData.region} 
                  onValueChange={v => setFormData({...formData, region: v as Region})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input 
                  id="gstNumber" 
                  value={formData.gstNumber} 
                  onChange={e => setFormData({...formData, gstNumber: e.target.value})}
                  placeholder="Optional"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText size={14} className="text-blue-500" />
                  Default Quote Format
                </Label>
                <Select 
                  value={formData.defaultQuoteFormat} 
                  onValueChange={v => setFormData({...formData, defaultQuoteFormat: v as QuoteFormat})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Default Format" />
                  </SelectTrigger>
                  <SelectContent>
                    {quoteFormats.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-muted-foreground">Pre-selected when creating new quotes for this customer.</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address *</Label>
              <textarea 
                id="address"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.address} 
                onChange={e => setFormData({...formData, address: e.target.value})}
                placeholder="Full billing address"
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-lg font-semibold">Contact Persons</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddContact}>
                  <Plus size={16} className="mr-2" />
                  Add Contact
                </Button>
              </div>
              
              <div className="space-y-4">
                {formData.contactPersons?.map((contact, idx) => (
                  <div key={idx} className="p-4 border rounded-lg bg-slate-50 relative group">
                    {formData.contactPersons!.length > 1 && (
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-2 right-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleRemoveContact(idx)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    )}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <Label className="text-xs">Name</Label>
                        <Input 
                          value={contact.name} 
                          onChange={e => handleContactChange(idx, 'name', e.target.value)}
                          placeholder="Name"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Email</Label>
                        <Input 
                          type="email"
                          value={contact.email} 
                          onChange={e => handleContactChange(idx, 'email', e.target.value)}
                          placeholder="Email"
                          required
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Phone</Label>
                        <Input 
                          value={contact.phone} 
                          onChange={e => handleContactChange(idx, 'phone', e.target.value)}
                          placeholder="Phone"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="px-6 py-4 bg-slate-50 border-t border-slate-100 shrink-0">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" form="customer-form" disabled={loading}>
            {loading ? 'Saving...' : (customer ? 'Update' : 'Add Customer')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
