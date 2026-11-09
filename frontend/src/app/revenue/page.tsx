'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { RevenueTable } from '@/components/finance/RevenueTable';
import { SalesInvoiceRecord } from '@/lib/frappe';
import { formatCurrency } from '@/config/branding';
import Link from 'next/link';
import {
  IndianRupee,
  RefreshCw,
  AlertCircle,
  FileText,
  CheckCircle,
  Clock,
  RotateCcw,
  FileSpreadsheet,
} from 'lucide-react';

export default function RevenuePage() {
  const [invoices, setInvoices] = useState<SalesInvoiceRecord[]>([]);
  const [summary, setSummary] = useState<any>({
    totalInvoiced: 0,
    totalReturns: 0,
    netRevenue: 0,
    totalOutstanding: 0,
    paidInvoicesCount: 0,
    totalInvoicesCount: 0,
  });
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRevenue = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/finance/revenue');
      const json = await res.json();
      if (json.success) {
        setInvoices(json.invoices || []);
        setSummary(json.summary || {});
        setCustomers(json.customers || []);
      } else {
        setError(json.error || 'Failed to load revenue data.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching revenue data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRevenue();
  }, []);

  return (
    <AppShell>
      <PageContainer>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Billed Revenue & Invoices
              </h1>
              <p className="text-sm text-slate-500">
                Legally enforceable accounts receivable revenue from submitted ERPNext Sales Invoices
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/reports"
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>Revenue Reports</span>
            </Link>

            <button
              onClick={fetchRevenue}
              disabled={loading}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Top Period Badge */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Revenue Authority:
              </span>
              <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
                Submitted Sales Invoices (docstatus = 1)
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Trip rate/ton is indicative only and excluded from revenue
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Financial KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Net Invoiced Revenue */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Net Invoiced Revenue</span>
                <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
                  <IndianRupee className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  {formatCurrency(summary.netRevenue || 0)}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Gross: {formatCurrency(summary.totalInvoiced || 0)}
                </div>
              </div>
            </div>

            {/* 2. Outstanding Balance */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Outstanding Receivables</span>
                <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-700 tracking-tight">
                  {formatCurrency(summary.totalOutstanding || 0)}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Unsettled commercial credit
                </div>
              </div>
            </div>

            {/* 3. Paid Invoices */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Paid Invoices</span>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  {summary.paidInvoicesCount || 0} / {summary.totalInvoicesCount || 0}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Fully settled invoices
                </div>
              </div>
            </div>

            {/* 4. Credit Notes / Returns */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Credit Notes & Returns</span>
                <div className="p-2 rounded-lg bg-rose-50 text-rose-700">
                  <RotateCcw className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-rose-600 tracking-tight">
                  -{formatCurrency(summary.totalReturns || 0)}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Deductions & returns
                </div>
              </div>
            </div>
          </div>

          {/* Customer Breakdown Cards (if any) */}
          {customers.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Customer Billing Summary
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {customers.map((c) => (
                  <div key={c.customer} className="p-3 rounded-lg border border-slate-100 bg-slate-50 text-xs">
                    <div className="font-bold text-slate-900">{c.customer}</div>
                    <div className="mt-1 flex items-center justify-between text-slate-600">
                      <span>Invoiced ({c.count} inv):</span>
                      <strong className="font-mono">{formatCurrency(c.invoiced)}</strong>
                    </div>
                    <div className="flex items-center justify-between text-amber-700 font-medium">
                      <span>Outstanding:</span>
                      <span className="font-mono">{formatCurrency(c.outstanding)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoices Table */}
          <RevenueTable invoices={invoices} loading={loading} onRefresh={fetchRevenue} />
        </div>
      </PageContainer>
    </AppShell>
  );
}
