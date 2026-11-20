'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { RevenueTable } from '@/components/finance/RevenueTable';
import { SalesInvoiceRecord } from '@/lib/frappe';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/config/branding';
import {
  IndianRupee,
  Clock,
  AlertCircle,
  Loader2,
  CheckCircle2,
  CreditCard,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface RevenueSummary {
  totalInvoiced: number;
  totalOutstanding: number;
  totalCollections: number;
  paidInvoicesCount: number;
  overdueInvoicesCount: number;
}

function RevenueContent() {
  const { hasRole } = useAuth();
  const canCreate = hasRole(['Fleet Manager', 'Sales', 'Administrator']);
  const canViewFinancials = hasRole(['Administrator', 'Accountant', 'Fleet Manager']);

  const [invoices, setInvoices] = useState<SalesInvoiceRecord[]>([]);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  // Summary cards - 100% dynamic from live data
  const fetchInvoicesAndSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [revenueRes, collectionsRes] = await Promise.all([
        fetch('/api/finance/revenue'),
        fetch('/api/finance/collections'),
      ]);

      const revenueJson = await revenueRes.json();
      const collectionsJson = await collectionsRes.json();

      if (!revenueRes.ok || !revenueJson.success) {
        throw new Error(revenueJson.error || 'Failed to fetch invoices');
      }

      setInvoices(revenueJson.invoices || []);

      // Calculate collection rate from outstanding vs invoiced
      const totalInvoiced = revenueJson.summary?.totalInvoiced || 0;
      const totalOutstanding = revenueJson.summary?.totalOutstanding || 0;
      const totalCollections = collectionsJson.summary?.totalReceived || 0;

      setSummary({
        totalInvoiced,
        totalOutstanding,
        totalCollections,
        paidInvoicesCount: revenueJson.summary?.paidInvoicesCount || 0,
        overdueInvoicesCount: revenueJson.invoices.filter((i: SalesInvoiceRecord) => i.status === 'Overdue').length,
      });
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
      setSummaryLoading(false);
    }
  }, []);

  // Fetch data on mount and when auth changes
  useEffect(() => {
    if (!canViewFinancials) return;
    fetchInvoicesAndSummary();
  }, [canViewFinancials, fetchInvoicesAndSummary]);

  // Calculate KPIs from live invoices
  const totalOutstanding = summary?.totalOutstanding || 0;
  const collectionRate = summary && summary.totalInvoiced > 0
    ? Math.round(((summary.totalInvoiced - summary.totalOutstanding) / summary.totalInvoiced) * 100)
    : 0;

  const handleInvoiceCreated = useCallback(() => {
    fetchInvoicesAndSummary();
  }, [fetchInvoicesAndSummary]);

  return (
    <>
      {/* Page Header */}
      <PageHeader
        title="Commercial Revenue & Invoicing"
        subtitle="Sales invoices, customer billing, payment tracking, and collection management"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Commercial Revenue', href: '/revenue' },
        ]}
        actions={
          canCreate && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                // Invoice preparation is triggered from Trip Drawer for Delivered trips
                // Select a trip and click the "Prepare Invoice" action in the drawer
              }}
            >
              Prepare Invoice
            </Button>
          )
        }
      />

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 mb-6">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Dynamic KPI Cards Strip */}
      {!summaryLoading && summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Total Invoiced */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-center shrink-0">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Invoiced
              </span>
              <div
                className="text-xl font-bold text-slate-900 font-mono"
                data-testid="metric-total-invoiced"
              >
                {formatCurrency(summary.totalInvoiced)}
              </div>
            </div>
          </div>

          {/* Outstanding Receivables */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Outstanding Receivables
              </span>
              <div
                className="text-xl font-bold text-slate-900 font-mono"
                data-testid="metric-outstanding"
              >
                {formatCurrency(totalOutstanding)}
              </div>
              <span className="text-[11px] text-slate-400">
                {collectionRate}% Collection Rate
              </span>
            </div>
          </div>

          {/* Total Collections */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
              <CreditCard className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Collections
              </span>
              <div
                className="text-xl font-bold text-slate-900 font-mono"
                data-testid="metric-collections"
              >
                {formatCurrency(summary.totalCollections)}
              </div>
            </div>
          </div>

          {/* Paid Invoices */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-900 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Paid Invoices
              </span>
              <div
                className="text-xl font-bold text-slate-900 font-mono"
                data-testid="metric-paid-invoices"
              >
                {summary.paidInvoicesCount}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Revenue Table (owns InvoiceDetailDrawer and PaymentRecordingModal state) */}
      <RevenueTable
        invoices={invoices}
        loading={isLoading}
        onRefresh={fetchInvoicesAndSummary}
      />
    </>
  );
}

export default function RevenuePage() {
  return (
    <AppShell
      headerTitle="Commercial Revenue"
      headerSubtitle="Sales invoices, payments, and collection tracking"
    >
      <PageContainer>
        <Suspense
          fallback={
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
              <span className="text-xs font-medium">Loading revenue data...</span>
            </div>
          }
        >
          <RevenueContent />
        </Suspense>
      </PageContainer>
    </AppShell>
  );
}