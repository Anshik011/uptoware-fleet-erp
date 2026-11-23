'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { FuelLog, FuelMetrics } from '@/types/fleet';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { FuelDashboard } from '@/components/fuel/FuelDashboard';
import { FuelLogTable } from '@/components/fuel/FuelLogTable';
import { AddFuelModal } from '@/components/fuel/AddFuelModal';
import { FuelLogDrawer } from '@/components/fuel/FuelLogDrawer';
import { FuelApprovalModal } from '@/components/fuel/FuelApprovalModal';
import { HsdAverageMenu } from '@/components/fuel/HsdAverageMenu';
import { Button } from '@/components/ui/Button';
import { Fuel, PlusCircle, RefreshCw, AlertCircle, Gauge, ListOrdered } from 'lucide-react';

export default function FuelPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole(['Fleet Manager', 'Workshop Supervisor', 'Administrator']);

  const [activeTab, setActiveTab] = useState<'logs' | 'average'>('logs');
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

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('ALL');
  const [selectedSource, setSelectedSource] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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
        }
      } catch (err) {
        console.warn('Could not load fuel filter options:', err);
      }
    }
    loadOptions();
  }, []);

  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function loadData() {
      try {
        const params = new URLSearchParams();
        if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
        if (selectedVehicle !== 'ALL') params.set('vehicle', selectedVehicle);
        if (selectedSource !== 'ALL') params.set('source', selectedSource);
        if (searchQuery.trim()) params.set('q', searchQuery.trim());
        const isTestMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('include_test') === 'true';
        if (isTestMode) params.set('include_test', 'true');

        const res = await fetch(`/api/fuel?${params.toString()}`);
        const json = await res.json();
        if (ignore) return;

        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to fetch fuel operations data.');
        }

        setError(null);
        setMetrics(json.metrics);
        setLogs(json.logs || []);
      } catch (err: unknown) {
        if (ignore) return;
        const msg = err instanceof Error ? err.message : 'Network error fetching fuel dispensation logs.';
        setError(msg);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [selectedStatus, selectedVehicle, selectedSource, searchQuery, refreshIndex]);

  const fetchFuelData = useCallback(() => {
    setIsLoading(true);
    setRefreshIndex((prev) => prev + 1);
  }, []);

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
    if (!window.confirm(`Are you sure you want to delete fuel dispensation log ${log.id}?`)) {
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
    <AppShell
      headerTitle="Fuel Management & Dispensation"
      headerSubtitle="Fuel consumption logs, bowser issuance, pump receipts, fuel efficiency analytics and multi-tier approval"
    >
      <PageContainer className="space-y-6">
        <PageHeader
          title="Fuel Logs & Dispensation"
          subtitle="Live refuel tracking, bowser-to-pump cost control, and interval mileage auditing"
          breadcrumbs={[
            { label: 'Dashboard', href: '/' },
            { label: 'Fuel Dispensation' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 mr-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('logs')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'logs' ? 'bg-white text-blue-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>Fuel Dispensation Logs</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('average')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === 'average' ? 'bg-blue-900 text-white shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Gauge className="w-3.5 h-3.5 text-amber-400" />
                  <span>HSD Average Menu</span>
                </button>
              </div>

              {activeTab === 'logs' && (
                <>
                  <Button
                    variant="outline"
                    size="md"
                    icon={RefreshCw}
                    onClick={fetchFuelData}
                    disabled={isLoading}
                    data-testid="btn-refresh-fuel"
                  >
                    Refresh
                  </Button>
                  {canManage && (
                    <Button
                      variant="primary"
                      size="md"
                      icon={PlusCircle}
                      onClick={() => setIsAddModalOpen(true)}
                      data-testid="btn-add-fuel-header"
                    >
                      Log Fuel Entry
                    </Button>
                  )}
                </>
              )}
            </div>
          }
        />

      {/* Error Alert Box */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-sm text-rose-800">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-rose-900">Fuel Data Retrieval Failed</h4>
            <p className="mt-0.5">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchFuelData}>
            Retry
          </Button>
        </div>
      )}

      {activeTab === 'average' ? (
        <HsdAverageMenu />
      ) : (
        <>
          {/* Live Operational Metrics Dashboard */}
          <FuelDashboard metrics={metrics} isLoading={isLoading} />

          {/* Main Table */}
          <FuelLogTable
            logs={logs}
            vehicles={vehicles}
            fuelSources={fuelSources}
            searchQuery={searchQuery}
            selectedVehicle={selectedVehicle}
            selectedSource={selectedSource}
            selectedStatus={selectedStatus}
            onSearchChange={setSearchQuery}
            onVehicleChange={setSelectedVehicle}
            onSourceChange={setSelectedSource}
            onStatusChange={setSelectedStatus}
            onSelectLog={(log) => setSelectedLogId(log.id)}
            onOpenAddFuel={() => setIsAddModalOpen(true)}
            onOpenApprovalModal={(log, action) => setApprovalModalState({ log, action })}
            onBulkApprove={handleBulkApprove}
            onDeleteLog={handleDeleteLog}
            canManage={canManage}
          />
        </>
      )}

      {/* Add Fuel Entry Modal */}
      <AddFuelModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchFuelData();
        }}
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

      {/* Approval / Rejection Modal */}
      {approvalModalState && (
        <FuelApprovalModal
          isOpen={Boolean(approvalModalState)}
          log={approvalModalState.log}
          action={approvalModalState.action}
          onClose={() => setApprovalModalState(null)}
          onSuccess={() => {
            setApprovalModalState(null);
            fetchFuelData();
          }}
        />
      )}
      </PageContainer>
    </AppShell>
  );
}

