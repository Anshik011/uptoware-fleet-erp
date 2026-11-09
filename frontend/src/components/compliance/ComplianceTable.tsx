'use client';

import React, { useState } from 'react';
import {
  VehicleComplianceRecord,
  StatutoryDocDetail,
  StatutoryHealth,
} from '@/types/fleet';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Search,
  Eye,
  Edit,
  Truck,
  FileCheck,
  FileX,
  FileClock,
  HelpCircle,
} from 'lucide-react';

interface ComplianceTableProps {
  records: VehicleComplianceRecord[];
  onSelectVehicle: (record: VehicleComplianceRecord) => void;
  onUpdateDocument?: (
    record: VehicleComplianceRecord,
    docType?: 'Fitness' | 'PUC' | 'Road Tax' | 'Permit'
  ) => void;
  isLoading?: boolean;
}

export function ComplianceTable({
  records,
  onSelectVehicle,
  onUpdateDocument,
  isLoading = false,
}: ComplianceTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'valid' | 'expiring_soon' | 'expired'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filtered = records.filter((r) => {
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'expired' && (r.overallCompliance === 'expired' || r.overallCompliance === 'missing')) {
        // match
      } else if (r.overallCompliance !== statusFilter) {
        return false;
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        r.vehicle.toLowerCase().includes(q) ||
        r.licensePlate.toLowerCase().includes(q) ||
        r.make.toLowerCase().includes(q) ||
        r.model.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getHealthBadge = (health: StatutoryHealth) => {
    switch (health) {
      case 'valid':
        return {
          label: 'Valid',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          dot: 'bg-emerald-500',
          icon: ShieldCheck,
        };
      case 'expiring_soon':
        return {
          label: 'Expiring Soon',
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
          icon: AlertTriangle,
        };
      case 'expired':
        return {
          label: 'Expired',
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-rose-500',
          icon: ShieldAlert,
        };
      case 'missing':
      default:
        return {
          label: 'Missing / No Data',
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          dot: 'bg-slate-400',
          icon: HelpCircle,
        };
    }
  };

  const renderDocCell = (doc: StatutoryDocDetail) => {
    const badge = getHealthBadge(doc.status);
    return (
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
          <span className="text-xs font-semibold text-slate-900 font-mono">
            {doc.expiryDate || '—'}
          </span>
        </div>
        {doc.daysRemaining !== null ? (
          <span
            className={`text-[10px] font-medium ${
              doc.daysRemaining > 30
                ? 'text-slate-500'
                : doc.daysRemaining > 0
                ? 'text-amber-700 font-semibold'
                : 'text-rose-700 font-bold'
            }`}
          >
            {doc.daysRemaining > 0
              ? `${doc.daysRemaining}d remaining`
              : doc.daysRemaining === 0
              ? 'Expires today'
              : `Expired ${Math.abs(doc.daysRemaining)}d ago`}
          </span>
        ) : (
          <span className="text-[10px] text-slate-400 italic">No expiry record</span>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Header & Controls */}
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => {
              setStatusFilter('ALL');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Vehicles ({records.length})
          </button>
          <button
            onClick={() => {
              setStatusFilter('valid');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              statusFilter === 'valid'
                ? 'bg-white text-emerald-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            100% Compliant ({records.filter((r) => r.overallCompliance === 'valid').length})
          </button>
          <button
            onClick={() => {
              setStatusFilter('expiring_soon');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              statusFilter === 'expiring_soon'
                ? 'bg-white text-amber-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Expiring (&le;30d) ({records.filter((r) => r.overallCompliance === 'expiring_soon').length})
          </button>
          <button
            onClick={() => {
              setStatusFilter('expired');
              setCurrentPage(1);
            }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              statusFilter === 'expired'
                ? 'bg-white text-rose-800 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Non-Compliant ({records.filter((r) => r.overallCompliance === 'expired' || r.overallCompliance === 'missing').length})
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative min-w-[280px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search vehicle, license plate, model..."
            className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <th className="py-3 px-4">Vehicle Asset</th>
              <th className="py-3 px-4 text-center">Dispatch Status</th>
              <th className="py-3 px-4">Commercial Insurance</th>
              <th className="py-3 px-4">Fitness Certificate</th>
              <th className="py-3 px-4">Pollution (PUC)</th>
              <th className="py-3 px-4">Road Tax</th>
              <th className="py-3 px-4">Permit</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400">
                  <div className="inline-block w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mb-2" />
                  <p className="text-xs">Loading statutory compliance registers from ERPNext...</p>
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-sm text-slate-700">No vehicles match filters</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Try adjusting your search criteria or compliance filter.
                  </p>
                </td>
              </tr>
            ) : (
              paginated.map((r) => {
                const overallBadge = getHealthBadge(r.overallCompliance);
                return (
                  <tr
                    key={r.vehicle}
                    onClick={() => onSelectVehicle(r)}
                    className="hover:bg-slate-50/75 cursor-pointer transition-colors group"
                  >
                    {/* Vehicle */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors font-mono">
                            {r.vehicle}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {r.licensePlate || 'No Plate'}
                            {r.make && ` • ${r.make}`}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Overall Dispatch Compliance */}
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${overallBadge.bg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${overallBadge.dot}`} />
                        {overallBadge.label}
                      </span>
                    </td>

                    {/* Insurance */}
                    <td className="py-3 px-4">{renderDocCell(r.insurance)}</td>

                    {/* Fitness */}
                    <td className="py-3 px-4">{renderDocCell(r.fitness)}</td>

                    {/* PUC */}
                    <td className="py-3 px-4">{renderDocCell(r.puc)}</td>

                    {/* Road Tax */}
                    <td className="py-3 px-4">{renderDocCell(r.roadTax)}</td>

                    {/* Permit */}
                    <td className="py-3 px-4">{renderDocCell(r.permit)}</td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {onUpdateDocument && (
                          <button
                            onClick={() => onUpdateDocument(r)}
                            title="Update Statutory Certificate"
                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded border border-blue-200 transition-colors"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => onSelectVehicle(r)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                          title="View Full Compliance History"
                        >
                          <Eye className="w-4 h-4" />
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

      {/* Pagination Footer */}
      {!isLoading && filtered.length > 0 && (
        <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing{' '}
            <span className="font-semibold text-slate-800">
              {(currentPage - 1) * itemsPerPage + 1}
            </span>{' '}
            to{' '}
            <span className="font-semibold text-slate-800">
              {Math.min(currentPage * itemsPerPage, filtered.length)}
            </span>{' '}
            of <span className="font-semibold text-slate-800">{filtered.length}</span> vehicles
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-medium"
            >
              Previous
            </button>
            <span className="px-3 py-1 font-semibold text-slate-700">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-700 font-medium"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

