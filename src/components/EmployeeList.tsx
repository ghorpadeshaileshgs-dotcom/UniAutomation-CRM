import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, UserCircle, Mail, Phone, Building2, Briefcase, Shield, Upload } from 'lucide-react';
import { Employee, Department } from '../types';
import { Button } from '@/components/ui/button';
import { EmployeeForm } from './EmployeeForm';
import { BulkEmployeeUpload } from './BulkEmployeeUpload';
import { toast } from 'sonner';

interface EmployeeListProps {
  employees: Employee[];
  departments: Department[];
  onAdd: (employee: Omit<Employee, 'id' | 'createdAt'>) => Promise<any>;
  onUpdate: (id: string, employee: Partial<Employee>) => Promise<any>;
  onDelete: (id: string) => Promise<any>;
}

export const EmployeeList: React.FC<EmployeeListProps> = ({
  employees,
  departments,
  onAdd,
  onUpdate,
  onDelete
}) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.departmentName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (emp: Employee) => {
    setEditingEmployee(emp);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this employee?')) {
      try {
        await onDelete(id);
      } catch (error) {
        console.error('Error deleting employee:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Employee Master</h2>
          <p className="text-gray-500">Manage staff members and their roles</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setIsBulkOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Upload
          </Button>
          <Button onClick={() => { setEditingEmployee(null); setIsFormOpen(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Employee
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search employees by name, ID, email or department..."
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Department & Role</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEmployees.map((emp) => (
                <tr key={emp.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <UserCircle className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{emp.name}</div>
                        <div className="text-xs text-gray-500 font-mono">{emp.employeeId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-600 gap-2">
                        <Mail className="w-3 h-3" />
                        {emp.email}
                      </div>
                      {emp.phone && (
                        <div className="flex items-center text-sm text-gray-600 gap-2">
                          <Phone className="w-3 h-3" />
                          {emp.phone}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center text-sm text-gray-900 gap-2">
                        <Building2 className="w-3 h-3 text-gray-400" />
                        {emp.departmentName}
                      </div>
                      <div className="flex items-center text-xs text-gray-500 gap-2">
                        <Shield className="w-3 h-3 text-gray-400" />
                        {emp.role} • {emp.designation}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      emp.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {emp.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleEdit(emp)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(emp.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                    No employees found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <EmployeeForm
          employee={editingEmployee}
          departments={departments}
          onClose={() => setIsFormOpen(false)}
          onSubmit={async (data) => {
            try {
              if (editingEmployee) {
                await onUpdate(editingEmployee.id, data);
                toast.success('Employee updated successfully');
              } else {
                await onAdd(data);
                toast.success('Employee added successfully');
              }
              setIsFormOpen(false);
              setEditingEmployee(null);
            } catch (err: any) {
              toast.error('Failed to save employee: ' + err.message);
            }
          }}
        />
      )}

      {isBulkOpen && (
        <BulkEmployeeUpload
          departments={departments}
          onClose={() => setIsBulkOpen(false)}
          onUpload={async (employees) => {
            for (const emp of employees) {
              await onAdd(emp);
            }
            setIsBulkOpen(false);
          }}
        />
      )}
    </div>
  );
};
