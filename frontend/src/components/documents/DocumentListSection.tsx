'use client';

import React, { useEffect, useState } from 'react';
import {
  FileText,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Upload,
  Check,
  X,
  ExternalLink,
  RotateCw,
  Loader2,
  Calendar,
  Eye,
  History
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DocumentUploadModal } from './DocumentUploadModal';

interface DocumentItem {
  id: string;
  documentCategory: string;
  documentNumber: string;
  issueDate?: string;
  expiryDate: string;
  issuingAuthority?: string;
  fileAttachment: string;
  fileName?: string;
  fileType?: string;
  verificationStatus: 'Pending' | 'Verified' | 'Rejected';
  verifiedBy?: string;
  verificationDate?: string;
  rejectionReason?: string;
  remarks?: string;
  replacedDocument?: string;
  isActive: boolean;
  uploadedBy?: string;
  uploadDate?: string;
}

interface DocumentListSectionProps {
  entityType: 'driver' | 'vehicle';
  entityId: string;
  entityLabel: string;
  canManage: boolean;
}

export function DocumentListSection({
  entityType,
  entityId,
  entityLabel,
  canManage,
}: DocumentListSectionProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [replaceDoc, setReplaceDoc] = useState<DocumentItem | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectingDocId, setRejectingDocId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const loadDocuments = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const paramName = entityType === 'driver' ? 'driver' : 'vehicle';
      const endpoint = entityType === 'driver' ? '/api/documents/drivers' : '/api/documents/vehicles';
      const res = await fetch(`${endpoint}?${paramName}=${encodeURIComponent(entityId)}&include_test=true`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch documents.');
      }
      setDocuments(json.data || []);
    } catch (err: any) {
      console.error('Error loading documents:', err);
      setError(err.message || 'Failed to retrieve documents.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (entityId) {
      loadDocuments();
    }
  }, [entityId, entityType]);

  const handleVerify = async (docId: string) => {
    try {
      setActionLoading(docId);
      const endpoint =
        entityType === 'driver'
          ? `/api/documents/drivers/${encodeURIComponent(docId)}`
          : `/api/documents/vehicles/${encodeURIComponent(docId)}`;

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verificationStatus: 'Verified' }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to verify document.');
      }

      await loadDocuments();
    } catch (err: any) {
      alert(err.message || 'Error verifying document.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingDocId) return;
    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejecting the document.');
      return;
    }

    try {
      setActionLoading(rejectingDocId);
      const endpoint =
        entityType === 'driver'
          ? `/api/documents/drivers/${encodeURIComponent(rejectingDocId)}`
          : `/api/documents/vehicles/${encodeURIComponent(rejectingDocId)}`;

      const res = await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          verificationStatus: 'Rejected',
          rejectionReason: rejectionReason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to reject document.');
      }

      setRejectingDocId(null);
      setRejectionReason('');
      await loadDocuments();
    } catch (err: any) {
      alert(err.message || 'Error rejecting document.');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Verified':
        return (
          <Badge variant="positive" size="sm" className="gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            Verified
          </Badge>
        );
      case 'Rejected':
        return (
          <Badge variant="critical" size="sm" className="gap-1">
            <ShieldAlert className="w-3 h-3 text-rose-600" />
            Rejected
          </Badge>
        );
      case 'Pending':
      default:
        return (
          <Badge variant="warning" size="sm" className="gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            Pending Review
          </Badge>
        );
    }
  };

  const getExpiryDetails = (expiryDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expiryDateStr);
    exp.setHours(0, 0, 0, 0);

    const diffDays = Math.round((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="text-rose-600 font-semibold flex items-center gap-1 text-[11px]">
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          Expired ({Math.abs(diffDays)}d ago)
        </span>
      );
    }
    if (diffDays <= 30) {
      return (
        <span className="text-amber-600 font-semibold flex items-center gap-1 text-[11px]">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          Expiring in {diffDays}d
        </span>
      );
    }
    return (
      <span className="text-slate-600 flex items-center gap-1 text-[11px]">
        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        Valid ({diffDays}d left)
      </span>
    );
  };

  const displayedDocs = documents.filter((d) => (showHistory ? true : d.isActive));

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-blue-900" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Statutory & Verification Documents
          </h3>
          <span className="text-[11px] text-slate-500 font-normal">
            ({displayedDocs.length} {showHistory ? 'total' : 'active'})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className={`px-2 py-1 text-[11px] rounded border transition-colors flex items-center gap-1 ${
              showHistory
                ? 'bg-blue-50 text-blue-900 border-blue-200'
                : 'text-slate-600 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <History className="w-3 h-3" />
            {showHistory ? 'Active Only' : 'Version History'}
          </button>

          {canManage && (
            <Button
              variant="primary"
              size="sm"
              icon={Upload}
              onClick={() => {
                setReplaceDoc(null);
                setShowUploadModal(true);
              }}
            >
              Upload Document
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="p-8 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-900" />
          <span className="text-xs text-slate-500">Loading statutory documents...</span>
        </div>
      ) : error ? (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      ) : displayedDocs.length === 0 ? (
        <div className="p-6 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-center">
          <FileText className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
          <p className="text-xs font-semibold text-slate-700">No documents registered</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Upload driving licenses, permits, certificates, and compliance records.
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Document Category</th>
                  <th className="py-2.5 px-3">Certificate / No.</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Expiry Date</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {displayedDocs.map((doc) => (
                  <tr
                    key={doc.id}
                    className={`hover:bg-slate-50/80 transition-colors ${
                      !doc.isActive ? 'bg-slate-50/50 opacity-75' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                        <span>{doc.documentCategory}</span>
                        {!doc.isActive && (
                          <span className="px-1.5 py-0.2 text-[9px] bg-slate-200 text-slate-600 rounded">
                            Replaced
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {doc.issuingAuthority || 'Standard Authority'} ·{' '}
                        {doc.fileName || 'document_file'}
                      </div>
                    </td>

                    <td className="py-2.5 px-3 font-mono font-medium text-slate-800">
                      {doc.documentNumber}
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="flex flex-col gap-1 items-start">
                        {getStatusBadge(doc.verificationStatus)}
                        {doc.verificationStatus === 'Rejected' && doc.rejectionReason && (
                          <span className="text-[10px] text-rose-600 italic">
                            Reason: {doc.rejectionReason}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-2.5 px-3">
                      <div className="font-mono text-slate-700 text-xs">{doc.expiryDate}</div>
                      <div className="mt-0.5">{getExpiryDetails(doc.expiryDate)}</div>
                    </td>

                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* File preview / download through authenticated proxy */}
                        <a
                          href={`/api/documents/download?file=${encodeURIComponent(doc.fileAttachment)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded transition-colors"
                          title="View / Download Document"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>

                        {/* Replace Document */}
                        {canManage && doc.isActive && (
                          <button
                            type="button"
                            onClick={() => {
                              setReplaceDoc(doc);
                              setShowUploadModal(true);
                            }}
                            className="p-1 text-slate-600 hover:text-blue-900 hover:bg-slate-100 rounded transition-colors"
                            title="Upload Replacement Version"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Verification Actions */}
                        {canManage && doc.verificationStatus === 'Pending' && (
                          <>
                            <button
                              type="button"
                              disabled={actionLoading === doc.id}
                              onClick={() => handleVerify(doc.id)}
                              className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded text-[11px] font-medium transition-colors flex items-center gap-0.5"
                              title="Mark as Verified"
                            >
                              <Check className="w-3 h-3" />
                              <span>Verify</span>
                            </button>
                            <button
                              type="button"
                              disabled={actionLoading === doc.id}
                              onClick={() => {
                                setRejectingDocId(doc.id);
                                setRejectionReason('');
                              }}
                              className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded text-[11px] font-medium transition-colors flex items-center gap-0.5"
                              title="Reject Document"
                            >
                              <X className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejection Prompt Modal */}
      {rejectingDocId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Reject Document</h3>
            <p className="text-xs text-slate-500">
              Please enter the reason for rejecting this document (e.g. illegible copy, expired, wrong document type).
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={3}
              placeholder="Enter rejection reason..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
              required
            />
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRejectingDocId(null)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={actionLoading === rejectingDocId}
                className="px-3 py-1.5 text-xs text-white bg-rose-600 hover:bg-rose-700 rounded-lg flex items-center gap-1 font-medium"
              >
                {actionLoading === rejectingDocId ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <X className="w-3 h-3" />
                )}
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={showUploadModal}
        onClose={() => {
          setShowUploadModal(false);
          setReplaceDoc(null);
        }}
        entityType={entityType}
        entityId={entityId}
        entityLabel={entityLabel}
        onSuccess={loadDocuments}
        replacedDocId={replaceDoc?.id}
        replacedCategory={replaceDoc?.documentCategory}
      />
    </div>
  );
}

