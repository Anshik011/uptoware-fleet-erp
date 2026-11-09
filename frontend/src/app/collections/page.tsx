'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { CollectionsTable } from '@/components/finance/CollectionsTable';
import { PaymentEntryRecord } from '@/lib/frappe';
import { formatCurrency } from '@/config/branding';
import Link from 'next/link';
import {
  CreditCard,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  FileSpreadsheet,
} from 'lucide-react';

export default function CollectionsPage() {
  const [payments, setPayments] = useState<PaymentEntryRecord[]>([]);
  const [summary, setSummary] = useState<any>({
    totalReceived: 0,
    totalAllocated: 0,
    totalUnallocated: 0,
    totalCollectionsCount: 0,
  });
  const [paymentModes, setPaymentModes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCollections = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/finance/collections');
      const json = await res.json();
      if (json.success) {
        setPayments(json.payments || []);
        setSummary(json.summary || {});
        setPaymentModes(json.paymentModes || []);
      } else {
        setError(json.error || 'Failed to load collections data.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching collections data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, []);

  return (
    <AppShell>
      <PageContainer>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Customer Collections & Receipts
              </h1>
              <p className="text-sm text-slate-500">
                Liquid receipts and invoice settlements from submitted ERPNext Payment Entries
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/reports"
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Collections Reports</span>
            </Link>

            <button
              onClick={fetchCollections}
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
                Receipt Source:
              </span>
              <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
                ERPNext Payment Entries (Type: Receive, docstatus = 1)
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Payments are recognized as cash realization, not top-line revenue
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Collections KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Total Received */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Total Collected</span>
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-emerald-700 tracking-tight">
                  {formatCurrency(summary.totalReceived || 0)}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  {summary.totalCollectionsCount || 0} payment receipts
                </div>
              </div>
            </div>

            {/* 2. Total Allocated */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Allocated to Invoices</span>
                <div className="p-2 rounded-lg bg-blue-50 text-blue-700">
                  <CheckCircle className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  {formatCurrency(summary.totalAllocated || 0)}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Applied against open receivables
                </div>
              </div>
            </div>

            {/* 3. Unallocated Advances */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-500 mb-2">
                <span className="text-xs font-semibold uppercase tracking-wider">Unallocated Advances</span>
                <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <div>
                <div className="text-2xl font-bold text-slate-900 tracking-tight">
                  {formatCurrency(summary.totalUnallocated || 0)}
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Client deposit / advance buffer
                </div>
              </div>
            </div>

            {/* 4. Payment Modes Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Channels ({paymentModes.length})
              </div>
              <div className="space-y-1">
                {paymentModes.slice(0, 2).map((m) => (
                  <div key={m.mode} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 truncate">{m.mode}</span>
                    <span className="font-semibold text-slate-900 font-mono">{formatCurrency(m.amount)}</span>
                  </div>
                ))}
                {paymentModes.length === 0 && (
                  <div className="text-xs text-slate-400">No payment channels active</div>
                )}
              </div>
            </div>
          </div>

          {/* Collections Table */}
          <CollectionsTable payments={payments} loading={loading} onRefresh={fetchCollections} />
        </div>
      </PageContainer>
    </AppShell>
  );
}
