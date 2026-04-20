import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Upload, FileSpreadsheet, FileText, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Lead, UserProfile, Industry, Customer, Debtor, Quote, Complaint } from '../types';
import { toast } from 'sonner';
import { useFirebase } from '../hooks/useFirebase';
import { Timestamp } from 'firebase/firestore';
import { Database, Sparkles } from 'lucide-react';

interface ImportExportProps {
  leads: Lead[];
  quotes: Quote[];
  complaints: Complaint[];
}

export default function ImportExport({ leads, quotes, complaints }: ImportExportProps) {
  const { addLead, createUserProfile, addCustomer, addDebtor, addDesignReview, addTechnicalTemplate } = useFirebase();

  const seedSampleData = async () => {
    try {
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

      await addTechnicalTemplate({
        category: "Systems",
        subCategory: "Centrifugal Pump",
        parameters: [
          { name: "flow_rate", label: "Design Flow Rate (m³/hr)", type: "number", required: true },
          { name: "head", label: "Design Head (meters)", type: "number", required: true },
          { name: "motor_power", label: "Motor Power (kW)", type: "select", options: ["0.75", "1.5", "2.2", "4", "5.5", "7.5", "11"], required: true },
          { name: "casing_material", label: "Casing Material", type: "select", options: ["Cast Iron", "SS316", "Bronze"], required: true }
        ]
      });
      
      // 1. Create BDMs for each industry
      const industries: Industry[] = ["Defence", "Locomotive", "Industrial", "Automobile", "Other"];
      const bdms: UserProfile[] = industries.map((ind, idx) => ({
        uid: `bdm_${ind.toLowerCase()}`,
        email: `bdm.${ind.toLowerCase()}@sensorcrm.com`,
        displayName: `${ind} BDM`,
        role: 'BDM',
        assignedIndustry: ind,
        isActive: true
      }));

      // Add Sales Support
      bdms.push({
        uid: 'sales_support_1',
        email: 'support@sensorcrm.com',
        displayName: 'Sales Support Specialist',
        role: 'Sales Support',
        isActive: true
      });

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
        },
        { 
          customerId: 'CUST-IR',
          name: "Indian Railways", 
          customerType: "OEM", 
          contactPersons: [{ name: "Mr. Gupta", email: "gupta@railways.gov.in", phone: "9988776655" }], 
          industry: "Locomotive", 
          region: "Domestic",
          address: "New Delhi, India",
          createdBy: "System Seed"
        },
        { 
          customerId: 'CUST-TATA',
          name: "Tata Motors", 
          customerType: "OEM", 
          contactPersons: [{ name: "Ms. Iyer", email: "iyer@tata.com", phone: "9123456780" }], 
          industry: "Automobile", 
          region: "Domestic",
          address: "Pune, India",
          createdBy: "System Seed"
        },
        { 
          customerId: 'CUST-SIE',
          name: "Siemens AG", 
          customerType: "Design House", 
          contactPersons: [{ name: "Hans Müller", email: "hans@siemens.com", phone: "+4912345678" }], 
          industry: "Industrial", 
          region: "Export",
          address: "Germany",
          createdBy: "System Seed"
        }
      ];

      for (const cust of sampleCustomers) {
        await addCustomer(cust);
      }

      // 3. Add Sample Leads (Auto-assigned to BDMs)
      const sampleLeads: Omit<Lead, 'id' | 'createdAt'>[] = [
        { 
          customerId: 'CUST-DRDO',
          customerName: "DRDO Project X", 
          customerType: "Project",
          partId: 'PART-001',
          partName: 'Pressure Transducer',
          contactPerson: "Dr. Reddy", 
          industry: "Defence", 
          region: "Domestic", 
          productType: "Pressure Sensors", 
          productCategory: "New Development",
          stage: "Quoted", 
          salespersonName: "Defence BDM", 
          salespersonId: "bdm_defence",
          source: "Visit", 
          estimatedValue: 2500000, 
          probability: 60, 
          priority: 'High',
          quoteCreated: true, 
          poReceived: false 
        },
        { 
          customerId: 'CUST-METRO',
          customerName: "Metro Rail Expansion", 
          customerType: "Project",
          partId: 'PART-002',
          partName: 'Speed Sensor Assembly',
          contactPerson: "Mr. Singh", 
          industry: "Locomotive", 
          region: "Domestic", 
          productType: "Speed Sensors", 
          productCategory: "Variant",
          stage: "Negotiation", 
          salespersonName: "Locomotive BDM", 
          salespersonId: "bdm_locomotive",
          source: "Reference", 
          estimatedValue: 4500000, 
          probability: 80, 
          priority: 'High',
          quoteCreated: true, 
          poReceived: false 
        }
      ];

      const createdLeads = [];
      for (const lead of sampleLeads) {
        const docRef = await addLead(lead);
        createdLeads.push({ id: docRef.id, ...lead });
      }

      // 4. Add Sample Debtors
      const sampleDebtors: Omit<Debtor, 'id'>[] = [
        { 
          customerName: "Bharat Electronics Ltd", 
          invoiceNumber: "INV-2024-001", 
          invoiceDate: Timestamp.now(), 
          amount: 1200000, 
          dueDate: Timestamp.fromDate(new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)), // 5 days ago
          status: "Pending", 
          salespersonName: "Defence BDM", 
          salespersonId: "bdm_defence" 
        }
      ];

      for (const debtor of sampleDebtors) {
        await addDebtor(debtor);
      }

      // 5. Add Sample Design Reviews
      if (createdLeads.length > 0) {
        await addDesignReview({
          leadId: createdLeads[0].id,
          customerName: createdLeads[0].customerName,
          requestedBy: "Defence BDM",
          requestedById: "bdm_defence",
          assignedTo: "Sales Support Specialist",
          assignedToId: "sales_support_1",
          requestDate: Timestamp.now(),
          requirementSummary: "Need feasibility check for high-pressure variant.",
          feasibilityStatus: "Pending",
          status: 'Pending',
          slaDays: 3,
          isDelayed: false
        });
      }

      toast.dismiss();
      toast.success("Sample data seeded successfully!");
    } catch (err: any) {
      toast.dismiss();
      toast.error("Seeding failed: " + err.message);
    }
  };

  const handleExport = () => {
    if (leads.length === 0) {
      toast.error("No data to export");
      return;
    }

    const exportData = leads.map(l => ({
      'Lead ID': l.id,
      'Customer Name': l.customerName,
      'Contact Person': l.contactPerson,
      'Industry': l.industry,
      'Region': l.region,
      'Product Type': l.productType,
      'Stage': l.stage,
      'Sales Person': l.salespersonName,
      'Source': l.source,
      'Estimated Value': l.estimatedValue,
      'Probability %': l.probability,
      'Quote Created': l.quoteCreated ? 'Yes' : 'No',
      'PO Received': l.poReceived ? 'Yes' : 'No',
      'Created At': l.createdAt.toDate().toISOString()
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Leads");
    XLSX.writeFile(wb, `SensorCRM_Leads_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Exported successfully");
  };

  const handleExportQuotes = () => {
    if (quotes.length === 0) {
      toast.error("No quotes to export");
      return;
    }

    const exportData = quotes.map(q => ({
      'Quote Number': q.quoteNumber,
      'Customer': q.customerName,
      'Contact': q.contactPerson,
      'Date': q.date.toDate().toISOString(),
      'Valid Until': q.validUntil.toDate().toISOString(),
      'Total Amount': q.totalAmount,
      'Status': q.status,
      'Created By': q.createdBy
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Quotations");
    XLSX.writeFile(wb, `SensorCRM_Quotes_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Quotes exported successfully");
  };

  const handleExportComplaints = () => {
    if (complaints.length === 0) {
      toast.error("No complaints to export");
      return;
    }

    const exportData = complaints.map(c => ({
      'Complaint ID': c.complaintId,
      'Customer': c.customerName,
      'Date': c.complaintDate.toDate().toISOString(),
      'Type': c.complaintType,
      'Severity': c.severity,
      'Status': c.status,
      'Assigned To': c.assignedTo,
      'Turnaround (Days)': c.turnaroundTime || 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Complaints");
    XLSX.writeFile(wb, `SensorCRM_Complaints_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Complaints exported successfully");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        let count = 0;
        for (const row of data) {
          await addLead({
            customerId: row['Customer ID'] || row['customerId'] || '',
            customerName: row['Customer Name'] || row['customerName'] || 'Unknown',
            customerType: (row['Customer Type'] || row['customerType'] || 'OEM') as any,
            partId: row['Part ID'] || row['partId'] || '',
            partName: row['Part Name'] || row['partName'] || '',
            contactPerson: row['Contact Person'] || row['contactPerson'] || 'N/A',
            industry: (row['Industry'] || 'Other') as any,
            region: (row['Region'] || 'Domestic') as any,
            productType: row['Product Type'] || '',
            productCategory: (row['Product Category'] || 'Standard') as any,
            stage: (row['Stage'] || 'Lead') as any,
            salespersonName: row['Sales Person'] || 'Imported',
            salespersonId: row['Sales Person ID'] || row['salespersonId'] || '',
            source: (row['Source'] || 'Email') as any,
            priority: (row['Priority'] || 'Medium') as any,
            estimatedValue: parseFloat(row['Estimated Value'] || 0),
            probability: parseInt(row['Probability %'] || 10),
            quoteCreated: row['Quote Created'] === 'Yes',
            poReceived: row['PO Received'] === 'Yes',
          });
          count++;
        }
        toast.success(`Successfully imported ${count} leads`);
      } catch (err: any) {
        toast.error("Import failed: " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <Card className="border-none shadow-sm md:col-span-2 bg-gradient-to-r from-indigo-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <Sparkles className="text-indigo-600" />
            Quick Start: Seed Sample Data
          </CardTitle>
          <CardDescription className="text-indigo-700">
            Populate the system with BDMs for every industry, sample customers, leads, and debtors to see the CRM in action.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={seedSampleData} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
            <Database className="mr-2 h-4 w-4" />
            Initialize Sample Sales Team & Data
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="text-blue-600" />
            Export Data
          </CardTitle>
          <CardDescription>
            Download all lead data in Excel format for reporting and analysis.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
            <FileSpreadsheet className="text-blue-600 shrink-0 mt-1" />
            <div className="text-sm text-blue-800">
              <p className="font-semibold">Full CRM Export</p>
              <p>Includes all lead fields, stages, and financial values.</p>
            </div>
          </div>
          <Button onClick={handleExport} className="w-full" variant="outline">
            Download .xlsx Report
          </Button>
          <Button onClick={handleExportQuotes} className="w-full" variant="outline">
            Download Quotes .xlsx
          </Button>
          <Button onClick={handleExportComplaints} className="w-full" variant="outline">
            Download Complaints .xlsx
          </Button>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="text-green-600" />
            Bulk Upload
          </CardTitle>
          <CardDescription>
            Upload leads in bulk using an Excel or CSV file.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-green-50 p-4 rounded-lg flex items-start gap-3">
            <AlertCircle className="text-green-600 shrink-0 mt-1" />
            <div className="text-sm text-green-800">
              <p className="font-semibold">Format Requirement</p>
              <p>Ensure columns match: Customer Name, Contact Person, Industry, Region, etc.</p>
            </div>
          </div>
          <div className="relative">
            <input 
              type="file" 
              accept=".xlsx, .xls, .csv" 
              onChange={handleImport}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <Button className="w-full" variant="outline">
              <FileText className="mr-2 h-4 w-4" />
              Select File to Upload
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
