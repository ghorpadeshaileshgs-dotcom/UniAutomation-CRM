import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Mail, RefreshCw, CheckCircle, AlertTriangle, Brain } from 'lucide-react';
import { useFirebase } from '../hooks/useFirebase';
import { GoogleGenAI, Type } from "@google/genai";
import { toast } from 'sonner';
import { DesignReview } from '../types';
import { Timestamp } from 'firebase/firestore';

// Mock incoming emails
const MOCK_EMAILS = [
  {
    id: 'em1',
    from: 'engineer.rahul@company.com',
    subject: 'Re: Design Review Request - Lead #L1024 (Tata Motors)',
    body: 'Hi Sales Team,\n\nI have reviewed the requirements for Tata Motors. The requested variant is Feasible with some modifications to the mounting brackets. We can proceed with the techno-commercial offer.\n\nRegards,\nRahul',
    date: '2026-04-13T10:00:00Z'
  },
  {
    id: 'em2',
    from: 'engineer.priya@company.com',
    subject: 'Design Review - Lead #L1025 (Reliance Ind)',
    body: 'The new development request for Reliance is Not Feasible due to current material constraints in our production line. We suggest looking at our standard model X-200 instead.',
    date: '2026-04-13T11:30:00Z'
  }
];

export default function DesignEmailProcessor() {
  const { designReviews, updateDesignReview } = useFirebase();
  const [processing, setProcessing] = useState<string | null>(null);
  const [processedEmails, setProcessedEmails] = useState<string[]>([]);

  const processEmail = async (email: typeof MOCK_EMAILS[0]) => {
    setProcessing(email.id);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const prompt = `
        Extract design review information from this email.
        Email Subject: ${email.subject}
        Email Body: ${email.body}
        
        Available Design Reviews in System:
        ${designReviews.map(r => `ID: ${r.id}, LeadID: ${r.leadId}, Customer: ${r.customerName}`).join('\n')}
        
        Rules:
        1. Identify the matching Design Review ID from the list above using the Lead ID or Customer Name mentioned in the email.
        2. Extract the feasibility status. It MUST be one of: "Feasible", "Not Feasible", "Feasible with Modification".
        3. Extract the response remarks (summary of the engineer's feedback).
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              reviewId: { type: Type.STRING, description: "The ID of the matching design review" },
              feasibilityStatus: { type: Type.STRING, enum: ["Feasible", "Not Feasible", "Feasible with Modification"] },
              remarks: { type: Type.STRING }
            },
            required: ["reviewId", "feasibilityStatus", "remarks"]
          }
        }
      });

      const result = JSON.parse(response.text);
      
      if (result.reviewId) {
        await updateDesignReview(result.reviewId, {
          feasibilityStatus: result.feasibilityStatus,
          responseRemarks: result.remarks,
          responseDate: Timestamp.now()
        });
        toast.success(`Successfully processed email for ${email.subject}`);
        setProcessedEmails([...processedEmails, email.id]);
      } else {
        toast.error("Could not match email to any design review");
      }
    } catch (err: any) {
      console.error(err);
      toast.error("AI Processing failed: " + err.message);
    } finally {
      setProcessing(null);
    }
  };

  return (
    <Card className="border-indigo-100 shadow-md">
      <CardHeader className="bg-indigo-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
              <Brain size={20} />
            </div>
            <div>
              <CardTitle className="text-lg">AI Email Processor</CardTitle>
              <CardDescription>Automatically extract feasibility status from design team emails</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw size={14} />
            Sync Inbox
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {MOCK_EMAILS.filter(e => !processedEmails.includes(e.id)).map((email) => (
            <div key={email.id} className="p-4 hover:bg-slate-50 transition-colors flex items-start justify-between gap-4">
              <div className="flex gap-3">
                <div className="mt-1 p-2 bg-slate-100 rounded-full text-slate-500">
                  <Mail size={16} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{email.from}</span>
                    <span className="text-xs text-slate-400">{new Date(email.date).toLocaleString()}</span>
                  </div>
                  <p className="text-sm font-medium text-slate-700 mt-0.5">{email.subject}</p>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{email.body}</p>
                </div>
              </div>
              <Button 
                size="sm" 
                className="bg-indigo-600 hover:bg-indigo-700 shrink-0"
                disabled={processing === email.id}
                onClick={() => processEmail(email)}
              >
                {processing === email.id ? (
                  <RefreshCw size={14} className="animate-spin mr-2" />
                ) : (
                  <Brain size={14} className="mr-2" />
                )}
                Process with AI
              </Button>
            </div>
          ))}
          {MOCK_EMAILS.filter(e => !processedEmails.includes(e.id)).length === 0 && (
            <div className="p-8 text-center text-slate-500">
              <CheckCircle className="mx-auto mb-2 text-green-500" size={24} />
              <p>All design emails have been processed.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
