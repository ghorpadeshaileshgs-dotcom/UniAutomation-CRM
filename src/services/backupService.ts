import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  getDocs, 
  Timestamp,
  serverTimestamp,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import { Backup } from '../types';

export const backupService = {
  async triggerManualBackup(adminName: string, adminId: string, analytics: { collections: number, records: number }) {
    const backup: Omit<Backup, 'id'> = {
      timestamp: Timestamp.now(),
      status: 'Success',
      type: 'Manual',
      collectionsCount: analytics.collections,
      totalRecords: analytics.records,
      fileName: `manual_backup_${new Date().toISOString().split('T')[0]}.xlsx`,
      createdBy: adminName,
      createdById: adminId,
      createdAt: Timestamp.now()
    };
    
    return addDoc(collection(db, 'backups'), backup);
  },

  async getBackupHistory(maxCount = 10) {
    const q = query(
      collection(db, 'backups'), 
      orderBy('createdAt', 'desc'),
      limit(maxCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Backup));
  }
};
