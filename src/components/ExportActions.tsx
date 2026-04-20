import React from 'react';
import { Button } from '@/components/ui/button';
import { FileDown, FileText, Table as TableIcon, File as WordIcon } from 'lucide-react';
import { exportToExcel, exportToPDF, exportToWord, ExportData } from '../lib/exportUtils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ExportActionsProps {
  data: ExportData;
  fileName: string;
  title: string;
  subtitle?: string;
}

export default function ExportActions({ data, fileName, title, subtitle }: ExportActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <div className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-3 gap-2 cursor-pointer shadow-sm">
          <FileDown size={16} />
          Export
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => exportToPDF(data, fileName, title, subtitle)} className="gap-2 py-2 cursor-pointer">
          <FileText size={16} className="text-red-500" />
          <div className="flex flex-col">
            <span className="font-bold">PDF Format</span>
            <span className="text-[10px] text-slate-400">Professional layout</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportToExcel(data, fileName)} className="gap-2 py-2 cursor-pointer">
          <TableIcon size={16} className="text-green-600" />
          <div className="flex flex-col">
            <span className="font-bold">Excel Sheet</span>
            <span className="text-[10px] text-slate-400">Raw data structure</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportToWord(data, fileName, title)} className="gap-2 py-2 cursor-pointer">
          <WordIcon size={16} className="text-blue-600" />
          <div className="flex flex-col">
            <span className="font-bold">Word Document</span>
            <span className="text-[10px] text-slate-400">Editable format</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
