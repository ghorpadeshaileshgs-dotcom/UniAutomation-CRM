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
import { ApprovalRequest } from '../types';

export const governanceService = {
  async requestApproval(approval: Omit<ApprovalRequest, 'id' | 'createdAt' | 'createdById' | 'createdBy'>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    return addDoc(collection(db, 'approvals'), {
      ...approval,
      createdAt: now,
      createdById: userId,
      createdBy: userDisplayName,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });
  },

  async updateApproval(id: string, updates: Partial<ApprovalRequest>, currentUser: any) {
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';
    const now = Timestamp.now();

    updates.updatedAt = now;
    updates.updatedById = userId;
    updates.updatedBy = userDisplayName;

    return updateDoc(doc(db, 'approvals', id), updates);
  }
};
