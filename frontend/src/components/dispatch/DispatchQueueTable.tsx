'use client';

import React from 'react';
import {
  Search,
  Filter,
  Truck,
  User,
  ArrowRight,
  Clock,
  Compass,
  CheckCircle2,
  Calendar,
  Send,
  Eye,
  AlertCircle,
} from 'lucide-react';
import { MiningTrip, MineSite, TripStatus } from '@/types/fleet';
import { Button } from '@/components/ui/Button';

interface DispatchQueueTableProps {
  queue: MiningTrip[];
  activeStatusTab: string;
  onStatusTabChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedMineSite: string;
  onMineSiteChange: (site: string) => void;
  mineSites: MineSite[];
  isLoading: boolean;
  canManage: boolean;
  onSelectTrip: (tripId: string) => void;
  onOpenEligibility: (trip: MiningTrip) => void;
  onOpenWorkflow: (trip: MiningTrip, action: string) => void;
}

export function DispatchQueueTable({
  queue,
  activeStatusTab,
  onStatusTabChange,
  searchQuery,
  onSearchChange,
  selectedMineSite,
  onMineSiteChange,
  mineSites,
  isLoading,
  canManage,
  onSelectTrip,
  onOpenEligibility,
  onOpenWorkflow,
}: DispatchQueueTableProps) {
  const statusTabs = [
    { id: 'Pending', label: 'Pending Dispatch' },
    { id: 'Dispatched', label: 'In Transit' },
    { id: 'Awaiting Weighbridge', label: 'Awaiting Scale' },
    { id: 'Delivered', label: 'Delivered' },
    { id: 'ALL', label: 'All Operations' },
  ];

  const getStatusBadge = (status: TripStatus | string) => {
    switch (status) {
      case 'Draft':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Pending Dispatch
          </span>
        );
      case 'Dispatched':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            In Transit
          </span>
        );
      case 'Weighbridge Confirmed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            Scale Confirmed
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
            Approved
          </span>
        );
      case 'Delivered':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Delivered
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr.replace(' ', 'T'));
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Status Segmented Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto bg-slate-50/50">
        {statusTabs.map((tab) => {
          const isActive = activeStatusTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onStatusTabChange(tab.id)}
              className={`px-4 py-3 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 -mb-px ${
                isActive
                  ? 'border-blue-900 text-blue-900 bg-white font-bold'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
              }`}
              data-testid={`tab-${tab.id.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search Trip ID, vehicle, driver, pit, material..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
            data-testid="input-dispatch-search"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedMineSite}
              onChange={(e) => onMineSiteChange(e.target.value)}
              className="w-full md:w-48 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-700"
              data-testid="select-dispatch-mine-site"
            >
              <option value="">All Mine Sites</option>
              {mineSites.map((s) => (
                <option key={s.id} value={s.siteName}>
                  {s.siteName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Queue Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse" data-testid="table-dispatch-queue">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-4 sm:px-6">Trip ID & Material</th>
              <th className="py-3 px-4">Vehicle & Driver</th>
              <th className="py-3 px-4">Route (Pit &rarr; Dest)</th>
              <th className="py-3 px-4 text-right">Net Tonnage</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Dispatch Time</th>
              <th className="py-3 px-4 sm:px-6 text-right">Operational Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="inline-flex items-center gap-2 text-xs">
                    <span className="w-2 h-2 rounded-full bg-blue-900 animate-pulse"></span>
                    Loading live dispatch queue from ERPNext...
                  </div>
                </td>
              </tr>
            ) : queue.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <div className="max-w-xs mx-auto text-center space-y-2">
                    <Compass className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-semibold text-slate-700">No Trips in Queue</p>
                    <p className="text-xs text-slate-500">
                      No mining trips match the current filter criteria or require dispatch action.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              queue.map((trip) => {
                const isDraft = trip.tripStatus === 'Draft' || trip.status === 'Draft';
                const isDispatched = trip.tripStatus === 'Dispatched' || trip.status === 'Dispatched';

                return (
                  <tr
                    key={trip.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    onClick={() => onSelectTrip(trip.id)}
                    data-testid={`dispatch-row-${trip.id}`}
                  >
                    {/* Trip ID & Material */}
                    <td className="py-4 px-4 sm:px-6">
                      <div className="flex flex-col">
                        <span className="font-mono font-bold text-blue-900 group-hover:underline text-xs">
                          {trip.id}
                        </span>
                        <span className="text-xs text-slate-600 font-medium mt-0.5">
                          {trip.materialType}
                        </span>
                        {trip.challanNumber && (
                          <span className="text-[10px] text-slate-400 font-mono">
                            Challan: {trip.challanNumber}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Vehicle & Driver */}
                    <td className="py-4 px-4">
                      <div className="flex flex-col space-y-0.5">
                        <span className="font-semibold text-slate-900 text-xs flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                          {trip.vehicle}
                        </span>
                        <span className="text-xs text-slate-600 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          {trip.driverName || trip.driver}
                        </span>
                      </div>
                    </td>

                    {/* Route */}
                    <td className="py-4 px-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-slate-800 truncate max-w-[120px]">
                          {trip.mineSiteName || trip.mineSite}
                        </span>
                        <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-slate-600 truncate max-w-[120px]">
                          {trip.destination}
                        </span>
                      </div>
                    </td>

                    {/* Net Tonnage */}
                    <td className="py-4 px-4 text-right">
                      {trip.netWeightTons > 0 ? (
                        <span className="font-semibold text-slate-900 font-mono text-xs">
                          {trip.netWeightTons.toFixed(2)} T
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic font-mono">Awaiting Scale</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-4 px-4 text-center">
                      {getStatusBadge(trip.tripStatus || trip.status)}
                    </td>

                    {/* Dispatch Time */}
                    <td className="py-4 px-4 text-right text-xs text-slate-600 font-mono">
                      <div className="flex items-center justify-end gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{formatDateTime(trip.dispatchDateTime)}</span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td
                      className="py-4 px-4 sm:px-6 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-2">
                        {canManage && isDraft && (
                          <Button
                            variant="primary"
                            size="sm"
                            icon={Send}
                            onClick={() => onOpenEligibility(trip)}
                            data-testid={`btn-dispatch-${trip.id}`}
                          >
                            Dispatch
                          </Button>
                        )}

                        {canManage && isDispatched && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenWorkflow(trip, 'Confirm Weighbridge')}
                            data-testid={`btn-scale-${trip.id}`}
                          >
                            Scale Ticket
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Eye}
                          onClick={() => onSelectTrip(trip.id)}
                          data-testid={`btn-view-${trip.id}`}
                        >
                          View
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

