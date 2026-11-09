'use client';

import React from 'react';
import { FuelLog } from '@/types/fleet';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Fuel,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  PlusCircle,
  Clock,
  Check,
} from 'lucide-react';

interface FuelLogTableProps {
  logs: FuelLog[];
  vehicles: Array<{ id: string; licensePlate: string }>;
  fuelSources: string[];
  searchQuery: string;
  selectedVehicle: string;
  selectedSource: string;
  selectedStatus: string;
  onSearchChange: (q: string) => void;
  onVehicleChange: (v: string) => void;
  onSourceChange: (s: string) => void;
  onStatusChange: (status: string) => void;
  onSelectLog: (log: FuelLog) => void;
  onOpenAddFuel: () => void;
  onOpenApprovalModal: (log: FuelLog, action: 'Approve' | 'Reject' | 'Re-open') => void;
  canManage: boolean;
}

export function FuelLogTable({
  logs,
  vehicles,
  fuelSources,
  searchQuery,
  selectedVehicle,
  selectedSource,
  selectedStatus,
  onSearchChange,
  onVehicleChange,
  onSourceChange,
  onStatusChange,
  onSelectLog,
  onOpenAddFuel,
  onOpenApprovalModal,
  canManage,
}: FuelLogTableProps) {
  function getStatusBadgeVariant(status: string): BadgeVariant {
    switch (status) {
      case 'Approved':
        return 'positive';
      case 'Draft':
        return 'warning';
      case 'Rejected':
        return 'critical';
      default:
        return 'neutral';
    }
  }

  const pendingCount = logs.filter((l) => l.approvalStatus === 'Draft').length;
  const approvedCount = logs.filter((l) => l.approvalStatus === 'Approved').length;
  const rejectedCount = logs.filter((l) => l.approvalStatus === 'Rejected').length;

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
              data-testid="tab-fuel-all"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${selectedStatus === 'ALL'
                  ? 'bg-slate-200 text-slate-900'
                  : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              All Dispensation ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => onStatusChange('Draft')}
              data-testid="tab-fuel-draft"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${selectedStatus === 'Draft'
                  ? 'bg-amber-100 text-amber-900'
                  : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Pending Approval
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-amber-200/80 font-bold">
                {pendingCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onStatusChange('Approved')}
              data-testid="tab-fuel-approved"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 whitespace-nowrap ${selectedStatus === 'Approved'
                  ? 'bg-emerald-100 text-emerald-900'
                  : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approved Logs
              <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-emerald-200/80 font-bold">
                {approvedCount}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onStatusChange('Rejected')}
              data-testid="tab-fuel-rejected"
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${selectedStatus === 'Rejected'
                  ? 'bg-rose-100 text-rose-900'
                  : 'text-slate-600 hover:bg-slate-100'
                }`}
            >
              Rejected ({rejectedCount})
            </button>
          </div>

          {canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={PlusCircle}
              onClick={onOpenAddFuel}
              data-testid="btn-add-fuel-table"
            >
              Log Fuel Entry
            </Button>
          )}
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search fuel log, vehicle, driver, station..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              data-testid="input-fuel-search"
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          <div>
            <select
              value={selectedVehicle}
              onChange={(e) => onVehicleChange(e.target.value)}
              data-testid="select-fuel-filter-vehicle"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="ALL">All Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.licensePlate}>
                  {v.licensePlate}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedSource}
              onChange={(e) => onSourceChange(e.target.value)}
              data-testid="select-fuel-filter-source"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            >
              <option value="ALL">All Fuel Sources</option>
              {fuelSources.map((s) => (
                <option key={s} value={s}>
                  {s}
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
          data-testid="table-fuel-logs"
        >
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4 sm:px-6">Log ID / Date</th>
              <th className="py-3 px-4">Vehicle & Driver</th>
              <th className="py-3 px-4">Source / Station</th>
              <th className="py-3 px-4 text-right">Odometer (KM)</th>
              <th className="py-3 px-4 text-right">Quantity (L)</th>
              <th className="py-3 px-4 text-right">Rate (₹/L)</th>
              <th className="py-3 px-4 text-right">Total Cost</th>
              <th className="py-3 px-4 text-right">Interval KM/L</th>
              <th className="py-3 px-4 text-right">Status</th>
              <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={10} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Fuel className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">No fuel logs found</p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      {searchQuery || selectedVehicle !== 'ALL' || selectedSource !== 'ALL'
                        ? 'Try clearing the search query or adjusting active filters.'
                        : 'No fuel dispensation logs have been recorded in ERPNext.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => {
                const isDraft = log.approvalStatus === 'Draft';

                return (
                  <tr
                    key={log.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => onSelectLog(log)}
                    data-testid={`row-fuel-log-${log.id}`}
                  >
                    {/* Log ID & Date */}
                    <td className="py-3.5 px-4 sm:px-6 font-medium text-slate-900">
                      <div className="font-mono text-xs font-bold text-blue-900">
                        {log.id}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {log.fuelDate}
                      </div>
                    </td>

                    {/* Vehicle & Driver */}
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-900 text-xs">
                        {log.vehicle}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {log.driverName || log.driver || 'Unspecified'}
                      </div>
                    </td>

                    {/* Source & Station */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 text-xs">
                        {log.fuelSource}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        {log.fuelStation || (log.isFullTank ? 'Full Tank' : 'Partial Top-up')}
                      </div>
                    </td>

                    {/* Odometer */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-700 font-medium">
                      {log.odometerReading.toLocaleString('en-IN')}
                    </td>

                    {/* Quantity */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-bold text-blue-900">
                      {log.quantityLitres.toFixed(2)}
                    </td>

                    {/* Rate */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs text-slate-700 font-medium">
                      ₹{log.ratePerLitre.toFixed(2)}
                    </td>

                    {/* Total Cost */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-bold text-slate-900">
                      ₹{log.totalCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                    </td>

                    {/* Interval KM/L */}
                    <td className="py-3.5 px-4 text-right font-mono text-xs font-medium">
                      {log.kmPerLitre && log.kmPerLitre > 0 ? (
                        <span className="text-emerald-700 font-bold">
                          {log.kmPerLitre.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">Indicative</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-right">
                      <Badge variant={getStatusBadgeVariant(log.approvalStatus)} size="sm">
                        {log.approvalStatus}
                      </Badge>
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3.5 px-4 sm:px-6 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        {isDraft && canManage && (
                          <>
                            <button
                              type="button"
                              onClick={() => onOpenApprovalModal(log, 'Approve')}
                              data-testid={`btn-quick-approve-${log.id}`}
                              className="p-1 text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
                              title="Approve Fuel Log"
                              aria-label="Approve Fuel Log"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenApprovalModal(log, 'Reject')}
                              data-testid={`btn-quick-reject-${log.id}`}
                              className="p-1 text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                              title="Reject Fuel Log"
                              aria-label="Reject Fuel Log"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={Eye}
                          onClick={() => onSelectLog(log)}
                          data-testid={`btn-view-fuel-${log.id}`}
                        >
                          Details
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

