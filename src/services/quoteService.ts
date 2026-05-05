import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  Timestamp, 
  deleteDoc,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { leadService } from '../services/leadService';
import { Quote } from '../types';

export const quoteService = {
  async addQuote(quote: Omit<Quote, 'id' | 'createdAt' | 'createdBy' | 'createdById'>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    const docRef = await addDoc(collection(db, 'quotes'), {
      ...quote,
      createdAt: now,
      createdById: userId,
      createdBy: userDisplayName,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });

    // Update lead if attached via leadService to trigger automations
    if (quote.leadId) {
      await leadService.updateLead(quote.leadId, { quoteCreated: true }, currentUser);
    }

    // Auto-task: Follow-up on quote
    await addDoc(collection(db, 'tasks'), {
      relatedTo: 'Lead',
      leadId: quote.leadId || '',
      customerId: quote.customerId || '',
      customerName: quote.customerName || '',
      date: now,
      type: 'Customer Query',
      priority: 'Medium',
      summary: `Follow up on quotation ${docRef.id} sent to ${quote.customerName}`,
      nextAction: `Follow up with ${quote.customerName} on submitted quotation`,
      nextActionDate: Timestamp.fromDate(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)),
      owner: userDisplayName,
      ownerId: userId,
      assignedTo: userId,
      assignedToName: userDisplayName,
      status: 'Authorized',
      createdAt: now,
      createdById: userId,
      createdBy: userDisplayName,
    });

    return docRef;
  },

  async updateQuote(id: string, quote: Partial<Quote>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    const updates = {
      ...quote,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    };

    return updateDoc(doc(db, 'quotes', id), updates);
  },

  async deleteQuote(id: string) {
    return deleteDoc(doc(db, 'quotes', id));
  },

  async getQuote(id: string) {
    const docSnap = await getDoc(doc(db, 'quotes', id));
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Quote;
    }
    return null;
  }
};
