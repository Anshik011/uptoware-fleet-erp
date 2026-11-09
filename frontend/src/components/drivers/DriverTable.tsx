'use client';

import React from 'react';
import { Driver } from '@/types/fleet';
import {
  UserCheck,
  Search,
  Filter,
  ArrowUpDown,
  PlusCircle,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Phone,
  Truck,
  Edit2,
  ChevronRight,
  UserX
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface DriverTableProps {
  drivers: Driver[];
  onSelectDriver: (id: string) => void;
  onEditDriver: (driver: Driver) => void;
  onOpenAddDriver: () => void;
  canManage: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedAvailability: string;
  onAvailabilityChange: (avail: string) => void;
  selectedCompliance: string;
  onComplianceChange: (comp: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export function DriverTable({
  drivers,
  onSelectDriver,
  onEditDriver,
  onOpenAddDriver,
  canManage,
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedAvailability,
  onAvailabilityChange,
  selectedCompliance,
  onComplianceChange,
  sortBy,
  onSortChange,
}: DriverTableProps) {
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Active':
        return 'positive';
      case 'Suspended':
        return 'warning';
      case 'Left':
      default:
        return 'neutral';
    }
  };

  const getComplianceBadge = (status: string, days: number | null) => {
    switch (status) {
      case 'valid':
        return (
          <Badge variant="positive" size="sm" className="gap-1">
            <ShieldCheck className="w-3 h-3" />
            Valid {days !== null ? `(${days}d)` : ''}
          </Badge>
        );
      case 'expiring_soon':
        return (
          <Badge variant="warning" size="sm" className="gap-1 animate-pulse">
            <AlertTriangle className="w-3 h-3" />
            Expires in {days}d
          </Badge>
        );
      case 'expired':
        return (
          <Badge variant="critical" size="sm" className="gap-1">
            <ShieldAlert className="w-3 h-3" />
            Expired {days !== null ? `(${Math.abs(days)}d ago)` : ''}
          </Badge>
        );
      case 'missing':
      default:
        return (
          <Badge variant="neutral" size="sm">
            Not Recorded
          </Badge>
        );
    }
  };

  const getSafetyBadgeVariant = (score: number) => {
    if (score >= 90) return 'positive';
    if (score >= 75) return 'warning';
    return 'critical';
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Search and Filters Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search driver by name, ID, license, or cell..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
              data-testid="input-search-driver"
            />
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            <select
              value={selectedStatus}
              onChange={(e) => onStatusChange(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
              data-testid="select-filter-status"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active Only</option>
              <option value="Suspended">Suspended</option>
              <option value="Left">Left</option>
            </select>
          </div>

          {/* Availability Filter */}
          <div>
            <select
              value={selectedAvailability}
              onChange={(e) => onAvailabilityChange(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
              data-testid="select-filter-availability"
            >
              <option value="ALL">All Roster State</option>
              <option value="ASSIGNED">Assigned to Vehicle</option>
              <option value="UNASSIGNED">Unassigned / Standby</option>
            </select>
          </div>

          {/* Compliance Filter */}
          <div>
            <select
              value={selectedCompliance}
              onChange={(e) => onComplianceChange(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
              data-testid="select-filter-compliance"
            >
              <option value="ALL">All License Status</option>
              <option value="VALID">License Valid</option>
              <option value="EXPIRING_SOON">Expiring Soon (≤30d)</option>
              <option value="EXPIRED">License Expired</option>
              <option value="MISSING">License Missing</option>
            </select>
          </div>
        </div>

        {/* Sort & Quick Actions */}
        <div className="flex items-center gap-3 justify-between sm:justify-end">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => onSortChange(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
              data-testid="select-sort-driver"
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="score-desc">Safety Score (High to Low)</option>
              <option value="expiry-asc">License Expiry (Earliest)</option>
            </select>
          </div>

          {canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={PlusCircle}
              onClick={onOpenAddDriver}
              data-testid="btn-add-driver-table"
            >
              Register Driver
            </Button>
          )}
        </div>
      </div>

      {/* Driver Directory Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4 sm:px-6">Driver Profile</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Contact Phone</th>
              <th className="py-3 px-4">Assigned Vehicle</th>
              <th className="py-3 px-4">License & Expiry</th>
              <th className="py-3 px-4 text-right">Safety Score</th>
              <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {drivers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <UserX className="w-8 h-8 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">No driver records found</p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      {searchQuery || selectedStatus !== 'ALL' || selectedAvailability !== 'ALL' || selectedCompliance !== 'ALL'
                        ? 'Try adjusting your search criteria or resetting filters.'
                        : 'No drivers are currently registered in the ERP database.'}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              drivers.map((driver) => (
                <tr
                  key={driver.id}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  onClick={() => onSelectDriver(driver.id)}
                  data-testid={`driver-row-${driver.id}`}
                >
                  {/* Driver Profile */}
                  <td className="py-3.5 px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        {driver.fullName
                          .split(' ')
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join('')
                          .toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 group-hover:text-blue-900 transition-colors">
                          {driver.fullName}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400">
                          {driver.id}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3.5 px-4">
                    <Badge variant={getStatusBadgeVariant(driver.status)} size="sm">
                      {driver.status}
                    </Badge>
                  </td>

                  {/* Contact Phone */}
                  <td className="py-3.5 px-4">
                    {driver.cellNumber ? (
                      <div className="flex items-center gap-1.5 text-slate-700 text-xs">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{driver.cellNumber}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-xs">Not provided</span>
                    )}
                  </td>

                  {/* Assigned Vehicle */}
                  <td className="py-3.5 px-4">
                    {driver.assignedVehicle ? (
                      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50/80 border border-blue-200 text-blue-900 font-mono text-xs font-semibold">
                        <Truck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                        {driver.assignedVehicle}
                      </div>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium text-slate-500 bg-slate-100">
                        Standby / Unassigned
                      </span>
                    )}
                  </td>

                  {/* License & Expiry */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-1 items-start">
                      <span className="text-xs font-mono font-medium text-slate-700">
                        {driver.licenseNumber || 'No License Number'}
                      </span>
                      {getComplianceBadge(driver.licenseStatus, driver.daysToLicenseExpiry)}
                    </div>
                  </td>

                  {/* Safety Score (Right-aligned numeric) */}
                  <td className="py-3.5 px-4 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Badge variant={getSafetyBadgeVariant(driver.safetyScore)} size="sm">
                        {driver.safetyScore.toFixed(1)}%
                      </Badge>
                    </div>
                  </td>

                  {/* Actions (Far right) */}
                  <td className="py-3.5 px-4 sm:px-6 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1.5">
                      {canManage && (
                        <button
                          type="button"
                          onClick={() => onEditDriver(driver)}
                          className="p-1.5 text-slate-500 hover:text-blue-900 hover:bg-blue-50 rounded-md transition-colors"
                          title="Edit Driver Profile"
                          data-testid={`btn-edit-driver-${driver.id}`}
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectDriver(driver.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-blue-900 hover:bg-blue-50 rounded-md transition-colors border border-blue-200"
                        data-testid={`btn-view-driver-${driver.id}`}
                      >
                        Profile
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
        <span>Showing {drivers.length} operator records</span>
        <span className="font-mono text-[11px] text-slate-400">Authoritative Frappe Ledger</span>
      </div>
    </div>
  );
}

