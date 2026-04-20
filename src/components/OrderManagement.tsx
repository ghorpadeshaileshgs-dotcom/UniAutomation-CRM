import React, { useState } from 'react';
import { Plus, Search, Filter, FileText, CheckCircle2, Clock, AlertCircle, IndianRupee, Calendar, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { SalesOrder, Customer } from '../types';

interface OrderManagementProps {
  orders: SalesOrder[];
  customers: Customer[];
  onAdd: () => void;
  onEdit: (order: SalesOrder) => void;
}

export default function OrderManagement({ orders, customers, onAdd, onEdit }: OrderManagementProps) {
  const [search, setSearch] = useState('');

  const filteredOrders = orders.filter(order => 
    order.soNumber.toLowerCase().includes(search.toLowerCase()) ||
    order.customerName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search Sales Orders..." 
            className="pl-10 h-10 border-slate-200 bg-slate-50 focus-visible:ring-primary shadow-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button variant="outline" className="h-10 gap-2 font-medium">
            <Filter size={18} />
            Filter
          </Button>
          <Button onClick={onAdd} className="h-10 gap-2 font-medium shadow-sm">
            <Plus size={18} />
            New Sales Order
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredOrders.length > 0 ? (
          filteredOrders.map(order => (
            <OrderCard key={order.id} order={order} onEdit={() => onEdit(order)} />
          ))
        ) : (
          <div className="col-span-full py-12 flex flex-col items-center justify-center bg-white rounded-2xl border border-dashed border-slate-300">
            <div className="bg-slate-50 p-4 rounded-full mb-4">
              <FileText className="h-8 w-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900">No Sales Orders</h3>
            <p className="text-slate-500">Add a new sales order to start tracking.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function OrderCard({ order, onEdit }: { order: SalesOrder, onEdit: () => void }) {
  const statusColors = {
    'Open': 'bg-blue-100 text-blue-700',
    'Partial': 'bg-orange-100 text-orange-700',
    'Dispatched': 'bg-green-100 text-green-700',
    'Cancelled': 'bg-red-100 text-red-700'
  };

  return (
    <Card className="shadow-sm hover:shadow-md transition-all border-slate-200 group cursor-pointer" onClick={onEdit}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-2">
          <Badge variant="secondary" className={`font-bold ${statusColors[order.status as keyof typeof statusColors] || 'bg-slate-100'}`}>
            {order.status}
          </Badge>
          <span className="text-xs font-bold text-slate-400 font-mono tracking-tighter">#{order.soNumber}</span>
        </div>
        <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors line-clamp-1">{order.customerName}</CardTitle>
        <CardDescription className="flex items-center gap-2 mt-1">
          <Calendar size={14} />
          {format(order.soDate.toDate(), 'PPP')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between items-end">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Total Value</p>
              <div className="flex items-baseline gap-1">
                <IndianRupee size={16} className="text-slate-900" />
                <span className="text-2xl font-bold tracking-tight text-slate-900">{order.soValue.toLocaleString()}</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Delivery Date</p>
              <p className="text-sm font-bold text-slate-800">{format(order.deliveryDate.toDate(), 'dd MMM yyyy')}</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-full ${order.essStatus === 'Received' ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-400'}`}>
                <CheckCircle2 size={16} />
              </div>
              <span className="text-xs font-medium text-slate-600">ESS {order.essRequired ? (order.essStatus || 'Required') : 'N/A'}</span>
            </div>
            <Button variant="ghost" size="sm" className="h-8 text-xs font-bold hover:bg-slate-50">
              Details
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
