import React, { useState } from 'react';
import { 
  Building2, 
  Box, 
  Layers, 
  Globe,
  ShieldCheck,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Customer, Part } from '../types';

interface MastersManagementProps {
  customers: Customer[];
  parts: Part[];
}

export default function MastersManagement({ customers, parts }: MastersManagementProps) {
  const [customerSearch, setCustomerSearch] = useState('');
  const [partSearch, setPartSearch] = useState('');

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    c.customerId.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const filteredParts = parts.filter(p => 
    p.partName.toLowerCase().includes(partSearch.toLowerCase()) ||
    p.partId.toLowerCase().includes(partSearch.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard label="Direct Customers" value={customers.length} icon={<Building2 size={18} className="text-blue-600" />} />
        <StatCard label="SKU Library" value={parts.length} icon={<Box size={18} className="text-purple-600" />} />
        <StatCard label="Industries" value={5} icon={<Layers size={18} className="text-orange-600" />} />
        <StatCard label="Regions" value={2} icon={<Globe size={18} className="text-emerald-600" />} />
      </div>

      <Tabs defaultValue="customers" className="space-y-6">
        <TabsList className="bg-white p-1 shadow-sm border border-slate-200">
          <TabsTrigger value="customers" className="gap-2">
            <Building2 size={16} />
            Customer Portfolio
          </TabsTrigger>
          <TabsTrigger value="parts" className="gap-2">
            <Box size={16} />
            Part Catalog
          </TabsTrigger>
        </TabsList>

        <TabsContent value="customers" className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                placeholder="Search by name or ID..." 
                className="pl-10"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
              />
            </div>
            <Button className="gap-2 shadow-sm">
              <Plus size={18} />
              New Customer Record
            </Button>
          </div>

          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">ID</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entity Name</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Industry</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Type</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCustomers.map(cust => (
                    <tr key={cust.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-primary bg-primary/5 px-2 py-1 rounded">{cust.customerId}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-900">{cust.name}</div>
                        <div className="text-[10px] text-slate-400 font-medium">{cust.region}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="outline" className="text-[10px] uppercase font-bold border-slate-200">
                          {cust.industry}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs text-slate-600 font-medium">{cust.customerType}</span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-slate-400 hover:text-primary">
                          Edit
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="parts" className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <Input 
                placeholder="Search part catalog..." 
                className="pl-10"
                value={partSearch}
                onChange={(e) => setPartSearch(e.target.value)}
              />
            </div>
            <Button className="gap-2 shadow-sm">
              <Plus size={18} />
              Register New SKU
            </Button>
          </div>

          <Card className="border-none shadow-sm bg-white overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Part ID</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Specifications</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Category</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Integrity</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredParts.map(part => (
                    <tr key={part.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono font-bold text-slate-600">{part.partId}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-slate-900">{part.partName}</div>
                        <div className="text-[10px] text-slate-400 font-medium truncate max-w-[200px]">{part.description || 'No description provided'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none font-bold text-[10px] uppercase">
                          {part.category}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {part.standard ? (
                          <div className="flex items-center gap-1.5 text-emerald-600">
                            <ShieldCheck size={14} />
                            <span className="text-[10px] font-bold uppercase">Standard</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-orange-600">
                            <Layers size={14} />
                            <span className="text-[10px] font-bold uppercase">Variant</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-slate-400 hover:text-primary">
                          Manage
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatCard({ label, value, icon }: any) {
  return (
    <Card className="border-none shadow-sm bg-white">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">{label}</p>
          <h3 className="text-xl font-bold text-slate-900">{value}</h3>
        </div>
        <div className="p-2 bg-slate-50 rounded-lg text-slate-600">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
