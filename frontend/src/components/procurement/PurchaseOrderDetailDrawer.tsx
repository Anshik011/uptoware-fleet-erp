import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PurchaseOrder } from '@/types/fleet';
import { X, ShoppingCart, CheckCircle2, Clock, PackageCheck, UserCheck, IndianRupee, AlertCircle, Printer } from 'lucide-react';
import {
  formatVehicleDisplay,
  formatMineSiteDisplay,
  formatItemDisplay,
} from '@/lib/displayFormatters';

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleBeforePrint = () => {
      document.body.classList.add('printing-po-active');
    };
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-po-active');
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('printing-po-active');
    };
  }, []);

  const handlePrintPO = () => {
    document.body.classList.add('printing-po-active');
    window.print();
  };

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
    <>
      <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm flex justify-end print:hidden">
        <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg mt-1">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-slate-900">
                    {order ? `${order.supplier || 'Vendor'} · ${order.procurementType || 'Replenishment'}` : 'Purchase Order'}
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
            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={handlePrintPO}
                className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-200 rounded-md transition-colors flex items-center gap-1.5 text-xs font-semibold mr-1"
                title="Print Official Purchase Order"
              >
                <Printer className="w-4 h-4 text-slate-500" />
                <span className="hidden sm:inline">Print PO</span>
              </button>
              <button
                onClick={onClose}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Fetching purchase order items...</p>
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
                          <dd className="font-semibold text-slate-900 mt-0.5">
                            {formatVehicleDisplay(order.vehicle, undefined, { includeModel: true })}
                          </dd>
                        </div>
                      )}
                      {order.vehicleBreakdown && (
                        <div>
                          <dt className="text-slate-500">Breakdown Incident</dt>
                          <dd className="text-blue-600 mt-0.5">Linked Breakdown Service</dd>
                        </div>
                      )}
                      {order.mineSite && (
                        <div>
                          <dt className="text-slate-500">Mine Site</dt>
                          <dd className="font-semibold text-slate-900 mt-0.5">
                            {formatMineSiteDisplay(order.mineSite)}
                          </dd>
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
                              <div className="font-semibold text-slate-900">
                                {formatItemDisplay(i.itemCode, i.itemName)}
                              </div>
                              <div className="text-slate-500 text-[11px] font-mono">Part Code: {i.itemCode}</div>
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

                {/* Official Purchase Order Authorization Signatures */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4">
                    Mandatory Verification & Authorization Signatures
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="flex flex-col items-center justify-between p-2.5 border border-slate-200 rounded-lg bg-slate-50 min-h-[90px]">
                      <div className="w-full border-b border-dashed border-slate-400 mt-6 mb-2"></div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Workshop Incharge Sign</div>
                        <div className="text-[10px] text-slate-500">Workshop Verification</div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-between p-2.5 border border-slate-200 rounded-lg bg-slate-50 min-h-[90px]">
                      <div className="w-full border-b border-dashed border-slate-400 mt-6 mb-2"></div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Mechanical Sign</div>
                        <div className="text-[10px] text-slate-500">Technical Inspection</div>
                      </div>
                    </div>

                    <div className="flex flex-col items-center justify-between p-2.5 border border-slate-200 rounded-lg bg-slate-50 min-h-[90px]">
                      <div className="w-full border-b border-dashed border-slate-400 mt-6 mb-2"></div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Authority Sign</div>
                        <div className="text-[10px] text-slate-500">Final Commercial Approval</div>
                      </div>
                    </div>
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

      {/* Dedicated Single-Page Official Purchase Order Print Document */}
      {mounted && order && createPortal(
        <OfficialPOPrintDocument order={order} />,
        document.body
      )}
    </>
  );
}

function OfficialPOPrintDocument({ order }: { order: PurchaseOrder }) {
  const totalQty = order.items?.reduce((sum, it) => sum + (it.qty || 0), 0) || 1;

  return (
    <div id="po-official-print-portal" className="hidden print:block text-black bg-white font-sans p-6 w-full max-w-[210mm] mx-auto">
      {/* 1. Official Header */}
      <div className="flex items-start justify-between border-b-2 border-black pb-2.5 mb-2.5">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 bg-blue-900 text-white rounded flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
            UW
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-black uppercase leading-tight">
              UPTOWARE FLEET MANAGEMENT
            </h1>
            <p className="text-[10px] font-bold text-slate-800 tracking-wide uppercase">
              JBR Eastern Pvt Ltd · Mining Haulage & Heavy Logistics Division
            </p>
            <p className="text-[9px] text-slate-600 mt-0.5">
              Talcher Mining Operations, Angul, Odisha · GSTIN: 21AABCJ1234F1Z5
            </p>
          </div>
        </div>

        <div className="text-right">
          <span className="inline-block px-2.5 py-0.5 bg-black text-white text-[10px] font-black uppercase tracking-wider rounded-xs mb-1">
            OFFICIAL PURCHASE ORDER
          </span>
          <div className="font-mono font-bold text-xs text-black">
            PO NO: <span className="text-blue-900">{order.name}</span>
          </div>
          <div className="text-[10px] text-slate-700">
            Date: <span className="font-semibold">{order.transactionDate}</span>
            {order.scheduleDate && (
              <> · Due: <span className="font-semibold">{order.scheduleDate}</span></>
            )}
          </div>
          <div className="text-[10px] font-bold text-emerald-800 uppercase mt-0.5">
            Status: {order.status}
          </div>
        </div>
      </div>

      {/* 2. Order Metadata & Allocation (2-Column Grid) */}
      <div className="grid grid-cols-2 gap-3 mb-2.5 text-[10px]">
        {/* Left: Supplier Information */}
        <div className="border border-black rounded p-2 bg-slate-50/50">
          <div className="font-bold text-[9px] text-slate-700 uppercase tracking-wider border-b border-slate-300 pb-0.5 mb-1">
            SUPPLIER / VENDOR DETAILS
          </div>
          <div className="space-y-0.5">
            <div>
              <span className="text-slate-600">Supplier Name: </span>
              <span className="font-bold text-black text-[11px]">{order.supplier}</span>
            </div>
            <div>
              <span className="text-slate-600">Procurement Type: </span>
              <span className="font-semibold text-slate-800">{order.procurementType || 'Spare Parts Replenishment'}</span>
            </div>
            <div>
              <span className="text-slate-600">Payment Terms: </span>
              <span className="font-medium text-slate-700">Commercial Credit (30 Days)</span>
            </div>
          </div>
        </div>

        {/* Right: Fleet & Site Attribution */}
        <div className="border border-black rounded p-2 bg-slate-50/50">
          <div className="font-bold text-[9px] text-slate-700 uppercase tracking-wider border-b border-slate-300 pb-0.5 mb-1">
            FLEET ALLOCATION & DELIVERY SITE
          </div>
          <div className="space-y-0.5">
            <div>
              <span className="text-slate-600">Allocated Vehicle: </span>
              <span className="font-bold text-black font-mono">
                {order.vehicle ? formatVehicleDisplay(order.vehicle, undefined, { includeModel: true }) : 'General Inventory / Fleet Spares'}
              </span>
            </div>
            <div>
              <span className="text-slate-600">Delivery Destination: </span>
              <span className="font-semibold text-slate-800">{order.mineSite ? formatMineSiteDisplay(order.mineSite) : 'JBR Eastern — Central Stores'}</span>
            </div>
            <div>
              <span className="text-slate-600">Maintenance Purpose: </span>
              <span className="font-medium text-slate-700">{order.vehicleBreakdown ? 'Breakdown Emergency Service' : 'Scheduled Maintenance Stock'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Purchased Items Table */}
      <div className="mb-2.5">
        <table className="w-full text-left text-[10px] border-collapse border border-black">
          <thead>
            <tr className="bg-slate-100 border-b border-black text-[9px] font-bold text-black uppercase tracking-wider">
              <th className="py-1 px-2 border-r border-black w-8 text-center">#</th>
              <th className="py-1 px-2 border-r border-black">Part Description & Specification</th>
              <th className="py-1 px-2 border-r border-black w-32">Warehouse</th>
              <th className="py-1 px-2 border-r border-black w-20 text-right">Qty</th>
              <th className="py-1 px-2 border-r border-black w-24 text-right">Unit Rate (₹)</th>
              <th className="py-1 px-2 w-28 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {order.items && order.items.length > 0 ? (
              order.items.map((it, idx) => (
                <tr key={idx} className="border-b border-slate-300">
                  <td className="py-1.5 px-2 border-r border-black text-center font-mono text-slate-700">{idx + 1}</td>
                  <td className="py-1.5 px-2 border-r border-black">
                    <div className="font-bold text-black text-[10.5px]">{it.itemName}</div>
                    <div className="text-[9px] font-mono text-slate-600">Part Code: {it.itemCode}</div>
                  </td>
                  <td className="py-1.5 px-2 border-r border-black text-slate-700">
                    {it.warehouse || 'Central Stores'}
                  </td>
                  <td className="py-1.5 px-2 border-r border-black text-right font-mono font-bold text-black">
                    {it.qty} {it.uom || 'Nos'}
                  </td>
                  <td className="py-1.5 px-2 border-r border-black text-right font-mono text-slate-800">
                    ₹{it.rate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-1.5 px-2 text-right font-mono font-bold text-black">
                    ₹{it.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-2 text-center text-slate-500">No items specified.</td>
              </tr>
            )}
          </tbody>
          <tfoot className="border-t-2 border-black bg-slate-50 font-bold text-[10px]">
            <tr>
              <td colSpan={3} className="py-1.5 px-2 border-r border-black text-right uppercase tracking-wider text-slate-900">
                Grand Total ({order.items?.length || 0} Items):
              </td>
              <td className="py-1.5 px-2 border-r border-black text-right font-mono font-black text-black">
                {totalQty}
              </td>
              <td className="py-1.5 px-2 border-r border-black text-right font-mono text-slate-400">
                —
              </td>
              <td className="py-1.5 px-2 text-right font-mono font-black text-black text-xs">
                ₹{order.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 4. Commercial Terms */}
      <div className="border border-black rounded p-2 mb-2.5 bg-slate-50/30 text-[9px] text-slate-700">
        <div className="font-bold text-slate-900 uppercase tracking-wider mb-0.5">Commercial & Quality Verification Terms:</div>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Supplied items must be delivered with an original Commercial Tax Invoice and verified Delivery Challan referencing this PO number.</li>
          <li>All components are subject to mechanical quality inspection and acceptance prior to final payment clearance.</li>
        </ol>
      </div>

      {/* 5. Mandatory Verification & Authorization Signatures */}
      <div className="border border-black rounded p-2">
        <div className="text-[9px] font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-center">
          MANDATORY VERIFICATION & COMMERCIAL AUTHORIZATION SIGNATURES
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          {/* Sign 1 */}
          <div className="border border-slate-300 rounded p-1.5 bg-slate-50/50 flex flex-col justify-between h-16">
            <div className="text-[9px] font-bold text-slate-800">Workshop Incharge</div>
            <div>
              <div className="border-b border-dashed border-slate-500 w-3/4 mx-auto mb-1"></div>
              <div className="text-[8px] text-slate-500">Verification of Spares</div>
              <div className="text-[7.5px] text-slate-400">Date: _______________</div>
            </div>
          </div>

          {/* Sign 2 */}
          <div className="border border-slate-300 rounded p-1.5 bg-slate-50/50 flex flex-col justify-between h-16">
            <div className="text-[9px] font-bold text-slate-800">Mechanical / Technical</div>
            <div>
              <div className="border-b border-dashed border-slate-500 w-3/4 mx-auto mb-1"></div>
              <div className="text-[8px] text-slate-500">Technical Quality Inspection</div>
              <div className="text-[7.5px] text-slate-400">Date: _______________</div>
            </div>
          </div>

          {/* Sign 3 */}
          <div className="border border-slate-300 rounded p-1.5 bg-slate-50/50 flex flex-col justify-between h-16">
            <div className="text-[9px] font-bold text-slate-800">Authorized Commercial Sign</div>
            <div>
              <div className="border-b border-dashed border-slate-500 w-3/4 mx-auto mb-1"></div>
              <div className="text-[8px] text-slate-500">
                {order.approvedBy ? `Approved by ${order.approvedBy.split('@')[0]}` : 'Final Commercial Approval'}
              </div>
              <div className="text-[7.5px] text-slate-400">Date: {order.approvedOn || '_______________'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

