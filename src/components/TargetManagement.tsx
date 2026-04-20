import React, { useState } from 'react';
import { 
  Target, 
  Calendar, 
  User, 
  TrendingUp, 
  Plus,
  Pencil,
  Save,
  X
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { MonthlyTarget, UserProfile } from '../types';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface TargetManagementProps {
  targets: MonthlyTarget[];
  users: UserProfile[];
  onSetTarget: (target: Omit<MonthlyTarget, 'id' | 'createdAt'>) => Promise<void>;
}

export default function TargetManagement({ targets, users, onSetTarget }: TargetManagementProps) {
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState('');
  const [month, setMonth] = useState(format(new Date(), 'MM'));
  const [year, setYear] = useState(format(new Date(), 'yyyy'));
  const [targetAmount, setTargetAmount] = useState('');

  const salesUsers = users.filter(u => ['Sales', 'BDM', 'Sales Support', 'Admin'].includes(u.role));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !targetAmount) {
      toast.error("Please fill all fields");
      return;
    }

    setLoading(true);
    try {
      const user = users.find(u => u.uid === selectedUser);
      await onSetTarget({
        userId: selectedUser,
        userName: user?.displayName || '',
        month,
        year,
        targetAmount: parseFloat(targetAmount),
        actualAmount: 0,
        achievementPercentage: 0
      });
      toast.success("Target set successfully");
      setTargetAmount('');
    } catch (error: any) {
      toast.error("Failed to set target: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 border-none shadow-sm bg-white h-fit">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Target className="text-primary h-5 w-5" />
              <CardTitle className="text-lg">Set Sales Target</CardTitle>
            </div>
            <CardDescription>Assign monthly revenue goals to sales staff</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Select User</label>
                <Select value={selectedUser} onValueChange={setSelectedUser}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose staff..." />
                  </SelectTrigger>
                  <SelectContent>
                    {salesUsers.map(u => (
                      <SelectItem key={u.uid} value={u.uid}>{u.displayName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Month</label>
                  <Select value={month} onValueChange={setMonth}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <SelectItem key={m} value={m.toString().padStart(2, '0')}>
                          {format(new Date(2024, m - 1), 'MMMM')}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Year</label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {['2024', '2025', '2026'].map(y => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Target Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">₹</span>
                  <Input 
                    type="number" 
                    placeholder="0.00" 
                    className="pl-8"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving..." : "Set Target"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 border-none shadow-sm bg-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="text-primary h-5 w-5" />
                <CardTitle className="text-lg">Recent Targets</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase">User</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-center">Period</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-right">Amount</th>
                    <th className="px-4 py-3 text-[10px] font-bold text-slate-500 uppercase text-center">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {targets.length > 0 ? targets.map(target => (
                    <tr key={target.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-sm font-semibold text-slate-900">{target.userName}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="text-xs text-slate-600 font-medium">
                          {format(new Date(parseInt(target.year), parseInt(target.month) - 1), 'MMM yyyy')}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="text-sm font-bold text-slate-900">₹{target.targetAmount.toLocaleString()}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2">
                           <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                             <div 
                               className="bg-primary h-full transition-all duration-500" 
                               style={{ width: `${Math.min(target.achievementPercentage, 100)}%` }}
                             />
                           </div>
                           <span className="text-[10px] font-bold text-slate-600">{target.achievementPercentage}%</span>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400 italic text-sm">
                        No targets assigned yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
