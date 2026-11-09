'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Compass,
  Send,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { DispatchDashboard } from '@/components/dispatch/DispatchDashboard';
import { DispatchQueueTable } from '@/components/dispatch/DispatchQueueTable';
import { DispatchEligibilityModal } from '@/components/dispatch/DispatchEligibilityModal';
import { CreateDispatchModal } from '@/components/dispatch/CreateDispatchModal';
import { TripDrawer } from '@/components/trips/TripDrawer';
import { TripWorkflowModal } from '@/components/trips/TripWorkflowModal';
import { MiningTrip, Vehicle, Driver, MineSite, DispatchMetrics } from '@/types/fleet';
import { useAuth } from '@/context/AuthContext';

export default function DispatchOperationsPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole(['Fleet Manager', 'Dispatcher', 'Administrator']);

  const [metrics, setMetrics] = useState<DispatchMetrics | null>(null);
  const [queue, setQueue] = useState<MiningTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeStatusTab, setActiveStatusTab] = useState('Pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMineSite, setSelectedMineSite] = useState('');

  // Dropdown options
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [mineSites, setMineSites] = useState<MineSite[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);

  // Modals & Drawers state
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [eligibilityTrip, setEligibilityTrip] = useState<MiningTrip | null>(null);
  const [workflowTrip, setWorkflowTrip] = useState<MiningTrip | null>(null);
  const [workflowAction, setWorkflowAction] = useState<string>('');

  // Fetch options once
  useEffect(() => {
    async function fetchOptions() {
      try {
        const res = await fetch('/api/trips/options');
        const json = await res.json();
        if (json.success && json.data) {
          setVehicles(json.data.vehicles || []);
          setDrivers(json.data.drivers || []);
          setMineSites(json.data.mineSites || []);
          setMaterials(json.data.materials || []);
        }
      } catch (e) {
        console.error('Failed to load dispatch options:', e);
      }
    }
    fetchOptions();
  }, []);

  // Fetch queue & metrics
  const fetchDispatchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeStatusTab) params.set('status', activeStatusTab);
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedMineSite) params.set('mine_site', selectedMineSite);

      const res = await fetch(`/api/dispatch?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to load dispatch operations data.');
      }

      setMetrics(data.metrics || null);
      setQueue(data.queue || []);
    } catch (err: any) {
      setError(err.message || 'Error communicating with dispatch service.');
    } finally {
      setIsLoading(false);
    }
  }, [activeStatusTab, searchQuery, selectedMineSite]);

  useEffect(() => {
    fetchDispatchData();
  }, [fetchDispatchData]);

  // Handle direct dispatch authorization
  const handleConfirmDispatch = async (tripId: string) => {
    const res = await fetch(`/api/trips/${encodeURIComponent(tripId)}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'Dispatch' }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Dispatch transition rejected by server.');
    }
    fetchDispatchData();
  };

  const handleOpenWorkflow = (trip: MiningTrip, action: string) => {
    setWorkflowTrip(trip);
    setWorkflowAction(action);
  };

  return (
    <AppShell
      headerTitle="Dispatch Control & Queue"
      headerSubtitle="Operational haulage dispatch, driver-vehicle assignment, and weighbridge staging"
    >
      <PageContainer className="space-y-6">
        <PageHeader
          title="Dispatch Operations Control"
          subtitle="Operational dispatch queue, asset verification, weighbridge staging, and statutory compliance"
          breadcrumbs={[
            { label: 'Dashboard', href: '/' },
            { label: 'Dispatch Operations' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="md"
                icon={RefreshCw}
                onClick={fetchDispatchData}
                disabled={isLoading}
                data-testid="btn-refresh-dispatch"
              >
                Refresh Queue
              </Button>
              {canManage && (
                <Button
                  variant="primary"
                  size="md"
                  icon={Send}
                  onClick={() => setIsCreateModalOpen(true)}
                  data-testid="btn-create-dispatch-header"
                >
                  New Dispatch
                </Button>
              )}
            </div>
          }
        />

      {/* Live Operational Metrics Strip */}
      <DispatchDashboard metrics={metrics} isLoading={isLoading} />

      {/* Error state banner */}
      {error && (
        <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5 shadow-2xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <span className="font-semibold block">Dispatch Service Notice</span>
            <span className="mt-0.5 block">{error}</span>
          </div>
        </div>
      )}

      {/* Dispatch Queue Table */}
      <DispatchQueueTable
        queue={queue}
        activeStatusTab={activeStatusTab}
        onStatusTabChange={setActiveStatusTab}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedMineSite={selectedMineSite}
        onMineSiteChange={setSelectedMineSite}
        mineSites={mineSites}
        isLoading={isLoading}
        canManage={canManage}
        onSelectTrip={(id) => setSelectedTripId(id)}
        onOpenEligibility={(trip) => setEligibilityTrip(trip)}
        onOpenWorkflow={handleOpenWorkflow}
      />

      {/* Statutory Eligibility & Dispatch Confirmation Modal */}
      {eligibilityTrip && (
        <DispatchEligibilityModal
          isOpen={Boolean(eligibilityTrip)}
          onClose={() => setEligibilityTrip(null)}
          tripId={eligibilityTrip.id}
          vehicle={eligibilityTrip.vehicle}
          driver={eligibilityTrip.driver}
          driverName={eligibilityTrip.driverName}
          mineSite={eligibilityTrip.mineSiteName || eligibilityTrip.mineSite}
          destination={eligibilityTrip.destination}
          openingOdometer={eligibilityTrip.openingOdometer}
          onConfirmDispatch={handleConfirmDispatch}
        />
      )}

      {/* Create New Dispatch Modal */}
      <CreateDispatchModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTripCreated={fetchDispatchData}
        vehicles={vehicles}
        drivers={drivers}
        mineSites={mineSites}
        materials={materials}
      />

      {/* Trip Profile Slide-Over Drawer */}
      <TripDrawer
        tripId={selectedTripId}
        onClose={() => setSelectedTripId(null)}
        onOpenActionModal={(trip: MiningTrip, action: string) => {
          setSelectedTripId(null);
          handleOpenWorkflow(trip, action);
        }}
        canManage={canManage}
      />

      {/* Workflow Transition Execution Modal */}
      <TripWorkflowModal
        isOpen={Boolean(workflowTrip)}
        onClose={() => {
          setWorkflowTrip(null);
          setWorkflowAction('');
        }}
        trip={workflowTrip}
        action={workflowAction}
        onSuccess={() => {
          setWorkflowTrip(null);
          setWorkflowAction('');
          fetchDispatchData();
        }}
      />
      </PageContainer>
    </AppShell>
  );
}
