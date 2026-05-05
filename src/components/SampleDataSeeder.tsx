import React, { useState } from 'react';
import {
  collection, addDoc, getDocs, query, limit, Timestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DatabaseZap, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

// ---------------------------------------------------------------------------
// Sample data definitions
// ---------------------------------------------------------------------------
const SAMPLE_DEPARTMENTS = [
  { name: 'Sales', description: 'Sales and Business Development' },
  { name: 'Engineering', description: 'Product Design and Engineering' },
  { name: 'Quality', description: 'Quality Assurance and Control' },
  { name: 'Accounts', description: 'Finance and Accounts' },
];

const SAMPLE_EMPLOYEES = [
  { employeeId: 'EMP001', name: 'Shailesh Ghorpade', email: 'shailesh@uapl.com', phone: '9876543210', designation: 'General Manager', role: 'Admin', status: 'Active', departmentName: 'Sales', departmentId: '' },
  { employeeId: 'EMP002', name: 'Ravi Kulkarni', email: 'ravi@uapl.com', phone: '9876543211', designation: 'Senior Sales Engineer', role: 'Sales', status: 'Active', departmentName: 'Sales', departmentId: '' },
  { employeeId: 'EMP003', name: 'Sneha Patil', email: 'sneha@uapl.com', phone: '9876543212', designation: 'Design Engineer', role: 'Design', status: 'Active', departmentName: 'Engineering', departmentId: '' },
  { employeeId: 'EMP004', name: 'Ajay Sharma', email: 'ajay@uapl.com', phone: '9876543213', designation: 'Quality Manager', role: 'Quality', status: 'Active', departmentName: 'Quality', departmentId: '' },
  { employeeId: 'EMP005', name: 'Meera Joshi', email: 'meera@uapl.com', phone: '9876543214', designation: 'Accounts Executive', role: 'Accounts', status: 'Active', departmentName: 'Accounts', departmentId: '' },
];

const SAMPLE_CUSTOMERS = [
  {
    customerId: 'CUST-001',
    name: 'Bharat Electronics Ltd',
    industry: 'Defence',
    customerType: 'OEM',
    region: 'Domestic',
    address: 'Jalahalli, Bengaluru, Karnataka 560013',
    gstNumber: '29AAGCB1234A1Z5',
    contactPersons: [{ name: 'Rajesh Kumar', email: 'rajesh@bel.co.in', phone: '9876100001' }],
    defaultQuoteFormat: 'Standard',
    createdBy: 'System',
  },
  {
    customerId: 'CUST-002',
    name: 'Tata Motors Ltd',
    industry: 'Automobile',
    customerType: 'OEM',
    region: 'Domestic',
    address: 'Bombay House, Homi Mody Street, Mumbai 400001',
    gstNumber: '27AAACT2727Q1ZS',
    contactPersons: [{ name: 'Priya Nair', email: 'priya@tatamotors.com', phone: '9876100002' }],
    defaultQuoteFormat: 'Standard',
    createdBy: 'System',
  },
  {
    customerId: 'CUST-003',
    name: 'ABB India Pvt Ltd',
    industry: 'Industrial',
    customerType: 'End User',
    region: 'Domestic',
    address: 'Infantry Road, Bengaluru, Karnataka 560001',
    gstNumber: '29AAACA0742F1Z8',
    contactPersons: [{ name: 'Vishal Mehta', email: 'vishal@abb.in', phone: '9876100003' }],
    defaultQuoteFormat: 'Basic',
    createdBy: 'System',
  },
];

const SAMPLE_PARTS = [
  { partId: 'SEN-001', partName: 'Pressure Transmitter 4-20mA', category: 'Sensors', subCategory: 'Pressure', standard: true, description: 'Industrial pressure transmitter with 4-20mA output', unit: 'Nos', basePrice: 8500, createdBy: 'System' },
  { partId: 'SEN-002', partName: 'Temperature Sensor PT100', category: 'Sensors', subCategory: 'Temperature', standard: true, description: 'RTD temperature sensor PT100 class B', unit: 'Nos', basePrice: 3200, createdBy: 'System' },
  { partId: 'SEN-003', partName: 'Vibration Sensor MEMS', category: 'Sensors', subCategory: 'Vibration', standard: false, description: 'MEMS-based vibration sensor for predictive maintenance', unit: 'Nos', basePrice: 12000, createdBy: 'System' },
];

// ---------------------------------------------------------------------------
export default function SampleDataSeeder() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [log, setLog] = useState<string[]>([]);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const isCollectionEmpty = async (col: string): Promise<boolean> => {
    const snap = await getDocs(query(collection(db, col), limit(1)));
    return snap.empty;
  };

  const handleSeed = async () => {
    setStatus('loading');
    setLog([]);
    const now = Timestamp.now();

    try {
      // ── Departments ──────────────────────────────────────────────────────
      let deptIds: Record<string, string> = {};
      if (await isCollectionEmpty('departments')) {
        for (const dept of SAMPLE_DEPARTMENTS) {
          const ref = await addDoc(collection(db, 'departments'), { ...dept, createdAt: now });
          deptIds[dept.name] = ref.id;
        }
        addLog(`✅ Seeded ${SAMPLE_DEPARTMENTS.length} departments`);
      } else {
        // Load existing dept IDs for mapping
        const snap = await getDocs(collection(db, 'departments'));
        snap.forEach(d => { deptIds[d.data().name] = d.id; });
        addLog(`⏭ Departments already exist — skipped`);
      }

      // ── Employees ────────────────────────────────────────────────────────
      if (await isCollectionEmpty('employees')) {
        for (const emp of SAMPLE_EMPLOYEES) {
          await addDoc(collection(db, 'employees'), {
            ...emp,
            departmentId: deptIds[emp.departmentName] || '',
            createdAt: now,
            createdBy: 'Sample Data Seeder',
          });
        }
        addLog(`✅ Seeded ${SAMPLE_EMPLOYEES.length} employees`);
      } else {
        addLog(`⏭ Employees already exist — skipped`);
      }

      // ── Customers ────────────────────────────────────────────────────────
      const customerIds: string[] = [];
      if (await isCollectionEmpty('customers')) {
        for (const cust of SAMPLE_CUSTOMERS) {
          const ref = await addDoc(collection(db, 'customers'), { ...cust, createdAt: now });
          customerIds.push(ref.id);
        }
        addLog(`✅ Seeded ${SAMPLE_CUSTOMERS.length} customers`);
      } else {
        addLog(`⏭ Customers already exist — skipped`);
      }

      // ── Parts ────────────────────────────────────────────────────────────
      const partIds: string[] = [];
      if (await isCollectionEmpty('parts')) {
        for (const part of SAMPLE_PARTS) {
          const ref = await addDoc(collection(db, 'parts'), { ...part, createdAt: now });
          partIds.push(ref.id);
        }
        addLog(`✅ Seeded ${SAMPLE_PARTS.length} parts`);
      } else {
        addLog(`⏭ Parts already exist — skipped`);
      }

      // ── Sample Leads ─────────────────────────────────────────────────────
      if (await isCollectionEmpty('leads')) {
        const sampleLeads = [
          {
            customerId: customerIds[0] || 'cust1',
            customerName: 'Bharat Electronics Ltd',
            partId: partIds[0] || 'part1',
            partName: 'Pressure Transmitter 4-20mA',
            contactPerson: 'Rajesh Kumar',
            industry: 'Defence',
            region: 'Domestic',
            customerType: 'OEM',
            productType: 'Pressure Transmitter 4-20mA',
            productCategory: 'Standard',
            partCategory: 'Sensors',
            stage: 'Qualified',
            salespersonName: 'Ravi Kulkarni',
            salespersonId: 'system',
            source: 'Visit',
            estimatedValue: 850000,
            probability: 50,
            priority: 'High',
            quoteCreated: false,
            poReceived: false,
            requirementDetails: 'Defence DRDO project requiring 100 units of pressure transmitters with MIL-STD-461 compliance.',
            createdAt: now, createdBy: 'System', createdById: 'system',
            updatedAt: now, updatedBy: 'System', updatedById: 'system',
            history: [{ date: now, from: 'Lead', to: 'Qualified', updatedBy: 'System', updatedById: 'system' }],
          },
          {
            customerId: customerIds[1] || 'cust2',
            customerName: 'Tata Motors Ltd',
            partId: partIds[1] || 'part2',
            partName: 'Temperature Sensor PT100',
            contactPerson: 'Priya Nair',
            industry: 'Automobile',
            region: 'Domestic',
            customerType: 'OEM',
            productType: 'Temperature Sensor PT100',
            productCategory: 'New Development',
            partCategory: 'Sensors',
            stage: 'Techno-Commercial Offer',
            salespersonName: 'Ravi Kulkarni',
            salespersonId: 'system',
            source: 'Email',
            estimatedValue: 240000,
            probability: 75,
            priority: 'High',
            quoteCreated: true,
            poReceived: false,
            feasibilityStatus: 'Feasible',
            requirementDetails: 'Engine bay temperature monitoring for EV battery management system.',
            createdAt: Timestamp.fromDate(new Date(Date.now() - 14 * 86400000)), createdBy: 'System', createdById: 'system',
            updatedAt: now, updatedBy: 'System', updatedById: 'system',
            history: [{ date: now, from: 'Lead', to: 'Techno-Commercial Offer', updatedBy: 'System', updatedById: 'system' }],
          },
          {
            customerId: customerIds[2] || 'cust3',
            customerName: 'ABB India Pvt Ltd',
            partId: partIds[2] || 'part3',
            partName: 'Vibration Sensor MEMS',
            contactPerson: 'Vishal Mehta',
            industry: 'Industrial',
            region: 'Domestic',
            customerType: 'End User',
            productType: 'Vibration Sensor MEMS',
            productCategory: 'New Development',
            partCategory: 'Sensors',
            stage: 'Follow-up',
            salespersonName: 'Ravi Kulkarni',
            salespersonId: 'system',
            source: 'Reference',
            estimatedValue: 600000,
            probability: 25,
            priority: 'Medium',
            quoteCreated: true,
            poReceived: false,
            feasibilityStatus: 'Feasible',
            requirementDetails: 'Predictive maintenance sensor for industrial pumps and motors.',
            createdAt: Timestamp.fromDate(new Date(Date.now() - 30 * 86400000)), createdBy: 'System', createdById: 'system',
            updatedAt: now, updatedBy: 'System', updatedById: 'system',
            history: [{ date: now, from: 'Lead', to: 'Follow-up', updatedBy: 'System', updatedById: 'system' }],
          },
        ];
        for (const lead of sampleLeads) {
          await addDoc(collection(db, 'leads'), lead);
        }
        addLog(`✅ Seeded ${sampleLeads.length} sample leads`);
      } else {
        addLog(`⏭ Leads already exist — skipped`);
      }

      // ── Sample Complaint ──────────────────────────────────────────────────
      if (await isCollectionEmpty('complaints')) {
        await addDoc(collection(db, 'complaints'), {
          complaintId: `CMP-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-001`,
          customerId: customerIds[0] || 'cust1',
          customerName: 'Bharat Electronics Ltd',
          complaintDate: Timestamp.fromDate(new Date(Date.now() - 7 * 86400000)),
          complaintSource: 'Email',
          complaintType: 'Quality',
          severity: 'Major',
          status: 'Under Investigation',
          description: 'Customer reported erratic 4-20mA output from batch PT-2024-001 (50 units). Random spikes observed at high ambient temperatures.',
          assignedTo: 'Ajay Sharma',
          assignedToId: 'system',
          isRepeatComplaint: false,
          acknowledgementSentToCustomer: true,
          acknowledgedDate: Timestamp.fromDate(new Date(Date.now() - 6 * 86400000)),
          history: [{
            date: Timestamp.fromDate(new Date(Date.now() - 7 * 86400000)),
            status: 'Open',
            updatedBy: 'System',
            updatedById: 'system',
            remarks: 'Complaint registered'
          }],
          createdAt: Timestamp.fromDate(new Date(Date.now() - 7 * 86400000)),
          createdBy: 'System',
          createdById: 'system',
          updatedAt: now,
          updatedBy: 'System',
          updatedById: 'system',
        });
        addLog(`✅ Seeded 1 sample complaint`);
      } else {
        addLog(`⏭ Complaints already exist — skipped`);
      }

      setStatus('done');
      toast.success('Sample data seeded successfully!');
    } catch (err: any) {
      setStatus('error');
      addLog(`❌ Error: ${err.message}`);
      toast.error('Seeding failed: ' + err.message);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-violet-50 rounded-lg">
          <DatabaseZap className="w-5 h-5 text-violet-600" />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">Sample Data Seeder</h3>
          <p className="text-xs text-slate-500">Seeds demo data only into empty collections. Safe to run — skips non-empty ones.</p>
        </div>
      </div>

      {log.length > 0 && (
        <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs space-y-1 max-h-52 overflow-y-auto">
          {log.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      )}

      {status === 'done' ? (
        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 text-sm font-medium">
          <CheckCircle2 size={16} /> Seeding complete! Refresh the app to see data.
        </div>
      ) : status === 'error' ? (
        <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm font-medium">
          <AlertCircle size={16} /> Seeding failed. Check the log above.
        </div>
      ) : (
        <Button onClick={handleSeed} disabled={status === 'loading'} className="w-full">
          {status === 'loading' ? (
            <><Loader2 size={16} className="mr-2 animate-spin" />Seeding data…</>
          ) : (
            <><DatabaseZap size={16} className="mr-2" />Seed Sample Data</>
          )}
        </Button>
      )}
    </div>
  );
}
