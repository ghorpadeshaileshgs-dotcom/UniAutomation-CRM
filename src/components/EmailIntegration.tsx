import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Mail, Sparkles, UserPlus, Link as LinkIcon, Loader2 } from 'lucide-react';
import { parseEmailRequirement } from '../lib/gemini';
import { toast } from 'sonner';
import { useFirebase } from '../hooks/useFirebase';
import { Lead } from '../types';

export default function EmailIntegration() {
  const [emailContent, setEmailContent] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const { addLead } = useFirebase();

  const handleParse = async () => {
    if (!emailContent.trim()) {
      toast.error("Please paste email content first");
      return;
    }
    setParsing(true);
    try {
      const result = await parseEmailRequirement(emailContent);
      setParsedData(result);
      toast.success("Email parsed successfully!");
    } catch (err: any) {
      toast.error("Parsing failed: " + err.message);
    } finally {
      setParsing(false);
    }
  };

  const handleCreateLead = async () => {
    if (!parsedData) return;
    try {
      await addLead({
        customerId: '', // To be updated during qualification
        customerName: parsedData.customerName,
        customerType: 'OEM', // Default
        partId: '', // To be updated
        partName: '', // To be updated
        contactPerson: parsedData.contactPerson,
        industry: 'Other',
        region: 'Domestic',
        productType: parsedData.productType || '',
        productCategory: 'Standard',
        stage: 'Lead',
        salespersonName: 'AI Auto-Generated',
        salespersonId: 'system',
        source: 'Email',
        priority: 'Medium',
        estimatedValue: parsedData.estimatedValue || 0,
        probability: 10,
        quoteCreated: false,
        poReceived: false,
      });
      toast.success("Lead created from email!");
      setParsedData(null);
      setEmailContent('');
    } catch (err: any) {
      toast.error("Failed to create lead: " + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="text-primary" />
            Email to Lead
          </CardTitle>
          <CardDescription>
            Paste the content of an incoming email to automatically extract lead details using AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea 
            placeholder="Paste email content here..." 
            className="min-h-[200px] font-mono text-sm"
            value={emailContent}
            onChange={(e) => setEmailContent(e.target.value)}
          />
          <div className="flex justify-end">
            <Button onClick={handleParse} disabled={parsing || !emailContent}>
              {parsing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing with Gemini...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Parse with AI
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {parsedData && (
        <Card className="border-primary/20 bg-primary/5 shadow-md animate-in fade-in slide-in-from-bottom-4">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="text-primary h-5 w-5" />
              Extracted Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <InfoField label="Customer Name" value={parsedData.customerName} />
              <InfoField label="Contact Person" value={parsedData.contactPerson} />
              <InfoField label="Email ID" value={parsedData.email} />
              <InfoField label="Product Type" value={parsedData.productType || 'Not specified'} />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold text-slate-500 uppercase">Requirement Summary</p>
              <p className="text-sm text-slate-700 bg-white p-3 rounded border border-slate-200">
                {parsedData.requirementText}
              </p>
            </div>
            <div className="flex gap-3 justify-end pt-4">
              <Button variant="outline" onClick={() => setParsedData(null)}>Discard</Button>
              <Button variant="secondary" className="gap-2">
                <LinkIcon size={16} />
                Link to Existing
              </Button>
              <Button onClick={handleCreateLead} className="gap-2">
                <UserPlus size={16} />
                Create New Lead
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InfoField({ label, value }: { label: string, value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-semibold text-slate-500 uppercase">{label}</p>
      <p className="text-sm font-medium text-slate-900">{value || 'N/A'}</p>
    </div>
  );
}
