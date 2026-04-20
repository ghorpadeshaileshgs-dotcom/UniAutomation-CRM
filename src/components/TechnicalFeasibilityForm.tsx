import React, { useState, useMemo } from 'react';
import { TechnicalTemplate, FeasibilityForm, Lead, UserProfile, PartCategory, FeasibilityParameter } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';

interface TechnicalFeasibilityFormProps {
  leadId: string;
  templates: TechnicalTemplate[];
  userProfile: UserProfile | null;
  team: UserProfile[];
  onSubmit: (formData: Omit<FeasibilityForm, 'id' | 'createdAt'>) => Promise<any>;
  onCancel: () => void;
}

export default function TechnicalFeasibilityForm({ leadId, templates, userProfile, team, onSubmit, onCancel }: TechnicalFeasibilityFormProps) {
  const [step, setStep] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedSubCategory, setSelectedSubCategory] = useState<string>('');
  const [assignedToId, setAssignedToId] = useState<string>('');
  const [formValues, setFormValues] = useState<{ [key: string]: any }>({});
  const [submitting, setSubmitting] = useState(false);

  const categories = useMemo(() => {
    return Array.from(new Set(templates.map(t => t.category)));
  }, [templates]);

  const subCategories = useMemo(() => {
    if (!selectedCategory) return [];
    return templates.filter(t => t.category === selectedCategory).map(t => t.subCategory);
  }, [templates, selectedCategory]);

  const activeTemplate = useMemo(() => {
    return templates.find(t => t.category === selectedCategory && t.subCategory === selectedSubCategory);
  }, [templates, selectedCategory, selectedSubCategory]);

  const handleInputChange = (name: string, value: any) => {
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handleCategoryChange = (val: string) => {
    setSelectedCategory(val);
    setSelectedSubCategory('');
    setFormValues({});
  };

  const handleSubCategoryChange = (val: string) => {
    setSelectedSubCategory(val);
    setFormValues({});
  };

  const validateStep1 = () => {
    if (!selectedCategory || !selectedSubCategory) {
      toast.error("Please select a category and sub-category");
      return false;
    }
    setStep(2);
    return true;
  };

  const handleSubmit = async (isDraft: boolean = false) => {
    if (!activeTemplate || !userProfile) return;

    if (!isDraft) {
      // Validate required fields only if submitting to design
      const missingFields = activeTemplate.parameters
        .filter(p => p.required && !formValues[p.name])
        .map(p => p.label);

      if (missingFields.length > 0) {
        toast.error(`Please fill out required fields: ${missingFields.join(', ')}`);
        return;
      }
    }

    // Convert flat form values to nested structure array
    const processedParameters: FeasibilityParameter[] = activeTemplate.parameters.map(param => ({
      name: param.label,
      customerInput: formValues[param.name] || '',
      designStatus: 'Accepted', // Default for now
    }));

    const selectedDesigner = team.find(t => t.uid === assignedToId);

    try {
      setSubmitting(true);
      await onSubmit({
        leadId,
        templateId: activeTemplate.id,
        category: selectedCategory as PartCategory,
        subCategory: selectedSubCategory,
        parameters: processedParameters,
        submittedBy: userProfile.displayName || userProfile.email,
        submittedById: userProfile.uid,
        assignedTo: selectedDesigner?.displayName || 'Design Team',
        assignedToId: assignedToId || 'design_team',
        status: 'Open',
        overallStatus: isDraft ? 'Draft' : 'Pending',
        revisionCount: 0,
        history: []
      });
      toast.success(isDraft ? "Draft saved successfully" : "Feasibility form submitted for review");
      onCancel();
    } catch (error) {
      console.error("Error submitting feasibility form:", error);
      toast.error("Failed to submit form");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="shadow-lg border-none bg-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Technical Feasibility Review</CardTitle>
            <CardDescription>
              {step === 1 ? "Step 1: Select Product Category" : "Step 2: Enter Technical Specifications"}
            </CardDescription>
          </div>
          <div className="flex gap-1">
            {[1, 2].map(s => (
              <div key={s} className={`h-2 w-8 rounded-full ${step >= s ? 'bg-primary' : 'bg-slate-100'}`} />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {step === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Product Category</Label>
                <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Sub-Category / Product Variant</Label>
                <Select 
                  value={selectedSubCategory} 
                  onValueChange={handleSubCategoryChange}
                  disabled={!selectedCategory}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select Sub-Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {subCategories.map(sub => (
                      <SelectItem key={sub} value={sub}>{sub}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2 pt-2 border-t border-slate-50">
                <Label className="text-slate-500 font-bold uppercase text-[10px] tracking-wider">Assign to Design Engineer</Label>
                <Select value={assignedToId} onValueChange={setAssignedToId}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select Engineer (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {team.filter(m => m.role === 'Design').map(member => (
                      <SelectItem key={member.uid} value={member.uid}>{member.displayName} ({member.department})</SelectItem>
                    ))}
                    <SelectItem value="design_team">General Design Queue</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-slate-400 italic">This engineer will be notified to review technical specifications.</p>
              </div>
            </div>
          )}

          {step === 2 && activeTemplate && (
            <div className="space-y-6 py-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center justify-between text-xs text-slate-400 font-bold bg-slate-50 p-3 rounded-lg">
                <span>CATEGORY: {selectedCategory}</span>
                <span>SUB-CATEGORY: {selectedSubCategory}</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                {activeTemplate.parameters.map((param) => (
                  <div key={param.name} className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                      {param.label}
                      {param.required && <span className="text-red-500">*</span>}
                    </Label>
                    
                    {param.type === 'select' ? (
                      <Select 
                        value={formValues[param.name] || ''} 
                        onValueChange={(val) => handleInputChange(param.name, val)}
                      >
                        <SelectTrigger className="bg-slate-50/50">
                          <SelectValue placeholder={`Select ${param.label}`} />
                        </SelectTrigger>
                        <SelectContent>
                          {param.options?.map(opt => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input 
                        type={param.type}
                        value={formValues[param.name] || ''}
                        onChange={(e) => handleInputChange(param.name, e.target.value)}
                        placeholder={`Enter ${param.label}`}
                        className="bg-slate-50/50"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-between items-center pt-6 border-t">
            <Button type="button" variant="ghost" onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
            
            <div className="flex gap-3">
              {step === 1 ? (
                <Button 
                  type="button" 
                  onClick={validateStep1} 
                  disabled={!selectedSubCategory}
                  className="px-8 shadow-md"
                >
                  Next: Enter Specs
                </Button>
              ) : (
                <>
                  <Button type="button" variant="outline" onClick={() => setStep(1)} disabled={submitting}>
                    Back
                  </Button>
                  <Button 
                    type="button" 
                    variant="secondary" 
                    onClick={() => handleSubmit(true)} 
                    disabled={submitting}
                  >
                    Save Draft
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => handleSubmit(false)} 
                    disabled={submitting}
                    className="shadow-md bg-primary text-white"
                  >
                    {submitting ? "Submitting..." : "Submit to Design"}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
