import React, { useState } from 'react';
import { VehicleInsurancePolicy } from '@/types/fleet';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Search,
  Calendar,
  IndianRupee,
  Eye,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  FileText,
} from 'lucide-react';

interface InsuranceTableProps {
  policies: VehicleInsurancePolicy[];
  onSelectPolicy: (policy: VehicleInsurancePolicy) => void;
  onRenewPolicy?: (policy: VehicleInsurancePolicy) => void;
  onActivatePolicy?: (policy: VehicleInsurancePolicy) => void;
  isLoading?: boolean;
}

export function InsuranceTable({
  policies,
  onSelectPolicy,
  onRenewPolicy,
  onActivatePolicy,
  isLoading = false,
}: InsuranceTableProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter policies
  const filtered = policies.filter((p) => {
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'EXPIRING_SOON') {
        if (p.policyStatus !== 'Active' || p.expiryUrgency !== 'expiring_soon') return false;
      } else if (p.policyStatus !== statusFilter) {
        return false;
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        p.policyNo.toLowerCase().includes(q) ||
        p.vehicle.toLowerCase().includes(q) ||
        p.insuranceCompany.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginated = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadge = (policy: VehicleInsurancePolicy) => {
    if (policy.policyStatus === 'Active') {
      if (policy.expiryUrgency === 'expiring_soon') {
        return {
          label: `Expiring (${policy.daysRemaining}d)`,
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          dot: 'bg-amber-500',
        };
      }
      if (policy.expiryUrgency === 'expired') {
        return {
          label: 'Overdue / Lapsed',
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          dot: 'bg-rose-500',
        };
      }
      return {
        label: 'Active Coverage',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        dot: 'bg-emerald-500',
      };
    }
    if (policy.policyStatus === 'Draft') {
      return {
        label: 'Draft',
        bg: 'bg-slate-100 text-slate-700 border-slate-300',
        dot: 'bg-slate-400',
      };
    }
    if (policy.policyStatus === 'Cancelled') {
      return {
        label: 'Cancelled',
        bg: 'bg-rose-100 text-rose-700 border-rose-300',
        dot: 'bg-rose-400',
      };
    }
    return {
      label: 'Expired',
      bg: 'bg-slate-200 text-slate-800 border-slate-400',
      dot: 'bg-slate-500',
    };
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header and Controls */}
      <div className="p-5 border-b border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            {[
              { id: 'ALL', label: 'All Policies' },
              { id: 'Active', label: 'Active' },
              { id: 'EXPIRING_SOON', label: 'Expiring Soon' },
              { id: 'Expired', label: 'Expired' },
              { id: 'Draft', label: 'Draft' },
              { id: 'Cancelled', label: 'Cancelled' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search policy, vehicle, insurer..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-900 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <th className="py-3.5 px-4">Policy Details</th>
              <th className="py-3.5 px-4">Vehicle</th>
              <th className="py-3.5 px-4">Insurance Company</th>
              <th className="py-3.5 px-4">Coverage Period</th>
              <th className="py-3.5 px-4 text-right">Premium (₹)</th>
              <th className="py-3.5 px-4 text-right">IDV (₹)</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-28" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-24" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-36" /></td>
                  <td className="py-4 px-4"><div className="h-4 bg-slate-100 rounded w-32" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-4 bg-slate-100 rounded w-16 ml-auto" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-4 bg-slate-100 rounded w-16 ml-auto" /></td>
                  <td className="py-4 px-4"><div className="h-5 bg-slate-100 rounded-full w-20 mx-auto" /></td>
                  <td className="py-4 px-4 text-right"><div className="h-6 bg-slate-100 rounded w-16 ml-auto" /></td>
                </tr>
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <Shield className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-sm text-slate-700">No insurance policies found</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {search || statusFilter !== 'ALL'
                      ? 'Try adjusting your search criteria or status filter.'
                      : 'Register your first vehicle insurance policy to get started.'}
                  </p>
                </td>
              </tr>
            ) : (
              paginated.map((p) => {
                const badge = getStatusBadge(p);
                return (
                  <tr
                    key={p.id}
                    onClick={() => onSelectPolicy(p)}
                    className="hover:bg-slate-50/75 cursor-pointer transition-colors group"
                  >
                    {/* Policy Details */}
                    <td className="py-3.5 px-4 font-medium text-slate-900">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                          <Shield className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {p.policyNo}
                          </div>
                          <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                            {p.name}
                            {p.isRenewal && (
                              <span className="ml-1.5 px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 font-sans text-[10px] font-semibold border border-indigo-200">
                                Renewal
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Vehicle */}
                    <td className="py-3.5 px-4">
                      <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 font-mono">
                        {p.vehicle}
                      </span>
                    </td>

                    {/* Insurance Company */}
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-900 truncate max-w-[200px]">
                        {p.insuranceCompany}
                      </div>
                      <div className="text-[11px] text-slate-500">{p.policyType}</div>
                    </td>

                    {/* Coverage Period */}
                    <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-slate-900 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{p.startDate}</span>
                        <span className="text-slate-400">→</span>
                        <span>{p.endDate}</span>
                      </div>
                      {p.daysRemaining !== undefined && (
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {p.daysRemaining > 0
                            ? `${p.daysRemaining} days remaining`
                            : p.daysRemaining === 0
                            ? 'Expires today'
                            : `Expired ${Math.abs(p.daysRemaining)} days ago`}
                        </div>
                      )}
                    </td>

                    {/* Premium (₹) */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900 font-mono">
                      ₹{p.premiumAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* IDV (₹) */}
                    <td className="py-3.5 px-4 text-right text-slate-700 font-mono">
                      {p.idvAmount > 0
                        ? `₹${p.idvAmount.toLocaleString('en-IN', { minimumFractionDigits: 0 })}`
                        : '—'}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${badge.bg}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div
                        className="flex items-center justify-end gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {p.policyStatus === 'Draft' && onActivatePolicy && (
                          <button
                            onClick={() => onActivatePolicy(p)}
                            title="Activate Policy"
                            className="px-2 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded flex items-center gap-1 transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Activate
                          </button>
                        )}

                        {p.policyStatus === 'Active' && onRenewPolicy && (
                          <button
                            onClick={() => onRenewPolicy(p)}
                            title="Renew Policy"
                            className="px-2 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded flex items-center gap-1 transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Renew
                          </button>
                        )}

                        <button
                          onClick={() => onSelectPolicy(p)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                          title="View Policy Details"
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
            of <span className="font-semibold text-slate-800">{filtered.length}</span> policies
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

