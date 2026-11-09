'use client';

import React, { useState, useEffect } from 'react';
import { X, ShieldPlus, AlertCircle, Calendar, IndianRupee, Shield, Truck } from 'lucide-react';
import { CreateInsurancePolicyInput } from '@/types/fleet';

interface VehicleOption {
  name: string;
  license_plate: string;
  make?: string;
  model?: string;
}

interface AddInsurancePolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicles?: VehicleOption[];
  insuranceCompanies?: string[];
  policyTypes?: string[];
}

const DEFAULT_COMPANIES = [
  'TATA AIG General Insurance',
  'ICICI Lombard General Insurance',
  'Bajaj Allianz General Insurance',
  'HDFC ERGO General Insurance',
  'The New India Assurance Co.',
  'National Insurance Co.',
  'United India Insurance Co.',
  'The Oriental Insurance Co.',
];

const DEFAULT_TYPES = [
  'Comprehensive',
  'Third Party Liability',
  'Zero Depreciation',
  'Commercial Fleet Standard',
];

export function AddInsurancePolicyModal({
  isOpen,
  onClose,
  onSuccess,
  vehicles = [],
  insuranceCompanies = DEFAULT_COMPANIES,
  policyTypes = DEFAULT_TYPES,
}: AddInsurancePolicyModalProps) {
  const [vehicleList, setVehicleList] = useState<VehicleOption[]>(vehicles);
  const [formData, setFormData] = useState<CreateInsurancePolicyInput>({
    policyNo: '',
    vehicle: '',
    insuranceCompany: insuranceCompanies[0] || 'TATA AIG General Insurance',
    policyType: policyTypes[0] || 'Comprehensive',
    startDate: '',
    endDate: '',
    premiumAmount: 0,
    idvAmount: 0,
    thirdPartyLiabilityLimit: 0,
    remarks: '',
    policyDoc: '',
    activateNow: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      const today = new Date().toISOString().split('T')[0];
      const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      setFormData((prev) => ({
        ...prev,
        startDate: prev.startDate || today,
        endDate: prev.endDate || nextYear,
      }));

      // Fetch options if vehicles array is empty
      if (vehicles.length === 0) {
        fetch('/api/insurance/options')
          .then((res) => res.json())
          .then((data) => {
            if (data.vehicles && Array.isArray(data.vehicles)) {
              setVehicleList(data.vehicles);
              if (data.vehicles.length > 0 && !formData.vehicle) {
                setFormData((prev) => ({ ...prev, vehicle: data.vehicles[0].name }));
              }
            }
          })
          .catch((err) => console.error('Failed to load vehicle options', err));
      } else {
        setVehicleList(vehicles);
        if (vehicles.length > 0 && !formData.vehicle) {
          setFormData((prev) => ({ ...prev, vehicle: vehicles[0].name }));
        }
      }
    }
  }, [isOpen, vehicles]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.policyNo.trim()) {
      setError('Policy number is strictly required.');
      return;
    }
    if (!formData.vehicle) {
      setError('Please select a target vehicle.');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setError('Coverage start and end dates are required.');
      return;
    }
    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      setError('End date must be strictly after the start date.');
      return;
    }
    if (formData.premiumAmount <= 0) {
      setError('Premium amount must be a positive number greater than 0.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/insurance/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to register insurance policy.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error creating policy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <ShieldPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Register Insurance Policy</h2>
              <p className="text-xs text-slate-500">Record a new vehicle commercial insurance policy in ERPNext</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6 space-y-5 flex-1">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Section 1: Vehicle & Policy Identification */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              1. Policy & Asset Identification
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Vehicle */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Target Vehicle <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.vehicle}
                    onChange={(e) => setFormData({ ...formData, vehicle: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  >
                    <option value="">Select Vehicle...</option>
                    {vehicleList.map((v) => (
                      <option key={v.name} value={v.name}>
                        {v.name} {v.license_plate ? `(${v.license_plate})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Policy Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Policy Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.policyNo}
                    onChange={(e) => setFormData({ ...formData, policyNo: e.target.value })}
                    placeholder="e.g. POL-2026-998812"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Insurance Company */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Insurance Provider <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  list="companies-list"
                  value={formData.insuranceCompany}
                  onChange={(e) => setFormData({ ...formData, insuranceCompany: e.target.value })}
                  placeholder="Select or enter company..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <datalist id="companies-list">
                  {insuranceCompanies.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              {/* Policy Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Policy Type <span className="text-rose-500">*</span>
                </label>
                <select
                  value={formData.policyType}
                  onChange={(e) => setFormData({ ...formData, policyType: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {policyTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Coverage Duration */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              2. Coverage Period
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Start Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  End Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Financial Details */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              3. Commercial & Premium Valuation
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Premium Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Annual Premium (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    value={formData.premiumAmount || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, premiumAmount: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="45000"
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    required
                  />
                </div>
              </div>

              {/* IDV Amount */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Insured Declared Value (IDV) (₹)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.idvAmount || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, idvAmount: parseFloat(e.target.value) || 0 })
                    }
                    placeholder="1200000"
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Third Party Limit */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  TP Liability Limit (₹)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.thirdPartyLiabilityLimit || ''}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        thirdPartyLiabilityLimit: parseFloat(e.target.value) || 0,
                      })
                    }
                    placeholder="750000"
                    className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 4: Attachments & Remarks */}
          <div className="space-y-4 pt-2">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              4. Document & Additional Info
            </h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Policy Document File / URL
              </label>
              <input
                type="text"
                value={formData.policyDoc || ''}
                onChange={(e) => setFormData({ ...formData, policyDoc: e.target.value })}
                placeholder="/files/insurance_policy_sample.pdf"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Attach or provide the Frappe File URL for the digital certificate.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Remarks / Endorsements
              </label>
              <textarea
                value={formData.remarks || ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                rows={2}
                placeholder="Include deductible details, cashless garage clauses, or special endorsement notes..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Activate Now Toggle */}
            <div className="p-3.5 bg-blue-50/60 border border-blue-200/60 rounded-lg flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-blue-900">
                  Activate Immediately upon Creation
                </div>
                <div className="text-[11px] text-blue-700">
                  If selected, will transition to Active coverage and sync directly to Vehicle master.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.activateNow}
                  onChange={(e) => setFormData({ ...formData, activateNow: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <ShieldPlus className="w-4 h-4" />
                  Register Policy
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
