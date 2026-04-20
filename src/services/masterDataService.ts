import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  Timestamp, 
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Part, Debtor, Employee, Department, TechnicalTemplate } from '../types';

export const masterDataService = {
  // Parts
  async addPart(part: Omit<Part, 'id' | 'createdAt' | 'createdBy' | 'createdById'>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    return addDoc(collection(db, 'parts'), {
      ...part,
      createdAt: now,
      createdById: userId,
      createdBy: userDisplayName,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });
  },
  async updatePart(id: string, part: Partial<Part>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    return updateDoc(doc(db, 'parts', id), {
      ...part,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });
  },
  async deletePart(id: string) {
    return deleteDoc(doc(db, 'parts', id));
  },

  // Debtors
  async addDebtor(debtor: Omit<Debtor, 'id' | 'createdAt' | 'createdBy' | 'createdById'>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    return addDoc(collection(db, 'debtors'), {
      ...debtor,
      createdAt: now,
      createdById: userId,
      createdBy: userDisplayName,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });
  },
  async updateDebtor(id: string, debtor: Partial<Debtor>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    return updateDoc(doc(db, 'debtors', id), {
      ...debtor,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });
  },
  async deleteDebtor(id: string) {
    return deleteDoc(doc(db, 'debtors', id));
  },

  // Employees
  async addEmployee(employee: Omit<Employee, 'id' | 'createdAt' | 'createdBy' | 'createdById'>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    return addDoc(collection(db, 'employees'), {
      ...employee,
      createdAt: now,
      createdById: userId,
      createdBy: userDisplayName,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });
  },
  async updateEmployee(id: string, employee: Partial<Employee>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    return updateDoc(doc(db, 'employees', id), {
      ...employee,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });
  },
  async deleteEmployee(id: string) {
    return deleteDoc(doc(db, 'employees', id));
  },

  // Departments
  async addDepartment(department: Omit<Department, 'id' | 'createdAt' | 'createdBy' | 'createdById'>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    return addDoc(collection(db, 'departments'), {
      ...department,
      createdAt: now,
      createdById: userId,
      createdBy: userDisplayName,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });
  },
  async updateDepartment(id: string, department: Partial<Department>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    return updateDoc(doc(db, 'departments', id), {
      ...department,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });
  },
  async deleteDepartment(id: string) {
    return deleteDoc(doc(db, 'departments', id));
  },

  // Technical Templates
  async addTechnicalTemplate(template: Omit<TechnicalTemplate, 'id' | 'createdAt' | 'createdBy' | 'createdById'>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    return addDoc(collection(db, 'technical_templates'), {
      ...template,
      createdAt: now,
      createdById: userId,
      createdBy: userDisplayName,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });
  },
  async updateTechnicalTemplate(id: string, updates: Partial<TechnicalTemplate>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    return updateDoc(doc(db, 'technical_templates', id), {
      ...updates,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    });
  },
  async deleteTechnicalTemplate(id: string) {
    return deleteDoc(doc(db, 'technical_templates', id));
  }
};
