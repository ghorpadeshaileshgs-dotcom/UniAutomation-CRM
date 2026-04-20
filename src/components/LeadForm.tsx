import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
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
import { leadService } from '../services/leadService';
import { Lead, Industry, Region, LeadStage, LeadSource, ProductCategory, Customer, Part, CustomerType } from '../types';
import { validateStageTransition, validateAction, LEAD_STAGES } from '../lib/workflow';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import CustomerForm from './CustomerForm';
import PartForm from './PartForm';
import { Plus, Search } from 'lucide-react';

interface LeadFormProps {
  leadId: string | null;
  onClose: () => void;
}

const regions: Region[] = ["Domestic", "Export"];
const stages: LeadStage[] = ["Lead", "Qualified", "Requirement Understanding", "Techno-Commercial Offer", "Quoted", "Follow-up", "Negotiation", "PO Expected", "PO Received", "Closed Won", "Closed Lost"];
const sources: LeadSource[] = ["Email", "Call", "Visit", "Reference"];
const categories: ProductCategory[] = ["Standard", "New Development", "Variant"];
const industries: Industry[] = ['Defence', 'Locomotive', 'Industrial', 'Automobile', 'Other'];
const customerTypes: CustomerType[] = ['OEM', 'End User', 'Project', 'Design House'];

export default function LeadForm({ leadId, onClose }: LeadFormProps) {
  const { addLead, updateLead, user, profile, team, customers, parts, leads, employees } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [showAddPart, setShowAddPart] = useState(false);
  const [custSearch, setCustSearch] = useState('');
  const [partSearch, setPartSearch] = useState('');

  const [formData, setFormData] = useState<Partial<Lead>>({
    customerId: '',
    customerName: '',
    partId: '',
    partName: '',
    contactPerson: '',
    industry: 'Industrial',
    region: 'Domestic',
    customerType: 'End User',
    productType: '',
    productCategory: 'Standard',
    partCategory: 'Sensors',
    partSubCategory: '',
    stage: 'Lead',
    salespersonName: profile?.displayName || profile?.name || user?.displayName || user?.email || '',
    salespersonId: profile?.uid || user?.uid || '',
    source: 'Email',
    estimatedValue: 0,
    probability: 10,
    priority: 'Low',
    quoteCreated: false,
    poReceived: false,
    requirementDetails: '',
    lostReason: '',
  });

  useEffect(() => {
    if (leadId) {
      const fetchLead = async () => {
        const lead = await leadService.getLead(leadId);
        if (lead) {
          setFormData(lead);
        }
      };
      fetchLead();
    }
  }, [leadId]);

  const isSales = ['Sales', 'BDM', 'Sales Support'].includes(profile?.role || '');
  const isAdmin = profile?.role === 'Admin';

  // FIX: User selection using employees master
  const salesEmployees = employees.filter(emp => 
    emp.status === 'Active' && 
    ((emp as any).department?.toLowerCase().includes('sales') || 
     (emp as any).department?.toLowerCase().includes('bdm') ||
     emp.departmentName?.toLowerCase().includes('sales') ||
     emp.departmentName?.toLowerCase().includes('bdm'))
  );
  
  const activeSales = salesEmployees.length > 0 ? salesEmployees : employees.filter(e => e.status === 'Active');
  
  console.log("Active Sales for Dropdown (with fallback if empty):", activeSales);

  const handleCustomerSelect = (custId: string) => {
    const selected = customers.find(c => c.id === custId);
    if (selected) {
      const priority = (selected.customerType === 'OEM' || selected.customerType === 'Design House') ? 'High' : 
                       (selected.customerType === 'Project' ? 'Medium' : 'Low');

      setFormData({
        ...formData,
        customerId: selected.id,
        customerName: selected.name,
        customerType: selected.customerType,
        industry: selected.industry,
        region: selected.region,
        priority: priority as any,
        contactPerson: selected.contactPersons[0]?.name || ''
      });
    }
  };

  const handlePartSelect = (pId: string) => {
    const selected = parts.find(p => p.id === pId);
    if (selected) {
      setFormData({
        ...formData,
        partId: selected.id,
        partName: selected.partName,
        productType: selected.partName,
        productCategory: selected.standard ? 'Standard' : 'New Development',
        partCategory: selected.category,
        partSubCategory: selected.subCategory
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerId || !formData.partId) {
      toast.error("Please select both Customer and Part");
      return;
    }

    // Duplicate Lead Check (Customer + Part)
    const isDuplicateLead = leads.some(l => 
      l.customerId === formData.customerId && 
      l.partId === formData.partId && 
      l.id !== leadId &&
      !['Closed Won', 'Closed Lost'].includes(l.stage)
    );

    if (isDuplicateLead) {
      const existing = leads.find(l => 
        l.customerId === formData.customerId && 
        l.partId === formData.partId && 
        l.id !== leadId &&
        !['Closed Won', 'Closed Lost'].includes(l.stage)
      );
      toast.error(`An active lead already exists for this Customer and Part combination (Lead ID: ${existing?.id.slice(-6).toUpperCase()}).`);
      return;
    }

    setLoading(true);
    try {
      // Workflow Validation
      const validation = validateStageTransition(formData, formData.stage || 'Lead');
      if (!validation.isValid) {
        toast.error(validation.message || `Workflow Blocked: Please provide ${validation.missingFields.join(', ')} before moving to ${formData.stage}`);
        setLoading(false);
        return;
      }

      // Check for PO Validation specifically
      if (formData.poReceived) {
        const poValidation = validateAction(formData as Lead, 'CREATE_PO');
        if (!poValidation.isValid) {
          toast.error(poValidation.message || 'PO cannot be received without feasibility approval.');
          setLoading(false);
          return;
        }
      }

      const finalData = { ...formData };
      if (finalData.poReceived) {
        finalData.stage = 'Closed Won';
      }

      if (leadId) {
        await updateLead(leadId, finalData);
        toast.success("Lead updated successfully");
      } else {
        await addLead(finalData as any);
        toast.success("Lead created successfully");
      }
      onClose();
    } catch (err: any) {
      toast.error("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(custSearch.toLowerCase()) || 
    c.customerId.toLowerCase().includes(custSearch.toLowerCase())
  );

  const filteredParts = parts.filter(p => 
    p.partName.toLowerCase().includes(partSearch.toLowerCase()) || 
    p.partId.toLowerCase().includes(partSearch.toLowerCase())
  );

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-2xl font-bold">
              {leadId ? 'Edit Lead' : 'Create New Lead'}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="flex-1 px-6 py-4">
            <form id="lead-form" onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Select Customer *</Label>
                    <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setShowAddCustomer(true)}>
                      <Plus size={12} className="mr-1" />
                      New Customer
                    </Button>
                  </div>
                  <Select value={formData.customerId} onValueChange={handleCustomerSelect}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Search / Select Customer" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2 sticky top-0 bg-white z-10 border-b">
                        <div className="flex items-center px-2 py-1 bg-slate-100 rounded-md">
                          <Search size={14} className="text-slate-400 mr-2" />
                          <input 
                            className="bg-transparent text-sm w-full outline-none" 
                            placeholder="Filter customers..."
                            value={custSearch}
                            onChange={(e) => setCustSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <ScrollArea className="h-48">
                        {filteredCustomers.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400">No customers found</div>
                        ) : (
                          filteredCustomers.map(c => (
                            <SelectItem key={c.id} value={c.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{c.name}</span>
                                <span className="text-[10px] text-slate-500">{c.customerId} • {c.industry}</span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Select Part / Product *</Label>
                    <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setShowAddPart(true)}>
                      <Plus size={12} className="mr-1" />
                      New Part
                    </Button>
                  </div>
                  <Select value={formData.partId} onValueChange={handlePartSelect}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Search / Select Part" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="p-2 sticky top-0 bg-white z-10 border-b">
                        <div className="flex items-center px-2 py-1 bg-slate-100 rounded-md">
                          <Search size={14} className="text-slate-400 mr-2" />
                          <input 
                            className="bg-transparent text-sm w-full outline-none" 
                            placeholder="Filter parts..."
                            value={partSearch}
                            onChange={(e) => setPartSearch(e.target.value)}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>
                      <ScrollArea className="h-48">
                        {filteredParts.length === 0 ? (
                          <div className="p-4 text-center text-xs text-slate-400">No parts found</div>
                        ) : (
                          filteredParts.map(p => (
                            <SelectItem key={p.id} value={p.id}>
                              <div className="flex flex-col">
                                <span className="font-medium">{p.partName}</span>
                                <span className="text-[10px] text-slate-500">{p.partId} • {p.category}</span>
                              </div>
                            </SelectItem>
                          ))
                        )}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.customerId && (
                <div className="space-y-4">
                  <div className="grid grid-cols-4 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Contact</span>
                      <p className="text-sm font-medium">{formData.contactPerson || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Industry</span>
                      <p className="text-sm font-medium">{formData.industry || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Customer Type</span>
                      <p className="text-sm font-medium">{formData.customerType || 'N/A'}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Priority</span>
                      <Badge className={formData.priority === 'High' ? 'bg-red-100 text-red-600' : formData.priority === 'Medium' ? 'bg-amber-100 text-amber-600' : 'bg-green-100 text-green-600'}>
                        {formData.priority}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Customer Category</Label>
                      <Select 
                        value={formData.customerType} 
                        onValueChange={v => setFormData({...formData, customerType: v as CustomerType})}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {customerTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Industry Segment (Override)</Label>
                      <Select 
                        value={formData.industry} 
                        onValueChange={v => setFormData({...formData, industry: v as Industry})}
                      >
                        <SelectTrigger className="bg-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {industries.map(i => <SelectItem key={i} value={i}>{i}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {formData.partId && (
                <div className="grid grid-cols-3 gap-4 p-4 bg-blue-50/30 rounded-xl border border-blue-100">
                   <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Engineering Category</span>
                    <p className="text-sm font-medium text-blue-800">{formData.partCategory}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Development Class</span>
                    <p className="text-sm font-medium text-blue-800">{formData.productCategory}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-slate-400 uppercase font-bold">Sub-Category</span>
                    <p className="text-sm font-medium text-blue-800">{formData.partSubCategory || 'N/A'}</p>
                  </div>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Opportunity Stage *</Label>
                  <Select 
                    value={formData.stage} 
                    onValueChange={v => setFormData({...formData, stage: v as LeadStage})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Lead Source</Label>
                  <Select 
                    value={formData.source} 
                    onValueChange={v => setFormData({...formData, source: v as LeadSource})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sources.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estimatedValue">Estimated Value (₹) *</Label>
                  <Input 
                    id="estimatedValue" 
                    type="number" 
                    required
                    value={formData.estimatedValue} 
                    onChange={e => setFormData({...formData, estimatedValue: parseFloat(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Probability (%) *</Label>
                  <Select 
                    value={formData.probability?.toString()} 
                    onValueChange={v => setFormData({...formData, probability: parseInt(v)})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50, 75, 90, 100].map(p => (
                        <SelectItem key={p} value={p.toString()}>{p}%</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Region</Label>
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
                  <Label>Allocated Sales Person *</Label>
                  <Select 
                    value={formData.salespersonId} 
                    onValueChange={v => {
                      const emp = activeSales.find(e => e.id === v);
                      setFormData({
                        ...formData, 
                        salespersonId: v, 
                        salespersonName: emp?.name || (emp as any)?.employeeName || ''
                      });
                    }}
                    disabled={!isAdmin && isSales}
                  >
                    <SelectTrigger className={!isAdmin && isSales ? "bg-slate-50" : ""}>
                      <SelectValue placeholder="Select sales person" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeSales.map(emp => (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.name || (emp as any).employeeName} ({emp.employeeId})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="requirementDetails">Requirement Details *</Label>
                <textarea 
                  id="requirementDetails"
                  className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.requirementDetails} 
                  onChange={e => setFormData({...formData, requirementDetails: e.target.value})}
                  placeholder="Mandatory for Requirement Understanding stage..."
                />
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="quoteCreated" 
                      checked={formData.quoteCreated} 
                      onCheckedChange={v => {
                        const currentStageIndex = LEAD_STAGES.indexOf(formData.stage || 'Lead');
                        const quotedIndex = LEAD_STAGES.indexOf('Quoted');
                        const newStage = (!!v && currentStageIndex < quotedIndex) ? 'Quoted' : formData.stage;
                        setFormData({...formData, quoteCreated: !!v, stage: newStage as LeadStage});
                      }} 
                    />
                    <Label htmlFor="quoteCreated">Quotation Sent</Label>
                  </div>
                  
                  {formData.quoteCreated && (
                    <div className="space-y-2 pl-6 border-l-2 border-slate-100">
                      <Label htmlFor="quoteValue">Quote Value (₹)</Label>
                      <Input 
                        id="quoteValue" 
                        type="number" 
                        value={formData.quoteValue} 
                        onChange={e => setFormData({...formData, quoteValue: parseFloat(e.target.value)})}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="poReceived" 
                      checked={formData.poReceived} 
                      onCheckedChange={v => {
                        const newStage = !!v ? 'Closed Won' : formData.stage;
                        setFormData({...formData, poReceived: !!v, stage: newStage as LeadStage});
                      }} 
                    />
                    <Label htmlFor="poReceived" className="font-semibold text-green-700">PO Received</Label>
                  </div>

                  {formData.poReceived && (
                    <div className="space-y-3 pl-6 border-l-2 border-green-100">
                      <div className="space-y-1">
                        <Label htmlFor="poNumber" className="text-xs">PO Number</Label>
                        <Input 
                          id="poNumber" 
                          required
                          value={formData.poNumber} 
                          onChange={e => setFormData({...formData, poNumber: e.target.value})}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="poValue" className="text-xs">PO Value (₹)</Label>
                        <Input 
                          id="poValue" 
                          type="number" 
                          required
                          value={formData.poValue} 
                          onChange={e => setFormData({...formData, poValue: parseFloat(e.target.value)})}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="poDate" className="text-xs">PO Date</Label>
                        <Input 
                          id="poDate" 
                          type="date" 
                          required
                          value={formData.poDate ? (formData.poDate as any).toDate?.().toISOString().split('T')[0] ?? formData.poDate : ''} 
                          onChange={e => setFormData({...formData, poDate: Timestamp.fromDate(new Date(e.target.value)) as any})}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </ScrollArea>

          <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100">
            <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
            <Button type="submit" form="lead-form" disabled={loading}>
              {loading ? 'Saving...' : (leadId ? 'Update Lead' : 'Create Lead')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showAddCustomer && (
        <CustomerForm onClose={() => setShowAddCustomer(false)} />
      )}
      {showAddPart && (
        <PartForm onClose={() => setShowAddPart(false)} />
      )}
    </>
  );
}
