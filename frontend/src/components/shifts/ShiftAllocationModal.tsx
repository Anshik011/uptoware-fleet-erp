'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Truck, User, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { ShiftTypeOption, ShiftAllocationStatus } from '@/types/fleet';

interface ShiftAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialVehicle?: string;
  initialDriver?: string;
}

const SHIFT_OPTIONS: ShiftTypeOption[] = [
  'Morning (06:00 - 14:00)',
  'Afternoon (14:00 - 22:00)',
  'Night (22:00 - 06:00)',
  'General / Full Day',
];

export function ShiftAllocationModal({
  isOpen,
  onClose,
  onSuccess,
  initialVehicle,
  initialDriver,
}: ShiftAllocationModalProps) {
  const [vehicle, setVehicle] = useState(initialVehicle || '');
  const [driver, setDriver] = useState(initialDriver || '');
  const [shiftType, setShiftType] = useState<ShiftTypeOption>('Morning (06:00 - 14:00)');
  const [allocationStart, setAllocationStart] = useState('');
  const [allocationEnd, setAllocationEnd] = useState('');
  const [status, setStatus] = useState<ShiftAllocationStatus>('Active');
  const [isPrimary, setIsPrimary] = useState(true);
  const [remarks, setRemarks] = useState('');

  const [vehicles, setVehicles] = useState<{ id: string; licensePlate: string; status: string }[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; name: string; status: string; licenseExpiry?: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      if (initialVehicle) setVehicle(initialVehicle);
      if (initialDriver) setDriver(initialDriver);

      // Default start to current date/time rounded to nearest hour
      const now = new Date();
      const isoLocal = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setAllocationStart(isoLocal);

      // Fetch active vehicles & drivers
      loadDropdownOptions();
    }
  }, [isOpen, initialVehicle, initialDriver]);

  const loadDropdownOptions = async () => {
    try {
      setIsLoadingOptions(true);
      const [vRes, dRes] = await Promise.all([
        fetch('/api/vehicles?limit=100'),
        fetch('/api/drivers?limit=100'),
      ]);

      const [vJson, dJson] = await Promise.all([vRes.json(), dRes.json()]);

      if (vJson.success) {
        setVehicles(
          (vJson.data || []).map((v: any) => ({
            id: v.id,
            licensePlate: v.licensePlate,
            status: v.status,
          }))
        );
        if (!initialVehicle && vJson.data?.[0]) {
          setVehicle(vJson.data[0].id);
        }
      }

      if (dJson.success) {
        setDrivers(
          (dJson.data || []).map((d: any) => ({
            id: d.id,
            name: d.name,
            status: d.status,
            licenseExpiry: d.expiryDate,
          }))
        );
        if (!initialDriver && dJson.data?.[0]) {
          setDriver(dJson.data[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load shift options:', err);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!vehicle) {
      setError('Please select a vehicle.');
      return;
    }
    if (!driver) {
      setError('Please select a driver.');
      return;
    }
    if (!allocationStart) {
      setError('Allocation start time is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      // Format start and end as Frappe Datetime (YYYY-MM-DD HH:mm:ss)
      const formatDt = (val: string) => (val ? val.replace('T', ' ') + ':00' : null);

      const payload = {
        vehicle,
        driver,
        shiftType,
        allocationStart: formatDt(allocationStart),
        allocationEnd: allocationEnd ? formatDt(allocationEnd) : null,
        status,
        isPrimary,
        remarks: remarks.trim() || null,
      };

      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to allocate shift.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error creating shift allocation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Vehicle Driver Shift Allocation</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Assign driver to operational shift window with conflict validation
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Vehicle Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Transport Asset / Vehicle <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                disabled={Boolean(initialVehicle) || isLoadingOptions}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                required
              >
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.licensePlate} ({v.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Driver Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Assigned Driver <span className="text-rose-500">*</span>
            </label>
            <select
              value={driver}
              onChange={(e) => setDriver(e.target.value)}
              disabled={Boolean(initialDriver) || isLoadingOptions}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
              required
            >
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.status})
                </option>
              ))}
            </select>
          </div>

          {/* Shift Type & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Shift Slot <span className="text-rose-500">*</span>
              </label>
              <select
                value={shiftType}
                onChange={(e) => setShiftType(e.target.value as ShiftTypeOption)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
              >
                {SHIFT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Allocation Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ShiftAllocationStatus)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
              >
                <option value="Active">Active</option>
                <option value="Scheduled">Scheduled</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          {/* Start and End Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Start Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={allocationStart}
                onChange={(e) => setAllocationStart(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                End Time (Optional)
              </label>
              <input
                type="datetime-local"
                value={allocationEnd}
                onChange={(e) => setAllocationEnd(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
          </div>

          {/* Primary Driver Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="isPrimary"
              checked={isPrimary}
              onChange={(e) => setIsPrimary(e.target.checked)}
              className="w-4 h-4 text-blue-900 border-slate-300 rounded focus:ring-blue-900"
            />
            <label htmlFor="isPrimary" className="text-xs text-slate-700 font-medium cursor-pointer">
              Designate as Primary Shift Driver (Synchronizes with default vehicle assignment)
            </label>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Shift Notes / Remarks
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="e.g. Regular day hauling shift on Pit 2 route"
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Validating & Allocating...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Save Allocation</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

