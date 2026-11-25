'use client';

import React, { useState } from 'react';
import { PurchaseOrder } from '@/types/fleet';
import { Button } from '@/components/ui/Button';
import {
  PackageCheck,
  X,
  AlertCircle,
  Truck,
  Building2,
  Calendar,
  Layers,
  ArrowRight,
  Info,
  Lock,
} from 'lucide-react';

interface ReceiveGoodsModalProps {
  isOpen: boolean;
  order: PurchaseOrder | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReceiveGoodsModal({
  isOpen,
  order,
  onClose,
  onSuccess,
}: ReceiveGoodsModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const totalQuantity = (order.items || []).reduce((sum, item) => sum + (item.qty || 0), 0);
  const primaryWarehouse = order.items?.[0]?.warehouse || 'Stores - U';

  async function handleConfirmReceipt() {
    if (!order) return;
    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/procurement/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purchaseOrder: order.name }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate Purchase Receipt.');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error generating Purchase Receipt.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      data-testid="modal-receive-goods"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-800">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Confirm Goods & Bill Receipt (Purchase Receipt)
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                Order: {order.name} • {order.supplier}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Operational Context Card */}
          <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <div>
              <span className="text-slate-500 block mb-0.5">Supplier</span>
              <span className="font-semibold text-slate-900 truncate block">
                {order.supplierName || order.supplier}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Target Warehouse</span>
              <span className="font-semibold text-slate-900 font-mono block">
                {primaryWarehouse}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Total Line Items</span>
              <span className="font-semibold text-slate-900">
                {order.items?.length || 0} line(s) ({totalQuantity} Units)
              </span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Order Status</span>
              <span className="font-semibold text-emerald-700">
                {order.status}
              </span>
            </div>
          </div>

          {/* Commercial Lock Notice */}
          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg flex items-start gap-2.5 text-xs text-blue-900">
            <Lock className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Commercial Integrity & Read-Only Bill Quantities</p>
              <p className="text-blue-800 text-[11px] leading-relaxed">
                Line item quantities and unit rates are strictly locked and synchronized from Approved Purchase Order <span className="font-mono font-bold">{order.name}</span>. Quantity and rate modifications are permanently disabled during bill receipt.
              </p>
            </div>
          </div>

          {/* Items Summary Table */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Items to Inward into Inventory
              </label>
              <span className="text-[10px] font-medium text-slate-500 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                Quantities & Rates Locked
              </span>
            </div>
            <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-medium">
                  <tr>
                    <th className="py-2 px-3 text-left">Item Code & Name</th>
                    <th className="py-2 px-3 text-right">
                      <span className="inline-flex items-center gap-1">
                        Qty <Lock className="w-2.5 h-2.5 text-slate-400" />
                      </span>
                    </th>
                    <th className="py-2 px-3 text-right">
                      <span className="inline-flex items-center gap-1">
                        Rate <Lock className="w-2.5 h-2.5 text-slate-400" />
                      </span>
                    </th>
                    <th className="py-2 px-3 text-right">
                      <span className="inline-flex items-center gap-1">
                        Amount <Lock className="w-2.5 h-2.5 text-slate-400" />
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(order.items || []).map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3">
                        <div className="font-medium text-slate-900">{item.itemName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{item.itemCode}</div>
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-slate-900 font-mono bg-slate-50/30">
                        {item.qty} {item.uom || 'Nos'}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-700 font-mono bg-slate-50/30">
                        ₹{(item.rate || 0).toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-medium text-slate-900 font-mono">
                        ₹{(item.amount || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Operational Impact Notice */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-900">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold mb-0.5">Operational Stock Impact</p>
              <p className="text-amber-800 text-[11px] leading-relaxed">
                Confirming will create and submit an official Purchase Receipt, increment physical stock balances in warehouse <span className="font-mono font-medium">{primaryWarehouse}</span>, and update this Purchase Order’s receipt percentage to 100%.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            icon={PackageCheck}
            onClick={handleConfirmReceipt}
            disabled={isSubmitting}
            data-testid="btn-confirm-receipt"
            className="bg-emerald-700 hover:bg-emerald-800 text-white"
          >
            {isSubmitting ? 'Inwarding Goods...' : 'Confirm Goods Receipt'}
          </Button>
        </div>
      </div>
    </div>
  );
}

