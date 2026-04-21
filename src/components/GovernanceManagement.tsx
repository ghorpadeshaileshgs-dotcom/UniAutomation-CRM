import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Users2, 
  Settings2, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Filter,
  UserPlus,
  Lock,
  Eye,
  FileCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ApprovalRequest, UserProfile } from '../types';
import { format } from 'date-fns';
import AdminPanel from './AdminPanel';

interface GovernanceManagementProps {
  approvals: ApprovalRequest[];
  team: UserProfile[];
  isAdmin: boolean;
  onUpdateApproval: (id: string, updates: Partial<ApprovalRequest>) => Promise<any>;
  onUpdateUser: (uid: string, updates: Partial<UserProfile>) => Promise<any>;
  onDeleteUser: (uid: string) => Promise<any>;
  onAdminCreateUser: (data: any) => Promise<void>;
  onSetTarget: (target: any) => Promise<any>;
  leads: any[];
  tasks: any[];
  targets: any[];
  customers: any[];
  parts: any[];
  onNavigate: (tab: string) => void;
}

export default function GovernanceManagement({ 
  approvals, 
  team, 
  isAdmin, 
  onUpdateApproval, 
  onUpdateUser, 
  onDeleteUser,
  onAdminCreateUser,
  onSetTarget,
  leads,
  tasks,
  targets,
  customers,
  parts,
  onNavigate
}: GovernanceManagementProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatSummary 
          label="Total Leads" 
          value={leads.length} 
          icon={<Clock className="h-4 w-4 text-orange-600" />}
          bgColor="bg-orange-50"
          onClick={() => onNavigate('leads')}
        />
        <StatSummary 
          label="Open Tasks" 
          value={tasks.filter((t: any) => t.status !== 'Completed').length} 
          icon={<Users2 className="h-4 w-4 text-blue-600" />}
          bgColor="bg-blue-50"
          onClick={() => onNavigate('tasks')}
        />
        <StatSummary 
          label="Active Users" 
          value={team.filter(u => u.isActive).length} 
          icon={<FileCheck className="h-4 w-4 text-emerald-600" />}
          bgColor="bg-emerald-50"
        />
        <StatSummary 
          label="Pending Approvals" 
          value={approvals.filter(a => a.status === 'Pending').length} 
          icon={<Lock className="h-4 w-4 text-slate-600" />}
          bgColor="bg-slate-50"
        />
      </div>

      <Tabs defaultValue="approvals" className="space-y-6">
        <TabsList className="bg-white p-1 shadow-sm border border-slate-200">
          <TabsTrigger value="approvals" className="gap-2">
            <FileCheck size={16} />
            Approval Requests
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="users" className="gap-2">
              <Users2 size={16} />
              User Control
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="approvals" className="space-y-6">
          <Card className="shadow-sm border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50/50">
                  <tr className="border-b border-slate-200">
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Requested By</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Status</th>
                    <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {approvals.length > 0 ? approvals.map(app => (
                    <tr key={app.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-800">{app.type}</div>
                        <div className="text-[10px] font-bold text-slate-400 mt-0.5">Ref: {app.relatedId}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-semibold">{app.requestedBy}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-[11px] font-medium text-slate-500">{format(app.createdAt.toDate(), 'PPP')}</div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge className={`font-bold text-[10px] ${
                          app.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                          app.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {app.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {app.status === 'Pending' && isAdmin ? (
                          <div className="flex items-center justify-end gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                              onClick={() => onUpdateApproval(app.id, { status: 'Approved' })}
                            >
                              <CheckCircle2 size={16} />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                              onClick={() => onUpdateApproval(app.id, { status: 'Rejected' })}
                            >
                              <XCircle size={16} />
                            </Button>
                          </div>
                        ) : (
                          <Button variant="ghost" size="sm" className="h-8 text-xs font-bold text-slate-400">
                            <Eye size={16} />
                          </Button>
                        )}
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 italic text-sm">
                        No pending approval requests
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users">
            <AdminPanel 
              users={team} 
              leads={leads}
              tasks={tasks}
              targets={targets}
              customers={customers}
              parts={parts}
              onUpdateUser={onUpdateUser} 
              onDeleteUser={onDeleteUser} 
              onAdminCreateUser={onAdminCreateUser}
              onSetTarget={onSetTarget}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

function StatSummary({ label, value, icon, bgColor, onClick }: any) {
  return (
    <div 
      className={`p-4 rounded-2xl border border-slate-100 ${bgColor} flex flex-col gap-2 ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">{label}</span>
        {icon}
      </div>
      <div className="text-xl font-bold tracking-tight text-slate-900">{value}</div>
    </div>
  );
}
