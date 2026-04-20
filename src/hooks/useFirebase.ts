import { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  getDoc,
  where,
  getDocFromServer,
  limit
} from 'firebase/firestore';
import { onAuthStateChanged, User, signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import { toast } from 'sonner';

// Services
import { leadService } from '../services/leadService';
import { feasibilityService } from '../services/feasibilityService';
import { quoteService } from '../services/quoteService';
import { userService } from '../services/userService';
import { taskService } from '../services/taskService';
import { customerService } from '../services/customerService';
import { complaintService } from '../services/complaintService';
import { designService } from '../services/designService';
import { masterDataService } from '../services/masterDataService';
import { orderService } from '../services/orderService';
import { financeService } from '../services/financeService';
import { governanceService } from '../services/governanceService';
import { Lead, Task, UserProfile, Customer, Part, Debtor, DesignReview, Employee, Department, Quote, QuoteItem, Complaint, TechnicalTemplate, FeasibilityForm, FeasibilityHistoryEntry, CustomerType, TaskPriority, SalesOrder, Invoice, MonthlyTarget, Forecast, ApprovalRequest } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: any, operationType: OperationType, path: string | null) {
  const message = error instanceof Error ? error.message : String(error);
  const isPermissionError = message.toLowerCase().includes('permission-denied') || 
                            message.toLowerCase().includes('missing or insufficient permissions');
  
  const errInfo: FirestoreErrorInfo = {
    error: message,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  
  console.error('Firestore Error Detailed: ', JSON.stringify(errInfo));
  
  if (isPermissionError) {
    throw new Error('Permission denied. Contact admin');
  }
  
  throw new Error(message);
}

export function useFirebase() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [team, setTeam] = useState<UserProfile[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [designReviews, setDesignReviews] = useState<DesignReview[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [technicalTemplates, setTechnicalTemplates] = useState<TechnicalTemplate[]>([]);
  const [feasibilityForms, setFeasibilityForms] = useState<FeasibilityForm[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [targets, setTargets] = useState<MonthlyTarget[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (u) {
        try {
          // Test connection
          await getDocFromServer(doc(db, 'test', 'connection')).catch(() => {});
          
          const profileDoc = await getDoc(doc(db, 'users', u.uid));
          if (profileDoc.exists()) {
            const profileData = profileDoc.data() as UserProfile;
            
            // USER STATUS CONTROL: Block if isActive is false
            if (profileData.isActive === false) {
              toast.error("Account deactivated. Please contact administrator.");
              await signOut(auth);
              setUser(null);
              setProfile(null);
              setLoading(false);
              return;
            }
            
            setProfile(profileData);
            setUser(u);
          } else {
            // Check if this is the designated admin email
            if (u.email === 'ghorpadeshaileshgs@gmail.com') {
              console.log("Admin email detected, allowing session even without profile (auto-create pending)");
              setProfile({
                uid: u.uid,
                email: u.email,
                displayName: u.displayName || 'Admin User',
                role: 'Admin',
                isActive: true
              });
              setUser(u);
              // Trigger server-side creation
              fetch('/api/admin/promote-shailesh').catch(console.error);
            } else {
              // IF user does NOT exist: logout user and show message
              toast.error("Unauthorized user. Contact administrator.");
              await signOut(auth);
              setUser(null);
              setProfile(null);
              setLoading(false);
              return;
            }
          }
        } catch (error) {
          console.error("Auth initialization error:", error);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user || !profile) return;
    
    // DEPARTMENT FILTERING & OWNERSHIP
    // Simplified for task linking
    const leadQuery = query(collection(db, 'leads'), orderBy('createdAt', 'desc'), limit(100));

    const unsubscribeLeads = onSnapshot(
      leadQuery, 
      (snapshot) => {
        const leadData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Lead));
        setLeads(leadData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'leads')
    );

    // Design → see assigned feasibility
    let feasibilityQuery = query(collection(db, 'feasibility_forms'), orderBy('createdAt', 'desc'), limit(50));
    if (profile.role === 'Design') {
      feasibilityQuery = query(
        collection(db, 'feasibility_forms'), 
        where('assignedToId', '==', profile.uid),
        orderBy('createdAt', 'desc'), 
        limit(50)
      );
    }

    const unsubscribeFeasibility = onSnapshot(
      feasibilityQuery,
      (snapshot) => {
        const formData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as FeasibilityForm));
        setFeasibilityForms(formData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'feasibility_forms')
    );

    const unsubscribeTasks = onSnapshot(
      query(collection(db, 'tasks'), orderBy('nextActionDate', 'asc'), limit(50)), 
      (snapshot) => {
        const taskData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Task));
        setTasks(taskData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'tasks')
    );

    const unsubscribeTeam = onSnapshot(
      query(collection(db, 'users')), 
      (snapshot) => {
        const teamData = snapshot.docs.map(doc => doc.data() as UserProfile);
        // Fallback: If no users have isActive: true explicitly, just show all for selection
        const activeTeam = teamData.filter(u => u.isActive !== false);
        setTeam(activeTeam);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'users')
    );

    const unsubscribeCustomers = onSnapshot(
      query(collection(db, 'customers'), orderBy('createdAt', 'desc')), 
      (snapshot) => {
        const customerData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Customer));
        setCustomers(customerData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'customers')
    );

    const unsubscribeParts = onSnapshot(
      query(collection(db, 'parts'), orderBy('createdAt', 'desc')), 
      (snapshot) => {
        const partData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Part));
        setParts(partData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'parts')
    );

    const unsubscribeDebtors = onSnapshot(
      query(collection(db, 'debtors'), orderBy('dueDate', 'asc')), 
      (snapshot) => {
        const debtorData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Debtor));
        setDebtors(debtorData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'debtors')
    );

    const unsubscribeDesignReviews = onSnapshot(
      query(collection(db, 'design_reviews'), orderBy('requestDate', 'desc')), 
      (snapshot) => {
        const designReviewData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as DesignReview));
        setDesignReviews(designReviewData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'design_reviews')
    );

    const unsubscribeEmployees = onSnapshot(
      query(collection(db, 'employees'), where('status', '==', 'Active'), orderBy('employeeId', 'asc')), 
      (snapshot) => {
        const employeeData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Employee));
        setEmployees(employeeData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'employees')
    );

    const unsubscribeDepartments = onSnapshot(
      query(collection(db, 'departments'), orderBy('name', 'asc')), 
      (snapshot) => {
        const departmentData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Department));
        setDepartments(departmentData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'departments')
    );

    const unsubscribeQuotes = onSnapshot(
      query(collection(db, 'quotes'), orderBy('createdAt', 'desc')), 
      (snapshot) => {
        const quoteData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Quote));
        setQuotes(quoteData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'quotes')
    );

    const unsubscribeComplaints = onSnapshot(
      query(collection(db, 'complaints'), orderBy('createdAt', 'desc'), limit(20)), 
      (snapshot) => {
        const complaintData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Complaint));
        setComplaints(complaintData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'complaints')
    );

    const unsubscribeTemplates = onSnapshot(
      query(collection(db, 'technical_templates'), orderBy('category', 'asc')),
      (snapshot) => {
        const templateData = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as TechnicalTemplate));
        setTechnicalTemplates(templateData);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'technical_templates')
    );

    const unsubscribeSalesOrders = onSnapshot(
      query(collection(db, 'sales_orders'), orderBy('soDate', 'desc')),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as SalesOrder));
        setSalesOrders(data);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'sales_orders')
    );

    const unsubscribeInvoices = onSnapshot(
      query(collection(db, 'invoices'), orderBy('invoiceDate', 'desc')),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Invoice));
        setInvoices(data);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'invoices')
    );

    const unsubscribeTargets = onSnapshot(
      query(collection(db, 'targets')),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as MonthlyTarget));
        setTargets(data);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'targets')
    );

    const unsubscribeForecasts = onSnapshot(
      query(collection(db, 'forecasts')),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Forecast));
        setForecasts(data);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'forecasts')
    );

    const unsubscribeApprovals = onSnapshot(
      query(collection(db, 'approvals'), orderBy('createdAt', 'desc')),
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as ApprovalRequest));
        setApprovals(data);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'approvals')
    );

    return () => {
      unsubscribeLeads();
      unsubscribeTasks();
      unsubscribeTeam();
      unsubscribeCustomers();
      unsubscribeParts();
      unsubscribeDebtors();
      unsubscribeDesignReviews();
      unsubscribeEmployees();
      unsubscribeDepartments();
      unsubscribeQuotes();
      unsubscribeComplaints();
      unsubscribeTemplates();
      unsubscribeFeasibility();
      unsubscribeSalesOrders();
      unsubscribeInvoices();
      unsubscribeTargets();
      unsubscribeForecasts();
      unsubscribeApprovals();
    };
  }, [user, profile]);

  const updateUserProfile = async (uid: string, updates: Partial<UserProfile>) => {
    return userService.updateUserProfile(uid, updates);
  };

  const deleteUserProfile = async (uid: string) => {
    return userService.deleteUserProfile(uid);
  };

  const adminCreateUser = async (userData: any) => {
    return userService.adminCreateUser(userData);
  };

  const addLead = async (lead: Omit<Lead, 'id' | 'createdAt'>) => {
    if (!user) {
      toast.error("Authentication required");
      return;
    }
    try {
      return await leadService.addLead(lead, team, user);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'leads');
    }
  };

  const updateLead = async (id: string, updates: Partial<Lead>) => {
    if (!user) {
      toast.error("Authentication required");
      return;
    }
    try {
      return await leadService.updateLead(id, updates, user);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `leads/${id}`);
    }
  };

  const addTask = async (task: Omit<Task, 'id'>) => {
    if (!user) {
      toast.error("Authentication required");
      return;
    }
    try {
      return await taskService.addTask(task, user);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'tasks');
    }
  };

  const addCustomer = async (customer: Omit<Customer, 'id' | 'createdAt'>) => {
    try {
      return await customerService.addCustomer(customer, customers, user);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'customers');
    }
  };

  const updateCustomer = async (id: string, updates: Partial<Customer>) => {
    try {
      return await customerService.updateCustomer(id, updates, user);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `customers/${id}`);
    }
  };

  const deleteCustomer = async (id: string) => {
    try {
      return await customerService.deleteCustomer(id);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `customers/${id}`);
    }
  };

  const addPart = async (part: Omit<Part, 'id' | 'createdAt'>) => {
    return masterDataService.addPart(part, user);
  };

  const addDebtor = async (debtor: Omit<Debtor, 'id' | 'createdAt' | 'createdBy' | 'createdById'>) => {
    return masterDataService.addDebtor(debtor, user);
  };

  const updateDebtor = async (id: string, updates: Partial<Debtor>) => {
    return masterDataService.updateDebtor(id, updates, user);
  };

  const addDesignReview = async (review: Omit<DesignReview, 'id' | 'createdAt' | 'createdBy' | 'createdById'>) => {
    return designService.addDesignReview(review, user);
  };

  const updateDesignReview = async (id: string, updates: Partial<DesignReview>) => {
    return designService.updateDesignReview(id, updates, user);
  };

  const createUserProfile = async (profile: UserProfile) => {
    return userService.createUserProfile(profile);
  };

  const addEmployee = async (employee: Omit<Employee, 'id' | 'createdAt'>) => {
    return masterDataService.addEmployee(employee, user);
  };

  const updateEmployee = async (id: string, employee: Partial<Employee>) => {
    return masterDataService.updateEmployee(id, employee, user);
  };

  const deleteEmployee = async (id: string) => {
    return masterDataService.deleteEmployee(id);
  };

  const addDepartment = async (department: Omit<Department, 'id' | 'createdAt'>) => {
    return masterDataService.addDepartment(department, user);
  };

  const updateDepartment = async (id: string, department: Partial<Department>) => {
    return masterDataService.updateDepartment(id, department, user);
  };

  const deleteDepartment = async (id: string) => {
    return masterDataService.deleteDepartment(id);
  };

  const addQuote = async (quote: Omit<Quote, 'id' | 'createdAt'>) => {
    return quoteService.addQuote(quote, user);
  };

  const updateQuote = async (id: string, quote: Partial<Quote>) => {
    return quoteService.updateQuote(id, quote, user);
  };

  const deleteQuote = async (id: string) => {
    return quoteService.deleteQuote(id);
  };

  const addComplaint = async (complaint: Omit<Complaint, 'id' | 'createdAt'>) => {
    return complaintService.addComplaint(complaint, user);
  };

  const updateComplaint = async (id: string, updates: Partial<Complaint>) => {
    return complaintService.updateComplaint(id, updates, user);
  };

  const deleteComplaint = async (id: string) => {
    return complaintService.deleteComplaint(id);
  };

  const addTechnicalTemplate = async (template: Omit<TechnicalTemplate, 'id' | 'createdAt'>) => {
    return masterDataService.addTechnicalTemplate(template, user);
  };

  const updateTechnicalTemplate = async (id: string, updates: Partial<TechnicalTemplate>) => {
    return masterDataService.updateTechnicalTemplate(id, updates, user);
  };

  const deleteTechnicalTemplate = async (id: string) => {
    return masterDataService.deleteTechnicalTemplate(id);
  };

  const addFeasibilityForm = async (formData: Omit<FeasibilityForm, 'id' | 'createdAt'>) => {
    const leadName = leads.find(l => l.id === formData.leadId)?.customerName || 'Unknown';
    return feasibilityService.addFeasibilityForm(formData, leadName, user);
  };

  const updateFeasibilityForm = async (id: string, updates: Partial<FeasibilityForm>) => {
    return feasibilityService.updateFeasibilityForm(id, updates, user);
  };

  const addSalesOrder = async (order: Omit<SalesOrder, 'id' | 'createdAt'>) => {
    return orderService.addSalesOrder(order as any, user);
  };

  const updateSalesOrder = async (id: string, updates: Partial<SalesOrder>) => {
    return orderService.updateSalesOrder(id, updates, user);
  };

  const addInvoice = async (invoice: Omit<Invoice, 'id' | 'createdAt'>) => {
    return financeService.addInvoice(invoice as any, user);
  };

  const updateInvoice = async (id: string, updates: Partial<Invoice>) => {
    return financeService.updateInvoice(id, updates, user);
  };

  const setTarget = async (target: Omit<MonthlyTarget, 'id' | 'createdAt'>) => {
    return financeService.setTarget(target as any, user);
  };

  const saveForecast = async (forecast: Omit<Forecast, 'id' | 'createdAt'>) => {
    return financeService.saveForecast(forecast as any, user);
  };

  const requestApproval = async (approval: Omit<ApprovalRequest, 'id' | 'createdAt'>) => {
    return governanceService.requestApproval(approval as any, user);
  };

  const updateApproval = async (id: string, updates: Partial<ApprovalRequest>) => {
    return governanceService.updateApproval(id, updates, user);
  };

  return { 
    user, 
    profile, 
    leads, 
    tasks, 
    team, 
    customers, 
    parts, 
    debtors, 
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
    addLead, 
    updateLead, 
    addTask,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    addPart,
    addDebtor,
    updateDebtor,
    addDesignReview,
    updateDesignReview,
    createUserProfile,
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
    addTechnicalTemplate,
    updateTechnicalTemplate,
    deleteTechnicalTemplate,
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
    updateUserProfile,
    deleteUserProfile,
    adminCreateUser
  };
}
