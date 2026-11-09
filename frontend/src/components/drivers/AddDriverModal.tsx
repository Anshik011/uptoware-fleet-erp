'use client';

import React, { useState } from 'react';
import { Driver, CreateDriverInput, DriverStatus } from '@/types/fleet';
import { X, UserCheck, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

interface AddDriverModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newDriver: Driver) => void;
}

export function AddDriverModal({ isOpen, onClose, onSuccess }: AddDriverModalProps) {
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }

    const payload: CreateDriverInput = {
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
      const res = await fetch('/api/drivers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to register driver in Frappe backend');
      }

      onSuccess(json.data);
      onClose();
    } catch (err: any) {
      console.error('Driver registration error:', err);
      setError(err.message || 'Error communicating with ERPNext server');
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
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-blue-900 text-white flex items-center justify-center shadow-xs">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Register Transport Operator</h2>
              <p className="text-xs text-slate-500">
                Enroll a new heavy vehicle driver into the operational roster
              </p>
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
              1. Operator Identity & Employment
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                isRequired
                placeholder="e.g. Ramesh Chandra"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                data-testid="input-driver-name"
              />
              <Select
                label="Roster Status"
                isRequired
                value={status}
                onChange={(e) => setStatus(e.target.value as DriverStatus)}
                data-testid="select-driver-status"
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
                placeholder="100.0"
                value={safetyScore}
                onChange={(e) => setSafetyScore(e.target.value)}
                helperText="Initial operator safety rating (0-100)"
                data-testid="input-driver-safety"
              />
              <div className="flex flex-col justify-end">
                <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg p-2.5">
                  <span className="font-semibold text-slate-700">Multi-Driver Roster:</span> Transport vehicle assignments are managed via Shift Allocations after registration.
                </p>
              </div>
            </div>
          </div>

          {/* Section: Contact Details */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5">
              2. Contact & Emergency Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Cellphone Number"
                placeholder="+91 98451 XXXXX"
                value={cellNumber}
                onChange={(e) => setCellNumber(e.target.value)}
                data-testid="input-driver-phone"
              />
              <Input
                label="Emergency Contact Name"
                placeholder="e.g. Kavita Kumar"
                value={emergencyContactName}
                onChange={(e) => setEmergencyContactName(e.target.value)}
              />
              <Input
                label="Emergency Phone"
                placeholder="+91 98451 XXXXX"
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
                placeholder="e.g. DL-KA-2024-XXXX"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                data-testid="input-driver-license"
              />
              <Input
                label="License Expiry Date"
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                data-testid="input-driver-expiry"
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
              data-testid="btn-submit-driver"
            >
              Register Operator
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
