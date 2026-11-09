'use client';

import React, { useState } from 'react';
import { formatCurrency, formatNumber } from '@/config/branding';
import { VehicleProfitabilityRecord } from '@/lib/frappe';
import { Search, Truck, TrendingUp, TrendingDown, Scale } from 'lucide-react';

interface VehicleProfitabilityTableProps {
  vehicles: VehicleProfitabilityRecord[];
  loading: boolean;
}

export function VehicleProfitabilityTable({ vehicles, loading }: VehicleProfitabilityTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = vehicles.filter((v) => {
    return (
      v.vehicle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.model.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search vehicle ID, make, model..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        </div>
        <div className="text-xs text-slate-500">
          Vehicle Level P&L Ledger
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
            <tr>
              <th className="px-4 py-3">Vehicle Asset</th>
              <th className="px-4 py-3 text-right">Trips</th>
              <th className="px-4 py-3 text-right">Tonnage</th>
              <th className="px-4 py-3 text-right">Invoiced Rev</th>
              <th className="px-4 py-3 text-right">Fuel Cost</th>
              <th className="px-4 py-3 text-right">Maint Cost</th>
              <th className="px-4 py-3 text-right">Direct OpEx</th>
              <th className="px-4 py-3 text-right">Total Cost</th>
              <th className="px-4 py-3 text-right">Net Contribution</th>
              <th className="px-4 py-3 text-right">Margin %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                  Loading vehicle profitability analysis...
                </td>
              </tr>
            )}

            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-slate-400">
                  <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-700">No Vehicle Records Available</p>
                  <p className="text-xs text-slate-400 mt-1">No tracked vehicles match the filter criteria.</p>
                </td>
              </tr>
            )}

            {!loading &&
              filtered.map((v) => {
                const isPositive = v.netContribution >= 0;
                return (
                  <tr key={v.vehicle} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900 font-mono">{v.vehicle}</div>
                      <div className="text-[11px] text-slate-400">
                        {v.make} {v.model}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700 font-mono">
                      {v.tripsCount}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700 font-mono">
                      {formatNumber(v.totalTons)} T
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-blue-700 font-mono">
                      {formatCurrency(v.invoicedRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 font-mono">
                      {formatCurrency(v.fuelCost)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 font-mono">
                      {formatCurrency(v.maintenanceCost)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600 font-mono">
                      {formatCurrency(v.directOpex)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 font-mono">
                      {formatCurrency(v.totalOperatingCost)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold font-mono ${
                        isPositive ? 'text-emerald-700' : 'text-rose-600'
                      }`}
                    >
                      {isPositive ? formatCurrency(v.netContribution) : `-${formatCurrency(Math.abs(v.netContribution))}`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold font-mono ${
                          isPositive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                        {v.operatingMarginPct}%
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
          Showing <strong>{filtered.length}</strong> operational fleet vehicles
        </span>
        <span className="text-[11px] text-slate-400">Formula: Net Contribution = Invoiced Revenue - Total Operating Cost</span>
      </div>
    </div>
  );
}

