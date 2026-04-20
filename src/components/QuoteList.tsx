import React, { useState } from 'react';
import { Plus, Search, FileText, Printer, Edit2, Trash2, ExternalLink, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Quote } from '../types';
import { Button } from '@/components/ui/button';
import { format, isPast } from 'date-fns';

interface QuoteListProps {
  quotes: Quote[];
  onEdit: (quote: Quote) => void;
  onPrint: (quote: Quote) => void;
  onDelete: (id: string) => Promise<void>;
  onAdd: () => void;
}

export const QuoteList: React.FC<QuoteListProps> = ({
  quotes,
  onEdit,
  onPrint,
  onDelete,
  onAdd
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredQuotes = quotes.filter(q =>
    q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    q.customerName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Sent': return 'bg-blue-100 text-blue-800';
      case 'Accepted': return 'bg-green-100 text-green-800';
      case 'Rejected': return 'bg-red-100 text-red-800';
      case 'Expired': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: Quote['status']) => {
    switch (status) {
      case 'Draft': return <Clock className="w-3 h-3" />;
      case 'Sent': return <ExternalLink className="w-3 h-3" />;
      case 'Accepted': return <CheckCircle2 className="w-3 h-3" />;
      case 'Rejected': return <XCircle className="w-3 h-3" />;
      case 'Expired': return <Clock className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Quotations</h2>
          <p className="text-gray-500">Manage and track customer quotations</p>
        </div>
        <Button onClick={onAdd}>
          <Plus className="w-4 h-4 mr-2" />
          Create Quote
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by quote number or customer..."
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
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Quote Info</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Valid Until</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredQuotes.map((q) => (
                <tr key={q.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{q.quoteNumber}</div>
                        <div className="text-xs text-gray-500">{format(q.date.toDate(), 'dd MMM yyyy')}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{q.customerName}</div>
                    <div className="text-xs text-gray-500">{q.contactPerson}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">₹{q.totalAmount.toLocaleString()}</div>
                    <div className="text-xs text-gray-500">{q.items.length} items</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className={`text-sm ${isPast(q.validUntil.toDate()) ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                      {format(q.validUntil.toDate(), 'dd MMM yyyy')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(q.status)}`}>
                      {getStatusIcon(q.status)}
                      {q.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => onPrint(q)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Print Quote"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEdit(q)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm('Are you sure you want to delete this quote?')) {
                            onDelete(q.id);
                          }
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredQuotes.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No quotations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
