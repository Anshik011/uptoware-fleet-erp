'use client';

import React, { useState, useEffect } from 'react';
import { Driver, UpdateDriverInput, DriverStatus, VehicleDriverShiftAllocation } from '@/types/fleet';
import { X, Edit2, AlertCircle, ShieldAlert, CheckSquare, Clock, Truck, Calendar, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

interface EditDriverModalProps {
  isOpen: boolean;
  driver: Driver | null;
  onClose: () => void;
  onSuccess: (updatedDriver: Driver) => void;
}

export function EditDriverModal({ isOpen, driver, onClose, onSuccess }: EditDriverModalProps) {
  const [fullName, setFullName] = useState('');
  const [status, setStatus] = useState<DriverStatus>('Active');
  const [cellNumber, setCellNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [issuingDate, setIssuingDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [medicalFitnessExpiry, setMedicalFitnessExpiry] = useState('');
  const [safetyScore, setSafetyScore] = useState('100');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');

  // Reactivation authorization state
  const [reactivationConfirmed, setReactivationConfirmed] = useState(false);

  // Informational shift allocations
  const [shifts, setShifts] = useState<VehicleDriverShiftAllocation[]>([]);
  const [isLoadingShifts, setIsLoadingShifts] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync form state when driver prop changes
  useEffect(() => {
    if (!driver) return;
    setFullName(driver.fullName || driver.name || '');
    setStatus(driver.status || 'Active');
    setCellNumber(driver.cellNumber || '');
    setLicenseNumber(driver.licenseNumber || '');
    setIssuingDate(driver.issuingDate || '');
    setExpiryDate(driver.expiryDate || '');
    setMedicalFitnessExpiry(driver.medicalFitnessExpiry || '');
    setSafetyScore(String(driver.safetyScore ?? 100));
    setEmergencyContactName(driver.emergencyContactName || '');
    setEmergencyContactPhone(driver.emergencyContactPhone || '');
    setReactivationConfirmed(false);
    setError(null);
  }, [driver]);

  // Fetch driver's shift allocations when modal opens
  useEffect(() => {
    if (!isOpen || !driver?.id) return;

    async function loadDriverShifts() {
      try {
        setIsLoadingShifts(true);
        const res = await fetch(`/api/shifts?driver=${encodeURIComponent(driver!.id)}&limit=5&include_test=true`);
        const json = await res.json();
        if (res.ok && json.success) {
          setShifts(json.data || []);
        }
      } catch (err) {
        console.error('Failed to load driver shifts:', err);
      } finally {
        setIsLoadingShifts(false);
      }
    }

    loadDriverShifts();
  }, [isOpen, driver?.id]);

  if (!isOpen || !driver) return null;

  const isReactivating = (driver.status === 'Suspended' || driver.status === 'Left') && status === 'Active';

  const getStatusBadgeVariant = (st: string) => {
    switch (st) {
      case 'Active':
        return 'positive';
      case 'Suspended':
        return 'warning';
      case 'Left':
      default:
        return 'neutral';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }

    // Reactivation Validation Guard
    if (isReactivating) {
      if (!expiryDate) {
        setError('Cannot reactivate operator: Driving licence expiry date is required.');
        return;
      }
      const exp = new Date(expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (exp < today) {
        setError(`Cannot reactivate operator: Driving licence expired on ${expiryDate}. Valid licence required for dispatch eligibility.`);
        return;
      }
      if (!reactivationConfirmed) {
        setError('Please certify statutory compliance verification before reactivating a suspended operator.');
        return;
      }
    }

    const payload: UpdateDriverInput = {
      fullName: fullName.trim(),
      status,
      cellNumber: cellNumber.trim() || undefined,
      licenseNumber: licenseNumber.trim() || undefined,
      issuingDate: issuingDate || undefined,
      expiryDate: expiryDate || undefined,
      medicalFitnessExpiry: medicalFitnessExpiry || undefined,
      safetyScore: Number(safetyScore) || 100,
      emergencyContactName: emergencyContactName.trim() || undefined,
      emergencyContactPhone: emergencyContactPhone.trim() || undefined,
    };

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/drivers/${encodeURIComponent(driver.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update driver profile.');
      }

      onSuccess(json.data);
      onClose();
    } catch (err: any) {
      console.error('Driver update error:', err);
      setError(err.message || 'Error communicating with ERPNext server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <Edit2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Edit Operator Profile — {driver.fullName || driver.name}
                </h2>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span data-testid="driver-id-badge" className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  Driver ID: {driver.id}
                </span>
                <Badge variant={getStatusBadgeVariant(driver.status)} size="sm">
                  {driver.status}
                </Badge>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <p className="font-semibold">Validation Error</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* Section: Basic Identity & Status */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5">
              1. Operator Identity & Status
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                isRequired
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                data-testid="input-edit-driver-name"
              />
              <Select
                label="Roster Status"
                isRequired
                value={status}
                onChange={(e) => setStatus(e.target.value as DriverStatus)}
                data-testid="select-edit-driver-status"
              >
                <option value="Active">Active (Available for Dispatch)</option>
                <option value="Suspended">Suspended (Restricted)</option>
                <option value="Left">Left (Resigned / Inactive)</option>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Safety Score (%)"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={safetyScore}
                onChange={(e) => setSafetyScore(e.target.value)}
                data-testid="input-edit-driver-safety"
              />
              <div className="flex flex-col justify-end">
                <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="font-semibold text-slate-700">Multi-Driver Allocation:</span> Transport vehicles are allocated via Shift Rosters. Direct 1-to-1 vehicle binding is deprecated.
                </p>
              </div>
            </div>

            {/* Reactivation Guard Warning Banner */}
            {isReactivating && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <ShieldAlert className="w-4 h-4 text-amber-700" />
                  <span>Authorized Operator Reactivation Protocol</span>
                </div>
                <p className="text-amber-800">
                  This operator is currently <span className="font-semibold">{driver.status}</span>. Reactivating to Active status allows shift allocation and dispatch. A valid, non-expired driving licence is mandatory.
                </p>
                <label className="flex items-center gap-2 font-medium text-slate-800 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={reactivationConfirmed}
                    onChange={(e) => setReactivationConfirmed(e.target.checked)}
                    className="w-4 h-4 text-blue-900 rounded border-slate-300 focus:ring-blue-900"
                  />
                  <span>I certify statutory compliance and authorize reactivation of {fullName || driver.name}.</span>
                </label>
              </div>
            )}
          </div>

          {/* Section: Informational Shift Allocations */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-900" />
                Current & Recent Shift Allocations
              </h3>
              <span className="text-[11px] text-slate-400">Read-Only Summary</span>
            </div>

            {isLoadingShifts ? (
              <div className="py-4 flex items-center justify-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-blue-900" />
                <span>Loading shift history...</span>
              </div>
            ) : shifts.length === 0 ? (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <p className="text-xs text-slate-500">
                  No active or scheduled shifts allocated for this operator.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                    <tr>
                      <th className="py-2 px-3">Vehicle</th>
                      <th className="py-2 px-3">Shift Slot</th>
                      <th className="py-2 px-3">Start Window</th>
                      <th className="py-2 px-3">End Window</th>
                      <th className="py-2 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {shifts.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/60">
                        <td className="py-2 px-3 font-mono font-semibold text-slate-900">
                          <div className="flex items-center gap-1">
                            <Truck className="w-3 h-3 text-slate-400" />
                            <span>{s.licensePlate || s.vehicle}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-700">{s.shiftType}</td>
                        <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{s.allocationStart}</td>
                        <td className="py-2 px-3 text-slate-600 font-mono text-[11px]">{s.allocationEnd || 'Open'}</td>
                        <td className="py-2 px-3">
                          <Badge variant={s.status === 'Active' ? 'positive' : s.status === 'Scheduled' ? 'info' : 'neutral'} size="sm">
                            {s.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section: Contact Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5">
              2. Contact & Emergency Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Cellphone Number"
                value={cellNumber}
                onChange={(e) => setCellNumber(e.target.value)}
                data-testid="input-edit-driver-phone"
              />
              <Input
                label="Emergency Contact Name"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
              />
              <Input
                label="Emergency Phone"
                value={emergencyContactPhone}
                onChange={(e) => setEmergencyContactPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Section: Licensing & Statutory */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5">
              3. Driving License & Medical Fitness
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Driving License Number"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                data-testid="input-edit-driver-license"
              />
              <Input
                label="License Expiry Date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                data-testid="input-edit-driver-expiry"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="License Issuing Date"
                type="date"
                value={issuingDate}
                onChange={(e) => setIssuingDate(e.target.value)}
              />
              <Input
                label="Medical Fitness Expiry Date"
                type="date"
                value={medicalFitnessExpiry}
                onChange={(e) => setMedicalFitnessExpiry(e.target.value)}
              />
            </div>
          </div>

          {/* Actions Bottom Right */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" size="md" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              data-testid="btn-submit-edit-driver"
            >
              Update Driver Profile
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
