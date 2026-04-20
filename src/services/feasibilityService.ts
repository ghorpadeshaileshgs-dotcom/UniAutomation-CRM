import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  Timestamp, 
  getDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { FeasibilityForm, Lead, FeasibilityHistoryEntry, UserProfile } from '../types';
import { leadService } from './leadService';

export const feasibilityService = {
  async addFeasibilityForm(formData: Omit<FeasibilityForm, 'id' | 'createdAt' | 'createdBy' | 'createdById'>, leadName: string, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    const docRef = await addDoc(collection(db, 'feasibility_forms'), {
      ...formData,
      status: 'Open',
      overallStatus: 'Pending',
      revisionCount: 0,
      history: [],
      createdAt: now,
      createdById: userId,
      createdBy: userDisplayName,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });

    // Automatically trigger a Design Review task
    await addDoc(collection(db, 'tasks'), {
      relatedTo: 'Lead',
      leadId: formData.leadId,
      customerName: leadName,
      date: now,
      type: 'Technical Support',
      priority: 'High',
      summary: `Design Review Needed: ${formData.category} - ${formData.subCategory}`,
      nextAction: 'Review technical feasibility form and respond',
      nextActionDate: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)),
      owner: formData.assignedTo || 'Unassigned',
      ownerId: formData.assignedToId || 'system',
      status: 'Authorized',
      createdAt: now,
      createdById: userId,
      createdBy: userDisplayName
    });

    return docRef;
  },

  async updateFeasibilityForm(id: string, updates: Partial<FeasibilityForm>, currentUser: any) {
    const docRef = doc(db, 'feasibility_forms', id);
    const prevDoc = await getDoc(docRef);
    if (!prevDoc.exists()) throw new Error('Feasibility form not found');
    const prevForm = prevDoc.data() as FeasibilityForm;

    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';
    const now = Timestamp.now();

    const finalUpdates: any = {
      ...updates,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    };

    // Auto-calculate turnaround time on first review completion
    if (!prevForm.updatedAt) {
      const start = prevForm.createdAt.toDate().getTime();
      const end = Date.now();
      finalUpdates.turnaroundTime = parseFloat(((end - start) / (1000 * 60 * 60)).toFixed(2)); // hours
    }

    // Add to history and handle revision logic
    if (updates.overallStatus || updates.designResponse) {
      const historyEntry: FeasibilityHistoryEntry = {
        date: Timestamp.now(),
        updatedBy: currentUser?.displayName || currentUser?.email || 'System',
        updatedById: currentUser?.uid || 'system',
        status: updates.overallStatus || prevForm.overallStatus,
        remarks: updates.designResponse || 'Technical review update'
      };
      
      finalUpdates.history = [...(prevForm.history || []), historyEntry];
      finalUpdates.revisionCount = (prevForm.revisionCount || 0) + 1;
    }

    await updateDoc(docRef, finalUpdates);

    // Sync status with Lead via leadService if overallStatus changed
    if (updates.overallStatus && updates.overallStatus !== 'Pending') {
      const leadId = prevForm.leadId;
      const leadUpdates: any = {
        feasibilityStatus: updates.overallStatus
      };

      if (updates.overallStatus === 'Feasible') {
        leadUpdates.stage = 'Techno-Commercial Offer';
      } else if (updates.overallStatus === 'Not Feasible') {
        leadUpdates.stage = 'Closed Lost';
        leadUpdates.lostReason = 'Technically Not Feasible';
      }

      await leadService.updateLead(leadId, leadUpdates, currentUser);
    }

    return id;
  },

  async deleteFeasibilityForm(id: string) {
    return deleteDoc(doc(db, 'feasibility_forms', id));
  },

  async getFeasibilityForm(id: string) {
    const docSnap = await getDoc(doc(db, 'feasibility_forms', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as FeasibilityForm;
    }
    return null;
  }
};
