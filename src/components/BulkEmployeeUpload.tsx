import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Employee, Department } from '../types';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';

interface BulkEmployeeUploadProps {
  departments: Department[];
  onClose: () => void;
  onUpload: (employees: Omit<Employee, 'id' | 'createdAt'>[]) => Promise<void>;
}

export const BulkEmployeeUpload: React.FC<BulkEmployeeUploadProps> = ({
  departments,
  onClose,
  onUpload
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        setPreview(jsonData);
        setError(null);
      } catch (err) {
        setError('Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleUpload = async () => {
    if (!preview.length) return;

    setIsProcessing(true);
    setError(null);

    try {
      const employees: Omit<Employee, 'id' | 'createdAt'>[] = preview.map((row: any) => {
        const deptName = row.Department || '';
        const dept = departments.find(d => d.name.toLowerCase() === deptName.toLowerCase());
        
        if (!dept) {
          throw new Error(`Department "${deptName}" not found for employee ${row.Name}. Please create the department first.`);
        }

        return {
          employeeId: String(row.EmployeeID || ''),
          name: String(row.Name || ''),
          email: String(row.Email || ''),
          phone: String(row.Phone || ''),
          departmentId: dept.id,
          departmentName: dept.name,
          designation: String(row.Designation || ''),
          role: (row.Role || 'Sales') as any,
          status: (row.Status || 'Active') as any,
          joiningDate: row.JoiningDate ? new Date(row.JoiningDate) : undefined
        } as any;
      });

      await onUpload(employees);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to upload employees. Please check the data format.');
    } finally {
      setIsProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        EmployeeID: 'EMP001',
        Name: 'John Doe',
        Email: 'john@example.com',
        Phone: '9876543210',
        Department: 'Sales',
        Designation: 'Sales Manager',
        Role: 'Sales',
        Status: 'Active',
        JoiningDate: '2024-01-15'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'Employee_Import_Template.xlsx');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Bulk Employee Upload</h3>
              <p className="text-xs text-gray-500">Upload multiple employees via Excel</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-blue-600" />
              <div className="text-sm text-blue-800">
                Download the template to ensure correct data format.
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={downloadTemplate} className="bg-white">
              Download Template
            </Button>
          </div>

          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              file ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
            />
            <div className="flex flex-col items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                file ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-400'
              }`}>
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {file ? file.name : 'Click to upload or drag and drop'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Excel files (.xlsx, .xls) only</p>
              </div>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-50 rounded-xl border border-red-100 text-red-800 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {preview.length > 0 && !error && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  Preview ({preview.length} records found)
                </h4>
              </div>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 font-semibold text-gray-600">ID</th>
                      <th className="px-4 py-2 font-semibold text-gray-600">Name</th>
                      <th className="px-4 py-2 font-semibold text-gray-600">Email</th>
                      <th className="px-4 py-2 font-semibold text-gray-600">Department</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {preview.slice(0, 5).map((row, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2 text-gray-600">{row.EmployeeID}</td>
                        <td className="px-4 py-2 text-gray-900 font-medium">{row.Name}</td>
                        <td className="px-4 py-2 text-gray-600">{row.Email}</td>
                        <td className="px-4 py-2 text-gray-600">{row.Department}</td>
                      </tr>
                    ))}
                    {preview.length > 5 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-2 text-center text-gray-400 italic">
                          And {preview.length - 5} more records...
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={!preview.length || isProcessing || !!error}
          >
            {isProcessing ? 'Uploading...' : `Upload ${preview.length} Employees`}
          </Button>
        </div>
      </div>
    </div>
  );
};
