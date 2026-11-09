'use client';

import React, { useState } from 'react';
import { VehicleBreakdown, BreakdownWorkflowAction } from '@/types/fleet';
import { Button } from '@/components/ui/Button';
import {
  Wrench,
  X,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  PackageCheck,
  FileCheck2,
} from 'lucide-react';

interface BreakdownWorkflowModalProps {
  isOpen: boolean;
  breakdown: VehicleBreakdown;
  defaultAction?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function BreakdownWorkflowModal({
  isOpen,
  breakdown,
  defaultAction,
  onClose,
  onSuccess,
}: BreakdownWorkflowModalProps) {
  const [selectedAction, setSelectedAction] = useState<BreakdownWorkflowAction>(
    (defaultAction as BreakdownWorkflowAction) || 'Send to Workshop'
  );
  const [repairDetails, setRepairDetails] = useState(breakdown.repairDetails || '');
  const [laborCost, setLaborCost] = useState(
    breakdown.laborCost > 0 ? String(breakdown.laborCost) : ''
  );
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Compute available actions based on current breakdown repair_status
  let availableActions: BreakdownWorkflowAction[] = [];
  switch (breakdown.repairStatus) {
    case 'Reported':
      availableActions = ['Approve', 'Send to Workshop', 'Reject'];
      break;
    case 'Approved':
      availableActions = ['Send to Workshop', 'Reject'];
      break;
    case 'In Workshop':
      availableActions = ['Request Parts', 'Mark Repaired'];
      break;
    case 'Awaiting Parts':
      availableActions = ['Parts Received', 'Mark Repaired'];
      break;
    case 'Repaired':
      availableActions = ['Close Breakdown'];
      break;
    default:
      availableActions = [];
  }

  // Ensure selected action is valid
  const currentAction = availableActions.includes(selectedAction)
    ? selectedAction
    : availableActions[0] || 'Send to Workshop';

  async function handleConfirm() {
    setError(null);

    if (currentAction === 'Reject' && !rejectionReason.trim()) {
      setError('A rejection reason is strictly required when rejecting a breakdown incident.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(
        `/api/breakdowns/${encodeURIComponent(breakdown.id)}/transition`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: currentAction,
            repairDetails: repairDetails.trim() || undefined,
            laborCost: laborCost ? Number(laborCost) : undefined,
            rejectionReason: rejectionReason.trim() || undefined,
          }),
        }
      );

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to execute breakdown workflow transition.');
      }

      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Workflow transition error.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      data-testid="modal-breakdown-workflow"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <Wrench className="w-4 h-4 text-blue-900" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">
                Update Maintenance Status
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {breakdown.id} • {breakdown.vehicle} ({breakdown.repairStatus})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Action Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Workflow Transition Action
            </label>
            <div className="grid grid-cols-2 gap-2">
              {availableActions.map((act) => (
                <button
                  key={act}
                  type="button"
                  onClick={() => setSelectedAction(act)}
                  className={`px-3 py-2 text-xs font-semibold rounded-lg border text-left transition-all ${
                    currentAction === act
                      ? 'border-blue-600 bg-blue-50 text-blue-900 shadow-xs'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {act}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Action Fields */}
          {currentAction === 'Reject' && (
            <div>
              <label className="block text-xs font-semibold text-rose-700 mb-1">
                Rejection Reason <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Explain why this breakdown incident is rejected or invalid..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                required
                data-testid="input-breakdown-rejection-reason"
                className="w-full px-3 py-2 bg-rose-50/50 border border-rose-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-600 focus:border-rose-600"
              />
            </div>
          )}

          {(currentAction === 'Mark Repaired' || currentAction === 'Send to Workshop') && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Diagnosis & Repair Details
                </label>
                <textarea
                  rows={2}
                  placeholder="Record workshop actions, diagnostic steps, repairs carried out..."
                  value={repairDetails}
                  onChange={(e) => setRepairDetails(e.target.value)}
                  data-testid="input-breakdown-repair-details"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              {currentAction === 'Mark Repaired' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Labor Cost (₹)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="e.g. 3500"
                    value={laborCost}
                    onChange={(e) => setLaborCost(e.target.value)}
                    data-testid="input-breakdown-labor-cost"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              )}
            </div>
          )}

          {/* Action Context Explanation */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-blue-900 shrink-0 mt-0.5" />
            <div>
              {currentAction === 'Send to Workshop' && (
                <span>
                  Moves incident to <strong>In Workshop</strong> and locks vehicle eligibility from active dispatch until completed.
                </span>
              )}
              {currentAction === 'Request Parts' && (
                <span>
                  Sets status to <strong>Awaiting Parts</strong>, flagging requisition bottleneck for workshop inventory.
                </span>
              )}
              {currentAction === 'Parts Received' && (
                <span>
                  Returns status to <strong>In Workshop</strong> indicating spare components are now available.
                </span>
              )}
              {currentAction === 'Mark Repaired' && (
                <span>
                  Calculates total downtime hours, finalizes labor/parts expenditure, and marks status as <strong>Repaired</strong>.
                </span>
              )}
              {currentAction === 'Close Breakdown' && (
                <span>
                  Restores vehicle operational status to <strong>Active</strong> and closes maintenance file permanently.
                </span>
              )}
              {currentAction === 'Approve' && (
                <span>
                  Formally approves incident logging for workshop repair scheduling.
                </span>
              )}
              {currentAction === 'Reject' && (
                <span>
                  Rejects breakdown and requires documented justification.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={currentAction === 'Reject' ? 'danger' : 'primary'}
            size="md"
            onClick={handleConfirm}
            disabled={isSubmitting}
            data-testid="btn-confirm-breakdown-workflow"
          >
            {isSubmitting ? 'Processing...' : `Confirm: ${currentAction}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

