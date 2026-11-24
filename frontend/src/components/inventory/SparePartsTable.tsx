import React, { useState, useMemo } from 'react';
import { SparePartItem } from '@/types/fleet';
import { Search, Filter, Eye, AlertCircle, Package, Pencil, Trash2, Printer, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface SparePartsTableProps {
  items: SparePartItem[];
  isLoading: boolean;
  warehouses: Array<{ id: string; name: string }>;
  itemGroups: string[];
  onSelectItem: (item: SparePartItem) => void;
  onEditItem?: (item: SparePartItem) => void;
  onDeleteItem?: (item: SparePartItem) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedGroup: string;
  onGroupChange: (g: string) => void;
  selectedWarehouse: string;
  onWarehouseChange: (w: string) => void;
  selectedStatus: string;
  onStatusChange: (s: string) => void;
  fromDate?: string;
  onFromDateChange?: (d: string) => void;
  toDate?: string;
  onToDateChange?: (d: string) => void;
}

export function SparePartsTable({
  items,
  isLoading,
  warehouses,
  itemGroups,
  onSelectItem,
  onEditItem,
  onDeleteItem,
  searchQuery,
  onSearchChange,
  selectedGroup,
  onGroupChange,
  selectedWarehouse,
  onWarehouseChange,
  selectedStatus,
  onStatusChange,
  fromDate = '',
  onFromDateChange,
  toDate = '',
  onToDateChange,
}: SparePartsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const totalPages = Math.ceil(items.length / pageSize) || 1;
  const paginatedItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const getStatusBadge = (status: SparePartItem['stockStatus']) => {
    switch (status) {
      case 'In Stock':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
            In Stock
          </span>
        );
      case 'Low Stock':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
            Low Stock
          </span>
        );
      case 'Out of Stock':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
            Out of Stock
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
      {/* Table Filter Header */}
      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
          {/* Search Box - Parts Wise */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by parts name, code, OEM..."
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          {/* Item Group Filter */}
          <div>
            <select
              value={selectedGroup}
              onChange={(e) => {
                onGroupChange(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
            >
              <option value="ALL">All Categories</option>
              {itemGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Stock Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => {
                onStatusChange(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900"
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>

          {/* Date to Date Filters */}
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

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold text-[10px] tracking-wider uppercase">
              <th className="py-3 px-4">Sl No</th>
              <th className="py-3 px-4">Parts Name</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Available Qnt</th>
              <th className="py-3 px-4 text-right">Rate</th>
              <th className="py-3 px-4 text-right">Total Amount</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Loading spare parts catalog...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <Package className="w-8 h-8 text-slate-400" />
                    <p className="font-medium text-slate-700">No spare parts found</p>
                    <p className="text-xs text-slate-400">
                      Try adjusting your search query, category, or warehouse filter.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedItems.map((item, idx) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-600 font-medium">
                    {(currentPage - 1) * pageSize + idx + 1}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900">{item.itemName}</div>
                    {item.partNumber && (
                      <div className="text-[10px] text-slate-400 font-mono">OEM: {item.partNumber}</div>
                    )}
                  </td>
                  <td className="py-3 px-4 text-center">
                    {getStatusBadge(item.stockStatus)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                    {item.totalActualQty.toLocaleString()} {item.stockUom}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-700">
                    ₹{item.valuationRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                    ₹{item.totalStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {onEditItem && (
                        <button
                          type="button"
                          onClick={() => onEditItem(item)}
                          className="p-1.5 text-slate-500 hover:text-blue-900 hover:bg-slate-100 rounded-md transition-colors"
                          title="Edit Spare Part"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {onDeleteItem && (
                        <button
                          type="button"
                          onClick={() => onDeleteItem(item)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-md transition-colors"
                          title="Delete Spare Part"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onSelectItem(item)}
                        className="inline-flex items-center px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {items.length > 0 && (
            <tfoot className="border-t-2 border-slate-300 bg-slate-100 font-bold text-xs text-slate-900">
              <tr>
                <td colSpan={3} className="py-3 px-4 text-left uppercase tracking-wider text-slate-700">
                  TOTAL ({items.length} PARTS)
                </td>
                <td className="py-3 px-4 text-right font-mono font-black text-blue-900 text-sm">
                  {items.reduce((sum, it) => sum + (it.totalActualQty || 0), 0).toLocaleString()}
                </td>
                <td className="py-3 px-4 text-right font-mono text-slate-500">
                  —
                </td>
                <td className="py-3 px-4 text-right font-mono font-black text-emerald-800 text-sm">
                  ₹{items.reduce((sum, it) => sum + (it.totalStockValue || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="py-3 px-4"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination Footer */}
      {!isLoading && items.length > 0 && (
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-600">
          <div>
            Showing <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> to{' '}
            <span className="font-medium">{Math.min(currentPage * pageSize, items.length)}</span> of{' '}
            <span className="font-medium">{items.length}</span> items
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

