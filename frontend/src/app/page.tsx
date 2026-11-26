'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
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
import { formatCurrency, formatNumber } from '@/config/branding';
import { toLocalDateString } from '@/lib/datetime';
import { useMine } from '@/context/MineContext';
import { useAuth } from '@/context/AuthContext';
import {
  Truck,
  CheckCircle2,
  Wrench,
  Compass,
  Receipt,
  IndianRupee,
  Loader2,
  Users,
  MapPin,
  Package,
  Warehouse,
  UserCheck,
  Fuel,
  ChevronRight,
  Calendar,
  TrendingUp,
} from 'lucide-react';

interface ReportMetrics {
  hsdQty: number;
  hsdAmount: number;
  sparePartsAmount: number;
  staffAttendance: number;
  staffSalaryAmount: number;
  totalTrips: number;
  totalTripQty: number;
  totalTripAmount: number;
  netMargin: number;
}

const defaultReportMetrics: ReportMetrics = {
  hsdQty: 0,
  hsdAmount: 0,
  sparePartsAmount: 0,
  staffAttendance: 0,
  staffSalaryAmount: 0,
  totalTrips: 0,
  totalTripQty: 0,
  totalTripAmount: 0,
  netMargin: 0,
};

export default function FleetDashboardPage() {
  const { currentMine, activeMineLabel } = useMine();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Daily & Monthly Report States for Client Specification Compliance
  const [dailyDate, setDailyDate] = useState('');
  const [monthlyMonth, setMonthlyMonth] = useState('');

  useEffect(() => {
    const today = toLocalDateString();
    setDailyDate((prev) => prev || today);
    setMonthlyMonth((prev) => prev || today.slice(0, 7));
  }, []);
  const [dailyMetrics, setDailyMetrics] = useState<ReportMetrics>(defaultReportMetrics);
  const [monthlyMetrics, setMonthlyMetrics] = useState<ReportMetrics>(defaultReportMetrics);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Request sequence and cancellation refs
  const activeRequestRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef<number>(0);

  // Fetch Authoritative Fleet Dashboard Metrics
  const fetchDashboardData = useCallback(async () => {
    if (activeRequestRef.current) {
      activeRequestRef.current.abort();
    }
    const controller = new AbortController();
    activeRequestRef.current = controller;
    const currentSeq = ++requestSeqRef.current;

    try {
      setIsLoading(true);
      setError(null);

      const mineParam =
        currentMine && currentMine !== 'ALL'
          ? `&mine_site=${encodeURIComponent(currentMine)}`
          : '';
      const res = await fetch(`/api/dashboard?_t=${Date.now()}${mineParam}`, {
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
  }, [currentMine]);

  // Fetch Daily & Monthly Script Reports for Client Compliance
  const fetchReportMetrics = useCallback(async () => {
    setReportsLoading(true);
    const activeMine = currentMine && currentMine !== 'ALL' ? currentMine : undefined;

    try {
      // 1. Fetch Daily Report
      const dailyRes = await fetch('/api/finance/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_name: 'Daily Fleet Income and Expense Summary',
          filters: {
            from_date: dailyDate,
            to_date: dailyDate,
            mine_site: activeMine,
          },
        }),
      });

      const dailyJson = await dailyRes.json();
      if (dailyJson.success && Array.isArray(dailyJson.result) && dailyJson.result.length > 0) {
        let tTrips = 0;
        let tQty = 0;
        let tRev = 0;
        let fL = 0;
        let fCost = 0;
        let sCost = 0;
        let sAtt = 0;
        let sSal = 0;
        let net = 0;

        dailyJson.result.forEach((row: any) => {
          tTrips += Number(row.total_trips || 0);
          tQty += Number(row['total_haulage_qnt_(mt)'] || 0);
          tRev += Number(row['haulage_revenue_(₹)'] || 0);
          fL += Number(row['hsd_consumed_(l)'] || 0);
          fCost += Number(row['hsd_fuel_cost_(₹)'] || 0);
          sCost += Number(row['spare_parts_(₹)'] || 0);
          sAtt += Number(row.staff_attendance || 0);
          sSal += Number(row['staff_salary_(₹)'] || 0);
          net += Number(row['net_daily_contribution_(₹)'] || 0);
        });

        setDailyMetrics({
          hsdQty: fL,
          hsdAmount: fCost,
          sparePartsAmount: sCost,
          staffAttendance: sAtt,
          staffSalaryAmount: sSal,
          totalTrips: tTrips,
          totalTripQty: tQty,
          totalTripAmount: tRev,
          netMargin: net,
        });
      } else {
        setDailyMetrics(defaultReportMetrics);
      }

      // 2. Fetch Monthly Report
      const [yearStr, monthStr] = monthlyMonth.split('-');
      const y = parseInt(yearStr, 10);
      const m = parseInt(monthStr, 10);
      const lastDay = new Date(y, m, 0).getDate();
      const fromDate = `${monthlyMonth}-01`;
      const toDate = `${monthlyMonth}-${String(lastDay).padStart(2, '0')}`;

      const monthlyRes = await fetch('/api/finance/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_name: 'Monthly Fleet Income and Expense Summary',
          filters: {
            from_date: fromDate,
            to_date: toDate,
            mine_site: activeMine,
          },
        }),
      });

      const monthlyJson = await monthlyRes.json();
      if (monthlyJson.success && Array.isArray(monthlyJson.result) && monthlyJson.result.length > 0) {
        let tTrips = 0;
        let tQty = 0;
        let tRev = 0;
        let fL = 0;
        let fCost = 0;
        let sCost = 0;
        let sAtt = 0;
        let sSal = 0;
        let net = 0;

        monthlyJson.result.forEach((row: any) => {
          tTrips += Number(row.total_completed_trips || row.total_trips || 0);
          tQty += Number(row['total_haulage_qnt_(mt)'] || 0);
          tRev += Number(row['haulage_revenue_(₹)'] || 0);
          fL += Number(row['total_hsd_consumed_(l)'] || row['hsd_consumed_(l)'] || 0);
          fCost += Number(row['hsd_fuel_cost_(₹)'] || 0);
          sCost += Number(row['spare_parts_(₹)'] || 0);
          sAtt += Number(row.staff_attendance || 0);
          sSal += Number(row['staff_salary_(₹)'] || 0);
          net += Number(row['net_operating_profit_(₹)'] || row['net_margin_(₹)'] || 0);
        });

        setMonthlyMetrics({
          hsdQty: fL,
          hsdAmount: fCost,
          sparePartsAmount: sCost,
          staffAttendance: sAtt,
          staffSalaryAmount: sSal,
          totalTrips: tTrips,
          totalTripQty: tQty,
          totalTripAmount: tRev,
          netMargin: net,
        });
      } else {
        setMonthlyMetrics(defaultReportMetrics);
      }
    } catch (err: any) {
      console.error('Failed to load report metrics:', err);
    } finally {
      setReportsLoading(false);
    }
  }, [dailyDate, monthlyMonth, currentMine]);

  useEffect(() => {
    fetchDashboardData();
    if (dailyDate && monthlyMonth) {
      fetchReportMetrics();
    }
    return () => {
      activeRequestRef.current?.abort();
    };
  }, [fetchDashboardData, fetchReportMetrics, dailyDate, monthlyMonth]);

  const unreadAlerts = data?.recentAlerts?.filter((a) => a.status === 'Unread').length || 0;

  const isRestrictedRole =
    user?.role === 'Maintenance Stores User' ||
    user?.role === 'Site Supervisor User' ||
    user?.role === 'Reconcile Incharge User';

  const canViewFinance = !['Site Supervisor User', 'Reconcile Incharge User'].includes(user?.role || '');

  // Role-filtered dashboard module headings
  const visibleHeadings = React.useMemo(() => {
    if (!user || !user.role) {
      return [
        { num: 1, title: 'EMPLOYEE DATA', href: '/employees', icon: Users },
        { num: 2, title: 'VEHICLE DATA', href: '/vehicles', icon: Truck },
        { num: 3, title: 'TRIP REPORT', href: '/trips', icon: Compass },
        { num: 4, title: 'LEAD REPORT', href: '/leads', icon: MapPin },
        { num: 5, title: 'SPARE PARTS REPORT', href: '/spare-parts', icon: Package },
        { num: 6, title: 'STOCK REPORT', href: '/stock-movements', icon: Warehouse },
        { num: 7, title: 'EMP ATTENDANCE REPORT', href: '/employees?tab=roster', icon: UserCheck },
        { num: 8, title: 'VEHICLE INCOME REPORT', href: '/reports?report=Vehicle+Earning+Summary+Report', icon: IndianRupee },
        { num: 9, title: 'HSD ESCALATION/DE-ESCALATION', href: '/reports?report=HSD+Fuel+Price+Escalation+Report', icon: Fuel },
      ];
    }

    // User 1: Maintenance & Stores Incharge
    if (user.role === 'Maintenance Stores User') {
      return [
        { num: 5, title: 'SPARE PARTS REPORT', href: '/spare-parts', icon: Package },
        { num: 6, title: 'STOCK REPORT', href: '/stock-movements', icon: Warehouse },
        { num: 7, title: 'EMP ATTENDANCE REPORT', href: '/attendance', icon: UserCheck },
        { num: 9, title: 'HSD ESCALATION/DE-ESCALATION', href: '/reports?report=HSD+Fuel+Price+Escalation+Report', icon: Fuel },
        { num: 10, title: 'MAINTENANCE & WORKSHOP', href: '/maintenance', icon: Wrench },
      ];
    }

    // User 2: Site Supervisor
    if (user.role === 'Site Supervisor User') {
      return [
        { num: 3, title: 'SITE SUP TRIP ENTRY', href: '/trips?action=site_sup', icon: Compass },
      ];
    }

    // User 3: Reconcile Incharge
    if (user.role === 'Reconcile Incharge User') {
      return [
        { num: 3, title: 'RECONCILE TRIP ENTRY', href: '/trips', icon: Compass },
        { num: 4, title: 'RECONCILE SUMMARY', href: '/trips?tab=reconcile_summary', icon: Compass },
      ];
    }

    // Standard Full Roles (Administrator, Fleet Manager, Dispatcher, Workshop Supervisor, Accountant)
    return [
      { num: 1, title: 'EMPLOYEE DATA', href: '/employees', icon: Users },
      { num: 2, title: 'VEHICLE DATA', href: '/vehicles', icon: Truck },
      { num: 3, title: 'TRIP REPORT', href: '/trips', icon: Compass },
      { num: 4, title: 'LEAD REPORT', href: '/leads', icon: MapPin },
      { num: 5, title: 'SPARE PARTS REPORT', href: '/spare-parts', icon: Package },
      { num: 6, title: 'STOCK REPORT', href: '/stock-movements', icon: Warehouse },
      { num: 7, title: 'EMP ATTENDANCE REPORT', href: '/employees?tab=roster', icon: UserCheck },
      { num: 8, title: 'VEHICLE INCOME REPORT', href: '/reports?report=Vehicle+Earning+Summary+Report', icon: IndianRupee },
      { num: 9, title: 'HSD ESCALATION/DE-ESCALATION', href: '/reports?report=HSD+Fuel+Price+Escalation+Report', icon: Fuel },
      { num: 10, title: 'MAINTENANCE & WORKSHOP', href: '/maintenance', icon: Wrench },
    ];
  }, [user]);

  return (
    <AppShell
      headerTitle="Fleet Operations Executive Dashboard"
      headerSubtitle="Fleet monitoring, mineral dispatch tracking, statutory compliance and operating financials"
      unreadAlertsCount={unreadAlerts}
    >
      <PageContainer>
        {/* Active Mine Site Attribution Indicator */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between text-xs font-medium text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span>Operational Scope:</span>
            <span className="font-semibold text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-0.5 rounded">
              {activeMineLabel || 'All Mines'}
            </span>
          </div>
          {currentMine && currentMine !== 'ALL' && (
            <span className="text-slate-400">
              Metrics filtered strictly for {activeMineLabel}
            </span>
          )}
        </div>

        {/* Quick Actions Header Card (Refresh & Shortcuts) */}
        <QuickActions onRefresh={() => { fetchDashboardData(); fetchReportMetrics(); }} isLoading={isLoading || reportsLoading} />

        {/* ========================================================================= */}
        {/* MANDATORY CLIENT SPECIFICATION: NINE MAIN HEADINGS (IN EXACT PDF ORDER)   */}
        {/* ========================================================================= */}
        <section aria-label="Main Navigation Modules" className="mt-4 mb-6 bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200">
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                HOME PAGE
              </h2>
              <p className="text-[11px] text-slate-500">
                {isRestrictedRole
                  ? `Assigned Operational Modules (${visibleHeadings.length} Active)`
                  : 'Client Specification — 9 Mandatory Operational Sections'}
              </p>
            </div>
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded">
              {isRestrictedRole ? user?.role : 'Specification Sequence'}
            </span>
          </div>

          <div
            className={`grid gap-2 ${
              visibleHeadings.length === 1
                ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                : visibleHeadings.length === 2
                  ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4'
                  : visibleHeadings.length <= 5
                    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
                    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-9 xl:grid-cols-10'
            }`}
          >
            {visibleHeadings.map((heading) => {
              const Icon = heading.icon;
              return (
                <Link
                  key={heading.num}
                  href={heading.href}
                  className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-200/90 bg-slate-50/70 hover:bg-blue-50/80 hover:border-blue-300 transition-all text-center group"
                >
                  <div className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 group-hover:text-blue-600 group-hover:border-blue-300 mb-1.5 transition-colors">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-slate-900 group-hover:text-blue-700 line-clamp-2 leading-tight uppercase">
                    {heading.num}. {heading.title}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Global Error Banner when request fails and no cached data exists */}
        {error && !data && (
          <div className="my-6">
            <ErrorState
              title="Operational Sync Error"
              message={`Unable to retrieve live fleet metrics: ${error}`}
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

        {/* Initial Loading Skeleton State */}
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

        {/* Live Authoritative KPI Cards Grid */}
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

                {canViewFinance ? (
                  <>
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
                  </>
                ) : (
                  <>
                    <KpiCard
                      title="Completed Trips"
                      value={data.kpi.completedTrips}
                      subtext="Weighbridge & Delivery"
                      icon={CheckCircle2}
                      badge={{ text: 'Verified', variant: 'positive' }}
                    />

                    <KpiCard
                      title="Trips In Transit"
                      value={data.kpi.inProgressTrips}
                      subtext="Active Pit Hauls"
                      icon={Truck}
                      badge={{ text: 'Dispatched', variant: 'neutral' }}
                    />
                  </>
                )}
              </div>
            </section>

            {/* ========================================================================= */}
            {/* MANDATORY CLIENT SPECIFICATION: DAILY REPORT (EXPENSES & INCOME)          */}
            {/* ========================================================================= */}
            {canViewFinance && (
              <section aria-label="Daily Report Metrics" className="mt-6 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-200 gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-tight">
                    DAILY REPORT
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="dailyDate" className="text-xs font-medium text-slate-600">
                    Operating Date:
                  </label>
                  <input
                    id="dailyDate"
                    type="date"
                    value={dailyDate}
                    onChange={(e) => setDailyDate(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* DAILY EXPENSES REPORT */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-rose-600" />
                      EXPENSES REPORT
                    </h3>
                    <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                      Daily Outflow
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* HSD CONSUMPTION */}
                    <div className="bg-white border border-slate-200 rounded p-2.5">
                      <div className="font-semibold text-slate-700 mb-1">HSD CONSUMPTION</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                        <div>
                          <span className="text-slate-500 block">TOTAL QNT:</span>
                          <span className="font-bold text-slate-900">{formatNumber(dailyMetrics.hsdQty)} L</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">TOTAL AMOUNT:</span>
                          <span className="font-bold text-rose-700">{formatCurrency(dailyMetrics.hsdAmount)}</span>
                        </div>
                      </div>
                    </div>

                    {/* SPARE PARTS */}
                    <div className="bg-white border border-slate-200 rounded p-2.5">
                      <div className="font-semibold text-slate-700 mb-1">SPARE PARTS</div>
                      <div className="text-[11px] pt-1 border-t border-slate-100">
                        <span className="text-slate-500 block">TOTAL AMOUNT:</span>
                        <span className="font-bold text-rose-700">{formatCurrency(dailyMetrics.sparePartsAmount)}</span>
                      </div>
                    </div>

                    {/* STAFF SALARY */}
                    <div className="bg-white border border-slate-200 rounded p-2.5">
                      <div className="font-semibold text-slate-700 mb-1">STAFF SALARY</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                        <div>
                          <span className="text-slate-500 block">TOTAL ATTENDANCE:</span>
                          <span className="font-bold text-slate-900">{dailyMetrics.staffAttendance} Shifts</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">TOTAL AMOUNT:</span>
                          <span className="font-bold text-rose-700">{formatCurrency(dailyMetrics.staffSalaryAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* DAILY INCOME REPORT */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        INCOME REPORT
                      </h3>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        Daily Inflow
                      </span>
                    </div>

                    {/* TRIP INCOME */}
                    <div className="bg-white border border-slate-200 rounded p-2.5 text-xs">
                      <div className="font-semibold text-slate-700 mb-1">TRIP</div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-slate-100">
                        <div>
                          <span className="text-slate-500 block">TOTAL TRIP:</span>
                          <span className="font-bold text-slate-900">{dailyMetrics.totalTrips}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">TOTAL QNT:</span>
                          <span className="font-bold text-slate-900">{formatNumber(dailyMetrics.totalTripQty)} MT</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">TOTAL AMOUNT:</span>
                          <span className="font-bold text-emerald-700">{formatCurrency(dailyMetrics.totalTripAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Net Margin Banner */}
                  <div className="mt-3 bg-white p-2.5 rounded border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Net Daily Margin:</span>
                    <span
                      className={`font-bold ${
                        dailyMetrics.netMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {dailyMetrics.netMargin >= 0 ? '+' : ''}
                      {formatCurrency(dailyMetrics.netMargin)}
                    </span>
                  </div>
                </div>
              </div>
            </section>
            )}

            {/* ========================================================================= */}
            {/* MANDATORY CLIENT SPECIFICATION: MONTHLY REPORT (EXPENSES & INCOME)        */}
            {/* ========================================================================= */}
            {canViewFinance && (
            <section aria-label="Monthly Report Metrics" className="mt-6 bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b border-slate-200 gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                  <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                    Monthly REPORT
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="monthlyMonth" className="text-xs font-medium text-slate-600">
                    Billing Month:
                  </label>
                  <input
                    id="monthlyMonth"
                    type="month"
                    value={monthlyMonth}
                    onChange={(e) => setMonthlyMonth(e.target.value)}
                    className="text-xs border border-slate-300 rounded-lg px-2.5 py-1 font-medium text-slate-800 bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* MONTHLY EXPENSES REPORT */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5">
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-rose-600" />
                      EXPENSES REPORT
                    </h3>
                    <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded">
                      Monthly Total Outflow
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {/* HSD CONSUMPTION */}
                    <div className="bg-white border border-slate-200 rounded p-2.5">
                      <div className="font-semibold text-slate-700 mb-1">HSD CONSUMPTION</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                        <div>
                          <span className="text-slate-500 block">TOTAL QNT:</span>
                          <span className="font-bold text-slate-900">{formatNumber(monthlyMetrics.hsdQty)} L</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">TOTAL AMOUNT:</span>
                          <span className="font-bold text-rose-700">{formatCurrency(monthlyMetrics.hsdAmount)}</span>
                        </div>
                      </div>
                    </div>

                    {/* SPARE PARTS */}
                    <div className="bg-white border border-slate-200 rounded p-2.5">
                      <div className="font-semibold text-slate-700 mb-1">SPARE PARTS</div>
                      <div className="text-[11px] pt-1 border-t border-slate-100">
                        <span className="text-slate-500 block">TOTAL AMOUNT:</span>
                        <span className="font-bold text-rose-700">{formatCurrency(monthlyMetrics.sparePartsAmount)}</span>
                      </div>
                    </div>

                    {/* STAFF SALARY */}
                    <div className="bg-white border border-slate-200 rounded p-2.5">
                      <div className="font-semibold text-slate-700 mb-1">STAFF SALARY</div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-100">
                        <div>
                          <span className="text-slate-500 block">TOTAL ATTENDANCE:</span>
                          <span className="font-bold text-slate-900">{monthlyMetrics.staffAttendance} Shifts</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">TOTAL AMOUNT:</span>
                          <span className="font-bold text-rose-700">{formatCurrency(monthlyMetrics.staffSalaryAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* MONTHLY INCOME REPORT */}
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-slate-200">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                        INCOME REPORT
                      </h3>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        Monthly Revenue Realization
                      </span>
                    </div>

                    {/* TRIP INCOME */}
                    <div className="bg-white border border-slate-200 rounded p-2.5 text-xs">
                      <div className="font-semibold text-slate-700 mb-1">TRIP</div>
                      <div className="grid grid-cols-3 gap-2 text-[11px] pt-1 border-t border-slate-100">
                        <div>
                          <span className="text-slate-500 block">TOTAL TRIP:</span>
                          <span className="font-bold text-slate-900">{monthlyMetrics.totalTrips}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">TOTAL QNT:</span>
                          <span className="font-bold text-slate-900">{formatNumber(monthlyMetrics.totalTripQty)} MT</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">TOTAL AMOUNT:</span>
                          <span className="font-bold text-emerald-700">{formatCurrency(monthlyMetrics.totalTripAmount)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Net Margin Banner */}
                  <div className="mt-3 bg-white p-2.5 rounded border border-slate-200 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Net Monthly Margin:</span>
                    <span
                      className={`font-bold ${
                        monthlyMetrics.netMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {monthlyMetrics.netMargin >= 0 ? '+' : ''}
                      {formatCurrency(monthlyMetrics.netMargin)}
                    </span>
                  </div>
                </div>
              </div>
            </section>
            )}

            {/* Utilization & Financial Summaries Grid (Restored Original Components) */}
            <section
              aria-label="Operational & Financial Summaries"
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 mt-6 sm:mt-8"
            >
              <div className={canViewFinance ? "lg:col-span-7" : "lg:col-span-12"}>
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

              {canViewFinance && (
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
              )}
            </section>

            {/* Recent Trips & Alerts Grid (Restored Original Components) */}
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
            <span>Refreshing live fleet metrics...</span>
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
}
