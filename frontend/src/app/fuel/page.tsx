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
import { Button } from '@/components/ui/Button';
import { Fuel, PlusCircle, RefreshCw, AlertCircle } from 'lucide-react';

export default function FuelPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole(['Fleet Manager', 'Workshop Supervisor', 'Administrator']);

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
        canManage={canManage}
      />

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

