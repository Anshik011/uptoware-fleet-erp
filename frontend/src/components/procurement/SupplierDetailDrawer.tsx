import React, { useState, useEffect } from 'react';
import { Supplier, PurchaseOrder, PurchaseInvoice } from '@/types/fleet';
import { X, Users, Star, IndianRupee, ShoppingCart, Receipt } from 'lucide-react';

interface SupplierDetailDrawerProps {
  supplierId: string | null;
  onClose: () => void;
}

export function SupplierDetailDrawer({ supplierId, onClose }: SupplierDetailDrawerProps) {
  const [supplier, setSupplier] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'invoices'>('orders');

  useEffect(() => {
    if (!supplierId) {
      setSupplier(null);
      return;
    }

    async function loadSupplier() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/procurement/suppliers/${encodeURIComponent(supplierId!)}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to fetch supplier details');
        }
        setSupplier(data.supplier);
      } catch (err: any) {
        setError(err.message || 'Error loading supplier details');
      } finally {
        setIsLoading(false);
      }
    }

    loadSupplier();
  }, [supplierId]);

  if (!supplierId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg mt-1">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-slate-900">
                  {supplier ? supplier.supplierName : supplierId}
                </h2>
                {supplier?.isPreferred && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    <Star className="w-3 h-3 mr-1 fill-blue-600" /> Preferred
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Group: <span className="font-medium text-slate-700">{supplier?.supplierGroup}</span> | PAN:{' '}
                <span className="font-mono font-medium text-slate-700">{supplier?.pan || '—'}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Financial Overview Cards */}
        {supplier && (
          <div className="grid grid-cols-2 gap-4 p-6 border-b border-slate-200 bg-white">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
              <span className="text-xs text-slate-500">Total Purchase Orders</span>
              <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                ₹{supplier.totalPurchases.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="p-4 bg-rose-50/50 rounded-lg border border-rose-200 text-center">
              <span className="text-xs text-rose-700">Outstanding Payables</span>
              <div className="text-xl font-bold text-rose-700 mt-1 font-mono">
                ₹{supplier.outstandingPayables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white px-6">
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'orders'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Purchase Orders ({supplier?.orders?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'invoices'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            Invoices & Payables ({supplier?.invoices?.length || 0})
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Fetching vendor history...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {error}
            </div>
          ) : !supplier ? null : (
            <>
              {activeTab === 'orders' && (
                <div className="space-y-3">
                  {supplier.orders?.length === 0 ? (
                    <p className="text-xs text-slate-500 py-8 text-center">
                      No purchase orders registered for this supplier yet.
                    </p>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs divide-y divide-slate-200">
                        <thead className="bg-slate-50 text-slate-700 font-semibold uppercase">
                          <tr>
                            <th className="py-2.5 px-3">PO Number</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3">Status</th>
                            <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-800">
                          {supplier.orders.map((o: PurchaseOrder) => (
                            <tr key={o.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                                {o.name}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">{o.transactionDate}</td>
                              <td className="py-2.5 px-3">
                                <span className="inline-block px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                                  {o.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                                ₹{o.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'invoices' && (
                <div className="space-y-3">
                  {supplier.invoices?.length === 0 ? (
                    <p className="text-xs text-slate-500 py-8 text-center">
                      No purchase invoices recorded for this supplier.
                    </p>
                  ) : (
                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                      <table className="w-full text-left text-xs divide-y divide-slate-200">
                        <thead className="bg-slate-50 text-slate-700 font-semibold uppercase">
                          <tr>
                            <th className="py-2.5 px-3">Invoice Number</th>
                            <th className="py-2.5 px-3">Date</th>
                            <th className="py-2.5 px-3 text-right">Total (₹)</th>
                            <th className="py-2.5 px-3 text-right">Outstanding (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-800">
                          {supplier.invoices.map((inv: PurchaseInvoice) => (
                            <tr key={inv.id} className="hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                                {inv.name}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600">{inv.postingDate}</td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                                ₹{inv.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-semibold text-rose-700">
                                ₹{inv.outstandingAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
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

