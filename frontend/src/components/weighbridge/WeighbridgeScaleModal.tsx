'use client';

import React, { useState } from 'react';
import { MiningTrip } from '@/types/fleet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Scale, AlertCircle, X, CheckCircle, Truck, User, MapPin } from 'lucide-react';

interface WeighbridgeScaleModalProps {
  isOpen: boolean;
  trip: MiningTrip | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function WeighbridgeScaleModal({
  isOpen,
  trip,
  onClose,
  onSuccess,
}: WeighbridgeScaleModalProps) {
  const [grossWeight, setGrossWeight] = useState('');
  const [tareWeight, setTareWeight] = useState('');
  const [challanNumber, setChallanNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [prevTripId, setPrevTripId] = useState<string | null>(null);
  if (trip && trip.id !== prevTripId) {
    setPrevTripId(trip.id);
    setGrossWeight(trip.grossWeightTons ? String(trip.grossWeightTons) : '');
    setTareWeight(trip.tareWeightTons ? String(trip.tareWeightTons) : '');
    setChallanNumber(trip.challanNumber || '');
    setError(null);
  }

  if (!isOpen || !trip) return null;

  const gross = parseFloat(grossWeight);
  const tare = parseFloat(tareWeight);
  const isValidNumbers = !isNaN(gross) && !isNaN(tare) && gross > 0 && tare > 0;
  const isGrossLess = isValidNumbers && gross < tare;
  const netWeight = isValidNumbers && !isGrossLess ? Math.round((gross - tare) * 1000) / 1000 : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!isValidNumbers) {
      setError('Both gross weight and tare weight must be positive numeric values.');
      return;
    }

    if (isGrossLess) {
      setError(`Gross weight (${gross.toFixed(3)} T) cannot be less than tare weight (${tare.toFixed(3)} T).`);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/weighbridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: trip!.id,
          grossWeightTons: gross,
          tareWeightTons: tare,
          challanNumber: challanNumber.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to record weighbridge measurement.');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'An error occurred while confirming weighbridge scale.';
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
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-900">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Confirm Scale Weights & Slip
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                {trip.id} · {trip.materialType}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Close weighbridge modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Trip Summary Card */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5" /> Vehicle
              </span>
              <span className="font-semibold text-slate-900 font-mono">
                {trip.vehicle}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Driver
              </span>
              <span className="font-semibold text-slate-900">
                {trip.driverName || trip.driver}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block mb-0.5 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" /> Pit / Site
              </span>
              <span className="font-semibold text-slate-900">
                {trip.mineSiteName || trip.mineSite}
              </span>
            </div>
          </div>

          {/* Scale Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Gross Weight (Tons) *"
              type="number"
              step="0.001"
              min="0.001"
              placeholder="e.g. 38.500"
              value={grossWeight}
              onChange={(e) => setGrossWeight(e.target.value)}
              data-testid="input-gross-weight"
              required
            />
            <Input
              label="Tare Weight (Tons) *"
              type="number"
              step="0.001"
              min="0.001"
              placeholder="e.g. 14.200"
              value={tareWeight}
              onChange={(e) => setTareWeight(e.target.value)}
              data-testid="input-tare-weight"
              required
            />
          </div>

          {/* Dynamic Net Weight Card */}
          <div
            className={`p-4 rounded-xl border transition-colors ${isGrossLess
                ? 'bg-rose-50 border-rose-200 text-rose-900'
                : netWeight != null
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider block">
                  Calculated Net Payload Weight
                </span>
                <span className="text-xs text-slate-500">
                  {isGrossLess
                    ? 'Gross weight is less than Tare weight — invalid scale reading.'
                    : 'Net Tonnage = Gross Weight - Tare Weight'}
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold font-mono tracking-tight block">
                  {isGrossLess
                    ? 'ERR: NEGATIVE'
                    : netWeight != null
                      ? `${netWeight.toFixed(3)} T`
                      : '—'}
                </span>
                {netWeight != null && !isGrossLess && (
                  <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 justify-end">
                    <CheckCircle className="w-3 h-3" /> Ready for confirmation
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Challan / Slip Number */}
          <Input
            label="Weighbridge Slip / Challan Number"
            type="text"
            placeholder="e.g. WB-2026-88092"
            value={challanNumber}
            onChange={(e) => setChallanNumber(e.target.value)}
            data-testid="input-challan-number"
          />

          {/* Form Actions */}
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
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              disabled={isSubmitting || !isValidNumbers || isGrossLess}
              data-testid="btn-submit-weighbridge"
            >
              Confirm Weighbridge Scale
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

