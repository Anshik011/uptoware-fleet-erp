import React, { useState, useMemo } from 'react';
import { PurchaseOrder } from '@/types/fleet';
import { Search, ShoppingCart, Eye, CheckCircle2, Clock, PackageCheck, AlertCircle, Trash2, Printer, Calendar } from 'lucide-react';
import { formatVehicleDisplay } from '@/lib/displayFormatters';
import { Button } from '@/components/ui/Button';

interface PurchaseOrdersTableProps {
  orders: PurchaseOrder[];
  isLoading: boolean;
  suppliers: Array<{ id: string; name: string }>;
  vehicles: Array<{ id: string; licensePlate: string }>;
  onSelectOrder: (order: PurchaseOrder) => void;
  onSubmitOrder: (order: PurchaseOrder) => void;
  onReceiveGoods: (order: PurchaseOrder) => void;
  onDeleteOrder?: (order: PurchaseOrder) => void;
  canManage: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedStatus: string;
  onStatusChange: (s: string) => void;
  selectedSupplier: string;
  onSupplierChange: (s: string) => void;
  viewMode?: 'home' | 'report';
  onViewModeChange?: (mode: 'home' | 'report') => void;
  fromDate?: string;
  onFromDateChange?: (d: string) => void;
  toDate?: string;
  onToDateChange?: (d: string) => void;
}

export function PurchaseOrdersTable({
  orders,
  isLoading,
  suppliers,
  vehicles,
  onSelectOrder,
  onSubmitOrder,
  onReceiveGoods,
  onDeleteOrder,
  canManage,
  searchQuery,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedSupplier,
  onSupplierChange,
  viewMode = 'home',
  onViewModeChange,
  fromDate = '',
  onFromDateChange,
  toDate = '',
  onToDateChange,
}: PurchaseOrdersTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  // Filter orders by date range if provided
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (fromDate && o.transactionDate && o.transactionDate < fromDate) return false;
      if (toDate && o.transactionDate && o.transactionDate > toDate) return false;
      return true;
    });
  }, [orders, fromDate, toDate]);

  const totalPages = Math.ceil(filteredOrders.length / pageSize) || 1;
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const totalQtySum = useMemo(() => {
    return filteredOrders.reduce((sum, o) => {
      const q = o.items?.reduce((iSum, it) => iSum + (it.qty || 0), 0) || 1;
      return sum + q;
    }, 0);
  }, [filteredOrders]);

  const totalAmountSum = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + (o.grandTotal || 0), 0);
  }, [filteredOrders]);

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
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search supplier, vehicle, parts..."
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          <div>
            <select
              value={selectedSupplier}
              onChange={(e) => {
                onSupplierChange(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
            >
              <option value="ALL">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                onStatusChange(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
            >
              <option value="ALL">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="To Receive and Bill">To Receive and Bill</option>
              <option value="To Receive">To Receive</option>
              <option value="To Bill">To Bill</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          {/* Date Range Filters */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={fromDate}
              onChange={(e) => onFromDateChange?.(e.target.value)}
              className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
              title="From Date"
            />
            <span>to</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => onToDateChange?.(e.target.value)}
              className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
              title="To Date"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onViewModeChange && (
            <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5">
              <button
                type="button"
                onClick={() => onViewModeChange('home')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'home'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Purchase Home
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange('report')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'report'
                    ? 'bg-blue-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Purchase Report
              </button>
            </div>
          )}
          <Button
            variant="outline"
            size="sm"
            icon={Printer}
            onClick={() => window.print()}
            className="text-xs"
          >
            Print
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
          <thead>
            {viewMode === 'home' ? (
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold text-[10px] tracking-wider uppercase">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-4">Supplier Name</th>
                <th className="py-3 px-4">Items Name</th>
                <th className="py-3 px-4 text-right">Qnt</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            ) : (
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold text-[10px] tracking-wider uppercase">
                <th className="py-3 px-4">Ref No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Supply Name</th>
                <th className="py-3 px-4">Item Name</th>
                <th className="py-3 px-4">Vehicle Number</th>
                <th className="py-3 px-4 text-right">Qnt</th>
                <th className="py-3 px-4 text-right">Rate</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            )}
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={viewMode === 'home' ? 8 : 10} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Loading purchase orders...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={viewMode === 'home' ? 8 : 10} className="py-12 text-center text-slate-500">
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
              paginatedOrders.map((o) => {
                const totalQty = o.items?.reduce((sum, it) => sum + (it.qty || 0), 0) || 1;
                const itemsName = o.items?.map((it) => it.itemName).join(', ') || 'Spare Parts Replenishment';
                const rate = o.items?.[0]?.rate || (o.grandTotal / totalQty);

                if (viewMode === 'home') {
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 text-slate-700">{o.transactionDate}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-blue-900">{o.name}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{o.supplier}</td>
                      <td className="py-3 px-4 text-slate-800">{itemsName}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{totalQty}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        ₹{o.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">{getStatusBadge(o.status, o.docstatus)}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => onSelectOrder(o)}
                            className="inline-flex items-center px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" />
                            View
                          </button>
                          {canManage && o.docstatus === 0 && (
                            <button
                              onClick={() => onSubmitOrder(o)}
                              className="inline-flex items-center px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded transition-colors"
                            >
                              Submit
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                } else {
                  return (
                    <tr key={o.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-blue-900">{o.name}</td>
                      <td className="py-3 px-4 text-slate-700">{o.transactionDate}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{o.supplier}</td>
                      <td className="py-3 px-4 text-slate-800">{itemsName}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                        {o.vehicle ? formatVehicleDisplay(o.vehicle, vehicles) : '—'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{totalQty}</td>
                      <td className="py-3 px-4 text-right font-mono text-slate-700">₹{rate.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                        ₹{o.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">{getStatusBadge(o.status, o.docstatus)}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onSelectOrder(o)}
                          className="inline-flex items-center px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View
                        </button>
                      </td>
                    </tr>
                  );
                }
              })
            )}
          </tbody>
          {filteredOrders.length > 0 && (
            <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-xs text-slate-900">
              <tr>
                <td colSpan={viewMode === 'home' ? 4 : 5} className="py-3 px-4 text-left uppercase tracking-wider text-slate-700">
                  TOTAL ({filteredOrders.length} ORDERS)
                </td>
                <td className="py-3 px-4 text-right font-mono font-black text-blue-900 text-sm">
                  {totalQtySum}
                </td>
                {viewMode === 'report' && (
                  <td className="py-3 px-4 text-right font-mono text-slate-500">
                    —
                  </td>
                )}
                <td className="py-3 px-4 text-right font-mono font-black text-emerald-800 text-sm">
                  ₹{totalAmountSum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
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

