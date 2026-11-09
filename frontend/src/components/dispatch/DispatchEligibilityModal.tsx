'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Truck,
  User,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DispatchEligibilityResult } from '@/types/fleet';

interface DispatchEligibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  tripId: string;
  vehicle: string;
  driver: string;
  driverName?: string;
  mineSite: string;
  destination: string;
  openingOdometer?: number;
  onConfirmDispatch: (tripId: string) => Promise<void>;
}

export function DispatchEligibilityModal({
  isOpen,
  onClose,
  tripId,
  vehicle,
  driver,
  driverName,
  mineSite,
  destination,
  openingOdometer,
  onConfirmDispatch,
}: DispatchEligibilityModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [eligibility, setEligibility] = useState<DispatchEligibilityResult | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !vehicle || !driver) return;

    let isMounted = true;
    async function evaluate() {
      setLoading(true);
      setFetchError(null);
      try {
        const queryParams = new URLSearchParams({
          vehicle,
          driver,
        });
        if (openingOdometer != null) {
          queryParams.set('opening_odometer', String(openingOdometer));
        }

        const res = await fetch(`/api/dispatch/eligibility?${queryParams.toString()}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to verify statutory compliance.');
        }

        if (isMounted) {
          setEligibility(data.data);
        }
      } catch (err: any) {
        if (isMounted) {
          setFetchError(err.message || 'Error checking eligibility.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    evaluate();

    return () => {
      isMounted = false;
    };
  }, [isOpen, vehicle, driver, openingOdometer]);

  if (!isOpen) return null;

  const handleDispatch = async () => {
    if (!eligibility?.eligible) return;
    setSubmitting(true);
    try {
      await onConfirmDispatch(tripId);
      onClose();
    } catch (err: any) {
      setFetchError(err.message || 'Dispatch transition failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      data-testid="dispatch-eligibility-modal"
    >
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-900 border border-blue-200">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Statutory Compliance & Dispatch Gating
              </h2>
              <p className="text-xs text-slate-500 font-mono">Trip: {tripId}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 flex-1">
          {/* Trip Route Summary */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-700">
              <span className="font-semibold flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-blue-900" />
                Vehicle: {vehicle}
              </span>
              <span className="font-semibold flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-900" />
                Driver: {driverName || driver}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-500 pt-1 border-t border-slate-200">
              <span className="font-medium text-slate-800">{mineSite}</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="font-medium text-slate-800">{destination}</span>
            </div>
          </div>

          {loading ? (
            <div className="py-8 flex flex-col items-center justify-center text-slate-500 space-y-2">
              <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
              <span className="text-xs font-medium">
                Evaluating statutory documents and conflicting trips in Frappe...
              </span>
            </div>
          ) : fetchError ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div>
                <p className="font-semibold">Verification Error</p>
                <p className="mt-0.5">{fetchError}</p>
              </div>
            </div>
          ) : eligibility ? (
            <div className="space-y-3">
              {/* Overall Eligibility Status Banner */}
              {eligibility.eligible ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    All statutory and operational checks passed. Vehicle and driver are cleared for dispatch.
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-xs text-rose-800">
                  <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Dispatch Gating Blocked:</span>
                    <ul className="list-disc pl-4 mt-1 space-y-0.5 font-medium">
                      {eligibility.errors.map((err, idx) => (
                        <li key={idx}>{err}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Checklist */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
                  Mandatory Compliance Checklist
                </span>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white text-xs">
                  {eligibility.checks.map((chk, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          {chk.status === 'Pass' ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          )}
                          <span>{chk.item}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 pl-5">{chk.details}</p>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                          chk.status === 'Pass'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {chk.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-3">
          <Button type="button" onClick={onClose} variant="outline" size="md">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleDispatch}
            variant="primary"
            size="md"
            disabled={!eligibility?.eligible || submitting || loading}
            data-testid="btn-authorize-dispatch-confirm"
          >
            {submitting ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-4 h-4 animate-spin" /> Authorizing...
              </span>
            ) : (
              'Authorize Dispatch'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

