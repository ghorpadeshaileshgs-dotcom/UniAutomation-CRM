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
import { Complaint } from '../types';
import { taskService } from './taskService';

export const complaintService = {
  async addComplaint(complaint: Omit<Complaint, 'id' | 'createdAt' | 'createdBy' | 'createdById'>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    const docRef = await addDoc(collection(db, 'complaints'), {
      ...complaint,
      createdAt: now,
      createdById: userId,
      createdBy: userDisplayName,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });

    // Auto-create task
    await taskService.addTask({
      relatedTo: 'Customer',
      customerId: complaint.customerId,
      customerName: complaint.customerName,
      date: now,
      type: 'Customer Query',
      priority: 'High',
      summary: `Complaint Investigation: ${complaint.complaintId}`,
      nextAction: `Investigate root cause for ${complaint.complaintType} issue`,
      nextActionDate: Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000)), // Tomorrow
      owner: complaint.assignedTo || 'Unassigned',
      ownerId: complaint.assignedToId || 'system',
      status: 'Pending Approval'
    }, currentUser);

    return docRef;
  },

  async updateComplaint(id: string, updates: Partial<Complaint>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    if (updates.status === 'Closed' && !updates.closureDate) {
      updates.closureDate = now;
      const complaintDoc = await getDoc(doc(db, 'complaints', id));
      if (complaintDoc.exists()) {
        const complaintData = complaintDoc.data() as Complaint;
        const start = complaintData.complaintDate.toDate();
        const end = updates.closureDate.toDate();
        const diffInDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        updates.turnaroundTime = parseFloat(diffInDays.toFixed(2));
      }
    }

    const finalUpdates = {
      ...updates,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    };

    return updateDoc(doc(db, 'complaints', id), finalUpdates);
  },

  async deleteComplaint(id: string) {
    return deleteDoc(doc(db, 'complaints', id));
  }
};
