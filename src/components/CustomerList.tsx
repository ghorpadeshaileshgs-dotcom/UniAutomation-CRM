import React, { useState } from 'react';
import { Customer } from '../types';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, FileText, MoreVertical, Plus, UserPlus, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import CustomerForm from './CustomerForm';
import BulkUpload from './BulkUpload';

interface CustomerListProps {
  customers: Customer[];
  userRole?: string;
  onCreateQuote: (customer: Customer) => void;
  onCreateComplaint: (customer: Customer) => void;
}

export default function CustomerList({ customers, userRole, onCreateQuote, onCreateComplaint }: CustomerListProps) {
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();

  const canManage = userRole === 'Admin' || userRole === 'Sales';

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800">Customer Master</h3>
        {canManage && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowBulkUpload(true)}>
              <Upload size={18} className="mr-2" />
              Bulk Upload
            </Button>
            <Button onClick={() => { setSelectedCustomer(undefined); setShowForm(true); }}>
              <UserPlus size={18} className="mr-2" />
              Add Customer
            </Button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold">ID</TableHead>
              <TableHead className="font-semibold">Name</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Industry</TableHead>
              <TableHead className="font-semibold">Region</TableHead>
              <TableHead className="font-semibold">Contacts</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                  No customers found. Click "Add Customer" to start.
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-mono text-xs">{customer.customerId}</TableCell>
                  <TableCell className="font-medium text-slate-900">{customer.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">
                      {customer.customerType}
                    </Badge>
                  </TableCell>
                  <TableCell>{customer.industry}</TableCell>
                  <TableCell>{customer.region}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="text-sm">{customer.contactPersons[0]?.name}</span>
                      <span className="text-xs text-slate-500">{customer.contactPersons[0]?.email}</span>
                      {customer.contactPersons.length > 1 && (
                        <span className="text-[10px] text-primary font-medium">+{customer.contactPersons.length - 1} more</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {canManage && (
                          <DropdownMenuItem onClick={() => { setSelectedCustomer(customer); setShowForm(true); }}>
                            Edit Customer
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onCreateQuote(customer)}>
                          <FileText size={14} className="mr-2 text-blue-600" />
                          Create Quote
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onCreateComplaint(customer)}>
                          <AlertCircle size={14} className="mr-2 text-red-600" />
                          Register Complaint
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showBulkUpload && (
        <BulkUpload 
          initialType="Customers" 
          onClose={() => setShowBulkUpload(false)} 
        />
      )}

      {showForm && (
        <CustomerForm 
          customer={selectedCustomer} 
          onClose={() => setShowForm(false)} 
        />
      )}
    </div>
  );
}
