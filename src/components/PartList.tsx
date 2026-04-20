import React, { useState } from 'react';
import { Part } from '../types';
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
import { FilePlus, MoreVertical, ShieldCheck, ShieldAlert, Upload } from 'lucide-react';
import { format } from 'date-fns';
import PartForm from './PartForm';
import BulkUpload from './BulkUpload';

interface PartListProps {
  parts: Part[];
}

export default function PartList({ parts }: PartListProps) {
  const [showForm, setShowForm] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [selectedPart, setSelectedPart] = useState<Part | undefined>();

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800">Part / Product Master</h3>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowBulkUpload(true)}>
            <Upload size={18} className="mr-2" />
            Bulk Upload
          </Button>
          <Button onClick={() => { setSelectedPart(undefined); setShowForm(true); }}>
            <FilePlus size={18} className="mr-2" />
            Add Part
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold">Part ID</TableHead>
              <TableHead className="font-semibold">Part Name</TableHead>
              <TableHead className="font-semibold">Category</TableHead>
              <TableHead className="font-semibold">Sub-Category</TableHead>
              <TableHead className="font-semibold">Status</TableHead>
              <TableHead className="font-semibold">Added On</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {parts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                  No parts found. Click "Add Part" to start.
                </TableCell>
              </TableRow>
            ) : (
              parts.map((part) => (
                <TableRow key={part.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-mono text-xs">{part.partId}</TableCell>
                  <TableCell className="font-medium text-slate-900">{part.partName}</TableCell>
                  <TableCell>{part.category}</TableCell>
                  <TableCell>{part.subCategory}</TableCell>
                  <TableCell>
                    {part.standard ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-100 gap-1">
                        <ShieldCheck size={12} />
                        Standard
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-100 gap-1">
                        <ShieldAlert size={12} />
                        Non-Standard
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-500 text-sm">
                    {format(part.createdAt.toDate(), 'MMM dd')}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {showBulkUpload && (
        <BulkUpload 
          initialType="Parts" 
          onClose={() => setShowBulkUpload(false)} 
        />
      )}

      {showForm && (
        <PartForm 
          part={selectedPart} 
          onClose={() => setShowForm(false)} 
        />
      )}
    </div>
  );
}
