'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import {
  Wrench,
  X,
  AlertCircle,
  Truck,
  User,
  MapPin,
  Calendar,
  Clock,
  Gauge,
  AlertTriangle,
  Building2,
} from 'lucide-react';
import { BreakdownType, BreakdownSeverity } from '@/types/fleet';

interface AddBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedVehicle?: string;
}

export function AddBreakdownModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedVehicle,
}: AddBreakdownModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form fields
  const [vehicle, setVehicle] = useState(preselectedVehicle || '');
  const [breakdownDate, setBreakdownDate] = useState('');
  const [breakdownTime, setBreakdownTime] = useState('');
  const [breakdownType, setBreakdownType] = useState<BreakdownType>('Engine');
  const [severity, setSeverity] = useState<BreakdownSeverity>('Medium');
  const [breakdownLocation, setBreakdownLocation] = useState('');
  const [odometerReading, setOdometerReading] = useState('');
  const [driver, setDriver] = useState('');
  const [mineSite, setMineSite] = useState('');
  const [assignedWorkshop, setAssignedWorkshop] = useState('');
  const [description, setDescription] = useState('');
  const [isTestRecord, setIsTestRecord] = useState(false);

  // Options state
  const [vehicles, setVehicles] = useState<
    Array<{ id: string; licensePlate: string; status: string; lastOdometer: number }>
  >([]);
  const [drivers, setDrivers] = useState<Array<{ id: string; fullName: string; status: string }>>([]);
  const [mineSites, setMineSites] = useState<Array<{ id: string; siteName: string }>>([]);
  const [workshops, setWorkshops] = useState<Array<{ id: string; supplierName: string }>>([]);
  const [breakdownTypes, setBreakdownTypes] = useState<string[]>([
    'Engine',
    'Hydraulic',
    'Tyre',
    'Electrical',
    'Transmission',
    'Brake',
    'Other',
  ]);
  const [severities, setSeverities] = useState<string[]>(['Low', 'Medium', 'Critical']);

  useEffect(() => {
    if (!isOpen) return;

    const d = new Date();
    setBreakdownDate(d.toISOString().substring(0, 10));
    setBreakdownTime(
      `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
    );

    async function loadOptions() {
      try {
        const res = await fetch('/api/breakdowns/options');
        const json = await res.json();
        if (res.ok && json.success) {
          if (json.vehicles) setVehicles(json.vehicles);
          if (json.drivers) setDrivers(json.drivers);
          if (json.mineSites) setMineSites(json.mineSites);
          if (json.workshops) setWorkshops(json.workshops);
          if (json.breakdownTypes?.length) setBreakdownTypes(json.breakdownTypes);
          if (json.severities?.length) setSeverities(json.severities);

          if (preselectedVehicle) {
            setVehicle(preselectedVehicle);
          } else if (json.vehicles?.length > 0 && !vehicle) {
            setVehicle(json.vehicles[0].id);
          }
        }
      } catch (err) {
        console.warn('Failed to load breakdown form options:', err);
      }
    }

    loadOptions();
  }, [isOpen, preselectedVehicle]);

  // Selected vehicle info for odometer hint
  const currentVehicleObj = vehicles.find((v) => v.id === vehicle || v.licensePlate === vehicle);

  useEffect(() => {
    if (currentVehicleObj && currentVehicleObj.lastOdometer && !odometerReading) {
      setOdometerReading(String(currentVehicleObj.lastOdometer));
    }
  }, [currentVehicleObj]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!vehicle) {
      setErrorMessage('Please select a vehicle.');
      return;
    }
    if (!breakdownDate) {
      setErrorMessage('Breakdown date is mandatory.');
      return;
    }
    if (!breakdownLocation.trim()) {
      setErrorMessage('Breakdown location description is mandatory.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/breakdowns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle,
          breakdownDate,
          breakdownTime,
          breakdownType,
          severity,
          breakdownLocation: breakdownLocation.trim(),
          odometerReading: odometerReading ? Number(odometerReading) : undefined,
          driver: driver || undefined,
          mineSite: mineSite || undefined,
          assignedWorkshop: assignedWorkshop || undefined,
          description: description.trim() || undefined,
          isTestRecord,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to report breakdown incident.');
      }

      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error reporting breakdown incident.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      data-testid="modal-add-breakdown"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-rose-700" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Report Breakdown Incident</h3>
              <p className="text-xs text-slate-500">
                Log a vehicle failure, assign workshop, and initiate maintenance tracking
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Row 1: Vehicle & Breakdown Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vehicle <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Truck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  required
                  data-testid="input-breakdown-vehicle"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                >
                  <option value="">Select Vehicle...</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate || v.id} ({v.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Breakdown Type <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Wrench className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={breakdownType}
                  onChange={(e) => setBreakdownType(e.target.value as BreakdownType)}
                  required
                  data-testid="input-breakdown-type"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                >
                  {breakdownTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Row 2: Severity & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Severity <span className="text-rose-500">*</span>
              </label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as BreakdownSeverity)}
                required
                data-testid="input-breakdown-severity"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
              >
                {severities.map((s) => (
                  <option key={s} value={s}>
                    {s} Severity
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Breakdown Location <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="e.g. Kudremukh Haul Road KM 4"
                  value={breakdownLocation}
                  onChange={(e) => setBreakdownLocation(e.target.value)}
                  required
                  data-testid="input-breakdown-location"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Row 3: Date, Time & Odometer */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={breakdownDate}
                  onChange={(e) => setBreakdownDate(e.target.value)}
                  required
                  data-testid="input-breakdown-date"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
              <div className="relative">
                <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="time"
                  step="1"
                  value={breakdownTime}
                  onChange={(e) => setBreakdownTime(e.target.value)}
                  data-testid="input-breakdown-time"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Odometer (KM)
                {currentVehicleObj?.lastOdometer ? (
                  <span className="text-[10px] text-slate-500 ml-1">
                    (Last: {currentVehicleObj.lastOdometer})
                  </span>
                ) : null}
              </label>
              <div className="relative">
                <Gauge className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  placeholder="e.g. 52400"
                  value={odometerReading}
                  onChange={(e) => setOdometerReading(e.target.value)}
                  data-testid="input-breakdown-odometer"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Driver, Mine Site, Workshop */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Driver</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
                  data-testid="input-breakdown-driver"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                >
                  <option value="">Unassigned</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName || d.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Mine Site</label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={mineSite}
                  onChange={(e) => setMineSite(e.target.value)}
                  data-testid="input-breakdown-minesite"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                >
                  <option value="">None / On Road</option>
                  {mineSites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.siteName || s.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Workshop</label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={assignedWorkshop}
                  onChange={(e) => setAssignedWorkshop(e.target.value)}
                  data-testid="input-breakdown-workshop"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                >
                  <option value="">Internal Fleet Workshop</option>
                  {workshops.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.supplierName || w.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Failure Symptoms
            </label>
            <textarea
              rows={2}
              placeholder="Describe observed failure, abnormal sounds, smoke, hydraulic fluid leakage..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="input-breakdown-description"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          {/* Test Record Isolation Checkbox */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <input
              type="checkbox"
              id="breakdownIsTestRecord"
              checked={isTestRecord}
              onChange={(e) => setIsTestRecord(e.target.checked)}
              data-testid="checkbox-breakdown-test"
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="breakdownIsTestRecord" className="text-xs text-slate-500 font-medium">
              Flag as test record (quarantined from production reports and KPI calculations)
            </label>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
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
              disabled={isSubmitting}
              data-testid="btn-submit-breakdown"
            >
              {isSubmitting ? 'Recording...' : 'Report Incident'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
