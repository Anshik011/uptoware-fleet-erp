'use client';

import React, { useState, useEffect } from 'react';
import { FuelLog } from '@/types/fleet';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Fuel,
  X,
  Truck,
  Gauge,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Clock,
  History,
} from 'lucide-react';

interface FuelLogDrawerProps {
  logId: string | null;
  onClose: () => void;
  onOpenApprovalModal: (log: FuelLog, action: 'Approve' | 'Reject' | 'Re-open') => void;
  canManage: boolean;
}

export function FuelLogDrawer({
  logId,
  onClose,
  onOpenApprovalModal,
  canManage,
}: FuelLogDrawerProps) {
  const [log, setLog] = useState<FuelLog | null>(null);
  const [recentLogs, setRecentLogs] = useState<FuelLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!logId) return;

    let ignore = false;
    async function loadDetails() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/fuel/${encodeURIComponent(logId!)}`);
        const json = await res.json();
        if (ignore) return;
        if (res.ok && json.success && json.data) {
          setLog(json.data.log);
          setRecentLogs(json.data.recentVehicleLogs || []);
        } else {
          setError(json.error || 'Failed to load fuel log details.');
        }
      } catch (err: unknown) {
        if (ignore) return;
        const msg = err instanceof Error ? err.message : 'Network error.';
        setError(msg);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadDetails();
    return () => {
      ignore = true;
    };
  }, [logId]);

  if (!logId) return null;

  function getStatusVariant(status: string): BadgeVariant {
    switch (status) {
      case 'Approved':
        return 'positive';
      case 'Draft':
        return 'warning';
      case 'Rejected':
        return 'critical';
      default:
        return 'neutral';
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-900">
              <Fuel className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 font-mono">
                  {logId}
                </h2>
                {log && (
                  <Badge variant={getStatusVariant(log.approvalStatus)} size="sm">
                    {log.approvalStatus}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-slate-500">
                {log ? `${log.vehicle} · Refuel on ${log.fuelDate}` : 'Loading...'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
              <p className="text-xs text-slate-500">Retrieving authoritative fuel records...</p>
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          ) : log ? (
            <>
              {/* Financial & Volume Hero Card */}
              <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/30 rounded-xl border border-slate-200 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Total Cost
                    </span>
                    <span className="text-2xl font-bold text-slate-900 font-mono">
                      ₹{log.totalCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5 font-mono">
                      @ ₹{log.ratePerLitre.toFixed(2)} / Litre
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Quantity Dispensed
                    </span>
                    <span className="text-2xl font-bold text-blue-900 font-mono">
                      {log.quantityLitres.toFixed(2)} L
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      {log.fuelSource} {log.isFullTank ? '· Full Tank' : '· Partial'}
                    </span>
                  </div>
                </div>

                {/* Interval KM/L Indicator */}
                <div className="pt-3 border-t border-slate-200/80">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-slate-500" />
                      Estimated Interval Efficiency
                    </span>
                    <span className="font-bold text-slate-900 font-mono">
                      {log.kmPerLitre && log.kmPerLitre > 0 ? `${log.kmPerLitre.toFixed(2)} KM/L` : 'Baseline / Indicative'}
                    </span>
                  </div>
                  {log.efficiencyNote && (
                    <p className="mt-1 text-[11px] text-slate-500 leading-relaxed bg-white/60 p-2 rounded-lg border border-slate-200/50">
                      {log.efficiencyNote}
                    </p>
                  )}
                </div>
              </div>

              {/* Asset & Location Specs */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Truck className="w-4 h-4 text-slate-500" />
                  Vehicle & Refuel Logistics
                </h3>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Vehicle License Plate</span>
                    <span className="font-bold text-slate-900 font-mono">{log.vehicle}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Assigned Operator</span>
                    <span className="font-semibold text-slate-900">
                      {log.driverName || log.driver || 'Unspecified'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Mine Site Location</span>
                    <span className="font-semibold text-slate-900">
                      {log.mineSiteName || log.mineSite || 'Central Yard / Bowser'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Station / Pump Reference</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {log.fuelStation || 'Mobile Bowser Station'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Odometer Progression */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Gauge className="w-4 h-4 text-slate-500" />
                  Odometer Progression Ledger
                </h3>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Current Odometer</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {log.odometerReading.toLocaleString('en-IN')} KM
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Previous Benchmark</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {log.previousOdometer ? `${log.previousOdometer.toLocaleString('en-IN')} KM` : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Interval Run</span>
                    <span className="font-bold text-blue-900 font-mono">
                      {log.distanceTravelled ? `${log.distanceTravelled.toLocaleString('en-IN')} KM` : '0 KM'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Workflow Audit Status */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Clock className="w-4 h-4 text-slate-500" />
                  Workflow & Audit Stamping
                </h3>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Payment Channel:</span>
                    <span className="font-semibold text-slate-900">
                      {log.paymentMethod || 'Company Card'}
                    </span>
                  </div>
                  {log.approvedBy && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Authorized By:</span>
                      <span className="font-semibold text-emerald-700">
                        {log.approvedBy} on {log.approvedOn}
                      </span>
                    </div>
                  )}
                  {log.rejectionReason && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 space-y-1">
                      <span className="font-bold block">Rejection Note:</span>
                      <p>{log.rejectionReason}</p>
                      {log.rejectedBy && (
                        <span className="text-[10px] text-rose-600 block">
                          Rejected by {log.rejectedBy} on {log.rejectedOn}
                        </span>
                      )}
                    </div>
                  )}
                  {log.remarks && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-400 block mb-0.5">Remarks:</span>
                      <span className="text-slate-700 italic">{log.remarks}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Vehicle Fuel Logs */}
              {recentLogs.length > 1 && (
                <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <History className="w-4 h-4 text-slate-500" />
                    Recent Refuels for {log.vehicle}
                  </h3>
                  <div className="divide-y divide-slate-100 text-xs">
                    {recentLogs.map((rl) => (
                      <div key={rl.id} className="py-2 flex items-center justify-between">
                        <div>
                          <span className="font-mono font-medium text-slate-800 block">
                            {rl.fuelDate} · {rl.quantityLitres} L
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {rl.odometerReading.toLocaleString('en-IN')} KM ({rl.fuelSource})
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-slate-900 block">
                            ₹{rl.totalCost.toLocaleString('en-IN')}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {rl.kmPerLitre && rl.kmPerLitre > 0 ? `${rl.kmPerLitre.toFixed(2)} KM/L` : 'Indicative'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Drawer Footer Actions */}
        {log && canManage && (
          <div className="p-4 border-t border-slate-200 bg-slate-50/50 flex items-center justify-between gap-3">
            {log.approvalStatus === 'Draft' ? (
              <div className="flex items-center gap-2 w-full justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  icon={XCircle}
                  onClick={() => onOpenApprovalModal(log, 'Reject')}
                  data-testid="btn-drawer-reject-fuel"
                >
                  Reject Entry
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={CheckCircle2}
                  onClick={() => onOpenApprovalModal(log, 'Approve')}
                  data-testid="btn-drawer-approve-fuel"
                >
                  Approve Fuel Log
                </Button>
              </div>
            ) : log.approvalStatus === 'Rejected' ? (
              <div className="flex items-center gap-2 w-full justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenApprovalModal(log, 'Re-open')}
                  data-testid="btn-drawer-reopen-fuel"
                >
                  Re-open to Draft
                </Button>
              </div>
            ) : (
              <div className="text-xs text-slate-500 font-medium w-full text-right">
                Certified & Approved · Immutable Record
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

