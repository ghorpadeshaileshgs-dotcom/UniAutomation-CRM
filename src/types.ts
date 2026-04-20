import { Timestamp } from 'firebase/firestore';

export type Industry = 'Defence' | 'Locomotive' | 'Industrial' | 'Automobile' | 'Other';
export type Region = 'Domestic' | 'Export';
export type LeadStage = 
  | 'Lead' 
  | 'Qualified' 
  | 'Requirement Understanding' 
  | 'Techno-Commercial Offer' 
  | 'Quoted' 
  | 'Follow-up' 
  | 'Negotiation' 
  | 'PO Expected' 
  | 'PO Received' 
  | 'Closed Won' 
  | 'Closed Lost';

export type LeadSource = 'Email' | 'Call' | 'Visit' | 'Reference';

export type ProductCategory = 'Standard' | 'New Development' | 'Variant';
export type FeasibilityStatus = 'Pending' | 'Feasible' | 'Not Feasible' | 'Feasible with Modification' | 'Need More Details';

export type CustomerType = 'OEM' | 'End User' | 'Project' | 'Design House';
export type PartCategory = 'Sensors' | 'Assemblies' | 'Systems' | 'Automated Test Equipment' | 'Other';
export type QuoteFormat = 'Basic' | 'Standard' | 'Special';
export type QuoteStatus = 'Draft' | 'Sent' | 'Revised' | 'Accepted' | 'Rejected';

export interface ContactPerson {
  name: string;
  email: string;
  phone: string;
}

export interface AuditFields {
  createdBy?: string;
  createdById?: string;
  createdAt?: Timestamp;
  updatedBy?: string;
  updatedById?: string;
  updatedAt?: Timestamp;
}

export interface StageHistoryEntry {
  date: Timestamp;
  from: LeadStage;
  to: LeadStage;
  updatedBy: string;
  updatedById: string;
}

export interface Lead extends AuditFields {
  id: string;
  customerId: string; // Mandatory
  customerName: string;
  customerType: CustomerType;
  partId: string; // Mandatory
  partName: string;
  contactPerson: string;
  industry: Industry;
  region: Region;
  productType: string;
  productCategory: ProductCategory;
  partCategory?: PartCategory;
  partSubCategory?: string;
  stage: LeadStage;
  salespersonName: string;
  salespersonId: string;
  source: LeadSource;
  estimatedValue: number;
  probability: number;
  priority: TaskPriority;
  quoteCreated: boolean;
  quoteValue?: number;
  quoteDate?: Timestamp;
  poReceived: boolean;
  poNumber?: string;
  poValue?: number;
  poDate?: Timestamp;
  feasibilityStatus?: FeasibilityStatus;
  lostReason?: string;
  requirementDetails?: string;
  quote?: QuoteContainer;
  history?: StageHistoryEntry[];
}

export interface QuoteRevision {
  revisionNo: number;
  quoteDate: Timestamp;
  validUntil: Timestamp;
  items: QuoteItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  format: QuoteFormat;
  status: QuoteStatus;
  standardTerms: string[];
  specialTerms?: string;
  complianceDetails?: string; // For 'Special' format
  technicalSpecs?: string; // For 'Standard' and 'Special'
  linkedFeasibilityId?: string;
  linkedFeasibilityParams?: FeasibilityParameter[];
  createdBy: string;
  createdById: string;
  createdAt: Timestamp;
}

export interface QuoteContainer {
  revisions: QuoteRevision[];
  latestRevision?: QuoteRevision;
}

export type DesignReviewStatus = 'Pending' | 'In Review' | 'Completed' | 'Delayed';

export interface DesignReview extends AuditFields {
  id: string;
  leadId: string;
  customerName: string;
  requestedBy: string;
  requestedById: string;
  assignedTo: string;
  assignedToId: string;
  requestDate: Timestamp;
  requirementSummary: string;
  attachments?: string[];
  feasibilityStatus: FeasibilityStatus;
  status: DesignReviewStatus;
  slaDays: number;
  isDelayed: boolean;
  responseDate?: Timestamp;
  responseRemarks?: string;
  turnaroundTime?: number; // in hours or days
}

export interface Department extends AuditFields {
  id: string;
  name: string;
  description?: string;
}

export interface Employee extends AuditFields {
  id: string;
  employeeId: string;
  name: string;
  email: string;
  phone?: string;
  departmentId: string;
  departmentName: string;
  designation: string;
  role: 'Admin' | 'Sales' | 'BDM' | 'Sales Support' | 'Design' | 'Other';
  status: 'Active' | 'Inactive';
  joiningDate?: Timestamp;
}

export interface QuoteItem {
  partId?: string;
  partNumber?: string;
  partName?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Quote extends AuditFields {
  id: string;
  quoteNumber: string;
  leadId: string;
  customerId: string;
  customerName: string;
  contactPerson: string;
  date: Timestamp;
  validUntil: Timestamp;
  items: QuoteItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  standardTerms: string[];
  specialTerms?: string;
  status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected' | 'Expired';
}

export type ActivityType = 'Call' | 'Visit' | 'Email' | 'Customer Query' | 'Internal Coordination' | 'Payment Follow-up' | 'Technical Support';
export type TaskStatus = 'Pending Approval' | 'Authorized' | 'Completed';
export type TaskCategory = 'Lead' | 'Customer' | 'General';
export type TaskPriority = 'High' | 'Medium' | 'Low';

export interface Task extends AuditFields {
  id: string;
  relatedTo: TaskCategory;
  leadId?: string;
  leadName?: string;
  customerId?: string;
  customerName?: string; // For quick display
  date: Timestamp;
  type: ActivityType;
  priority: TaskPriority;
  departmentTag?: string;
  summary: string;
  nextAction: string;
  nextActionDate: Timestamp;
  owner: string;
  ownerId: string;
  assignedTo?: string; // employeeId
  assignedToName?: string;
  assignedToEmail?: string;
  status: TaskStatus;
  authorizedBy?: string;
  authorizedAt?: Timestamp;
}

export type UserRole = 'Admin' | 'Sales' | 'BDM' | 'Sales Support' | 'Design' | 'Quality' | 'Accounts';

export interface UserProfile {
  uid: string;
  email: string;
  name?: string;
  displayName: string;
  role: UserRole;
  department?: string;
  isActive: boolean;
  assignedIndustry?: Industry;
  reportingManager?: string; // UID of reporting manager
}

export interface Customer extends AuditFields {
  id: string;
  customerId: string;
  name: string;
  industry: Industry;
  customerType: CustomerType;
  region: Region;
  contactPersons: ContactPerson[];
  address: string;
  gstNumber?: string;
  defaultQuoteFormat?: QuoteFormat;
}

export interface Part extends AuditFields {
  id: string;
  partId: string;
  partName: string;
  category: PartCategory;
  subCategory: string;
  technology?: string;
  standard: boolean;
  description?: string;
  unit: string;
}

export interface Debtor extends AuditFields {
  id: string;
  customerName: string;
  invoiceNumber: string;
  invoiceDate: Timestamp;
  amount: number;
  dueDate: Timestamp;
  status: 'Pending' | 'Paid' | 'Overdue';
  salespersonName: string;
  salespersonId: string;
  lastFollowUp?: Timestamp;
  nextFollowUp?: Timestamp;
}

export type ComplaintSource = 'Email' | 'Call' | 'Visit';
export type ComplaintType = 'Quality' | 'Functional Failure' | 'Fitment' | 'Delivery' | 'Documentation';
export type ComplaintSeverity = 'Critical' | 'Major' | 'Minor';
export type ComplaintStatus = 'Open' | 'Under Investigation' | 'Action Implemented' | 'Closed';

export interface Complaint extends AuditFields {
  id: string;
  complaintId: string;
  customerName: string;
  customerId?: string;
  leadId?: string; // Link to lead
  projectId?: string; // SO Number
  productType: string;
  complaintDate: Timestamp;
  complaintSource: ComplaintSource;
  complaintType: ComplaintType;
  severity: ComplaintSeverity;
  description: string;
  assignedTo: string;
  assignedToId?: string;
  status: ComplaintStatus;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  responseDate?: Timestamp;
  closureDate?: Timestamp;
  turnaroundTime?: number; // in days
}

export interface TechnicalParameter {
  name: string;
  label: string;
  type: 'select' | 'text' | 'number';
  options?: string[];
  required?: boolean;
}

export interface TechnicalTemplate extends AuditFields {
  id: string;
  category: PartCategory;
  subCategory: string;
  parameters: TechnicalParameter[];
}

export interface FeasibilityParameter {
  name: string;
  customerInput: string;
  designStatus?: 'Accepted' | 'Modify' | 'Not Possible';
  designSuggestion?: string;
  remark?: string;
}

export interface FeasibilityHistoryEntry {
  date: Timestamp;
  updatedBy: string;
  updatedById: string;
  status: string;
  remarks: string;
}

export interface FeasibilityForm extends AuditFields {
  id: string;
  leadId: string;
  templateId?: string;
  category: PartCategory;
  subCategory: string;
  parameters: FeasibilityParameter[];
  submittedBy: string;
  submittedById: string;
  assignedTo?: string;
  assignedToId?: string;
  status: 'Open' | 'Closed';
  overallStatus: 'Draft' | 'Pending' | 'Feasible' | 'Not Feasible' | 'Need More Details';
  designResponse?: string;
  revisionCount: number;
  history: FeasibilityHistoryEntry[];
  turnaroundTime?: number; // in hours
}

export interface SalesOrder extends AuditFields {
  id: string;
  leadId: string;
  soNumber: string;
  soDate: Timestamp;
  soValue: number;
  customerId: string;
  customerName: string;
  essRequired: boolean; // For Defence
  essStatus?: 'Pending' | 'Applied' | 'Received';
  status: 'Open' | 'Dispatched' | 'Partial' | 'Cancelled';
  deliveryDate?: Timestamp;
}

export interface Invoice extends AuditFields {
  id: string;
  soId: string;
  invoiceNumber: string;
  invoiceDate: Timestamp;
  amount: number;
  paymentReceived: number;
  balance: number;
  dueDate: Timestamp;
  status: 'Pending' | 'Paid' | 'Overdue';
  customerName: string;
  salespersonId: string;
}

export interface MonthlyTarget extends AuditFields {
  id: string;
  userId: string;
  userName: string;
  month: string; // MM
  year: string; // YYYY
  targetAmount: number;
  actualAmount: number;
  achievementPercentage: number;
}

export interface ForecastEntry {
  month: string; // YYYY-MM
  amount: number;
}

export interface Forecast extends AuditFields {
  id: string;
  userId: string;
  userName: string;
  forecasts: ForecastEntry[];
}

export interface ApprovalRequest extends AuditFields {
  id: string;
  type: 'Special Quote' | 'High Discount' | 'Non-Standard Part';
  relatedId: string; // LeadId or QuoteId
  requestedBy: string;
  requestedById: string;
  approverId: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  remarks?: string;
}

export interface Backup extends AuditFields {
  id: string;
  timestamp: Timestamp;
  status: 'Success' | 'Failure';
  type: 'Manual' | 'Scheduled';
  collectionsCount: number;
  totalRecords: number;
  fileName: string;
}

export interface SystemSettings extends AuditFields {
  id: string;
  defaultQuoteFormat: QuoteFormat;
  approvalThresholds: {
    discountLimit: number; // percentage
    nonStandardApprovalRequired: boolean;
  };
  emailSettings: {
    notifyAdminOnLead: boolean;
    notifySalesOnTarget: boolean;
  };
}
