import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CheckSquare, 
  Mail, 
  Plus, 
  LogOut, 
  Search,
  Filter,
  Download,
  Upload,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle2,
  IndianRupee,
  FileText,
  ShieldCheck,
  Brain,
  Building2,
  Users2,
  Settings2
} from 'lucide-react';
import { useFirebase } from './hooks/useFirebase';
import { auth } from './firebase';
import { signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { toast } from 'sonner';
import { format, isToday, isPast, isFuture } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

// UI Components
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Toaster } from '@/components/ui/sonner';

// Custom Components
import CEODashboard from './components/CEODashboard';
import OrderManagement from './components/OrderManagement';
import FinanceManagement from './components/FinanceManagement';
import GovernanceManagement from './components/GovernanceManagement';
import LeadList from './components/LeadList';
import LeadForm from './components/LeadForm';
import TaskBoard from './components/TaskBoard';
import Dashboard from './components/Dashboard';
import EmailIntegration from './components/EmailIntegration';
import ImportExport from './components/ImportExport';
import DebtorsList from './components/DebtorsList';
import BulkUpload from './components/BulkUpload';
import CustomerList from './components/CustomerList';
import PartList from './components/PartList';
import Reports from './components/Reports';
import DesignReviewList from './components/DesignReviewList';
import DesignReviewForm from './components/DesignReviewForm';
import DesignEmailProcessor from './components/DesignEmailProcessor';
import FeasibilityFormList from './components/FeasibilityFormList';
import FeasibilityReviewDetails from './components/FeasibilityReviewDetails';
import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { EmployeeList } from './components/EmployeeList';
import { DepartmentList } from './components/DepartmentList';
import { QuoteList } from './components/QuoteList';
import { QuoteForm } from './components/QuoteForm';
import { QuotePrint } from './components/QuotePrint';
import ComplaintList from './components/ComplaintList';
import ComplaintForm from './components/ComplaintForm';
import ComplaintDetails from './components/ComplaintDetails';
import KanbanBoard from './components/KanbanBoard';
import LeadDetail from './components/LeadDetail';
import TechnicalTemplateList from './components/TechnicalTemplateList';
import TechnicalTemplateForm from './components/TechnicalTemplateForm';
import LeadFilters from './components/LeadFilters';
import AdminSetup from './components/AdminSetup';

export default function App() {
  const { 
    user, 
    profile, 
    leads, 
    tasks, 
    debtors, 
    customers, 
    parts, 
    team, 
    designReviews, 
    employees,
    departments,
    quotes,
    complaints,
    technicalTemplates,
    feasibilityForms,
    salesOrders,
    invoices,
    targets,
    forecasts,
    approvals,
    loading,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    addDepartment,
    updateDepartment,
    deleteDepartment,
    addQuote,
    updateQuote,
    deleteQuote,
    addComplaint,
    updateComplaint,
    deleteComplaint,
    addLead,
    updateLead,
    addFeasibilityForm,
    updateFeasibilityForm,
    addSalesOrder,
    updateSalesOrder,
    addInvoice,
    updateInvoice,
    setTarget,
    saveForecast,
    requestApproval,
    updateApproval,
    addTechnicalTemplate,
    updateTechnicalTemplate,
    deleteTechnicalTemplate,
    updateUserProfile,
    deleteUserProfile,
    adminCreateUser
  } = useFirebase();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showDesignForm, setShowDesignForm] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [selectedQuote, setSelectedQuote] = useState<any | null>(null);
  const [printingQuote, setPrintingQuote] = useState<any | null>(null);
  const [showComplaintForm, setShowComplaintForm] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [isViewingComplaint, setIsViewingComplaint] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isViewingLead, setIsViewingLead] = useState(false);
  const [leadViewMode, setLeadViewMode] = useState<'list' | 'kanban'>('kanban');
  const [selectedLeadForDesign, setSelectedLeadForDesign] = useState<any | null>(null);
  const [selectedFeasibilityForm, setSelectedFeasibilityForm] = useState<any | null>(null);
  const [isReviewingFeasibility, setIsReviewingFeasibility] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any | null>(null);

  // Search and Filter State
  const [leadSearch, setLeadSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>('all');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedCustomerFilter, setSelectedCustomerFilter] = useState<string>('all');

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = 
        lead.customerName.toLowerCase().includes(leadSearch.toLowerCase()) ||
        lead.contactPerson?.toLowerCase().includes(leadSearch.toLowerCase()) ||
        lead.partName?.toLowerCase().includes(leadSearch.toLowerCase());
      
      const matchesIndustry = industryFilter === 'all' || lead.industry === industryFilter;
      const matchesCustomerType = customerTypeFilter === 'all' || lead.customerType === customerTypeFilter;
      const matchesStage = stageFilter === 'all' || lead.stage === stageFilter;
      const matchesPriority = priorityFilter === 'all' || lead.priority === priorityFilter;
      const matchesCustomer = selectedCustomerFilter === 'all' || lead.customerId === selectedCustomerFilter;

      return matchesSearch && matchesIndustry && matchesCustomerType && matchesStage && matchesPriority && matchesCustomer;
    });
  }, [leads, leadSearch, industryFilter, customerTypeFilter, stageFilter, priorityFilter, selectedCustomerFilter]);

  const handleLogin = () => {
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider).catch(err => {
      toast.error("Login failed: " + err.message);
    });
  };

  const handleLogout = () => {
    signOut(auth);
  };

  const isDesign = profile?.role === 'Design';
  const isSales = ['Sales', 'BDM', 'Sales Support', 'Admin'].includes(profile?.role || '');
  const isAdmin = profile?.role === 'Admin';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // One-time admin setup route — accessible via /#admin-setup
  if (window.location.hash === '#admin-setup') {
    return <AdminSetup />;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm z-20">
        <div className="p-6 border-b border-slate-100 flex items-center gap-3">
          <div className="bg-primary p-2 rounded-lg">
            <TrendingUp className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">SensorCRM</h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          <div>
            <p className="px-4 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">General</p>
            <div className="space-y-1">
              <NavItem 
                icon={<LayoutDashboard size={18} />} 
                label="Executive View" 
                active={activeTab === 'dashboard'} 
                onClick={() => setActiveTab('dashboard')} 
              />
              <NavItem 
                icon={<CheckSquare size={18} />} 
                label="Tasks" 
                active={activeTab === 'tasks'} 
                onClick={() => setActiveTab('tasks')} 
              />
            </div>
          </div>

          <div>
            <p className="px-4 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sales & Growth</p>
            <div className="space-y-1">
              {(isAdmin || isSales) && (
                <>
                  <NavItem 
                    icon={<TrendingUp size={18} />} 
                    label="Lead Management" 
                    active={activeTab === 'leads'} 
                    onClick={() => setActiveTab('leads')} 
                  />
                  <NavItem 
                    icon={<FileText size={18} />} 
                    label="Quotations" 
                    active={activeTab === 'quotes'} 
                    onClick={() => setActiveTab('quotes')} 
                  />
                  <NavItem 
                    icon={<CheckCircle2 size={18} />} 
                    label="Order Control" 
                    active={activeTab === 'orders'} 
                    onClick={() => setActiveTab('orders')} 
                  />
                </>
              )}
            </div>
          </div>

          <div>
            <p className="px-4 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Operations</p>
            <div className="space-y-1">
              <NavItem 
                icon={<ShieldCheck size={18} />} 
                label="Engineering" 
                active={activeTab === 'design'} 
                onClick={() => setActiveTab('design')} 
              />
              <NavItem 
                icon={<Building2 size={18} />} 
                label="Master Data" 
                active={activeTab === 'masters'} 
                onClick={() => setActiveTab('masters')} 
              />
            </div>
          </div>

          <div>
            <p className="px-4 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Finance</p>
            <div className="space-y-1">
              {(isAdmin || isSales) && (
                <NavItem 
                  icon={<IndianRupee size={18} />} 
                  label="Accounts & Revenue" 
                  active={activeTab === 'finance'} 
                  onClick={() => setActiveTab('finance')} 
                />
              )}
            </div>
          </div>

          <div>
            <p className="px-4 mb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Control</p>
            <div className="space-y-1">
              <NavItem 
                icon={<AlertCircle size={18} />} 
                label="Quality & Support" 
                active={activeTab === 'complaints'} 
                onClick={() => setActiveTab('complaints')} 
              />
              <NavItem 
                icon={<ShieldCheck size={18} />} 
                label="Governance" 
                active={activeTab === 'governance'} 
                onClick={() => setActiveTab('governance')} 
              />
            </div>
          </div>
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold">
              {user.displayName?.[0] || user.email?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">{user.displayName}</p>
              <p className="text-xs text-slate-500 truncate">{profile?.role}</p>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50" onClick={handleLogout}>
            <LogOut size={18} className="mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm z-10">
          <h2 className="text-lg font-semibold text-slate-800 capitalize">
            {activeTab}
          </h2>
          <div className="flex items-center gap-4">
            {activeTab === 'leads' && !isDesign && (
              <>
                <Button variant="outline" onClick={() => setShowBulkUpload(true)}>
                  <Upload size={18} className="mr-2" />
                  Bulk Upload
                </Button>
                <Button onClick={() => setShowLeadForm(true)} className="shadow-sm">
                  <Plus size={18} className="mr-2" />
                  New Lead
                </Button>
              </>
            )}
          </div>
        </header>

        <ScrollArea className="flex-1 p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {(activeTab === 'leads' || activeTab === 'tasks') && (
              <LeadFilters 
                leadSearch={leadSearch}
                setLeadSearch={setLeadSearch}
                leadViewMode={leadViewMode}
                setLeadViewMode={setLeadViewMode}
                selectedCustomerFilter={selectedCustomerFilter}
                setSelectedCustomerFilter={setSelectedCustomerFilter}
                industryFilter={industryFilter}
                setIndustryFilter={setIndustryFilter}
                customerTypeFilter={customerTypeFilter}
                setCustomerTypeFilter={setCustomerTypeFilter}
                stageFilter={stageFilter}
                setStageFilter={setStageFilter}
                priorityFilter={priorityFilter}
                setPriorityFilter={setPriorityFilter}
                customers={customers}
                showViewToggle={activeTab === 'leads'}
              />
            )}

            {activeTab === 'dashboard' && <CEODashboard leads={leads} tasks={tasks} quotes={quotes} salesOrders={salesOrders} invoices={invoices} targets={targets} forecasts={forecasts} approvals={approvals} debtors={debtors} />}
            {activeTab === 'orders' && <OrderManagement orders={salesOrders} customers={customers} onAdd={() => {}} onEdit={() => {}} />}
            {activeTab === 'finance' && <FinanceManagement invoices={invoices} targets={targets} forecasts={forecasts} debtors={debtors} onAddInvoice={() => {}} onUpdateTarget={setTarget} onUpdateForecast={saveForecast} />}
            {activeTab === 'governance' && (
              <GovernanceManagement 
                approvals={approvals} 
                team={team} 
                isAdmin={isAdmin} 
                onUpdateApproval={updateApproval} 
                onUpdateUser={updateUserProfile} 
                onDeleteUser={deleteUserProfile} 
                onAdminCreateUser={adminCreateUser}
                onSetTarget={setTarget}
                leads={leads} 
                tasks={tasks} 
                targets={targets}
                customers={customers}
                parts={parts}
                onNavigate={(tab) => setActiveTab(tab)}
              />
            )}
            
            {activeTab === 'leads' && (
              isViewingLead && selectedLeadId ? (
                <LeadDetail 
                  lead={leads.find(l => l.id === selectedLeadId)!}
                  tasks={tasks}
                  designReviews={designReviews}
                  quotes={quotes}
                  complaints={complaints}
                  customers={customers}
                  parts={parts}
                  technicalTemplates={technicalTemplates}
                  feasibilityForms={feasibilityForms}
                  userProfile={profile}
                  team={team}
                  onAddFeasibility={addFeasibilityForm}
                  onUpdateFeasibility={updateFeasibilityForm}
                  onUpdateLead={updateLead}
                  onBack={() => setIsViewingLead(false)}
                  onEdit={() => setShowLeadForm(true)}
                />
              ) : (
                <div className="space-y-6">
                  {leadViewMode === 'list' ? (
                    <LeadList 
                      leads={filteredLeads} 
                      tasks={tasks} 
                      onEdit={(id) => { setSelectedLeadId(id); setShowLeadForm(true); }} 
                      onView={(id) => { setSelectedLeadId(id); setIsViewingLead(true); }}
                      onSendToDesign={(lead) => { setSelectedLeadForDesign(lead); setShowDesignForm(true); }}
                      onCreateQuote={(lead) => {
                        setSelectedQuote({
                          leadId: lead.id,
                          customerId: lead.customerId || '',
                          customerName: lead.customerName,
                          contactPerson: lead.contactPerson,
                          items: [],
                          taxRate: 18,
                          standardTerms: [],
                          status: 'Draft'
                        });
                        setShowQuoteForm(true);
                      }}
                      onCreateComplaint={(lead) => {
                        setSelectedComplaint({
                          customerId: lead.customerId || '',
                          customerName: lead.customerName,
                          status: 'Open',
                          complaintDate: Timestamp.now(),
                          complaintSource: 'Email',
                          complaintType: 'Quality',
                          severity: 'Minor',
                          complaintId: `CMP-${Date.now().toString().slice(-6)}`
                        });
                        setShowComplaintForm(true);
                      }}
                    />
                  ) : (
                    <KanbanBoard 
                      leads={filteredLeads} 
                      onEdit={(id) => { setSelectedLeadId(id); setShowLeadForm(true); }}
                      onView={(id) => { setSelectedLeadId(id); setIsViewingLead(true); }}
                    />
                  )}
                </div>
              )
            )}
            {activeTab === 'masters' && (
              <Tabs defaultValue="customers" className="space-y-6">
                <TabsList className="bg-white p-1 shadow-sm border border-slate-200 flex flex-wrap gap-1 h-auto">
                  <TabsTrigger value="customers" className="gap-2">
                    <Building2 size={16} />
                    Customers
                  </TabsTrigger>
                  <TabsTrigger value="parts" className="gap-2">
                    <CheckCircle2 size={16} />
                    Parts
                  </TabsTrigger>
                  <TabsTrigger value="templates" className="gap-2">
                    <Settings2 size={16} />
                    Technical Templates
                  </TabsTrigger>
                  <TabsTrigger value="employees" className="gap-2">
                   <Users size={16} />
                   Employees
                  </TabsTrigger>
                  <TabsTrigger value="departments" className="gap-2">
                   <Building2 size={16} />
                   Departments
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="customers">
                  <CustomerList 
                    customers={customers} 
                    userRole={profile?.role}
                    onCreateQuote={(customer) => {
                      setSelectedQuote({
                        leadId: '',
                        customerId: customer.id,
                        customerName: customer.name,
                        contactPerson: customer.contactPersons?.[0]?.name || '',
                        items: [],
                        taxRate: 18,
                        standardTerms: [],
                        status: 'Draft'
                      });
                      setShowQuoteForm(true);
                    }}
                    onCreateComplaint={(customer) => {
                      setSelectedComplaint({
                        customerId: customer.id,
                        customerName: customer.name,
                        status: 'Open',
                        complaintDate: Timestamp.now(),
                        complaintSource: 'Email',
                        complaintType: 'Quality',
                        severity: 'Minor',
                        complaintId: `CMP-${Date.now().toString().slice(-6)}`
                      });
                      setShowComplaintForm(true);
                    }}
                  />
                </TabsContent>
                <TabsContent value="parts">
                  <PartList parts={parts} />
                </TabsContent>
                <TabsContent value="templates" className="animate-in fade-in duration-300">
                   {showTemplateForm ? (
                     <TechnicalTemplateForm 
                       initialData={selectedTemplate}
                       onSubmit={selectedTemplate ? (data) => updateTechnicalTemplate(selectedTemplate.id, data) : addTechnicalTemplate}
                       onCancel={() => { setShowTemplateForm(false); setSelectedTemplate(null); }}
                     />
                   ) : (
                     <TechnicalTemplateList 
                       templates={technicalTemplates}
                       onAdd={() => setShowTemplateForm(true)}
                       onEdit={(t) => { setSelectedTemplate(t); setShowTemplateForm(true); }}
                       onDelete={deleteTechnicalTemplate}
                     />
                   )}
                </TabsContent>
                <TabsContent value="employees">
                  <EmployeeList 
                    employees={employees}
                    departments={departments}
                    onAdd={addEmployee}
                    onUpdate={updateEmployee}
                    onDelete={deleteEmployee}
                  />
                </TabsContent>
                <TabsContent value="departments">
                  <DepartmentList 
                    departments={departments}
                    onAdd={addDepartment}
                    onUpdate={updateDepartment}
                    onDelete={deleteDepartment}
                  />
                </TabsContent>
              </Tabs>
            )}
            {activeTab === 'tasks' && <TaskBoard leads={filteredLeads} />}
            {activeTab === 'debtors' && <DebtorsList debtors={debtors} />}
            {activeTab === 'reports' && <Reports leads={leads} tasks={tasks} debtors={debtors} designReviews={designReviews} team={team} />}
            {activeTab === 'design' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-6">
                    <FeasibilityFormList 
                      forms={feasibilityForms} 
                      onView={(form) => {
                        setSelectedFeasibilityForm(form);
                        setIsReviewingFeasibility(true);
                      }} 
                    />
                    <DesignReviewList reviews={designReviews} />
                  </div>
                  <div className="space-y-6">
                    <DesignEmailProcessor />
                  </div>
                </div>
              </div>
            )}
            {activeTab === 'email' && <EmailIntegration />}
            {activeTab === 'quotes' && (
              <QuoteList
                quotes={quotes}
                onAdd={() => { setSelectedQuote(null); setShowQuoteForm(true); }}
                onEdit={(q) => { setSelectedQuote(q); setShowQuoteForm(true); }}
                onPrint={(q) => setPrintingQuote(q)}
                onDelete={deleteQuote}
              />
            )}
            {activeTab === 'complaints' && (
              isViewingComplaint && selectedComplaint ? (
                <ComplaintDetails 
                  complaint={selectedComplaint}
                  employees={employees}
                  onUpdate={updateComplaint}
                  onBack={() => { setIsViewingComplaint(false); setSelectedComplaint(null); }}
                />
              ) : (
                <ComplaintList 
                  complaints={complaints}
                  onView={(c) => { setSelectedComplaint(c); setIsViewingComplaint(true); }}
                  onDelete={deleteComplaint}
                  onAdd={() => setShowComplaintForm(true)}
                />
              )
            )}
            {activeTab === 'employees' && (
              <EmployeeList
                employees={employees}
                departments={departments}
                onAdd={addEmployee}
                onUpdate={updateEmployee}
                onDelete={deleteEmployee}
              />
            )}
            {activeTab === 'departments' && (
              <DepartmentList
                departments={departments}
                onAdd={addDepartment}
                onUpdate={updateDepartment}
                onDelete={deleteDepartment}
              />
            )}
            {activeTab === 'admin' && isAdmin && (
              <AdminPanel 
                users={team} 
                leads={leads}
                tasks={tasks}
                targets={targets}
                customers={customers}
                parts={parts}
                onUpdateUser={updateUserProfile} 
                onDeleteUser={deleteUserProfile}
                onAdminCreateUser={adminCreateUser}
                onSetTarget={setTarget}
              />
            )}
          </div>
        </ScrollArea>

        {showLeadForm && (
          <LeadForm 
            leadId={selectedLeadId} 
            onClose={() => { setShowLeadForm(false); setSelectedLeadId(null); }} 
          />
        )}

        {showBulkUpload && (
          <BulkUpload onClose={() => setShowBulkUpload(false)} />
        )}

        {showDesignForm && selectedLeadForDesign && (
          <DesignReviewForm lead={selectedLeadForDesign} onClose={() => setShowDesignForm(false)} />
        )}

        {showQuoteForm && (
          <QuoteForm
            quote={selectedQuote}
            leads={leads}
            customers={customers}
            parts={parts}
            profile={profile}
            onClose={() => setShowQuoteForm(false)}
            onSubmit={async (data) => {
              if (selectedQuote) {
                await updateQuote(selectedQuote.id, data);
              } else {
                await addQuote(data);
              }
            }}
          />
        )}

        {printingQuote && (
          <QuotePrint
            quote={printingQuote}
            onClose={() => setPrintingQuote(null)}
          />
        )}

        {showComplaintForm && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-4xl max-h-[90vh] overflow-auto">
              <ComplaintForm 
                customers={customers}
                employees={employees}
                parts={parts}
                onSubmit={addComplaint}
                onCancel={() => setShowComplaintForm(false)}
              />
            </div>
          </div>
        )}

        {isReviewingFeasibility && selectedFeasibilityForm && (
          <Dialog open onOpenChange={(open) => {
            if (!open) {
              setIsReviewingFeasibility(false);
              setSelectedFeasibilityForm(null);
            }
          }}>
            <DialogContent className="max-w-5xl max-h-[95vh] overflow-auto p-0 border-none shadow-2xl">
              <DialogHeader className="sr-only">
                <DialogTitle>Feasibility Review</DialogTitle>
              </DialogHeader>
              <FeasibilityReviewDetails 
                form={selectedFeasibilityForm}
                userProfile={profile}
                onUpdate={async (id, updates) => {
                  const updatedId = await updateFeasibilityForm(id, updates);
                  return updatedId;
                }}
              />
            </DialogContent>
          </Dialog>
        )}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
        active 
          ? 'bg-primary text-white shadow-md' 
          : 'text-slate-600 hover:bg-slate-100'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
