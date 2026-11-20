'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Truck, User, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { ShiftTypeOption, ShiftAllocationStatus, VehicleDriverShiftAllocation } from '@/types/fleet';
import { useMine } from '@/context/MineContext';
import { toLocalDateString } from '@/lib/datetime';

interface ShiftAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialVehicle?: string;
  initialDriver?: string;
  initialAllocation?: VehicleDriverShiftAllocation | null;
}

export const SHIFT_OPTIONS: ShiftTypeOption[] = [
  'Morning (06:00 - 14:00)',
  'Afternoon (14:00 - 22:00)',
  'Evening (14:00 - 22:00)',
  'Night (22:00 - 06:00)',
  'General (09:00 - 18:00)',
  'General / Full Day',
];

export function getNextDayStr(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const d = new Date(year, month, day + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dt = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dt}`;
  }
  const d = new Date(`${dateStr}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return toLocalDateString(d);
}

export function deriveShiftTimes(
  dateStr: string,
  shift: ShiftTypeOption | string
): { start: string; end: string } {
  const baseDate = dateStr || toLocalDateString();
  const nextDate = getNextDayStr(baseDate);

  if (shift.includes('06:00 - 14:00') || shift.toLowerCase().includes('morning')) {
    return {
      start: `${baseDate}T06:00`,
      end: `${baseDate}T14:00`,
    };
  }
  if (shift.includes('Evening') || shift.includes('Afternoon') || shift.includes('14:00 - 22:00')) {
    return {
      start: `${baseDate}T14:00`,
      end: `${baseDate}T22:00`,
    };
  }
  if (shift.includes('22:00 - 06:00') || shift.toLowerCase().includes('night')) {
    return {
      start: `${baseDate}T22:00`,
      end: `${nextDate}T06:00`,
    };
  }
  if (shift.includes('09:00 - 18:00')) {
    return {
      start: `${baseDate}T09:00`,
      end: `${baseDate}T18:00`,
    };
  }
  if (shift.includes('General / Full Day')) {
    return {
      start: `${baseDate}T08:00`,
      end: `${baseDate}T18:00`,
    };
  }
  return {
    start: `${baseDate}T08:00`,
    end: `${baseDate}T16:00`,
  };
}

export function ShiftAllocationModal({
  isOpen,
  onClose,
  onSuccess,
  initialVehicle,
  initialDriver,
  initialAllocation,
}: ShiftAllocationModalProps) {
  const { currentMine, allowedMines, isAllMines, isSingleMine, mineOptions, activeMineLabel } = useMine();
  const [mineSite, setMineSite] = useState<string>('');
  const [vehicle, setVehicle] = useState(initialVehicle || '');
  const [driver, setDriver] = useState(initialDriver || '');
  const [allocationDate, setAllocationDate] = useState(() => toLocalDateString());
  const [shiftType, setShiftType] = useState<ShiftTypeOption>('Morning (06:00 - 14:00)');
  const [allocationStart, setAllocationStart] = useState('');
  const [allocationEnd, setAllocationEnd] = useState('');
  const [status, setStatus] = useState<ShiftAllocationStatus>('Active');
  const [isPrimary, setIsPrimary] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [isManualEdit, setIsManualEdit] = useState(false);

  const [vehicles, setVehicles] = useState<{ id: string; licensePlate: string; status: string }[]>([]);
  const [drivers, setDrivers] = useState<{ id: string; name: string; status: string; licenseExpiry?: string }[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingOptions, setIsLoadingOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = Boolean(initialAllocation?.id);

  const loadDropdownOptions = async (targetMine?: string) => {
    try {
      setIsLoadingOptions(true);
      const m = targetMine || mineSite;
      const mineParam = m && m !== 'ALL' ? `&mine_site=${encodeURIComponent(m)}` : '';
      const [vRes, dRes] = await Promise.all([
        fetch(`/api/vehicles?limit=100${mineParam}`),
        fetch(`/api/drivers?limit=100${mineParam}`),
      ]);

      const [vJson, dJson] = await Promise.all([vRes.json(), dRes.json()]);

      if (vJson.success) {
        const vList = (vJson.data || []).map((v: any) => ({
          id: v.id,
          licensePlate: v.licensePlate,
          status: v.status,
        }));
        setVehicles(vList);
        if (!initialVehicle && !initialAllocation?.vehicle && vList.length > 0) {
          setVehicle(vList[0].id);
        }
      }

      if (dJson.success) {
        const dList = (dJson.data || []).map((d: any) => ({
          id: d.id,
          name: d.name,
          status: d.status,
          licenseExpiry: d.expiryDate,
        }));
        setDrivers(dList);
        if (!initialDriver && !initialAllocation?.driver && dList.length > 0) {
          setDriver(dList[0].id);
        }
      }
    } catch (err: any) {
      console.error('Failed to load shift options:', err);
    } finally {
      setIsLoadingOptions(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setError(null);
      const effectiveMine =
        initialAllocation?.mineSite ||
        (currentMine !== 'ALL' ? currentMine : (mineOptions[0]?.value || ''));
      setMineSite(effectiveMine);

      if (initialAllocation) {
        setVehicle(initialAllocation.vehicle || '');
        setDriver(initialAllocation.driver || '');
        setShiftType((initialAllocation.shiftType as ShiftTypeOption) || 'Morning (06:00 - 14:00)');
        setStatus(initialAllocation.status || 'Active');
        setIsPrimary(Boolean(initialAllocation.isPrimary));
        setRemarks(initialAllocation.remarks || '');

        const rawStart = initialAllocation.allocationStart || '';
        const rawEnd = initialAllocation.allocationEnd || '';
        const datePart = rawStart ? rawStart.split(' ')[0].split('T')[0] : toLocalDateString();
        setAllocationDate(datePart);
        setAllocationStart(rawStart ? rawStart.replace(' ', 'T').slice(0, 16) : '');
        setAllocationEnd(rawEnd ? rawEnd.replace(' ', 'T').slice(0, 16) : '');
        setIsManualEdit(true);
      } else {
        if (initialVehicle) setVehicle(initialVehicle);
        if (initialDriver) setDriver(initialDriver);
        const today = toLocalDateString();
        setAllocationDate(today);
        setShiftType('Morning (06:00 - 14:00)');
        setStatus('Active');
        setIsPrimary(true);
        setRemarks('');

        const { start, end } = deriveShiftTimes(today, 'Morning (06:00 - 14:00)');
        setAllocationStart(start);
        setAllocationEnd(end);
        setIsManualEdit(false);
      }

      loadDropdownOptions(effectiveMine);
    }
  }, [isOpen, initialVehicle, initialDriver, initialAllocation, currentMine, mineOptions]);

  const handleDateChange = (newDate: string) => {
    setAllocationDate(newDate);
    if (!newDate) return;

    if (isManualEdit) {
      const startTime = allocationStart.includes('T') ? allocationStart.split('T')[1] : '06:00';
      const isOvernight = shiftType.includes('Night') || shiftType.includes('22:00 - 06:00');
      const nextDate = getNextDayStr(newDate);
      const endTime = allocationEnd.includes('T') ? allocationEnd.split('T')[1] : (isOvernight ? '06:00' : '14:00');
      setAllocationStart(`${newDate}T${startTime}`);
      setAllocationEnd(`${isOvernight ? nextDate : newDate}T${endTime}`);
    } else {
      const { start, end } = deriveShiftTimes(newDate, shiftType);
      setAllocationStart(start);
      setAllocationEnd(end);
    }
  };

  const handleShiftChange = (newShift: ShiftTypeOption) => {
    setShiftType(newShift);
    const { start, end } = deriveShiftTimes(allocationDate || toLocalDateString(), newShift);
    setAllocationStart(start);
    setAllocationEnd(end);
    setIsManualEdit(false);
  };

  const handleStartChange = (val: string) => {
    setAllocationStart(val);
    setIsManualEdit(true);
    if (val.includes('T')) {
      const d = val.split('T')[0];
      if (d && d !== allocationDate) {
        setAllocationDate(d);
      }
    }
  };

  const handleEndChange = (val: string) => {
    setAllocationEnd(val);
    setIsManualEdit(true);
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
    if (!mineSite) {
      setError('Operational Mine Site is required.');
      return;
    }
    if (!allocationStart) {
      setError('Allocation start time is required.');
      return;
    }
    if (!allocationEnd) {
      setError('Allocation end time is required.');
      return;
    }

    const formatDt = (val: string) => {
      if (!val) return null;
      const clean = val.replace('T', ' ');
      return clean.length === 16 ? `${clean}:00` : clean;
    };

    const formattedStart = formatDt(allocationStart);
    const formattedEnd = formatDt(allocationEnd);

    if (formattedStart && formattedEnd && formattedEnd <= formattedStart) {
      setError('Allocation end time must be strictly after allocation start time.');
      return;
    }

    try {
      setIsSubmitting(true);

      const payload = {
        vehicle,
        driver,
        mineSite,
        shiftType,
        allocationStart: formattedStart,
        allocationEnd: formattedEnd,
        status,
        isPrimary,
        remarks: remarks.trim() || null,
      };

      let res: Response;
      if (initialAllocation?.id) {
        res = await fetch(`/api/shifts/${encodeURIComponent(initialAllocation.id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch('/api/shifts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to save shift allocation.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error saving shift allocation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {isEditing ? 'Edit Shift Allocation' : 'Vehicle Driver Shift Allocation'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditing
                ? `Update operating schedule for allocation ${initialAllocation?.id}`
                : 'Assign driver to operational shift window with conflict validation'}
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

          {/* Operational Mine Site Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Operational Mine Site <span className="text-rose-500">*</span>
            </label>
            {isSingleMine ? (
              <div className="w-full text-xs px-3 py-2 border border-slate-200 bg-slate-100 rounded-lg text-slate-700 font-semibold">
                {activeMineLabel}
              </div>
            ) : (
              <select
                value={mineSite}
                onChange={(e) => {
                  const newMine = e.target.value;
                  setMineSite(newMine);
                  loadDropdownOptions(newMine);
                }}
                disabled={isEditing || isLoadingOptions}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                required
              >
                {mineOptions
                  .filter((opt) => isAllMines || allowedMines.includes(opt.value))
                  .map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
              </select>
            )}
          </div>

          {/* Vehicle Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Transport Asset / Vehicle <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={vehicle}
                onChange={(e) => setVehicle(e.target.value)}
                disabled={Boolean(initialVehicle && !isEditing) || isLoadingOptions}
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
              disabled={Boolean(initialDriver && !isEditing) || isLoadingOptions}
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

          {/* Allocation Date & Shift Slot */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Allocation Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={allocationDate}
                onChange={(e) => handleDateChange(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Shift Slot <span className="text-rose-500">*</span>
              </label>
              <select
                value={shiftType}
                onChange={(e) => handleShiftChange(e.target.value as ShiftTypeOption)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
              >
                {SHIFT_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Allocation Status */}
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

          {/* Start and End Times */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Start Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={allocationStart}
                onChange={(e) => handleStartChange(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                End Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={allocationEnd}
                onChange={(e) => handleEndChange(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
                required
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
                  <span>Validating & Saving...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Update Allocation' : 'Save Allocation'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
