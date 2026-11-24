'use client';

import React from 'react';
import { Vehicle } from '@/types/fleet';
import {
  Truck,
  User,
  UserPlus,
  ExternalLink,
  Search,
  Filter,
  ArrowUpDown,
  PlusCircle,
  ShieldCheck,
  FileQuestion,
  ChevronRight,
  Pencil,
  Trash2,
  Printer,
  Calendar,
  Building2,
} from 'lucide-react';

interface VehicleTableProps {
  vehicles: Vehicle[];
  onSelectVehicle: (id: string) => void;
  onEditVehicle?: (v: Vehicle) => void;
  onDeleteVehicle?: (v: Vehicle) => void;
  onOpenAddVehicle: () => void;
  onAllocateDriver?: (vehicleId: string) => void;
  onSelectDriver?: (driverId: string) => void;
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
  onEditVehicle,
  onDeleteVehicle,
  onOpenAddVehicle,
  onAllocateDriver,
  onSelectDriver,
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
      case 'Withdrawn':
        return 'bg-zinc-100 text-zinc-600 border-zinc-300';
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
                <option value="Withdrawn">Withdrawn (Decommissioned)</option>
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

            {/* Print Button */}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs shadow-xs transition-colors print:hidden"
              title="Print Vehicle Fleet Directory"
            >
              <Printer className="w-4 h-4 text-slate-500" />
              <span>Print</span>
            </button>

            {/* Primary Action Button: Add Vehicle */}
            <button
              type="button"
              data-testid="btn-register-vehicle"
              onClick={onOpenAddVehicle}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-900 hover:bg-blue-800 text-white font-medium text-xs shadow-sm transition-colors ml-auto sm:ml-0 print:hidden"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Register Vehicle</span>
            </button>
          </div>
        </div>
      </div>

      {/* Vehicles Data Table with Full Borders */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse border border-slate-300 text-xs">
          <thead>
            <tr className="bg-slate-100/90 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
              <th scope="col" className="px-3 py-3 text-center border border-slate-300 w-12">Sl No</th>
              <th scope="col" className="px-4 py-3 text-left border border-slate-300">Registration & Model</th>
              <th scope="col" className="px-4 py-3 text-left border border-slate-300">Owner Name</th>
              <th scope="col" className="px-4 py-3 text-left border border-slate-300">Assigned Driver Name</th>
              <th scope="col" className="px-3 py-3 text-center border border-slate-300">Operational Status</th>
              <th scope="col" className="px-4 py-3 text-left border border-slate-300">Assigned Mines</th>
              <th scope="col" className="px-3 py-3 text-center border border-slate-300">Registration Date</th>
              <th scope="col" className="px-4 py-3 text-left border border-slate-300 min-w-[280px]">Statutory Compliance (Expiry Dates)</th>
              <th scope="col" className="px-3 py-3 text-right border border-slate-300 print:hidden">Action</th>
            </tr>
          </thead>
          <tbody className="text-xs">
            {vehicles.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-slate-500 border border-slate-300">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <FileQuestion className="w-8 h-8 text-slate-400" />
                    <span className="font-semibold text-slate-700 text-sm">No vehicles matched your search or filter</span>
                    <span className="text-xs text-slate-500">Try modifying your filter parameters or register a new commercial vehicle.</span>
                  </div>
                </td>
              </tr>
            ) : (
              vehicles.map((v, index) => {
                const stat = v.statutory;

                const docs = [
                  { label: 'Insurance', short: 'INS', doc: stat.insurance },
                  { label: 'Fitness', short: 'FIT', doc: stat.fitness },
                  { label: 'PUC', short: 'PUC', doc: stat.puc },
                  { label: 'Road Tax', short: 'TAX', doc: stat.roadTax },
                  { label: 'Permit', short: 'PMT', doc: stat.permit },
                ];

                return (
                  <tr
                    key={v.id}
                    data-testid="vehicle-row"
                    data-vehicle-id={v.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    {/* 1. Sl No */}
                    <td className="px-3 py-3 text-center border border-slate-300 font-bold text-slate-600 font-mono">
                      {index + 1}
                    </td>

                    {/* 2. Registration No & Model */}
                    <td className="px-4 py-3 text-left border border-slate-300">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded bg-blue-50 border border-blue-200 text-blue-900 flex items-center justify-center shrink-0">
                          <Truck className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 font-mono tracking-wide text-xs">
                            {v.licensePlate}
                          </div>
                          <div className="text-[10px] text-slate-500 font-medium">
                            {v.make} · {v.model}
                            {v.vehicleType && <span className="ml-1 text-slate-600">({v.vehicleType})</span>}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* 3. Owner Name */}
                    <td className="px-4 py-3 text-left border border-slate-300 font-medium text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{v.ownerName || 'OMM MAA COAL TRANSPORT'}</span>
                      </div>
                    </td>

                    {/* 4. Assigned Driver Name */}
                    <td className="px-4 py-3 text-left border border-slate-300">
                      {v.assignedDriverName ? (
                        <div className="inline-flex items-center gap-1.5 font-semibold text-slate-800">
                          <User className="w-3.5 h-3.5 text-blue-600" />
                          <span>{v.assignedDriverName}</span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-medium">
                          No Driver Allocated
                        </span>
                      )}
                    </td>

                    {/* 5. Operational Status */}
                    <td className="px-3 py-3 text-center border border-slate-300">
                      <span
                        className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadge(
                          v.status
                        )}`}
                      >
                        {v.status}
                      </span>
                    </td>

                    {/* 6. Assigned Mines */}
                    <td className="px-4 py-3 text-left border border-slate-300 font-medium text-slate-700">
                      {v.customMineSite || v.mineSite || 'JBR Eastern — Talcher Site'}
                    </td>

                    {/* 7. Registration Date */}
                    <td className="px-3 py-3 text-center border border-slate-300 font-mono text-slate-700 whitespace-nowrap">
                      {v.registrationDate || '2024-03-15'}
                    </td>

                    {/* 8. Statutory Compliance with Expired Dates */}
                    <td className="px-4 py-3 text-left border border-slate-300">
                      <div className="grid grid-cols-2 gap-1.5">
                        {docs.map((d) => {
                          const isExp = d.doc.status === 'expired';
                          const isWarn = d.doc.status === 'expiring_soon';
                          const isValid = d.doc.status === 'valid';
                          const badgeColor = isExp
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : isWarn
                            ? 'bg-amber-50 text-amber-800 border-amber-300'
                            : isValid
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-slate-50 text-slate-600 border-slate-200';

                          return (
                            <div
                              key={d.label}
                              className={`flex items-center justify-between px-1.5 py-0.5 rounded border text-[10px] ${badgeColor}`}
                              title={`${d.label}: ${d.doc.status} (Exp: ${d.doc.expiryDate || 'N/A'})`}
                            >
                              <span className="font-bold">{d.short}:</span>
                              <span className="font-mono ml-1">{d.doc.expiryDate || 'Valid'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </td>

                    {/* 9. Action */}
                    <td className="px-3 py-3 text-right border border-slate-300 print:hidden whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        {onEditVehicle && (
                          <button
                            type="button"
                            onClick={() => onEditVehicle(v)}
                            className="p-1 text-slate-500 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                            title="Edit Vehicle Details"
                            data-testid={`btn-edit-vehicle-${v.id}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeleteVehicle && (
                          <button
                            type="button"
                            onClick={() => onDeleteVehicle(v)}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                            title="Delete Vehicle"
                            data-testid={`btn-delete-vehicle-${v.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          data-testid="btn-view-details"
                          onClick={() => onSelectVehicle(v.id)}
                          className="inline-flex items-center gap-0.5 px-2 py-1 rounded border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-semibold transition-colors"
                        >
                          <span>Details</span>
                          <ChevronRight className="w-3 h-3 text-slate-400" />
                        </button>
                      </div>
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
