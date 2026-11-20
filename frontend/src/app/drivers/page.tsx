'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { DriverTable } from '@/components/drivers/DriverTable';
import { AddDriverModal } from '@/components/drivers/AddDriverModal';
import { EditDriverModal } from '@/components/drivers/EditDriverModal';
import { DriverDrawer } from '@/components/drivers/DriverDrawer';
import { ShiftAllocationModal } from '@/components/shifts/ShiftAllocationModal';
import { VehicleDrawer } from '@/components/vehicles/VehicleDrawer';
import { Driver } from '@/types/fleet';
import { useAuth } from '@/context/AuthContext';
import { useMine } from '@/context/MineContext';
import { checkPermission } from '@/lib/auth';
import { UserCheck, CheckCircle2, Truck, ShieldAlert, PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

function DriversTableSection() {
  const searchParams = useSearchParams();
  const { user, hasRole } = useAuth();
  const { currentMine } = useMine();
  const canManage = hasRole(['Fleet Manager', 'Administrator']);

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>(searchParams.get('status') || 'ALL');
  const [selectedAvailability, setSelectedAvailability] = useState<string>(searchParams.get('availability') || 'ALL');
  const [selectedCompliance, setSelectedCompliance] = useState<string>(searchParams.get('compliance') || 'ALL');
  const [sortBy, setSortBy] = useState<string>('name-asc');

  // Modal & Drawer State
  const [isAddModalOpen, setIsAddModalOpen] = useState(searchParams.get('action') === 'new');
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [allocatingDriverId, setAllocatingDriverId] = useState<string | null>(null);
  const [viewVehicleId, setViewVehicleId] = useState<string | null>(null);

  const fetchDrivers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
      if (selectedAvailability !== 'ALL') params.set('availability', selectedAvailability);
      if (selectedCompliance !== 'ALL') params.set('compliance', selectedCompliance);
      if (currentMine && currentMine !== 'ALL') params.set('mine_site', currentMine);

      const res = await fetch(`/api/drivers?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch drivers directory');
      }

      let data: Driver[] = json.data || [];

      // Sort data
      if (sortBy === 'name-asc') {
        data.sort((a, b) => a.fullName.localeCompare(b.fullName));
      } else if (sortBy === 'name-desc') {
        data.sort((a, b) => b.fullName.localeCompare(a.fullName));
      } else if (sortBy === 'score-desc') {
        data.sort((a, b) => b.safetyScore - a.safetyScore);
      } else if (sortBy === 'expiry-asc') {
        data.sort((a, b) => {
          if (!a.expiryDate) return 1;
          if (!b.expiryDate) return -1;
          return a.expiryDate.localeCompare(b.expiryDate);
        });
      }

      setDrivers(data);
    } catch (err: any) {
      console.error('Fetch drivers error:', err);
      setError(err.message || 'Error communicating with ERPNext driver database');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedStatus, selectedAvailability, selectedCompliance, sortBy, currentMine]);

  useEffect(() => {
    fetchDrivers();
  }, [fetchDrivers]);

  // Overall counts dynamically computed from actual backend records (Zero hardcoding!)
  const totalCount = drivers.length;
  const activeCount = drivers.filter((d) => d.status === 'Active').length;
  const assignedCount = drivers.filter((d) => Boolean(d.assignedVehicle)).length;
  const complianceWarningCount = drivers.filter(
    (d) => d.licenseStatus === 'expiring_soon' || d.licenseStatus === 'expired'
  ).length;

  return (
    <>
      <PageHeader
        title="Driver & Transport Operator Directory"
        subtitle="Operational driver roster, licensing compliance, vehicle assignments, and safety ratings"
        actions={
          canManage && (
            <Button
              variant="primary"
              size="md"
              icon={PlusCircle}
              onClick={() => setIsAddModalOpen(true)}
              data-testid="btn-register-driver"
            >
              Register Driver
            </Button>
          )
        }
      />

      {/* KPI Stats Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Total Roster
            </span>
            <UserCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900">{totalCount}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Registered operators</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Operators
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-900">{activeCount}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">Eligible for dispatch</span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Assigned to Unit
            </span>
            <Truck className="w-4 h-4 text-blue-900" />
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-950">{assignedCount}</div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {totalCount - assignedCount} standby operators
          </span>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Compliance Alerts
            </span>
            <ShieldAlert
              className={`w-4 h-4 ${
                complianceWarningCount > 0 ? 'text-amber-500' : 'text-slate-400'
              }`}
            />
          </div>
          <div
            className={`mt-2 text-2xl font-bold ${
              complianceWarningCount > 0 ? 'text-amber-600' : 'text-slate-900'
            }`}
          >
            {complianceWarningCount}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {complianceWarningCount > 0 ? 'License expiring / expired' : 'All licenses compliant'}
          </span>
        </div>
      </div>

      {/* Main Table or Loading/Error State */}
      {isLoading && drivers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 bg-white rounded-xl border border-slate-200">
          <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
          <p className="text-xs text-slate-500 font-medium">Loading driver directory...</p>
        </div>
      ) : error ? (
        <ErrorState
          title="Failed to load driver roster"
          message={error}
          onRetry={fetchDrivers}
        />
      ) : (
        <DriverTable
          drivers={drivers}
          onSelectDriver={(id) => setSelectedDriverId(id)}
          onEditDriver={(driver) => setEditingDriver(driver)}
          onOpenAddDriver={() => setIsAddModalOpen(true)}
          canManage={canManage}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedAvailability={selectedAvailability}
          onAvailabilityChange={setSelectedAvailability}
          selectedCompliance={selectedCompliance}
          onComplianceChange={setSelectedCompliance}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onAllocateVehicle={(driverId) => setAllocatingDriverId(driverId)}
          onViewVehicle={(vehicleId) => setViewVehicleId(vehicleId)}
        />
      )}

      {/* Slide-over Profile Drawer */}
      <DriverDrawer
        driverId={selectedDriverId}
        onClose={() => setSelectedDriverId(null)}
        onEditDriver={(driver) => {
          setSelectedDriverId(null);
          setEditingDriver(driver);
        }}
        canManage={canManage}
        onAllocateVehicle={(driverId) => setAllocatingDriverId(driverId)}
        onViewVehicle={(vehicleId) => setViewVehicleId(vehicleId)}
        onAllocationChange={fetchDrivers}
      />

      {/* Register Driver Modal */}
      {canManage && (
        <AddDriverModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            fetchDrivers();
          }}
        />
      )}

      {/* Edit Driver Modal */}
      {canManage && (
        <EditDriverModal
          isOpen={Boolean(editingDriver)}
          driver={editingDriver}
          onClose={() => setEditingDriver(null)}
          onSuccess={() => {
            fetchDrivers();
          }}
        />
      )}

      {/* Contextual Shift Allocation Modal for Driver */}
      {allocatingDriverId && (
        <ShiftAllocationModal
          isOpen={Boolean(allocatingDriverId)}
          initialDriver={allocatingDriverId}
          onClose={() => setAllocatingDriverId(null)}
          onSuccess={() => {
            setAllocatingDriverId(null);
            fetchDrivers();
          }}
        />
      )}

      {/* Contextual Vehicle Details Drawer */}
      <VehicleDrawer
        vehicleId={viewVehicleId}
        onClose={() => setViewVehicleId(null)}
      />
    </>
  );
}

export default function DriversPage() {
  return (
    <AppShell
      headerTitle="Driver Roster & Profiles"
      headerSubtitle="Operational driver roster, licensing compliance, vehicle assignments and safety ratings"
    >
      <PageContainer>
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-24 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
              <p className="text-xs text-slate-500 font-medium">Loading driver registry...</p>
            </div>
          }
        >
          <DriversTableSection />
        </Suspense>
      </PageContainer>
    </AppShell>
  );
}
