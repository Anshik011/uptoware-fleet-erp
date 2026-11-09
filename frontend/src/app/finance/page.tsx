'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { FinancialKpiCards } from '@/components/finance/FinancialKpiCards';
import { FinancialKpis } from '@/lib/frappe';
import { formatCurrency } from '@/config/branding';
import Link from 'next/link';
import {
  TrendingUp,
  CreditCard,
  IndianRupee,
  FileSpreadsheet,
  RefreshCw,
  AlertCircle,
  Truck,
  ArrowRight,
  LayoutDashboard,
} from 'lucide-react';

export default function FinanceDashboardPage() {
  const [kpis, setKpis] = useState<FinancialKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKpis = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/finance/dashboard');
      const json = await res.json();
      if (json.success && json.data) {
        setKpis(json.data);
      } else {
        setError(json.error || 'Failed to load financial KPIs.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching financial dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKpis();
  }, []);

  return (
    <AppShell>
      <PageContainer>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Financial Dashboard
              </h1>
              <p className="text-sm text-slate-500">
                Executive revenue, collections, operating costs, and fleet profitability
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/reports"
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>Financial Reports</span>
            </Link>

            <button
              onClick={fetchKpis}
              disabled={loading}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Top Period Badge */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Reporting Fiscal Period:
              </span>
              <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
                CY 2026 (Jan 1, 2026 – Dec 31, 2026)
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Authority: Native ERPNext Accounting Ledger
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Financial KPI Summary Cards */}
          {kpis && (
            <FinancialKpiCards
              totalRevenue={kpis.totalRevenue}
              totalCollections={kpis.totalCollections}
              outstandingReceivables={kpis.outstandingReceivables}
              totalOperatingCost={kpis.totalOperatingCost}
              netOperatingIncome={kpis.netOperatingIncome}
              fuelExpenses={kpis.fuelExpenses}
              maintenanceExpenses={kpis.maintenanceExpenses}
              operationalExpenses={kpis.operationalExpenses}
              operatingMarginPct={kpis.operatingMarginPct}
              collectionEfficiencyPct={kpis.collectionEfficiencyPct}
            />
          )}

          {/* Quick Access Commercial Sections */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 1. Billed Revenue */}
            <Link
              href="/revenue"
              className="p-5 rounded-xl border border-slate-200 bg-white hover:border-blue-400 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
                    <IndianRupee className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Billed Revenue & Invoices</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Commercial invoice register, customer ledger, credit returns, and payment statuses.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-700">
                <span>View Invoice Register</span>
                <span>{formatCurrency(kpis?.totalRevenue || 0)}</span>
              </div>
            </Link>

            {/* 2. Customer Collections */}
            <Link
              href="/collections"
              className="p-5 rounded-xl border border-slate-200 bg-white hover:border-emerald-400 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Customer Collections</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Receipt entries, payment modes, Cheque/UTR tracking, and invoice settlements.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
                <span>View Collections</span>
                <span>{formatCurrency(kpis?.totalCollections || 0)}</span>
              </div>
            </Link>

            {/* 3. Fleet Profitability */}
            <Link
              href="/profitability"
              className="p-5 rounded-xl border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2.5 rounded-lg bg-indigo-50 text-indigo-700">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">Fleet Profitability & P&L</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Vehicle-level profitability, trip haulage contributions, and non-duplicated cost analysis.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-indigo-700">
                <span>Analyze Margins</span>
                <span>{kpis?.operatingMarginPct || 0}% Net Margin</span>
              </div>
            </Link>
          </div>

          {/* Top Vehicle Profitability Summary Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">Operational Vehicles P&L Overview</span>
              </div>
              <Link
                href="/profitability"
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>Full Profitability View</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Vehicle Asset</th>
                    <th className="px-4 py-3 text-right">Invoiced Revenue</th>
                    <th className="px-4 py-3 text-right">Operating Cost</th>
                    <th className="px-4 py-3 text-right">Net Margin</th>
                    <th className="px-4 py-3 text-right">Margin %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(!kpis || kpis.topVehicles.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                        No vehicle financial records available.
                      </td>
                    </tr>
                  )}
                  {(kpis?.topVehicles || []).map((v) => {
                    const isPos = v.netMargin >= 0;
                    return (
                      <tr key={v.vehicle} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900 font-mono">{v.vehicle}</td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-700 font-mono">
                          {formatCurrency(v.revenue)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700 font-mono">
                          {formatCurrency(v.cost)}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-bold font-mono ${
                            isPos ? 'text-emerald-700' : 'text-rose-600'
                          }`}
                        >
                          {isPos ? formatCurrency(v.netMargin) : `-${formatCurrency(Math.abs(v.netMargin))}`}
                        </td>
                        <td className="px-4 py-3 text-right font-mono">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              isPos
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}
                          >
                            {v.marginPct}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}
