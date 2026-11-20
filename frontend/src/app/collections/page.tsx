'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { CollectionsTable } from '@/components/finance/CollectionsTable';
import { PaymentDetailDrawer } from '@/components/finance/PaymentDetailDrawer';
import { PaymentEntryRecord } from '@/lib/frappe';
import { useAuth } from '@/context/AuthContext';
import { formatCurrency } from '@/config/branding';
import {
  CreditCard,
  RefreshCw,
  AlertCircle,
  Loader2,
  IndianRupee,
  CheckCircle2,
  Clock,
  PlusCircle,
  Landmark,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CollectionsSummary {
  totalReceived: number;
  totalAllocated: number;
  totalUnallocated: number;
  collectionsCount: number;
}

function CollectionsContent() {
  const { hasRole } = useAuth();
  const canCreate = hasRole(['Fleet Manager', 'Sales', 'Administrator']);
  const canViewFinancials = hasRole(['Administrator', 'Accountant', 'Fleet Manager']);

  const [payments, setPayments] = useState<PaymentEntryRecord[]>([]);
  const [summary, setSummary] = useState<CollectionsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [selectedPaymentId, setSelectedPaymentId] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/finance/collections');
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch collections');
      }

      setPayments(json.payments || []);
      setSummary({
        totalReceived: json.summary?.totalReceived || 0,
        totalAllocated: json.summary?.totalAllocated || 0,
        totalUnallocated: json.summary?.totalUnallocated || 0,
        collectionsCount: json.summary?.totalCollectionsCount || 0,
      });
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handlePaymentCreated = () => {
    fetchPayments();
  };

  useEffect(() => {
    if (!canViewFinancials) return;
    fetchPayments();
  }, [canViewFinancials, fetchPayments]);

  if (!canViewFinancials) {
    return (
      <AppShell headerTitle="Customer Collections" headerSubtitle="Payment tracking">
        <PageContainer>
          <ErrorState
            title="Access Denied"
            message="You do not have permission to view the collections register."
          />
        </PageContainer>
      </AppShell>
    );
  }

  const totalReceived = summary?.totalReceived || 0;
  const collectionRate = summary && summary.totalReceived > 0
    ? Math.round(((summary.totalReceived - summary.totalUnallocated) / summary.totalReceived) * 100)
    : 0;

  return (
    <>
      {/* Page Header */}
      <PageHeader
        title="Customer Collections"
        subtitle="Payment entries, receipts, and customer settlement tracking"
        breadcrumbs={[
          { label: 'Finance', href: '/finance' },
          { label: 'Customer Collections', href: '/collections' },
        ]}
        actions={
          canCreate && (
            <Button
              variant="primary"
              size="sm"
              icon={PlusCircle}
              onClick={() => {
                // Open payment recording modal
                // Future: implement payment recording form
              }}
            >
              Record Payment
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
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Total Received */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
              <IndianRupee className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Total Received
              </span>
              <div
                className="text-xl font-bold text-slate-900 font-mono"
                data-testid="metric-total-received"
              >
                {formatCurrency(totalReceived)}
              </div>
            </div>
          </div>

          {/* Allocated Amount */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-center shrink-0">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Allocated to Invoices
              </span>
              <div
                className="text-xl font-bold text-slate-900 font-mono"
                data-testid="metric-allocated"
              >
                {formatCurrency(summary.totalAllocated)}
              </div>
            </div>
          </div>

          {/* Unallocated (Advance) */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Unallocated (Advance)
              </span>
              <div
                className="text-xl font-bold text-slate-900 font-mono"
                data-testid="metric-unallocated"
              >
                {formatCurrency(summary.totalUnallocated)}
              </div>
            </div>
          </div>

          {/* Collections Count */}
          <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 text-emerald-900 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                Collections Count
              </span>
              <div
                className="text-xl font-bold text-slate-900 font-mono"
                data-testid="metric-collections-count"
              >
                {summary.collectionsCount}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collections Table */}
      <CollectionsTable
        payments={payments}
        loading={isLoading}
        onRefresh={fetchPayments}
      />

      {/* Payment Detail Slide-Over Drawer */}
      <PaymentDetailDrawer
        paymentId={selectedPaymentId}
        onClose={() => setSelectedPaymentId(null)}
      />
    </>
  );
}

export default function CollectionsPage() {
  return (
    <AppShell
      headerTitle="Customer Collections"
      headerSubtitle="Payment entries and receipt tracking"
    >
      <PageContainer>
        <Suspense
          fallback={
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
              <span className="text-xs font-medium">Loading collections data...</span>
            </div>
          }
        >
          <CollectionsContent />
        </Suspense>
      </PageContainer>
    </AppShell>
  );
}