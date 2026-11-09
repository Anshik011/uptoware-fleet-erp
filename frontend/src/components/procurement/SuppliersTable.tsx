import React, { useState } from 'react';
import { Supplier } from '@/types/fleet';
import { Search, Users, Star, Eye, IndianRupee } from 'lucide-react';

interface SuppliersTableProps {
  suppliers: Supplier[];
  isLoading: boolean;
  onSelectSupplier: (s: Supplier) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedGroup: string;
  onGroupChange: (g: string) => void;
  preferredOnly: boolean;
  onPreferredOnlyChange: (p: boolean) => void;
  groups: string[];
}

export function SuppliersTable({
  suppliers,
  isLoading,
  onSelectSupplier,
  searchQuery,
  onSearchChange,
  selectedGroup,
  onGroupChange,
  preferredOnly,
  onPreferredOnlyChange,
  groups,
}: SuppliersTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const totalPages = Math.ceil(suppliers.length / pageSize) || 1;
  const paginatedSuppliers = suppliers.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Filters */}
      <div className="p-6 border-b border-slate-200 bg-slate-50/50">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendor name, PAN..."
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <select
              value={selectedGroup}
              onChange={(e) => {
                onGroupChange(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Supplier Groups</option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="preferredOnly"
              checked={preferredOnly}
              onChange={(e) => {
                onPreferredOnlyChange(e.target.checked);
                setCurrentPage(1);
              }}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="preferredOnly" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Preferred Vendors Only
            </label>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold text-xs tracking-wider uppercase">
              <th className="py-3.5 px-4">Supplier Name</th>
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4">Tax ID / PAN</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-right">Total Purchases</th>
              <th className="py-3.5 px-4 text-right">Outstanding Payables</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Loading suppliers directory from ERPNext...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedSuppliers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Users className="w-8 h-8 text-slate-400" />
                    <p className="font-medium text-slate-700">No suppliers found</p>
                    <p className="text-xs text-slate-400">
                      Register a supplier or adjust search filter.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedSuppliers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{s.supplierName}</div>
                    <div className="text-xs text-slate-400">{s.country || 'India'}</div>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600">
                    <span className="inline-block bg-slate-100 px-2 py-0.5 rounded">
                      {s.supplierGroup}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs text-slate-700">
                    {s.pan || '—'}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {s.isPreferred ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                        <Star className="w-3 h-3 mr-1 fill-blue-600" /> Preferred
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                        Standard
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                    ₹{s.totalPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-rose-700">
                    ₹{s.outstandingPayables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onSelectSupplier(s)}
                      className="inline-flex items-center px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && suppliers.length > 0 && (
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-medium">{Math.min(currentPage * pageSize, suppliers.length)}</span> of{' '}
            <span className="font-medium">{suppliers.length}</span> suppliers
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white border border-slate-300 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Previous
            </button>
            <span className="py-1 px-2 font-medium">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-white border border-slate-300 rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

