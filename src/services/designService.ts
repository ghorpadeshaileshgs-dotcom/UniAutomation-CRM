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
import { DesignReview } from '../types';

export const designService = {
  async addDesignReview(review: Omit<DesignReview, 'id' | 'createdAt' | 'createdBy' | 'createdById'>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    const docRef = await addDoc(collection(db, 'design_reviews'), {
      ...review,
      status: review.status || 'Pending',
      slaDays: review.slaDays || 3,
      isDelayed: false,
      createdAt: now,
      createdById: userId,
      createdBy: userDisplayName,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });
    // Update lead status to pending feasibility
    await updateDoc(doc(db, 'leads', review.leadId), {
      feasibilityStatus: 'Pending',
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });
    return docRef;
  },

  async updateDesignReview(id: string, updates: Partial<DesignReview>, currentUser: any) {
    const prevDoc = await getDoc(doc(db, 'design_reviews', id));
    if (!prevDoc.exists()) throw new Error('Design review not found');
    const prevData = prevDoc.data() as DesignReview;

    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';
    const now = Timestamp.now();

    const finalUpdates: any = { 
      ...updates,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    };

    if (updates.feasibilityStatus && updates.feasibilityStatus !== 'Pending') {
      finalUpdates.status = 'Completed';
      finalUpdates.responseDate = Timestamp.now();
      const start = prevData.requestDate.toDate().getTime();
      const end = finalUpdates.responseDate.toDate().getTime();
      finalUpdates.turnaroundTime = parseFloat(((end - start) / (1000 * 60 * 60 * 24)).toFixed(2));
      
      // Update delayed status at completion
      finalUpdates.isDelayed = finalUpdates.turnaroundTime > prevData.slaDays;
    }

    await updateDoc(doc(db, 'design_reviews', id), finalUpdates);
    
    // If status updated, update lead
    if (updates.feasibilityStatus) {
      const leadUpdates: any = {
        feasibilityStatus: updates.feasibilityStatus
      };

      if (updates.feasibilityStatus === 'Feasible' || updates.feasibilityStatus === 'Feasible with Modification') {
        leadUpdates.stage = 'Techno-Commercial Offer';
      } else if (updates.feasibilityStatus === 'Not Feasible') {
        leadUpdates.stage = 'Closed Lost';
        leadUpdates.lostReason = 'Technically Not Feasible';
      }

      await updateDoc(doc(db, 'leads', prevData.leadId), leadUpdates);
    }
  },

  async deleteDesignReview(id: string) {
    return deleteDoc(doc(db, 'design_reviews', id));
  }
};
