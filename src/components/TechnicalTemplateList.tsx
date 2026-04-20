import React, { useState } from 'react';
import { TechnicalTemplate } from '../types';
import { Button } from '@/components/ui/button';
import { Plus, Search, Edit2, Trash2, Settings2 } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TechnicalTemplateListProps {
  templates: TechnicalTemplate[];
  onAdd: () => void;
  onEdit: (template: TechnicalTemplate) => void;
  onDelete: (id: string) => void;
}

export default function TechnicalTemplateList({ templates, onAdd, onEdit, onDelete }: TechnicalTemplateListProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = templates.filter(t => 
    t.category.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.subCategory.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input 
            placeholder="Search templates..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <Button onClick={onAdd} className="gap-2">
          <Plus size={18} />
          Create Template
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-bold">Category</TableHead>
              <TableHead className="font-bold">Sub-Category</TableHead>
              <TableHead className="font-bold">Parameters</TableHead>
              <TableHead className="font-bold">Last Updated</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-slate-400 italic">
                  No technical templates defined. Create templates to enable feasibility reviews.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((template) => (
                <TableRow key={template.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="font-medium text-slate-900">{template.category}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100 uppercase text-[10px] font-bold">
                      {template.subCategory}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex -space-x-2">
                      {template.parameters.slice(0, 5).map((p, i) => (
                        <div key={i} className="h-6 w-16 bg-slate-100 border border-white rounded px-1 flex items-center justify-center overflow-hidden">
                          <span className="text-[8px] truncate uppercase font-bold text-slate-500">{p.label}</span>
                        </div>
                      ))}
                      {template.parameters.length > 5 && (
                        <div className="h-6 w-8 bg-slate-200 border border-white rounded px-1 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-slate-600">+{template.parameters.length - 5}</span>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs">
                    {template.createdAt ? new Date(template.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-primary" onClick={() => onEdit(template)}>
                        <Edit2 size={16} />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => onDelete(template.id)}>
                        <Trash2 size={16} />
                      </Button>
                    </div>
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
