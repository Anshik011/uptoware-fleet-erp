'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { MiningTrip, WeighbridgeMetrics } from '@/types/fleet';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { WeighbridgeDashboard } from '@/components/weighbridge/WeighbridgeDashboard';
import { WeighbridgeTable } from '@/components/weighbridge/WeighbridgeTable';
import { WeighbridgeScaleModal } from '@/components/weighbridge/WeighbridgeScaleModal';
import { TripDrawer } from '@/components/trips/TripDrawer';
import { TripWorkflowModal } from '@/components/trips/TripWorkflowModal';
import { Button } from '@/components/ui/Button';
import { Scale, RefreshCw, AlertCircle } from 'lucide-react';

export default function WeighbridgePage() {
  const { hasRole } = useAuth();
  const canManage = hasRole(['Fleet Manager', 'Dispatcher', 'Administrator']);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<WeighbridgeMetrics>({
    pendingTripsCount: 0,
    completedTodayCount: 0,
    totalTonnageWeighed: 0,
    averageNetPayloadTons: 0,
  });

  const [pendingQueue, setPendingQueue] = useState<MiningTrip[]>([]);
  const [completedRecords, setCompletedRecords] = useState<MiningTrip[]>([]);
  const [mineSites, setMineSites] = useState<string[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMineSite, setSelectedMineSite] = useState('ALL');
  const [selectedMaterial, setSelectedMaterial] = useState('ALL');

  // Modals & Drawers
  const [scaleModalTrip, setScaleModalTrip] = useState<MiningTrip | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [workflowAction, setWorkflowAction] = useState<{
    trip: MiningTrip;
    action: string;
  } | null>(null);

  // Load filter options (mine sites & materials)
  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await fetch('/api/trips/options');
        const json = await res.json();
        if (res.ok && json.success && json.data) {
          setMineSites(json.data.mineSites.map((s: { siteName: string }) => s.siteName));
          setMaterials(json.data.materials || []);
        }
      } catch (err) {
        console.warn('Could not load weighbridge filter options:', err);
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
        if (selectedMineSite !== 'ALL') params.set('mine_site', selectedMineSite);
        if (selectedMaterial !== 'ALL') params.set('material', selectedMaterial);
        if (searchQuery.trim()) params.set('q', searchQuery.trim());

        const res = await fetch(`/api/weighbridge?${params.toString()}`);
        const json = await res.json();
        if (ignore) return;

        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to fetch weighbridge operations data.');
        }

        setError(null);
        setMetrics(json.metrics);
        setPendingQueue(json.pendingQueue || []);
        setCompletedRecords(json.completedRecords || []);
      } catch (err: unknown) {
        if (ignore) return;
        const msg = err instanceof Error ? err.message : 'Network error fetching weighbridge data.';
        setError(msg);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      ignore = true;
    };
  }, [selectedMineSite, selectedMaterial, searchQuery, refreshIndex]);

  const fetchWeighbridgeData = useCallback(() => {
    setIsLoading(true);
    setRefreshIndex((prev) => prev + 1);
  }, []);

  return (
    <AppShell
      headerTitle="Weighbridge Operations"
      headerSubtitle="Gross, tare, and net payload measurement, scale ticket validation, and haulage verification"
    >
      <PageContainer className="space-y-6">
        <PageHeader
          title="Weighbridge Operations"
          subtitle="Gross, tare, and net payload measurement, scale ticket validation, and haulage verification"
          breadcrumbs={[
            { label: 'Dashboard', href: '/' },
            { label: 'Weighbridge Operations' },
          ]}
          actions={
            <Button
              variant="outline"
              size="md"
              icon={RefreshCw}
              onClick={fetchWeighbridgeData}
              disabled={isLoading}
              data-testid="btn-refresh-weighbridge"
            >
              Refresh Scales
            </Button>
          }
        />

      {/* Error Alert Box */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-sm text-rose-800">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-rose-900">Weighbridge Data Retrieval Failed</h4>
            <p className="mt-0.5">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchWeighbridgeData}>
            Retry
          </Button>
        </div>
      )}

      {/* Live Operational Metrics Dashboard */}
      <WeighbridgeDashboard metrics={metrics} isLoading={isLoading} />

      {/* Main Table */}
      <WeighbridgeTable
        pendingQueue={pendingQueue}
        completedRecords={completedRecords}
        mineSites={mineSites}
        materials={materials}
        searchQuery={searchQuery}
        selectedMineSite={selectedMineSite}
        selectedMaterial={selectedMaterial}
        onSearchChange={setSearchQuery}
        onMineSiteChange={setSelectedMineSite}
        onMaterialChange={setSelectedMaterial}
        onSelectTrip={(trip) => setSelectedTripId(trip.id)}
        onCaptureScale={(trip) => setScaleModalTrip(trip)}
        canManage={canManage}
      />

      {/* Scale Capture Modal */}
      <WeighbridgeScaleModal
        isOpen={Boolean(scaleModalTrip)}
        trip={scaleModalTrip}
        onClose={() => setScaleModalTrip(null)}
        onSuccess={() => {
          setScaleModalTrip(null);
          fetchWeighbridgeData();
        }}
      />

      {/* Trip Details Slide-Over Drawer */}
      <TripDrawer
        tripId={selectedTripId}
        onClose={() => setSelectedTripId(null)}
        onOpenActionModal={(trip, action) => {
          setSelectedTripId(null);
          setWorkflowAction({ trip, action });
        }}
        canManage={canManage}
      />

      {/* Workflow Action Modal for Approved/Delivered transitions if triggered from drawer */}
      {workflowAction && (
        <TripWorkflowModal
          isOpen={Boolean(workflowAction)}
          trip={workflowAction.trip}
          action={workflowAction.action}
          onClose={() => setWorkflowAction(null)}
          onSuccess={() => {
            setWorkflowAction(null);
            fetchWeighbridgeData();
          }}
        />
      )}
      </PageContainer>
    </AppShell>
  );
}

