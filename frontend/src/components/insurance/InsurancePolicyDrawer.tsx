'use client';

import React, { useState } from 'react';
import {
  X,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Calendar,
  IndianRupee,
  FileText,
  Truck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  AlertTriangle,
  ExternalLink,
  History,
  Building,
} from 'lucide-react';
import { VehicleInsurancePolicy } from '@/types/fleet';

interface InsurancePolicyDrawerProps {
  policy: VehicleInsurancePolicy | null;
  isOpen: boolean;
  onClose: () => void;
  onActivate?: (policy: VehicleInsurancePolicy) => Promise<void>;
  onCancel?: (policy: VehicleInsurancePolicy, reason: string) => Promise<void>;
  onRenew?: (policy: VehicleInsurancePolicy) => void;
}

export function InsurancePolicyDrawer({
  policy,
  isOpen,
  onClose,
  onActivate,
  onCancel,
  onRenew,
}: InsurancePolicyDrawerProps) {
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !policy) return null;

  const handleActivate = async () => {
    if (!onActivate) return;
    setIsSubmitting(true);
    try {
      await onActivate(policy);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason.trim()) {
      setCancelError('A cancellation reason is strictly mandatory.');
      return;
    }
    if (!onCancel) return;

    setIsSubmitting(true);
    setCancelError(null);
    try {
      await onCancel(policy, cancelReason.trim());
      setShowCancelPrompt(false);
      setCancelReason('');
    } catch (err: any) {
      setCancelError(err.message || 'Failed to cancel policy.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = () => {
    if (policy.policyStatus === 'Active') {
      if (policy.expiryUrgency === 'expiring_soon') {
        return {
          label: `Expiring Soon (${policy.daysRemaining} days left)`,
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
        };
      }
      if (policy.expiryUrgency === 'expired') {
        return {
          label: 'Lapsed Coverage',
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          dot: 'bg-rose-500',
        };
      }
      return {
        label: 'Active Coverage',
        bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
        dot: 'bg-emerald-500',
      };
    }
    if (policy.policyStatus === 'Draft') {
      return {
        label: 'Draft / Unapproved',
        bg: 'bg-slate-100 text-slate-700 border-slate-300',
        dot: 'bg-slate-400',
      };
    }
    if (policy.policyStatus === 'Cancelled') {
      return {
        label: 'Cancelled Policy',
        bg: 'bg-rose-100 text-rose-700 border-rose-300',
        dot: 'bg-rose-400',
      };
    }
    return {
      label: 'Expired',
      bg: 'bg-slate-200 text-slate-800 border-slate-400',
      dot: 'bg-slate-500',
    };
  };

  const statusBadge = getStatusBadge();

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-semibold text-slate-500">
                  {policy.name}
                </span>
                {policy.isRenewal && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    RENEWAL
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1 font-mono tracking-tight">
                {policy.policyNo}
              </h2>
              <div className="mt-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadge.bg}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
                  {statusBadge.label}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Vehicle & Insurer Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  Assigned Vehicle
                </span>
                <p className="text-base font-bold text-slate-900 mt-1 font-mono">{policy.vehicle}</p>
                {policy.vehiclePlate && (
                  <p className="text-xs text-slate-500 font-mono mt-0.5">{policy.vehiclePlate}</p>
                )}
              </div>
              <div>
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  Insurance Provider
                </span>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {policy.insuranceCompany}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">{policy.policyType}</p>
              </div>
            </div>

            {/* Coverage Period & Urgency */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-400" />
                Coverage Horizon
              </h3>
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <span className="text-xs text-slate-500">Effective Start Date</span>
                  <p className="text-sm font-semibold text-slate-800 font-mono mt-0.5">
                    {policy.startDate}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Policy Expiration Date</span>
                  <p className="text-sm font-semibold text-slate-800 font-mono mt-0.5">
                    {policy.endDate}
                  </p>
                </div>
              </div>

              {policy.daysRemaining !== undefined && (
                <div
                  className={`mt-2 p-2.5 rounded-lg text-xs font-medium border ${
                    policy.daysRemaining > 30
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : policy.daysRemaining > 0
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : 'bg-rose-50 text-rose-800 border-rose-200'
                  }`}
                >
                  {policy.daysRemaining > 0
                    ? `Policy remains active for ${policy.daysRemaining} days.`
                    : policy.daysRemaining === 0
                    ? 'Policy reaches final expiration today.'
                    : `Coverage expired ${Math.abs(policy.daysRemaining)} days ago.`}
                </div>
              )}
            </div>

            {/* Financial & Valuation Breakdown */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <IndianRupee className="w-4 h-4 text-slate-400" />
                Financial Valuation
              </h3>
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500 block">Annual Premium</span>
                  <span className="text-sm font-bold text-slate-900 font-mono block mt-1">
                    ₹{policy.premiumAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500 block">Insured IDV</span>
                  <span className="text-sm font-bold text-slate-900 font-mono block mt-1">
                    {policy.idvAmount > 0
                      ? `₹${policy.idvAmount.toLocaleString('en-IN')}`
                      : 'N/A'}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-[11px] font-medium text-slate-500 block">TP Liability</span>
                  <span className="text-sm font-bold text-slate-900 font-mono block mt-1">
                    {policy.thirdPartyLiabilityLimit
                      ? `₹${policy.thirdPartyLiabilityLimit.toLocaleString('en-IN')}`
                      : 'Statutory'}
                  </span>
                </div>
              </div>
            </div>

            {/* Renewal Lineage */}
            {(policy.previousPolicy || policy.isRenewal) && (
              <div className="border border-slate-200 rounded-xl p-4 space-y-2 bg-indigo-50/40">
                <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-4 h-4 text-indigo-600" />
                  Policy Lineage & Chaining
                </h3>
                <div className="text-xs text-indigo-950 space-y-1 pt-1">
                  {policy.previousPolicy && (
                    <div className="flex items-center gap-2">
                      <span className="text-indigo-600 font-medium">Predecessor Policy:</span>
                      <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-indigo-200">
                        {policy.previousPolicyNo || policy.previousPolicy}
                      </span>
                    </div>
                  )}
                  <p className="text-[11px] text-indigo-700">
                    This policy is a successor contract. Prior coverage was seamlessly superseded.
                  </p>
                </div>
              </div>
            )}

            {/* Document Certificate */}
            <div className="border border-slate-200 rounded-xl p-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <FileText className="w-4 h-4 text-slate-400" />
                Policy Document & Certificate
              </h3>
              {policy.policyDoc ? (
                <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="text-xs font-mono font-medium text-blue-900 truncate">
                      {policy.policyDoc}
                    </span>
                  </div>
                  <a
                    href={policy.policyDoc}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-white hover:bg-blue-100 border border-blue-300 rounded flex items-center gap-1 shrink-0 transition-colors"
                  >
                    View Document <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No digital certificate uploaded.</p>
              )}
            </div>

            {/* Audit Trail & Approvals */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-2 text-xs text-slate-600">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Audit Log & Status Changes
              </h3>
              {policy.approvedBy && (
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Approved / Activated By:</span>
                  <span className="font-medium text-slate-800">
                    {policy.approvedBy} on {policy.approvedOn || 'N/A'}
                  </span>
                </div>
              )}
              {policy.cancelledBy && (
                <div className="py-1 border-b border-slate-100 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-rose-600 font-semibold">Cancelled By:</span>
                    <span className="font-medium text-slate-800">
                      {policy.cancelledBy} on {policy.cancelledOn || 'N/A'}
                    </span>
                  </div>
                  {policy.cancellationReason && (
                    <div className="bg-rose-50 p-2 rounded border border-rose-200 text-rose-800 mt-1">
                      <span className="font-bold">Reason: </span>
                      {policy.cancellationReason}
                    </div>
                  )}
                </div>
              )}
              {policy.remarks && (
                <div className="pt-1">
                  <span className="text-slate-500 block mb-0.5">Remarks:</span>
                  <p className="text-slate-700 bg-slate-50 p-2 rounded border border-slate-200">
                    {policy.remarks}
                  </p>
                </div>
              )}
            </div>

            {/* Inline Cancellation Prompt */}
            {showCancelPrompt && (
              <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Confirm Policy Cancellation
                </div>
                <p className="text-xs text-rose-700">
                  A cancellation reason is required for regulatory audit trails. Once cancelled, this policy cannot be reactivated.
                </p>
                {cancelError && (
                  <p className="text-xs font-semibold text-rose-800">{cancelError}</p>
                )}
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Enter detailed reason for cancellation (e.g. Asset decommissioned, provider switch)..."
                  rows={2}
                  className="w-full p-2.5 text-xs bg-white border border-rose-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCancelPrompt(false);
                      setCancelReason('');
                      setCancelError(null);
                    }}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-white rounded border border-slate-300"
                  >
                    Dismiss
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmCancel}
                    disabled={isSubmitting}
                    className="px-3 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Cancelling...' : 'Confirm Cancellation'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Drawer Footer Actions */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {policy.policyStatus === 'Active' && !showCancelPrompt && onCancel && (
                <button
                  type="button"
                  onClick={() => setShowCancelPrompt(true)}
                  className="px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  Cancel Policy
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {policy.policyStatus === 'Draft' && onActivate && (
                <button
                  type="button"
                  onClick={handleActivate}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting ? 'Activating...' : 'Activate Policy'}
                </button>
              )}

              {(policy.policyStatus === 'Active' || policy.policyStatus === 'Expired') && onRenew && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onRenew(policy);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Renew Policy
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

