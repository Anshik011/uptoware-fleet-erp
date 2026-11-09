import React, { useState, useEffect } from 'react';
import { SparePartItem } from '@/types/fleet';
import { X, Package, Warehouse, History, ArrowDownRight, IndianRupee, Truck, AlertTriangle } from 'lucide-react';

interface SparePartDrawerProps {
  itemId: string | null;
  onClose: () => void;
}

export function SparePartDrawer({ itemId, onClose }: SparePartDrawerProps) {
  const [item, setItem] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'warehouses' | 'movements' | 'consumption'>('details');

  useEffect(() => {
    if (!itemId) {
      setItem(null);
      return;
    }

    async function loadItem() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/inventory/items/${encodeURIComponent(itemId!)}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to fetch spare part details');
        }
        setItem(data.item);
      } catch (err: any) {
        setError(err.message || 'Error loading item details');
      } finally {
        setIsLoading(false);
      }
    }

    loadItem();
  }, [itemId]);

  if (!itemId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg mt-1">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-slate-900 font-mono">
                  {item ? item.itemCode : itemId}
                </h2>
                {item && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      item.stockStatus === 'In Stock'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.stockStatus === 'Low Stock'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {item.stockStatus}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-slate-700 mt-0.5">
                {item ? item.itemName : 'Loading...'}
              </p>
              {item && (
                <p className="text-xs text-slate-500 mt-1">
                  Category: <span className="font-medium text-slate-700">{item.itemGroup}</span> | Unit:{' '}
                  <span className="font-medium text-slate-700">{item.stockUom}</span>
                </p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'details'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Overview & Specs
          </button>
          <button
            onClick={() => setActiveTab('warehouses')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'warehouses'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Warehouse Stock ({item?.warehouseBalances?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'movements'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Stock Movements
          </button>
          <button
            onClick={() => setActiveTab('consumption')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'consumption'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Fleet Consumption ({item?.consumptionHistory?.length || 0})
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Fetching real-time stock balances...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {error}
            </div>
          ) : !item ? null : (
            <>
              {/* TAB 1: OVERVIEW & SPECS */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Stock Metrics Card */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
                    <div>
                      <span className="text-xs text-slate-500">Available Stock</span>
                      <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                        {item.totalActualQty.toLocaleString()} {item.stockUom}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Reserved Stock</span>
                      <div className="text-xl font-bold text-amber-700 mt-1 font-mono">
                        {item.totalReservedQty.toLocaleString()} {item.stockUom}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">On Order (PO)</span>
                      <div className="text-xl font-bold text-blue-700 mt-1 font-mono">
                        {item.totalOrderedQty.toLocaleString()} {item.stockUom}
                      </div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500">Total Value</span>
                      <div className="text-xl font-bold text-emerald-700 mt-1 font-mono">
                        ₹{item.totalStockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  </div>

                  {/* Specifications Section */}
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 mb-3 border-b border-slate-200 pb-2">
                      Technical Specifications
                    </h3>
                    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-xs">
                      <div>
                        <dt className="text-slate-500">Part Number / OEM Reference</dt>
                        <dd className="font-mono font-medium text-slate-900 mt-0.5">
                          {item.partNumber || '—'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Compatible Vehicle Models</dt>
                        <dd className="font-medium text-slate-900 mt-0.5">
                          {item.compatibleModel || 'Universal Fleet Fitment'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Preferred Supplier</dt>
                        <dd className="font-medium text-slate-900 mt-0.5">
                          {item.preferredSupplier || 'Open Sourcing'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Standard Valuation Rate</dt>
                        <dd className="font-mono font-medium text-slate-900 mt-0.5">
                          ₹{item.valuationRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })} /{' '}
                          {item.stockUom}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Reorder Threshold Level</dt>
                        <dd className="font-medium text-slate-900 mt-0.5">
                          {item.reorderLevel} {item.stockUom}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">Standard Reorder Quantity</dt>
                        <dd className="font-medium text-slate-900 mt-0.5">
                          {item.reorderQty} {item.stockUom}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              )}

              {/* TAB 2: WAREHOUSE BALANCES */}
              {activeTab === 'warehouses' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">
                    Stock Balances by Warehouse (Live Bin Records)
                  </h3>
                  {item.warehouseBalances.length === 0 ? (
                    <p className="text-xs text-slate-500 py-6 text-center">
                      No warehouse stock records currently recorded for this item.
                    </p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-xs divide-y divide-slate-200">
                        <thead className="bg-slate-50 text-slate-700 font-semibold uppercase">
                          <tr>
                            <th className="py-2.5 px-3">Warehouse</th>
                            <th className="py-2.5 px-3 text-right">Actual Qty</th>
                            <th className="py-2.5 px-3 text-right">Reserved</th>
                            <th className="py-2.5 px-3 text-right">Projected</th>
                            <th className="py-2.5 px-3 text-right">Rate</th>
                            <th className="py-2.5 px-3 text-right">Stock Value</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-800">
                          {item.warehouseBalances.map((b: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-medium text-slate-900">
                                {b.warehouseName}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold">
                                {b.actualQty.toLocaleString()} {item.stockUom}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-amber-700">
                                {b.reservedQty}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-blue-700">
                                {b.projectedQty}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono">
                                ₹{b.valuationRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-emerald-800">
                                ₹{b.stockValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: STOCK MOVEMENTS */}
              {activeTab === 'movements' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">
                    Recent Stock Movements
                  </h3>
                  {(!item.movements || item.movements.length === 0) ? (
                    <p className="text-xs text-slate-500 py-6 text-center">
                      No stock movements recorded for this item yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-xs divide-y divide-slate-200">
                        <thead className="bg-slate-50 text-slate-700 font-semibold uppercase">
                          <tr>
                            <th className="py-2.5 px-3">Movement Type / Warehouse</th>
                            <th className="py-2.5 px-3 text-right">Qty</th>
                            <th className="py-2.5 px-3 text-right">Rate</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-800">
                          {item.movements.map((m: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3">
                                <div className="font-medium text-slate-900">
                                  {m.sWarehouse ? `From ${m.sWarehouse}` : ''}
                                  {m.sWarehouse && m.tWarehouse ? ' → ' : ''}
                                  {m.tWarehouse ? `To ${m.tWarehouse}` : ''}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold">
                                {m.qty} {m.uom}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono">
                                ₹{m.basicRate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold">
                                ₹{m.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: CONSUMPTION HISTORY */}
              {activeTab === 'consumption' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 mb-2">
                    Fleet Consumption History (Vehicle & Breakdown)
                  </h3>
                  {(!item.consumptionHistory || item.consumptionHistory.length === 0) ? (
                    <p className="text-xs text-slate-500 py-6 text-center">
                      No vehicle breakdown parts consumption recorded for this item yet.
                    </p>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-lg">
                      <table className="w-full text-left text-xs divide-y divide-slate-200">
                        <thead className="bg-slate-50 text-slate-700 font-semibold uppercase">
                          <tr>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Vehicle</th>
                            <th className="py-2.5 px-3">Breakdown #</th>
                            <th className="py-2.5 px-3 text-right">Qty Issued</th>
                            <th className="py-2.5 px-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-800">
                          {item.consumptionHistory.map((c: any, idx: number) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 text-slate-600">{c.postingDate}</td>
                              <td className="py-2.5 px-3 font-semibold text-slate-900">{c.vehicle}</td>
                              <td className="py-2.5 px-3 font-mono text-blue-600">{c.breakdown || '—'}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold">
                                {c.qty} {c.uom}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                                ₹{c.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

