import React, { useMemo, useState } from 'react';
import { Lead, Task, DesignReview, Quote, Complaint, TechnicalTemplate, FeasibilityForm, UserProfile, Part, Customer } from '../types';
import { format } from 'date-fns';
import { 
  ArrowLeft, 
  Calendar, 
  MessageSquare, 
  FileCheck, 
  AlertCircle, 
  Clock, 
  User, 
  Building2, 
  Tag, 
  IndianRupee,
  CheckCircle2,
  AlertTriangle,
  ClipboardCheck,
  Plus,
  Info,
  ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { toast } from 'sonner';
import { LEAD_STAGES, validateStageTransition } from '../lib/workflow';
import TechnicalFeasibilityForm from './TechnicalFeasibilityForm';
import FeasibilityReviewDetails from './FeasibilityReviewDetails';
import AuditHistory from './AuditHistory';

import FeasibilityReport from './FeasibilityReport';
import QuotationTab from './QuotationTab';

interface LeadDetailProps {
  lead: Lead;
  tasks: Task[];
  designReviews: DesignReview[];
  quotes: Quote[];
  complaints: Complaint[];
  parts: Part[];
  customers: Customer[];
  technicalTemplates: TechnicalTemplate[];
  feasibilityForms: FeasibilityForm[];
  userProfile: UserProfile | null;
  team: UserProfile[];
  onAddFeasibility: (formData: Omit<FeasibilityForm, 'id' | 'createdAt'>) => Promise<any>;
  onUpdateFeasibility: (id: string, updates: Partial<FeasibilityForm>) => Promise<any>;
  onUpdateLead: (id: string, updates: Partial<Lead>) => Promise<any>;
  onBack: () => void;
  onEdit: () => void;
}

import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';

export default function LeadDetail({ 
  lead, 
  tasks, 
  designReviews, 
  quotes, 
  complaints, 
  parts,
  customers,
  technicalTemplates,
  feasibilityForms,
  userProfile,
  team,
  onAddFeasibility,
  onUpdateFeasibility,
  onUpdateLead,
  onBack, 
  onEdit 
}: LeadDetailProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [showFeasibilityForm, setShowFeasibilityForm] = useState(false);
  const [showPrintReport, setShowPrintReport] = useState(false);
  
  const leadTasks = useMemo(() => tasks.filter(t => t.leadId === lead.id), [tasks, lead.id]);
  const leadReviews = useMemo(() => designReviews.filter(r => r.leadId === lead.id), [designReviews, lead.id]);
  const leadQuotes = useMemo(() => quotes.filter(q => q.leadId === lead.id), [quotes, lead.id]);
  const leadComplaints = useMemo(() => complaints.filter(c => c.leadId === lead.id), [complaints, lead.id]);
  const leadFeasibilityForm = useMemo(() => feasibilityForms.find(f => f.leadId === lead.id), [feasibilityForms, lead.id]);

  const isDesign = userProfile?.role === 'Design';
  const isAdmin = userProfile?.role === 'Admin';
  const isSales = ['Sales', 'BDM', 'Sales Support', 'Admin'].includes(userProfile?.role || '');

  const handlePrint = () => {
    setShowPrintReport(true);
    setTimeout(() => {
      window.print();
      setShowPrintReport(false);
    }, 500);
  };

  // Combined timeline of events
  const timelineEvents = useMemo(() => {
    const events: any[] = [];
    
    leadTasks.forEach(task => {
      events.push({
        date: task.date.toDate(),
        type: 'task',
        title: task.type,
        summary: task.summary,
        icon: <MessageSquare size={14} />,
        color: 'bg-blue-100 text-blue-600'
      });
    });

    leadReviews.forEach(review => {
      events.push({
        date: review.requestDate.toDate(),
        type: 'design',
        title: 'Design Review Requested',
        summary: review.requirementSummary,
        icon: <Tag size={14} />,
        color: 'bg-purple-100 text-purple-600'
      });
      if (review.responseDate) {
        events.push({
          date: review.responseDate.toDate(),
          type: 'design',
          title: `Design Result: ${review.feasibilityStatus}`,
          summary: review.responseRemarks,
          icon: <CheckCircle2 size={14} />,
          color: review.feasibilityStatus === 'Feasible' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
        });
      }
    });

    leadQuotes.forEach(quote => {
      events.push({
        date: quote.date.toDate(),
        type: 'quote',
        title: `Quotation Issued: ${quote.quoteNumber}`,
        summary: `Total: ₹${quote.totalAmount.toLocaleString()}`,
        icon: <FileCheck size={14} />,
        color: 'bg-amber-100 text-amber-600'
      });
    });

    leadComplaints.forEach(complaint => {
      events.push({
        date: complaint.complaintDate.toDate(),
        type: 'complaint',
        title: `Complaint Registered: ${complaint.complaintId}`,
        summary: complaint.description,
        icon: <AlertCircle size={14} />,
        color: 'bg-red-100 text-red-600'
      });
    });

    if (leadFeasibilityForm) {
      events.push({
        date: leadFeasibilityForm.createdAt.toDate(),
        type: 'feasibility',
        title: `Technical Form Submitted: ${leadFeasibilityForm.category}`,
        summary: `Status: ${leadFeasibilityForm.status}`,
        icon: <ClipboardCheck size={14} />,
        color: 'bg-emerald-100 text-emerald-600'
      });
      if (leadFeasibilityForm.updatedAt && leadFeasibilityForm.status === 'Closed') {
        events.push({
          date: leadFeasibilityForm.updatedAt.toDate(),
          type: 'feasibility',
          title: `Technical Review Complete: ${leadFeasibilityForm.overallStatus}`,
          summary: leadFeasibilityForm.designResponse || '',
          icon: <CheckCircle2 size={14} />,
          color: leadFeasibilityForm.overallStatus === 'Feasible' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
        });
      }
    }

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [leadTasks, leadReviews, leadQuotes, leadComplaints, leadFeasibilityForm]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft size={18} className="mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">{lead.customerName}</h2>
            <div className="flex items-center gap-4 mt-1">
              <Badge variant="outline" className="font-mono text-[10px]">{lead.id.slice(-6).toUpperCase()}</Badge>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold text-slate-400">Current Stage:</span>
                <Select 
                  value={lead.stage} 
                  onValueChange={async (newStage) => {
                    const validation = validateStageTransition(lead, newStage as any, tasks);
                    if (!validation.isValid) {
                      toast.error(validation.message || `Cannot move to ${newStage}`);
                      return;
                    }
                    try {
                      await onUpdateLead(lead.id, { stage: newStage as any });
                      toast.success(`Stage updated to ${newStage}`);
                    } catch (error) {
                      toast.error("Failed to update status");
                    }
                  }}
                >
                  <SelectTrigger disabled={isDesign} className={`h-8 min-w-[180px] bg-primary/5 border-primary/20 text-primary font-bold text-xs transition-colors ${isDesign ? 'opacity-70 cursor-not-allowed' : 'hover:bg-primary/10'}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEAD_STAGES.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>Report</Button>
          {!isDesign && <Button onClick={onEdit}>Edit Lead</Button>}
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full" onValueChange={setActiveTab}>
        <TabsList className="bg-slate-100 p-1 rounded-xl mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
          <TabsTrigger value="feasibility">Feasibility</TabsTrigger>
          <TabsTrigger value="design-review">Design Review</TabsTrigger>
          {!isDesign && <TabsTrigger value="quotation">Quotation</TabsTrigger>}
          {!isDesign && <TabsTrigger value="complaints">Complaints ({leadComplaints.length})</TabsTrigger>}
        </TabsList>

        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <Card className="shadow-sm border-none bg-white">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Quick Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <User size={16} className="text-slate-400" />
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Contact Person</p>
                      <p className="text-sm font-semibold">{lead.contactPerson}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Building2 size={16} className="text-slate-400" />
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Industry & Region</p>
                      <p className="text-sm font-semibold">{lead.industry} - {lead.region}</p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center gap-3">
                    <Tag size={16} className="text-slate-400" />
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Product Classification</p>
                      <p className="text-sm font-semibold">
                        {lead.productCategory} • {lead.partCategory || 'Generic'}
                        {lead.partSubCategory && <span className="text-xs text-slate-400 font-normal ml-1">({lead.partSubCategory})</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <IndianRupee size={16} className="text-slate-400" />
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">Estimated Pipeline</p>
                      <p className="text-sm font-semibold">₹{lead.estimatedValue.toLocaleString()} ({lead.probability}%)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <AuditHistory auditData={lead} history={lead.history} />

              {lead.stage === 'Closed Lost' && (
                <Card className="shadow-sm border-none bg-red-50">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-red-600 flex items-center gap-2">
                      <AlertTriangle size={16} />
                      Lost Reason
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-bold text-red-800">{lead.lostReason}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-sm border-none bg-white">
                <CardHeader>
                  <CardTitle className="text-lg">Requirement Brief</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 leading-relaxed min-h-[100px] bg-slate-50 p-4 rounded-lg italic border-l-4 border-slate-200">
                    {lead.requirementDetails || "No detailed requirement provided yet."}
                  </p>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="border-none shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold uppercase text-slate-400">Quotation Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {lead.quoteCreated ? (
                      <div className="flex items-center gap-2 text-green-600 font-bold">
                        <CheckCircle2 size={16} />
                        Quoted: ₹{lead.quoteValue?.toLocaleString()}
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm italic">Not Quoted</span>
                    )}
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-bold uppercase text-slate-400">PO Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {lead.poReceived ? (
                      <div className="flex items-center gap-2 text-primary font-bold">
                        <CheckCircle2 size={16} />
                        PO: {lead.poNumber} (₹{lead.poValue?.toLocaleString()})
                      </div>
                    ) : (
                      <span className="text-slate-400 text-sm italic">Pending PO</span>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="activities">
          <Card className="shadow-sm border-none bg-white min-h-[500px]">
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>Historical log of all interactions and updates</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                {timelineEvents.map((event, idx) => (
                  <div key={idx} className="relative animate-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${idx * 50}ms` }}>
                    <div className={`absolute -left-[27px] top-1 h-6 w-6 rounded-full border-4 border-white flex items-center justify-center ${event.color} shadow-sm`}>
                      {event.icon}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-900">{event.title}</h4>
                        <span className="text-[10px] font-bold text-slate-400">{format(event.date, 'MMM dd, HH:mm')}</span>
                      </div>
                      <p className="text-xs text-slate-500">{event.summary}</p>
                    </div>
                  </div>
                ))}
                {timelineEvents.length === 0 && (
                  <div className="text-center py-12 text-slate-400">
                    <p className="text-sm">No activity recorded yet.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feasibility">
          <div className="space-y-4">
            {lead.productCategory === 'Standard' ? (
              <Card className="bg-slate-50 border-dashed">
                <CardContent className="py-12 text-center text-slate-400">
                  <Info className="mx-auto mb-2 opacity-50" size={32} />
                  <p className="font-bold">Not Required</p>
                  <p className="text-xs">Feasibility review is not mandatory for standard products.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {!showFeasibilityForm && !leadFeasibilityForm && (
                  <Card className="border-dashed border-2 hover:border-primary transition-all cursor-pointer bg-white group" onClick={() => setShowFeasibilityForm(true)}>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-slate-400 group-hover:text-primary">
                      <Plus size={48} className="mb-4 opacity-50 group-hover:opacity-100" />
                      <p className="text-lg font-bold">Create Technical Feasibility Form</p>
                      <p className="text-sm opacity-70">Initiate technical specification review for design team</p>
                    </CardContent>
                  </Card>
                )}

                {showFeasibilityForm && (
                  <div className="animate-in slide-in-from-bottom-4 duration-500">
                    <TechnicalFeasibilityForm 
                      leadId={lead.id}
                      templates={technicalTemplates}
                      userProfile={userProfile}
                      team={team}
                      onSubmit={onAddFeasibility}
                      onCancel={() => setShowFeasibilityForm(false)}
                    />
                  </div>
                )}

                {leadFeasibilityForm && (
                  <div className="animate-in fade-in duration-500">
                    <FeasibilityReviewDetails 
                      form={leadFeasibilityForm}
                      userProfile={userProfile}
                      onUpdate={onUpdateFeasibility}
                      onPrint={handlePrint}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="design-review">
          <Card className="shadow-sm border-none">
            <CardHeader>
              <CardTitle>Engineering Review History</CardTitle>
              <CardDescription>Status of all design review requests</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {leadReviews.map((review) => (
                    <div key={review.id} className="p-4 rounded-lg border border-slate-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <Badge variant={review.feasibilityStatus === 'Feasible' ? 'default' : 'secondary'}>
                          {review.feasibilityStatus}
                        </Badge>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {format(review.requestDate.toDate(), 'dd/MM/yyyy')}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{review.requirementSummary}</p>
                      {review.responseRemarks && (
                        <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded">
                          "{review.responseRemarks}"
                        </p>
                      )}
                    </div>
                  ))}
                  {leadReviews.length === 0 && (
                    <div className="text-center py-12 text-slate-400 italic">
                      No standalone design reviews recorded.
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotation">
          <QuotationTab 
            lead={lead}
            tasks={tasks}
            onUpdateLead={onUpdateLead} 
            userProfile={userProfile}
            parts={parts}
            customer={customers.find(c => c.id === lead.customerId)}
            feasibilityForm={leadFeasibilityForm}
          />
        </TabsContent>

        <TabsContent value="complaints">
          <div className="space-y-4">
            {leadComplaints.map(complaint => (
              <Card key={complaint.id} className="shadow-sm border-none overflow-hidden hover:shadow-md transition-shadow">
                <div className={`h-1 w-full ${complaint.severity === 'Critical' ? 'bg-red-500' : 'bg-amber-500'}`} />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">{complaint.complaintId}</Badge>
                    <Badge className={complaint.status === 'Closed' ? 'bg-green-100 text-green-600 border-none' : 'bg-blue-100 text-blue-600 border-none'}>
                      {complaint.status}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">{complaint.complaintType}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-slate-600 line-clamp-2">{complaint.description}</p>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
                    <span>Severity: {complaint.severity}</span>
                    <span>Created: {format(complaint.createdAt.toDate(), 'dd MMM yyyy')}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
            {leadComplaints.length === 0 && (
              <Card className="bg-slate-50/50 border-none shadow-sm">
                <CardContent className="py-20 text-center text-slate-400">
                  <ShieldAlert className="mx-auto mb-2 opacity-30" size={48} />
                  <p className="text-lg font-bold">No complaints reported</p>
                  <p className="text-sm italic">Great! This lead has a clean track record.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {showPrintReport && leadFeasibilityForm && (
        <div className="fixed inset-0 z-[9999] bg-white overflow-auto p-0 m-0 print:block hidden">
          <FeasibilityReport form={leadFeasibilityForm} lead={lead} />
        </div>
      )}
    </div>
  );
}
