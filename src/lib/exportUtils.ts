import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { Document, Packer, Paragraph, TextRun, Table, TableCell, TableRow, WidthType, AlignmentType, HeadingLevel } from 'docx';

// Extend jsPDF with autotable types
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

export type ExportData = Record<string, any>[];

export const formatValue = (val: any): string => {
  if (val === null || val === undefined) return '';
  if (val instanceof Date) return val.toLocaleDateString();
  if (typeof val === 'object' && val.seconds) { // Firestore Timestamp
    return new Date(val.seconds * 1000).toLocaleDateString();
  }
  return String(val);
};

// Standard styling constants
const COLORS = {
  primary: [15, 23, 42], // slate-900
  secondary: [241, 245, 249], // slate-100
  text: [30, 41, 59], // slate-800
  muted: [100, 116, 139] // slate-500
};

const drawStandardHeader = (doc: jsPDF, title: string, subtitle?: string) => {
  const margin = 14;
  const pageWidth = doc.internal.pageSize.width;

  // Header Box
  doc.setFillColor(COLORS.primary[0], COLORS.primary[1], COLORS.primary[2]);
  doc.rect(0, 0, pageWidth, 40, 'F');

  // Logo Placeholder / Brand Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('SENSOR CRM', margin, 25);

  // Document Title
  doc.setFontSize(14);
  doc.setFont('helvetica', 'normal');
  doc.text(title.toUpperCase(), pageWidth - margin, 25, { align: 'right' });

  if (subtitle) {
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text(subtitle, pageWidth - margin, 32, { align: 'right' });
  }

  // Current Date
  doc.setFontSize(8);
  doc.setTextColor(200, 200, 200);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, margin, 35);
  
  return 45; // Next Y coordinate
};

export const exportToExcel = (data: ExportData, fileName: string) => {
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Set column widths
  const maxLengths = data.reduce((acc: any, row: any) => {
    Object.keys(row).forEach((key, i) => {
      const val = formatValue(row[key]);
      acc[i] = Math.max(acc[i] || 0, val.length, key.length);
    });
    return acc;
  }, []);

  worksheet['!cols'] = maxLengths.map((w: number) => ({ w: Math.min(w + 2, 50) }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
  saveAs(blob, `${fileName}.xlsx`);
};

export const exportToPDF = (data: ExportData, fileName: string, title: string, subtitle?: string) => {
  const doc = new jsPDF();
  const startY = drawStandardHeader(doc, title, subtitle);

  const headers = Object.keys(data[0] || {});
  const body = data.map(item => headers.map(h => formatValue(item[h])));

  doc.autoTable({
    startY: startY,
    head: [headers.map(h => h.charAt(0).toUpperCase() + h.slice(1).replace(/_/g, ' '))],
    body: body,
    styles: { 
      fontSize: 9, 
      cellPadding: 3,
      lineColor: [230, 230, 230],
      lineWidth: 0.1
    },
    headStyles: { 
      fillColor: COLORS.primary, 
      textColor: [255, 255, 255],
      fontStyle: 'bold'
    },
    alternateRowStyles: { 
      fillColor: [250, 250, 250] 
    },
    margin: { left: 14, right: 14 }
  });

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  doc.setFontSize(8);
  doc.setTextColor(COLORS.muted[0], COLORS.muted[1], COLORS.muted[2]);
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Page ${i} of ${pageCount} - Confidential Technical Document - ${new Date().getFullYear()} Sensor CRM`,
      doc.internal.pageSize.width / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  doc.save(`${fileName}.pdf`);
};

export const exportToWord = async (data: ExportData, fileName: string, title: string) => {
  const headers = Object.keys(data[0] || {});
  
  const tableRows = [
    new TableRow({
      children: headers.map(h => new TableCell({
        children: [new Paragraph({ 
          children: [new TextRun({ text: h.charAt(0).toUpperCase() + h.slice(1).replace(/_/g, ' '), bold: true, color: "FFFFFF" })],
          alignment: AlignmentType.CENTER
        })],
        shading: { fill: "0F172A" },
        verticalAlign: AlignmentType.CENTER
      }))
    }),
    ...data.map(item => new TableRow({
      children: headers.map(h => new TableCell({
        children: [new Paragraph({ text: formatValue(item[h]) })],
        verticalAlign: AlignmentType.CENTER,
        margins: { top: 100, bottom: 100, left: 100, right: 100 }
      }))
    }))
  ];

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: title,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        new Paragraph({ 
          children: [
            new TextRun({ text: "SENSOR CRM - PROFESSIONAL EXPORT", bold: true, color: "64748b" })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({ 
          text: `Generated on: ${new Date().toLocaleDateString()}`, 
          spacing: { after: 400 },
          alignment: AlignmentType.RIGHT
        }),
        new Table({
          rows: tableRows,
          width: { size: 100, type: WidthType.PERCENTAGE }
        }),
        new Paragraph({
          text: "\nThis document is electronically generated and remains property of Sensor CRM.",
          alignment: AlignmentType.CENTER,
          spacing: { before: 1000 }
        })
      ],
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileName}.docx`);
};
