import React from 'react';
import { FeasibilityForm, Lead } from '../types';
import { format } from 'date-fns';

interface FeasibilityReportProps {
  form: FeasibilityForm;
  lead: Lead;
}

export default function FeasibilityReport({ form, lead }: FeasibilityReportProps) {
  return (
    <div className="p-8 bg-white text-slate-900 border" id="feasibility-report">
      <div className="flex justify-between items-start mb-8 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold uppercase tracking-wider">Technical Feasibility Report</h1>
          <p className="text-sm text-slate-500">Document ID: {form.id.slice(-8).toUpperCase()}</p>
        </div>
        <div className="text-right">
          <p className="font-bold">SENSOR CRM</p>
          <p className="text-xs text-slate-500">{format(new Date(), 'PPP')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Customer Details</h3>
          <p className="text-sm"><strong>Lead Name:</strong> {lead.customerName}</p>
          <p className="text-sm"><strong>Contact:</strong> {lead.contactPerson}</p>
          <p className="text-sm"><strong>Category:</strong> {form.category}</p>
          <p className="text-sm"><strong>Sub-Category:</strong> {form.subCategory}</p>
        </div>
        <div className="text-right">
          <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Review Summary</h3>
          <p className="text-sm text-slate-700"><strong>Status:</strong> <span className={form.overallStatus === 'Feasible' ? 'text-green-600' : 'text-red-600'}>{form.overallStatus}</span></p>
          <p className="text-sm text-slate-700"><strong>Revision:</strong> {form.revisionCount}</p>
          <p className="text-sm text-slate-700"><strong>Submitted By:</strong> {form.submittedBy}</p>
          <p className="text-sm text-slate-700"><strong>TAT:</strong> {form.turnaroundTime || 'N/A'} hours</p>
        </div>
      </div>

      <table className="w-full mb-8 border-collapse">
        <thead className="bg-slate-50">
          <tr>
            <th className="border p-2 text-left text-xs font-bold uppercase">Parameter</th>
            <th className="border p-2 text-left text-xs font-bold uppercase">Customer Input</th>
            <th className="border p-2 text-left text-xs font-bold uppercase">Design Status</th>
            <th className="border p-2 text-left text-xs font-bold uppercase">Remarks / Suggestions</th>
          </tr>
        </thead>
        <tbody>
          {form.parameters.map((param, index) => (
            <tr key={index}>
              <td className="border p-2 text-sm">{param.name}</td>
              <td className="border p-2 text-sm">{param.customerInput}</td>
              <td className="border p-2 text-sm">
                <span className={param.designStatus === 'Accepted' ? 'text-green-600' : 'text-amber-600 font-bold'}>
                  {param.designStatus || 'Pending'}
                </span>
              </td>
              <td className="border p-2 text-sm italic text-slate-600">
                {param.designSuggestion || param.remark || '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bg-slate-50 p-4 rounded border">
        <h3 className="text-xs font-bold uppercase text-slate-400 mb-2">Overall Engineering Response</h3>
        <p className="text-sm leading-relaxed">{form.designResponse || "No summary response provided."}</p>
      </div>

      <div className="mt-12 pt-4 border-t flex justify-between">
        <div className="text-center">
          <div className="h-10 w-32 border-b border-slate-300 mb-1"></div>
          <p className="text-[10px] text-slate-400 uppercase">Sales Engineer</p>
        </div>
        <div className="text-center">
          <div className="h-10 w-32 border-b border-slate-300 mb-1"></div>
          <p className="text-[10px] text-slate-400 uppercase">Design Lead</p>
        </div>
      </div>
      
      <div className="mt-8 text-center text-[10px] text-slate-300">
        This is an automatically generated technical feasibility report from Sensor CRM.
      </div>
    </div>
  );
}
