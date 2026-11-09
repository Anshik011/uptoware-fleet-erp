import React, { useState } from 'react';
import { PurchaseOrder } from '@/types/fleet';
import { Search, ShoppingCart, Eye, CheckCircle2, Clock, PackageCheck, AlertCircle } from 'lucide-react';

interface PurchaseOrdersTableProps {
  orders: PurchaseOrder[];
  isLoading: boolean;
  suppliers: Array<{ id: string; name: string }>;
  vehicles: Array<{ id: string; licensePlate: string }>;
  onSelectOrder: (order: PurchaseOrder) => void;
  onSubmitOrder: (order: PurchaseOrder) => void;
  onReceiveGoods: (order: PurchaseOrder) => void;
  canManage: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedStatus: string;
  onStatusChange: (s: string) => void;
  selectedSupplier: string;
  onSupplierChange: (s: string) => void;
}

export function PurchaseOrdersTable({
  orders,
  isLoading,
  suppliers,
  vehicles,
  onSelectOrder,
  onSubmitOrder,
  onReceiveGoods,
  canManage,
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedSupplier,
  onSupplierChange,
}: PurchaseOrdersTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const totalPages = Math.ceil(orders.length / pageSize) || 1;
  const paginatedOrders = orders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBadge = (status: string, docstatus: number) => {
    if (docstatus === 0) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
          <Clock className="w-3 h-3 mr-1" /> Draft
        </span>
      );
    }
    if (docstatus === 2) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
          Cancelled
        </span>
      );
    }

    switch (status) {
      case 'To Receive and Bill':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            To Receive & Bill
          </span>
        );
      case 'To Receive':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
            To Receive
          </span>
        );
      case 'To Bill':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">
            To Bill
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Completed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-800">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Filter Bar */}
      <div className="p-6 border-b border-slate-200 bg-slate-50/50">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search PO #, supplier, vehicle..."
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
              value={selectedStatus}
              onChange={(e) => {
                onStatusChange(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Order Statuses</option>
              <option value="Draft">Draft</option>
              <option value="To Receive and Bill">To Receive and Bill</option>
              <option value="To Receive">To Receive</option>
              <option value="To Bill">To Bill</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div>
            <select
              value={selectedSupplier}
              onChange={(e) => {
                onSupplierChange(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
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
              <th className="py-3.5 px-4">PO Number</th>
              <th className="py-3.5 px-4">Date</th>
              <th className="py-3.5 px-4">Supplier</th>
              <th className="py-3.5 px-4">Procurement Type</th>
              <th className="py-3.5 px-4">Fleet Link</th>
              <th className="py-3.5 px-4 text-right">Grand Total</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Loading purchase orders from ERPNext...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <ShoppingCart className="w-8 h-8 text-slate-400" />
                    <p className="font-medium text-slate-700">No purchase orders found</p>
                    <p className="text-xs text-slate-400">
                      Create a new Purchase Order to replenish spares or order parts for breakdowns.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedOrders.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <span className="font-mono font-semibold text-slate-900">{o.name}</span>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600">
                    <div>{o.transactionDate}</div>
                    {o.scheduleDate && (
                      <div className="text-slate-400">Due: {o.scheduleDate}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-900">{o.supplier}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                      {o.procurementType || 'Replenishment'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    {o.vehicle ? (
                      <div className="font-semibold text-slate-900">{o.vehicle}</div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                    {o.vehicleBreakdown && (
                      <div className="text-blue-600 font-mono text-[11px]">
                        BKD: {o.vehicleBreakdown}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                    ₹{o.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {getStatusBadge(o.status, o.docstatus)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        onClick={() => onSelectOrder(o)}
                        className="inline-flex items-center px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View
                      </button>

                      {canManage && o.docstatus === 0 && (
                        <button
                          onClick={() => onSubmitOrder(o)}
                          className="inline-flex items-center px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                        >
                          Submit
                        </button>
                      )}

                      {canManage && o.docstatus === 1 && (o.status === 'To Receive and Bill' || o.status === 'To Receive') && (
                        <button
                          onClick={() => onReceiveGoods(o)}
                          className="inline-flex items-center px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded transition-colors"
                        >
                          <PackageCheck className="w-3.5 h-3.5 mr-1" />
                          Receive
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && orders.length > 0 && (
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-medium">{Math.min(currentPage * pageSize, orders.length)}</span> of{' '}
            <span className="font-medium">{orders.length}</span> orders
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

