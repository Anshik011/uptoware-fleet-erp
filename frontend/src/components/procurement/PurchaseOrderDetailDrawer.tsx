'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { PurchaseOrder } from '@/types/fleet';
import {
  X,
  ShoppingCart,
  CheckCircle2,
  Clock,
  PackageCheck,
  UserCheck,
  IndianRupee,
  AlertCircle,
  Printer,
  Camera,
  Upload,
  Eye,
  Video,
  Lock,
  PenTool,
  Loader2,
  Check,
} from 'lucide-react';
import {
  formatVehicleDisplay,
  formatMineSiteDisplay,
  formatItemDisplay,
} from '@/lib/displayFormatters';
import { SignaturePadModal } from './SignaturePadModal';

interface PurchaseOrderDetailDrawerProps {
  orderId: string | null;
  onClose: () => void;
  onSubmitOrder: (po: PurchaseOrder) => void;
  onReceiveGoods: (po: PurchaseOrder) => void;
  canManage: boolean;
}

export function PurchaseOrderDetailDrawer({
  orderId,
  onClose,
  onSubmitOrder,
  onReceiveGoods,
  canManage,
}: PurchaseOrderDetailDrawerProps) {
  const [order, setOrder] = useState<PurchaseOrder | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Evidence Media State
  const [evidenceMediaUrl, setEvidenceMediaUrl] = useState<string>('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);

  // Signatures State
  const [workshopSign, setWorkshopSign] = useState<string>('');
  const [mechanicalSign, setMechanicalSign] = useState<string>('');
  const [signModalConfig, setSignModalConfig] = useState<{
    isOpen: boolean;
    role: string;
    onSave: (dataUrl: string) => void;
  } | null>(null);

  // Approval Submission State
  const [actionError, setActionError] = useState<string | null>(null);
  const [isSubmittingApproval, setIsSubmittingApproval] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleBeforePrint = () => {
      document.body.classList.add('printing-po-active');
    };
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-po-active');
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    window.addEventListener('afterprint', handleAfterPrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
      window.removeEventListener('afterprint', handleAfterPrint);
      document.body.classList.remove('printing-po-active');
    };
  }, []);

  const handlePrintPO = () => {
    if (!order) return;
    if (order.docstatus !== 1) {
      alert('Approval Required: Purchase Order must be approved before printing official PO.');
      return;
    }
    document.body.classList.add('printing-po-active');
    window.print();
  };

  useEffect(() => {
    if (!orderId) {
      setOrder(null);
      setEvidenceMediaUrl('');
      setWorkshopSign('');
      setMechanicalSign('');
      setActionError(null);
      return;
    }

    async function loadOrder() {
      setIsLoading(true);
      setError(null);
      setActionError(null);
      try {
        const res = await fetch(`/api/procurement/orders/${encodeURIComponent(orderId!)}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to fetch purchase order details');
        }
        setOrder(data.order);
        if (data.order.evidenceMediaUrl) {
          setEvidenceMediaUrl(data.order.evidenceMediaUrl);
        }
        if (data.order.workshopSignature) {
          setWorkshopSign(data.order.workshopSignature);
        }
        if (data.order.mechanicalSignature) {
          setMechanicalSign(data.order.mechanicalSignature);
        }
      } catch (err: any) {
        setError(err.message || 'Error loading purchase order');
      } finally {
        setIsLoading(false);
      }
    }

    loadOrder();
  }, [orderId]);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaUploadError(null);
    setActionError(null);
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
        throw new Error(json.error || 'Failed to upload photo or video file.');
      }
      setEvidenceMediaUrl(json.data.fileUrl);
    } catch (err: any) {
      setMediaUploadError(err.message || 'Error uploading file.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleApproveAndSubmit = async () => {
    if (!order) return;
    setActionError(null);

    const finalMedia = evidenceMediaUrl || order.evidenceMediaUrl;
    if (!finalMedia) {
      setActionError(
        'Approval Blocked: Mandatory photo or video proof of parts, quotation, or breakdown is required before approving this Purchase Order. Please upload photo/video evidence below.'
      );
      return;
    }

    if (!confirm(`Are you sure you want to approve and submit Purchase Order '${order.name}'?`)) {
      return;
    }

    setIsSubmittingApproval(true);
    try {
      const res = await fetch(`/api/procurement/orders/${encodeURIComponent(order.name)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'submit',
          evidenceMediaUrl: finalMedia,
          workshopSignature: workshopSign || order.workshopSignature || undefined,
          mechanicalSignature: mechanicalSign || order.mechanicalSignature || undefined,
          authoritySignature: '/branding/authority_signature.svg',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to approve purchase order');
      }

      setOrder(data.order);
      onSubmitOrder(data.order);
    } catch (err: any) {
      setActionError(err.message || 'Error submitting purchase order');
    } finally {
      setIsSubmittingApproval(false);
    }
  };

  if (!orderId) return null;

  const currentMediaUrl = evidenceMediaUrl || order?.evidenceMediaUrl || '';
  const currentWorkshopSign = workshopSign || order?.workshopSignature || '';
  const currentMechanicalSign = mechanicalSign || order?.mechanicalSignature || '';
  const isApproved = order?.docstatus === 1;

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-sm flex justify-end print:hidden">
        <div className="w-full max-w-2xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg mt-1">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-bold text-slate-900">
                    {order ? `${order.supplier || 'Vendor'} · ${order.procurementType || 'Replenishment'}` : 'Purchase Order'}
                  </h2>
                  {order && (
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                        order.docstatus === 0
                          ? 'bg-amber-100 text-amber-800'
                          : order.docstatus === 2
                          ? 'bg-slate-100 text-slate-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {order.status}
                    </span>
                  )}
                </div>
                <p className="text-sm font-medium text-slate-700 mt-0.5">
                  Supplier: <span className="font-bold text-slate-900">{order?.supplier || '—'}</span>
                </p>
                {order && (
                  <p className="text-xs text-slate-500 mt-1">
                    Ordered on: <span className="font-medium text-slate-700">{order.transactionDate}</span>
                    {order.scheduleDate && (
                      <> | Delivery Due: <span className="font-medium text-slate-700">{order.scheduleDate}</span></>
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-1.5">
              {/* Print PO button: Only active after approval */}
              {order && isApproved ? (
                <button
                  type="button"
                  onClick={handlePrintPO}
                  className="px-2.5 py-1.5 bg-blue-900 text-white hover:bg-blue-950 rounded-md transition-colors flex items-center gap-1.5 text-xs font-semibold shadow-xs"
                  title="Print Official Purchase Order"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PO</span>
                </button>
              ) : (
                <div
                  className="px-2.5 py-1.5 text-slate-400 bg-slate-100 border border-slate-200 rounded-md flex items-center gap-1.5 text-xs font-medium cursor-not-allowed opacity-80"
                  title="Purchase Order must be Approved before printing"
                >
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span className="hidden sm:inline">Print PO (Requires Approval)</span>
                </div>
              )}
              <button
                onClick={onClose}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors ml-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-slate-500 font-medium">Fetching purchase order items...</p>
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
                {error}
              </div>
            ) : !order ? null : (
              <>
                {/* Action / Validation Alerts */}
                {actionError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-start gap-2.5 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="font-medium leading-relaxed">{actionError}</div>
                  </div>
                )}

                {/* Financial & Status Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-center">
                  <div>
                    <span className="text-xs text-slate-500">Grand Total</span>
                    <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
                      ₹{order.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Procurement Type</span>
                    <div className="text-xs font-semibold text-slate-800 mt-2">
                      {order.procurementType || 'Replenishment'}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500">Approval Stamp</span>
                    <div className="text-xs font-medium text-slate-700 mt-2 truncate">
                      {isApproved ? (
                        <span className="text-emerald-700 font-semibold flex items-center justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                          {order.approvedBy ? order.approvedBy.split('@')[0] : 'Commercial Head'}
                        </span>
                      ) : (
                        <span className="text-amber-700 font-medium flex items-center justify-center">
                          <Clock className="w-3.5 h-3.5 mr-1" /> Pending Approval
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Fleet Linkage (if any) */}
                {(order.vehicle || order.vehicleBreakdown || order.mineSite) && (
                  <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                      Fleet Attribution
                    </h4>
                    <dl className="grid grid-cols-3 gap-3 text-xs">
                      {order.vehicle && (
                        <div>
                          <dt className="text-slate-500">Vehicle</dt>
                          <dd className="font-semibold text-slate-900 mt-0.5">
                            {formatVehicleDisplay(order.vehicle, undefined, { includeModel: true })}
                          </dd>
                        </div>
                      )}
                      {order.vehicleBreakdown && (
                        <div>
                          <dt className="text-slate-500">Breakdown Incident</dt>
                          <dd className="text-blue-600 mt-0.5 font-medium">Linked Breakdown Service</dd>
                        </div>
                      )}
                      {order.mineSite && (
                        <div>
                          <dt className="text-slate-500">Mine Site</dt>
                          <dd className="font-semibold text-slate-900 mt-0.5">
                            {formatMineSiteDisplay(order.mineSite)}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>
                )}

                {/* Photo / Video Verification Media Section (Mandatory for Approval) */}
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Camera className="w-4 h-4 text-blue-900" />
                      <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                        Part & Requisition Proof (Photo / Video Evidence)
                      </span>
                    </div>
                    {currentMediaUrl ? (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Evidence Verified
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-amber-600" /> Mandatory Prior to Approval
                      </span>
                    )}
                  </div>

                  {currentMediaUrl ? (
                    <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {currentMediaUrl.match(/\.(mp4|mov|webm)$/i) ? (
                          <div className="w-14 h-14 bg-slate-900 rounded-lg flex items-center justify-center text-white shrink-0">
                            <Video className="w-7 h-7 text-emerald-400" />
                          </div>
                        ) : (
                          <img
                            src={currentMediaUrl}
                            alt="PO Evidence"
                            className="w-14 h-14 object-cover rounded-lg border border-slate-200 shrink-0"
                          />
                        )}
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {currentMediaUrl.match(/\.(mp4|mov|webm)$/i) ? 'Video Evidence File' : 'Photo Proof Image'}
                          </p>
                          <a
                            href={currentMediaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-blue-600 hover:underline flex items-center gap-1 mt-1 font-semibold"
                          >
                            <Eye className="w-3 h-3" /> View / Inspect Full Evidence
                          </a>
                        </div>
                      </div>
                      {!isApproved && (
                        <label className="cursor-pointer text-xs text-blue-700 hover:text-blue-900 font-medium px-2.5 py-1.5 border border-slate-200 bg-slate-50 hover:bg-slate-100 rounded-md transition-colors">
                          Replace Media
                          <input
                            type="file"
                            accept="image/*,video/*"
                            capture="environment"
                            onChange={handleMediaUpload}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-800 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold">Photo/video evidence required: </span>
                          Approval cannot proceed without proof of the damaged part, requisition slip, or quotation.
                        </div>
                      </div>
                      <div>
                        <label className="cursor-pointer inline-flex items-center justify-center px-4 py-2 bg-blue-900 text-white hover:bg-blue-950 rounded-lg text-xs font-semibold shadow-xs transition-colors gap-2">
                          {isUploadingMedia ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Uploading Media...</span>
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              <span>Upload Mandatory Photo / Video Proof</span>
                            </>
                          )}
                          <input
                            type="file"
                            accept="image/*,video/*"
                            capture="environment"
                            disabled={isUploadingMedia}
                            onChange={handleMediaUpload}
                            className="hidden"
                          />
                        </label>
                        {mediaUploadError && (
                          <p className="text-xs text-rose-600 font-medium mt-1.5">{mediaUploadError}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Items Table */}
                <div>
                  <h3 className="text-sm font-bold text-slate-900 mb-3">
                    Purchased Items ({order.items?.length || 0})
                  </h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs divide-y divide-slate-200">
                      <thead className="bg-slate-50 text-slate-700 font-semibold uppercase">
                        <tr>
                          <th className="py-2.5 px-3">Part Details</th>
                          <th className="py-2.5 px-3 text-right">Qty</th>
                          <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                          <th className="py-2.5 px-3 text-right">Line Amount (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-800">
                        {order.items.map((i, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900">
                                {formatItemDisplay(i.itemCode, i.itemName)}
                              </div>
                              <div className="text-slate-500 text-[11px] font-mono">Part Code: {i.itemCode}</div>
                              {i.warehouse && (
                                <div className="text-slate-400 text-[11px]">Wh: {i.warehouse}</div>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold">
                              {i.qty} {i.uom}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono">
                              ₹{i.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold text-slate-900">
                              ₹{i.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot className="bg-slate-50 border-t border-slate-200 font-semibold">
                        <tr>
                          <td colSpan={3} className="py-2.5 px-3 text-slate-700 text-right">
                            Grand Total:
                          </td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-right text-sm">
                            ₹{order.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Official Purchase Order Authorization Signatures */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Mandatory Verification & Authorization Signatures
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Authority Sign auto-applies on approval
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Box 1: Workshop Incharge */}
                    <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/60 flex flex-col justify-between min-h-[110px] text-center">
                      <div className="text-xs font-bold text-slate-900">Workshop Incharge Sign</div>
                      <div className="my-1.5 flex items-center justify-center min-h-[44px]">
                        {currentWorkshopSign ? (
                          <div className="flex flex-col items-center">
                            <img
                              src={currentWorkshopSign}
                              alt="Workshop Sign"
                              className="max-h-11 max-w-[130px] object-contain"
                            />
                            <span className="text-[9px] text-emerald-700 font-semibold flex items-center gap-0.5 mt-0.5">
                              <Check className="w-2.5 h-2.5" /> Digitally Signed
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setSignModalConfig({
                                isOpen: true,
                                role: 'Workshop Incharge (Verification of Spares)',
                                onSave: (sig) => setWorkshopSign(sig),
                              })
                            }
                            className="px-2.5 py-1 text-xs font-semibold text-blue-900 bg-white border border-blue-200 hover:bg-blue-50 rounded shadow-2xs flex items-center gap-1"
                          >
                            <PenTool className="w-3 h-3" /> Click to Sign
                          </button>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">Workshop Verification</div>
                    </div>

                    {/* Box 2: Mechanical Sign */}
                    <div className="p-3 border border-slate-200 rounded-lg bg-slate-50/60 flex flex-col justify-between min-h-[110px] text-center">
                      <div className="text-xs font-bold text-slate-900">Mechanical Sign</div>
                      <div className="my-1.5 flex items-center justify-center min-h-[44px]">
                        {currentMechanicalSign ? (
                          <div className="flex flex-col items-center">
                            <img
                              src={currentMechanicalSign}
                              alt="Mechanical Sign"
                              className="max-h-11 max-w-[130px] object-contain"
                            />
                            <span className="text-[9px] text-emerald-700 font-semibold flex items-center gap-0.5 mt-0.5">
                              <Check className="w-2.5 h-2.5" /> Digitally Signed
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setSignModalConfig({
                                isOpen: true,
                                role: 'Mechanical / Technical Quality Inspector',
                                onSave: (sig) => setMechanicalSign(sig),
                              })
                            }
                            className="px-2.5 py-1 text-xs font-semibold text-blue-900 bg-white border border-blue-200 hover:bg-blue-50 rounded shadow-2xs flex items-center gap-1"
                          >
                            <PenTool className="w-3 h-3" /> Click to Sign
                          </button>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">Technical Inspection</div>
                    </div>

                    {/* Box 3: Authority Sign (Auto-Added on Approval) */}
                    <div className="p-3 border border-blue-200 rounded-lg bg-blue-50/40 flex flex-col justify-between min-h-[110px] text-center">
                      <div className="text-xs font-bold text-blue-950">Authority Sign</div>
                      <div className="my-1.5 flex items-center justify-center min-h-[44px]">
                        {isApproved ? (
                          <div className="flex flex-col items-center">
                            <img
                              src="/branding/authority_signature.svg"
                              alt="Commercial Authority Seal"
                              className="max-h-11 max-w-[140px] object-contain"
                            />
                            <span className="text-[9px] text-blue-800 font-bold tracking-tight">
                              Officially Authorized
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            Auto-added upon Commercial Approval
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-blue-900 font-semibold">
                        Final Commercial Approval
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          {order && canManage && (
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end space-x-3">
              {order.docstatus === 0 && (
                <button
                  type="button"
                  onClick={handleApproveAndSubmit}
                  disabled={isSubmittingApproval}
                  className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-md text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isSubmittingApproval ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  <span>Approve & Submit Order</span>
                </button>
              )}

              {order.docstatus === 1 && (order.status === 'To Receive and Bill' || order.status === 'To Receive') && (
                <button
                  onClick={() => onReceiveGoods(order)}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-md text-xs font-semibold shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>Receive Goods (Goods Inward)</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Signature Pad Modal */}
      {signModalConfig?.isOpen && (
        <SignaturePadModal
          isOpen={signModalConfig.isOpen}
          roleTitle={signModalConfig.role}
          onClose={() => setSignModalConfig(null)}
          onSave={signModalConfig.onSave}
        />
      )}

      {/* Dedicated Single-Page Official Purchase Order Print Document */}
      {mounted && order && isApproved && createPortal(
        <OfficialPOPrintDocument
          order={order}
          evidenceMediaUrl={currentMediaUrl}
          workshopSign={currentWorkshopSign}
          mechanicalSign={currentMechanicalSign}
        />,
        document.body
      )}
    </>
  );
}

function OfficialPOPrintDocument({
  order,
  evidenceMediaUrl,
  workshopSign,
  mechanicalSign,
}: {
  order: PurchaseOrder;
  evidenceMediaUrl?: string;
  workshopSign?: string;
  mechanicalSign?: string;
}) {
  const totalQty = order.items?.reduce((sum, it) => sum + (it.qty || 0), 0) || 1;

  return (
    <div id="po-official-print-portal" className="hidden print:block text-black bg-white font-sans p-6 w-full max-w-[210mm] mx-auto">
      {/* 1. Official Header */}
      <div className="flex items-start justify-between border-b-2 border-black pb-2.5 mb-2.5">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 bg-blue-900 text-white rounded flex items-center justify-center font-black text-sm shrink-0 mt-0.5">
            UW
          </div>
          <div>
            <h1 className="text-base font-black tracking-tight text-black uppercase leading-tight">
              UPTOWARE FLEET MANAGEMENT
            </h1>
            <p className="text-[10px] font-bold text-slate-800 tracking-wide uppercase">
              JBR Eastern Pvt Ltd · Mining Haulage & Heavy Logistics Division
            </p>
            <p className="text-[9px] text-slate-600">
              Talcher Coal Fields, Angul, Odisha · GSTIN: 21AAACJ4928K1Z5
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-block bg-black text-white px-2 py-0.5 font-bold text-[10px] uppercase tracking-wider rounded-xs mb-1">
            OFFICIAL PURCHASE ORDER
          </div>
          <div className="text-xs font-mono font-black text-black">PO #{order.name}</div>
          <div className="text-[9px] text-slate-600">Date: {order.transactionDate}</div>
        </div>
      </div>

      {/* 2. Metadata Grid */}
      <div className="grid grid-cols-2 gap-2 border border-black rounded p-2 mb-2.5 text-[9px]">
        <div>
          <div className="font-bold text-slate-900 uppercase tracking-wider mb-0.5">SUPPLIER / VENDOR DETAILS:</div>
          <div className="text-xs font-bold text-black">{order.supplier}</div>
          <div className="text-slate-600 mt-0.5">Category: {order.procurementType || 'Spare Parts Replenishment'}</div>
          {order.scheduleDate && (
            <div className="text-slate-600">Expected Delivery: {order.scheduleDate}</div>
          )}
        </div>

        <div>
          <div className="font-bold text-slate-900 uppercase tracking-wider mb-0.5">FLEET ATTRIBUTION & SITE:</div>
          {order.vehicle ? (
            <div className="text-black font-semibold">
              Vehicle: <span className="font-mono font-bold text-black">{formatVehicleDisplay(order.vehicle, undefined, { includeModel: true })}</span>
            </div>
          ) : (
            <div className="text-slate-600">Vehicle: Central Stores Inventory</div>
          )}
          {order.vehicleBreakdown && (
            <div className="text-slate-700">Linked Breakdown: {order.vehicleBreakdown}</div>
          )}
          {order.mineSite && (
            <div className="text-slate-700">Delivery Mine: {formatMineSiteDisplay(order.mineSite)}</div>
          )}
          <div className="text-emerald-800 font-bold mt-0.5">
            Approval Stamp: {order.approvedBy ? order.approvedBy.split('@')[0] : 'Commercial Authority'}
          </div>
        </div>
      </div>

      {/* 3. Items Table */}
      <div className="border border-black rounded overflow-hidden mb-2.5">
        <table className="w-full text-left border-collapse text-[9px]">
          <thead className="bg-slate-100 border-b border-black text-black font-black uppercase text-[8.5px]">
            <tr>
              <th className="py-1 px-2 border-r border-black w-8 text-center">#</th>
              <th className="py-1 px-2 border-r border-black">Part Code & Description</th>
              <th className="py-1 px-2 border-r border-black w-24">Target Warehouse</th>
              <th className="py-1 px-2 border-r border-black w-14 text-right">Qty</th>
              <th className="py-1 px-2 border-r border-black w-18 text-right">Rate (₹)</th>
              <th className="py-1 px-2 w-20 text-right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 text-black">
            {order.items && order.items.length > 0 ? (
              order.items.map((it, idx) => (
                <tr key={idx} className="leading-tight">
                  <td className="py-1 px-2 border-r border-black text-center font-mono font-semibold">{idx + 1}</td>
                  <td className="py-1 px-2 border-r border-black">
                    <div className="font-bold text-black">{it.itemName || it.itemCode}</div>
                    <div className="text-[7.5px] font-mono text-slate-600">Code: {it.itemCode}</div>
                  </td>
                  <td className="py-1 px-2 border-r border-black font-mono text-slate-700">{it.warehouse || 'Stores - U'}</td>
                  <td className="py-1 px-2 border-r border-black text-right font-mono font-bold text-black">
                    {it.qty} {it.uom || 'Nos'}
                  </td>
                  <td className="py-1 px-2 border-r border-black text-right font-mono text-slate-900">
                    ₹{(it.rate || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-1 px-2 text-right font-mono font-bold text-black">
                    ₹{(it.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="py-2 text-center text-slate-500">No items specified.</td>
              </tr>
            )}
          </tbody>
          <tfoot className="border-t-2 border-black bg-slate-50 font-bold text-[10px]">
            <tr>
              <td colSpan={3} className="py-1.5 px-2 border-r border-black text-right uppercase tracking-wider text-slate-900">
                Grand Total ({order.items?.length || 0} Items):
              </td>
              <td className="py-1.5 px-2 border-r border-black text-right font-mono font-black text-black">
                {totalQty}
              </td>
              <td className="py-1.5 px-2 border-r border-black text-right font-mono text-slate-400">
                —
              </td>
              <td className="py-1.5 px-2 text-right font-mono font-black text-black text-xs">
                ₹{order.grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 4. Commercial Terms & Proof Verification Note */}
      <div className="border border-black rounded p-2 mb-2 bg-slate-50/30 text-[8.5px] text-slate-700">
        <div className="font-bold text-slate-900 uppercase tracking-wider mb-0.5">Commercial & Quality Verification Terms:</div>
        <ol className="list-decimal list-inside space-y-0.5">
          <li>Supplied items must be delivered with an original Commercial Tax Invoice and verified Delivery Challan referencing this PO number.</li>
          <li>All components are subject to mechanical quality inspection and acceptance prior to final payment clearance.</li>
          <li>
            Physical Proof / Evidence Verification: {evidenceMediaUrl ? <span className="font-semibold text-emerald-800 font-mono">[PHOTO/VIDEO PROOF ARCHIVED IN ERP SYSTEM]</span> : <span className="font-semibold text-slate-600">[STANDARD COMMERCIAL REQUISITION]</span>}
          </li>
        </ol>
      </div>

      {/* 5. Mandatory Verification & Authorization Signatures */}
      <div className="border border-black rounded p-2">
        <div className="text-[8.5px] font-bold text-slate-800 uppercase tracking-wider mb-1 text-center">
          MANDATORY VERIFICATION & COMMERCIAL AUTHORIZATION SIGNATURES
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {/* Sign 1: Workshop Incharge */}
          <div className="border border-slate-300 rounded p-1 bg-slate-50/50 flex flex-col justify-between h-20">
            <div className="text-[8.5px] font-bold text-slate-900">Workshop Incharge</div>
            <div className="my-0.5 flex items-center justify-center">
              {workshopSign ? (
                <img src={workshopSign} alt="Workshop Sign" className="max-h-8 object-contain" />
              ) : (
                <div className="border-b border-dashed border-slate-500 w-3/4 mx-auto mb-1"></div>
              )}
            </div>
            <div>
              <div className="text-[7.5px] text-slate-600 font-semibold">Verification of Spares</div>
              <div className="text-[7px] text-slate-500">Date: {order.transactionDate}</div>
            </div>
          </div>

          {/* Sign 2: Mechanical Inspection */}
          <div className="border border-slate-300 rounded p-1 bg-slate-50/50 flex flex-col justify-between h-20">
            <div className="text-[8.5px] font-bold text-slate-900">Mechanical / Technical</div>
            <div className="my-0.5 flex items-center justify-center">
              {mechanicalSign ? (
                <img src={mechanicalSign} alt="Mechanical Sign" className="max-h-8 object-contain" />
              ) : (
                <div className="border-b border-dashed border-slate-500 w-3/4 mx-auto mb-1"></div>
              )}
            </div>
            <div>
              <div className="text-[7.5px] text-slate-600 font-semibold">Technical Inspection</div>
              <div className="text-[7px] text-slate-500">Date: {order.transactionDate}</div>
            </div>
          </div>

          {/* Sign 3: Authority Sign (Auto-Added) */}
          <div className="border border-blue-300 rounded p-1 bg-blue-50/30 flex flex-col justify-between h-20">
            <div className="text-[8.5px] font-bold text-blue-950">Authorized Commercial Sign</div>
            <div className="my-0.5 flex items-center justify-center">
              <img
                src="/branding/authority_signature.svg"
                alt="Authority Stamp"
                className="max-h-9 object-contain"
              />
            </div>
            <div>
              <div className="text-[7.5px] text-blue-900 font-bold">
                {order.approvedBy ? `Approved by ${order.approvedBy.split('@')[0]}` : 'Commercial Authority'}
              </div>
              <div className="text-[7px] text-slate-500">Date: {order.approvedOn || order.transactionDate}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
