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
import { Driver } from '@/types/fleet';
import { useAuth } from '@/context/AuthContext';
import { checkPermission } from '@/lib/auth';
import { UserCheck, CheckCircle2, Truck, ShieldAlert, PlusCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

function DriversTableSection() {
  const searchParams = useSearchParams();
  const { user, hasRole } = useAuth();
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

  const fetchDrivers = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
      if (selectedAvailability !== 'ALL') params.set('availability', selectedAvailability);
      if (selectedCompliance !== 'ALL') params.set('compliance', selectedCompliance);

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
  }, [searchQuery, selectedStatus, selectedAvailability, selectedCompliance, sortBy]);

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
          canManage ? (
            <Button
              variant="primary"
              size="md"
              icon={PlusCircle}
              onClick={() => setIsAddModalOpen(true)}
              data-testid="btn-register-driver-header"
            >
              Register Transport Operator
            </Button>
          ) : undefined
        }
      />

      {/* Driver Asset Metric Strip - 100% Dynamic from ERPNext */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Drivers */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-center shrink-0">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Roster
            </span>
            <div className="text-2xl font-bold text-slate-900 font-mono" data-testid="metric-total-drivers">
              {isLoading ? '—' : totalCount}
            </div>
            <span className="text-[11px] text-slate-400">Registered Operators</span>
          </div>
        </div>

        {/* Active Drivers */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Active Operators
            </span>
            <div className="text-2xl font-bold text-emerald-600 font-mono" data-testid="metric-active-drivers">
              {isLoading ? '—' : activeCount}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">
              {totalCount > 0 ? `${Math.round((activeCount / totalCount) * 100)}% Available` : '0%'}
            </span>
          </div>
        </div>

        {/* Assigned Drivers */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Vehicle Assigned
            </span>
            <div className="text-2xl font-bold text-indigo-600 font-mono" data-testid="metric-assigned-drivers">
              {isLoading ? '—' : assignedCount}
            </div>
            <span className="text-[11px] text-slate-400">
              {totalCount > 0 ? `${totalCount - assignedCount} on Standby` : '0 Standby'}
            </span>
          </div>
        </div>

        {/* Compliance Warning */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              License Warnings
            </span>
            <div
              className={`text-2xl font-bold font-mono ${
                complianceWarningCount > 0 ? 'text-amber-600' : 'text-slate-900'
              }`}
              data-testid="metric-license-warnings"
            >
              {isLoading ? '—' : complianceWarningCount}
            </div>
            <span className="text-[11px] text-amber-600 font-medium">
              {complianceWarningCount > 0 ? 'Action Required' : 'All Compliant'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Table or Error State */}
      {error ? (
        <ErrorState
          title="Could Not Load Drivers"
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
