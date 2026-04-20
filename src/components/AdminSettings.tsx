import React, { useState, useEffect } from 'react';
import { 
  Settings2, 
  ShieldCheck, 
  Mail, 
  IndianRupee, 
  Save,
  CheckCircle2,
  AlertCircle
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
import { Switch } from '@/components/ui/switch';
import { SystemSettings } from '../types';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const docRef = doc(db, 'system', 'settings');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSettings(docSnap.data() as SystemSettings);
      } else {
        const defaultSettings: SystemSettings = {
          id: 'settings',
          defaultQuoteFormat: 'Standard',
          approvalThresholds: {
            discountLimit: 15,
            nonStandardApprovalRequired: true
          },
          emailSettings: {
            notifyAdminOnLead: true,
            notifySalesOnTarget: true
          }
        };
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'system', 'settings'), settings);
      toast.success("Settings saved successfully");
    } catch (error: any) {
      toast.error("Failed to save settings: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) return <div>Loading settings...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">System Governance</h2>
          <p className="text-slate-500">Configure global business rules and thresholds</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="shadow-lg">
          {saving ? "Saving..." : "Save Configuration"}
          <Save size={18} className="ml-2" />
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <IndianRupee className="text-primary h-5 w-5" />
              <CardTitle className="text-lg">Commercial Thresholds</CardTitle>
            </div>
            <CardDescription>Approval limits and pricing controls</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Auto-Approval Discount Limit (%)</label>
              <div className="flex items-center gap-4">
                <Input 
                  type="number" 
                  value={settings.approvalThresholds.discountLimit}
                  onChange={(e) => setSettings({
                    ...settings,
                    approvalThresholds: { ...settings.approvalThresholds, discountLimit: parseFloat(e.target.value) }
                  })}
                  className="max-w-[150px]"
                />
                <span className="text-sm text-slate-400 italic">Discounts above this will require management approval</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">Non-Standard Design Approval</p>
                <p className="text-xs text-slate-500">Require design team feasibility for non-standard parts</p>
              </div>
              <Switch 
                checked={settings.approvalThresholds.nonStandardApprovalRequired}
                onCheckedChange={(val) => setSettings({
                  ...settings,
                  approvalThresholds: { ...settings.approvalThresholds, nonStandardApprovalRequired: val }
                })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="text-primary h-5 w-5" />
              <CardTitle className="text-lg">Notification Workflow</CardTitle>
            </div>
            <CardDescription>Configure automated system alerts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">Admin Activity Alerts</p>
                <p className="text-xs text-slate-500">Notify admin when high-priority leads are created</p>
              </div>
              <Switch 
                checked={settings.emailSettings.notifyAdminOnLead}
                onCheckedChange={(val) => setSettings({
                  ...settings,
                  emailSettings: { ...settings.emailSettings, notifyAdminOnLead: val }
                })}
              />
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="space-y-0.5">
                <p className="text-sm font-bold text-slate-900 uppercase tracking-tight">Sales Milestone Updates</p>
                <p className="text-xs text-slate-500">Alert sales team when targets are achieved</p>
              </div>
              <Switch 
                checked={settings.emailSettings.notifySalesOnTarget}
                onCheckedChange={(val) => setSettings({
                  ...settings,
                  emailSettings: { ...settings.emailSettings, notifySalesOnTarget: val }
                })}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-white">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings2 className="text-primary h-5 w-5" />
              <CardTitle className="text-lg">Global Defaults</CardTitle>
            </div>
            <CardDescription>Default system behavior configuration</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase">Default Quotation Format</label>
              <Select 
                value={settings.defaultQuoteFormat} 
                onValueChange={(val: any) => setSettings({ ...settings, defaultQuoteFormat: val })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Basic">Basic (Standard items only)</SelectItem>
                  <SelectItem value="Standard">Standard (With technical specs)</SelectItem>
                  <SelectItem value="Special">Special (Custom manufacturing)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm bg-slate-900 text-white overflow-hidden relative">
          <div className="absolute top-0 right-0 p-6 opacity-10">
            <ShieldCheck size={120} />
          </div>
          <CardHeader>
            <div className="flex items-center gap-2">
              <ShieldCheck className="text-white h-5 w-5" />
              <CardTitle className="text-lg">Governance Shield</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              System governance rules are enforced at the Firestore layer. Changing these settings updates the real-time validation logic across all active user sessions instantly.
            </p>
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="p-2 bg-white/10 rounded-lg">
                <CheckCircle2 size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-white">Security Integrity Active</p>
                <p className="text-[10px] text-slate-400">All commercial thresholds verified</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
