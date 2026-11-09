'use client';

import React, { useState } from 'react';
import { formatCurrency, formatDate, formatNumber } from '@/config/branding';
import { TripProfitabilityRecord } from '@/lib/frappe';
import { Search, Compass, AlertCircle, TrendingUp, TrendingDown, FileText } from 'lucide-react';

interface TripProfitabilityTableProps {
  trips: TripProfitabilityRecord[];
  loading: boolean;
}

export function TripProfitabilityTable({ trips, loading }: TripProfitabilityTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = trips.filter((t) => {
    return (
      t.tripId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.driver.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.mineSite.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.client.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="space-y-4">
      {/* Indicative vs Accounting Warning Banner */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-start gap-3 shadow-2xs">
        <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-semibold block">Commercial Billing Separation Rule:</span>
          <span>
            Mine Site <em>rate per ton</em> and <em>Estimated Revenue</em> are operational planning estimates only.
            Legally enforceable accounting revenue is derived strictly from submitted ERPNext <strong>Sales Invoices</strong>.
            Uninvoiced trips show ₹0 recognized revenue until commercial billing is approved by Finance.
          </span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search trip ID, vehicle, driver, site, client..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
            />
          </div>
          <div className="text-xs text-slate-500">
            Trip Level Margin Analysis
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Trip ID</th>
                <th className="px-4 py-3">Dispatch Date</th>
                <th className="px-4 py-3">Asset & Client</th>
                <th className="px-4 py-3 text-right">Net Tons</th>
                <th className="px-4 py-3 text-right">Indicative Rate</th>
                <th className="px-4 py-3 text-right">Estimated Rev</th>
                <th className="px-4 py-3 text-right">Invoiced Rev</th>
                <th className="px-4 py-3 text-right">Direct Costs</th>
                <th className="px-4 py-3 text-right">Contribution</th>
                <th className="px-4 py-3 text-center">Billing Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    Loading trip contribution analysis...
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                    <Compass className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No Mining Trips Available</p>
                    <p className="text-xs text-slate-400 mt-1">No completed or approved trips found.</p>
                  </td>
                </tr>
              )}

              {!loading &&
                filtered.map((t) => {
                  const isPositive = t.contribution >= 0;
                  return (
                    <tr key={t.tripId} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-semibold text-blue-700 font-mono">
                        {t.tripId}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{formatDate(t.dispatchDate)}</td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 font-mono">{t.vehicle}</div>
                        <div className="text-[11px] text-slate-500">{t.client}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800 font-mono">
                        {formatNumber(t.netTons)} T
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 font-mono">
                        {formatCurrency(t.indicativeRate)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 font-mono">
                        {formatCurrency(t.estimatedRevenue)}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-700 font-mono">
                        {formatCurrency(t.invoicedRevenue)}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600 font-mono">
                        {formatCurrency(t.totalDirectCost)}
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-bold font-mono ${
                          isPositive ? 'text-emerald-700' : 'text-rose-600'
                        }`}
                      >
                        {isPositive ? formatCurrency(t.contribution) : `-${formatCurrency(Math.abs(t.contribution))}`}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            t.billingStatus === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : t.billingStatus === 'Invoiced'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : t.billingStatus === 'Partially Paid'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {t.billingStatus}
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing <strong>{filtered.length}</strong> mining trip dispatches
          </span>
          <span className="text-[11px] text-slate-400">Formula: Contribution = Invoiced Revenue - (Direct OpEx + Direct Repair)</span>
        </div>
      </div>
    </div>
  );
}

