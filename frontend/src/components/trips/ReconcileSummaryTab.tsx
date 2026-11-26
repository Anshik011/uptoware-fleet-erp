'use client';

import React, { useState, useMemo } from 'react';
import { MiningTrip } from '@/types/fleet';
import { toLocalDateString } from '@/lib/datetime';
import { Printer, Search, Calendar, Filter, Scale, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface ReconcileSummaryTabProps {
  trips: MiningTrip[];
  onRefresh?: () => void;
  isLoading?: boolean;
}

export function ReconcileSummaryTab({
  trips,
  onRefresh,
  isLoading = false,
}: ReconcileSummaryTabProps) {
  const [selectedDate, setSelectedDate] = useState<string>(() => toLocalDateString());
  const [selectedVehicle, setSelectedVehicle] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Filter trips based on selected date, vehicle, and search query
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      // Date filter (matches dispatchDateTime YYYY-MM-DD)
      if (selectedDate) {
        const tripDateStr = (t.dispatchDateTime || '').slice(0, 10);
        if (tripDateStr && tripDateStr !== selectedDate) {
          return false;
        }
      }

      // Vehicle filter
      if (selectedVehicle !== 'ALL') {
        const plate = t.vehicle || '';
        if (plate !== selectedVehicle) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const vPlate = (t.vehicle || '').toLowerCase();
        const lead = (t.lead || t.destination || '').toLowerCase();
        if (!vPlate.includes(q) && !lead.includes(q)) {
          return false;
        }
      }

      return true;
    });
  }, [trips, selectedDate, selectedVehicle, searchQuery]);

  // Unique list of vehicles for filter dropdown
  const vehicleList = useMemo(() => {
    const set = new Set<string>();
    trips.forEach((t) => {
      const v = t.vehicle;
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  }, [trips]);

  // 2. Identify dynamic Lead columns present in filtered trips
  const dynamicLeads = useMemo(() => {
    const leadSet = new Set<string>();
    filteredTrips.forEach((t) => {
      const leadName = t.lead || t.destination || 'General Haulage';
      leadSet.add(leadName);
    });
    return Array.from(leadSet).sort();
  }, [filteredTrips]);

  // 3. Aggregate trips per vehicle and per lead
  // Rows: One row per vehicle
  interface VehicleRowData {
    vehicle: string;
    leadTrips: Record<string, number>;
    totalTrips: number;
  }

  const matrixRows: VehicleRowData[] = useMemo(() => {
    const rowMap = new Map<string, VehicleRowData>();

    filteredTrips.forEach((t) => {
      const v = t.vehicle || 'Unassigned';
      const leadName = t.lead || t.destination || 'General Haulage';
      const count = Number(t.tripCount || 1);

      if (!rowMap.has(v)) {
        rowMap.set(v, {
          vehicle: v,
          leadTrips: {},
          totalTrips: 0,
        });
      }

      const row = rowMap.get(v)!;
      row.leadTrips[leadName] = (row.leadTrips[leadName] || 0) + count;
      row.totalTrips += count;
    });

    return Array.from(rowMap.values()).sort((a, b) => a.vehicle.localeCompare(b.vehicle));
  }, [filteredTrips]);

  // Column totals across all vehicles
  const leadColumnTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    dynamicLeads.forEach((l) => {
      totals[l] = matrixRows.reduce((sum, r) => sum + (r.leadTrips[l] || 0), 0);
    });
    return totals;
  }, [dynamicLeads, matrixRows]);

  const grandTotalTrips = matrixRows.reduce((sum, r) => sum + r.totalTrips, 0);

  // 4. Qnt Summary calculation (Route-wise Trip × Avg = Qnt)
  interface LeadQntSummary {
    leadName: string;
    totalTrips: number;
    avgTonnage: number;
    totalTonnage: number;
  }

  const qntSummaries: LeadQntSummary[] = useMemo(() => {
    const summaryMap = new Map<
      string,
      { totalTrips: number; totalWeight: number; tripEntries: number }
    >();

    filteredTrips.forEach((t) => {
      const leadName = t.lead || t.destination || 'General Haulage';
      const count = Number(t.tripCount || 1);
      const avg = Number(t.averageTonnage || (t.netWeightTons ? t.netWeightTons / count : 0));
      const weight = Number(t.netWeightTons || count * avg);

      if (!summaryMap.has(leadName)) {
        summaryMap.set(leadName, { totalTrips: 0, totalWeight: 0, tripEntries: 0 });
      }

      const item = summaryMap.get(leadName)!;
      item.totalTrips += count;
      item.totalWeight += weight;
      item.tripEntries += 1;
    });

    const result: LeadQntSummary[] = [];
    summaryMap.forEach((val, leadName) => {
      const computedAvg = val.totalTrips > 0 ? val.totalWeight / val.totalTrips : 0;
      result.push({
        leadName,
        totalTrips: val.totalTrips,
        avgTonnage: Number(computedAvg.toFixed(2)),
        totalTonnage: Number(val.totalWeight.toFixed(2)),
      });
    });

    return result.sort((a, b) => a.leadName.localeCompare(b.leadName));
  }, [filteredTrips]);

  const grandTotalTonnage = qntSummaries.reduce((sum, s) => sum + s.totalTonnage, 0);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Action / Filter Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {/* Date Picker */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-600">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent border-0 p-0 text-xs font-mono font-bold text-slate-900 focus:outline-none"
            />
          </div>

          {/* Vehicle Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="font-semibold text-slate-600">Vehicle:</span>
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="bg-transparent border-0 p-0 text-xs font-semibold text-slate-900 focus:outline-none"
            >
              <option value="ALL">All Vehicles</option>
              {vehicleList.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search vehicle or lead..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-900 w-48 text-slate-800"
            />
          </div>

          {/* Quick Clear Filter */}
          {(selectedDate !== toLocalDateString() || selectedVehicle !== 'ALL' || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedDate(toLocalDateString());
                setSelectedVehicle('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-blue-700 hover:text-blue-900 font-semibold"
            >
              Reset to Today
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {onRefresh && (
            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              onClick={onRefresh}
              disabled={isLoading}
            >
              {isLoading ? 'Loading...' : 'Refresh'}
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            icon={Printer}
            onClick={handlePrint}
            className="bg-blue-900 hover:bg-blue-950 text-white font-bold"
          >
            Print Reconcile Summary
          </Button>
        </div>
      </div>

      {/* Printable Reconcile Summary Container */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm print:p-0 print:border-0 print:shadow-none space-y-6">
        {/* Header Format */}
        <div className="border-b border-slate-200 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                Reconcile Trip Summary Report
              </h2>
              <div className="mt-1 flex items-center gap-2 text-sm text-slate-600 font-medium">
                <span>Date:</span>
                <span className="font-mono font-bold text-slate-900">
                  {selectedDate
                    ? new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })
                    : 'All Dates'}
                </span>
                {selectedVehicle !== 'ALL' && (
                  <>
                    <span>•</span>
                    <span>Vehicle: <strong className="font-mono text-slate-900">{selectedVehicle}</strong></span>
                  </>
                )}
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 font-mono block">
                Total Vehicles: {matrixRows.length}
              </span>
              <span className="text-xs text-slate-400 font-mono block">
                Total Haulage Volume: {grandTotalTrips} trips
              </span>
            </div>
          </div>
        </div>

        {/* Matrix Table */}
        {matrixRows.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <Scale className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
            <p className="text-sm font-semibold text-slate-700">No Reconciled Trips Found</p>
            <p className="text-xs text-slate-400 mt-1">
              No trip records match the selected date ({selectedDate}) or vehicle filter.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-300 rounded-lg">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-900 font-bold border-b border-slate-300">
                  <th className="py-2.5 px-3 text-left border-r border-slate-300 w-16">Sl No</th>
                  <th className="py-2.5 px-3 text-left border-r border-slate-300">Vehicle No</th>
                  {dynamicLeads.map((lead, idx) => (
                    <th key={idx} className="py-2.5 px-3 text-center border-r border-slate-300">
                      {lead}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-right bg-slate-200/60 font-black">Total Trip</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {matrixRows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3 border-r border-slate-200 font-mono text-slate-600">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 font-bold font-mono text-slate-900">
                      {row.vehicle}
                    </td>
                    {dynamicLeads.map((lead, leadIdx) => {
                      const count = row.leadTrips[lead] || 0;
                      return (
                        <td
                          key={leadIdx}
                          className={`py-2 px-3 text-center border-r border-slate-200 font-mono ${
                            count > 0 ? 'font-bold text-slate-900' : 'text-slate-400'
                          }`}
                        >
                          {count} trip
                        </td>
                      );
                    })}
                    <td className="py-2 px-3 text-right font-black font-mono text-blue-900 bg-slate-50/50">
                      {row.totalTrips} trip
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-400 bg-slate-100 font-bold text-slate-900">
                <tr>
                  <td className="py-2.5 px-3 border-r border-slate-300"></td>
                  <td className="py-2.5 px-3 border-r border-slate-300 font-black uppercase tracking-wider text-slate-900">
                    Total
                  </td>
                  {dynamicLeads.map((lead, idx) => (
                    <td key={idx} className="py-2.5 px-3 text-center border-r border-slate-300 font-black font-mono text-slate-900">
                      {leadColumnTotals[lead] || 0} trip
                    </td>
                  ))}
                  <td className="py-2.5 px-3 text-right font-black font-mono text-sm text-blue-950 bg-slate-200">
                    {grandTotalTrips} trip
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* Qnt Summary (Bottom Breakdown exactly matching Image 7) */}
        {qntSummaries.length > 0 && (
          <div className="border border-slate-300 rounded-xl p-5 bg-slate-50/70 space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Qnt Summary :-
            </h3>
            <div className="space-y-1.5 font-mono text-xs">
              {qntSummaries.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2 text-slate-800">
                  <span className="font-bold text-slate-900">{s.leadName}</span>
                  <span>-</span>
                  <span className="font-bold">{s.totalTrips} TRIP</span>
                  <span>X</span>
                  <span>{s.avgTonnage.toFixed(2)} AVG</span>
                  <span>=</span>
                  <span className="font-bold text-blue-900">{s.totalTonnage.toFixed(2)} Qnt</span>
                </div>
              ))}
            </div>

            <div className="border-t-2 border-slate-400 pt-2.5 mt-2 flex items-center justify-between text-xs font-black font-mono">
              <span className="text-slate-900 uppercase tracking-wider">Total</span>
              <div className="flex items-center gap-8">
                <span className="text-slate-900">{grandTotalTrips} trip</span>
                <span className="text-blue-950 text-sm">{grandTotalTonnage.toFixed(2)} Qnt (MT)</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
