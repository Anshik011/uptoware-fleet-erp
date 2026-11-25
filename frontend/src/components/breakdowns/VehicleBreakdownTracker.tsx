'use client';

import React, { useState, useMemo } from 'react';
import { VehicleBreakdown } from '@/types/fleet';
import {
  BREAKDOWN_15_STAGES,
  parseBreakdownStageState,
  serializeBreakdownStageState,
  StageHistoryEntry,
} from '@/lib/breakdownStages';
import {
  Wrench,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Download,
  Camera,
  AlertTriangle,
  Building,
  UserCheck,
  Search,
  FileCheck,
  Check,
  ShoppingCart,
  Package,
  Flag,
  RotateCcw,
  ThumbsUp,
  Truck,
  List,
  ArrowRight,
  Loader2,
  AlertCircle,
  Upload,
  ExternalLink,
} from 'lucide-react';
import { formatVehicleDisplay, formatDriverDisplay, formatMineSiteDisplay } from '@/lib/displayFormatters';

interface VehicleBreakdownTrackerProps {
  breakdown: VehicleBreakdown;
  onBack: () => void;
  onRefresh?: (updated?: VehicleBreakdown) => void;
}

const STAGE_ICONS = [
  AlertTriangle,
  Building,
  UserCheck,
  Search,
  Camera,
  FileCheck,
  Check,
  ShoppingCart,
  CheckCircle2,
  Package,
  Wrench,
  Flag,
  RotateCcw,
  ThumbsUp,
  Truck,
];

export function VehicleBreakdownTracker({
  breakdown: initialBreakdown,
  onBack,
  onRefresh,
}: VehicleBreakdownTrackerProps) {
  const [breakdown, setBreakdown] = useState<VehicleBreakdown>(initialBreakdown);
  const parsed = useMemo(() => parseBreakdownStageState(breakdown), [breakdown]);

  const currentStage = parsed.currentStage;
  const currentStageDef = BREAKDOWN_15_STAGES[currentStage - 1] || BREAKDOWN_15_STAGES[0];
  const nextStageDef = currentStage < 15 ? BREAKDOWN_15_STAGES[currentStage] : null;

  const [stageNote, setStageNote] = useState('');
  const [stageActor, setStageActor] = useState(nextStageDef?.actorRole || '');
  const [laborCostInput, setLaborCostInput] = useState(
    breakdown.laborCost > 0 ? String(breakdown.laborCost) : ''
  );
  const [evidencePhotoUrl, setEvidencePhotoUrl] = useState(
    breakdown.breakdownEvidenceImage || ''
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);

  React.useEffect(() => {
    const next = currentStage < 15 ? BREAKDOWN_15_STAGES[currentStage] : null;
    if (next) {
      setStageActor(next.actorRole);
      setStageNote('');
    }
  }, [currentStage]);

  React.useEffect(() => {
    setEvidencePhotoUrl(breakdown.breakdownEvidenceImage || '');
  }, [breakdown.breakdownEvidenceImage]);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStageError(null);
    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data?.fileUrl) {
        throw new Error(json.error || 'Failed to upload breakdown photo.');
      }
      setEvidencePhotoUrl(json.data.fileUrl);
    } catch (err: any) {
      setStageError(err.message || 'Error uploading photo evidence.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleAdvanceStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextStageDef) return;
    setStageError(null);

    const newStage = nextStageDef.stage;
    const effectivePhoto = (evidencePhotoUrl || breakdown.breakdownEvidenceImage || '').trim();

    // Enforce mandatory photo on Stage 05 (Breakdown Reason Photo/Video) and Stage 07 (Repair Approved)
    if ((newStage === 5 || newStage === 7) && !effectivePhoto) {
      setStageError(
        newStage === 7
          ? 'Approval without photo evidence is not allowed. Please upload breakdown photo evidence first.'
          : 'Photo evidence is mandatory for Stage 05 (Breakdown Reason). Please upload a breakdown photo.'
      );
      return;
    }

    setIsAdvancing(true);

    try {
      const now = new Date();
      const timeStr = `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(
        2,
        '0'
      )}-${now.getFullYear()} ${now.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })}`;

      const updatedHistory: Record<number, StageHistoryEntry> = {
        ...parsed.history,
        [newStage]: {
          stage: newStage,
          title: nextStageDef.title,
          time: timeStr,
          actor: stageActor.trim() || nextStageDef.actorRole,
          note:
            stageNote.trim() ||
            (newStage === 5 && effectivePhoto
              ? `Photo uploaded: ${effectivePhoto}`
              : `${nextStageDef.title} completed`),
        },
      };

      const serializedNotes = serializeBreakdownStageState(
        parsed.plainInspectionNotes,
        newStage,
        updatedHistory
      );

      const patchPayload: Record<string, any> = {
        inspectionNotes: serializedNotes,
      };

      if (effectivePhoto) {
        patchPayload.breakdownEvidenceImage = effectivePhoto;
      }
      if (newStage === 2 && stageNote.trim()) {
        patchPayload.assignedWorkshop = stageNote.trim();
      }
      if (newStage === 8) {
        patchPayload.partsAvailabilityStatus = 'Required Procurement';
        if (stageNote.trim()) patchPayload.purchaseRequest = stageNote.trim();
      }
      if (newStage === 9 && stageNote.trim()) {
        patchPayload.purchaseAuthorizedBy = stageNote.trim();
      }
      if (newStage === 10 && stageNote.trim()) {
        patchPayload.deliveryPersonName = stageActor.trim() || nextStageDef.actorRole;
        patchPayload.deliveryChallanNo = stageNote.trim();
      }
      if (newStage === 11) {
        if (stageNote.trim()) patchPayload.repairDescription = stageNote.trim();
        if (laborCostInput) patchPayload.labourCost = Number(laborCostInput);
      }
      if (newStage === 12) {
        if (stageNote.trim()) patchPayload.repairCompletionEvidence = stageNote.trim();
        if (laborCostInput) patchPayload.labourCost = Number(laborCostInput);
      }
      if (newStage === 14 && stageNote.trim()) {
        patchPayload.acknowledgementSignature = stageNote.trim();
      }

      const patchRes = await fetch(`/api/breakdowns/${encodeURIComponent(breakdown.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload),
      });
      const patchJson = await patchRes.json();
      if (!patchRes.ok || !patchJson.success) {
        throw new Error(patchJson.error || `Failed to save Stage ${newStage}`);
      }

      let latestBreakdown: VehicleBreakdown = patchJson.breakdown || breakdown;

      const status = latestBreakdown.repairStatus;
      let workflowActionToRun: string | null = null;

      if (newStage === 2 && status === 'Reported') {
        workflowActionToRun = 'Send to Workshop';
      } else if (newStage === 7 && status === 'Reported') {
        workflowActionToRun = 'Approve';
      } else if (newStage === 8 && status === 'In Workshop') {
        workflowActionToRun = 'Request Parts';
      } else if (newStage === 10 && status === 'Awaiting Parts') {
        workflowActionToRun = 'Parts Received';
      } else if (newStage === 12 && (status === 'In Workshop' || status === 'Awaiting Parts')) {
        workflowActionToRun = 'Mark Repaired';
      } else if (newStage === 15 && status === 'Repaired') {
        workflowActionToRun = 'Close Breakdown';
      }

      if (workflowActionToRun) {
        const wfRes = await fetch(
          `/api/breakdowns/${encodeURIComponent(breakdown.id)}/transition`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: workflowActionToRun,
              inspectionNotes: serializedNotes,
              breakdownEvidenceImage: effectivePhoto || undefined,
              repairDetails: stageNote.trim() || undefined,
              laborCost: laborCostInput ? Number(laborCostInput) : undefined,
            }),
          }
        );
        const wfJson = await wfRes.json().catch(() => null);
        if (!wfRes.ok) {
          throw new Error(wfJson?.error || `Workflow transition '${workflowActionToRun}' failed.`);
        }
        if (wfJson?.success && wfJson.breakdown) {
          latestBreakdown = wfJson.breakdown;
        }
      }

      setBreakdown(latestBreakdown);
      if (onRefresh) onRefresh(latestBreakdown);
    } catch (err: any) {
      setStageError(err.message || 'Error advancing breakdown stage');
    } finally {
      setIsAdvancing(false);
    }
  };

  const calculatedDuration =
    breakdown.downtimeHours && breakdown.downtimeHours > 0
      ? `${breakdown.downtimeHours} Hours`
      : 'Ongoing';
  const totalCost = breakdown.totalCost && breakdown.totalCost > 0 ? breakdown.totalCost : 0;
  const effectivePhoto = (evidencePhotoUrl || breakdown.breakdownEvidenceImage || '').trim();

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <div className="bg-blue-900 rounded-t-xl px-5 py-3.5 text-white flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-blue-800 rounded-lg">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight">
              Vehicle Breakdown Tracking (15-Stage Workflow)
            </h1>
            <p className="text-[11px] text-blue-200">
              {breakdown.id} • {formatVehicleDisplay(breakdown.vehicle)}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-800 hover:bg-blue-700 rounded-md transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to List</span>
        </button>
      </div>

      {/* Current Stage & Next Stage Prominent Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border-2 border-blue-900 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 block">
              Current Stage
            </span>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              Stage {currentStageDef.num}: {currentStageDef.title}
            </div>
            <span className="text-xs text-slate-500">
              Completed {currentStage} of 15 stages • Responsible: {currentStageDef.actorRole}
            </span>
          </div>
          <div className="w-11 h-11 rounded-full bg-blue-900 text-white font-mono font-bold text-sm flex items-center justify-center shrink-0">
            {currentStageDef.num}
          </div>
        </div>

        <div className="bg-white border-2 border-slate-300 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Next Stage
            </span>
            {nextStageDef ? (
              <>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  Stage {nextStageDef.num}: {nextStageDef.title}
                </div>
                <span className="text-xs text-slate-500">
                  Assigned Role: {nextStageDef.actorRole}
                  {(nextStageDef.stage === 5 || nextStageDef.stage === 7) && ' • Photo Required'}
                </span>
              </>
            ) : (
              <>
                <div className="text-base font-bold text-emerald-700 mt-0.5">
                  All 15 Stages Completed
                </div>
                <span className="text-xs text-emerald-600">Vehicle is back in operation</span>
              </>
            )}
          </div>
          <div
            className={`w-11 h-11 rounded-full font-mono font-bold text-sm flex items-center justify-center shrink-0 ${
              nextStageDef ? 'bg-blue-100 text-blue-900' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {nextStageDef ? nextStageDef.num : '15'}
          </div>
        </div>
      </div>

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Breakdown Details & Next Stage Action (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Breakdown Details</h2>
            </div>
            <div className="p-4 space-y-2.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Vehicle No. :</span>
                <span className="font-bold text-blue-900 font-mono text-sm">
                  {formatVehicleDisplay(breakdown.vehicle)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Breakdown Type :</span>
                <span className="font-semibold text-slate-800">{breakdown.breakdownType || '—'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Mine / Site :</span>
                <span className="font-semibold text-slate-800">
                  {breakdown.mineSite ? formatMineSiteDisplay(breakdown.mineSite) : '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Driver Name :</span>
                <span className="font-semibold text-slate-800">
                  {breakdown.driverName || (breakdown.driver ? formatDriverDisplay(breakdown.driver) : '—')}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Breakdown Date :</span>
                <span className="font-medium text-slate-800 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {breakdown.breakdownDate || '—'} {breakdown.breakdownTime || ''}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Location :</span>
                <span className="font-semibold text-slate-800">
                  {breakdown.breakdownLocation || '—'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Breakdown Reason :</span>
                <span className="font-bold text-rose-700 text-right max-w-[180px]">
                  {breakdown.description || breakdown.breakdownType || '—'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500 font-medium">Evidence Photo :</span>
                {effectivePhoto ? (
                  <a
                    href={effectivePhoto}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-700 font-semibold hover:underline"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Photo Attached</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-rose-600 font-semibold">Not Uploaded</span>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Next Stage Progression Form */}
          {nextStageDef ? (
            <form
              onSubmit={handleAdvanceStage}
              className="bg-white rounded-lg border-2 border-blue-200 shadow-sm overflow-hidden"
            >
              <div className="px-4 py-3 bg-blue-50 border-b border-blue-200 flex items-center justify-between">
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  Advance to Stage {nextStageDef.num}
                </span>
                <span className="text-[11px] font-semibold text-blue-700">
                  {nextStageDef.title}
                </span>
              </div>
              <div className="p-4 space-y-3 text-xs">
                {stageError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-rose-700 flex items-start gap-1.5">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{stageError}</span>
                  </div>
                )}

                {/* Photo Upload (Always visible on Stage 05, or before Stage 07 Approval if missing) */}
                {(nextStageDef.stage === 5 || nextStageDef.stage === 7 || !effectivePhoto) && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase">
                      Breakdown Photo Evidence{' '}
                      {(nextStageDef.stage === 5 || nextStageDef.stage === 7) && (
                        <span className="text-rose-600">* (Required for Approval)</span>
                      )}
                    </label>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded text-xs font-semibold text-slate-700 cursor-pointer">
                        <Upload className="w-3.5 h-3.5 text-blue-700" />
                        <span>{isUploadingPhoto ? 'Uploading...' : 'Upload Photo'}</span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={handlePhotoUpload}
                          disabled={isUploadingPhoto}
                          className="hidden"
                        />
                      </label>
                      {effectivePhoto && (
                        <span className="text-[11px] text-emerald-700 font-semibold truncate">
                          Attached
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    {nextStageDef.inputLabel}
                  </label>
                  <input
                    type="text"
                    value={stageNote}
                    onChange={(e) => setStageNote(e.target.value)}
                    placeholder={nextStageDef.inputPlaceholder}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Updated By / Responsible Person
                  </label>
                  <input
                    type="text"
                    value={stageActor}
                    onChange={(e) => setStageActor(e.target.value)}
                    placeholder={nextStageDef.actorRole}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                {(nextStageDef.stage === 11 || nextStageDef.stage === 12) && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Labor / Repair Cost (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={laborCostInput}
                      onChange={(e) => setLaborCostInput(e.target.value)}
                      placeholder="0"
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isAdvancing || isUploadingPhoto}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-900 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isAdvancing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Completing Stage {nextStageDef.num}...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Stage {nextStageDef.num}: {nextStageDef.title}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2.5 text-xs text-emerald-900 font-semibold">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>All 15 stages completed — Vehicle is back in active operation!</span>
            </div>
          )}

          {/* Metric Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-full">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-600 block">Breakdown Duration</span>
                <span className="text-sm font-bold text-emerald-800">{calculatedDuration}</span>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center space-x-3">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-full">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-600 block">Repair Cost</span>
                <span className="text-sm font-bold text-blue-900 font-mono">
                  ₹ {totalCost.toLocaleString('en-IN')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 15 Status Progress Stages (8 cols) */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  15-Stage Status Progress ({currentStage} / 15)
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                {breakdown.repairStatus}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {BREAKDOWN_15_STAGES.map((st, idx) => {
                const isPastCompleted = st.stage < currentStage;
                const isCurrentStage = st.stage === currentStage;
                const isNextStage = st.stage === currentStage + 1;
                const IconComponent = STAGE_ICONS[idx] || Wrench;
                const logEntry = parsed.history[st.stage];

                return (
                  <div
                    key={st.num}
                    className={`px-4 py-2.5 flex items-center justify-between text-xs transition-colors ${
                      st.stage === 15 && isCurrentStage
                        ? 'bg-emerald-50/80 font-medium border-l-4 border-emerald-600'
                        : isCurrentStage
                        ? 'bg-blue-50 font-medium border-l-4 border-blue-900'
                        : isNextStage
                        ? 'bg-amber-50/60 font-medium border-l-4 border-amber-500'
                        : isPastCompleted
                        ? 'bg-white'
                        : 'bg-slate-50/40'
                    }`}
                  >
                    <div className="flex items-center space-x-3 min-w-[240px]">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                          st.stage === 15 && isCurrentStage
                            ? 'bg-emerald-600 text-white'
                            : isPastCompleted || isCurrentStage
                            ? 'bg-blue-900 text-white'
                            : isNextStage
                            ? 'bg-amber-500 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {st.num}
                      </span>
                      <IconComponent
                        className={`w-4 h-4 ${
                          isPastCompleted || isCurrentStage
                            ? 'text-blue-900'
                            : isNextStage
                            ? 'text-amber-600'
                            : 'text-slate-400'
                        }`}
                      />
                      <span
                        className={`text-xs ${
                          isPastCompleted || isCurrentStage || isNextStage
                            ? 'text-slate-900 font-semibold'
                            : 'text-slate-500'
                        }`}
                      >
                        {st.title}
                      </span>
                    </div>

                    <div className="hidden sm:flex items-center space-x-6 text-slate-600">
                      <span className="font-mono text-[11px] text-slate-500">
                        {logEntry?.time || (isPastCompleted || isCurrentStage ? 'Recorded' : '—')}
                      </span>
                      <span className="text-slate-700 font-medium w-32 text-left truncate">
                        {logEntry?.actor || st.actorRole}
                      </span>
                    </div>

                    <div>
                      {isCurrentStage ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-900 text-white">
                          <Check className="w-3 h-3 mr-1" />
                          {st.stage === 15 ? 'Current (Final)' : 'Current Stage'}
                        </span>
                      ) : isPastCompleted ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                          <Check className="w-3 h-3 mr-1" />
                          Completed
                        </span>
                      ) : isNextStage ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                          Next Stage
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Section: All 15 Stages One-by-One History Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-blue-900 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <List className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Stage-by-Stage History (Stages 01 to 15)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white text-blue-900 hover:bg-slate-100 rounded text-xs font-semibold shadow-sm transition-colors cursor-pointer print:hidden"
          >
            <Download className="w-3.5 h-3.5 text-blue-900" />
            <span>Download / Print Report</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 w-24">Stage</th>
                <th className="py-2.5 px-4 w-44">Date & Time</th>
                <th className="py-2.5 px-4 w-56">Stage Name</th>
                <th className="py-2.5 px-4 w-32">State</th>
                <th className="py-2.5 px-4">Remarks / Evidence</th>
                <th className="py-2.5 px-4 w-40">Updated By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {BREAKDOWN_15_STAGES.map((st) => {
                const entry = parsed.history[st.stage];
                const isCurrent = st.stage === currentStage;
                const isCompleted = st.stage < currentStage;
                const isNext = st.stage === currentStage + 1;
                return (
                  <tr
                    key={st.stage}
                    className={
                      isCurrent
                        ? 'bg-blue-50/70'
                        : isNext
                        ? 'bg-amber-50/40'
                        : 'hover:bg-slate-50/60'
                    }
                  >
                    <td className="py-2.5 px-4 font-mono font-bold text-blue-900">
                      Stage {st.num}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600">
                      {entry?.time || '—'}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900">{st.title}</td>
                    <td className="py-2.5 px-4">
                      {isCurrent ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-900 text-white">
                          Current
                        </span>
                      ) : isCompleted ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                          Completed
                        </span>
                      ) : isNext ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                          Next
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      {entry?.note || (isCompleted ? 'Completed' : 'Awaiting stage completion')}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-700">
                      {entry?.actor || st.actorRole}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
