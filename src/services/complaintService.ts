import {
  collection,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  deleteDoc,
  arrayUnion
} from 'firebase/firestore';
import { db } from '../firebase';
import { Complaint, ComplaintHistoryEntry, ComplaintStatus, ComplaintSeverity } from '../types';
import { taskService } from './taskService';

/** SLA in days by severity for each stage */
const CONTAINMENT_SLA_DAYS: Record<ComplaintSeverity, number> = {
  Critical: 1,
  Major: 2,
  Minor: 5
};

const VERIFICATION_OFFSET_DAYS: Record<ComplaintSeverity, number> = {
  Critical: 30,
  Major: 60,
  Minor: 90
};

const TASK_PRIORITY_MAP: Record<ComplaintSeverity, 'High' | 'Medium' | 'Low'> = {
  Critical: 'High',
  Major: 'Medium',
  Minor: 'Low'
};

/** Auto-generate complaintId as CMP-YYYYMM-NNN */
async function generateComplaintId(): Promise<string> {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Count complaints already in this month
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const snap = await getDocs(
    query(
      collection(db, 'complaints'),
      where('complaintDate', '>=', Timestamp.fromDate(startOfMonth)),
      where('complaintDate', '<=', Timestamp.fromDate(endOfMonth))
    )
  );
  const seq = String(snap.size + 1).padStart(3, '0');
  return `CMP-${yyyymm}-${seq}`;
}

/** Check if a complaint is a repeat (same customer + type within 6 months) */
async function detectRepeatComplaint(
  customerId: string | undefined,
  complaintType: string,
  excludeId?: string
): Promise<{ isRepeat: boolean; linkedId?: string }> {
  if (!customerId) return { isRepeat: false };

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const snap = await getDocs(
    query(
      collection(db, 'complaints'),
      where('customerId', '==', customerId),
      where('complaintType', '==', complaintType),
      where('complaintDate', '>=', Timestamp.fromDate(sixMonthsAgo)),
      orderBy('complaintDate', 'desc'),
      limit(5)
    )
  );

  const matches = snap.docs.filter(d => d.id !== excludeId);
  if (matches.length > 0) {
    return { isRepeat: true, linkedId: matches[0].id };
  }
  return { isRepeat: false };
}

export const complaintService = {
  async addComplaint(
    complaint: Omit<Complaint, 'id' | 'createdAt' | 'createdBy' | 'createdById'>,
    currentUser: any
  ) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    // (a) Auto-generate complaintId
    const complaintId = complaint.complaintId?.startsWith('CMP-')
      ? complaint.complaintId
      : await generateComplaintId();

    // (d) Initialize history array
    const initialHistory: ComplaintHistoryEntry[] = [
      {
        date: now,
        status: 'Open',
        updatedBy: userDisplayName,
        updatedById: userId,
        remarks: 'Complaint registered'
      }
    ];

    // (b) Set acknowledgedDate immediately on registration
    // (c) acknowledgementSentToCustomer = false by default
    const payload = {
      ...complaint,
      complaintId,
      acknowledgedDate: now,
      acknowledgementSentToCustomer: complaint.acknowledgementSentToCustomer ?? false,
      history: initialHistory,
      status: 'Open' as ComplaintStatus,
      createdAt: now,
      createdById: userId,
      createdBy: userDisplayName,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    };

    const docRef = await addDoc(collection(db, 'complaints'), payload);

    // (f) Auto-create task with SLA-based nextActionDate
    const slaOffsetDays = CONTAINMENT_SLA_DAYS[complaint.severity] ?? 2;
    const nextActionDate = Timestamp.fromDate(
      new Date(Date.now() + slaOffsetDays * 24 * 60 * 60 * 1000)
    );

    await taskService.addTask(
      {
        relatedTo: 'Customer',
        customerId: complaint.customerId,
        customerName: complaint.customerName,
        date: now,
        type: 'Customer Query',
        priority: TASK_PRIORITY_MAP[complaint.severity],
        summary: `[${complaint.severity}] Complaint Investigation: ${complaintId}`,
        nextAction: `Complete containment action for ${complaint.complaintType} complaint (${complaintId})`,
        nextActionDate,
        owner: complaint.assignedTo || 'Unassigned',
        ownerId: complaint.assignedToId || 'system',
        status: 'Pending Approval'
      },
      currentUser
    );

    return docRef;
  },

  async updateComplaint(id: string, updates: Partial<Complaint>, currentUser: any) {
    const now = Timestamp.now();
    const userDisplayName = currentUser?.displayName || currentUser?.email || 'System';
    const userId = currentUser?.uid || 'system';

    // Fetch current complaint for comparisons
    const complaintDoc = await getDoc(doc(db, 'complaints', id));
    const existing = complaintDoc.exists() ? (complaintDoc.data() as Complaint) : null;
    const currentStatus = existing?.status;

    // (a) Append history entry when status changes
    let historyEntry: ComplaintHistoryEntry | null = null;
    if (updates.status && updates.status !== currentStatus) {
      historyEntry = {
        date: now,
        status: updates.status,
        updatedBy: userDisplayName,
        updatedById: userId,
        remarks: (updates as any).remarks || ''
      };
    }

    // (c) If effectivenessResult === 'Not Effective', force re-open
    if (updates.effectivenessResult === 'Not Effective') {
      updates.status = 'Re-Opened';
      historyEntry = {
        date: now,
        status: 'Re-Opened',
        updatedBy: userDisplayName,
        updatedById: userId,
        remarks: 'Effectiveness verification failed — complaint re-opened'
      };
    }

    // (e) Calculate turnaroundTime when closing
    if (updates.status === 'Closed') {
      if (!updates.closureDate) {
        updates.closureDate = now;
      }
      if (existing?.complaintDate) {
        const start = existing.complaintDate.toDate();
        const end = updates.closureDate.toDate();
        const diffInDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        updates.turnaroundTime = parseFloat(diffInDays.toFixed(2));
      }
      // (b) Auto-set verificationDueDate if not set
      if (!updates.verificationDueDate && !existing?.verificationDueDate) {
        const severity = updates.severity || existing?.severity || 'Minor';
        const offsetDays = VERIFICATION_OFFSET_DAYS[severity];
        const closureDate = updates.closureDate?.toDate() || now.toDate();
        updates.verificationDueDate = Timestamp.fromDate(
          new Date(closureDate.getTime() + offsetDays * 24 * 60 * 60 * 1000)
        );
      }
    }

    // (d) Detect repeat complaints before saving
    const customerId = updates.customerId ?? existing?.customerId;
    const complaintType = updates.complaintType ?? existing?.complaintType ?? '';
    if (customerId && complaintType) {
      const { isRepeat, linkedId } = await detectRepeatComplaint(customerId, complaintType, id);
      if (isRepeat) {
        updates.isRepeatComplaint = true;
        updates.linkedComplaintId = linkedId;
      }
    }

    const finalUpdates: any = {
      ...updates,
      updatedAt: now,
      updatedById: userId,
      updatedBy: userDisplayName
    };

    // Use arrayUnion to push history entry atomically
    if (historyEntry) {
      finalUpdates.history = arrayUnion(historyEntry);
    }

    // Remove remarks from the top-level (it's only stored in history)
    delete finalUpdates.remarks;

    await updateDoc(doc(db, 'complaints', id), finalUpdates);

    // B5: Auto-task on status transitions
    const newStatus = updates.status;
    const severity: ComplaintSeverity = (updates.severity || existing?.severity || 'Minor') as ComplaintSeverity;
    const complaintId = existing?.complaintId || id;
    const assignedToId = updates.assignedToId || existing?.assignedToId || userId;
    const assignedTo = updates.assignedTo || existing?.assignedTo || userDisplayName;
    const customerName = updates.customerName || existing?.customerName || '';

    const RCA_SLA: Record<ComplaintSeverity, number> = { Critical: 3, Major: 7, Minor: 14 };
    const VERIFY_SLA: Record<ComplaintSeverity, number> = { Critical: 30, Major: 60, Minor: 90 };

    if (newStatus === 'Containment Done' && currentStatus !== 'Containment Done') {
      await addDoc(collection(db, 'tasks'), {
        relatedTo: 'Customer',
        customerId: existing?.customerId || '',
        customerName,
        date: now,
        type: 'Internal Coordination',
        priority: TASK_PRIORITY_MAP[severity],
        summary: `Root Cause Analysis required for complaint ${complaintId}`,
        nextAction: `Complete RCA for ${complaintId} (${severity} severity)`,
        nextActionDate: Timestamp.fromDate(new Date(Date.now() + RCA_SLA[severity] * 24 * 60 * 60 * 1000)),
        owner: assignedTo,
        ownerId: assignedToId,
        assignedTo: assignedToId,
        assignedToName: assignedTo,
        status: 'Authorized',
        createdAt: now,
        createdById: userId,
        createdBy: userDisplayName,
      });
    }

    if (newStatus === 'CAPA Submitted' && currentStatus !== 'CAPA Submitted') {
      await addDoc(collection(db, 'tasks'), {
        relatedTo: 'Customer',
        customerId: existing?.customerId || '',
        customerName,
        date: now,
        type: 'Internal Coordination',
        priority: TASK_PRIORITY_MAP[severity],
        summary: `CAPA effectiveness verification for complaint ${complaintId}`,
        nextAction: `Verify CAPA effectiveness for ${complaintId} by due date`,
        nextActionDate: Timestamp.fromDate(new Date(Date.now() + VERIFY_SLA[severity] * 24 * 60 * 60 * 1000)),
        owner: assignedTo,
        ownerId: assignedToId,
        assignedTo: assignedToId,
        assignedToName: assignedTo,
        status: 'Authorized',
        createdAt: now,
        createdById: userId,
        createdBy: userDisplayName,
      });
    }
  },

  async deleteComplaint(id: string) {
    return deleteDoc(doc(db, 'complaints', id));
  }
};
