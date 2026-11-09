'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Fuel, AlertCircle, X } from 'lucide-react';
import { FuelSource, FuelPaymentMethod } from '@/types/fleet';

interface AddFuelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddFuelModal({ isOpen, onClose, onSuccess }: AddFuelModalProps) {
  const [vehicles, setVehicles] = useState<Array<{ id: string; licensePlate: string; lastOdometer: number }>>([]);
  const [drivers, setDrivers] = useState<Array<{ id: string; fullName: string }>>([]);
  const [mineSites, setMineSites] = useState<Array<{ id: string; siteName: string }>>([]);
  const [fuelSources, setFuelSources] = useState<string[]>(['Site Bowser', 'External Pump']);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['Company Card', 'Bank Transfer', 'UPI', 'Cash']);

  // Form State
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [selectedMineSite, setSelectedMineSite] = useState('');
  const [fuelDate, setFuelDate] = useState('');
  const [fuelSource, setFuelSource] = useState<FuelSource>('Site Bowser');
  const [odometerReading, setOdometerReading] = useState('');
  const [quantityLitres, setQuantityLitres] = useState('');
  const [ratePerLitre, setRatePerLitre] = useState('');
  const [isFullTank, setIsFullTank] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<FuelPaymentMethod>('Company Card');
  const [fuelStation, setFuelStation] = useState('');
  const [remarks, setRemarks] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load backend options
  useEffect(() => {
    if (!isOpen) return;

    let ignore = false;
    async function loadOptions() {
      try {
        const res = await fetch('/api/fuel/options');
        const json = await res.json();
        if (ignore) return;
        setFuelDate(new Date().toISOString().substring(0, 10));
        if (res.ok && json.success && json.data) {
          setVehicles(json.data.vehicles || []);
          setDrivers(json.data.drivers || []);
          setMineSites(json.data.mineSites || []);
          if (json.data.fuelSources?.length) setFuelSources(json.data.fuelSources);
          if (json.data.paymentMethods?.length) setPaymentMethods(json.data.paymentMethods);
        }
      } catch (err) {
        console.warn('Could not load fuel options:', err);
      }
    }

    loadOptions();
    return () => {
      ignore = true;
    };
  }, [isOpen]);

  // When vehicle selected, update recommended odometer
  function handleVehicleChange(plate: string) {
    setSelectedVehicle(plate);
    const found = vehicles.find((v) => v.id === plate || v.licensePlate === plate);
    if (found && found.lastOdometer) {
      setOdometerReading(String(found.lastOdometer));
    }
  }

  const selectedVehObj = vehicles.find(
    (v) => v.id === selectedVehicle || v.licensePlate === selectedVehicle
  );

  const qty = parseFloat(quantityLitres);
  const rate = parseFloat(ratePerLitre);
  const calculatedCost =
    !isNaN(qty) && !isNaN(rate) && qty > 0 && rate > 0
      ? Math.round(qty * rate * 100) / 100
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedVehicle) {
      setError('Please select a commercial fleet vehicle.');
      return;
    }

    const odo = parseInt(odometerReading, 10);
    if (isNaN(odo) || odo < 0) {
      setError('Odometer reading must be a valid positive integer.');
      return;
    }

    if (selectedVehObj && selectedVehObj.lastOdometer && odo < selectedVehObj.lastOdometer) {
      setError(
        `Odometer reading (${odo.toLocaleString('en-IN')} KM) cannot be lower than the vehicle's last recorded odometer (${selectedVehObj.lastOdometer.toLocaleString('en-IN')} KM).`
      );
      return;
    }

    if (isNaN(qty) || qty <= 0) {
      setError('Quantity in litres must be a positive numeric value.');
      return;
    }

    if (isNaN(rate) || rate <= 0) {
      setError('Rate per litre must be a positive numeric value.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/fuel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle: selectedVehicle,
          fuelDate,
          fuelSource,
          odometerReading: odo,
          quantityLitres: qty,
          ratePerLitre: rate,
          totalCost: calculatedCost || undefined,
          isFullTank,
          driver: selectedDriver || undefined,
          mineSite: selectedMineSite || undefined,
          paymentMethod: paymentMethod || undefined,
          fuelStation: fuelStation.trim() || undefined,
          remarks: remarks.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to record fuel log.');
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error recording fuel dispensation.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-900">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Log Fuel Dispensation
              </h2>
              <p className="text-xs text-slate-500">
                Record mobile bowser or commercial pump refill with odometer benchmarking.
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

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Vehicle & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Vehicle Plate *
              </label>
              <select
                value={selectedVehicle}
                onChange={(e) => handleVehicleChange(e.target.value)}
                data-testid="select-fuel-vehicle"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
                required
              >
                <option value="">Select Active Vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.licensePlate}>
                    {v.licensePlate} (Last: {v.lastOdometer.toLocaleString('en-IN')} KM)
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Refuel Date *"
              type="date"
              value={fuelDate}
              onChange={(e) => setFuelDate(e.target.value)}
              data-testid="input-fuel-date"
              required
            />
          </div>

          {/* Source & Driver */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Fuel Source *
              </label>
              <select
                value={fuelSource}
                onChange={(e) => setFuelSource(e.target.value as FuelSource)}
                data-testid="select-fuel-source"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
                required
              >
                {fuelSources.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Driver Operator
              </label>
              <select
                value={selectedDriver}
                onChange={(e) => setSelectedDriver(e.target.value)}
                data-testid="select-fuel-driver"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
              >
                <option value="">Unspecified Driver</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} ({d.id})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Odometer & Full Tank Checkbox */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <Input
              label="Odometer Reading (KM) *"
              type="number"
              min="0"
              placeholder="e.g. 62150"
              value={odometerReading}
              onChange={(e) => setOdometerReading(e.target.value)}
              data-testid="input-fuel-odometer"
              required
            />

            <div className="pt-5">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isFullTank}
                  onChange={(e) => setIsFullTank(e.target.checked)}
                  data-testid="check-fuel-full-tank"
                  className="mt-0.5 rounded-sm border-slate-300 text-blue-900 focus:ring-blue-600"
                />
                <div>
                  <span className="text-xs font-semibold text-slate-900 block">
                    Full Tank Refill (Auto-Cutoff)
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Enables accurate interval KM/L benchmark calculation.
                  </span>
                </div>
              </label>
            </div>
          </div>

          {/* Quantity, Rate & Total Cost */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Quantity (Litres) *"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 150.0"
              value={quantityLitres}
              onChange={(e) => setQuantityLitres(e.target.value)}
              data-testid="input-fuel-quantity"
              required
            />
            <Input
              label="Rate per Litre (₹) *"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="e.g. 91.50"
              value={ratePerLitre}
              onChange={(e) => setRatePerLitre(e.target.value)}
              data-testid="input-fuel-rate"
              required
            />
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Total Fuel Cost (₹)
              </label>
              <div className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 h-9 flex items-center">
                {calculatedCost != null
                  ? `₹${calculatedCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
                  : '—'}
              </div>
            </div>
          </div>

          {/* Mine Site & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mine Site Location
              </label>
              <select
                value={selectedMineSite}
                onChange={(e) => setSelectedMineSite(e.target.value)}
                data-testid="select-fuel-minesite"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
              >
                <option value="">Unassigned Location</option>
                {mineSites.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.siteName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as FuelPaymentMethod)}
                data-testid="select-fuel-payment-method"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
              >
                {paymentMethods.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Station / Bowser Details */}
          <Input
            label="Fuel Station / Bowser ID"
            type="text"
            placeholder="e.g. Site Bowser #02 or Indian Oil Pump #14"
            value={fuelStation}
            onChange={(e) => setFuelStation(e.target.value)}
            data-testid="input-fuel-station"
          />

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Operational Remarks
            </label>
            <textarea
              rows={2}
              placeholder="Refuel notes, slip reference, pump discrepancy..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              data-testid="input-fuel-remarks"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
            />
          </div>

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
              data-testid="btn-submit-fuel"
            >
              Log Fuel Entry
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

