import React, { useState } from 'react';
import { 
  UserPlus, 
  UserCog, 
  ShieldCheck, 
  ShieldX, 
  Trash2, 
  Search,
  Building2,
  Mail,
  User as UserIcon,
  CheckCircle2,
  XCircle,
  Database,
  Users,
  LayoutDashboard,
  Settings2,
  Target as TargetIcon,
  Box
} from 'lucide-react';
import { Lead, Task, UserProfile, UserRole, MonthlyTarget } from '../types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import DataManagement from './DataManagement';
import AdminDashboard from './AdminDashboard';
import TargetManagement from './TargetManagement';
import AdminSettings from './AdminSettings';
import MastersManagement from './MastersManagement';

interface AdminPanelProps {
  users: UserProfile[];
  leads: Lead[];
  tasks: Task[];
  targets: MonthlyTarget[];
  customers: any[];
  parts: any[];
  onUpdateUser: (uid: string, updates: Partial<UserProfile>) => Promise<void>;
  onDeleteUser: (uid: string) => Promise<void>;
  onAdminCreateUser: (data: any) => Promise<void>;
  onSetTarget: (target: any) => Promise<any>;
}

export default function AdminPanel({ 
  users, 
  leads, 
  tasks, 
  targets,
  customers,
  parts,
  onUpdateUser, 
  onDeleteUser,
  onAdminCreateUser,
  onSetTarget
}: AdminPanelProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New User State
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    displayName: '',
    role: 'Sales' as UserRole,
    department: 'Sales',
    reportingManager: ''
  });

  const filteredUsers = users.filter(user => 
    (user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    (user.name?.toLowerCase().includes(searchTerm.toLowerCase()) || '') ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onAdminCreateUser(newUser);
      toast.success("User created and Auth record generated!");
      setShowAddUser(false);
      setNewUser({ email: '', password: '', displayName: '', role: 'Sales', department: 'Sales', reportingManager: '' });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusToggle = async (user: UserProfile) => {
    try {
      await onUpdateUser(user.uid, { isActive: !user.isActive });
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'} successfully`);
    } catch (error: any) {
      toast.error("Failed to update status: " + error.message);
    }
  };

  const handleUpdateRole = async (uid: string, role: UserRole) => {
    try {
      await onUpdateUser(uid, { role });
      toast.success("Role updated successfully");
    } catch (error: any) {
      toast.error("Failed to update role: " + error.message);
    }
  };

  const handleUpdateDept = async (uid: string, department: string) => {
    try {
      await onUpdateUser(uid, { department });
      toast.success("Department updated successfully");
    } catch (error: any) {
      toast.error("Failed to update department: " + error.message);
    }
  };

  const handleDelete = async (uid: string) => {
    try {
      await onDeleteUser(uid);
      setIsDeleting(null);
      toast.success("User deleted successfully");
    } catch (error: any) {
      toast.error("Failed to delete user: " + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="bg-slate-100 p-1 mb-6">
          <TabsTrigger value="dashboard" className="gap-2">
            <LayoutDashboard size={16} />
            Insights
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users size={16} />
            Teams
          </TabsTrigger>
          <TabsTrigger value="targets" className="gap-2">
            <TargetIcon size={16} />
            Targets
          </TabsTrigger>
          <TabsTrigger value="masters" className="gap-2">
            <Box size={16} />
            Global Masters
          </TabsTrigger>
          <TabsTrigger value="data" className="gap-2">
            <Database size={16} />
            System Operations
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <Settings2 size={16} />
            Governance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <AdminDashboard users={users} leads={leads} tasks={tasks} />
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">User Management</h2>
              <p className="text-slate-500">Manage roles, departments and account access</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <Input 
                  placeholder="Search users..." 
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Button onClick={() => setShowAddUser(true)} className="gap-2">
                <UserPlus size={18} />
                Add User
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredUsers.map((user) => (
              <Card key={user.uid} className={`border-none shadow-sm transition-all ${!user.isActive ? 'bg-slate-50 opacity-75' : 'bg-white'}`}>
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-white shadow-sm ${user.isActive ? 'bg-primary' : 'bg-slate-400'}`}>
                        {user.displayName?.[0] || user.email?.[0]}
                      </div>
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 truncate">{user.displayName}</h3>
                          {!user.isActive && <Badge variant="secondary" className="gap-1"><ShieldX size={12} /> Inactive</Badge>}
                          {user.role === 'Admin' && <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none">Admin</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-y-1 gap-x-4 text-sm text-slate-500">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <Mail size={14} className="shrink-0" />
                            <span className="truncate">{user.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Building2 size={14} className="shrink-0" />
                            <span>{user.department || 'No Department'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Role</span>
                        <Select value={user.role} onValueChange={(val: UserRole) => handleUpdateRole(user.uid, val)}>
                          <SelectTrigger className="w-32 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="Sales">Sales</SelectItem>
                            <SelectItem value="BDM">BDM</SelectItem>
                            <SelectItem value="Sales Support">Sales Support</SelectItem>
                            <SelectItem value="Design">Design</SelectItem>
                            <SelectItem value="Quality">Quality</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Dept</span>
                        <Select value={user.department || 'Sales'} onValueChange={(val) => handleUpdateDept(user.uid, val)}>
                          <SelectTrigger className="w-32 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Admin">Admin</SelectItem>
                            <SelectItem value="Sales">Sales</SelectItem>
                            <SelectItem value="Design">Design</SelectItem>
                            <SelectItem value="Quality">Quality</SelectItem>
                            <SelectItem value="Management">Management</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center gap-2 ml-2">
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className={`h-9 w-9 rounded-full ${user.isActive ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-400 hover:text-green-600 hover:bg-green-50'}`}
                          onClick={() => handleStatusToggle(user)}
                          title={user.isActive ? 'Deactivate User' : 'Activate User'}
                        >
                          {user.isActive ? <ShieldX size={18} /> : <ShieldCheck size={18} />}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-9 w-9 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setIsDeleting(user.uid)}
                          title="Delete User Record"
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredUsers.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed border-slate-200">
                <UserIcon size={48} className="mx-auto text-slate-300 mb-4 opacity-50" />
                <h3 className="text-lg font-bold text-slate-900">No users found</h3>
                <p className="text-slate-500">Try adjusting your search criteria</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="targets">
          <TargetManagement targets={targets} users={users} onSetTarget={onSetTarget} />
        </TabsContent>

        <TabsContent value="masters">
          <MastersManagement customers={customers} parts={parts} />
        </TabsContent>

        <TabsContent value="data">
          <DataManagement />
        </TabsContent>

        <TabsContent value="settings">
          <AdminSettings />
        </TabsContent>
      </Tabs>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Enterprise User</DialogTitle>
            <DialogDescription>
              This will create a Firebase Authentication account and a system profile simultaneously.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Full Name</label>
              <Input 
                required 
                value={newUser.displayName} 
                onChange={(e) => setNewUser({...newUser, displayName: e.target.value})} 
                placeholder="Ex: Rajesh Kumar"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Company Email</label>
                <Input 
                  type="email" 
                  required 
                  value={newUser.email} 
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  placeholder="name@company.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Initial Password</label>
                <Input 
                  type="password" 
                  required 
                  value={newUser.password} 
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                <Select value={newUser.role} onValueChange={(val: any) => setNewUser({...newUser, role: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Admin">Admin</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Accounts">Accounts</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Department</label>
                <Select value={newUser.department} onValueChange={(val) => setNewUser({...newUser, department: val})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Management">Management</SelectItem>
                    <SelectItem value="Sales">Sales</SelectItem>
                    <SelectItem value="Design">Design</SelectItem>
                    <SelectItem value="Production">Production</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Reporting Manager</label>
              <Select value={newUser.reportingManager} onValueChange={(val) => setNewUser({...newUser, reportingManager: val})}>
                <SelectTrigger><SelectValue placeholder="Select Manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Manager</SelectItem>
                  {users.filter(u => u.role === 'Admin' || u.role === 'BDM').map(m => (
                    <SelectItem key={m.uid} value={m.uid}>{m.displayName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setShowAddUser(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!isDeleting} onOpenChange={(open) => !open && setIsDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User Record?</DialogTitle>
            <DialogDescription>
              This will remove the user's profile from the system. This action cannot be undone. 
              The user's authentication account will remain in Firebase but they will lose access to the CRM data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleting(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => isDeleting && handleDelete(isDeleting)}>Delete Permanently</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
