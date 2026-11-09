import React, { useState } from 'react';
import { StockMovement } from '@/types/fleet';
import { Search, ArrowLeftRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface StockMovementsTableProps {
  movements: StockMovement[];
  isLoading: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedType: string;
  onTypeChange: (t: string) => void;
  selectedVehicle: string;
  onVehicleChange: (v: string) => void;
  vehicles: Array<{ id: string; licensePlate: string }>;
}

export function StockMovementsTable({
  movements,
  isLoading,
  searchQuery,
  onSearchChange,
  selectedType,
  onTypeChange,
  selectedVehicle,
  onVehicleChange,
  vehicles,
}: StockMovementsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const totalPages = Math.ceil(movements.length / pageSize) || 1;
  const paginatedMovements = movements.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'Material Issue':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            Material Issue
          </span>
        );
      case 'Material Receipt':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            Material Receipt
          </span>
        );
      case 'Material Transfer':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
            Material Transfer
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Filters Bar */}
      <div className="p-6 border-b border-slate-200 bg-slate-50/50">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search voucher #, vehicle, breakdown..."
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
              value={selectedType}
              onChange={(e) => {
                onTypeChange(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Movement Types</option>
              <option value="Material Issue">Material Issue</option>
              <option value="Material Receipt">Material Receipt</option>
              <option value="Material Transfer">Material Transfer</option>
            </select>
          </div>

          <div>
            <select
              value={selectedVehicle}
              onChange={(e) => {
                onVehicleChange(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Linked Vehicles</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.licensePlate}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold text-xs tracking-wider uppercase">
              <th className="py-3.5 px-4">Voucher No.</th>
              <th className="py-3.5 px-4">Date & Time</th>
              <th className="py-3.5 px-4">Type</th>
              <th className="py-3.5 px-4">Warehouse Route</th>
              <th className="py-3.5 px-4">Fleet Attribution</th>
              <th className="py-3.5 px-4 text-right">Quantity</th>
              <th className="py-3.5 px-4 text-right">Total Amount</th>
              <th className="py-3.5 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Loading stock movements from ERPNext...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedMovements.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <ArrowLeftRight className="w-8 h-8 text-slate-400" />
                    <p className="font-medium text-slate-700">No stock movements found</p>
                    <p className="text-xs text-slate-400">
                      Material issues, receipts, and warehouse transfers will appear here.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedMovements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-semibold text-slate-900">{m.name}</span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600">
                    <div>{m.postingDate}</div>
                    {m.postingTime && <div className="text-slate-400">{m.postingTime}</div>}
                  </td>
                  <td className="py-3.5 px-4">{getTypeBadge(m.entryType)}</td>
                  <td className="py-3.5 px-4 text-xs">
                    {m.fromWarehouse && (
                      <span className="text-slate-600">From: {m.fromWarehouse}</span>
                    )}
                    {m.fromWarehouse && m.toWarehouse && <br />}
                    {m.toWarehouse && (
                      <span className="text-slate-800 font-medium">To: {m.toWarehouse}</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    {m.vehicle ? (
                      <div className="font-semibold text-slate-900">{m.vehicle}</div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                    {m.vehicleBreakdown && (
                      <div className="text-blue-600 font-mono text-[11px]">
                        BKD: {m.vehicleBreakdown}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                    {m.totalQty.toLocaleString()}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                    ₹{m.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {m.docstatus === 1 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Submitted
                      </span>
                    ) : m.docstatus === 2 ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                        Cancelled
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <Clock className="w-3 h-3 mr-1" /> Draft
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && movements.length > 0 && (
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-medium">{Math.min(currentPage * pageSize, movements.length)}</span> of{' '}
            <span className="font-medium">{movements.length}</span> movements
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

