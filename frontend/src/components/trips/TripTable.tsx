'use client';

import React, { useMemo, useState } from 'react';
import { MiningTrip, TripStatus } from '@/types/fleet';
import {
  Compass,
  Search,
  Filter,
  ArrowUpDown,
  PlusCircle,
  Truck,
  User,
  MapPin,
  ArrowRight,
  Scale,
  Calendar,
  ChevronRight,
  Eye,
  CheckCircle2,
  Clock,
  XCircle,
  Pencil,
  Trash2,
  Printer,
  Download,
  RotateCcw,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  formatVehicleDisplay,
  formatDriverDisplay,
  formatMineSiteDisplay,
} from '@/lib/displayFormatters';
import { toLocalDateString } from '@/lib/datetime';

interface TripTableProps {
  trips: MiningTrip[];
  onSelectTrip: (id: string) => void;
  onEditTrip?: (trip: MiningTrip) => void;
  onDeleteTrip?: (trip: MiningTrip) => void;
  onOpenCreateTrip: () => void;
  onOpenActionModal?: (trip: MiningTrip, action: string) => void;
  canManage: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedMineSite: string;
  onMineSiteChange: (site: string) => void;
  mineSiteOptions: string[];
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export function TripTable({
  trips,
  onSelectTrip,
  onEditTrip,
  onDeleteTrip,
  onOpenCreateTrip,
  onOpenActionModal,
  canManage,
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedMineSite,
  onMineSiteChange,
  mineSiteOptions,
  sortBy,
  onSortChange,
}: TripTableProps) {
  // Additional filters: Vehicle wise, Lead wise, Date to Date
  const [selectedVehicle, setSelectedVehicle] = useState<string>('ALL');
  const [selectedLead, setSelectedLead] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  // Extract unique vehicles and leads from trips
  const vehicleOptions = useMemo(() => {
    const set = new Set<string>();
    trips.forEach((t) => {
      if (t.vehicle) set.add(t.vehicle);
    });
    return Array.from(set).sort();
  }, [trips]);

  const leadOptions = useMemo(() => {
    const set = new Set<string>();
    trips.forEach((t) => {
      const lead = t.lead || t.destination;
      if (lead) set.add(lead);
    });
    return Array.from(set).sort();
  }, [trips]);

  // Client-side filtering by Vehicle, Lead, and Date Range
  const filteredTrips = useMemo(() => {
    return trips.filter((t) => {
      if (selectedVehicle !== 'ALL' && t.vehicle !== selectedVehicle) {
        return false;
      }
      if (selectedLead !== 'ALL') {
        const leadVal = t.lead || t.destination || '';
        if (leadVal !== selectedLead) {
          return false;
        }
      }
      const rawDate = t.dispatchDateTime ? t.dispatchDateTime.split(/[ T]/)[0] : '';
      if (fromDate && rawDate && rawDate < fromDate) {
        return false;
      }
      if (toDate && rawDate && rawDate > toDate) {
        return false;
      }
      return true;
    });
  }, [trips, selectedVehicle, selectedLead, fromDate, toDate]);

  const totalTripsCount = useMemo(
    () => filteredTrips.reduce((acc, t) => acc + Number(t.tripCount || 1), 0),
    [filteredTrips]
  );
  const totalQuantitySum = useMemo(
    () =>
      filteredTrips.reduce((acc, t) => {
        const tripCnt = Number(t.tripCount || 1);
        const q = Number(
          t.calculatedQuantity ??
            t.netWeightTons ??
            (t.averageTonnage ? tripCnt * Number(t.averageTonnage) : 0)
        );
        return acc + (isNaN(q) ? 0 : q);
      }, 0),
    [filteredTrips]
  );
  const totalAmountSum = useMemo(
    () =>
      filteredTrips.reduce((acc, t) => {
        const tripCnt = Number(t.tripCount || 1);
        const q = Number(
          t.calculatedQuantity ??
            t.netWeightTons ??
            (t.averageTonnage ? tripCnt * Number(t.averageTonnage) : 0)
        );
        const r = Number(t.leadRate ?? t.ratePerTon ?? 0);
        const a = Number(t.calculatedAmount ?? t.grossRevenue ?? (q * r));
        return acc + (isNaN(a) ? 0 : a);
      }, 0),
    [filteredTrips]
  );

  const handleDownloadCsv = () => {
    const headers = [
      'Date',
      'Vehicle No',
      'Lead/Route',
      'Trip',
      'Avg',
      'Qnt (MT)',
      'Rate (INR)',
      'Amount (INR)',
      'Status',
    ];
    const rows = filteredTrips.map((t) => {
      const rawDate = t.dispatchDateTime ? t.dispatchDateTime.split(/[ T]/)[0] : toLocalDateString();
      const veh = t.vehicle || '';
      const lead = t.lead || t.destination || '';
      const tripCnt = Number(t.tripCount || 1);
      const avgTons = Number(
        t.averageTonnage ||
          (t.calculatedQuantity && tripCnt > 0 ? Number(t.calculatedQuantity) / tripCnt : 0) ||
          (t.netWeightTons && tripCnt > 0 ? Number(t.netWeightTons) / tripCnt : 0)
      );
      const avg = avgTons > 0 ? `${avgTons} T` : '—';
      const qntVal = Number(
        t.calculatedQuantity ??
          t.netWeightTons ??
          (avgTons > 0 ? tripCnt * avgTons : 0)
      );
      const qnt = qntVal > 0 ? qntVal.toFixed(2) : '—';
      const rateVal = Number(t.leadRate ?? t.ratePerTon ?? 0);
      const rate = rateVal > 0 ? rateVal.toFixed(2) : '—';
      const amtVal = Number(
        t.calculatedAmount ??
          t.grossRevenue ??
          (qntVal > 0 && rateVal > 0 ? qntVal * rateVal : 0)
      );
      const amt = amtVal > 0 ? amtVal.toFixed(2) : '—';
      const status = t.tripStatus || 'Draft';
      return [
        rawDate,
        veh,
        `"${lead.replace(/"/g, '""')}"`,
        tripCnt,
        `"${avg}"`,
        qnt,
        rate,
        amt,
        `"${status}"`,
      ].join(',');
    });
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Mining_Trips_Export_${toLocalDateString()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const setFilterToday = () => {
    const today = toLocalDateString();
    setFromDate(today);
    setToDate(today);
  };

  const clearDateFilter = () => {
    setFromDate('');
    setToDate('');
  };

  const formatTripDate = (dtStr?: string | null) => {
    if (!dtStr) return '—';
    try {
      const parts = dtStr.split(/[ T]/)[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}.${parts[1]}.${parts[0]}`;
      }
      return dtStr;
    } catch {
      return dtStr;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Search and Filters Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 space-y-3.5 print:hidden">
        {/* Row 1: Search Box & Dropdown Filters (Vehicle, Lead, Status) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search vehicle, route, driver..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 focus:border-transparent placeholder:text-slate-400"
            />
          </div>

          {/* Vehicle Wise Filter */}
          <div className="flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-700 font-medium"
            >
              <option value="ALL">All Vehicles ({vehicleOptions.length})</option>
              {vehicleOptions.map((veh) => (
                <option key={veh} value={veh}>
                  {veh}
                </option>
              ))}
            </select>
          </div>

          {/* Lead Wise Filter */}
          <div className="flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedLead}
              onChange={(e) => setSelectedLead(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-700 font-medium"
            >
              <option value="ALL">All Leads / Routes ({leadOptions.length})</option>
              {leadOptions.map((lead) => (
                <option key={lead} value={lead}>
                  {lead}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-700 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="Delivered">Delivered</option>
              <option value="Approved">Approved</option>
              <option value="COMPLETED">Completed (Delivered / Approved)</option>
              <option value="RECONCILE_PENDING">Awaiting Reconcile</option>
              <option value="SITE_SUPERVISOR">Site Supervisor (Draft / Dispatched)</option>
              <option value="Draft">Draft</option>
              <option value="Dispatched">Dispatched</option>
              <option value="Weighbridge Confirmed">Weighbridge Confirmed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {/* Row 2: Date to Date Picker, Sort, Mine Site, Print & Download Buttons */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-1 border-t border-slate-200/60">
          {/* Date to Date Picker */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-500 font-semibold text-[11px] uppercase">From:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-transparent text-slate-800 text-xs focus:outline-none font-medium"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-slate-500 font-semibold text-[11px] uppercase">To:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-transparent text-slate-800 text-xs focus:outline-none font-medium"
              />
            </div>

            <button
              type="button"
              onClick={setFilterToday}
              className="px-2.5 py-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg transition-colors"
            >
              Today
            </button>

            {(fromDate || toDate || selectedVehicle !== 'ALL' || selectedLead !== 'ALL') && (
              <button
                type="button"
                onClick={() => {
                  clearDateFilter();
                  setSelectedVehicle('ALL');
                  setSelectedLead('ALL');
                }}
                className="px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Filters</span>
              </button>
            )}
          </div>

          {/* Actions & Tools */}
          <div className="flex items-center justify-between sm:justify-end gap-2.5">
            {/* Sort Selector */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-700 font-medium"
              >
                <option value="dispatch_desc">Latest Dispatched</option>
                <option value="dispatch_asc">Oldest Dispatched</option>
                <option value="weight_desc">Highest Weight</option>
                <option value="revenue_desc">Highest Value</option>
              </select>
            </div>

            {/* Print Button */}
            <Button
              variant="outline"
              size="sm"
              icon={Printer}
              onClick={() => window.print()}
              className="text-xs h-8 px-3"
            >
              Print
            </Button>

            {/* Download CSV Button */}
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleDownloadCsv}
              className="text-xs h-8 px-3"
            >
              Download
            </Button>

            {/* New Trip */}
            {canManage && (
              <Button
                onClick={onOpenCreateTrip}
                variant="primary"
                size="sm"
                icon={PlusCircle}
                className="shrink-0 h-8 px-3 text-xs"
              >
                New Trip
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-3.5 px-4">Date</th>
              <th className="py-3.5 px-4">Vehicle No</th>
              <th className="py-3.5 px-4">Lead/Route</th>
              <th className="py-3.5 px-4 text-right">Trip</th>
              <th className="py-3.5 px-4 text-center">Avg</th>
              <th className="py-3.5 px-4 text-right">Qnt</th>
              <th className="py-3.5 px-4 text-right">Rate</th>
              <th className="py-3.5 px-4 text-right">Amount</th>
              <th className="py-3.5 px-4 text-right print:hidden">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {filteredTrips.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                      <Compass className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">
                      No Mining Trips Found
                    </h3>
                    <p className="text-xs text-slate-500 mb-4">
                      {searchQuery || fromDate || toDate || selectedVehicle !== 'ALL' || selectedLead !== 'ALL'
                        ? 'Try adjusting your vehicle, date range, lead, or search filters.'
                        : 'No trips match the current filter criteria.'}
                    </p>
                    {canManage && (
                      <Button
                        onClick={onOpenCreateTrip}
                        variant="outline"
                        size="sm"
                        icon={PlusCircle}
                      >
                        Create New Trip
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredTrips.map((t) => {
                const rawDate = t.dispatchDateTime ? t.dispatchDateTime.split(/[ T]/)[0] : '';
                const dateDisplay = formatTripDate(rawDate);
                const tripCnt = Number(t.tripCount || 1);
                const avgTons = Number(
                  t.averageTonnage ||
                    (t.calculatedQuantity && tripCnt > 0 ? Number(t.calculatedQuantity) / tripCnt : 0) ||
                    (t.netWeightTons && tripCnt > 0 ? Number(t.netWeightTons) / tripCnt : 0)
                );
                const avgDisplay = avgTons > 0 ? `${avgTons} T` : '—';
                const qntVal = Number(
                  t.calculatedQuantity ??
                    t.netWeightTons ??
                    (avgTons > 0 ? tripCnt * avgTons : 0)
                );
                const qntDisplay = qntVal > 0 ? `${qntVal.toFixed(2)} MT` : '—';
                const rateVal = Number(t.leadRate ?? t.ratePerTon ?? 0);
                const rateDisplay = rateVal > 0 ? `₹${rateVal.toFixed(2)}` : '—';
                const amtVal = Number(
                  t.calculatedAmount ??
                    t.grossRevenue ??
                    (qntVal > 0 && rateVal > 0 ? qntVal * rateVal : 0)
                );
                const amtDisplay =
                  amtVal > 0
                    ? `₹${amtVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : '—';

                return (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTrip(t.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Date */}
                    <td className="py-3 px-4 font-mono text-xs text-slate-800">
                      {dateDisplay}
                    </td>

                    {/* Vehicle No */}
                    <td className="py-3 px-4 font-mono font-bold text-xs text-slate-900 group-hover:text-blue-900 transition-colors">
                      {t.vehicle ? formatVehicleDisplay(t.vehicle) : '—'}
                    </td>

                    {/* Lead / Route */}
                    <td className="py-3 px-4 text-xs font-semibold text-slate-800">
                      {t.lead || t.destination || 'Direct Mine Haulage'}
                    </td>

                    {/* Trip Count */}
                    <td className="py-3 px-4 text-right font-mono text-xs font-bold text-blue-900">
                      {tripCnt}
                    </td>

                    {/* Avg Tonnage */}
                    <td className="py-3 px-4 text-center font-mono text-xs text-slate-700">
                      {avgDisplay}
                    </td>

                    {/* Qnt */}
                    <td className="py-3 px-4 text-right font-mono text-xs font-bold text-slate-900">
                      {qntDisplay}
                    </td>

                    {/* Rate */}
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-600">
                      {rateDisplay}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right font-mono text-xs font-bold text-emerald-800">
                      {amtDisplay}
                    </td>

                    {/* Edit Actions */}
                    <td
                      className="py-3 px-4 text-right print:hidden"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        {canManage && onEditTrip && (
                          <button
                            type="button"
                            onClick={() => onEditTrip(t)}
                            title="Edit Trip Details"
                            className="p-1 text-slate-400 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canManage && onDeleteTrip && (
                          <button
                            type="button"
                            onClick={() => onDeleteTrip(t)}
                            title="Delete Trip"
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {filteredTrips.length > 0 && (
            <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-xs text-slate-900">
              <tr>
                <td colSpan={3} className="py-3 px-4 text-left uppercase tracking-wider text-slate-700">
                  TOTAL {searchQuery ? `FOR "${searchQuery}"` : ''} ({filteredTrips.length} RECORDS)
                </td>
                <td className="py-3 px-4 text-right font-mono text-blue-900">
                  {totalTripsCount}
                </td>
                <td className="py-3 px-4 text-center font-mono text-slate-500">
                  —
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-900">
                  {totalQuantitySum.toFixed(2)} MT
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-500">
                  —
                </td>
                <td className="py-3 px-4 text-right font-mono text-emerald-800">
                  ₹{totalAmountSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-4 print:hidden"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Footer summary */}
      <div className="py-3 px-4 sm:px-6 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between print:hidden">
        <span>
          Showing <strong className="text-slate-700">{filteredTrips.length}</strong> of{' '}
          <strong className="text-slate-700">{trips.length}</strong> mining trips
        </span>
        <span className="text-slate-400">Uptoware Dispatch Engine</span>
      </div>
    </div>
  );
}
