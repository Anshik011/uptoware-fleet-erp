'use client';

import React, { useState, useEffect } from 'react';
import { FleetReportColumn, FleetReportResult } from '@/types/fleet';
import {
  FileSpreadsheet,
  Play,
  RefreshCw,
  Calendar,
  Download,
  Filter,
  AlertCircle,
  Truck,
  Building,
  ShieldCheck,
} from 'lucide-react';

interface ComplianceReportViewerProps {
  vehicles?: Array<{ name: string; license_plate: string }>;
  insuranceCompanies?: string[];
}

export const PHASE5_7_REPORTS = [
  {
    name: 'Vehicle Insurance Register',
    description: 'Comprehensive register of all vehicle insurance policies, IDVs, premiums, and validity horizons.',
    category: 'Insurance Policies',
  },
  {
    name: 'Insurance Expiry Report',
    description: 'Targeted audit of active insurance contracts expiring within 30, 60, or 90 days.',
    category: 'Insurance Policies',
  },
  {
    name: 'Vehicle Document Expiry Report',
    description: 'Consolidated report tracking Fitness (FC), PUC, Road Tax, and Permit expiration across the fleet.',
    category: 'Statutory Compliance',
  },
  {
    name: 'Upcoming Renewals',
    description: 'Urgent renewal calendar tracking policies and statutory covenants due for renewal within threshold.',
    category: 'Renewals & Expiry',
  },
  {
    name: 'Expired Insurance & Documents',
    description: 'Regulatory audit of all lapsed, overdue, and non-compliant haulage assets blocking dispatch.',
    category: 'Statutory Compliance',
  },
  {
    name: 'Insurance Premium by Vehicle',
    description: 'Financial analysis of insurance cost distributions, average premiums, and total coverage per asset.',
    category: 'Insurance Policies',
  },
  {
    name: 'Insurance Renewal History',
    description: 'Historical audit trail of policy renewal chains, previous policy linkages, and coverage continuity.',
    category: 'Renewals & Expiry',
  },
];

export function ComplianceReportViewer({
  vehicles = [],
  insuranceCompanies = [],
}: ComplianceReportViewerProps) {
  const [selectedReport, setSelectedReport] = useState('Vehicle Insurance Register');
  const [fromDate, setFromDate] = useState('2026-01-01');
  const [toDate, setToDate] = useState('2026-12-31');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [daysThreshold, setDaysThreshold] = useState('30');

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reportResult, setReportResult] = useState<FleetReportResult | null>(null);

  const executeReport = async (reportName = selectedReport) => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: Record<string, any> = {
        company: 'Uptoware',
        from_date: fromDate,
        to_date: toDate,
        show_all: 1,
      };

      if (selectedVehicle) filters.vehicle = selectedVehicle;
      if (selectedCompany) filters.insurance_company = selectedCompany;
      if (daysThreshold) {
        filters.days = parseInt(daysThreshold, 10);
        filters.within_days = parseInt(daysThreshold, 10);
        filters.days_threshold = parseInt(daysThreshold, 10);
      }

      const res = await fetch('/api/compliance/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_name: reportName,
          filters,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to execute report');
      }

      setReportResult({
        columns: data.columns || [],
        result: data.result || [],
        reportName,
      });
    } catch (err: any) {
      setError(err.message || 'Report execution error');
      setReportResult(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    executeReport(selectedReport);
  }, [selectedReport]);

  const handleExportCSV = () => {
    if (!reportResult || !reportResult.result.length) return;

    const headers = reportResult.columns.map((c) => `"${c.label}"`).join(',');
    const rows = reportResult.result.map((row) =>
      reportResult.columns
        .map((c) => {
          const val = row[c.fieldname] ?? '';
          return `"${String(val).replace(/"/g, '""')}"`;
        })
        .join(',')
    );

    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${selectedReport.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Report Selector Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex-1 max-w-xl">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Native ERPNext Compliance Report (7 Available)
            </label>
            <select
              value={selectedReport}
              onChange={(e) => setSelectedReport(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            >
              {PHASE5_7_REPORTS.map((r) => (
                <option key={r.name} value={r.name}>
                  [{r.category}] {r.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1.5">
              {PHASE5_7_REPORTS.find((r) => r.name === selectedReport)?.description}
            </p>
          </div>

          <div className="flex items-center gap-2 self-end lg:self-auto">
            <button
              onClick={() => executeReport(selectedReport)}
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  Execute Report
                </>
              )}
            </button>

            {reportResult && reportResult.result.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            )}
          </div>
        </div>

        {/* Filters Grid */}
        <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* From Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">From Date</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">To Date</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Vehicle Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Vehicle Asset</label>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            >
              <option value="">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.name} value={v.name}>
                  {v.name} {v.license_plate ? `(${v.license_plate})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Insurer Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Insurer</label>
            <input
              type="text"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              placeholder="e.g. TATA AIG"
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Days Threshold */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Days Horizon</label>
            <select
              value={daysThreshold}
              onChange={(e) => setDaysThreshold(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="15">Within 15 Days</option>
              <option value="30">Within 30 Days</option>
              <option value="60">Within 60 Days</option>
              <option value="90">Within 90 Days</option>
              <option value="365">Within 365 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-900 font-mono uppercase tracking-wider">
              {reportResult?.reportName || selectedReport}
            </h3>
          </div>
          <div className="text-xs text-slate-500 font-mono">
            {reportResult ? `${reportResult.result.length} records returned` : 'Ready to execute'}
          </div>
        </div>

        <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 bg-slate-100 z-10 shadow-sm">
              <tr className="border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                {reportResult?.columns.map((col, idx) => (
                  <th
                    key={col.fieldname || idx}
                    className={`py-2.5 px-3 whitespace-nowrap ${
                      col.fieldtype === 'Currency' || col.fieldtype === 'Float' || col.fieldtype === 'Int'
                        ? 'text-right'
                        : 'text-left'
                    }`}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={reportResult?.columns.length || 6}
                    className="py-12 text-center text-slate-400"
                  >
                    <div className="inline-block w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mb-2" />
                    <p className="text-xs">Executing Frappe RPC query report...</p>
                  </td>
                </tr>
              ) : !reportResult || reportResult.result.length === 0 ? (
                <tr>
                  <td
                    colSpan={reportResult?.columns.length || 6}
                    className="py-12 text-center text-slate-500"
                  >
                    <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-sm text-slate-700">No records found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      No records match the applied date and threshold filters for this report.
                    </p>
                  </td>
                </tr>
              ) : (
                reportResult.result.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/75 transition-colors">
                    {reportResult.columns.map((col, cIdx) => {
                      const val = row[col.fieldname];
                      const isNumber =
                        col.fieldtype === 'Currency' ||
                        col.fieldtype === 'Float' ||
                        col.fieldtype === 'Int';

                      return (
                        <td
                          key={cIdx}
                          className={`py-2 px-3 whitespace-nowrap ${
                            isNumber
                              ? 'text-right font-mono font-medium text-slate-900'
                              : 'text-left text-slate-700'
                          }`}
                        >
                          {col.fieldtype === 'Currency' && typeof val === 'number'
                            ? `₹${val.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                            : val !== null && val !== undefined
                            ? String(val)
                            : '—'}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

