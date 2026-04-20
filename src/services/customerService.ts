import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  Timestamp, 
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Customer } from '../types';

export const customerService = {
  async addCustomer(customer: Omit<Customer, 'id' | 'createdAt' | 'createdBy' | 'createdById'>, existingCustomers: Customer[], currentUser: any) {
    // Prevent duplicate customers
    const existing = existingCustomers.find(c => c.name.toLowerCase() === customer.name.toLowerCase());
    if (existing) {
      throw new Error(`Customer with name "${customer.name}" already exists.`);
    }

    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    return addDoc(collection(db, 'customers'), {
      ...customer,
      createdAt: now,
      createdById: userId,
      createdBy: userDisplayName,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });
  },

  async updateCustomer(id: string, updates: Partial<Customer>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    return updateDoc(doc(db, 'customers', id), {
      ...updates,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });
  },

  async deleteCustomer(id: string) {
    return deleteDoc(doc(db, 'customers', id));
  }
};
