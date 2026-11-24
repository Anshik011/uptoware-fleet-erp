'use client';

import React, { useMemo } from 'react';
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
  const totalTripsCount = useMemo(
    () => trips.reduce((acc, t) => acc + Number(t.tripCount || 1), 0),
    [trips]
  );
  const totalQuantitySum = useMemo(
    () =>
      trips.reduce((acc, t) => {
        const tripCnt = Number(t.tripCount || 1);
        const q = Number(
          t.calculatedQuantity ??
            t.netWeightTons ??
            (t.averageTonnage ? tripCnt * Number(t.averageTonnage) : 0)
        );
        return acc + (isNaN(q) ? 0 : q);
      }, 0),
    [trips]
  );
  const totalAmountSum = useMemo(
    () =>
      trips.reduce((acc, t) => {
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
    [trips]
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
    ];
    const rows = trips.map((t) => {
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
      return [
        rawDate,
        veh,
        `"${lead}"`,
        tripCnt,
        `"${avg}"`,
        qnt,
        rate,
        amt,
      ].join(',');
    });
    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `Mining_Trips_${toLocalDateString()}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const getStatusBadge = (status: TripStatus | string) => {
    switch (status) {
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-600/20">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Draft
          </span>
        );
      case 'Dispatched':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Dispatched
          </span>
        );
      case 'Weighbridge Confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">
            <Scale className="w-3 h-3 text-amber-600" />
            Weighbridge Confirmed
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Approved
          </span>
        );
      case 'Delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-600/20">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500" />
            Delivered
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20">
            <XCircle className="w-3 h-3 text-rose-600" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-600/20">
            {status}
          </span>
        );
    }
  };

  const formatDateTime = (dtStr?: string | null) => {
    if (!dtStr) return '—';
    try {
      const d = new Date(dtStr);
      if (isNaN(d.getTime())) return dtStr;
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dtStr;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Search and Filters Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="flex flex-1 flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by vehicle, driver, pit, destination, material..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all placeholder:text-slate-400"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-700 transition-all font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Dispatched">Dispatched</option>
              <option value="Weighbridge Confirmed">Weighbridge Confirmed</option>
              <option value="Approved">Approved</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Mine Site Filter */}
          {mineSiteOptions.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={selectedMineSite}
                onChange={(e) => onMineSiteChange(e.target.value)}
                className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-700 transition-all font-medium"
              >
                <option value="ALL">All Mine Sites</option>
                {mineSiteOptions.map((site) => (
                  <option key={site} value={site}>
                    {site}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Sort & Quick Dispatch Button */}
        <div className="flex items-center justify-between sm:justify-end gap-3">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-700 transition-all font-medium"
            >
              <option value="dispatch_desc">Latest Dispatched</option>
              <option value="dispatch_asc">Oldest Dispatched</option>
              <option value="weight_desc">Highest Weight</option>
              <option value="revenue_desc">Highest Est. Value</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              icon={Printer}
              onClick={() => window.print()}
              className="text-xs"
            >
              Print
            </Button>
            <Button
              variant="outline"
              size="sm"
              icon={Download}
              onClick={handleDownloadCsv}
              className="text-xs"
            >
              Download
            </Button>
          </div>

          {canManage && (
            <Button
              onClick={onOpenCreateTrip}
              variant="primary"
              size="sm"
              icon={PlusCircle}
              className="shrink-0"
            >
              New Trip
            </Button>
          )}
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
              <th className="py-3.5 px-4 text-right">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {trips.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
                      <Compass className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1">
                      No Mining Trips Found
                    </h3>
                    <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                      {searchQuery || selectedStatus !== 'ALL' || selectedMineSite !== 'ALL'
                        ? 'No trips matched your search or filter parameters. Try clearing filters.'
                        : 'No operational mining trips have been logged in the system. Create a trip to initiate haulage.'}
                    </p>
                    {canManage && (
                      <Button
                        onClick={onOpenCreateTrip}
                        variant="primary"
                        size="sm"
                        icon={PlusCircle}
                      >
                        Create Mining Trip
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              trips.map((trip) => {
                const rawDate = trip.dispatchDateTime ? trip.dispatchDateTime.split(/[ T]/)[0] : toLocalDateString();
                const formattedDate = rawDate.includes('-') ? rawDate.split('-').reverse().join('.') : rawDate;
                const tripCountVal = Number(trip.tripCount || 1);
                const leadName = trip.lead || trip.destination || '—';

                // Real average payload tonnage
                const hasAvg = trip.averageTonnage != null || (trip.calculatedQuantity && tripCountVal > 0) || (trip.netWeightTons && tripCountVal > 0);
                const avgTons = Number(
                  trip.averageTonnage ||
                    (trip.calculatedQuantity && tripCountVal > 0 ? Number(trip.calculatedQuantity) / tripCountVal : 0) ||
                    (trip.netWeightTons && tripCountVal > 0 ? Number(trip.netWeightTons) / tripCountVal : 0)
                );
                const avgDisplay = hasAvg && avgTons > 0 ? `${avgTons} T` : '—';

                // Real calculated quantity
                const hasQuantity = trip.calculatedQuantity != null || trip.netWeightTons != null || (hasAvg && avgTons > 0);
                const qntVal = Number(
                  trip.calculatedQuantity ??
                    trip.netWeightTons ??
                    (hasAvg && avgTons > 0 ? tripCountVal * avgTons : 0)
                );

                // Real contracted rate
                const hasRate = (trip.leadRate != null && Number(trip.leadRate) > 0) || (trip.ratePerTon != null && Number(trip.ratePerTon) > 0);
                const rateVal = Number(trip.leadRate ?? trip.ratePerTon ?? 0);

                // Real valuation amount
                const hasAmount = trip.calculatedAmount != null || trip.grossRevenue != null || (hasQuantity && hasRate);
                const amountVal = Number(
                  trip.calculatedAmount ??
                    trip.grossRevenue ??
                    (qntVal > 0 && rateVal > 0 ? qntVal * rateVal : 0)
                );

                return (
                  <tr
                    key={trip.id}
                    onClick={() => onSelectTrip(trip.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Date */}
                    <td className="py-3 px-4 font-mono text-xs text-slate-700">
                      {formattedDate}
                    </td>

                    {/* Vehicle no */}
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-900 font-mono text-xs">
                        {formatVehicleDisplay(trip.vehicle)}
                      </span>
                    </td>

                    {/* Lead/Route */}
                    <td className="py-3 px-4 text-xs text-slate-800">
                      {leadName}
                    </td>

                    {/* Trip */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-blue-900 text-xs">
                      {tripCountVal}
                    </td>

                    {/* Avg */}
                    <td className="py-3 px-4 text-center font-mono text-xs text-slate-600">
                      {avgDisplay}
                    </td>

                    {/* Qnt */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900 text-xs">
                      {hasQuantity && qntVal > 0 ? `${qntVal.toFixed(2)} MT` : '—'}
                    </td>

                    {/* Rate */}
                    <td className="py-3 px-4 text-right font-mono text-xs text-slate-700">
                      {hasRate && rateVal > 0 ? `₹${rateVal.toFixed(2)}` : '—'}
                    </td>

                    {/* Amount */}
                    <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700 text-xs">
                      {hasAmount && amountVal > 0
                        ? `₹${amountVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        : '—'}
                    </td>

                    {/* Edit / Action */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        {canManage && onEditTrip && (
                          <button
                            type="button"
                            onClick={() => onEditTrip(trip)}
                            className="p-1 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded transition-colors"
                            title="Edit Trip"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelectTrip(trip.id)}
                          className="p-1 text-slate-400 hover:text-blue-900 hover:bg-slate-100 rounded transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          {trips.length > 0 && (
            <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-xs text-slate-900">
              <tr>
                <td colSpan={3} className="py-3 px-4 text-left uppercase tracking-wider text-slate-700">
                  TOTAL {searchQuery ? `FOR "${searchQuery}"` : ''} ({trips.length} RECORDS)
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
                <td className="py-3 px-4"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Footer summary */}
      <div className="py-3 px-4 sm:px-6 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
        <span>
          Showing <strong className="text-slate-700">{trips.length}</strong> mining trips
        </span>
        <span className="text-slate-400">Uptoware Dispatch Engine</span>
      </div>
    </div>
  );
}

