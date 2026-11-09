'use client';

import React, { useState } from 'react';
import { MiningTrip } from '@/types/fleet';
import {
  X,
  Scale,
  CheckCircle2,
  XCircle,
  Compass,
  AlertTriangle,
  Gauge,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface TripWorkflowModalProps {
  isOpen: boolean;
  onClose: () => void;
  trip: MiningTrip | null;
  action: string | null;
  onSuccess: (updatedTrip: MiningTrip) => void;
}

export function TripWorkflowModal({
  isOpen,
  onClose,
  trip,
  action,
  onSuccess,
}: TripWorkflowModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Weighbridge fields
  const [grossWeight, setGrossWeight] = useState<number | ''>(
    trip?.grossWeightTons || ''
  );
  const [tareWeight, setTareWeight] = useState<number | ''>(
    trip?.tareWeightTons || ''
  );

  // Delivery fields
  const [closingOdo, setClosingOdo] = useState<number | ''>(
    trip?.closingOdometer || ''
  );
  const [returnDateTime, setReturnDateTime] = useState('');

  // Cancellation fields
  const [cancellationReason, setCancellationReason] = useState('');

  if (!isOpen || !trip || !action) return null;

  const calculatedNet =
    typeof grossWeight === 'number' &&
    typeof tareWeight === 'number' &&
    grossWeight >= tareWeight
      ? Number((grossWeight - tareWeight).toFixed(3))
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const payload: any = { action };

    if (action === 'Confirm Weighbridge') {
      if (grossWeight === '' || tareWeight === '') {
        setError('Both gross weight and tare weight readings are required.');
        return;
      }
      if (Number(grossWeight) <= 0 || Number(tareWeight) <= 0) {
        setError('Weight readings must be greater than zero.');
        return;
      }
      if (Number(grossWeight) < Number(tareWeight)) {
        setError('Gross weight cannot be less than tare weight.');
        return;
      }
      payload.grossWeightTons = Number(grossWeight);
      payload.tareWeightTons = Number(tareWeight);
    } else if (action === 'Mark Delivered') {
      if (closingOdo === '' || Number(closingOdo) <= 0) {
        setError('A valid closing odometer reading is required to complete delivery.');
        return;
      }
      if (
        trip.openingOdometer != null &&
        Number(closingOdo) < trip.openingOdometer
      ) {
        setError(
          `Closing odometer (${closingOdo} km) cannot be less than opening odometer (${trip.openingOdometer} km).`
        );
        return;
      }
      payload.closingOdometer = Number(closingOdo);
      if (returnDateTime) {
        payload.returnDateTime = returnDateTime.replace('T', ' ') + ':00';
      }
    } else if (action === 'Cancel') {
      if (!cancellationReason.trim()) {
        setError('A cancellation reason is strictly required.');
        return;
      }
      payload.cancellationReason = cancellationReason.trim();
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/trips/${encodeURIComponent(trip.id)}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      onSuccess(data.data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to execute workflow transition.');
    } finally {
      setSubmitting(false);
    }
  };

  const getModalTitle = () => {
    switch (action) {
      case 'Confirm Weighbridge':
        return 'Weighbridge Confirmation';
      case 'Approve':
        return 'Approve Mining Trip';
      case 'Mark Delivered':
        return 'Mark Trip Delivered';
      case 'Cancel':
        return 'Cancel Mining Trip';
      case 'Dispatch':
        return 'Dispatch Mining Trip';
      default:
        return `Execute Action: ${action}`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/75 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-900 text-white flex items-center justify-center shrink-0">
              {action === 'Confirm Weighbridge' ? (
                <Scale className="w-5 h-5" />
              ) : action === 'Cancel' ? (
                <XCircle className="w-5 h-5 text-rose-300" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">{getModalTitle()}</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Trip: <strong className="text-slate-700">{trip.id}</strong> &bull; Vehicle: {trip.vehicle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-semibold">Workflow Action Failed</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Action: Confirm Weighbridge */}
          {action === 'Confirm Weighbridge' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Enter weighbridge scale ticket measurements. The system calculates net payload weight automatically.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Gross Weight (Tons) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="e.g. 35.500"
                    value={grossWeight}
                    onChange={(e) =>
                      setGrossWeight(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Vehicle + Payload</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tare Weight (Tons) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    placeholder="e.g. 12.200"
                    value={tareWeight}
                    onChange={(e) =>
                      setTareWeight(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Empty Vehicle Weight</span>
                </div>
              </div>

              {/* Calculated Net Weight Preview */}
              <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-900 block">Calculated Net Haulage Weight</span>
                  <span className="text-[11px] text-blue-700">Gross Weight - Tare Weight</span>
                </div>
                <div className="text-right">
                  <span className="text-lg font-extrabold text-blue-900">
                    {calculatedNet > 0 ? `${calculatedNet.toFixed(3)} T` : '—'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Action: Mark Delivered */}
          {action === 'Mark Delivered' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-600">
                Confirm haulage delivery and update final closing odometer reading. Vehicle status will revert to Active.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Closing Odometer (km) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 62280"
                  value={closingOdo}
                  onChange={(e) =>
                    setClosingOdo(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                />
                {trip.openingOdometer != null && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Opening odometer: <strong>{trip.openingOdometer.toLocaleString()} km</strong>
                    {typeof closingOdo === 'number' && closingOdo >= trip.openingOdometer && (
                      <span className="text-emerald-700 ml-2 font-medium">
                        (+{(closingOdo - trip.openingOdometer).toLocaleString()} km hauled)
                      </span>
                    )}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Return Timestamp
                </label>
                <input
                  type="datetime-local"
                  value={returnDateTime}
                  onChange={(e) => setReturnDateTime(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Defaults to current time if left empty</span>
              </div>
            </div>
          )}

          {/* Action: Cancel */}
          {action === 'Cancel' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <p>
                  Cancelling this trip will unlock the assigned vehicle and driver, restoring the vehicle status to Active. This action cannot be reversed.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mandatory Cancellation Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail why this haulage trip is being cancelled..."
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          )}

          {/* Action: Approve */}
          {action === 'Approve' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                You are about to approve Mining Trip <strong className="text-slate-900">{trip.id}</strong>.
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                <p>Net Hauled Weight: <strong className="text-slate-900">{trip.netWeightTons.toFixed(3)} T</strong></p>
                <p>Estimated Commercial Value (Indicative): <strong className="text-slate-800">₹{trip.grossRevenue.toLocaleString('en-IN')}</strong></p>
                <p className="text-[11px] text-slate-400 pt-1">
                  Note: Server security rules strictly prohibit approving your own trips. Independent authorization required.
                </p>
              </div>
            </div>
          )}

          {/* Action: Dispatch */}
          {action === 'Dispatch' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-600">
                Dispatch vehicle <strong className="text-slate-900">{trip.vehicle}</strong> driven by{' '}
                <strong className="text-slate-900">{trip.driverName || trip.driver}</strong> from pit{' '}
                <strong className="text-slate-900">{trip.mineSite}</strong> to{' '}
                <strong className="text-slate-900">{trip.destination}</strong>?
              </p>
              <p className="text-xs text-slate-500">
                Vehicle status will transition to <strong>On Trip</strong>.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button type="button" onClick={onClose} variant="outline" size="sm">
              Cancel
            </Button>
            <Button
              type="submit"
              variant={action === 'Cancel' ? 'danger' : 'primary'}
              size="sm"
              isLoading={submitting}
            >
              Confirm {action}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

