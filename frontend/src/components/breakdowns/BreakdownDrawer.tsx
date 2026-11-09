'use client';

import React, { useState, useEffect } from 'react';
import { VehicleBreakdown, RepairStatus, BreakdownSeverity } from '@/types/fleet';
import { Badge, BadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Wrench,
  X,
  Truck,
  User,
  MapPin,
  Calendar,
  Clock,
  Gauge,
  AlertTriangle,
  Building2,
  FileText,
  IndianRupee,
  Layers,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Package,
} from 'lucide-react';

interface BreakdownDrawerProps {
  breakdownId: string | null;
  onClose: () => void;
  onOpenWorkflowModal: (breakdown: VehicleBreakdown, action: string) => void;
  canManage: boolean;
}

export function BreakdownDrawer({
  breakdownId,
  onClose,
  onOpenWorkflowModal,
  canManage,
}: BreakdownDrawerProps) {
  const [breakdown, setBreakdown] = useState<VehicleBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!breakdownId) {
      setBreakdown(null);
      return;
    }

    let ignore = false;
    async function loadDetails() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/breakdowns/${encodeURIComponent(breakdownId!)}`);
        const json = await res.json();
        if (ignore) return;
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to fetch breakdown details.');
        }
        setBreakdown(json.breakdown);
      } catch (err: unknown) {
        if (ignore) return;
        const msg = err instanceof Error ? err.message : 'Error loading details.';
        setError(msg);
      } finally {
        if (!ignore) setIsLoading(false);
      }
    }

    loadDetails();
    return () => {
      ignore = true;
    };
  }, [breakdownId]);

  if (!breakdownId) return null;

  function getStatusBadgeVariant(status: RepairStatus): BadgeVariant {
    switch (status) {
      case 'Closed':
        return 'positive';
      case 'Repaired':
        return 'info';
      case 'In Workshop':
        return 'warning';
      case 'Awaiting Parts':
        return 'critical';
      case 'Approved':
        return 'info';
      case 'Reported':
      default:
        return 'neutral';
    }
  }

  function getSeverityBadgeVariant(sev: BreakdownSeverity): BadgeVariant {
    switch (sev) {
      case 'Critical':
        return 'critical';
      case 'Medium':
        return 'warning';
      case 'Low':
      default:
        return 'neutral';
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end"
      data-testid="drawer-breakdown-details"
    >
      <div className="bg-white w-full max-w-2xl h-full shadow-2xl flex flex-col justify-between overflow-y-auto">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-base font-bold text-blue-900">
                {breakdownId}
              </span>
              {breakdown && (
                <>
                  <Badge variant={getSeverityBadgeVariant(breakdown.severity)}>
                    {breakdown.severity}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(breakdown.repairStatus)}>
                    {breakdown.repairStatus}
                  </Badge>
                </>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Vehicle Breakdown Incident & Workshop Maintenance Dossier
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 flex-1">
          {isLoading && (
            <div className="py-16 text-center text-slate-500 text-sm">
              Loading breakdown and workshop repair data...
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {breakdown && !isLoading && (
            <>
              {/* Rejection notice if present */}
              {breakdown.rejectionReason && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-rose-900 font-semibold text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Incident Rejected / Work Halted</span>
                  </div>
                  <p className="text-xs text-rose-800 pl-6">{breakdown.rejectionReason}</p>
                </div>
              )}

              {/* Section 1: Vehicle & Operational Attribution */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-slate-500" />
                  Vehicle & Operational Attribution
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Vehicle</span>
                    <span className="font-mono font-bold text-slate-900">{breakdown.vehicle}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Assigned Driver</span>
                    <span className="text-slate-900">
                      {breakdown.driverName || breakdown.driver || 'None / Unassigned'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Mine Site</span>
                    <span className="text-slate-900">
                      {breakdown.mineSiteName || breakdown.mineSite || 'On-road / Transit'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Incident Date & Time</span>
                    <span className="font-mono text-slate-900">
                      {breakdown.breakdownDate} {breakdown.breakdownTime || ''}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Location</span>
                    <span className="text-slate-900">{breakdown.breakdownLocation || '—'}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Odometer at Incident</span>
                    <span className="font-mono font-bold text-slate-900">
                      {breakdown.odometerReading
                        ? `${breakdown.odometerReading.toLocaleString('en-IN')} KM`
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 2: Technical Breakdown & Workshop Assignment */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-slate-500" />
                  Diagnostic & Workshop Information
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Breakdown Type</span>
                    <span className="font-semibold text-slate-900">{breakdown.breakdownType}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Assigned Workshop</span>
                    <span className="text-slate-900">
                      {breakdown.assignedWorkshopName || breakdown.assignedWorkshop || 'Internal Workshop'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Reported By</span>
                    <span className="text-slate-900">{breakdown.reportedByName || breakdown.reportedBy || '—'}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Downtime Duration</span>
                    <span className="font-mono font-bold text-rose-700">
                      {breakdown.downtimeHours.toFixed(1)} Hours
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Repair Started</span>
                    <span className="font-mono text-slate-900">
                      {breakdown.repairStartDate
                        ? `${breakdown.repairStartDate} ${breakdown.repairStartTime || ''}`
                        : 'Pending workshop admission'}
                    </span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[11px]">Repair Completed</span>
                    <span className="font-mono text-slate-900">
                      {breakdown.repairCompletedDate
                        ? `${breakdown.repairCompletedDate} ${breakdown.repairCompletedTime || ''}`
                        : 'In progress'}
                    </span>
                  </div>
                </div>

                {breakdown.description && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Observed Symptoms / Failure Description
                    </span>
                    <p className="text-xs text-slate-800 mt-0.5 whitespace-pre-wrap">
                      {breakdown.description}
                    </p>
                  </div>
                )}

                {breakdown.repairDetails && (
                  <div className="pt-2 border-t border-slate-100">
                    <span className="text-[11px] font-semibold text-slate-500 block">
                      Workshop Action & Diagnostic Details
                    </span>
                    <p className="text-xs text-slate-800 mt-0.5 whitespace-pre-wrap">
                      {breakdown.repairDetails}
                    </p>
                  </div>
                )}
              </div>

              {/* Section 3: Parts & Materials Consumed (Child Table) */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-4 h-4 text-slate-500" />
                    Spare Parts & Materials Consumed
                  </div>
                  <span className="text-[11px] text-slate-500 font-mono">
                    {breakdown.parts.length} line item(s)
                  </span>
                </div>

                {breakdown.parts.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400 bg-slate-50 rounded-lg">
                    No spare parts or consumable materials logged for this repair.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-lg">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase">
                        <tr>
                          <th className="py-2 px-3">Item</th>
                          <th className="py-2 px-3 text-right">Qty</th>
                          <th className="py-2 px-3 text-right">Rate</th>
                          <th className="py-2 px-3 text-right">Amount (₹)</th>
                          <th className="py-2 px-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {breakdown.parts.map((p, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-sans">
                              <span className="font-semibold text-slate-900 block">{p.itemCode}</span>
                              {p.itemName && p.itemName !== p.itemCode && (
                                <span className="text-[11px] text-slate-500 block">{p.itemName}</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {(p.issuedQty != null && p.issuedQty > 0) ? p.issuedQty : p.plannedQty} {p.stockUom || ''}
                            </td>
                            <td className="py-2 px-3 text-right">₹{(p.rate || 0).toFixed(2)}</td>
                            <td className="py-2 px-3 text-right font-bold text-slate-900">
                              ₹{(p.amount || 0).toFixed(2)}
                            </td>
                            <td className="py-2 px-3 text-right font-sans">
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                                  p.status === 'Issued'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : p.status === 'Partially Issued'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {p.status || 'Planned'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Section 4: Cost Analysis */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                  <IndianRupee className="w-4 h-4 text-slate-500" />
                  Maintenance Expenditure Breakdown
                </div>

                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-right">
                    <span className="text-slate-500 block text-[11px]">Parts Cost</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      ₹{breakdown.partsCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-right">
                    <span className="text-slate-500 block text-[11px]">Labor Cost</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      ₹{breakdown.laborCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-right">
                    <span className="text-slate-500 block text-[11px]">Total Cost</span>
                    <span className="font-mono font-bold text-blue-900 text-sm">
                      ₹{breakdown.totalCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Section 5: Audit & Compliance */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 text-[11px] text-slate-500 space-y-1 font-mono">
                <div>Created: {breakdown.creation || '—'}</div>
                <div>Last Modified: {breakdown.modified || '—'}</div>
                {breakdown.approvedBy && (
                  <div>
                    Approved By: {breakdown.approvedBy} on {breakdown.approvedOn || '—'}
                  </div>
                )}
                {breakdown.closedBy && (
                  <div>
                    Closed By: {breakdown.closedBy} on {breakdown.closedOn || '—'}
                  </div>
                )}
                {breakdown.isTestRecord ? (
                  <div className="text-amber-600 font-bold">Quarantined QA Test Record</div>
                ) : null}
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between sticky bottom-0 z-10">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Drawer
          </Button>

          {canManage && breakdown && (
            <div className="flex items-center gap-2">
              {breakdown.repairStatus === 'Reported' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onOpenWorkflowModal(breakdown, 'Reject')}
                    className="text-rose-600 border-rose-200 hover:bg-rose-50"
                  >
                    Reject
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onOpenWorkflowModal(breakdown, 'Approve')}
                  >
                    Approve
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onOpenWorkflowModal(breakdown, 'Send to Workshop')}
                  >
                    Send to Workshop
                  </Button>
                </>
              )}

              {breakdown.repairStatus === 'Approved' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onOpenWorkflowModal(breakdown, 'Send to Workshop')}
                >
                  Send to Workshop
                </Button>
              )}

              {breakdown.repairStatus === 'In Workshop' && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onOpenWorkflowModal(breakdown, 'Request Parts')}
                  >
                    Request Parts
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onOpenWorkflowModal(breakdown, 'Mark Repaired')}
                  >
                    Mark Repaired
                  </Button>
                </>
              )}

              {breakdown.repairStatus === 'Awaiting Parts' && (
                <>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => onOpenWorkflowModal(breakdown, 'Parts Received')}
                  >
                    Parts Received
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => onOpenWorkflowModal(breakdown, 'Mark Repaired')}
                  >
                    Mark Repaired
                  </Button>
                </>
              )}

              {breakdown.repairStatus === 'Repaired' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => onOpenWorkflowModal(breakdown, 'Close Breakdown')}
                >
                  Close Breakdown
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
