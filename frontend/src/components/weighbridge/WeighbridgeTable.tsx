'use client';

import React, { useState } from 'react';
import { MiningTrip } from '@/types/fleet';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Scale,
  Search,
  CheckCircle2,
  Clock,
  Eye,
} from 'lucide-react';

interface WeighbridgeTableProps {
  pendingQueue: MiningTrip[];
  completedRecords: MiningTrip[];
  mineSites: string[];
  materials: string[];
  searchQuery: string;
  selectedMineSite: string;
  selectedMaterial: string;
  onSearchChange: (q: string) => void;
  onMineSiteChange: (site: string) => void;
  onMaterialChange: (material: string) => void;
  onSelectTrip: (trip: MiningTrip) => void;
  onCaptureScale: (trip: MiningTrip) => void;
  canManage: boolean;
}

export function WeighbridgeTable({
  pendingQueue,
  completedRecords,
  mineSites,
  materials,
  searchQuery,
  selectedMineSite,
  selectedMaterial,
  onSearchChange,
  onMineSiteChange,
  onMaterialChange,
  onSelectTrip,
  onCaptureScale,
  canManage,
}: WeighbridgeTableProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'completed' | 'all'>('pending');

  let displayTrips: MiningTrip[] = [];
  if (activeTab === 'pending') {
    displayTrips = pendingQueue;
  } else if (activeTab === 'completed') {
    displayTrips = completedRecords;
  } else {
    displayTrips = [...pendingQueue, ...completedRecords];
  }

  function getStatusBadgeVariant(status?: string): BadgeVariant {
    switch (status) {
      case 'Dispatched':
        return 'warning';
      case 'Weighbridge Confirmed':
        return 'info';
      case 'Approved':
        return 'positive';
      case 'Delivered':
        return 'neutral';
      case 'Cancelled':
        return 'critical';
      default:
        return 'neutral';
    }
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header & Tabs */}
      <div className="p-4 sm:p-6 border-b border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Tab Navigation */}
          <div className="flex items-center gap-2 border-b sm:border-b-0 border-slate-200 pb-2 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('pending')}
              data-testid="tab-pending-scale"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${activeTab === 'pending'
                ? 'bg-amber-100 text-amber-900'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Pending Scale Capture
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-amber-200/80 font-bold">
                {pendingQueue.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('completed')}
              data-testid="tab-completed-scale"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${activeTab === 'completed'
                ? 'bg-blue-100 text-blue-900'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed Records
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-blue-200/80 font-bold">
                {completedRecords.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              data-testid="tab-all-scale"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${activeTab === 'all'
                ? 'bg-slate-200 text-slate-900'
                : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              All Records ({pendingQueue.length + completedRecords.length})
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by trip, vehicle, driver, challan..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              data-testid="input-weighbridge-search"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          <div>
            <select
              value={selectedMineSite}
              onChange={(e) => onMineSiteChange(e.target.value)}
              data-testid="select-weighbridge-minesite"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="ALL">All Mine Sites</option>
              {mineSites.map((site) => (
                <option key={site} value={site}>
                  {site}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedMaterial}
              onChange={(e) => onMaterialChange(e.target.value)}
              data-testid="select-weighbridge-material"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="ALL">All Mineral Materials</option>
              {materials.map((mat) => (
                <option key={mat} value={mat}>
                  {mat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table
          className="w-full text-left border-collapse text-xs sm:text-sm"
          data-testid="table-weighbridge"
        >
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4 sm:px-6">Trip ID / Challan</th>
              <th className="py-3 px-4">Vehicle & Driver</th>
              <th className="py-3 px-4">Pit & Material</th>
              <th className="py-3 px-4 text-right">Gross Wt (T)</th>
              <th className="py-3 px-4 text-right">Tare Wt (T)</th>
              <th className="py-3 px-4 text-right">Net Wt (T)</th>
              <th className="py-3 px-4 text-right">Scale Status</th>
              <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {displayTrips.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Scale className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">
                      No weighbridge records found
                    </p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      {searchQuery || selectedMineSite !== 'ALL' || selectedMaterial !== 'ALL'
                        ? 'Try clearing the search query or adjusting active filters.'
                        : activeTab === 'pending'
                          ? 'Zero trucks are currently awaiting scale weight capture.'
                          : 'No completed scale slips recorded in the database.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              displayTrips.map((trip) => {
                const isPending =
                  trip.tripStatus === 'Dispatched' || trip.workflowState === 'Dispatched';

                return (
                  <tr
                    key={trip.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => onSelectTrip(trip)}
                    data-testid={`row-weighbridge-${trip.id}`}
                  >
                    {/* Trip ID & Challan */}
                    <td className="py-3.5 px-4 sm:px-6 font-medium text-slate-900">
                      <div className="font-mono text-xs font-bold text-blue-900">
                        {trip.id}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {trip.challanNumber ? `Challan: ${trip.challanNumber}` : 'Pending slip'}
                      </div>
                    </td>

                    {/* Vehicle & Driver */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-900 text-xs">
                        {trip.vehicle}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {trip.driverName || trip.driver}
                      </div>
                    </td>

                    {/* Pit & Material */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 text-xs">
                        {trip.mineSiteName || trip.mineSite}
                      </div>
                      <div className="text-[11px] font-semibold text-slate-500">
                        {trip.materialType}
                      </div>
                    </td>

                    {/* Gross Weight */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-medium text-slate-700">
                      {trip.grossWeightTons != null ? trip.grossWeightTons.toFixed(3) : '—'}
                    </td>

                    {/* Tare Weight */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-medium text-slate-700">
                      {trip.tareWeightTons != null ? trip.tareWeightTons.toFixed(3) : '—'}
                    </td>

                    {/* Net Weight */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-bold">
                      {trip.netWeightTons != null ? (
                        <span className="text-emerald-700">{trip.netWeightTons.toFixed(3)} T</span>
                      ) : (
                        <span className="text-slate-400 font-normal">Pending</span>
                      )}
                    </td>

                    {/* Scale Status */}
                    <td className="py-3.5 px-4 text-right">
                      <Badge variant={getStatusBadgeVariant(trip.tripStatus)} size="sm">
                        {trip.tripStatus}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3.5 px-4 sm:px-6 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {isPending && canManage ? (
                        <Button
                          variant="primary"
                          size="sm"
                          icon={Scale}
                          onClick={() => onCaptureScale(trip)}
                          data-testid={`btn-capture-scale-${trip.id}`}
                        >
                          Capture Scale
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Eye}
                          onClick={() => onSelectTrip(trip)}
                          data-testid={`btn-view-slip-${trip.id}`}
                        >
                          Details
                        </Button>
                      )}
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

