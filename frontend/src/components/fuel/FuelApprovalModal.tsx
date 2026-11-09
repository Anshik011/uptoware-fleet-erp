'use client';

import React, { useState } from 'react';
import { FuelLog } from '@/types/fleet';
import { Button } from '@/components/ui/Button';
import { CheckCircle2, XCircle, RotateCcw, AlertCircle, X, Fuel, Truck } from 'lucide-react';

interface FuelApprovalModalProps {
  isOpen: boolean;
  log: FuelLog | null;
  action: 'Approve' | 'Reject' | 'Re-open' | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function FuelApprovalModal({
  isOpen,
  log,
  action,
  onClose,
  onSuccess,
}: FuelApprovalModalProps) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !log || !action) return null;

  const isReject = action === 'Reject';
  const isApprove = action === 'Approve';
  const isReopen = action === 'Re-open';

  async function handleConfirm() {
    setError(null);
    if (isReject && (!rejectionReason || !rejectionReason.trim())) {
      setError('A rejection reason is strictly mandatory when rejecting a fuel log.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/fuel/${encodeURIComponent(log!.id)}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          rejectionReason: isReject ? rejectionReason.trim() : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Failed to execute ${action} on fuel log.`);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Workflow transition failed.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isApprove
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : isReject
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : 'bg-blue-50 text-blue-900 border border-blue-200'
              }`}
            >
              {isApprove && <CheckCircle2 className="w-5 h-5" />}
              {isReject && <XCircle className="w-5 h-5" />}
              {isReopen && <RotateCcw className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isApprove && 'Authorize & Approve Fuel Log'}
                {isReject && 'Reject Fuel Dispensation Entry'}
                {isReopen && 'Re-open Fuel Log to Draft'}
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {log.id} · {log.vehicle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Log Brief */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" /> Vehicle
              </span>
              <span className="font-semibold text-slate-900 font-mono">
                {log.vehicle}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                <Fuel className="w-3.5 h-3.5" /> Quantity / Source
              </span>
              <span className="font-semibold text-slate-900">
                {log.quantityLitres} L ({log.fuelSource})
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Odometer Reading</span>
              <span className="font-semibold text-slate-900 font-mono">
                {log.odometerReading.toLocaleString('en-IN')} KM
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5">Total Fuel Cost</span>
              <span className="font-bold text-slate-900 font-mono">
                ₹{log.totalCost.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {isApprove && (
            <p className="text-xs text-slate-600">
              Approving this fuel log will update the vehicle&apos;s confirmed odometer benchmark and include this refuel in authoritative fleet efficiency calculations.
            </p>
          )}

          {isReject && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Rejection Reason *
              </label>
              <textarea
                rows={3}
                placeholder="State the discrepancy or operational reason for rejecting this fuel slip..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                data-testid="input-fuel-rejection-reason"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-600 focus:border-rose-600 shadow-xs"
                required
              />
            </div>
          )}

          {isReopen && (
            <p className="text-xs text-slate-600">
              Reopening will return this fuel log to Draft state, clearing rejection notes and enabling corrections.
            </p>
          )}

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={isReject ? 'danger' : 'primary'}
              size="md"
              isLoading={isSubmitting}
              onClick={handleConfirm}
              data-testid="btn-confirm-fuel-transition"
            >
              {isApprove && 'Confirm Approval'}
              {isReject && 'Reject Entry'}
              {isReopen && 'Re-open Log'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

