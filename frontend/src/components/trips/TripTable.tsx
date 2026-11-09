'use client';

import React from 'react';
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
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface TripTableProps {
  trips: MiningTrip[];
  onSelectTrip: (id: string) => void;
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
              placeholder="Search by Trip ID, vehicle, driver, pit, destination..."
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
              <option value="id_asc">Trip ID (A-Z)</option>
            </select>
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
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-3.5 px-4 sm:px-6">Trip ID & Material</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">Vehicle</th>
              <th className="py-3.5 px-4">Driver</th>
              <th className="py-3.5 px-4">Haulage Route</th>
              <th className="py-3.5 px-4 text-right">Net Weight</th>
              <th className="py-3.5 px-4">Dispatch Timestamp</th>
              <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            {trips.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center">
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
                return (
                  <tr
                    key={trip.id}
                    onClick={() => onSelectTrip(trip.id)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Trip ID & Material */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-slate-900 group-hover:text-blue-900 transition-colors">
                          {trip.id}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="neutral" size="sm" className="font-medium text-[10px]">
                            {trip.materialType || 'Bulk Material'}
                          </Badge>
                          {trip.challanNumber && (
                            <span className="text-[11px] text-slate-400">
                              #{trip.challanNumber}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4">
                      {getStatusBadge(trip.tripStatus || trip.status)}
                    </td>

                    {/* Vehicle */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
                          <Truck className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">{trip.vehicle}</span>
                          {trip.openingOdometer != null && trip.openingOdometer > 0 && (
                            <span className="text-[11px] text-slate-400">
                              Odo: {trip.openingOdometer.toLocaleString()} km
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Driver */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-md bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-800">
                            {trip.driverName || trip.driver}
                          </span>
                          {trip.driverName && trip.driverName !== trip.driver && (
                            <span className="text-[11px] text-slate-400">{trip.driver}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Haulage Route */}
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="font-medium text-slate-900 truncate max-w-[120px]">
                          {trip.mineSite}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-slate-600 truncate max-w-[120px]">
                          {trip.destination}
                        </span>
                      </div>
                    </td>

                    {/* Net Weight */}
                    <td className="py-4 px-4 text-right">
                      {trip.netWeightTons > 0 ? (
                        <div className="flex flex-col items-end">
                          <span className="font-semibold text-slate-900">
                            {trip.netWeightTons.toFixed(2)} T
                          </span>
                          {trip.grossRevenue > 0 && (
                            <span
                              className="text-[11px] text-slate-500 font-medium"
                              title="Estimated Commercial Value (Indicative)"
                            >
                              Est. ₹{trip.grossRevenue.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Pending</span>
                      )}
                    </td>

                    {/* Dispatch Timestamp */}
                    <td className="py-4 px-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatDateTime(trip.dispatchDateTime)}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 sm:px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTrip(trip.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-900 hover:bg-slate-100 rounded-md transition-colors"
                          title="View Trip Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
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

