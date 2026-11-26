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
import { InvoicePreparationModal } from '@/components/finance/InvoicePreparationModal';
import { ReconcileSummaryTab } from '@/components/trips/ReconcileSummaryTab';

function TripsTableSection() {
  const searchParams = useSearchParams();
  const { hasRole } = useAuth();
  const canManage = hasRole(['Fleet Manager', 'Dispatcher', 'Administrator']);

  const isReportView = searchParams.get('view') === 'report';

  const [trips, setTrips] = useState<MiningTrip[]>([]);
  const [allTripsForMetrics, setAllTripsForMetrics] = useState<MiningTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and Search state
  const tabParam = searchParams.get('tab');
  const [currentTab, setCurrentTab] = useState<'trips' | 'reconcile_summary'>(
    tabParam === 'reconcile_summary' ? 'reconcile_summary' : 'trips'
  );

  useEffect(() => {
    if (tabParam === 'reconcile_summary') {
      setCurrentTab('reconcile_summary');
    } else if (tabParam === 'trips' || !tabParam) {
      setCurrentTab('trips');
    }
  }, [tabParam]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>(
    searchParams.get('status') || 'ALL'
  );
  const [selectedMineSite, setSelectedMineSite] = useState<string>(
    searchParams.get('mine_site') || 'ALL'
  );
  const [sortBy, setSortBy] = useState<string>('dispatch_desc');

  // Modals & Drawer State
  const actionParam = searchParams.get('action');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(
    actionParam === 'new' || actionParam === 'site_sup'
  );
  const [modalMode, setModalMode] = useState<'supervisor' | 'reconcile'>(
    actionParam === 'site_sup' ? 'supervisor' : 'reconcile'
  );

  useEffect(() => {
    if (actionParam === 'new' || actionParam === 'site_sup') {
      setIsCreateModalOpen(true);
      setModalMode(actionParam === 'site_sup' ? 'supervisor' : 'reconcile');
    }
  }, [actionParam]);
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
  const [invoicePreparationTrip, setInvoicePreparationTrip] = useState<MiningTrip | null>(null);

  const fetchTrips = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const isCompoundStatus =
        selectedStatus === 'SITE_SUPERVISOR' ||
        selectedStatus === 'RECONCILE_PENDING' ||
        selectedStatus === 'COMPLETED';

      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedStatus !== 'ALL' && !isCompoundStatus) params.set('status', selectedStatus);
      if (selectedMineSite !== 'ALL') params.set('mine_site', selectedMineSite);

      // Concurrently fetch filtered trips for the table and all trips for the mine site metrics
      const metricParams = new URLSearchParams();
      metricParams.set('status', 'ALL');
      metricParams.set('limit', '500');
      if (selectedMineSite !== 'ALL') metricParams.set('mine_site', selectedMineSite);

      const [res, metricRes] = await Promise.all([
        fetch(`/api/trips?${params.toString()}`),
        fetch(`/api/trips?${metricParams.toString()}`).catch(() => null),
      ]);

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch mining trips directory');
      }

      let data: MiningTrip[] = json.data || [];

      if (selectedStatus === 'SITE_SUPERVISOR') {
        data = data.filter((t) => t.tripStatus === 'Dispatched' || t.tripStatus === 'Draft');
      } else if (selectedStatus === 'RECONCILE_PENDING') {
        data = data.filter(
          (t) => t.tripStatus === 'Weighbridge Confirmed' || (t.tripStatus === 'Dispatched' && !t.averageTonnage)
        );
      } else if (selectedStatus === 'COMPLETED') {
        data = data.filter((t) => t.tripStatus === 'Delivered' || t.tripStatus === 'Approved');
      }

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

      if (metricRes && metricRes.ok) {
        const metricJson = await metricRes.json().catch(() => null);
        if (metricJson?.success && Array.isArray(metricJson.data)) {
          setAllTripsForMetrics(metricJson.data);
        } else {
          setAllTripsForMetrics(data);
        }
      } else {
        setAllTripsForMetrics(data);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred while fetching trips');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedStatus, selectedMineSite, sortBy]);

  useEffect(() => {
    fetchTrips();
  }, [fetchTrips]);

  // Derived metric values - 100% computed from live records across the site
  const metricsSource = allTripsForMetrics.length > 0 ? allTripsForMetrics : trips;
  const totalTrips = metricsSource.length;
  const inTransitTrips = metricsSource.filter(
    (t) => t.tripStatus === 'Dispatched' || t.tripStatus === 'Draft'
  ).length;
  const weighbridgePendingTrips = metricsSource.filter(
    (t) => t.tripStatus === 'Weighbridge Confirmed' || (t.tripStatus === 'Dispatched' && !t.averageTonnage)
  ).length;
  const completedTrips = metricsSource.filter(
    (t) => t.tripStatus === 'Delivered' || t.tripStatus === 'Approved'
  ).length;

  // Extract unique mine site options for filtering
  const mineSiteOptions = Array.from(
    new Set(metricsSource.map((t) => t.mineSite).filter(Boolean))
  );

  const handleOpenActionModal = (trip: MiningTrip, action: string) => {
    setWorkflowAction({
      isOpen: true,
      trip,
      action,
    });
  };

  const [drawerRefreshTrigger, setDrawerRefreshTrigger] = useState(0);

  const handleActionSuccess = () => {
    fetchTrips();
    setDrawerRefreshTrigger((prev) => prev + 1);
  };

  const handleDeleteTrip = async (trip: MiningTrip) => {
    if (!window.confirm(`Are you sure you want to delete trip ${trip.id}? This will permanently remove the trip log.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/trips/${encodeURIComponent(trip.id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || 'Cannot delete trip. If this trip has been invoiced or linked to billing ledgers, deletion is prevented.');
        return;
      }
      fetchTrips();
    } catch (err: any) {
      alert(err.message || 'Failed to delete trip.');
    }
  };

  return (
    <>
      <PageHeader
        title={isReportView ? 'Mining Trips & Haulage Analytics Report' : 'Mining Trips & Haulage Dispatch'}
        subtitle={
          isReportView
            ? 'Comprehensive vehicle-wise haulage log, weight reconciliation records, and dispatch analytics'
            : 'Manage dispatch operations, weighbridge tickets, and ore haulage logistics across active pits'
        }
        breadcrumbs={[
          { label: 'Fleet Operations', href: '/vehicles' },
          { label: isReportView ? 'Trip Report' : 'Mining Trips', href: '/trips' },
        ]}
        actions={
          canManage ? (
            <div className="flex items-center gap-2">
              <Button
                variant="primary"
                size="md"
                icon={PlusCircle}
                onClick={() => {
                  setModalMode('reconcile');
                  setIsCreateModalOpen(true);
                }}
                data-testid="btn-create-trip-header"
              >
                Trip Entry & Reconcile
              </Button>
              <Button
                variant="outline"
                size="md"
                icon={Compass}
                onClick={() => {
                  setModalMode('supervisor');
                  setIsCreateModalOpen(true);
                }}
              >
                Site Supervisor Entry
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Navigation Sub-Tabs: Trips Ledger vs Reconcile Summary */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setCurrentTab('trips')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            currentTab === 'trips'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80'
          }`}
        >
          <Compass className="w-4 h-4" />
          <span>Mining Trips Ledger</span>
        </button>
        <button
          type="button"
          onClick={() => setCurrentTab('reconcile_summary')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            currentTab === 'reconcile_summary'
              ? 'bg-blue-900 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80'
          }`}
        >
          <Scale className="w-4 h-4" />
          <span>Reconcile Summary</span>
        </button>
      </div>

      {currentTab === 'reconcile_summary' ? (
        <ReconcileSummaryTab
          trips={allTripsForMetrics.length > 0 ? allTripsForMetrics : trips}
          onRefresh={fetchTrips}
          isLoading={isLoading}
        />
      ) : (
        <>
          {/* Dynamic KPI Cards Strip - 100% Dynamic from live records, clickable for instant filtering */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Trips */}
        <div
          onClick={() => setSelectedStatus('ALL')}
          className={`p-4 sm:p-5 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'ALL'
              ? 'bg-blue-50/60 border-blue-400 shadow-sm ring-1 ring-blue-500'
              : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
          } flex items-center gap-4`}
          title="Click to view all trips"
        >
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
            <span className="text-[11px] text-slate-400">All Haulage Logs</span>
          </div>
        </div>

        {/* Active In-Transit -> Site Supervisor Trip */}
        <div
          onClick={() => setSelectedStatus('SITE_SUPERVISOR')}
          className={`p-4 sm:p-5 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'SITE_SUPERVISOR' || selectedStatus === 'Dispatched' || selectedStatus === 'Draft'
              ? 'bg-blue-50/60 border-blue-400 shadow-sm ring-1 ring-blue-500'
              : 'bg-white border-slate-200 hover:border-blue-300 shadow-xs'
          } flex items-center gap-4`}
          title="Click to view site supervisor trips (Draft & Dispatched)"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Site Supervisor Trip
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

        {/* Weighbridge Pending -> Reconcile Trip */}
        <div
          onClick={() => setSelectedStatus('RECONCILE_PENDING')}
          className={`p-4 sm:p-5 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'RECONCILE_PENDING' || selectedStatus === 'Weighbridge Confirmed'
              ? 'bg-amber-50/60 border-amber-400 shadow-sm ring-1 ring-amber-500'
              : 'bg-white border-slate-200 hover:border-amber-300 shadow-xs'
          } flex items-center gap-4`}
          title="Click to view trips pending reconcile"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Reconcile Trip
            </span>
            <div
              className="text-2xl font-bold text-amber-600 font-mono"
              data-testid="metric-weighbridge-pending"
            >
              {isLoading ? '—' : weighbridgePendingTrips}
            </div>
            <span className="text-[11px] text-amber-600 font-medium">
              Awaiting Reconcile
            </span>
          </div>
        </div>

        {/* Completed Deliveries */}
        <div
          onClick={() => setSelectedStatus('COMPLETED')}
          className={`p-4 sm:p-5 rounded-xl border transition-all cursor-pointer ${
            selectedStatus === 'COMPLETED' || selectedStatus === 'Delivered' || selectedStatus === 'Approved'
              ? 'bg-teal-50/60 border-teal-400 shadow-sm ring-1 ring-teal-500'
              : 'bg-white border-slate-200 hover:border-teal-300 shadow-xs'
          } flex items-center gap-4`}
          title="Click to view completed trips (Delivered & Approved)"
        >
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
          onEditTrip={(trip) => setSelectedTripId(trip.id)}
          onDeleteTrip={handleDeleteTrip}
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
        </>
      )}

      {/* Slide-over Detail Drawer */}
      <TripDrawer
        tripId={selectedTripId}
        onClose={() => setSelectedTripId(null)}
        onOpenActionModal={handleOpenActionModal}
        onOpenInvoiceModal={(trip) => setInvoicePreparationTrip(trip)}
        canManage={canManage}
        refreshTrigger={drawerRefreshTrigger}
      />

      {/* Create Trip Modal */}
      <CreateTripModal
        isOpen={isCreateModalOpen}
        initialMode={modalMode}
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

      {/* Invoice Preparation Modal */}
      <InvoicePreparationModal
        isOpen={!!invoicePreparationTrip}
        trip={invoicePreparationTrip}
        onClose={() => setInvoicePreparationTrip(null)}
        onInvoiceCreated={() => {
          setInvoicePreparationTrip(null);
          fetchTrips();
        }}
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

