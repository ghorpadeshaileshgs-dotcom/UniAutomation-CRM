import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  Timestamp, 
  getDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { Lead, Task, DesignReview, UserProfile, CustomerType, TaskPriority, LeadStage } from '../types';
import { LEAD_STAGES } from '../lib/workflow';

const calculatePriority = (type: CustomerType): TaskPriority => {
  if (type === 'OEM' || type === 'Design House') return 'High';
  if (type === 'Project') return 'Medium';
  return 'Low';
};

export const leadService = {
  async addLead(lead: Omit<Lead, 'id' | 'createdAt' | 'createdById' | 'createdBy'>, team: UserProfile[], currentUser: any) {
    const priority = calculatePriority(lead.customerType);
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    const docRef = await addDoc(collection(db, 'leads'), {
      ...lead,
      priority,
      createdAt: now,
      createdById: userId,
      createdBy: userDisplayName,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName,
      history: [{
        date: now,
        from: 'Lead',
        to: lead.stage || 'Lead',
        updatedBy: userDisplayName,
        updatedById: userId
      }]
    });

    // Auto-create task for initial follow-up
    await addDoc(collection(db, 'tasks'), {
      relatedTo: 'Lead',
      leadId: docRef.id,
      leadName: lead.customerName,
      customerId: lead.customerId,
      customerName: lead.customerName,
      date: now,
      type: 'Internal Coordination',
      priority,
      summary: `Initial follow-up for new lead: ${lead.customerName}`,
      nextAction: 'Qualify lead and contact customer',
      nextActionDate: Timestamp.fromDate(new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)), // 2 days SLA
      owner: lead.salespersonName,
      ownerId: lead.salespersonId || 'system',
      status: 'Authorized',
      createdAt: now,
      createdById: userId,
      createdBy: userDisplayName
    });

    // Automate Design Review if category is New Development or Variant
    if (lead.productCategory === 'New Development' || lead.productCategory === 'Variant') {
      const designEngineer = team.find(m => m.role === 'Design');
      
      await addDoc(collection(db, 'design_reviews'), {
        leadId: docRef.id,
        customerName: lead.customerName,
        requestedBy: currentUser?.displayName || currentUser?.email || 'System',
        requestedById: currentUser?.uid || 'system',
        assignedTo: designEngineer?.displayName || designEngineer?.email || 'Design Team',
        assignedToId: designEngineer?.uid || 'design_team',
        requestDate: Timestamp.now(),
        requirementSummary: `Automated review for ${lead.productCategory}: ${lead.productType}`,
        feasibilityStatus: 'Pending',
        status: 'Pending',
        slaDays: 3,
        isDelayed: false
      });

      // Update lead status to pending feasibility
      await updateDoc(doc(db, 'leads', docRef.id), {
        feasibilityStatus: 'Pending',
        updatedAt: Timestamp.now(),
        updatedById: userId,
        updatedBy: userDisplayName
      });
    }

    return docRef;
  },

  async updateLead(id: string, updates: Partial<Lead>, currentUser?: any) {
    const prevDoc = await getDoc(doc(db, 'leads', id));
    if (!prevDoc.exists()) throw new Error('Lead not found');
    const prevData = prevDoc.data() as Lead;
    
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';
    const now = Timestamp.now();

    // Audit fields for the update
    updates.updatedAt = now;
    updates.updatedById = userId;
    updates.updatedBy = userDisplayName;

    // Auto-sync logic for data completeness
    const nextData = { ...prevData, ...updates };

    // 1. If PO received (boolean) is marked true, move to Closed Won
    if (updates.poReceived === true && prevData.poReceived !== true) {
      updates.stage = 'Closed Won';
    }

    // 2. If quoteCreated is marked true, move to Quoted (if stage is before Quoted)
    if (updates.quoteCreated === true && prevData.quoteCreated !== true) {
      const currentStageIndex = LEAD_STAGES.indexOf(prevData.stage);
      const quotedIndex = LEAD_STAGES.indexOf('Quoted');
      if (currentStageIndex < quotedIndex) {
        updates.stage = 'Quoted';
      }
    }

    // 3. Feasibility Restriction
    if (updates.stage && updates.stage !== prevData.stage) {
      const nextStageIndex = LEAD_STAGES.indexOf(updates.stage as LeadStage);
      const offerIndex = LEAD_STAGES.indexOf('Techno-Commercial Offer');
      
      if (nextStageIndex >= offerIndex && nextData.productCategory !== 'Standard') {
        if (nextData.feasibilityStatus === 'Pending' || !nextData.feasibilityStatus) {
          throw new Error('Stage restriction: Technical Feasibility is still Pending. Cannot move to Techno-Commercial Offer or beyond.');
        }
        if (nextData.feasibilityStatus === 'Not Feasible') {
          throw new Error('Stage restriction: Product is marked as Not Feasible. Review requirement or close as Lost.');
        }
      }

      // Record History
      const historyEntry = {
        date: now,
        from: prevData.stage,
        to: updates.stage as LeadStage,
        updatedBy: userDisplayName,
        updatedById: userId
      };
      updates.history = [...(prevData.history || []), historyEntry];
    }
    
    await updateDoc(doc(db, 'leads', id), updates);

    // Automation on Stage Change
    if (updates.stage && updates.stage !== prevData.stage) {
      await addDoc(collection(db, 'tasks'), {
        relatedTo: 'Lead',
        leadId: id,
        leadName: prevData.customerName,
        customerId: prevData.customerId,
        customerName: prevData.customerName,
        date: now,
        type: 'Internal Coordination',
        priority: 'High',
        summary: `Stage Changed: ${prevData.stage} -> ${updates.stage}`,
        nextAction: `Process workflow for ${updates.stage}`,
        nextActionDate: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
        owner: prevData.salespersonName,
        ownerId: prevData.salespersonId || 'system',
        status: 'Authorized',
        createdAt: now,
        createdById: userId,
        createdBy: userDisplayName
      });
    }
  },

  async deleteLead(id: string) {
    return deleteDoc(doc(db, 'leads', id));
  },

  async getLead(id: string) {
    const docSnap = await getDoc(doc(db, 'leads', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Lead;
    }
    return null;
  }
};
