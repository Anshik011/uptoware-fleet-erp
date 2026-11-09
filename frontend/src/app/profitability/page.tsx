'use client';

import React, { useEffect, useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { VehicleProfitabilityTable } from '@/components/finance/VehicleProfitabilityTable';
import { TripProfitabilityTable } from '@/components/finance/TripProfitabilityTable';
import {
  VehicleProfitabilityRecord,
  TripProfitabilityRecord,
  CustomerRevenueRecord,
} from '@/lib/frappe';
import { formatCurrency, formatNumber } from '@/config/branding';
import Link from 'next/link';
import {
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Truck,
  Compass,
  Users,
  Info,
  Scale,
  FileSpreadsheet,
} from 'lucide-react';

export default function ProfitabilityPage() {
  const [activeTab, setActiveTab] = useState<'vehicles' | 'trips' | 'customers' | 'formulas'>('vehicles');
  const [vehicles, setVehicles] = useState<VehicleProfitabilityRecord[]>([]);
  const [trips, setTrips] = useState<TripProfitabilityRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerRevenueRecord[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfitability = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/finance/profitability');
      const json = await res.json();
      if (json.success) {
        setVehicles(json.vehicleProfitability || []);
        setTrips(json.tripProfitability || []);
        setCustomers(json.customerRevenue || []);
        setSummary(json.summary || null);
      } else {
        setError(json.error || 'Failed to load profitability analytics.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error fetching profitability.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfitability();
  }, []);

  return (
    <AppShell>
      <PageContainer>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Fleet Profitability & Analytics
              </h1>
              <p className="text-sm text-slate-500">
                Operational contribution and P&L analysis across vehicles, mining trips, and customer accounts
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/reports"
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-xs transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
              <span>Profitability Reports</span>
            </Link>

            <button
              onClick={fetchProfitability}
              disabled={loading}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Top Info Banner */}
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                P&L Authority:
              </span>
              <span className="text-xs font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
                Sales Invoices (Revenue) vs Native Fuel + Maint + OpEx (Costs)
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Zero duplicate counting between OpEx and GL Journal Entries
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Executive High-Level P&L Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Invoiced Revenue
                </div>
                <div className="text-xl font-bold text-blue-700 mt-1">
                  {formatCurrency(summary.totalRevenue)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Submitted commercial billing</div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Operating Cost
                </div>
                <div className="text-xl font-bold text-slate-900 mt-1">
                  {formatCurrency(summary.totalOperatingCost)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Fuel + Repairs + OpEx</div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Net Operating Income
                </div>
                <div
                  className={`text-xl font-bold mt-1 ${
                    summary.netOperatingIncome >= 0 ? 'text-emerald-700' : 'text-rose-600'
                  }`}
                >
                  {summary.netOperatingIncome >= 0
                    ? formatCurrency(summary.netOperatingIncome)
                    : `-${formatCurrency(Math.abs(summary.netOperatingIncome))}`}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Margin: {summary.operatingMarginPct}%
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Collection Realization
                </div>
                <div className="text-xl font-bold text-emerald-700 mt-1">
                  {formatCurrency(summary.totalCollections)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Outstanding: {formatCurrency(summary.outstandingReceivables)}
                </div>
              </div>
            </div>
          )}

          {/* Tab Navigation */}
          <div className="border-b border-slate-200">
            <nav className="flex space-x-6 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('vehicles')}
                className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'vehicles'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>Vehicle Profitability ({vehicles.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('trips')}
                className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'trips'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span>Trip Contribution ({trips.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('customers')}
                className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'customers'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Customer Accounts ({customers.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('formulas')}
                className={`pb-3 border-b-2 flex items-center gap-1.5 transition-colors ${
                  activeTab === 'formulas'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                }`}
              >
                <Info className="w-4 h-4" />
                <span>Formula Definitions & Methodology</span>
              </button>
            </nav>
          </div>

          {/* Tab 1: Vehicle Profitability */}
          {activeTab === 'vehicles' && (
            <VehicleProfitabilityTable vehicles={vehicles} loading={loading} />
          )}

          {/* Tab 2: Trip Profitability */}
          {activeTab === 'trips' && (
            <TripProfitabilityTable trips={trips} loading={loading} />
          )}

          {/* Tab 3: Customer Accounts */}
          {activeTab === 'customers' && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">Customer Commercial Exposure</span>
                <span className="text-xs text-slate-500">Source: ERPNext Sales Invoice & Payment Entry</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Customer Client</th>
                      <th className="px-4 py-3">Segment</th>
                      <th className="px-4 py-3 text-right">Invoices</th>
                      <th className="px-4 py-3 text-right">Gross Invoiced</th>
                      <th className="px-4 py-3 text-right">Credit Returns</th>
                      <th className="px-4 py-3 text-right">Net Revenue</th>
                      <th className="px-4 py-3 text-right">Collected</th>
                      <th className="px-4 py-3 text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                          No customer billing records found.
                        </td>
                      </tr>
                    )}
                    {customers.map((c) => (
                      <tr key={c.customer} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-4 py-3 font-bold text-slate-900">{c.customer}</td>
                        <td className="px-4 py-3 text-slate-600">{c.customerGroup}</td>
                        <td className="px-4 py-3 text-right font-medium text-slate-700 font-mono">
                          {c.invoicesCount}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-blue-700 font-mono">
                          {formatCurrency(c.grossInvoiced)}
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-rose-600 font-mono">
                          -{formatCurrency(c.creditNotes)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-slate-900 font-mono">
                          {formatCurrency(c.netRevenue)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-700 font-mono">
                          {formatCurrency(c.collectedAmount)}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-amber-700 font-mono">
                          {formatCurrency(c.outstandingReceivables)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 4: Formula Definitions & Methodology */}
          {activeTab === 'formulas' && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-blue-600" />
                  <span>Financial Calculation Rules & Methodology</span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Binding definitions enforced across all Uptoware fleet reports and dashboard metrics.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                  <span className="font-bold text-blue-700 uppercase tracking-wider text-[11px] block">
                    1. Invoiced Revenue
                  </span>
                  <code className="bg-white px-2 py-1 rounded border border-slate-200 text-slate-800 font-mono block">
                    Σ base_grand_total of submitted Sales Invoices (docstatus = 1) - Credit Notes
                  </code>
                  <p className="text-slate-500 text-[11px] pt-1">
                    Recognized strictly through legal tax invoices submitted in ERPNext. Operational trip estimates are never treated as accounting revenue.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                  <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px] block">
                    2. Total Operating Cost
                  </span>
                  <code className="bg-white px-2 py-1 rounded border border-slate-200 text-slate-800 font-mono block">
                    Fuel Cost (Approved) + Maintenance Cost (Parts + Labour) + Posted OpEx
                  </code>
                  <p className="text-slate-500 text-[11px] pt-1">
                    Non-duplicated operational aggregation. Inventory purchases and GL journal duplicates are excluded from operational cost summing.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                  <span className="font-bold text-emerald-700 uppercase tracking-wider text-[11px] block">
                    3. Net Operating Income
                  </span>
                  <code className="bg-white px-2 py-1 rounded border border-slate-200 text-slate-800 font-mono block">
                    Invoiced Revenue - Total Operating Cost
                  </code>
                  <p className="text-slate-500 text-[11px] pt-1">
                    Direct operational profitability reflecting core fleet commercial margin.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                  <span className="font-bold text-indigo-700 uppercase tracking-wider text-[11px] block">
                    4. Operating Margin %
                  </span>
                  <code className="bg-white px-2 py-1 rounded border border-slate-200 text-slate-800 font-mono block">
                    (Net Operating Income / Invoiced Revenue) * 100 (if Revenue &gt; 0 else 0.0%)
                  </code>
                  <p className="text-slate-500 text-[11px] pt-1">
                    Normalized profit margin percentage. Automatically set to 0.0% when revenue is zero to prevent division-by-zero artifacts.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                  <span className="font-bold text-amber-700 uppercase tracking-wider text-[11px] block">
                    5. Trip Contribution
                  </span>
                  <code className="bg-white px-2 py-1 rounded border border-slate-200 text-slate-800 font-mono block">
                    Invoiced Revenue (or Estimated) - (Direct Trip OpEx + Direct Repair Cost)
                  </code>
                  <p className="text-slate-500 text-[11px] pt-1">
                    Haulage direct contribution. If trip is uninvoiced, indicative rate is displayed with an explicit estimation marker.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs space-y-1">
                  <span className="font-bold text-purple-700 uppercase tracking-wider text-[11px] block">
                    6. Vehicle Net Margin
                  </span>
                  <code className="bg-white px-2 py-1 rounded border border-slate-200 text-slate-800 font-mono block">
                    Vehicle Revenue - (Vehicle Fuel + Maintenance + Direct OpEx + Insurance)
                  </code>
                  <p className="text-slate-500 text-[11px] pt-1">
                    Asset-level unit economics identifying high-performing versus cost-intensive fleet vehicles.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </PageContainer>
    </AppShell>
  );
}
