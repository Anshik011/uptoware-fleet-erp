'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { ErrorState } from '@/components/ui/ErrorState';
import { KpiCard } from '@/components/dashboard/KpiCard';
import {
  KpiCardSkeleton,
  UtilizationCardSkeleton,
  FinancialSummaryCardSkeleton,
} from '@/components/dashboard/DashboardSkeleton';
import { UtilizationCard } from '@/components/dashboard/UtilizationCard';
import { FinancialSummaryCard } from '@/components/dashboard/FinancialSummaryCard';
import { RecentTripsTable } from '@/components/dashboard/RecentTripsTable';
import { AlertsList } from '@/components/dashboard/AlertsList';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { DashboardSummary } from '@/types/fleet';
import { formatCurrency } from '@/config/branding';
import {
  Truck,
  CheckCircle2,
  Wrench,
  Compass,
  Receipt,
  IndianRupee,
  Loader2,
} from 'lucide-react';

export default function FleetDashboardPage() {
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Request sequence and cancellation refs to prevent race conditions & out-of-order responses
  const activeRequestRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef<number>(0);

  const fetchDashboardData = useCallback(async () => {
    // Abort any pending in-flight request
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }
    const controller = new AbortController();
    activeRequestRef.current = controller;
    const currentSeq = ++requestSeqRef.current;

    try {
      setIsLoading(true);
      setError(null);

      // Force fresh live data from ERPNext, bypassing all browser/route caches
      const res = await fetch(`/api/dashboard?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
        },
        signal: controller.signal,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load live fleet data from server');
      }

      // Only apply data if this request is the latest one dispatched
      if (currentSeq === requestSeqRef.current) {
        setData(json.data);
        setError(null);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error('Failed to load dashboard:', err);
      if (currentSeq === requestSeqRef.current) {
        setError(err.message || 'Error communicating with fleet backend');
      }
    } finally {
      if (currentSeq === requestSeqRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
    return () => {
      activeRequestRef.current?.abort();
    };
  }, [fetchDashboardData]);

  const unreadAlerts = data?.recentAlerts?.filter((a) => a.status === 'Unread').length || 0;

  return (
    <AppShell
      headerTitle="Fleet Operations Executive Dashboard"
      headerSubtitle="Fleet monitoring, mineral dispatch tracking, statutory compliance and operating financials"
      unreadAlertsCount={unreadAlerts}
    >
      <PageContainer>
        {/* Quick Actions Header Card (Refresh & Shortcuts) */}
        <QuickActions onRefresh={fetchDashboardData} isLoading={isLoading} />

        {/* Global Error Banner when request fails and no cached data exists */}
        {error && !data && (
          <div className="my-6">
            <ErrorState
              title="Operational Sync Error"
              message={`Unable to retrieve live fleet metrics from Frappe backend: ${error}`}
              onRetry={fetchDashboardData}
            />
          </div>
        )}

        {/* Global Error Notice when refresh fails while previous data is visible */}
        {error && data && (
          <div className="mb-4">
            <ErrorState
              title="Sync Notice"
              message={`Displaying last verified metrics. Background update failed: ${error}`}
              onRetry={fetchDashboardData}
            />
          </div>
        )}

        {/* Initial Loading Skeleton State (Never displays fake demo numbers) */}
        {isLoading && !data && (
          <>
            <section aria-label="Key Performance Indicators Loading">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <KpiCardSkeleton key={i} />
                ))}
              </div>
            </section>

            <section
              aria-label="Summaries Loading"
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 mt-6 sm:mt-8"
            >
              <div className="lg:col-span-7">
                <UtilizationCardSkeleton />
              </div>
              <div className="lg:col-span-5">
                <FinancialSummaryCardSkeleton />
              </div>
            </section>
          </>
        )}

        {/* Live Authoritative KPI Cards Grid (Strictly bound to data from ERPNext) */}
        {data && (
          <>
            <section aria-label="Key Performance Indicators">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 sm:gap-5">
                <KpiCard
                  title="Total Vehicles"
                  value={data.kpi.totalVehicles}
                  subtext="Commercial Heavy Assets"
                  icon={Truck}
                  badge={{ text: 'Tracked', variant: 'neutral' }}
                />

                <KpiCard
                  title="Active on Road"
                  value={data.kpi.activeVehicles}
                  subtext={`${data.kpi.utilizationRate}% Fleet Deployment`}
                  icon={CheckCircle2}
                  badge={{ text: 'Operating', variant: 'positive' }}
                />

                <KpiCard
                  title="In Maintenance"
                  value={data.kpi.inMaintenance + data.kpi.inBreakdown}
                  subtext={`${data.kpi.inBreakdown} Breakdown · ${data.kpi.inMaintenance} Service`}
                  icon={Wrench}
                  badge={{ text: 'Workshop', variant: 'warning' }}
                />

                <KpiCard
                  title="Mining Trips"
                  value={data.kpi.completedTrips + data.kpi.inProgressTrips}
                  subtext={`${data.kpi.completedTrips} Delivered · ${data.kpi.inProgressTrips} In Transit`}
                  icon={Compass}
                  badge={{ text: 'Active Hauls', variant: 'positive' }}
                />

                <KpiCard
                  title="Operating Cost"
                  value={formatCurrency(data.kpi.totalOperatingCost)}
                  subtext="Fuel, Spares & Statutory"
                  icon={Receipt}
                  badge={{ text: 'Disbursements', variant: 'neutral' }}
                />

                <KpiCard
                  title="Billed Revenue"
                  value={formatCurrency(data.kpi.totalRevenue)}
                  subtext={
                    data.kpi.netOperatingIncome >= 0
                      ? `${formatCurrency(data.kpi.netOperatingIncome)} Net Margin`
                      : `-${formatCurrency(Math.abs(data.kpi.netOperatingIncome))} Net Margin`
                  }
                  icon={IndianRupee}
                  badge={{ text: 'Revenue', variant: 'positive' }}
                />
              </div>
            </section>

            {/* Utilization & Financial Summaries Grid */}
            <section
              aria-label="Operational & Financial Summaries"
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 mt-6 sm:mt-8"
            >
              <div className="lg:col-span-7">
                <UtilizationCard
                  totalVehicles={data.kpi.totalVehicles}
                  activeVehicles={data.kpi.activeVehicles}
                  inMaintenance={data.kpi.inMaintenance}
                  inBreakdown={data.kpi.inBreakdown}
                  outOfService={data.kpi.outOfService}
                  utilizationRate={data.kpi.utilizationRate}
                  totalCapacityTons={data.kpi.totalCapacityTons}
                  activeCapacityTons={data.kpi.activeCapacityTons}
                />
              </div>

              <div className="lg:col-span-5">
                <FinancialSummaryCard
                  totalRevenue={data.kpi.totalRevenue}
                  totalOperatingCost={data.kpi.totalOperatingCost}
                  fuelCost={data.kpi.fuelCost}
                  maintenanceCost={data.kpi.maintenanceCost}
                  netOperatingIncome={data.kpi.netOperatingIncome}
                  completedTrips={data.kpi.completedTrips}
                />
              </div>
            </section>

            {/* Recent Trips & Alerts Grid */}
            <section
              aria-label="Recent Operational Activity"
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 mt-6 sm:mt-8"
            >
              <div className="lg:col-span-7">
                <RecentTripsTable trips={data.recentTrips || []} />
              </div>

              <div className="lg:col-span-5">
                <AlertsList alerts={data.recentAlerts || []} />
              </div>
            </section>
          </>
        )}

        {/* Loading Indicator at Bottom during background refresh */}
        {isLoading && data && (
          <div className="flex items-center justify-center gap-2 text-xs text-slate-500 py-3 mt-4">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
            <span>Refreshing live fleet metrics from ERPNext...</span>
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
}
