import React, { useState } from 'react';
import { SparePartItem } from '@/types/fleet';
import { Search, Filter, Eye, AlertCircle, Package } from 'lucide-react';

interface SparePartsTableProps {
  items: SparePartItem[];
  isLoading: boolean;
  warehouses: Array<{ id: string; name: string }>;
  itemGroups: string[];
  onSelectItem: (item: SparePartItem) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedGroup: string;
  onGroupChange: (g: string) => void;
  selectedWarehouse: string;
  onWarehouseChange: (w: string) => void;
  selectedStatus: string;
  onStatusChange: (s: string) => void;
}

export function SparePartsTable({
  items,
  isLoading,
  warehouses,
  itemGroups,
  onSelectItem,
  searchQuery,
  onSearchChange,
  selectedGroup,
  onGroupChange,
  selectedWarehouse,
  onWarehouseChange,
  selectedStatus,
  onStatusChange,
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
      <div className="p-6 border-b border-slate-200 bg-slate-50/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search part code, name, OEM..."
              value={searchQuery}
              onChange={(e) => {
                onSearchChange(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Categories</option>
              {itemGroups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>

          {/* Warehouse Filter */}
          <div>
            <select
              value={selectedWarehouse}
              onChange={(e) => {
                onWarehouseChange(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Warehouses</option>
              {warehouses.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
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
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="ALL">All Stock Statuses</option>
              <option value="In Stock">In Stock</option>
              <option value="Low Stock">Low Stock</option>
              <option value="Out of Stock">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold text-xs tracking-wider uppercase">
              <th className="py-3.5 px-4">Part Code & OEM Ref</th>
              <th className="py-3.5 px-4">Part Description</th>
              <th className="py-3.5 px-4">Category</th>
              <th className="py-3.5 px-4 text-center">Status</th>
              <th className="py-3.5 px-4 text-right">Available Qty</th>
              <th className="py-3.5 px-4 text-right">Valuation Rate</th>
              <th className="py-3.5 px-4 text-right">Total Value</th>
              <th className="py-3.5 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center space-y-2">
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>Loading spare parts catalog from ERPNext...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedItems.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-500">
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
              paginatedItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">{item.itemCode}</div>
                    {item.partNumber && (
                      <div className="text-xs text-slate-500 font-mono">OEM: {item.partNumber}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-900">{item.itemName}</div>
                    {item.compatibleModel && (
                      <div className="text-xs text-slate-500">Fit: {item.compatibleModel}</div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">
                      {item.itemGroup}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    {getStatusBadge(item.stockStatus)}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="font-semibold text-slate-900">
                      {item.totalActualQty.toLocaleString()} {item.stockUom}
                    </div>
                    {item.reorderLevel > 0 && (
                      <div className="text-xs text-slate-400">
                        Reorder: {item.reorderLevel} {item.stockUom}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-slate-700">
                    ₹{item.valuationRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-900">
                    ₹{item.totalStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onSelectItem(item)}
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

