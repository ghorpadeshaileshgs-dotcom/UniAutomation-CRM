import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useFirebase } from '../hooks/useFirebase';
import { Part, PartCategory } from '../types';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';

interface PartFormProps {
  part?: Part;
  onClose: () => void;
}

const categories: PartCategory[] = ["Sensors", "Assemblies", "Systems", "Automated Test Equipment", "Other"];

const subCategoryMap: Record<PartCategory, string[]> = {
  "Sensors": ["Pressure", "Flow", "Temperature", "Position", "Other"],
  "Assemblies": ["Cable Harness", "PCBA", "Mechanical"],
  "Systems": ["Control System", "Monitoring System", "Custom System"],
  "Automated Test Equipment": ["Function Test", "Calibration Rig", "Endurance"],
  "Other": ["General"]
};

export default function PartForm({ part, onClose }: PartFormProps) {
  const { addPart, parts } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Part>>({
    partId: '',
    partName: '',
    category: 'Sensors',
    subCategory: 'Pressure',
    technology: '',
    standard: true,
    description: '',
    unit: 'Nos',
  });

  useEffect(() => {
    if (part) {
      setFormData(part);
    }
  }, [part]);

  const handleCategoryChange = (val: PartCategory) => {
    setFormData({
      ...formData,
      category: val,
      subCategory: subCategoryMap[val][0]
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Duplicate Check
    const isDuplicate = parts.some(p => 
      (p.partName.trim().toLowerCase() === formData.partName?.trim().toLowerCase() || 
       p.partId.trim().toLowerCase() === formData.partId?.trim().toLowerCase()) &&
      p.id !== part?.id
    );

    if (isDuplicate) {
      const existing = parts.find(p => 
        p.partName.trim().toLowerCase() === formData.partName?.trim().toLowerCase() ||
        p.partId.trim().toLowerCase() === formData.partId?.trim().toLowerCase()
      );
      toast.error(`Part already exists with Name: "${existing?.partName}" or ID: "${existing?.partId}"`);
      return;
    }

    setLoading(true);
    try {
      if (part) {
        toast.info("Update logic placeholder");
      } else {
        await addPart(formData as any);
        toast.success("Part added to master successfully");
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle className="text-2xl font-bold">
            {part ? 'Edit Part' : 'Add New Part Master'}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="flex-1 px-6 py-4">
          <form id="part-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="partId">Part Number/ID *</Label>
                <Input 
                  id="partId" 
                  required 
                  value={formData.partId} 
                  onChange={e => setFormData({...formData, partId: e.target.value})}
                  placeholder="P-1001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="partName">Part Name *</Label>
                <Input 
                  id="partName" 
                  required 
                  value={formData.partName} 
                  onChange={e => setFormData({...formData, partName: e.target.value})}
                  placeholder="Differential Pressure Sensor"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={v => handleCategoryChange(v as PartCategory)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Sub-Category *</Label>
                <Select 
                  value={formData.subCategory} 
                  onValueChange={v => setFormData({...formData, subCategory: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(subCategoryMap[formData.category as PartCategory] || []).map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="technology">Technology</Label>
                <Input 
                  id="technology" 
                  value={formData.technology} 
                  onChange={e => setFormData({...formData, technology: e.target.value})}
                  placeholder="e.g. MEMS, Piezo"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit of Measure *</Label>
                <Select 
                  value={formData.unit} 
                  onValueChange={v => setFormData({...formData, unit: v})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {['Nos', 'Sets', 'Mtrs', 'Kg', 'Pack', 'Item'].map(u => (
                      <SelectItem key={u} value={u}>{u}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center space-x-2 p-4 bg-slate-50 rounded-lg border">
              <Checkbox 
                id="standard" 
                checked={formData.standard} 
                onCheckedChange={v => setFormData({...formData, standard: !!v})} 
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="standard" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Standard Product
                </Label>
                <p className="text-xs text-slate-500">
                  If unchecked, technical feasibility workflow will be mandatory for leads.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea 
                id="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Technical specifications or notes"
              />
            </div>
          </form>
        </ScrollArea>

        <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" form="part-form" disabled={loading}>
            {loading ? 'Saving...' : (part ? 'Update' : 'Add Part')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
