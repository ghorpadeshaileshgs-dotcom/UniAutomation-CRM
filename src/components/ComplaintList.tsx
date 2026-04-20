import React, { useState } from 'react';
import { Complaint, ComplaintSeverity, ComplaintStatus } from '../types';
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
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Plus, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  MoreVertical,
  Eye,
  Trash2,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';

interface ComplaintListProps {
  complaints: Complaint[];
  onView: (complaint: Complaint) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

import ExportActions from './ExportActions';

export default function ComplaintList({ complaints, onView, onDelete, onAdd }: ComplaintListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredComplaints = complaints.filter(c => 
    c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.complaintId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.productType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const exportData = React.useMemo(() => {
    return filteredComplaints.map(c => ({
      complaint_id: c.complaintId,
      customer: c.customerName,
      product: c.productType,
      severity: c.severity,
      status: c.status,
      date: c.complaintDate,
      description: c.description
    }));
  }, [filteredComplaints]);

  const getSeverityColor = (severity: ComplaintSeverity) => {
    switch (severity) {
      case 'Critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'Major': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Minor': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusBadge = (status: ComplaintStatus) => {
    switch (status) {
      case 'Open': return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">Open</Badge>;
      case 'Under Investigation': return <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">Investigating</Badge>;
      case 'Action Implemented': return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Action Taken</Badge>;
      case 'Closed': return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Closed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder="Search complaints, customers, products..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <ExportActions data={exportData} fileName="complaints_report" title="Customer Complaints Report" />
          <Button onClick={onAdd} className="flex-1 sm:flex-initial">
            <Plus size={18} className="mr-2" />
            Register Complaint
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold">Complaint ID</TableHead>
              <TableHead className="font-semibold">Customer</TableHead>
              <TableHead className="font-semibold">Type</TableHead>
              <TableHead className="font-semibold">Severity</TableHead>
              <TableHead className="font-semibold">Date</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Assigned To</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredComplaints.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-slate-500">
                  No complaints found.
                </TableCell>
              </TableRow>
            ) : (
              filteredComplaints.map((complaint) => (
                <TableRow key={complaint.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-mono text-xs font-bold text-slate-600">
                    {complaint.complaintId}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-900">{complaint.customerName}</span>
                      <span className="text-xs text-slate-500">{complaint.productType}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-slate-600">{complaint.complaintType}</TableCell>
                  <TableCell>
                    <Badge className={getSeverityColor(complaint.severity)}>
                      {complaint.severity}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {format(complaint.complaintDate.toDate(), 'MMM dd, yyyy')}
                  </TableCell>
                  <TableCell>{getStatusBadge(complaint.status)}</TableCell>
                  <TableCell className="text-sm text-slate-600">
                    {complaint.assignedTo || 'Unassigned'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <MoreVertical size={18} />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onView(complaint)}>
                          <Eye size={14} className="mr-2 text-blue-600" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDelete(complaint.id)} className="text-red-600">
                          <Trash2 size={14} className="mr-2" />
                          Delete
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
    </div>
  );
}
