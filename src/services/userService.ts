import { 
  updateDoc, 
  doc, 
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile } from '../types';

export const userService = {
  async updateUserProfile(uid: string, updates: Partial<UserProfile>) {
    return updateDoc(doc(db, 'users', uid), updates);
  },

  async deleteUserProfile(uid: string) {
    return deleteDoc(doc(db, 'users', uid));
  },

  async createUserProfile(profile: UserProfile) {
    return setDoc(doc(db, 'users', profile.uid), profile);
  },

  async adminCreateUser(userData: any) {
    const response = await fetch('/api/admin/create-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create user');
    }
    
    return response.json();
  }
};
