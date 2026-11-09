'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { TripTable } from '@/components/trips/TripTable';
import { TripDrawer } from '@/components/trips/TripDrawer';
import { CreateTripModal } from '@/components/trips/CreateTripModal';
import { TripWorkflowModal } from '@/components/trips/TripWorkflowModal';
import { MiningTrip } from '@/types/fleet';
import { useAuth } from '@/context/AuthContext';
import {
  Compass,
  CheckCircle2,
  Scale,
  Truck,
  PlusCircle,
  Loader2,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

function TripsTableSection() {
  const searchParams = useSearchParams();
  const { hasRole } = useAuth();
  const canManage = hasRole(['Fleet Manager', 'Dispatcher', 'Administrator']);

  const [trips, setTrips] = useState<MiningTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>(
    searchParams.get('status') || 'ALL'
  );
  const [selectedMineSite, setSelectedMineSite] = useState<string>(
    searchParams.get('mine_site') || 'ALL'
  );
  const [sortBy, setSortBy] = useState<string>('dispatch_desc');

  // Modals & Drawer State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(
    searchParams.get('action') === 'new'
  );
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [workflowAction, setWorkflowAction] = useState<{
    isOpen: boolean;
    trip: MiningTrip | null;
    action: string | null;
  }>({
    isOpen: false,
    trip: null,
    action: null,
  });

  const fetchTrips = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
      if (selectedMineSite !== 'ALL') params.set('mine_site', selectedMineSite);

      const res = await fetch(`/api/trips?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch mining trips directory');
      }

      let data: MiningTrip[] = json.data || [];

      // Sort data
      if (sortBy === 'dispatch_desc') {
        data.sort((a, b) => (b.dispatchDateTime || '').localeCompare(a.dispatchDateTime || ''));
      } else if (sortBy === 'dispatch_asc') {
        data.sort((a, b) => (a.dispatchDateTime || '').localeCompare(b.dispatchDateTime || ''));
      } else if (sortBy === 'weight_desc') {
        data.sort((a, b) => (b.netWeightTons || 0) - (a.netWeightTons || 0));
      } else if (sortBy === 'revenue_desc') {
        data.sort((a, b) => (b.grossRevenue || 0) - (a.grossRevenue || 0));
      } else if (sortBy === 'id_asc') {
        data.sort((a, b) => a.id.localeCompare(b.id));
      }

      setTrips(data);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while fetching trips');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedStatus, selectedMineSite, sortBy]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  // Derived metric values - 100% computed from live data
  const totalTrips = trips.length;
  const inTransitTrips = trips.filter(
    (t) => t.tripStatus === 'Dispatched' || t.tripStatus === 'Weighbridge Confirmed'
  ).length;
  const weighbridgePendingTrips = trips.filter(
    (t) => t.tripStatus === 'Dispatched'
  ).length;
  const completedTrips = trips.filter(
    (t) => t.tripStatus === 'Delivered'
  ).length;

  // Extract unique mine site options for filtering
  const mineSiteOptions = Array.from(
    new Set(trips.map((t) => t.mineSite).filter(Boolean))
  );

  const handleOpenActionModal = (trip: MiningTrip, action: string) => {
    setWorkflowAction({
      isOpen: true,
      trip,
      action,
    });
  };

  const handleActionSuccess = () => {
    fetchTrips();
    // Refresh currently open drawer if relevant
    if (selectedTripId) {
      const currentId = selectedTripId;
      setSelectedTripId(null);
      setTimeout(() => setSelectedTripId(currentId), 50);
    }
  };

  return (
    <>
      <PageHeader
        title="Mining Trips & Haulage Dispatch"
        subtitle="Manage dispatch operations, weighbridge tickets, and ore haulage logistics across active pits"
        breadcrumbs={[
          { label: 'Fleet Operations', href: '/vehicles' },
          { label: 'Mining Trips', href: '/trips' },
        ]}
        actions={
          canManage ? (
            <Button
              variant="primary"
              size="md"
              icon={PlusCircle}
              onClick={() => setIsCreateModalOpen(true)}
              data-testid="btn-create-trip-header"
            >
              New Trip
            </Button>
          ) : undefined
        }
      />

      {/* Dynamic KPI Cards Strip - 100% Dynamic from live records */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Trips */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-center shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Trips
            </span>
            <div
              className="text-2xl font-bold text-slate-900 font-mono"
              data-testid="metric-total-trips"
            >
              {isLoading ? '—' : totalTrips}
            </div>
            <span className="text-[11px] text-slate-400">Haulage Log</span>
          </div>
        </div>

        {/* Active In-Transit */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              In Transit
            </span>
            <div
              className="text-2xl font-bold text-blue-600 font-mono"
              data-testid="metric-in-transit-trips"
            >
              {isLoading ? '—' : inTransitTrips}
            </div>
            <span className="text-[11px] text-blue-600 font-medium">
              Dispatched / On Road
            </span>
          </div>
        </div>

        {/* Weighbridge Pending */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Scale Pending
            </span>
            <div
              className="text-2xl font-bold text-amber-600 font-mono"
              data-testid="metric-weighbridge-pending"
            >
              {isLoading ? '—' : weighbridgePendingTrips}
            </div>
            <span className="text-[11px] text-amber-600 font-medium">
              Awaiting Weighment
            </span>
          </div>
        </div>

        {/* Completed Deliveries */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Completed
            </span>
            <div
              className="text-2xl font-bold text-teal-600 font-mono"
              data-testid="metric-completed-trips"
            >
              {isLoading ? '—' : completedTrips}
            </div>
            <span className="text-[11px] text-teal-600 font-medium">
              Delivered & Closed
            </span>
          </div>
        </div>
      </div>

      {/* Main Table or Loading/Error State */}
      {error ? (
        <ErrorState
          title="Failed to Load Mining Trips"
          message={error}
          onRetry={fetchTrips}
        />
      ) : (
        <TripTable
          trips={trips}
          onSelectTrip={(id) => setSelectedTripId(id)}
          onOpenCreateTrip={() => setIsCreateModalOpen(true)}
          onOpenActionModal={handleOpenActionModal}
          canManage={canManage}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedMineSite={selectedMineSite}
          onMineSiteChange={setSelectedMineSite}
          mineSiteOptions={mineSiteOptions}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      )}

      {/* Slide-over Detail Drawer */}
      <TripDrawer
        tripId={selectedTripId}
        onClose={() => setSelectedTripId(null)}
        onOpenActionModal={handleOpenActionModal}
        canManage={canManage}
      />

      {/* Create Trip Modal */}
      <CreateTripModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchTrips();
        }}
      />

      {/* Workflow Action Modal */}
      <TripWorkflowModal
        isOpen={workflowAction.isOpen}
        onClose={() =>
          setWorkflowAction({ isOpen: false, trip: null, action: null })
        }
        trip={workflowAction.trip}
        action={workflowAction.action}
        onSuccess={handleActionSuccess}
      />
    </>
  );
}

export default function MiningTripsPage() {
  return (
    <AppShell
      headerTitle="Mining Trips Ledger"
      headerSubtitle="Real-time ore haulage tracking, payload dispatch, weighbridge confirmation and delivery log"
    >
      <PageContainer>
        <Suspense
          fallback={
            <div className="py-24 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
              <span className="text-xs font-medium">Loading haulage operations...</span>
            </div>
          }
        >
          <TripsTableSection />
        </Suspense>
      </PageContainer>
    </AppShell>
  );
}

