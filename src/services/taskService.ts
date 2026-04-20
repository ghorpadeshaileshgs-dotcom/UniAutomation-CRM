import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Task } from '../types';

export const taskService = {
  async addTask(task: Omit<Task, 'id' | 'createdAt' | 'createdBy' | 'createdById'>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    return addDoc(collection(db, 'tasks'), {
      ...task,
      createdAt: now,
      createdById: userId,
      createdBy: userDisplayName,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });
  },

  async updateTask(id: string, updates: Partial<Task>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    return updateDoc(doc(db, 'tasks', id), {
      ...updates,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });
  },

  async deleteTask(id: string) {
    return deleteDoc(doc(db, 'tasks', id));
  }
};
