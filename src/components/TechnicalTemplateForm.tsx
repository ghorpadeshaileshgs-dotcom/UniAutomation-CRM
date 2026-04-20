import React, { useState } from 'react';
import { TechnicalTemplate, TechnicalParameter, PartCategory } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Trash2, GripVertical, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Timestamp } from 'firebase/firestore';

interface TechnicalTemplateFormProps {
  initialData?: TechnicalTemplate;
  onSubmit: (data: Omit<TechnicalTemplate, 'id' | 'createdAt'>) => Promise<any>;
  onCancel: () => void;
}

const paramTypes = ['text', 'number', 'select', 'date'];

export default function TechnicalTemplateForm({ initialData, onSubmit, onCancel }: TechnicalTemplateFormProps) {
  const [category, setCategory] = useState<PartCategory>(initialData?.category || 'Sensors');
  const [subCategory, setSubCategory] = useState(initialData?.subCategory || '');
  const [parameters, setParameters] = useState<TechnicalParameter[]>(initialData?.parameters || [
    { name: 'material', label: 'Housing Material', type: 'text', required: true },
    { name: 'pressure_range', label: 'Pressure Range', type: 'text', required: true }
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addParameter = () => {
    setParameters([...parameters, { 
      name: `param_${Date.now()}`, 
      label: '', 
      type: 'text', 
      required: false 
    }]);
  };

  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  const updateParameter = (index: number, updates: Partial<TechnicalParameter>) => {
    const newParams = [...parameters];
    newParams[index] = { ...newParams[index], ...updates };
    setParameters(newParams);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCategory) {
      toast.error("Please enter a sub-category");
      return;
    }

    if (parameters.length === 0) {
      toast.error("Template must have at least one parameter");
      return;
    }

    if (parameters.some(p => !p.label || !p.name)) {
      toast.error("All parameters must have a label and name");
      return;
    }

    try {
      setSubmitting(true);
      await onSubmit({
        category,
        subCategory,
        parameters
      });
      toast.success("Technical template saved");
      onCancel();
    } catch (error: any) {
      toast.error("Failed to save template: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="shadow-lg border-none bg-white">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <Settings2 className="text-primary" />
          {initialData ? 'Edit Template' : 'Create Technical Template'}
        </CardTitle>
        <CardDescription>
          Define technical parameters for specific product variants to enable automated feasibility forms.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Product Category *</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as PartCategory)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['Sensors', 'Assemblies', 'Systems', 'Automated Test Equipment', 'Other'].map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subCategory">Sub-Category / Variant Name *</Label>
              <Input 
                id="subCategory" 
                value={subCategory} 
                onChange={(e) => setSubCategory(e.target.value)}
                placeholder="e.g. High Pressure Analog Sensor"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Defined Parameters</h3>
              <Button type="button" variant="outline" size="sm" onClick={addParameter} className="gap-1 border-primary text-primary hover:bg-primary/5">
                <Plus size={14} />
                Add Field
              </Button>
            </div>
            
            <div className="space-y-3">
              {parameters.map((param, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50/30">
                  <div className="pt-2 text-slate-300">
                    <GripVertical size={20} />
                  </div>
                  <div className="flex-1 grid grid-cols-12 gap-4">
                    <div className="col-span-4 space-y-1.5">
                      <Label className="text-[10px] text-slate-500 font-bold uppercase">Field Label</Label>
                      <Input 
                        value={param.label} 
                        onChange={(e) => {
                          const label = e.target.value;
                          const name = label.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
                          updateParameter(idx, { label, name });
                        }}
                        placeholder="Display Name"
                        className="h-9"
                      />
                    </div>
                    <div className="col-span-3 space-y-1.5">
                      <Label className="text-[10px] text-slate-500 font-bold uppercase">Field Type</Label>
                      <Select value={param.type} onValueChange={(val: any) => updateParameter(idx, { type: val })}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {paramTypes.map(type => (
                            <SelectItem key={type} value={type}>{type.toUpperCase()}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="col-span-3 pt-8 flex items-center gap-2">
                      <Checkbox 
                        id={`req-${idx}`} 
                        checked={param.required} 
                        onCheckedChange={(val) => updateParameter(idx, { required: !!val })} 
                      />
                      <Label htmlFor={`req-${idx}`} className="text-xs font-semibold cursor-pointer">Required</Label>
                    </div>
                    <div className="col-span-2 pt-8 flex justify-end">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-slate-300 hover:text-red-500"
                        onClick={() => removeParameter(idx)}
                        disabled={parameters.length <= 1}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>

                    {param.type === 'select' && (
                      <div className="col-span-12 space-y-1.5 animate-in slide-in-from-top-1">
                        <Label className="text-[10px] text-slate-500 font-bold uppercase">Options (Comma separated)</Label>
                        <Input 
                          value={param.options?.join(', ') || ''}
                          onChange={(e) => updateParameter(idx, { options: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                          placeholder="Option 1, Option 2, Option 3"
                          className="h-8 text-xs font-mono"
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t font-semibold">
            <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
              Discard Changes
            </Button>
            <Button type="submit" disabled={submitting} className="min-w-[140px] shadow-md">
              {submitting ? "Saving..." : "Publish Template"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
