'use client';

import React, { useState } from 'react';
import { X, UploadCloud, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { DriverDocumentCategory, VehicleDocumentCategory } from '@/types/fleet';

interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'driver' | 'vehicle';
  entityId: string;
  entityLabel: string;
  onSuccess: () => void;
  replacedDocId?: string;
  replacedCategory?: string;
}

const DRIVER_CATEGORIES: DriverDocumentCategory[] = [
  'Driving License',
  'Medical Certificate',
  'Aadhaar Card',
  'Police Verification',
  'Eye Test Certificate',
  'Hazardous Material Certificate',
  'Background Verification',
  'Other',
];

const VEHICLE_CATEGORIES: VehicleDocumentCategory[] = [
  'Registration Certificate (RC)',
  'Fitness Certificate',
  'Pollution Under Control (PUC)',
  'National / State Permit',
  'Road Tax Token',
  'Insurance Policy Document',
  'Mining Pass / Entry Permit',
  'Other',
];

export function DocumentUploadModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityLabel,
  onSuccess,
  replacedDocId,
  replacedCategory,
}: DocumentUploadModalProps) {
  const [category, setCategory] = useState<string>(
    replacedCategory || (entityType === 'driver' ? 'Driving License' : 'Registration Certificate (RC)')
  );
  const [documentNumber, setDocumentNumber] = useState('');
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [remarks, setRemarks] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        setError('Only PDF, JPG, JPEG, and PNG files are supported.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must not exceed 10 MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedFile) {
      setError('Please select a document file to upload.');
      return;
    }
    if (!documentNumber.trim()) {
      setError('Document number is required.');
      return;
    }
    if (!expiryDate) {
      setError('Document expiry date is mandatory.');
      return;
    }

    try {
      setIsUploading(true);

      // Step 1: Upload file to Frappe File storage
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadRes = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      const uploadJson = await uploadRes.json();
      if (!uploadRes.ok || !uploadJson.success) {
        throw new Error(uploadJson.error || 'Failed to upload document file.');
      }

      const { fileUrl, fileName, fileType } = uploadJson.data;

      // Step 2: Register Document Record
      const endpoint = entityType === 'driver' ? '/api/documents/drivers' : '/api/documents/vehicles';
      const payload: Record<string, any> = {
        documentCategory: category,
        documentNumber: documentNumber.trim(),
        issueDate: issueDate || null,
        expiryDate,
        issuingAuthority: issuingAuthority.trim() || null,
        fileAttachment: fileUrl,
        fileName: fileName || selectedFile.name,
        fileType: fileType || selectedFile.name.split('.').pop()?.toUpperCase(),
        verificationStatus: 'Pending',
        remarks: remarks.trim() || null,
        replacedDocument: replacedDocId || null,
      };

      if (entityType === 'driver') {
        payload.driver = entityId;
      } else {
        payload.vehicle = entityId;
      }

      const saveRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const saveJson = await saveRes.json();
      if (!saveRes.ok || !saveJson.success) {
        throw new Error(saveJson.error || 'Failed to save document metadata.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Document submission error:', err);
      setError(err.message || 'An error occurred during upload.');
    } finally {
      setIsUploading(false);
    }
  };

  const categories = entityType === 'driver' ? DRIVER_CATEGORIES : VEHICLE_CATEGORIES;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {replacedDocId ? 'Replace Document' : `Upload ${entityType === 'driver' ? 'Driver' : 'Vehicle'} Document`}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Target Asset: <span className="font-semibold text-slate-800">{entityLabel}</span> ({entityId})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Category Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Document Category <span className="text-rose-500">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={Boolean(replacedDocId)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 bg-white"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Document Number & Issuing Authority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Document / Certificate No. <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="e.g. DL-KA1920210045"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Issuing Authority
              </label>
              <input
                type="text"
                value={issuingAuthority}
                onChange={(e) => setIssuingAuthority(e.target.value)}
                placeholder="e.g. RTO Mangalore"
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
          </div>

          {/* Issue Date & Expiry Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Issue Date
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Expiry Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
                required
              />
            </div>
          </div>

          {/* File Upload Drag & Drop Box */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Document File (PDF, JPG, PNG - Max 10MB) <span className="text-rose-500">*</span>
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center hover:border-blue-900 transition-colors bg-slate-50/50">
              <input
                type="file"
                id="doc-file-input"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="doc-file-input" className="cursor-pointer flex flex-col items-center">
                {selectedFile ? (
                  <div className="flex items-center gap-2 text-blue-900 font-medium text-xs">
                    <FileText className="w-5 h-5 text-blue-900" />
                    <span>{selectedFile.name}</span>
                    <span className="text-slate-400 font-normal">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8 text-slate-400 mb-2" />
                    <span className="text-xs font-medium text-blue-900 hover:underline">
                      Click to choose file
                    </span>
                    <span className="text-[11px] text-slate-400 mt-0.5">
                      PDF, JPG, PNG up to 10MB
                    </span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Notes / Remarks
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              placeholder="Optional verification remarks or notes..."
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900"
            />
          </div>

          {/* Modal Actions */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-900 rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading & Registering...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{replacedDocId ? 'Replace Document' : 'Save Document'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

