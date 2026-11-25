'use client';

import React, { useState, useMemo } from 'react';
import { VehicleBreakdown } from '@/types/fleet';
import {
  BREAKDOWN_17_STAGES,
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
  Video,
  X,
  Eye,
  FileText,
} from 'lucide-react';
import { formatVehicleDisplay, formatDriverDisplay, formatMineSiteDisplay } from '@/lib/displayFormatters';

interface VehicleBreakdownTrackerProps {
  breakdown: VehicleBreakdown;
  onBack: () => void;
  onRefresh?: (updated?: VehicleBreakdown) => void;
}

const STAGE_ICONS = [
  AlertTriangle, // 01. Breakdown Reported
  Building,      // 02. Workshop Entry
  UserCheck,     // 03. Mechanic Assigned
  Search,        // 04. Under Inspection
  Camera,        // 05. Breakdown Reason (Photo / Video)
  FileCheck,     // 06. Repair Approval Pending
  Check,         // 07. Repair Approved
  ShoppingCart,  // 08. Prepared Purchases Order
  CheckCircle2,  // 09. Purchases Order Approved
  Package,       // 10. Spare Parts Receive In Workshop
  Camera,        // 11. Spare Parts Received (Photo / Video Evidence)
  Wrench,        // 12. Repair Work In Progress
  Flag,          // 13. Repair Completed
  RotateCcw,     // 14. Trial / Testing
  Video,         // 15. Running Vehicle Test (Photo / Video Evidence)
  ThumbsUp,      // 16. Ready for Operation
  Truck,         // 17. Vehicle Running
];

export function VehicleBreakdownTracker({
  breakdown: initialBreakdown,
  onBack,
  onRefresh,
}: VehicleBreakdownTrackerProps) {
  const [breakdown, setBreakdown] = useState<VehicleBreakdown>(initialBreakdown);
  const parsed = useMemo(() => parseBreakdownStageState(breakdown), [breakdown]);

  const currentStage = parsed.currentStage;
  const currentStageDef = BREAKDOWN_17_STAGES[currentStage - 1] || BREAKDOWN_17_STAGES[0];
  const nextStageDef = currentStage < 17 ? BREAKDOWN_17_STAGES[currentStage] : null;

  const [stageNote, setStageNote] = useState('');
  const [stageActor, setStageActor] = useState(nextStageDef?.actorRole || '');
  const [laborCostInput, setLaborCostInput] = useState(
    breakdown.laborCost > 0 ? String(breakdown.laborCost) : ''
  );
  const [evidenceMediaUrl, setEvidenceMediaUrl] = useState(
    breakdown.breakdownEvidenceImage || ''
  );
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [stageError, setStageError] = useState<string | null>(null);

  // Lightbox Media Viewer Modal state
  const [activeMediaViewer, setActiveMediaViewer] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
  }>({
    isOpen: false,
    url: '',
    title: '',
  });

  React.useEffect(() => {
    const next = currentStage < 17 ? BREAKDOWN_17_STAGES[currentStage] : null;
    if (next) {
      setStageActor(next.actorRole);
      setStageNote('');
      // If advancing to a stage that has existing media in history, preload it
      const prevMedia = parsed.history[next.stage]?.mediaUrl || '';
      setEvidenceMediaUrl(prevMedia);
    }
  }, [currentStage, parsed.history]);

  const isVideoUrl = (url?: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.endsWith('.mp4') || lower.endsWith('.webm') || lower.endsWith('.mov') || lower.includes('video');
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStageError(null);
    setIsUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data?.fileUrl) {
        throw new Error(json.error || 'Failed to upload media evidence.');
      }
      setEvidenceMediaUrl(json.data.fileUrl);
    } catch (err: any) {
      setStageError(err.message || 'Error uploading media evidence.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleAdvanceStage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nextStageDef) return;
    setStageError(null);

    const newStage = nextStageDef.stage;
    const effectiveMedia = (evidenceMediaUrl || '').trim();

    // Enforce mandatory media evidence on Stage 05, Stage 11, and Stage 15
    if (nextStageDef.requiresMedia && !effectiveMedia) {
      setStageError(
        `Media evidence (${nextStageDef.mediaTypeLabel || 'Photo / Video'}) is mandatory for Stage ${nextStageDef.num}: ${nextStageDef.title}. Please upload photo or video before advancing.`
      );
      return;
    }

    // Stage 07 Repair Approved requires Stage 05 breakdown photo/video
    if (newStage === 7) {
      const stage5Media = parsed.history[5]?.mediaUrl || breakdown.breakdownEvidenceImage || effectiveMedia;
      if (!stage5Media) {
        setStageError('Approval without breakdown photo/video evidence is not allowed. Please ensure Stage 05 photo is recorded.');
        return;
      }
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
            (effectiveMedia
              ? `${nextStageDef.title} verified with media evidence`
              : `${nextStageDef.title} completed`),
          mediaUrl: effectiveMedia || undefined,
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

      if (effectiveMedia && (newStage === 5 || !breakdown.breakdownEvidenceImage)) {
        patchPayload.breakdownEvidenceImage = effectiveMedia;
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
      if (newStage === 12) {
        if (stageNote.trim()) patchPayload.repairDescription = stageNote.trim();
        if (laborCostInput) patchPayload.labourCost = Number(laborCostInput);
      }
      if (newStage === 13) {
        if (stageNote.trim()) patchPayload.repairCompletionEvidence = stageNote.trim();
        if (laborCostInput) patchPayload.labourCost = Number(laborCostInput);
      }
      if (newStage === 16 && stageNote.trim()) {
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
      } else if (newStage === 13 && (status === 'In Workshop' || status === 'Awaiting Parts')) {
        workflowActionToRun = 'Mark Repaired';
      } else if (newStage === 17 && status === 'Repaired') {
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
              breakdownEvidenceImage: effectiveMedia || undefined,
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

  // Gather all available media across stages
  const breakdownCauseMedia = parsed.history[5]?.mediaUrl || breakdown.breakdownEvidenceImage || '';
  const partsReceivedMedia = parsed.history[11]?.mediaUrl || '';
  const runningVehicleMedia = parsed.history[15]?.mediaUrl || '';

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
              Vehicle Breakdown Tracking (17-Stage Workflow)
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
              Completed {currentStage} of 17 stages • Responsible: {currentStageDef.actorRole}
            </span>
          </div>
          <div className="w-11 h-11 rounded-full bg-blue-900 text-white font-mono font-bold text-sm flex items-center justify-center shrink-0">
            {currentStageDef.num}
          </div>
        </div>

        <div className="bg-white border-2 border-amber-400 rounded-xl p-4 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 block">
              Next Stage
            </span>
            <div className="text-base font-bold text-slate-900 mt-0.5">
              {nextStageDef ? `Stage ${nextStageDef.num}: ${nextStageDef.title}` : 'Workflow Complete (17/17)'}
            </div>
            <span className="text-xs text-slate-500">
              {nextStageDef ? `Assigned Role: ${nextStageDef.actorRole}` : 'Vehicle running & operational'}
            </span>
          </div>
          <div
            className={`w-11 h-11 rounded-full font-mono font-bold text-sm flex items-center justify-center shrink-0 ${
              nextStageDef ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-800'
            }`}
          >
            {nextStageDef ? nextStageDef.num : '17'}
          </div>
        </div>
      </div>

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Breakdown Details & Next Stage Action (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Breakdown Details</h2>
              <span className="text-[10px] font-semibold text-blue-900 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                17 Stages
              </span>
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

              {/* Uploaded Evidence Media Summary (Breakdown, Spares, Running Vehicle) */}
              <div className="pt-2 space-y-1.5 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Uploaded Evidence (Photos & Videos)
                </span>

                {/* Stage 05 Cause Media */}
                <div className="flex items-center justify-between py-1 bg-slate-50 px-2.5 rounded border border-slate-200">
                  <span className="text-slate-600 font-medium flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5 text-blue-700" />
                    <span>Stage 05 (Cause)</span>
                  </span>
                  {breakdownCauseMedia ? (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveMediaViewer({
                          isOpen: true,
                          url: breakdownCauseMedia,
                          title: 'Stage 05: Breakdown Cause Evidence',
                        })
                      }
                      className="inline-flex items-center gap-1 text-[11px] text-blue-900 font-bold hover:underline"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Media</span>
                    </button>
                  ) : (
                    <span className="text-slate-400 text-[11px]">Pending</span>
                  )}
                </div>

                {/* Stage 11 Spares Received Media */}
                <div className="flex items-center justify-between py-1 bg-slate-50 px-2.5 rounded border border-slate-200">
                  <span className="text-slate-600 font-medium flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Stage 11 (Spares)</span>
                  </span>
                  {partsReceivedMedia ? (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveMediaViewer({
                          isOpen: true,
                          url: partsReceivedMedia,
                          title: 'Stage 11: Spare Parts Received Evidence',
                        })
                      }
                      className="inline-flex items-center gap-1 text-[11px] text-blue-900 font-bold hover:underline"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Media</span>
                    </button>
                  ) : (
                    <span className="text-slate-400 text-[11px]">Pending</span>
                  )}
                </div>

                {/* Stage 15 Running Vehicle Media */}
                <div className="flex items-center justify-between py-1 bg-slate-50 px-2.5 rounded border border-slate-200">
                  <span className="text-slate-600 font-medium flex items-center gap-1.5">
                    <Video className="w-3.5 h-3.5 text-teal-700" />
                    <span>Stage 15 (Running)</span>
                  </span>
                  {runningVehicleMedia ? (
                    <button
                      type="button"
                      onClick={() =>
                        setActiveMediaViewer({
                          isOpen: true,
                          url: runningVehicleMedia,
                          title: 'Stage 15: Running Vehicle Evidence',
                        })
                      }
                      className="inline-flex items-center gap-1 text-[11px] text-blue-900 font-bold hover:underline"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>View Media</span>
                    </button>
                  ) : (
                    <span className="text-slate-400 text-[11px]">Pending</span>
                  )}
                </div>
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

                {/* Photo / Video Upload Box (Visible when media is required or uploaded) */}
                {(nextStageDef.requiresMedia || nextStageDef.stage === 5 || nextStageDef.stage === 7 || evidenceMediaUrl) && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-bold text-slate-700 uppercase">
                        {nextStageDef.mediaTypeLabel || 'Photo / Video Evidence'}
                        {nextStageDef.requiresMedia && (
                          <span className="text-rose-600 ml-1">* (Required)</span>
                        )}
                      </label>
                      {evidenceMediaUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMediaViewer({
                              isOpen: true,
                              url: evidenceMediaUrl,
                              title: `Stage ${nextStageDef.num}: ${nextStageDef.title}`,
                            })
                          }
                          className="text-[11px] text-blue-900 font-bold hover:underline flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Preview</span>
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded text-xs font-semibold text-slate-700 cursor-pointer">
                        <Upload className="w-3.5 h-3.5 text-blue-700" />
                        <span>{isUploadingMedia ? 'Uploading...' : 'Upload Photo / Video'}</span>
                        <input
                          type="file"
                          accept="image/*,video/*,.pdf"
                          onChange={handleMediaUpload}
                          disabled={isUploadingMedia}
                          className="hidden"
                        />
                      </label>
                      {evidenceMediaUrl ? (
                        <span className="text-[11px] text-emerald-700 font-semibold truncate">
                          ✓ Media Attached
                        </span>
                      ) : (
                        <span className="text-[11px] text-slate-400">
                          Supports PNG, JPG, MP4, MOV
                        </span>
                      )}
                    </div>

                    {/* Instant Media Preview Thumbnail & Player (Upload kn hela jemiti se dekhi pariba) */}
                    {evidenceMediaUrl && (
                      <div className="mt-2 border rounded-lg p-2 bg-white">
                        {isVideoUrl(evidenceMediaUrl) ? (
                          <video
                            src={evidenceMediaUrl}
                            controls
                            className="w-full max-h-48 rounded object-contain bg-black"
                          />
                        ) : (
                          <div className="relative group">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={evidenceMediaUrl}
                              alt="Uploaded Evidence"
                              className="w-full max-h-48 rounded object-contain bg-slate-100 cursor-pointer"
                              onClick={() =>
                                setActiveMediaViewer({
                                  isOpen: true,
                                  url: evidenceMediaUrl,
                                  title: `Stage ${nextStageDef.num}: ${nextStageDef.title}`,
                                })
                              }
                            />
                            <div className="text-center mt-1">
                              <span className="text-[10px] text-slate-500">
                                Click image to inspect full size
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
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

                {(nextStageDef.stage === 12 || nextStageDef.stage === 13) && (
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
                  disabled={isAdvancing || isUploadingMedia}
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
              <span>All 17 stages completed — Vehicle is back in active operation!</span>
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

        {/* Right Column: 17 Status Progress Stages (8 cols) */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  17-Stage Status Progress ({currentStage} / 17)
                </h2>
              </div>
              <span className="text-[11px] font-semibold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                {breakdown.repairStatus}
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {BREAKDOWN_17_STAGES.map((st, idx) => {
                const isPastCompleted = st.stage < currentStage;
                const isCurrentStage = st.stage === currentStage;
                const isNextStage = st.stage === currentStage + 1;
                const IconComponent = STAGE_ICONS[idx] || Wrench;
                const logEntry = parsed.history[st.stage];
                const stageMedia = logEntry?.mediaUrl || (st.stage === 5 ? breakdown.breakdownEvidenceImage : undefined);

                return (
                  <div
                    key={st.num}
                    className={`px-4 py-2.5 flex items-center justify-between text-xs transition-colors ${
                      st.stage === 17 && isCurrentStage
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
                          st.stage === 17 && isCurrentStage
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

                    <div className="hidden sm:flex items-center space-x-4 text-slate-600">
                      {stageMedia && (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMediaViewer({
                              isOpen: true,
                              url: stageMedia,
                              title: `Stage ${st.num}: ${st.title} Evidence`,
                            })
                          }
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-100 text-blue-900 font-bold text-[10px] hover:bg-blue-200 transition-colors"
                        >
                          {isVideoUrl(stageMedia) ? (
                            <Video className="w-3 h-3 text-blue-800" />
                          ) : (
                            <Camera className="w-3 h-3 text-blue-800" />
                          )}
                          <span>View Media</span>
                        </button>
                      )}
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
                          {st.stage === 17 ? 'Current (Final)' : 'Current Stage'}
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

      {/* 3. Bottom Section: All 17 Stages One-by-One History Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-blue-900 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <List className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">
              Stage-by-Stage History (Stages 01 to 17)
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
                <th className="py-2.5 px-4 w-28">State</th>
                <th className="py-2.5 px-4 w-36">Evidence Media</th>
                <th className="py-2.5 px-4">Remarks / Notes</th>
                <th className="py-2.5 px-4 w-40">Updated By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {BREAKDOWN_17_STAGES.map((st) => {
                const entry = parsed.history[st.stage];
                const isCurrent = st.stage === currentStage;
                const isCompleted = st.stage < currentStage;
                const isNext = st.stage === currentStage + 1;
                const media = entry?.mediaUrl || (st.stage === 5 ? breakdown.breakdownEvidenceImage : undefined);

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
                    <td className="py-2.5 px-4">
                      {media ? (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMediaViewer({
                              isOpen: true,
                              url: media,
                              title: `Stage ${st.num}: ${st.title}`,
                            })
                          }
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-900 font-bold text-[11px] transition-colors"
                        >
                          {isVideoUrl(media) ? (
                            <Video className="w-3.5 h-3.5 text-blue-800" />
                          ) : (
                            <Camera className="w-3.5 h-3.5 text-blue-800" />
                          )}
                          <span>View {isVideoUrl(media) ? 'Video' : 'Photo'}</span>
                        </button>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
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

      {/* 4. Fullscreen Interactive Lightbox / Media Viewer Modal (Upload kn hela jemiti se dekhi pariba) */}
      {activeMediaViewer.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="p-4 bg-blue-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Camera className="w-5 h-5 text-white" />
                <h3 className="font-bold text-sm">{activeMediaViewer.title}</h3>
              </div>
              <div className="flex items-center space-x-2">
                <a
                  href={activeMediaViewer.url}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="px-3 py-1 bg-blue-800 hover:bg-blue-700 rounded text-xs font-semibold text-white inline-flex items-center gap-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Full Size</span>
                </a>
                <button
                  type="button"
                  onClick={() => setActiveMediaViewer({ isOpen: false, url: '', title: '' })}
                  className="p-1 rounded-lg hover:bg-blue-800 text-blue-200 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body / Viewer */}
            <div className="p-4 flex-1 overflow-auto bg-slate-950 flex items-center justify-center min-h-[300px]">
              {isVideoUrl(activeMediaViewer.url) ? (
                <video
                  src={activeMediaViewer.url}
                  controls
                  autoPlay
                  className="max-h-[70vh] w-auto max-w-full rounded"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={activeMediaViewer.url}
                  alt={activeMediaViewer.title}
                  className="max-h-[70vh] w-auto max-w-full object-contain rounded"
                />
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <span className="truncate max-w-md">File URL: {activeMediaViewer.url}</span>
              <button
                type="button"
                onClick={() => setActiveMediaViewer({ isOpen: false, url: '', title: '' })}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 rounded font-semibold text-slate-800 text-xs"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
