import React, { useState, useEffect } from 'react';
import { 
  Download, 
  History, 
  Database, 
  ShieldCheck, 
  Clock, 
  FileSpreadsheet,
  AlertTriangle,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useFirebase } from '../hooks/useFirebase';
import { backupService } from '../services/backupService';
import { Backup, Industry, UserProfile, Customer, Lead, Debtor } from '../types';
import { format } from 'date-fns';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

export default function DataManagement() {
  const { 
    profile, 
    user,
    leads, 
    tasks, 
    customers, 
    parts, 
    debtors, 
    designReviews, 
    employees, 
    departments, 
    quotes, 
    complaints, 
    technicalTemplates, 
    feasibilityForms,
    addLead,
    createUserProfile,
    addCustomer,
    addDebtor,
    addDesignReview,
    addTechnicalTemplate
  } = useFirebase();
  
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const seedSampleData = async () => {
    try {
      setSeeding(true);
      toast.loading("Seeding sample data...");

      // 0. Add Technical Templates
      await addTechnicalTemplate({
        category: "Systems",
        subCategory: "Industrial Ball Valve",
        parameters: [
          { name: "size", label: "Nominal Size", type: "select", options: ["1/2\"", "3/4\"", "1\"", "2\"", "4\"", "6\""], required: true },
          { name: "pressure_rating", label: "Pressure Rating", type: "select", options: ["150#", "300#", "600#", "900#"], required: true },
          { name: "body_material", label: "Body Material", type: "select", options: ["SS304", "SS316", "WCB (Carbon Steel)", "Duplex"], required: true },
          { name: "seal_material", label: "Seal Material", type: "select", options: ["PTFE", "RPTFE", "Viton", "Graphite"], required: true },
          { name: "end_connection", label: "End Connection", type: "select", options: ["Flanged", "Threaded", "Socket Weld", "Butt Weld"], required: true }
        ]
      });
      
      // 1. Create BDMs for each industry
      const industries: Industry[] = ["Defence", "Locomotive", "Industrial", "Automobile", "Other"];
      const bdms: UserProfile[] = industries.map((ind) => ({
        uid: `bdm_${ind.toLowerCase()}`,
        email: `bdm.${ind.toLowerCase()}@sensorcrm.com`,
        displayName: `${ind} BDM`,
        role: 'BDM',
        assignedIndustry: ind,
        isActive: true
      }));

      for (const bdm of bdms) {
        await createUserProfile(bdm);
      }

      // 2. Add Sample Customers
      const sampleCustomers: Omit<Customer, 'id' | 'createdAt'>[] = [
        { 
          customerId: 'CUST-BEL',
          name: "Bharat Electronics Ltd", 
          customerType: "OEM", 
          contactPersons: [{ name: "Mr. Sharma", email: "sharma@bel.co.in", phone: "9876543210" }], 
          industry: "Defence", 
          region: "Domestic",
          address: "Bangalore, India",
          createdBy: "System Seed"
        }
      ];

      for (const cust of sampleCustomers) {
        await addCustomer(cust);
      }

      toast.dismiss();
      toast.success("Sample data seeded successfully!");
    } catch (err: any) {
      toast.dismiss();
      toast.error("Seeding failed: " + err.message);
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    try {
      const history = await backupService.getBackupHistory();
      setBackups(history);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleExportAll = async () => {
    if (!user || profile?.role !== 'Admin') {
      toast.error("Unauthorized: Admin access required");
      return;
    }

    setExporting(true);
    try {
      const wb = XLSX.utils.book_new();

      // Helper to format data for Excel
      const prepareData = (data: any[]) => {
        return data.map(item => {
          const newItem = { ...item };
          // Convert Timestamps to strings
          Object.keys(newItem).forEach(key => {
            if (newItem[key] && typeof newItem[key] === 'object' && 'toDate' in newItem[key]) {
              newItem[key] = newItem[key].toDate().toLocaleString();
            }
          });
          return newItem;
        });
      };

      // Add sheets
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prepareData(leads)), "Leads");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prepareData(customers)), "Customers");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prepareData(parts)), "Parts");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prepareData(tasks)), "Tasks");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prepareData(debtors)), "Debtors");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prepareData(quotes)), "Quotations");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prepareData(designReviews)), "Design Reviews");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prepareData(feasibilityForms)), "Feasibility");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prepareData(complaints)), "Complaints");
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(prepareData(employees)), "Employees");

      // Save file
      const fileName = `SensorCRM_Global_Backup_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(wb, fileName);

      // Record backup in Firestore
      const totalRecords = leads.length + customers.length + parts.length + tasks.length + debtors.length;
      await backupService.triggerManualBackup(
        profile.displayName || profile.email,
        user.uid,
        { collections: 10, records: totalRecords }
      );
      
      toast.success("Full system backup exported successfully");
      fetchBackups();
    } catch (err: any) {
      toast.error("Export failed: " + err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 border-none shadow-sm overflow-hidden bg-white">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Database className="text-primary h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">Full System Data Export</CardTitle>
                  <CardDescription>Generate a comprehensive multi-sheet Excel backup of all CRM records.</CardDescription>
                </div>
              </div>
              <Button 
                onClick={handleExportAll} 
                className="shadow-sm"
                disabled={exporting}
              >
                {exporting ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Run Full Export
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Leads</p>
                <p className="text-2xl font-bold text-slate-900">{leads.length}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Customers</p>
                <p className="text-2xl font-bold text-slate-900">{customers.length}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Tasks</p>
                <p className="text-2xl font-bold text-slate-900">{tasks.length}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs text-slate-500 font-bold uppercase mb-1">Masters</p>
                <p className="text-2xl font-bold text-slate-900">{parts.length + technicalTemplates.length}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-4">
              <div className="bg-amber-100 p-2 rounded-lg h-fit">
                <AlertTriangle className="text-amber-600 h-5 w-5" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-amber-900 uppercase">Export Security Notice</p>
                <p className="text-xs text-amber-700 leading-relaxed">
                  Full system exports contain sensitive customer and operational data. Every export activity is logged in the audit trail with the administrator's ID and timestamp. Ensure local storage of these files complies with company security policies.
                </p>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900">System Initialization</h4>
                  <p className="text-sm text-slate-500">Seed the system with sample master data and user profiles for testing.</p>
                </div>
                <Button variant="outline" onClick={seedSampleData} disabled={seeding}>
                  {seeding ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                  Seed Sample Data
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Clock className="text-slate-400 h-5 w-5" />
              <CardTitle className="text-lg">Scheduled Backups</CardTitle>
            </div>
            <CardDescription>Daily automated data snapshots</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle2 size={16} />
                <span className="text-sm font-medium">Automatic Backups Active</span>
              </div>
              <Badge className="bg-green-100 text-green-700 border-none">Daily 00:00</Badge>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase">
                <History size={14} />
                Recent Snapshot Activity
              </div>
              <div className="space-y-2">
                {backups.slice(0, 5).map(backup => (
                  <div key={backup.id} className="p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-700">{backup.type} Snapshot</span>
                      <Badge variant="outline" className="text-[10px] h-4 py-0">{backup.status}</Badge>
                    </div>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock size={10} />
                      {backup.createdAt ? format(backup.createdAt.toDate(), 'PPp') : 'N/A'}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-slate-400">Records: {backup.totalRecords}</span>
                      <span className="text-[10px] text-slate-400 italic">By {backup.createdBy}</span>
                    </div>
                  </div>
                ))}
                {backups.length === 0 && (
                  <div className="text-center py-6 text-slate-400 text-xs italic">
                    No backup logs found yet.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
