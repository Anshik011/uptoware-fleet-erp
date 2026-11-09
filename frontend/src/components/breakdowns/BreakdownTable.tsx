'use client';

import React from 'react';
import { VehicleBreakdown, BreakdownSeverity, RepairStatus } from '@/types/fleet';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Wrench,
  Search,
  CheckCircle2,
  AlertTriangle,
  Eye,
  PlusCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

interface BreakdownTableProps {
  breakdowns: VehicleBreakdown[];
  vehicles: Array<{ id: string; licensePlate: string }>;
  breakdownTypes: string[];
  severities: string[];
  searchQuery: string;
  selectedVehicle: string;
  selectedSeverity: string;
  selectedType: string;
  selectedStatus: string;
  onSearchChange: (q: string) => void;
  onVehicleChange: (v: string) => void;
  onSeverityChange: (s: string) => void;
  onTypeChange: (t: string) => void;
  onStatusChange: (status: string) => void;
  onSelectBreakdown: (b: VehicleBreakdown) => void;
  onOpenAddBreakdown: () => void;
  onOpenWorkflowModal: (b: VehicleBreakdown, defaultAction?: string) => void;
  canManage: boolean;
}

export function BreakdownTable({
  breakdowns,
  vehicles,
  breakdownTypes,
  severities,
  searchQuery,
  selectedVehicle,
  selectedSeverity,
  selectedType,
  selectedStatus,
  onSearchChange,
  onVehicleChange,
  onSeverityChange,
  onTypeChange,
  onStatusChange,
  onSelectBreakdown,
  onOpenAddBreakdown,
  onOpenWorkflowModal,
  canManage,
}: BreakdownTableProps) {
  function getStatusBadgeVariant(status: RepairStatus): BadgeVariant {
    switch (status) {
      case 'Closed':
        return 'positive';
      case 'Repaired':
        return 'info';
      case 'In Workshop':
        return 'warning';
      case 'Awaiting Parts':
        return 'critical';
      case 'Approved':
        return 'info';
      case 'Reported':
      default:
        return 'neutral';
    }
  }

  function getSeverityBadgeVariant(sev: BreakdownSeverity): BadgeVariant {
    switch (sev) {
      case 'Critical':
        return 'critical';
      case 'Medium':
        return 'warning';
      case 'Low':
      default:
        return 'neutral';
    }
  }

  const inWorkshopCount = breakdowns.filter((b) => b.repairStatus === 'In Workshop').length;
  const awaitingPartsCount = breakdowns.filter((b) => b.repairStatus === 'Awaiting Parts').length;
  const reportedCount = breakdowns.filter((b) => b.repairStatus === 'Reported').length;
  const repairedCount = breakdowns.filter((b) => b.repairStatus === 'Repaired').length;
  const closedCount = breakdowns.filter((b) => b.repairStatus === 'Closed').length;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header, Tabs & Filters */}
      <div className="p-4 sm:p-6 border-b border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 border-b sm:border-b-0 border-slate-200 pb-2 sm:pb-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => onStatusChange('ALL')}
              data-testid="tab-breakdown-all"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedStatus === 'ALL'
                  ? 'bg-slate-200 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              All Incidents ({breakdowns.length})
            </button>
            <button
              type="button"
              onClick={() => onStatusChange('Reported')}
              data-testid="tab-breakdown-reported"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedStatus === 'Reported'
                  ? 'bg-blue-100 text-blue-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Reported ({reportedCount})
            </button>
            <button
              type="button"
              onClick={() => onStatusChange('In Workshop')}
              data-testid="tab-breakdown-in-workshop"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                selectedStatus === 'In Workshop'
                  ? 'bg-amber-100 text-amber-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              In Workshop
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-amber-200/80 font-bold">
                {inWorkshopCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onStatusChange('Awaiting Parts')}
              data-testid="tab-breakdown-awaiting-parts"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                selectedStatus === 'Awaiting Parts'
                  ? 'bg-rose-100 text-rose-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Awaiting Parts
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-rose-200/80 font-bold">
                {awaitingPartsCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onStatusChange('Repaired')}
              data-testid="tab-breakdown-repaired"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${
                selectedStatus === 'Repaired'
                  ? 'bg-purple-100 text-purple-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Repaired ({repairedCount})
            </button>
            <button
              type="button"
              onClick={() => onStatusChange('Closed')}
              data-testid="tab-breakdown-closed"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
                selectedStatus === 'Closed'
                  ? 'bg-emerald-100 text-emerald-900'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Closed ({closedCount})
            </button>
          </div>

          {canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={PlusCircle}
              onClick={onOpenAddBreakdown}
              data-testid="btn-add-breakdown-table"
            >
              Report Breakdown
            </Button>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search incident ID, vehicle, driver, workshop..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              data-testid="input-breakdown-search"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          <div>
            <select
              value={selectedVehicle}
              onChange={(e) => onVehicleChange(e.target.value)}
              data-testid="select-breakdown-filter-vehicle"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="ALL">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate || v.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedSeverity}
              onChange={(e) => onSeverityChange(e.target.value)}
              data-testid="select-breakdown-filter-severity"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="ALL">All Severities</option>
              {severities.map((s) => (
                <option key={s} value={s}>
                  {s} Severity
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedType}
              onChange={(e) => onTypeChange(e.target.value)}
              data-testid="select-breakdown-filter-type"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="ALL">All Breakdown Types</option>
              {breakdownTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table
          className="w-full text-left border-collapse text-xs sm:text-sm"
          data-testid="table-breakdowns"
        >
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4 sm:px-6">Incident ID / Date</th>
              <th className="py-3 px-4">Vehicle & Driver</th>
              <th className="py-3 px-4">Type & Severity</th>
              <th className="py-3 px-4">Location / Workshop</th>
              <th className="py-3 px-4 text-right">Odometer (KM)</th>
              <th className="py-3 px-4 text-right">Downtime (Hrs)</th>
              <th className="py-3 px-4 text-right">Total Cost (₹)</th>
              <th className="py-3 px-4 text-right">Repair Status</th>
              <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {breakdowns.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Wrench className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">No breakdown incidents found</p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      {searchQuery || selectedVehicle !== 'ALL' || selectedSeverity !== 'ALL' || selectedType !== 'ALL'
                        ? 'Try clearing the search query or adjusting active filters.'
                        : 'No vehicle breakdown records exist in ERPNext.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              breakdowns.map((b) => {
                return (
                  <tr
                    key={b.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => onSelectBreakdown(b)}
                    data-testid={`row-breakdown-${b.id}`}
                  >
                    {/* ID & Date */}
                    <td className="py-3.5 px-4 sm:px-6 font-medium text-slate-900">
                      <div className="font-mono text-xs font-bold text-blue-900">
                        {b.id}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {b.breakdownDate} {b.breakdownTime ? `at ${b.breakdownTime}` : ''}
                      </div>
                    </td>

                    {/* Vehicle & Driver */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-900 text-xs">
                        {b.vehicle}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {b.driverName || b.driver || 'Driver unassigned'}
                      </div>
                    </td>

                    {/* Type & Severity */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 text-xs flex items-center gap-1.5">
                        {b.breakdownType}
                        <Badge variant={getSeverityBadgeVariant(b.severity)}>
                          {b.severity}
                        </Badge>
                      </div>
                    </td>

                    {/* Location & Workshop */}
                    <td className="py-3.5 px-4">
                      <div className="text-xs text-slate-800 line-clamp-1">
                        {b.breakdownLocation || 'On-site'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {b.assignedWorkshopName || b.assignedWorkshop || 'Internal Workshop'}
                      </div>
                    </td>

                    {/* Odometer */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-700">
                      {b.odometerReading ? b.odometerReading.toLocaleString('en-IN') : '—'}
                    </td>

                    {/* Downtime Hours */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs">
                      {b.downtimeHours > 0 ? (
                        <span className="font-bold text-rose-700">{b.downtimeHours.toFixed(1)} h</span>
                      ) : (
                        <span className="text-slate-400">0.0 h</span>
                      )}
                    </td>

                    {/* Total Cost */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-bold text-slate-900">
                      ₹{b.totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-right">
                      <Badge variant={getStatusBadgeVariant(b.repairStatus)}>
                        {b.repairStatus}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3.5 px-4 sm:px-6 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="outline"
                          size="sm"
                          icon={Eye}
                          onClick={() => onSelectBreakdown(b)}
                          data-testid={`btn-view-breakdown-${b.id}`}
                        >
                          Details
                        </Button>

                        {canManage && b.repairStatus !== 'Closed' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            icon={ArrowRight}
                            onClick={() => onOpenWorkflowModal(b)}
                            data-testid={`btn-action-breakdown-${b.id}`}
                          >
                            Update
                          </Button>
                        )}
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

