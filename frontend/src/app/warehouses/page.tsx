'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Warehouse, SparePartItem } from '@/types/fleet';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { WarehouseCards } from '@/components/inventory/WarehouseCards';
import { SparePartDrawer } from '@/components/inventory/SparePartDrawer';
import { Button } from '@/components/ui/Button';
import { Warehouse as WarehouseIcon, RefreshCw, AlertCircle, Eye, Search } from 'lucide-react';

export default function WarehousesPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');
  const [items, setItems] = useState<SparePartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  const loadWarehouses = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/inventory/warehouses');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load warehouses');
      }
      setWarehouses(json.warehouses || []);

      // Also fetch items to display stock breakdown
      const itemsRes = await fetch('/api/inventory/items');
      const itemsJson = await itemsRes.json();
      if (itemsRes.ok && itemsJson.success) {
        setItems(itemsJson.items || []);
      }
    } catch (err: any) {
      setError(err.message || 'Error communicating with ERPNext');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWarehouses();
  }, [loadWarehouses]);

  // Filter items by warehouse and search
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      !searchQuery ||
      item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.itemName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesWarehouse =
      selectedWarehouse === 'ALL' ||
      item.warehouseBalances.some((b) => b.warehouse === selectedWarehouse && b.actualQty > 0);

    return matchesSearch && matchesWarehouse;
  });

  return (
    <AppShell>
      <PageContainer>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
              <WarehouseIcon className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Warehouses & Stock Bins
              </h1>
              <p className="text-sm text-slate-500">
                Multi-location warehouse directory and real-time inventory balances
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadWarehouses()}
              disabled={isLoading}
              className="flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Warehouse Error: </span>
              {error}
            </div>
          </div>
        )}

        {/* Warehouse Cards Grid */}
        <WarehouseCards
          warehouses={warehouses}
          selectedWarehouse={selectedWarehouse}
          onSelectWarehouse={setSelectedWarehouse}
          isLoading={isLoading}
        />

        {/* Warehouse Items Ledger */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {selectedWarehouse === 'ALL'
                  ? 'Consolidated Stock Across All Warehouses'
                  : `Stock Stored in ${warehouses.find((w) => w.id === selectedWarehouse)?.warehouseName || selectedWarehouse}`}
              </h3>
              <p className="text-xs text-slate-500">
                Click any warehouse card above to filter inventory stored at that location.
              </p>
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search items in this warehouse..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold text-xs tracking-wider uppercase">
                  <th className="py-3 px-4">Item Code</th>
                  <th className="py-3 px-4">Item Description</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Available Qty</th>
                  <th className="py-3 px-4 text-right">Unit Rate</th>
                  <th className="py-3 px-4 text-right">Stock Value</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 text-xs">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      No stock items found for the selected warehouse filter.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const balance =
                      selectedWarehouse === 'ALL'
                        ? {
                            actualQty: item.totalActualQty,
                            rate: item.valuationRate,
                            value: item.totalStockValue,
                          }
                        : (() => {
                            const b = item.warehouseBalances.find((x) => x.warehouse === selectedWarehouse);
                            return {
                              actualQty: b ? b.actualQty : 0,
                              rate: b ? b.valuationRate : item.valuationRate,
                              value: b ? b.stockValue : 0,
                            };
                          })();

                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-900">
                          {item.itemCode}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900">{item.itemName}</td>
                        <td className="py-3 px-4 text-slate-600">{item.itemGroup}</td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                          {balance.actualQty.toLocaleString()} {item.stockUom}
                        </td>
                        <td className="py-3 px-4 text-right font-mono">
                          ₹{balance.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold text-emerald-800">
                          ₹{balance.value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setSelectedItemId(item.id)}
                            className="inline-flex items-center px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5 mr-1" /> View
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Spare Part Details Drawer */}
        {selectedItemId && (
          <SparePartDrawer
            itemId={selectedItemId}
            onClose={() => setSelectedItemId(null)}
          />
        )}
      </PageContainer>
    </AppShell>
  );
}

