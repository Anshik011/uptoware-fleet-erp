import React, { useState, useEffect } from 'react';
import { PurchaseOrder } from '@/types/fleet';
import { X, ShoppingCart, CheckCircle2, Clock, PackageCheck, UserCheck, IndianRupee, AlertCircle } from 'lucide-react';

interface PurchaseOrderDetailDrawerProps {
  orderId: string | null;
  onClose: () => void;
  onSubmitOrder: (po: PurchaseOrder) => void;
  onReceiveGoods: (po: PurchaseOrder) => void;
  canManage: boolean;
}

export function PurchaseOrderDetailDrawer({
  orderId,
  onClose,
  onSubmitOrder,
  onReceiveGoods,
  canManage,
}: PurchaseOrderDetailDrawerProps) {
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      return;
    }

    async function loadOrder() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/procurement/orders/${encodeURIComponent(orderId!)}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to fetch purchase order details');
        }
        setOrder(data.order);
      } catch (err: any) {
        setError(err.message || 'Error loading purchase order');
      } finally {
        setIsLoading(false);
      }
    }

    loadOrder();
  }, [orderId]);

  if (!orderId) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg mt-1">
              <ShoppingCart className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-slate-900 font-mono">
                  {order ? order.name : orderId}
                </h2>
                {order && (
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                      order.docstatus === 0
                        ? 'bg-amber-100 text-amber-800'
                        : order.docstatus === 2
                        ? 'bg-slate-100 text-slate-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {order.status}
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-slate-700 mt-0.5">
                Supplier: <span className="font-bold text-slate-900">{order?.supplier || '—'}</span>
              </p>
              {order && (
                <p className="text-xs text-slate-500 mt-1">
                  Ordered on: <span className="font-medium text-slate-700">{order.transactionDate}</span>
                  {order.scheduleDate && (
                    <> | Delivery Due: <span className="font-medium text-slate-700">{order.scheduleDate}</span></>
                  )}
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center space-y-3">
              <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs text-slate-500 font-medium">Fetching purchase order items from ERPNext...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {error}
            </div>
          ) : !order ? null : (
            <>
              {/* Financial & Status Summary */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <div>
                  <span className="text-xs text-slate-500">Grand Total</span>
                  <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                    ₹{order.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Procurement Type</span>
                  <div className="text-xs font-semibold text-slate-800 mt-2">
                    {order.procurementType || 'Replenishment'}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Approval Stamp</span>
                  <div className="text-xs font-medium text-slate-700 mt-2 truncate">
                    {order.approvedBy ? (
                      <span className="text-emerald-700 font-semibold flex items-center justify-center">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        {order.approvedBy.split('@')[0]}
                      </span>
                    ) : (
                      <span className="text-amber-700 font-medium">Pending Approval</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Fleet Linkage (if any) */}
              {(order.vehicle || order.vehicleBreakdown || order.mineSite) && (
                <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                    Fleet Attribution
                  </h4>
                  <dl className="grid grid-cols-3 gap-3 text-xs">
                    {order.vehicle && (
                      <div>
                        <dt className="text-slate-500">Vehicle</dt>
                        <dd className="font-semibold text-slate-900 mt-0.5">{order.vehicle}</dd>
                      </div>
                    )}
                    {order.vehicleBreakdown && (
                      <div>
                        <dt className="text-slate-500">Breakdown Incident</dt>
                        <dd className="font-mono text-blue-600 mt-0.5">{order.vehicleBreakdown}</dd>
                      </div>
                    )}
                    {order.mineSite && (
                      <div>
                        <dt className="text-slate-500">Mine Site</dt>
                        <dd className="font-semibold text-slate-900 mt-0.5">{order.mineSite}</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}

              {/* Order Items Table */}
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-3">
                  Purchased Items ({order.items?.length || 0})
                </h3>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-slate-700 font-semibold uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Part Details</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                        <th className="py-2.5 px-3 text-right">Line Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      {order.items.map((i, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{i.itemCode}</div>
                            <div className="text-slate-500 text-[11px]">{i.itemName}</div>
                            {i.warehouse && (
                              <div className="text-slate-400 text-[11px]">Wh: {i.warehouse}</div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold">
                            {i.qty} {i.uom}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono">
                            ₹{i.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                            ₹{i.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold">
                      <tr>
                        <td colSpan={3} className="py-2.5 px-3 text-slate-700 text-right">
                          Grand Total:
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-right text-sm">
                          ₹{order.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        {order && canManage && (
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-3">
            {order.docstatus === 0 && (
              <button
                onClick={() => onSubmitOrder(order)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Submit / Approve Order</span>
              </button>
            )}

            {order.docstatus === 1 && (order.status === 'To Receive and Bill' || order.status === 'To Receive') && (
              <button
                onClick={() => onReceiveGoods(order)}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold shadow-sm transition-colors flex items-center space-x-1.5"
              >
                <PackageCheck className="w-4 h-4" />
                <span>Receive Goods (Goods Inward)</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

