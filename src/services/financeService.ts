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
import { Invoice, MonthlyTarget, Forecast } from '../types';

export const financeService = {
  // Invoices
  async addInvoice(invoice: Omit<Invoice, 'id' | 'createdAt' | 'createdById' | 'createdBy'>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    return addDoc(collection(db, 'invoices'), {
      ...invoice,
      createdAt: now,
      createdById: userId,
      createdBy: userDisplayName,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });
  },

  async updateInvoice(id: string, updates: Partial<Invoice>, currentUser: any) {
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';
    const now = Timestamp.now();

    updates.updatedAt = now;
    updates.updatedById = userId;
    updates.updatedBy = userDisplayName;

    return updateDoc(doc(db, 'invoices', id), updates);
  },

  // Targets
  async setTarget(target: Omit<MonthlyTarget, 'id' | 'createdAt' | 'createdById' | 'createdBy'>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    return addDoc(collection(db, 'targets'), {
      ...target,
      createdAt: now,
      createdById: userId,
      createdBy: userDisplayName,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });
  },

  // Forecasts
  async saveForecast(forecast: Omit<Forecast, 'id' | 'createdAt' | 'createdById' | 'createdBy'>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    return addDoc(collection(db, 'forecasts'), {
      ...forecast,
      createdAt: now,
      createdById: userId,
      createdBy: userDisplayName,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });
  }
};
