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
import { SalesOrder, AuditFields } from '../types';

export const orderService = {
  async addSalesOrder(order: Omit<SalesOrder, 'id' | 'createdAt' | 'createdById' | 'createdBy'>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    const docRef = await addDoc(collection(db, 'sales_orders'), {
      ...order,
      createdAt: now,
      createdById: userId,
      createdBy: userDisplayName,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });

    // Auto-task: Send Order Acknowledgement
    await addDoc(collection(db, 'tasks'), {
      relatedTo: 'Customer',
      customerId: (order as any).customerId || '',
      customerName: (order as any).customerName || '',
      date: now,
      type: 'Internal Coordination',
      priority: 'High',
      summary: `Order acknowledgement for SO: ${(order as any).soNumber || docRef.id}`,
      nextAction: `Send order acknowledgement to ${(order as any).customerName || 'customer'}`,
      nextActionDate: Timestamp.fromDate(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000)),
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

  async updateSalesOrder(id: string, updates: Partial<SalesOrder>, currentUser: any) {
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';
    const now = Timestamp.now();

    updates.updatedAt = now;
    updates.updatedById = userId;
    updates.updatedBy = userDisplayName;

    return updateDoc(doc(db, 'sales_orders', id), updates);
  },

  async deleteSalesOrder(id: string) {
    return deleteDoc(doc(db, 'sales_orders', id));
  }
};
