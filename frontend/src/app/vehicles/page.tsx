'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { VehicleTable } from '@/components/vehicles/VehicleTable';
import { AddVehicleModal } from '@/components/vehicles/AddVehicleModal';
import { VehicleDrawer } from '@/components/vehicles/VehicleDrawer';
import { Vehicle } from '@/types/fleet';
import { Truck, CheckCircle2, Wrench, ShieldAlert, Loader2, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

function VehiclesTableSection() {
  const searchParams = useSearchParams();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.get('status') || 'ALL');
  const [selectedCompliance, setSelectedCompliance] = useState<string>(searchParams.get('compliance') || 'ALL');
  const [sortBy, setSortBy] = useState<string>('plate-asc');

  // Modal & Drawer State
  const [isAddModalOpen, setIsAddModalOpen] = useState(searchParams.get('action') === 'new');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);

  const fetchVehicles = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
      if (selectedCompliance !== 'ALL') params.set('compliance', selectedCompliance);

      const res = await fetch(`/api/vehicles?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch vehicles list');
      }

      let data: Vehicle[] = json.data || [];

      // Client side sort
      if (sortBy === 'plate-asc') {
        data.sort((a, b) => a.licensePlate.localeCompare(b.licensePlate));
      } else if (sortBy === 'plate-desc') {
        data.sort((a, b) => b.licensePlate.localeCompare(a.licensePlate));
      } else if (sortBy === 'odometer-desc') {
        data.sort((a, b) => b.lastOdometer - a.lastOdometer);
      } else if (sortBy === 'capacity-desc') {
        data.sort((a, b) => b.payloadCapacityTons - a.payloadCapacityTons);
      }

      setVehicles(data);
    } catch (err: any) {
      console.error('Fetch vehicles error:', err);
      setError(err.message || 'Error communicating with vehicle database');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedStatus, selectedCompliance, sortBy]);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  // Overall counts for summary cards
  const totalCount = vehicles.length;
  const activeCount = vehicles.filter((v) => v.status === 'Active' || v.status === 'On Trip').length;
  const workshopCount = vehicles.filter((v) => v.status === 'Under Maintenance' || v.status === 'Breakdown').length;
  const complianceWarningCount = vehicles.filter((v) => v.statutory.overall === 'expiring_soon' || v.statutory.overall === 'expired').length;

  return (
    <>
      <PageHeader
        title="Vehicle Fleet Directory"
        subtitle="Operational transport register, operator rosters, mechanical specifications and statutory compliance"
        actions={
          <Button
            variant="primary"
            size="md"
            icon={PlusCircle}
            onClick={() => setIsAddModalOpen(true)}
            data-testid="btn-register-vehicle-header"
          >
            Register Transport Unit
          </Button>
        }
      />

      {/* Fleet Asset Metric Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full min-w-0 overflow-hidden">
          <div className="flex items-start justify-between gap-2 text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 min-w-0">
            <span className="flex-1 min-w-0 break-words">Total Fleet Units</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-900 border border-blue-100 flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4 text-blue-900" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight min-w-0 break-words my-auto py-1">
            {totalCount}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-3 pt-2 border-t border-slate-100 min-w-0 break-words">
            Heavy Tipper & Transport Roster
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full min-w-0 overflow-hidden">
          <div className="flex items-start justify-between gap-2 text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 min-w-0">
            <span className="flex-1 min-w-0 break-words">Ready for Dispatch</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight min-w-0 break-words my-auto py-1">
            {activeCount}
          </div>
          <div className="text-xs text-emerald-700 font-medium mt-3 pt-2 border-t border-slate-100 min-w-0 break-words">
            Active haulage operations
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full min-w-0 overflow-hidden">
          <div className="flex items-start justify-between gap-2 text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 min-w-0">
            <span className="flex-1 min-w-0 break-words">In Workshop</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-900 border border-amber-100 flex items-center justify-center shrink-0">
              <Wrench className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight min-w-0 break-words my-auto py-1">
            {workshopCount}
          </div>
          <div className="text-xs text-slate-500 font-medium mt-3 pt-2 border-t border-slate-100 min-w-0 break-words">
            Under Maintenance or Breakdown
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-full min-w-0 overflow-hidden">
          <div className="flex items-start justify-between gap-2 text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2 min-w-0">
            <span className="flex-1 min-w-0 break-words">Statutory Attention</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-900 border border-rose-100 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight min-w-0 break-words my-auto py-1">
            {complianceWarningCount}
          </div>
          <div className="text-xs text-rose-700 font-medium mt-3 pt-2 border-t border-slate-100 min-w-0 break-words">
            Expiring soon or overdue
          </div>
        </div>
      </div>

      {/* Global Error Banner */}
      {error && (
        <ErrorState
          title="Registry Synchronization Notice"
          message={error}
          onRetry={fetchVehicles}
        />
      )}

      {/* Vehicles Table Component */}
      <VehicleTable
        vehicles={vehicles}
        onSelectVehicle={(id) => setSelectedVehicleId(id)}
        onOpenAddVehicle={() => setIsAddModalOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedCompliance={selectedCompliance}
        onComplianceChange={setSelectedCompliance}
        sortBy={sortBy}
        onSortChange={setSortBy}
      />

      {/* Background Sync Indicator */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 text-xs text-slate-500 py-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
          <span>Fetching live asset registry...</span>
        </div>
      )}

      {/* Add Vehicle Modal */}
      <AddVehicleModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => fetchVehicles()}
      />

      {/* Vehicle Specification Drawer */}
      <VehicleDrawer
        vehicleId={selectedVehicleId}
        onClose={() => setSelectedVehicleId(null)}
      />
    </>
  );
}

export default function VehiclesPage() {
  return (
    <AppShell
      headerTitle="Vehicle Fleet Directory"
      headerSubtitle="Operational transport register, operator rosters, mechanical specifications and statutory compliance"
    >
      <PageContainer>
        <Suspense
          fallback={
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs font-medium">Loading fleet assets and statutory compliance...</span>
            </div>
          }
        >
          <VehiclesTableSection />
        </Suspense>
      </PageContainer>
    </AppShell>
  );
}
