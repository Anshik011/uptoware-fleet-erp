'use client';

import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertCircle, Shield, Calendar, IndianRupee } from 'lucide-react';
import { VehicleInsurancePolicy, RenewInsurancePolicyInput } from '@/types/fleet';

interface RenewPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  policy: VehicleInsurancePolicy | null;
}

export function RenewPolicyModal({
  isOpen,
  onClose,
  onSuccess,
  policy,
}: RenewPolicyModalProps) {
  const [formData, setFormData] = useState<RenewInsurancePolicyInput>({
    policyName: '',
    newPolicyNo: '',
    startDate: '',
    endDate: '',
    premiumAmount: 0,
    insuranceCompany: '',
    remarks: '',
    activateNow: false,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (policy && isOpen) {
      setError(null);
      // Next day after old end date, or today if overdue
      let nextStart = policy.endDate;
      try {
        const d = new Date(policy.endDate);
        d.setDate(d.getDate() + 1);
        nextStart = d.toISOString().split('T')[0];
      } catch (e) {
        nextStart = new Date().toISOString().split('T')[0];
      }

      const nextEnd = new Date(new Date(nextStart).getTime() + 365 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      setFormData({
        policyName: policy.name,
        newPolicyNo: `${policy.policyNo}-R1`,
        startDate: nextStart,
        endDate: nextEnd,
        premiumAmount: policy.premiumAmount || 0,
        insuranceCompany: policy.insuranceCompany || '',
        remarks: `Renewal of policy ${policy.policyNo}`,
        activateNow: false,
      });
    }
  }, [policy, isOpen]);

  if (!isOpen || !policy) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.newPolicyNo.trim()) {
      setError('New renewal policy number is required.');
      return;
    }
    if (!formData.startDate || !formData.endDate) {
      setError('Renewal start and end dates are required.');
      return;
    }
    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      setError('Renewal end date must be strictly after the start date.');
      return;
    }
    if (formData.premiumAmount <= 0) {
      setError('Premium amount must be a positive number.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/insurance/policies/${encodeURIComponent(policy.id)}/renew`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to renew insurance policy.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error processing policy renewal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl my-8 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Renew Insurance Policy</h2>
              <p className="text-xs text-slate-500">
                Create a linked successor policy for vehicle{' '}
                <span className="font-semibold text-slate-700">{policy.vehicle}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Policy Context Banner */}
        <div className="px-6 py-3 bg-slate-100 border-b border-slate-200 text-xs text-slate-600 flex items-center justify-between">
          <div>
            <span className="text-slate-400">Expiring Policy: </span>
            <span className="font-bold text-slate-800 font-mono">{policy.policyNo}</span>
          </div>
          <div>
            <span className="text-slate-400">Current End Date: </span>
            <span className="font-semibold text-slate-800 font-mono">{policy.endDate}</span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* New Policy No */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                New Policy Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.newPolicyNo}
                onChange={(e) => setFormData({ ...formData, newPolicyNo: e.target.value })}
                placeholder="POL-2027-..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono uppercase"
                required
              />
            </div>

            {/* Insurance Company */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Insurer Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={formData.insuranceCompany}
                onChange={(e) => setFormData({ ...formData, insuranceCompany: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Start Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Renewal Start Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Renewal End Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Premium */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Renewal Premium (₹) <span className="text-rose-500">*</span>
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
                className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                required
              />
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Renewal Remarks
            </label>
            <textarea
              value={formData.remarks || ''}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Activate Immediately */}
          <div className="p-3.5 bg-blue-50/60 border border-blue-200/60 rounded-lg flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-blue-900">
                Activate Policy Immediately
              </div>
              <div className="text-[11px] text-blue-700">
                Transitions directly to Active and links to vehicle. If unchecked, created as Draft.
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

          {/* Actions */}
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
                  Renewing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4" />
                  Execute Renewal
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

