'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { FuelLog, FuelMetrics } from '@/types/fleet';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { FuelDashboard } from '@/components/fuel/FuelDashboard';
import { FuelLogTable } from '@/components/fuel/FuelLogTable';
import { AddFuelModal } from '@/components/fuel/AddFuelModal';
import { AddFuelPurchaseModal } from '@/components/fuel/AddFuelPurchaseModal';
import { FuelPurchaseSaleLedger } from '@/components/fuel/FuelPurchaseSaleLedger';
import { FuelLogDrawer } from '@/components/fuel/FuelLogDrawer';
import { FuelApprovalModal } from '@/components/fuel/FuelApprovalModal';
import { HsdAverageMenu } from '@/components/fuel/HsdAverageMenu';
import { Button } from '@/components/ui/Button';
import {
  Fuel,
  PlusCircle,
  RefreshCw,
  AlertCircle,
  Gauge,
  ListOrdered,
  ShoppingCart,
  TrendingDown,
  Scale,
  Loader2,
} from 'lucide-react';

function FuelPageContent() {
  const searchParams = useSearchParams();
  const { hasRole } = useAuth();
  const canManage = hasRole(['Fleet Manager', 'Workshop Supervisor', 'Administrator']);

  const paramTab = searchParams.get('tab');
  const initialTab: 'sale' | 'purchase' | 'ledger' | 'average' =
    paramTab === 'purchase' || paramTab === 'ledger' || paramTab === 'average'
      ? paramTab
      : 'sale';

  const [activeTab, setActiveTab] = useState<'sale' | 'purchase' | 'ledger' | 'average'>(initialTab);

  useEffect(() => {
    if (paramTab === 'purchase' || paramTab === 'ledger' || paramTab === 'average' || paramTab === 'sale') {
      setActiveTab(paramTab as any);
    }
  }, [paramTab]);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<FuelMetrics>({
    totalLitres: 0,
    totalFuelCost: 0,
    averageRatePerLitre: 0,
    averageKmPerLitre: 0,
    pendingApprovalsCount: 0,
    approvedLogsCount: 0,
  });

  const [logs, setLogs] = useState<FuelLog[]>([]);
  const [vehicles, setVehicles] = useState<Array<{ id: string; licensePlate: string }>>([]);
  const [fuelSources, setFuelSources] = useState<string[]>(['Site Bowser', 'External Pump']);
  const [mineSites, setMineSites] = useState<Array<{ id: string; siteName: string }>>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('ALL');
  const [selectedSource, setSelectedSource] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals & Drawers
  const [isAddSaleModalOpen, setIsAddSaleModalOpen] = useState(false);
  const [isAddPurchaseModalOpen, setIsAddPurchaseModalOpen] = useState(false);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);
  const [approvalModalState, setApprovalModalState] = useState<{
    log: FuelLog;
    action: 'Approve' | 'Reject' | 'Re-open';
  } | null>(null);

  // Load filter options
  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await fetch('/api/fuel/options');
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          setVehicles(json.data.vehicles || []);
          if (json.data.fuelSources?.length) setFuelSources(json.data.fuelSources);
          if (json.data.mineSites) setMineSites(json.data.mineSites);
        }
      } catch (err) {
        console.warn('Could not load fuel filter options:', err);
      }
    }
    loadOptions();
  }, []);

  const [refreshIndex, setRefreshIndex] = useState(0);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
      if (selectedVehicle !== 'ALL') params.set('vehicle', selectedVehicle);
      if (selectedSource !== 'ALL') params.set('source', selectedSource);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());

      const res = await fetch(`/api/fuel?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch fuel operations data.');
      }

      setError(null);
      setMetrics(json.metrics);
      setLogs(json.logs || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error fetching fuel dispensation logs.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [selectedStatus, selectedVehicle, selectedSource, searchQuery]);

  useEffect(() => {
    loadData();
  }, [loadData, refreshIndex]);

  const fetchFuelData = useCallback(() => {
    setRefreshIndex((prev) => prev + 1);
  }, []);

  const handleQuickApprove = async (log: FuelLog) => {
    if (!confirm(`Are you sure you want to approve fuel record for vehicle ${log.vehicle} (${log.quantityLitres} L)?`)) {
      return;
    }
    try {
      setIsLoading(true);
      const res = await fetch(`/api/fuel/${encodeURIComponent(log.id)}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'Approve' }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve fuel record.');
      }
      fetchFuelData();
    } catch (err: any) {
      alert(`Approval error: ${err.message}`);
      setIsLoading(false);
    }
  };

  const handleBulkApprove = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;
    if (!confirm(`Are you sure you want to approve ${ids.length} selected fuel logs in batch?`)) return;

    try {
      setIsLoading(true);
      const res = await fetch('/api/approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctype: 'Fuel Log',
          ids,
          action: 'Approve',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to bulk approve fuel logs.');
      }

      fetchFuelData();
    } catch (err: any) {
      alert(`Bulk approval error: ${err.message}`);
      setIsLoading(false);
    }
  }, [fetchFuelData]);

  const handleDeleteLog = async (log: FuelLog) => {
    if (!window.confirm(`Are you sure you want to delete fuel log ${log.id}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/fuel/${encodeURIComponent(log.id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || 'Cannot delete fuel log. Approved fuel entries cannot be deleted.');
        return;
      }
      fetchFuelData();
    } catch (err: any) {
      alert(err.message || 'Failed to delete fuel log.');
    }
  };

  return (
    <>
      <PageHeader
        title={
          activeTab === 'purchase'
            ? 'Fuel Purchase Inward Report'
            : activeTab === 'sale'
            ? 'Fuel Sale & Dispensation Report'
            : activeTab === 'ledger'
            ? 'Fuel Purchase & Sale Stock Balancing Ledger'
            : 'HSD Average Consumption Menu'
        }
        subtitle={
          activeTab === 'purchase'
            ? 'Log and track diesel procurement, tanker inward deliveries, rates, and approval ledgers'
            : activeTab === 'sale'
            ? 'Refuel dispensation tracking across fleet vehicles, site bowser supply, and mileage benchmarking'
            : activeTab === 'ledger'
            ? 'Reconcile total diesel purchased vs dispensed with net balance stock litres and value'
            : 'Automated fuel reconciliation matrix based on round trip distance and actual fuel logs'
        }
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Fuel Operations', href: '/fuel' },
          {
            label:
              activeTab === 'purchase'
                ? 'Fuel Purchases'
                : activeTab === 'sale'
                ? 'Fuel Sales'
                : activeTab === 'ledger'
                ? 'Balancing Ledger'
                : 'HSD Average',
          },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Top 4 Navigation Ribbon Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setActiveTab('sale')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'sale' ? 'bg-blue-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <TrendingDown className="w-3.5 h-3.5" />
                <span>Fuel Sale (Outward)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('purchase')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'purchase' ? 'bg-blue-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Fuel Purchase (Inward)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('ledger')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'ledger' ? 'bg-blue-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Balancing Ledger</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('average')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'average' ? 'bg-blue-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Gauge className="w-3.5 h-3.5 text-amber-400" />
                <span>HSD Average</span>
              </button>
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={fetchFuelData}
              disabled={isLoading}
              className="text-xs h-8 px-2.5"
            >
              Refresh
            </Button>

            {canManage && activeTab === 'sale' && (
              <Button
                variant="primary"
                size="sm"
                icon={PlusCircle}
                onClick={() => setIsAddSaleModalOpen(true)}
                className="text-xs h-8 px-3"
              >
                + Log Fuel Dispensation
              </Button>
            )}

            {canManage && activeTab === 'purchase' && (
              <Button
                variant="primary"
                size="sm"
                icon={PlusCircle}
                onClick={() => setIsAddPurchaseModalOpen(true)}
                className="text-xs h-8 px-3"
              >
                + Log Fuel Purchase
              </Button>
            )}
          </div>
        }
      />

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <p className="font-semibold">Failed to fetch fuel operations data</p>
            <p className="text-xs mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* RENDER CONTENT ACCORDING TO ACTIVE TAB */}
      {activeTab === 'average' ? (
        <HsdAverageMenu />
      ) : activeTab === 'purchase' || activeTab === 'ledger' ? (
        <FuelPurchaseSaleLedger
          logs={logs}
          vehicles={vehicles}
          fuelSources={fuelSources}
          activeSubTab={activeTab === 'purchase' ? 'purchase' : 'ledger'}
          onSubTabChange={(t) => setActiveTab(t as any)}
          onOpenAddPurchase={() => setIsAddPurchaseModalOpen(true)}
          onOpenAddSale={() => setIsAddSaleModalOpen(true)}
          onApproveLog={handleQuickApprove}
          onSelectLog={(log) => setSelectedLogId(log.id)}
          canManage={canManage}
        />
      ) : (
        /* TAB: FUEL SALE (DISPENSATION) */
        <div className="space-y-6">
          <FuelPurchaseSaleLedger
            logs={logs}
            vehicles={vehicles}
            fuelSources={fuelSources}
            activeSubTab="sale"
            onSubTabChange={(t) => setActiveTab(t as any)}
            onOpenAddPurchase={() => setIsAddPurchaseModalOpen(true)}
            onOpenAddSale={() => setIsAddSaleModalOpen(true)}
            onApproveLog={handleQuickApprove}
            onSelectLog={(log) => setSelectedLogId(log.id)}
            canManage={canManage}
          />
        </div>
      )}

      {/* Add Fuel Dispensation Modal */}
      <AddFuelModal
        isOpen={isAddSaleModalOpen}
        onClose={() => setIsAddSaleModalOpen(false)}
        onSuccess={fetchFuelData}
      />

      {/* Add Fuel Purchase (Inward) Modal */}
      <AddFuelPurchaseModal
        isOpen={isAddPurchaseModalOpen}
        onClose={() => setIsAddPurchaseModalOpen(false)}
        onSuccess={fetchFuelData}
        vehicles={vehicles}
        mineSites={mineSites}
      />

      {/* Fuel Log Details Slide-Over Drawer */}
      <FuelLogDrawer
        logId={selectedLogId}
        onClose={() => setSelectedLogId(null)}
        onOpenApprovalModal={(log, action) => {
          setSelectedLogId(null);
          setApprovalModalState({ log, action });
        }}
        canManage={canManage}
      />

      {/* Fuel Approval Modal */}
      {approvalModalState && (
        <FuelApprovalModal
          isOpen={!!approvalModalState}
          log={approvalModalState.log}
          action={approvalModalState.action}
          onClose={() => setApprovalModalState(null)}
          onSuccess={fetchFuelData}
        />
      )}
    </>
  );
}

export default function FuelPage() {
  return (
    <AppShell
      headerTitle="Fuel Management & Dispensation"
      headerSubtitle="Fuel consumption logs, bowser issuance, pump receipts, fuel efficiency analytics and multi-tier approval"
    >
      <PageContainer className="space-y-6">
        <Suspense
          fallback={
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
              <span className="text-xs font-medium">Loading fuel operations & ledgers...</span>
            </div>
          }
        >
          <FuelPageContent />
        </Suspense>
      </PageContainer>
    </AppShell>
  );
}
