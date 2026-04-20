import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useFirebase } from '../hooks/useFirebase';
import { toast } from 'sonner';
import Papa from 'papaparse';
import { Timestamp } from 'firebase/firestore';
import { Upload, FileText, AlertCircle } from 'lucide-react';

interface BulkUploadProps {
  onClose: () => void;
  initialType?: UploadType;
}

type UploadType = 'Customers' | 'Parts' | 'Debtors';

export default function BulkUpload({ onClose, initialType }: BulkUploadProps) {
  const { addCustomer, addPart, addDebtor, team, customers, parts, debtors, profile } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [uploadType, setUploadType] = useState<UploadType>(initialType || 'Customers');
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const processUpload = async () => {
    if (!file) {
      toast.error("Please select a file");
      return;
    }

    // Role Check for Customers
    if (uploadType === 'Customers') {
      const canManage = profile?.role === 'Admin' || profile?.role === 'Sales';
      if (!canManage) {
        toast.error("You do not have permission to add customers");
        return;
      }
    }

    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const data = results.data as any[];
          let count = 0;
          let skipped = 0;

          for (const row of data) {
            if (uploadType === 'Customers') {
              const isDuplicate = customers.some(c => c.name.trim().toLowerCase() === row.name?.trim().toLowerCase());
              if (isDuplicate) {
                skipped++;
                continue;
              }

              await addCustomer({
                customerId: row.customerId || `CUST-${Date.now().toString().slice(-4)}`,
                name: row.name,
                customerType: row.customerType as any || 'OEM',
                contactPersons: row.contactPerson ? [{ name: row.contactPerson, email: row.email || '', phone: row.phone || '' }] : [],
                industry: row.industry as any || 'Industrial',
                region: row.region as any || 'Domestic',
                address: row.address || '',
                gstNumber: row.gstNumber || '',
                defaultQuoteFormat: row.defaultQuoteFormat as any || 'Standard',
                createdBy: 'System Import'
              });
            } else if (uploadType === 'Parts') {
              const isDuplicate = parts.some(p => 
                p.partName.trim().toLowerCase() === row.partName?.trim().toLowerCase() ||
                p.partId.trim().toLowerCase() === row.partId?.trim().toLowerCase()
              );
              if (isDuplicate) {
                skipped++;
                continue;
              }

              await addPart({
                partId: row.partId || `PART-${Date.now().toString().slice(-4)}`,
                partName: row.partName,
                category: row.category as any || 'Sensors',
                subCategory: row.subCategory || 'General',
                technology: row.technology || '',
                standard: row.standard === 'true' || row.standard === '1',
                unit: row.unit || 'Nos',
                description: row.description || ''
              });
            } else if (uploadType === 'Debtors') {
              const isDuplicate = debtors.some(d => d.invoiceNumber === row.invoiceNumber);
              if (isDuplicate) {
                skipped++;
                continue;
              }

              // Find sales person ID by name if provided, else use a default or row value
              const salesPersonName = row.salespersonName || row.salesPerson;
              const salesMember = team.find(m => (m.displayName || m.email) === salesPersonName);
              
              await addDebtor({
                customerName: row.customerName,
                invoiceNumber: row.invoiceNumber,
                invoiceDate: Timestamp.fromDate(new Date(row.invoiceDate)),
                amount: parseFloat(row.amount),
                dueDate: Timestamp.fromDate(new Date(row.dueDate)),
                status: row.status as any || 'Pending',
                salespersonName: salesPersonName || '',
                salespersonId: salesMember?.uid || row.salespersonId || row.salesPersonId || ''
              });
            }
            count++;
          }

          if (skipped > 0) {
            toast.success(`Uploaded ${count} items. Skipped ${skipped} duplicates.`);
          } else {
            toast.success(`Successfully uploaded ${count} ${uploadType}`);
          }
          onClose();
        } catch (err: any) {
          toast.error("Error processing file: " + err.message);
        } finally {
          setLoading(false);
        }
      },
      error: (err) => {
        toast.error("Error parsing CSV: " + err.message);
        setLoading(false);
      }
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload size={20} />
            Bulk Upload Data
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Upload Type</Label>
            <Select 
              value={uploadType} 
              onValueChange={v => setUploadType(v as UploadType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Customers">Customers (Existing/Potential)</SelectItem>
                <SelectItem value="Parts">Parts (Number/Name)</SelectItem>
                <SelectItem value="Debtors">Debtors List (Invoices)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <Label>Select CSV File</Label>
            <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer relative">
              <input 
                type="file" 
                accept=".csv" 
                className="absolute inset-0 opacity-0 cursor-pointer" 
                onChange={handleFileChange}
              />
              <div className="space-y-2">
                <FileText className="mx-auto text-slate-400" size={32} />
                <p className="text-sm text-slate-600">
                  {file ? file.name : "Click to select or drag and drop CSV file"}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-3">
            <AlertCircle className="text-amber-600 shrink-0" size={18} />
            <div className="text-xs text-amber-800 space-y-1">
              <p className="font-bold">CSV Format Requirements:</p>
              {uploadType === 'Customers' && <p>Headers: name, customerType, contactPerson, email, phone, industry, region, address, gstNumber, defaultQuoteFormat</p>}
              {uploadType === 'Parts' && <p>Headers: partId, partName, category, subCategory, standard, unit, description</p>}
              {uploadType === 'Debtors' && <p>Headers: customerName, invoiceNumber, invoiceDate, amount, dueDate, status, salespersonName</p>}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button onClick={processUpload} disabled={loading || !file}>
            {loading ? "Uploading..." : "Start Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
