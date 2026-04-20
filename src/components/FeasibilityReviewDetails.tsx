import React, { useState } from 'react';
import { FeasibilityForm, UserProfile, FeasibilityStatus, TechnicalParameter } from '../types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Info, History, FileDown, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface FeasibilityReviewDetailsProps {
  form: FeasibilityForm;
  template?: TechnicalParameter[];
  userProfile: UserProfile | null;
  onUpdate: (id: string, updates: Partial<FeasibilityForm>) => Promise<any>;
  onPrint?: () => void;
}

import ExportActions from './ExportActions';

export default function FeasibilityReviewDetails({ form, template, userProfile, onUpdate, onPrint }: FeasibilityReviewDetailsProps) {
  const [remarks, setRemarks] = useState(form.designResponse || '');
  const [overallStatus, setOverallStatus] = useState(form.overallStatus);
  const [paramReviews, setParamReviews] = useState(form.parameters);
  const [submitting, setSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const exportData = React.useMemo(() => {
    return form.parameters.map((p) => ({
      'Parameter': p.name,
      'Customer Input': p.customerInput,
      'Design Status': p.designStatus || 'Pending',
      'Engineers Remark': p.designSuggestion || p.remark || 'N/A'
    }));
  }, [form.parameters]);

  const isDesignUser = userProfile?.role === 'Design' || userProfile?.role === 'Admin';

  const handleParamUpdate = (index: number, field: string, value: any) => {
    const updated = [...paramReviews];
    updated[index] = {
      ...updated[index],
      [field]: value
    };
    setParamReviews(updated);
  };

  const handleUpdate = async () => {
    try {
      setSubmitting(true);
      await onUpdate(form.id, {
        parameters: paramReviews,
        designResponse: remarks,
        overallStatus: overallStatus,
      });
      toast.success("Feasibility review updated");
    } catch (error) {
      console.error("Error updating feasibility review:", error);
      toast.error("Failed to update review");
    } finally {
      setSubmitting(false);
    }
  };

  const statusColors = {
    'Pending': 'bg-slate-100 text-slate-600',
    'Feasible': 'bg-green-100 text-green-600',
    'Not Feasible': 'bg-red-100 text-red-600',
    'Need More Details': 'bg-amber-100 text-amber-600'
  };

  return (
    <Card className="shadow-lg border-none bg-white">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <Info size={20} />
            </div>
            <div>
              <CardTitle className="text-lg">Technical Feasibility Report</CardTitle>
              <CardDescription className="flex items-center gap-2">
                {form.category} • {form.subCategory}
                {form.revisionCount > 1 && (
                  <Badge variant="secondary" className="h-4 text-[9px] px-1 bg-amber-50 text-amber-600 border-amber-100">
                    Iteration #{form.revisionCount}
                  </Badge>
                )}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant={showHistory ? "default" : "outline"} 
              size="sm" 
              onClick={() => setShowHistory(!showHistory)}
              className={form.revisionCount > 1 && !showHistory ? "border-amber-200 bg-amber-50/50" : ""}
            >
              <History size={16} className="mr-2" />
              History {form.history?.length > 0 && `(${form.history.length})`}
            </Button>
            <ExportActions 
              data={exportData} 
              fileName={`feasibility_${form.id.slice(-6)}`} 
              title="Technical Feasibility Report" 
              subtitle={`${form.category} | ${form.subCategory} | Rev #${form.revisionCount}`}
            />
            {onPrint && (
              <Button variant="outline" size="sm" onClick={onPrint} className="gap-2">
                <FileDown size={16} />
                Print PDF
              </Button>
            )}
            <Badge className={`border-none ${statusColors[form.overallStatus]}`}>
              {form.overallStatus}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {showHistory && (
          <div className="bg-slate-50 border rounded-xl p-4 space-y-4 mb-2 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Iteration History Log</h4>
              <Badge variant="outline" className="text-[10px]">{form.revisionCount} Total Updates</Badge>
            </div>
            <div className="space-y-4">
              {form.history?.slice().reverse().map((entry, idx) => (
                <div key={idx} className="relative pl-6 pb-2 border-l-2 border-slate-200 last:border-0 last:pb-0">
                  <div className={`absolute -left-[7px] top-0 h-3 w-3 rounded-full border-2 border-white shadow-sm ${
                    entry.status === 'Feasible' ? 'bg-green-500' : 
                    entry.status === 'Not Feasible' ? 'bg-red-500' : 
                    entry.status === 'Need More Details' ? 'bg-amber-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400">{format(entry.date.toDate(), 'PPP HH:mm')}</span>
                      <span className="text-[10px] font-black text-slate-600 uppercase">{entry.updatedBy}</span>
                      <Badge className={`h-4 text-[9px] px-1 border-none ${
                        entry.status === 'Feasible' ? 'bg-green-100 text-green-700' : 
                        entry.status === 'Not Feasible' ? 'bg-red-100 text-red-700' : 
                        'bg-slate-200 text-slate-600'
                      }`}>
                        {entry.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-600 font-medium bg-white/60 p-2 rounded border border-slate-100 italic">
                      "{entry.remarks || 'No remarks provided.'}"
                    </p>
                  </div>
                </div>
              ))}
              {(!form.history || form.history.length === 0) && (
                <div className="text-center py-6 text-slate-400 italic text-xs">
                  No previous iterations recorded.
                </div>
              )}
            </div>
          </div>
        )}

        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead className="w-[200px] text-xs font-bold uppercase tracking-wider">Technical Parameter</TableHead>
                <TableHead className="w-[180px] text-xs font-bold uppercase tracking-wider">Customer Input</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider">Design Response</TableHead>
                <TableHead className="w-[250px] text-xs font-bold uppercase tracking-wider">Remarks / Suggestions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paramReviews.map((data, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium text-slate-700 capitalize">{data.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-slate-50 font-semibold">{data.customerInput}</Badge>
                  </TableCell>
                  <TableCell>
                    {isDesignUser && form.status === 'Open' ? (
                      <Select 
                        value={data.designStatus || ''} 
                        onValueChange={(val: any) => handleParamUpdate(index, 'designStatus', val)}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Accepted">Accepted</SelectItem>
                          <SelectItem value="Modify">Modify</SelectItem>
                          <SelectItem value="Not Possible">Not Possible</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-2">
                        {data.designStatus === 'Accepted' && <CheckCircle size={14} className="text-green-500" />}
                        {data.designStatus === 'Not Possible' && <XCircle size={14} className="text-red-500" />}
                        {data.designStatus === 'Modify' && <AlertCircle size={14} className="text-amber-500" />}
                        <span className="text-xs font-medium">{data.designStatus || 'Pending'}</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {isDesignUser && form.status === 'Open' ? (
                      <Input 
                        className="h-8 text-xs" 
                        placeholder="Suggestions/Remarks"
                        value={data.designSuggestion || ''}
                        onChange={(e) => handleParamUpdate(index, 'designSuggestion', e.target.value)}
                      />
                    ) : (
                      <p className="text-xs text-slate-600 italic">{data.designSuggestion || 'No remarks'}</p>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Engineering Summary</h3>
            {form.turnaroundTime && (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded">TAT: {form.turnaroundTime} hrs</span>
            )}
          </div>

          {isDesignUser && form.status === 'Open' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1 space-y-2">
                <Label className="text-xs font-bold text-slate-500">Overall Status</Label>
                <Select value={overallStatus} onValueChange={(val: any) => setOverallStatus(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Feasible">Feasible</SelectItem>
                    <SelectItem value="Not Feasible">Not Feasible</SelectItem>
                    <SelectItem value="Need More Details">Need More Details</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label className="text-xs font-bold text-slate-500">Design Response / Remarks</Label>
                <Textarea 
                  value={remarks} 
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter overall engineering feedback..."
                  rows={3}
                  className="text-sm"
                />
              </div>
              <Button 
                onClick={handleUpdate} 
                disabled={submitting || overallStatus === 'Pending'}
                className="md:col-span-3 w-full bg-slate-900 text-white hover:bg-slate-800"
              >
                {submitting ? "Processing..." : "Submit Technical Verdict"}
              </Button>
            </div>
          ) : (
            <div className="bg-slate-50 p-6 rounded-xl border border-dashed border-slate-200">
              <div className="flex items-center gap-3 mb-3">
                <Badge className={`px-4 py-1.5 shadow-sm border-none ${statusColors[overallStatus]}`}>
                  {overallStatus}
                </Badge>
                {form.status === 'Closed' && <Badge variant="outline" className="bg-white">Review Closed</Badge>}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed italic border-l-4 border-slate-300 pl-4 bg-white/50 py-2">
                {remarks || "Technical review is ongoing..."}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
