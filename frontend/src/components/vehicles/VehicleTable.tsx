'use client';

import React from 'react';
import { Vehicle } from '@/types/fleet';
import {
  Truck,
  User,
  Search,
  Filter,
  ArrowUpDown,
  PlusCircle,
  ShieldCheck,
  FileQuestion,
  ChevronRight
} from 'lucide-react';

interface VehicleTableProps {
  vehicles: Vehicle[];
  onSelectVehicle: (id: string) => void;
  onOpenAddVehicle: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedStatus: string;
  onStatusChange: (status: string) => void;
  selectedCompliance: string;
  onComplianceChange: (comp: string) => void;
  sortBy: string;
  onSortChange: (sort: string) => void;
}

export function VehicleTable({
  vehicles,
  onSelectVehicle,
  onOpenAddVehicle,
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedCompliance,
  onComplianceChange,
  sortBy,
  onSortChange,
}: VehicleTableProps) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'On Trip':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Under Maintenance':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Breakdown':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Out of Service':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getDocDot = (status: string, label: string) => {
    switch (status) {
      case 'valid':
        return (
          <span
            key={label}
            title={`${label}: Valid`}
            className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-100 inline-block"
          />
        );
      case 'expiring_soon':
        return (
          <span
            key={label}
            title={`${label}: Expiring Soon (<30 Days)`}
            className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-100 inline-block animate-pulse"
          />
        );
      case 'expired':
        return (
          <span
            key={label}
            title={`${label}: Expired`}
            className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-100 inline-block"
          />
        );
      default:
        return (
          <span
            key={label}
            title={`${label}: Missing`}
            className="w-2.5 h-2.5 rounded-full bg-slate-300 ring-2 ring-slate-100 inline-block"
          />
        );
    }
  };

  return (
    <div data-testid="vehicle-table-container" className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Control Bar: Search, Filters & Action Button */}
      <div className="p-6 border-b border-slate-200 bg-white">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              data-testid="vehicle-search"
              placeholder="Search by license plate, make, model or driver..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition-colors"
            />
          </div>

          {/* Filter & Sort Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                data-testid="status-filter"
                value={selectedStatus}
                onChange={(e) => onStatusChange(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 font-medium focus:outline-none focus:border-blue-600"
              >
                <option value="ALL">All Statuses</option>
                <option value="Active">Active (Ready)</option>
                <option value="On Trip">On Trip</option>
                <option value="Under Maintenance">Under Maintenance</option>
                <option value="Breakdown">In Breakdown</option>
                <option value="Out of Service">Out of Service</option>
              </select>
            </div>

            {/* Compliance Filter */}
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <select
                data-testid="compliance-filter"
                value={selectedCompliance}
                onChange={(e) => onComplianceChange(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 font-medium focus:outline-none focus:border-blue-600"
              >
                <option value="ALL">All Compliance</option>
                <option value="VALID">Fully Compliant</option>
                <option value="EXPIRING_SOON">Expiring Soon (30 Days)</option>
                <option value="EXPIRED">Expired / Overdue</option>
              </select>
            </div>

            {/* Sorting */}
            <div className="flex items-center gap-1.5">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <select
                data-testid="sort-filter"
                value={sortBy}
                onChange={(e) => onSortChange(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-2 text-slate-700 font-medium focus:outline-none focus:border-blue-600"
              >
                <option value="plate-asc">Plate (A-Z)</option>
                <option value="plate-desc">Plate (Z-A)</option>
                <option value="odometer-desc">Highest Odometer</option>
                <option value="capacity-desc">Highest Capacity</option>
              </select>
            </div>

            {/* Primary Action Button: Add Vehicle */}
            <button
              type="button"
              data-testid="btn-register-vehicle"
              onClick={onOpenAddVehicle}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-medium text-xs shadow-sm transition-colors ml-auto sm:ml-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register Vehicle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vehicles Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th scope="col" className="px-6 py-3.5 text-left">Registration & Model</th>
              <th scope="col" className="px-6 py-3.5 text-left">Assigned Driver</th>
              <th scope="col" className="px-6 py-3.5 text-left">Operational Status</th>
              <th scope="col" className="px-6 py-3.5 text-right">Odometer Reading</th>
              <th scope="col" className="px-6 py-3.5 text-right">Payload Limit</th>
              <th scope="col" className="px-6 py-3.5 text-center">Statutory Compliance</th>
              <th scope="col" className="px-6 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-xs">
            {vehicles.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileQuestion className="w-8 h-8 text-slate-400" />
                    <span className="font-semibold text-slate-700 text-sm">No vehicles matched your search or filter</span>
                    <span className="text-xs text-slate-500">Try modifying your filter parameters or register a new commercial vehicle.</span>
                  </div>
                </td>
              </tr>
            ) : (
              vehicles.map((v) => {
                const stat = v.statutory;

                return (
                  <tr
                    key={v.id}
                    data-testid="vehicle-row"
                    data-vehicle-id={v.id}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    onClick={() => onSelectVehicle(v.id)}
                  >
                    {/* Registration & Model (Left) */}
                    <td className="px-6 py-4 text-left">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-100 transition-colors">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 font-mono tracking-wide text-sm">
                            {v.licensePlate}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium">
                            {v.make} · {v.model}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Assigned Driver (Left) */}
                    <td className="px-6 py-4 text-left">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-800">
                          {v.assignedDriverName || (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </span>
                      </div>
                    </td>

                    {/* Operational Status (Left) */}
                    <td className="px-6 py-4 text-left">
                      <span
                        className={`inline-block text-[11px] font-semibold px-2.5 py-1 rounded-full border ${getStatusBadge(
                          v.status
                        )}`}
                      >
                        {v.status}
                      </span>
                    </td>

                    {/* Odometer (Right) */}
                    <td className="px-6 py-4 text-right font-mono font-semibold text-slate-900">
                      {v.lastOdometer.toLocaleString('en-IN')} KM
                    </td>

                    {/* Payload Limit (Right) */}
                    <td className="px-6 py-4 text-right font-semibold text-slate-700">
                      {v.payloadCapacityTons} MT
                    </td>

                    {/* Statutory Compliance Indicator (Center) */}
                    <td className="px-6 py-4 text-center">
                      <div className="inline-flex flex-col items-center">
                        <div className="flex items-center gap-1.5 mb-1">
                          {getDocDot(stat.insurance.status, 'Insurance')}
                          {getDocDot(stat.fitness.status, 'Fitness')}
                          {getDocDot(stat.puc.status, 'PUC')}
                          {getDocDot(stat.roadTax.status, 'Road Tax')}
                          {getDocDot(stat.permit.status, 'Permit')}
                        </div>
                        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                          {stat.overall === 'valid'
                            ? 'All 5 Valid'
                            : stat.overall === 'expiring_soon'
                            ? 'Expiring Soon'
                            : 'Renewal Needed'}
                        </span>
                      </div>
                    </td>

                    {/* Actions (Far Right) */}
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        data-testid="btn-view-details"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectVehicle(v.id);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-xs transition-colors"
                      >
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Table Footer Summary */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
        <div>
          Showing <span className="font-semibold text-slate-800">{vehicles.length}</span> commercial vehicles
        </div>
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Valid
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Expiring Soon (&lt;30d)
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> Expired
          </span>
        </div>
      </div>
    </div>
  );
}
