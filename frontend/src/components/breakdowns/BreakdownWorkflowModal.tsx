'use client';

import React, { useState, useMemo } from 'react';
import { VehicleBreakdown, BreakdownWorkflowAction } from '@/types/fleet';
import { formatVehicleDisplay } from '@/lib/displayFormatters';
import {
  BREAKDOWN_15_STAGES,
  parseBreakdownStageState,
  serializeBreakdownStageState,
  StageHistoryEntry,
} from '@/lib/breakdownStages';
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
  const [inspectionNotes, setInspectionNotes] = useState(breakdown.inspectionNotes || '');
  const [partsAvailabilityStatus, setPartsAvailabilityStatus] = useState(
    breakdown.partsAvailabilityStatus || 'In Stock'
  );
  const [purchaseRequest, setPurchaseRequest] = useState(breakdown.purchaseRequest || '');
  const [purchaseAuthorizedBy, setPurchaseAuthorizedBy] = useState(breakdown.purchaseAuthorizedBy || '');
  const [deliveryPersonName, setDeliveryPersonName] = useState(breakdown.deliveryPersonName || '');
  const [deliveryChallanNo, setDeliveryChallanNo] = useState(breakdown.deliveryChallanNo || '');
  const [repairCompletionEvidence, setRepairCompletionEvidence] = useState(
    breakdown.repairCompletionEvidence || ''
  );
  const [acknowledgementSignature, setAcknowledgementSignature] = useState(
    breakdown.acknowledgementSignature || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stageState = useMemo(() => parseBreakdownStageState(breakdown), [breakdown]);
  const currentStageDef = BREAKDOWN_15_STAGES[stageState.currentStage - 1] || BREAKDOWN_15_STAGES[0];
  const nextStageDef =
    stageState.currentStage < 17 ? BREAKDOWN_15_STAGES[stageState.currentStage] : null;
  const [stageNote, setStageNote] = useState('');
  const [evidencePhotoUrl, setEvidencePhotoUrl] = useState(breakdown.breakdownEvidenceImage || '');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [verifyingPo, setVerifyingPo] = useState(false);
  const [verifiedPoInfo, setVerifiedPoInfo] = useState<{
    name: string;
    supplier: string;
    status: string;
    grandTotal: number;
  } | null>(null);
  const [poVerifyError, setPoVerifyError] = useState<string | null>(null);
  const [poMode, setPoMode] = useState<'create' | 'verify'>('verify');

  const isRepairApproved =
    breakdown.repairStatus === 'Approved' ||
    breakdown.repairStatus === 'Awaiting Parts' ||
    stageState.currentStage >= 7 ||
    Boolean(stageState.history[7]);

  if (!isOpen) return null;

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/documents/upload', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data?.fileUrl) {
        throw new Error(json.error || 'Failed to upload breakdown photo.');
      }
      setEvidencePhotoUrl(json.data.fileUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Photo upload error.');
    } finally {
      setIsUploadingPhoto(false);
    }
  }

  async function handleAdvanceSingleStage() {
    if (!nextStageDef) return;
    setError(null);
    const effectivePhoto = (evidencePhotoUrl || breakdown.breakdownEvidenceImage || '').trim();
    if ((nextStageDef.stage === 5 || nextStageDef.stage === 7) && !effectivePhoto) {
      setError(
        nextStageDef.stage === 7
          ? 'Approval without photo evidence is not allowed. Please upload breakdown photo evidence first.'
          : 'Photo evidence is mandatory for Stage 05 (Breakdown Reason).'
      );
      return;
    }
    setIsSubmitting(true);
    try {
      const now = new Date();
      const timeStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(
        2,
        '0'
      )}-${now.getFullYear()} ${now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;
      const newStage = nextStageDef.stage;
      const updatedHistory: Record<number, StageHistoryEntry> = {
        ...stageState.history,
        [newStage]: {
          stage: newStage,
          title: nextStageDef.title,
          time: timeStr,
          actor: nextStageDef.actorRole,
          note: stageNote.trim() || `${nextStageDef.title} completed`,
        },
      };
      const serializedNotes = serializeBreakdownStageState(
        stageState.plainInspectionNotes,
        newStage,
        updatedHistory
      );

      const patchRes = await fetch(`/api/breakdowns/${encodeURIComponent(breakdown.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inspectionNotes: serializedNotes,
          breakdownEvidenceImage: effectivePhoto || undefined,
        }),
      });
      const patchJson = await patchRes.json();
      if (!patchRes.ok || !patchJson.success) {
        throw new Error(patchJson.error || `Failed to advance to Stage ${newStage}`);
      }

      const status = breakdown.repairStatus;
      let workflowActionToRun: string | null = null;
      if (newStage === 2 && status === 'Reported') workflowActionToRun = 'Send to Workshop';
      else if (newStage === 7 && status === 'Reported') workflowActionToRun = 'Approve';
      else if (newStage === 8 && status === 'In Workshop') workflowActionToRun = 'Request Parts';
      else if (newStage === 10 && status === 'Awaiting Parts') workflowActionToRun = 'Parts Received';
      else if (newStage === 12 && (status === 'In Workshop' || status === 'Awaiting Parts'))
        workflowActionToRun = 'Mark Repaired';
      else if (newStage === 15 && status === 'Repaired') workflowActionToRun = 'Close Breakdown';

      if (workflowActionToRun) {
        await fetch(`/api/breakdowns/${encodeURIComponent(breakdown.id)}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: workflowActionToRun,
            inspectionNotes: serializedNotes,
          }),
        });
      }
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to advance stage.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

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

    if (currentAction === 'Approve' && !(evidencePhotoUrl || breakdown.breakdownEvidenceImage || '').trim()) {
      setError('Approval without photo evidence is not allowed. Please upload breakdown photo evidence first (Stage 05).');
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
            inspectionNotes: inspectionNotes.trim() || undefined,
            partsAvailabilityStatus: partsAvailabilityStatus || undefined,
            purchaseRequest: purchaseRequest.trim() || undefined,
            purchaseAuthorizedBy: purchaseAuthorizedBy.trim() || undefined,
            deliveryPersonName: deliveryPersonName.trim() || undefined,
            deliveryChallanNo: deliveryChallanNo.trim() || undefined,
            repairCompletionEvidence: repairCompletionEvidence.trim() || undefined,
            acknowledgementSignature: acknowledgementSignature.trim() || undefined,
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
              <p className="text-xs text-slate-500">
                {breakdown.breakdownType} • {formatVehicleDisplay(breakdown.vehicle)} ({breakdown.repairStatus})
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
          {nextStageDef && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-lg space-y-2.5">
              <div className="flex flex-col gap-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-900">
                    Current Stage: {currentStageDef.num}. {currentStageDef.title}
                  </span>
                  <span className="text-[11px] font-mono text-blue-700">
                    {stageState.currentStage} / 15
                  </span>
                </div>
                <span className="font-semibold text-amber-800">
                  Next Stage: {nextStageDef.num}. {nextStageDef.title}
                </span>
              </div>
              {(nextStageDef.stage === 5 || nextStageDef.stage === 7 || !(evidencePhotoUrl || breakdown.breakdownEvidenceImage)) && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 bg-white px-2.5 py-1.5 rounded border border-blue-200 text-xs">
                    <span className="text-slate-600 font-medium">
                      Photo Evidence {(nextStageDef.stage === 5 || nextStageDef.stage === 7) ? <span className="text-rose-600 font-bold">(Mandatory *)</span> : ''}:
                    </span>
                    <label className="px-2.5 py-1 bg-blue-100 hover:bg-blue-200 text-blue-900 rounded font-semibold cursor-pointer text-[11px]">
                      {isUploadingPhoto ? 'Uploading...' : (evidencePhotoUrl || breakdown.breakdownEvidenceImage) ? 'Change Photo' : 'Upload Photo'}
                      <input type="file" accept="image/*,video/*,.pdf" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  </div>
                  {(evidencePhotoUrl || breakdown.breakdownEvidenceImage) && (
                    <div className="bg-white p-2 rounded-lg border border-blue-200">
                      {(evidencePhotoUrl || breakdown.breakdownEvidenceImage || '').match(/\.(mp4|mov|webm)$/i) ? (
                        <video
                          src={evidencePhotoUrl || breakdown.breakdownEvidenceImage || ''}
                          controls
                          className="w-full max-h-56 rounded object-contain bg-slate-900"
                        />
                      ) : (
                        <a
                          href={evidencePhotoUrl || breakdown.breakdownEvidenceImage || ''}
                          target="_blank"
                          rel="noreferrer"
                          className="block"
                        >
                          <img
                            src={evidencePhotoUrl || breakdown.breakdownEvidenceImage || ''}
                            alt="Breakdown Photo Evidence"
                            className="w-full max-h-56 object-contain rounded border border-slate-200 bg-slate-50"
                          />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}
              <input
                type="text"
                value={stageNote}
                onChange={(e) => setStageNote(e.target.value)}
                placeholder={nextStageDef.inputPlaceholder}
                className="w-full px-3 py-1.5 bg-white border border-blue-200 rounded text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
              <button
                type="button"
                disabled={
                  isSubmitting ||
                  isUploadingPhoto ||
                  ((nextStageDef.stage === 5 || nextStageDef.stage === 7) &&
                    !(evidencePhotoUrl || breakdown.breakdownEvidenceImage || '').trim())
                }
                onClick={handleAdvanceSingleStage}
                className="w-full px-3 py-2 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isSubmitting
                  ? `Completing Stage ${nextStageDef.num}...`
                  : `Complete Stage ${nextStageDef.num}: ${nextStageDef.title}`}
              </button>
            </div>
          )}

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 leading-relaxed">
            <span className="font-semibold">Provisional Role Authorization:</span> Driver (Report), Workshop Supervisor (Inspection/Repair/Parts), Fleet Manager (Approve/Close) — Formal delegation of authority (DOA) pending client sign-off.
          </div>

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

          {/* Action-Specific Step Fields */}
          {currentAction === 'Send to Workshop' && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Supervisor Inspection Notes
                </label>
                <textarea
                  rows={2}
                  placeholder="Record initial inspection observations, damage assessment..."
                  value={inspectionNotes}
                  onChange={(e) => setInspectionNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Parts Availability Status
                </label>
                <select
                  value={partsAvailabilityStatus}
                  onChange={(e) => setPartsAvailabilityStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                >
                  <option value="In Stock">In Stock (Central Warehouse)</option>
                  <option value="Required Procurement">Required Procurement (Raise PO)</option>
                  <option value="Direct Purchase Issued">Direct Purchase Issued (Local Vendor)</option>
                  <option value="Not Required">Not Required (Minor Adjustment Only)</option>
                </select>
              </div>
            </div>
          )}

          {currentAction === 'Request Parts' && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Parts Availability Status
                  </label>
                  <select
                    value={partsAvailabilityStatus}
                    onChange={(e) => setPartsAvailabilityStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  >
                    <option value="Required Procurement">Required Procurement</option>
                    <option value="Direct Purchase Issued">Direct Purchase Issued</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purchase Order / Indent No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. JBRE/PO/26-27/1"
                    value={purchaseRequest}
                    onChange={(e) => {
                      setPurchaseRequest(e.target.value);
                      setVerifiedPoInfo(null);
                      setPoVerifyError(null);
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>
              {isRepairApproved ? (
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 space-y-2.5 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-blue-950 font-bold">
                      Spare Parts Procurement (Repair Approved)
                    </span>
                    <div className="inline-flex rounded-md border border-blue-300 bg-white p-0.5 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setPoMode('verify')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          poMode === 'verify' ? 'bg-blue-900 text-white' : 'text-slate-600'
                        }`}
                      >
                        Verify PO Number
                      </button>
                      <button
                        type="button"
                        onClick={() => setPoMode('create')}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          poMode === 'create' ? 'bg-blue-900 text-white' : 'text-slate-600'
                        }`}
                      >
                        Create PO Order
                      </button>
                    </div>
                  </div>

                  {poMode === 'verify' ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={purchaseRequest}
                          onChange={(e) => {
                            setPurchaseRequest(e.target.value);
                            setVerifiedPoInfo(null);
                            setPoVerifyError(null);
                          }}
                          placeholder="Enter PO No from Purchase Menu (e.g. JBRE/PO/26-27/1)"
                          className="flex-1 px-2.5 py-1.5 bg-white border border-blue-300 rounded text-xs font-mono text-slate-900"
                        />
                        <button
                          type="button"
                          disabled={verifyingPo || !purchaseRequest.trim()}
                          onClick={async () => {
                            setPoVerifyError(null);
                            setVerifiedPoInfo(null);
                            setVerifyingPo(true);
                            try {
                              const res = await fetch(
                                `/api/procurement/orders/${encodeURIComponent(purchaseRequest.trim())}`
                              );
                              const json = await res.json();
                              if (!res.ok || !json.success || !json.order) {
                                throw new Error(json.error || `PO '${purchaseRequest.trim()}' not found.`);
                              }
                              setVerifiedPoInfo({
                                name: json.order.name,
                                supplier: json.order.supplier,
                                status: json.order.status || 'Draft',
                                grandTotal: Number(json.order.grandTotal || 0),
                              });
                            } catch (err: any) {
                              setPoVerifyError(err.message || 'PO verification failed.');
                            } finally {
                              setVerifyingPo(false);
                            }
                          }}
                          className="px-3 py-1.5 rounded bg-blue-900 text-white font-semibold hover:bg-blue-800 disabled:opacity-50 cursor-pointer shrink-0"
                        >
                          {verifyingPo ? 'Verifying...' : 'Verify PO'}
                        </button>
                      </div>
                      {poVerifyError && (
                        <div className="text-[11px] text-rose-700 font-medium">{poVerifyError}</div>
                      )}
                      {verifiedPoInfo && (
                        <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-[11px] font-medium">
                          Verified: <strong className="font-mono">{verifiedPoInfo.name}</strong> ·{' '}
                          {verifiedPoInfo.supplier} · ₹{verifiedPoInfo.grandTotal.toLocaleString('en-IN')} ({verifiedPoInfo.status})
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-blue-900 font-medium">
                        Raise a new PO linked to this breakdown (shows in Purchase Home):
                      </span>
                      <a
                        href={`/purchases?action=new&breakdown=${encodeURIComponent(breakdown.id)}&vehicle=${encodeURIComponent(breakdown.vehicle)}`}
                        className="px-2.5 py-1 rounded bg-blue-900 text-white font-semibold hover:bg-blue-800 transition-colors shrink-0"
                      >
                        Create Spare Parts PO →
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                  Spare Parts PO creation &amp; verification unlocks after Repair Approval (Stage 07).
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Purchase Authorized By
                </label>
                <input
                  type="text"
                  placeholder="e.g. Workshop Manager / Admin"
                  value={purchaseAuthorizedBy}
                  onChange={(e) => setPurchaseAuthorizedBy(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>
          )}

          {currentAction === 'Parts Received' && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Delivery Person Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Kumar (Vendor Agent)"
                    value={deliveryPersonName}
                    onChange={(e) => setDeliveryPersonName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Delivery Challan / Invoice No
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DC-9842 / INV-4821"
                    value={deliveryChallanNo}
                    onChange={(e) => setDeliveryChallanNo(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>
            </div>
          )}

          {(currentAction === 'Mark Repaired' || currentAction === 'Close Breakdown') && (
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Repair Evidence Photo / Note
                  </label>
                  <input
                    type="text"
                    placeholder="Evidence doc / photo link"
                    value={repairCompletionEvidence}
                    onChange={(e) => setRepairCompletionEvidence(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Driver Handover Acknowledgement
                  </label>
                  <input
                    type="text"
                    placeholder="Driver full name or ID"
                    value={acknowledgementSignature}
                    onChange={(e) => setAcknowledgementSignature(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>
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

