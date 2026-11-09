'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { VehicleBreakdown, BreakdownMetrics } from '@/types/fleet';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { BreakdownDashboard } from '@/components/breakdowns/BreakdownDashboard';
import { BreakdownTable } from '@/components/breakdowns/BreakdownTable';
import { AddBreakdownModal } from '@/components/breakdowns/AddBreakdownModal';
import { BreakdownDrawer } from '@/components/breakdowns/BreakdownDrawer';
import { BreakdownWorkflowModal } from '@/components/breakdowns/BreakdownWorkflowModal';
import { Button } from '@/components/ui/Button';
import { Wrench, PlusCircle, RefreshCw, AlertCircle } from 'lucide-react';

export default function MaintenancePage() {
  const { hasRole } = useAuth();
  const canManage = hasRole(['Fleet Manager', 'Workshop Supervisor', 'Administrator']);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<BreakdownMetrics>({
    totalIncidents: 0,
    inWorkshopCount: 0,
    awaitingPartsCount: 0,
    criticalIncidents: 0,
    totalDowntimeHours: 0,
    closedIncidents: 0,
  });

  const [breakdowns, setBreakdowns] = useState<VehicleBreakdown[]>([]);
  const [vehicles, setVehicles] = useState<Array<{ id: string; licensePlate: string }>>([]);
  const [breakdownTypes, setBreakdownTypes] = useState<string[]>([]);
  const [severities, setSeverities] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState('ALL');
  const [selectedType, setSelectedType] = useState('ALL');
  // Default to In Workshop for the workshop maintenance view
  const [selectedStatus, setSelectedStatus] = useState('In Workshop');

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBreakdownId, setSelectedBreakdownId] = useState<string | null>(null);
  const [workflowModalState, setWorkflowModalState] = useState<{
    breakdown: VehicleBreakdown;
    defaultAction?: string;
  } | null>(null);

  // Load filter options
  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await fetch('/api/breakdowns/options');
        const json = await res.json();
        if (res.ok && json.success) {
          if (json.vehicles) setVehicles(json.vehicles);
          if (json.breakdownTypes) setBreakdownTypes(json.breakdownTypes);
          if (json.severities) setSeverities(json.severities);
        }
      } catch (err) {
        console.warn('Could not load breakdown filter options:', err);
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
        if (selectedSeverity !== 'ALL') params.set('severity', selectedSeverity);
        if (selectedType !== 'ALL') params.set('breakdown_type', selectedType);
        if (searchQuery.trim()) params.set('q', searchQuery.trim());

        const res = await fetch(`/api/breakdowns?${params.toString()}`);
        const json = await res.json();
        if (ignore) return;

        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to fetch maintenance records.');
        }

        setError(null);
        setMetrics(json.metrics);
        setBreakdowns(json.breakdowns || []);
      } catch (err: unknown) {
        if (ignore) return;
        const msg = err instanceof Error ? err.message : 'Network error fetching maintenance records.';
        setError(msg);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [selectedStatus, selectedVehicle, selectedSeverity, selectedType, searchQuery, refreshIndex]);

  const fetchMaintenanceData = useCallback(() => {
    setIsLoading(true);
    setRefreshIndex((prev) => prev + 1);
  }, []);

  return (
    <AppShell
      headerTitle="Workshop Maintenance & Repair Operations"
      headerSubtitle="Active workshop queue, repair diagnostics, parts consumption, and technician job tracking"
    >
      <PageContainer className="space-y-6">
        <PageHeader
          title="Workshop Maintenance Register"
          subtitle="Work orders in progress, parts requisitions, technician diagnosis, and downtime logs"
          breadcrumbs={[
            { label: 'Dashboard', href: '/' },
            { label: 'Workshop Maintenance' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="md"
                icon={RefreshCw}
                onClick={fetchMaintenanceData}
                disabled={isLoading}
                data-testid="btn-refresh-maintenance"
              >
                Refresh
              </Button>
              {canManage && (
                <Button
                  variant="primary"
                  size="md"
                  icon={PlusCircle}
                  onClick={() => setIsAddModalOpen(true)}
                  data-testid="btn-add-maintenance-header"
                >
                  Log Maintenance Job
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
              <h4 className="font-semibold text-rose-900">Maintenance Data Retrieval Failed</h4>
              <p className="mt-0.5">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchMaintenanceData}>
              Retry
            </Button>
          </div>
        )}

        {/* Live Operational Metrics Dashboard */}
        <BreakdownDashboard metrics={metrics} isLoading={isLoading} />

        {/* Main Table */}
        <BreakdownTable
          breakdowns={breakdowns}
          vehicles={vehicles}
          breakdownTypes={breakdownTypes}
          severities={severities}
          searchQuery={searchQuery}
          selectedVehicle={selectedVehicle}
          selectedSeverity={selectedSeverity}
          selectedType={selectedType}
          selectedStatus={selectedStatus}
          onSearchChange={setSearchQuery}
          onVehicleChange={setSelectedVehicle}
          onSeverityChange={setSelectedSeverity}
          onTypeChange={setSelectedType}
          onStatusChange={setSelectedStatus}
          onSelectBreakdown={(b) => setSelectedBreakdownId(b.id)}
          onOpenAddBreakdown={() => setIsAddModalOpen(true)}
          onOpenWorkflowModal={(b, act) => setWorkflowModalState({ breakdown: b, defaultAction: act })}
          canManage={canManage}
        />

        {/* Log Maintenance Modal */}
        <AddBreakdownModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            setIsAddModalOpen(false);
            fetchMaintenanceData();
          }}
        />

        {/* Details Drawer */}
        <BreakdownDrawer
          breakdownId={selectedBreakdownId}
          onClose={() => setSelectedBreakdownId(null)}
          onOpenWorkflowModal={(b, act) => {
            setSelectedBreakdownId(null);
            setWorkflowModalState({ breakdown: b, defaultAction: act });
          }}
          canManage={canManage}
        />

        {/* Workflow Transition Modal */}
        {workflowModalState && (
          <BreakdownWorkflowModal
            isOpen={Boolean(workflowModalState)}
            breakdown={workflowModalState.breakdown}
            defaultAction={workflowModalState.defaultAction}
            onClose={() => setWorkflowModalState(null)}
            onSuccess={() => {
              setWorkflowModalState(null);
              fetchMaintenanceData();
            }}
          />
        )}
      </PageContainer>
    </AppShell>
  );
}

