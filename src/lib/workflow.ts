import { Lead, LeadStage, Task, DesignReview, Complaint, Quote } from '../types';
import { Timestamp } from 'firebase/firestore';

export const LEAD_STAGES: LeadStage[] = [
  'Lead',
  'Qualified',
  'Requirement Understanding',
  'Techno-Commercial Offer',
  'Quoted',
  'Follow-up',
  'Negotiation',
  'PO Expected',
  'PO Received',
  'Closed Won',
  'Closed Lost'
];

export interface WorkflowValidation {
  isValid: boolean;
  message?: string;
  missingFields: string[];
}

export function validateAction(lead: Lead, action: 'CHANGE_STAGE' | 'CREATE_QUOTE' | 'CREATE_PO', nextStage?: LeadStage, tasks?: Task[]): WorkflowValidation {
  const missingFields: string[] = [];
  
  // Rule 1: Technical Feasibility for Non-Standard Products
  if (lead.productCategory !== 'Standard') {
    const isFeasible = lead.feasibilityStatus === 'Feasible' || lead.feasibilityStatus === 'Feasible with Modification';
    
    // Block Stage Progression beyond Requirement Understanding
    if (action === 'CHANGE_STAGE' && nextStage) {
      const nextStageIndex = LEAD_STAGES.indexOf(nextStage);
      const thresholdIndex = LEAD_STAGES.indexOf('Techno-Commercial Offer');
      
      if (nextStageIndex >= thresholdIndex && !isFeasible) {
        return {
          isValid: false,
          message: `Stage change blocked. Technical Feasibility must be 'Feasible' for ${lead.productCategory} products. Current Status: ${lead.feasibilityStatus || 'Not Created'}`,
          missingFields: ['Technical Feasibility Approval']
        };
      }
    }

    // Block Quote Creation
    if (action === 'CREATE_QUOTE' && !isFeasible) {
      return {
        isValid: false,
        message: `Quotation blocked. Technical Feasibility is mandatory for ${lead.productCategory} products.`,
        missingFields: ['Technical Feasibility Approval']
      };
    }

    // Block PO Creation
    if (action === 'CREATE_PO' && !isFeasible) {
      return {
        isValid: false,
        message: `Purchase Order blocked. Technical Feasibility must be completed first.`,
        missingFields: ['Technical Feasibility Approval']
      };
    }
  }

  // Rule 2: Pending Tasks Block
  if (tasks) {
    const pendingTasks = tasks.filter(t => t.leadId === lead.id && t.status !== 'Completed');
    if (pendingTasks.length > 0 && action === 'CHANGE_STAGE' && nextStage) {
      const currentStageIndex = LEAD_STAGES.indexOf(lead.stage || 'Lead');
      const nextStageIndex = LEAD_STAGES.indexOf(nextStage);
      
      // Only block if moving forward
      if (nextStageIndex > currentStageIndex) {
        return {
          isValid: false,
          message: `Cannot move to next stage. There are ${pendingTasks.length} pending tasks for this lead.`,
          missingFields: pendingTasks.map(t => `Task: ${t.nextAction}`)
        };
      }
    }
  }

  return { isValid: true, missingFields: [] };
}

export function validateStageTransition(lead: Partial<Lead>, nextStage: LeadStage, tasks?: Task[]): WorkflowValidation {
  const missingFields: string[] = [];

  const currentStage = lead.stage || 'Lead';
  const currentStageIndex = LEAD_STAGES.indexOf(currentStage);
  const nextStageIndex = LEAD_STAGES.indexOf(nextStage);

  // 1. Strict Stage Flow Control: Prevent skipping stages forward
  // Moving backward is allowed. Moving forward must be sequential (next step only).
  // Exception: Closed Lost can be reached from any stage.
  const isTerminal = nextStage === 'Closed Lost';
  
  if (!isTerminal && nextStageIndex > currentStageIndex + 1) {
    return {
      isValid: false,
      message: `Strict Flow Control: You cannot skip stages. Please proceed sequentially from '${currentStage}'. The next allowed stage is '${LEAD_STAGES[currentStageIndex + 1]}'.`,
      missingFields: ['Sequential stage progression']
    };
  }

  // If going backwards or staying same, usually valid (logic continues for validation of current requirements)
  // but we skip most checks if moving backwards to improve UX
  if (nextStageIndex <= currentStageIndex && !isTerminal) {
    return { isValid: true, missingFields: [] };
  }

  // 2. Pending Tasks Check (New Enforcement)
  if (tasks && lead.id) {
    const pendingTasks = tasks.filter(t => t.leadId === lead.id && t.status !== 'Completed');
    if (pendingTasks.length > 0) {
      return {
        isValid: false,
        message: `Workflow Blocked: There are ${pendingTasks.length} pending tasks assigned to this lead. Please complete them before proceeding.`,
        missingFields: pendingTasks.map(t => `Pending Task: ${t.nextAction}`)
      };
    }
  }

  // 3. Requirement stage validation (Moving TO 'Requirement Understanding' or beyond)
  if (nextStageIndex >= LEAD_STAGES.indexOf('Requirement Understanding')) {
    if (!lead.contactPerson) missingFields.push('Contact Person');
    if (!lead.estimatedValue || lead.estimatedValue <= 0) missingFields.push('Estimated Value (>0)');
    if (!lead.requirementDetails || lead.requirementDetails.trim().length < 10) {
      missingFields.push('Detailed Requirement Brief (min 10 chars)');
    }
  }

  // 3. Feasibility stage validation (Moving TO 'Techno-Commercial Offer' or beyond)
  if (nextStageIndex >= LEAD_STAGES.indexOf('Techno-Commercial Offer')) {
    if (lead.productCategory !== 'Standard') {
      const status = lead.feasibilityStatus;
      if (status === 'Pending' || !status) {
        return {
          isValid: false,
          message: `Feasibility Pending: '${lead.productCategory}' products require a completed technical review before making a Techno-Commercial Offer.`,
          missingFields: ['Technical Feasibility Approval']
        };
      }
      if (status !== 'Feasible') {
        return {
          isValid: false,
          message: `Feasibility check mandatory. Current status is '${status}'. Only 'Feasible' products can proceed to price offer.`,
          missingFields: ['Technical Feasibility Approval']
        };
      }
    }
  }

  // 4. Quoted stage validation (Moving TO 'Quoted' or beyond)
  if (nextStageIndex >= LEAD_STAGES.indexOf('Quoted')) {
    if (!lead.quoteCreated) missingFields.push('Quotation creation');
    
    // Check if there is at least one quote revision that isn't a draft
    const hasSentQuote = lead.quote?.latestRevision && lead.quote.latestRevision.status !== 'Draft';
    if (!hasSentQuote && nextStageIndex > LEAD_STAGES.indexOf('Quoted')) {
      missingFields.push('Quotation must be Finalized and Sent');
    }
  }

  // 5. Negotiation stage validation
  if (nextStageIndex >= LEAD_STAGES.indexOf('Negotiation')) {
    const latestRevision = lead.quote?.latestRevision;
    if (!latestRevision || latestRevision.status === 'Draft') {
      missingFields.push('Sent Quotation');
    }
  }

  // 6. PO Received & Closed Won validation
  if (nextStageIndex >= LEAD_STAGES.indexOf('PO Received')) {
    if (!lead.poNumber) missingFields.push('PO Number');
    if (!lead.poValue) missingFields.push('PO Value');
    if (!lead.poDate) missingFields.push('PO Date');
  }

  if (nextStage === 'Closed Won') {
    if (!lead.poNumber) missingFields.push('PO Number');
    if (!lead.poReceived) missingFields.push('PO Received status');
  }

  if (nextStage === 'Closed Lost') {
    if (!lead.lostReason) missingFields.push('Lost Reason');
  }

  return {
    isValid: missingFields.length === 0,
    message: missingFields.length > 0 
      ? `Cannot move to '${nextStage}'. Missing: ${missingFields.join(', ')}`
      : undefined,
    missingFields
  };
}

export function getTurnaroundTime(startDate: Timestamp, endDate?: Timestamp): number {
  if (!endDate) return 0;
  const start = startDate.toDate().getTime();
  const end = endDate.toDate().getTime();
  const diffInMs = end - start;
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  return parseFloat(diffInDays.toFixed(2));
}

export function checkSLA(requestDate: Timestamp, slaDays: number): boolean {
  const request = requestDate.toDate().getTime();
  const now = Date.now();
  const diffInMs = now - request;
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);
  return diffInDays > slaDays;
}
