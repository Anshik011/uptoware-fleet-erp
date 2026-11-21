'use client';

import React, { useState, useEffect } from 'react';
import { MiningTrip } from '@/types/fleet';
import {
  X,
  Scale,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldAlert,
  Truck,
  Gauge,
  MapPin,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import {
  formatVehicleDisplay,
  formatDriverDisplay,
  formatMineSiteDisplay,
} from '@/lib/displayFormatters';
import { toLocalDateTimeInput } from '@/lib/datetime';

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
  const [confirmHighPayload, setConfirmHighPayload] = useState(false);
  const [isWeightOverridden, setIsWeightOverridden] = useState(
    Boolean(trip?.isWeightOverridden)
  );
  const [weightOverrideReason, setWeightOverrideReason] = useState(
    trip?.weightOverrideReason || ''
  );

  // Delivery fields
  const [closingOdo, setClosingOdo] = useState<number | ''>(
    trip?.closingOdometer && trip.closingOdometer > 0 ? trip.closingOdometer : ''
  );
  const [returnDateTime, setReturnDateTime] = useState('');

  // Cancellation fields
  const [cancellationReason, setCancellationReason] = useState('');

  useEffect(() => {
    if (trip && isOpen) {
      setGrossWeight(trip.grossWeightTons || '');
      setTareWeight(trip.tareWeightTons || '');
      setIsWeightOverridden(Boolean(trip.isWeightOverridden));
      setWeightOverrideReason(trip.weightOverrideReason || '');
      setClosingOdo(
        trip.closingOdometer && trip.closingOdometer > 0 ? trip.closingOdometer : ''
      );
      setReturnDateTime(toLocalDateTimeInput());
      setCancellationReason('');
      setConfirmHighPayload(false);
      setError(null);
    }
  }, [isOpen, trip, action]);

  if (!isOpen || !trip || !action) return null;

  const calculatedNet =
    typeof grossWeight === 'number' &&
    typeof tareWeight === 'number' &&
    grossWeight >= tareWeight
      ? Number((grossWeight - tareWeight).toFixed(3))
      : 0;

  // Vehicle payload capacity and tolerance thresholds
  const ratedCapacity = trip.payloadCapacityTons || trip.averageTonnage || 35.0;
  const warningThreshold = Math.round(ratedCapacity * 1.15 * 100) / 100;
  const maxOverrideThreshold = Math.round(ratedCapacity * 1.50 * 100) / 100;

  const isCapacityWarning = calculatedNet > warningThreshold && calculatedNet <= maxOverrideThreshold;
  const isExtremeOverload = calculatedNet > maxOverrideThreshold;

  const handleConvertKgToMt = () => {
    if (typeof grossWeight === 'number' && grossWeight > 100) {
      setGrossWeight(Number((grossWeight / 1000).toFixed(3)));
    }
    if (typeof tareWeight === 'number' && tareWeight > 100) {
      setTareWeight(Number((tareWeight / 1000).toFixed(3)));
    }
  };

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
      if (isCapacityWarning && !confirmHighPayload && !isWeightOverridden) {
        setError('Please verify the high net payload warning by confirming the checkbox.');
        return;
      }
      if (isExtremeOverload) {
        if (!isWeightOverridden) {
          setError(
            `Net payload (${calculatedNet.toFixed(3)} MT) exceeds maximum capacity threshold (${maxOverrideThreshold} MT). An authorized Manager Override is strictly required.`
          );
          return;
        }
        if (!weightOverrideReason.trim()) {
          setError('A documented reason is mandatory when authorizing an exceptional weighbridge weight override.');
          return;
        }
      }
      payload.grossWeightTons = Number(grossWeight);
      payload.tareWeightTons = Number(tareWeight);
      payload.isWeightOverridden = isWeightOverridden;
      if (isWeightOverridden) {
        payload.weightOverrideReason = weightOverrideReason.trim();
      }
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
      const formattedReturnTime = returnDateTime
        ? (returnDateTime.includes(':') && returnDateTime.split(':').length === 2 ? returnDateTime.replace('T', ' ') + ':00' : returnDateTime.replace('T', ' '))
        : new Date().toISOString().slice(0, 19).replace('T', ' ');
      payload.returnDateTime = formattedReturnTime;
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
        return 'Complete Trip Delivery (Stage 5)';
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
                Material: <strong className="text-slate-700">{trip.materialType || 'Bulk Mineral Cargo'}</strong> &bull; Vehicle: {formatVehicleDisplay(trip.vehicle)}
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
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  Enter weighbridge scale ticket measurements in <strong>Metric Tonnes (MT)</strong>.
                </p>
                <div className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                  Rated Payload: <strong className="text-slate-800">{ratedCapacity} MT</strong>
                </div>
              </div>

              {/* Helper Banner & Unit Notice */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <p className="font-semibold text-slate-800">Unit Notice: Metric Tonnes (MT)</p>
                  <p className="text-[11px] text-slate-500">
                    Do not enter kilograms. 25,000 kg must be entered as <strong>25.000 MT</strong>.
                  </p>
                </div>
                {((typeof grossWeight === 'number' && grossWeight > 100) || (typeof tareWeight === 'number' && tareWeight > 100)) && (
                  <button
                    type="button"
                    onClick={handleConvertKgToMt}
                    className="shrink-0 text-xs px-2.5 py-1 bg-blue-50 text-blue-700 font-semibold border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    Convert kg to MT (/ 1,000)
                  </button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Gross Weight (MT) <span className="text-rose-500">*</span>
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
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Vehicle + Payload (MT)</span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Tare Weight (MT) <span className="text-rose-500">*</span>
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
                  <span className="text-[10px] text-slate-400 mt-0.5 block">Empty Vehicle Weight (MT)</span>
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
                    {calculatedNet > 0 ? `${calculatedNet.toFixed(3)} MT` : '—'}
                  </span>
                </div>
              </div>

              {/* Capacity Warning Tier 1: Operating Tolerance Warning (> 15% above capacity) */}
              {isCapacityWarning && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2">
                  <div className="flex items-start gap-2 text-xs text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">High Net Payload Warning</p>
                      <p className="mt-0.5 text-[11px] text-amber-700">
                        Net weight ({calculatedNet.toFixed(3)} MT) exceeds vehicle rated capacity ({ratedCapacity} MT) by more than 15% (Threshold: {warningThreshold} MT). Please verify scale reading.
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 pt-1 text-xs text-amber-900 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmHighPayload}
                      onChange={(e) => setConfirmHighPayload(e.target.checked)}
                      className="rounded border-amber-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>I confirm this reading is in Metric Tonnes (MT) and verified against the weighbridge slip.</span>
                  </label>
                </div>
              )}

              {/* Capacity Warning Tier 2: Extreme Overload / Kilogram Entry (> 50% above capacity) */}
              {isExtremeOverload && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-3">
                  <div className="flex items-start gap-2 text-xs text-rose-800">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Exceptional Payload Alert (&gt;50% Above Rated Capacity)</p>
                      <p className="mt-0.5 text-[11px] text-rose-700 leading-relaxed">
                        Net payload ({calculatedNet.toFixed(3)} MT) substantially exceeds the vehicle safe payload capacity ({ratedCapacity} MT, max tolerance: {maxOverrideThreshold} MT).
                        If scale output was in kilograms (e.g. {(calculatedNet * 1000).toLocaleString()} kg), use the converter button above. Submitting requires an authorized Manager Override.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-rose-200/60 space-y-2">
                    <label className="flex items-center gap-2 text-xs font-semibold text-rose-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isWeightOverridden}
                        onChange={(e) => setIsWeightOverridden(e.target.checked)}
                        className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span>Authorize Exceptional Weight Override (Requires Fleet Manager / System Manager Role)</span>
                    </label>

                    {isWeightOverridden && (
                      <div className="space-y-1.5 pt-1">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Override Justification / Reason <span className="text-rose-500">*</span>
                        </label>
                        <textarea
                          rows={2}
                          value={weightOverrideReason}
                          onChange={(e) => setWeightOverrideReason(e.target.value)}
                          placeholder="e.g. Authorized exceptional dense ore batch verified by mine engineer..."
                          className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
                          required
                        />
                        <span className="text-[10px] text-slate-400 block">
                          Your user identity and timestamp will be permanently logged in the audit ledger.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action: Mark Delivered */}
          {action === 'Mark Delivered' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-blue-700" />
                  Stage 5: Delivery Completion & Vehicle Return
                </div>
                <p className="text-[11px] text-blue-800 leading-relaxed">
                  Confirm arrival of mineral haulage at destination. Submitting valid closing odometer updates vehicle registry and restores vehicle status to Active.
                </p>
              </div>

              {/* Haulage Route & Payload Summary */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-semibold text-slate-500">Haulage Route:</span>
                  <span className="font-medium text-slate-900 text-right">
                    {formatMineSiteDisplay(trip.mineSite, trip.mineSiteName)} &rarr; {trip.destination}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-700">
                  <span className="font-semibold text-slate-500">Delivered Net Payload:</span>
                  <span className="font-bold text-slate-900">
                    {trip.netWeightTons > 0 ? `${trip.netWeightTons.toFixed(3)} MT` : 'Pending Scale'} ({trip.materialType || 'Cargo'})
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-700 pt-1 border-t border-slate-200/60">
                  <span className="font-semibold text-slate-500">Dispatch Opening Odometer:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {trip.openingOdometer != null ? `${trip.openingOdometer.toLocaleString()} km` : '—'}
                  </span>
                </div>
                {trip.leadKm != null && trip.leadKm > 0 && (
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-semibold text-slate-500">Planned Lead Distance:</span>
                    <span className="text-[11px] text-blue-800 font-medium">
                      {trip.leadKm} km {trip.openingOdometer != null ? `(Expected closing: ~${(trip.openingOdometer + trip.leadKm).toLocaleString()} km)` : ''}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Closing Odometer (km) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder={trip.openingOdometer != null ? `e.g. ${trip.openingOdometer + (trip.leadKm || 25)}` : 'e.g. 62280'}
                  value={closingOdo}
                  onChange={(e) =>
                    setClosingOdo(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 font-mono"
                />
                {trip.openingOdometer != null && typeof closingOdo === 'number' && closingOdo >= trip.openingOdometer && (
                  <p className="text-[11px] text-emerald-700 font-medium mt-1">
                    ✓ +{(closingOdo - trip.openingOdometer).toLocaleString()} km distance recorded for this delivery run
                  </p>
                )}
                {trip.openingOdometer != null && typeof closingOdo === 'number' && closingOdo < trip.openingOdometer && (
                  <p className="text-[11px] text-rose-600 font-medium mt-1">
                    ⚠ Closing odometer cannot be less than opening odometer ({trip.openingOdometer.toLocaleString()} km)
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Return / Delivery Timestamp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={returnDateTime}
                  onChange={(e) => setReturnDateTime(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">Recorded timestamp for trip arrival and vehicle release</span>
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
                You are about to approve Mining Trip for vehicle <strong className="text-slate-900">{formatVehicleDisplay(trip.vehicle)}</strong> ({trip.materialType || 'Bulk Mineral Cargo'}).
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 space-y-1">
                <p>Net Hauled Weight: <strong className="text-slate-900">{trip.netWeightTons.toFixed(3)} MT</strong></p>
                <p>Estimated Commercial Value (Indicative): <strong className="text-slate-800">₹{trip.grossRevenue.toLocaleString('en-IN')}</strong></p>
                {trip.isWeightOverridden && (
                  <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] mt-2">
                    <span className="font-semibold block">⚠️ Authorized Exceptional Weight Override:</span>
                    <span>Reason: {trip.weightOverrideReason || 'Documented at weighment'} &bull; Authorized by: {trip.weightOverrideAuthorizedBy || 'Fleet Manager'}</span>
                  </div>
                )}
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
                Dispatch vehicle <strong className="text-slate-900">{formatVehicleDisplay(trip.vehicle)}</strong> driven by{' '}
                <strong className="text-slate-900">{formatDriverDisplay(trip.driver, trip.driverName)}</strong> from pit{' '}
                <strong className="text-slate-900">{formatMineSiteDisplay(trip.mineSite, trip.mineSiteName)}</strong> to{' '}
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
              {action === 'Mark Delivered' ? 'Confirm Delivery & Complete Trip' : `Confirm ${action}`}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
