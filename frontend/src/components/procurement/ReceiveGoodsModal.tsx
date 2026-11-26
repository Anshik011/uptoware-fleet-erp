'use client';

import React, { useState, useEffect } from 'react';
import { PurchaseOrder } from '@/types/fleet';
import { Button } from '@/components/ui/Button';
import {
  PackageCheck,
  X,
  AlertCircle,
  Camera,
  Upload,
  CheckCircle2,
  Video,
  Eye,
  Loader2,
  FileCheck,
  Trash2,
} from 'lucide-react';

interface ReceiveGoodsModalProps {
  isOpen: boolean;
  order: PurchaseOrder | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface EditableReceiptItem {
  itemCode: string;
  itemName: string;
  qty: number | '';
  rate: number | '';
  amount: number;
  uom: string;
}

export function ReceiveGoodsModal({
  isOpen,
  order,
  onClose,
  onSuccess,
}: ReceiveGoodsModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable items state
  const [items, setItems] = useState<EditableReceiptItem[]>([]);

  // Mandatory Media upload state
  const [evidenceMediaUrl, setEvidenceMediaUrl] = useState('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (order && order.items) {
      setItems(
        order.items.map((i) => ({
          itemCode: i.itemCode,
          itemName: i.itemName,
          qty: i.qty || 1,
          rate: i.rate || 0,
          amount: (i.qty || 1) * (i.rate || 0),
          uom: i.uom || 'Nos',
        }))
      );
    } else {
      setItems([]);
    }
    setEvidenceMediaUrl('');
    setMediaUploadError(null);
    setError(null);
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const totalQuantity = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const totalAmount = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const primaryWarehouse = order.items?.[0]?.warehouse || 'Stores - U';

  const handleQtyChange = (idx: number, val: string) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const parsed = val === '' ? '' : Math.max(0, parseFloat(val) || 0);
        const qtyNum = typeof parsed === 'number' ? parsed : 0;
        const rateNum = typeof item.rate === 'number' ? item.rate : 0;
        return {
          ...item,
          qty: parsed,
          amount: qtyNum * rateNum,
        };
      })
    );
  };

  const handleRateChange = (idx: number, val: string) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const parsed = val === '' ? '' : Math.max(0, parseFloat(val) || 0);
        const rateNum = typeof parsed === 'number' ? parsed : 0;
        const qtyNum = typeof item.qty === 'number' ? item.qty : 0;
        return {
          ...item,
          rate: parsed,
          amount: qtyNum * rateNum,
        };
      })
    );
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaUploadError(null);
    setIsUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data?.fileUrl) {
        throw new Error(json.error || 'Failed to upload photo or video file.');
      }
      setEvidenceMediaUrl(json.data.fileUrl);
    } catch (err: any) {
      setMediaUploadError(err.message || 'Error uploading verification media.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  async function handleConfirmReceipt() {
    if (!order) return;
    setError(null);

    // Validation 1: Photo/Video Proof is MANDATORY
    if (!evidenceMediaUrl) {
      setError('Parts receipt verification proof (Photo/Video upload) is mandatory.');
      return;
    }

    // Validation 2: Quantities & Rates must be valid
    for (const item of items) {
      if (item.qty === '' || Number(item.qty) <= 0) {
        setError(`Please enter a valid quantity for item ${item.itemName} (${item.itemCode}).`);
        return;
      }
      if (item.rate === '' || Number(item.rate) < 0) {
        setError(`Please enter a valid rate for item ${item.itemName} (${item.itemCode}).`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/procurement/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchaseOrder: order.name,
          evidenceMediaUrl,
          items: items.map((i) => ({
            itemCode: i.itemCode,
            qty: Number(i.qty),
            rate: Number(i.rate),
          })),
        }),
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto"
      data-testid="modal-receive-goods"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 my-8">
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
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Operational Context Card */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs">
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
              <span className="text-slate-500 block mb-0.5">Total Quantity</span>
              <span className="font-semibold text-slate-900">
                {totalQuantity} Units
              </span>
            </div>
            <div>
              <span className="text-slate-500 block mb-0.5">Total Bill Amount</span>
              <span className="font-semibold text-emerald-700 font-mono">
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Items Summary Table - Editable Qty & Rate */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Editable Inward Items (Verify / Adjust Qnt & Rate)
              </label>
              <span className="text-[11px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                Adjust as per actual received bill
              </span>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-slate-50 text-slate-600 font-medium">
                  <tr>
                    <th className="py-2.5 px-3 text-left">Item Code & Name</th>
                    <th className="py-2.5 px-3 text-right w-28">Received Qty</th>
                    <th className="py-2.5 px-3 text-right w-28">Unit Rate (₹)</th>
                    <th className="py-2.5 px-3 text-right w-28">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60">
                      <td className="py-2 px-3">
                        <div className="font-medium text-slate-900">{item.itemName}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{item.itemCode} ({item.uom})</div>
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={item.qty}
                          onChange={(e) => handleQtyChange(idx, e.target.value)}
                          className="w-24 text-right px-2 py-1 text-xs border border-slate-300 rounded font-bold font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </td>
                      <td className="py-2 px-3 text-right">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.rate}
                          onChange={(e) => handleRateChange(idx, e.target.value)}
                          className="w-24 text-right px-2 py-1 text-xs border border-slate-300 rounded font-bold font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-slate-900 font-mono">
                        ₹{(item.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mandatory Photo / Video Upload Section */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-300 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wide">
                <Camera className="w-4 h-4 text-emerald-700" />
                Goods Received Proof (Photo / Video) <span className="text-rose-600">* Mandatory</span>
              </label>
              {evidenceMediaUrl ? (
                <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Media Verified
                </span>
              ) : (
                <span className="text-[11px] text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Proof Required
                </span>
              )}
            </div>

            {mediaUploadError && (
              <p className="text-xs text-rose-600 font-medium">{mediaUploadError}</p>
            )}

            {evidenceMediaUrl ? (
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                <div className="w-12 h-12 rounded bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  {evidenceMediaUrl.match(/\.(mp4|webm|mov)$/i) ? (
                    <Video className="w-6 h-6 text-slate-600" />
                  ) : (
                    <img
                      src={evidenceMediaUrl}
                      alt="Received goods proof"
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">
                    {evidenceMediaUrl.split('/').pop()}
                  </p>
                  <a
                    href={evidenceMediaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-0.5"
                  >
                    <Eye className="w-3 h-3" /> View Uploaded Proof
                  </a>
                </div>
                <button
                  type="button"
                  onClick={() => setEvidenceMediaUrl('')}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                  title="Remove media"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-xl p-4 cursor-pointer transition-all ${
                  isUploadingMedia
                    ? 'border-blue-400 bg-blue-50/50'
                    : 'border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/20 bg-white'
                }`}
              >
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleMediaUpload}
                  disabled={isUploadingMedia}
                  className="hidden"
                />
                {isUploadingMedia ? (
                  <div className="flex items-center gap-2 text-xs text-blue-700 font-medium">
                    <Loader2 className="w-4 h-4 animate-spin" /> Uploading received parts media...
                  </div>
                ) : (
                  <div className="text-center space-y-1">
                    <div className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 mb-0.5">
                      <Upload className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-semibold text-slate-800">
                      Click to upload received parts photo or video
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Supports JPG, PNG, MP4, WEBM (Mandatory verification proof)
                    </p>
                  </div>
                )}
              </label>
            )}
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
            disabled={isSubmitting || !evidenceMediaUrl}
            data-testid="btn-confirm-receipt"
            className="bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
          >
            {isSubmitting ? 'Inwarding Goods...' : 'Confirm Goods Receipt'}
          </Button>
        </div>
      </div>
    </div>
  );
}
