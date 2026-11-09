'use client';

import React, { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { ErrorState } from '@/components/ui/ErrorState';
import { MineSiteTable } from '@/components/mine-sites/MineSiteTable';
import { AddMineSiteModal } from '@/components/mine-sites/AddMineSiteModal';
import { EditMineSiteModal } from '@/components/mine-sites/EditMineSiteModal';
import { MineSiteDrawer } from '@/components/mine-sites/MineSiteDrawer';
import { MineSite } from '@/types/fleet';
import { useAuth } from '@/context/AuthContext';
import {
  Mountain,
  CheckCircle2,
  Compass,
  Layers,
  PlusCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

function MineSitesTableSection() {
  const searchParams = useSearchParams();
  const { hasRole } = useAuth();
  const canManage = hasRole(['Fleet Manager', 'Administrator']);

  const [mineSites, setMineSites] = useState<MineSite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters and Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>(
    searchParams.get('status') || 'ALL'
  );
  const [selectedMineral, setSelectedMineral] = useState<string>(
    searchParams.get('mineral') || 'ALL'
  );
  const [sortBy, setSortBy] = useState<string>('name_asc');

  // Modal & Drawer State
  const [isAddModalOpen, setIsAddModalOpen] = useState(
    searchParams.get('action') === 'new'
  );
  const [editingSite, setEditingSite] = useState<MineSite | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  const fetchMineSites = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);
      if (selectedMineral !== 'ALL') params.set('mineral', selectedMineral);

      const res = await fetch(`/api/mine-sites?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch mine site directory');
      }

      let data: MineSite[] = json.data || [];

      // Sort data
      if (sortBy === 'name_asc') {
        data.sort((a, b) => a.siteName.localeCompare(b.siteName));
      } else if (sortBy === 'name_desc') {
        data.sort((a, b) => b.siteName.localeCompare(a.siteName));
      } else if (sortBy === 'target_desc') {
        data.sort((a, b) => b.dailyTargetTonnage - a.dailyTargetTonnage);
      } else if (sortBy === 'target_asc') {
        data.sort((a, b) => a.dailyTargetTonnage - b.dailyTargetTonnage);
      } else if (sortBy === 'pits_desc') {
        data.sort((a, b) => b.activeLoadingPits - a.activeLoadingPits);
      } else if (sortBy === 'rate_desc') {
        data.sort((a, b) => b.ratePerTon - a.ratePerTon);
      } else if (sortBy === 'trips_desc') {
        data.sort((a, b) => (b.totalTrips || 0) - (a.totalTrips || 0));
      }

      setMineSites(data);
    } catch (err: any) {
      console.error('Fetch mine sites error:', err);
      setError(err.message || 'Error communicating with ERPNext mine site database');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedStatus, selectedMineral, sortBy]);

  useEffect(() => {
    fetchMineSites();
  }, [fetchMineSites]);

  // Overall metrics dynamically computed from actual backend records (Zero hardcoding)
  const totalCount = mineSites.length;
  const operationalCount = mineSites.filter((s) => s.status === 'Operational').length;
  const totalTargetCapacity = mineSites
    .filter((s) => s.status === 'Operational')
    .reduce((sum, s) => sum + (s.dailyTargetTonnage || 0), 0);
  const totalLoadingPits = mineSites
    .filter((s) => s.status === 'Operational')
    .reduce((sum, s) => sum + (s.activeLoadingPits || 0), 0);

  return (
    <>
      <PageHeader
        title="Mine Site Directory"
        subtitle="Operational mine sites, loading pits, target extraction capacities, and client haulage contracts"
        actions={
          canManage ? (
            <Button
              variant="primary"
              size="md"
              icon={PlusCircle}
              onClick={() => setIsAddModalOpen(true)}
              data-testid="btn-register-mine-site-header"
            >
              Register Mine Site
            </Button>
          ) : undefined
        }
      />

      {/* Mine Site Operational Metric Strip - 100% Dynamic from ERPNext */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {/* Total Mine Sites */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-center shrink-0">
            <Mountain className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Total Sites
            </span>
            <div
              className="text-2xl font-bold text-slate-900 font-mono"
              data-testid="metric-total-sites"
            >
              {isLoading ? '—' : totalCount}
            </div>
            <span className="text-[11px] text-slate-400">Registered Locations</span>
          </div>
        </div>

        {/* Operational Sites */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Operational
            </span>
            <div
              className="text-2xl font-bold text-emerald-600 font-mono"
              data-testid="metric-operational-sites"
            >
              {isLoading ? '—' : operationalCount}
            </div>
            <span className="text-[11px] text-emerald-600 font-medium">
              {totalCount > 0
                ? `${Math.round((operationalCount / totalCount) * 100)}% Active`
                : '0% Active'}
            </span>
          </div>
        </div>

        {/* Daily Target Capacity */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Target Capacity
            </span>
            <div
              className="text-2xl font-bold text-indigo-600 font-mono"
              data-testid="metric-target-capacity"
            >
              {isLoading ? '—' : totalTargetCapacity.toLocaleString()}
            </div>
            <span className="text-[11px] text-slate-400">MT / day (Active Sites)</span>
          </div>
        </div>

        {/* Active Loading Pits */}
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
              Active Loading Pits
            </span>
            <div
              className="text-2xl font-bold text-amber-700 font-mono"
              data-testid="metric-active-pits"
            >
              {isLoading ? '—' : totalLoadingPits}
            </div>
            <span className="text-[11px] text-slate-400">Operating Loading Bays</span>
          </div>
        </div>
      </div>

      {/* Main Table or Error State */}
      {error ? (
        <ErrorState
          title="Failed to Load Mine Site Directory"
          message={error}
          onRetry={fetchMineSites}
        />
      ) : isLoading && mineSites.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
          <p className="text-xs text-slate-500">
            Synchronizing mine site directory with ERPNext...
          </p>
        </div>
      ) : (
        <MineSiteTable
          mineSites={mineSites}
          onSelectSite={(id) => setSelectedSiteId(id)}
          onEditSite={(site) => setEditingSite(site)}
          onOpenAddSite={() => setIsAddModalOpen(true)}
          canManage={canManage}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          selectedMineral={selectedMineral}
          onMineralChange={setSelectedMineral}
          sortBy={sortBy}
          onSortChange={setSortBy}
        />
      )}

      {/* Slide-over Drawer for Mine Site Details & Activity */}
      <MineSiteDrawer
        siteId={selectedSiteId}
        onClose={() => setSelectedSiteId(null)}
        onEditSite={(site) => setEditingSite(site)}
        canManage={canManage}
      />

      {/* Modal for Creating New Mine Site */}
      {canManage && (
        <AddMineSiteModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => {
            fetchMineSites();
          }}
        />
      )}

      {/* Modal for Editing Mine Site */}
      {canManage && (
        <EditMineSiteModal
          site={editingSite}
          isOpen={Boolean(editingSite)}
          onClose={() => setEditingSite(null)}
          onSuccess={() => {
            fetchMineSites();
            if (selectedSiteId) {
              // Trigger reload in drawer if currently open
              setSelectedSiteId((prev) => prev);
            }
          }}
        />
      )}
    </>
  );
}

export default function MineSitesPage() {
  return (
    <AppShell
      headerTitle="Mine Sites & Extraction Pits"
      headerSubtitle="Active extraction hubs, customer allocation, loading points and geographical coordinates"
    >
      <PageContainer>
        <Suspense
          fallback={
            <div className="p-8 text-center text-slate-400 text-xs">
              Loading Mine Site Directory...
            </div>
          }
        >
          <MineSitesTableSection />
        </Suspense>
      </PageContainer>
    </AppShell>
  );
}

