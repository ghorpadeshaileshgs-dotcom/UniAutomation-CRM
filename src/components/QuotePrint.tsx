import React from 'react';
import { Quote } from '../types';
import { format } from 'date-fns';
import { Printer, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface QuotePrintProps {
  quote: Quote;
  onClose: () => void;
}

export const QuotePrint: React.FC<QuotePrintProps> = ({ quote, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto print:p-0 print:bg-white print:static print:block">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl min-h-[11in] p-8 md:p-12 relative print:shadow-none print:rounded-none print:w-full print:max-w-none">
        {/* Controls - Hidden during print */}
        <div className="absolute top-4 right-4 flex gap-2 print:hidden">
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Quote Content */}
        <div className="space-y-8">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-blue-600 pb-8">
            <div className="space-y-2">
              <h1 className="text-4xl font-black text-blue-600 tracking-tighter">SensorCRM</h1>
              <div className="text-sm text-gray-600 max-w-xs">
                Manufacturing Excellence in Sensors & Assemblies<br />
                123 Industrial Estate, Phase II,<br />
                Pune, Maharashtra - 411026
              </div>
            </div>
            <div className="text-right space-y-1">
              <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-widest">Quotation</h2>
              <div className="text-sm font-medium text-gray-500">#{quote.quoteNumber}</div>
              <div className="text-sm text-gray-600">Date: {format(quote.date.toDate(), 'dd MMM yyyy')}</div>
              <div className="text-sm text-gray-600 text-red-600 font-medium">Valid Until: {format(quote.validUntil.toDate(), 'dd MMM yyyy')}</div>
            </div>
          </div>

          {/* Addresses */}
          <div className="grid grid-cols-2 gap-12">
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Quote To:</h3>
              <div className="space-y-1">
                <div className="text-lg font-bold text-gray-900">{quote.customerName}</div>
                <div className="text-sm text-gray-600">Attn: {quote.contactPerson}</div>
              </div>
            </div>
            <div className="space-y-3 text-right">
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest">From:</h3>
              <div className="space-y-1">
                <div className="text-lg font-bold text-gray-900">Sales Department</div>
                <div className="text-sm text-gray-600">Prepared by: {quote.createdBy}</div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-widest">#</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-widest">Description</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-widest text-center">Qty</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-widest text-right">Unit Price</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-600 uppercase tracking-widest text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quote.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 text-sm text-gray-500">{index + 1}</td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-900">{item.partNumber || 'Custom Item'}</div>
                      <div className="text-xs text-gray-500 whitespace-pre-wrap mt-1">{item.description}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-center font-medium">{item.quantity}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">₹{item.unitPrice.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-bold">₹{item.totalPrice.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-3 bg-gray-50 p-6 rounded-2xl">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal:</span>
                <span className="font-bold text-gray-900">₹{quote.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>GST ({quote.taxRate}%):</span>
                <span className="font-bold text-gray-900">₹{quote.taxAmount.toLocaleString()}</span>
              </div>
              <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                <span className="text-base font-bold text-gray-900">Grand Total:</span>
                <span className="text-xl font-black text-blue-600">₹{quote.totalAmount.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="grid grid-cols-1 gap-8 pt-8 border-t border-gray-100">
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-blue-600 uppercase tracking-widest">Terms & Conditions:</h3>
              <ul className="space-y-2">
                {quote.standardTerms.map((term, i) => (
                  <li key={i} className="text-xs text-gray-600 flex gap-2">
                    <span className="font-bold text-blue-600">{i + 1}.</span>
                    {term}
                  </li>
                ))}
              </ul>
              {quote.specialTerms && (
                <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                  <h4 className="text-xs font-bold text-yellow-800 uppercase tracking-widest mb-2">Special Conditions:</h4>
                  <p className="text-xs text-yellow-900 whitespace-pre-wrap">{quote.specialTerms}</p>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-24 grid grid-cols-2 gap-12">
            <div className="text-center space-y-12">
              <div className="h-px bg-gray-200 w-48 mx-auto"></div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Customer Acceptance</div>
            </div>
            <div className="text-center space-y-12">
              <div className="h-px bg-gray-200 w-48 mx-auto"></div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest">Authorized Signatory</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
