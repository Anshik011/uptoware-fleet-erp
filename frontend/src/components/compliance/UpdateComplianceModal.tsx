'use client';

import React, { useState, useEffect } from 'react';
import { X, FileCheck, AlertCircle, Calendar, Truck, FileText } from 'lucide-react';
import { VehicleComplianceRecord, UpdateComplianceInput } from '@/types/fleet';

interface UpdateComplianceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  record: VehicleComplianceRecord | null;
  initialDocType?: 'Fitness' | 'PUC' | 'Road Tax' | 'Permit';
}

export function UpdateComplianceModal({
  isOpen,
  onClose,
  onSuccess,
  record,
  initialDocType = 'Fitness',
}: UpdateComplianceModalProps) {
  const [formData, setFormData] = useState<UpdateComplianceInput>({
    vehicle: '',
    documentType: initialDocType,
    expiryDate: '',
    docUrl: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && record) {
      setError(null);
      const docType = initialDocType || 'Fitness';
      let existingExpiry = '';
      let existingDoc = '';

      if (docType === 'Fitness') {
        existingExpiry = record.fitness.expiryDate || '';
        existingDoc = record.fitness.docUrl || '';
      } else if (docType === 'PUC') {
        existingExpiry = record.puc.expiryDate || '';
        existingDoc = record.puc.docUrl || '';
      } else if (docType === 'Road Tax') {
        existingExpiry = record.roadTax.expiryDate || '';
        existingDoc = record.roadTax.docUrl || '';
      } else if (docType === 'Permit') {
        existingExpiry = record.permit.expiryDate || '';
        existingDoc = record.permit.docUrl || '';
      }

      setFormData({
        vehicle: record.vehicle,
        documentType: docType,
        expiryDate: existingExpiry,
        docUrl: existingDoc,
      });
    }
  }, [isOpen, record, initialDocType]);

  const handleDocTypeChange = (type: 'Fitness' | 'PUC' | 'Road Tax' | 'Permit') => {
    if (!record) return;
    let existingExpiry = '';
    let existingDoc = '';

    if (type === 'Fitness') {
      existingExpiry = record.fitness.expiryDate || '';
      existingDoc = record.fitness.docUrl || '';
    } else if (type === 'PUC') {
      existingExpiry = record.puc.expiryDate || '';
      existingDoc = record.puc.docUrl || '';
    } else if (type === 'Road Tax') {
      existingExpiry = record.roadTax.expiryDate || '';
      existingDoc = record.roadTax.docUrl || '';
    } else if (type === 'Permit') {
      existingExpiry = record.permit.expiryDate || '';
      existingDoc = record.permit.docUrl || '';
    }

    setFormData((prev) => ({
      ...prev,
      documentType: type,
      expiryDate: existingExpiry,
      docUrl: existingDoc,
    }));
  };

  if (!isOpen || !record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.expiryDate) {
      setError('A valid future expiry date is strictly required.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/compliance/vehicles/${encodeURIComponent(record.vehicle)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to update statutory compliance certificate.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error updating statutory record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg my-8 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Update Statutory Certificate</h2>
              <p className="text-xs text-slate-500">
                Update statutory validity for vehicle{' '}
                <span className="font-semibold text-slate-700 font-mono">{record.vehicle}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Vehicle Identifier (Read only) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Target Haulage Asset
            </label>
            <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-800 flex items-center justify-between">
              <span>{record.vehicle}</span>
              <span className="font-normal text-slate-500">{record.licensePlate || 'No Plate'}</span>
            </div>
          </div>

          {/* Document Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Statutory Covenant Type <span className="text-rose-500">*</span>
            </label>
            <select
              value={formData.documentType}
              onChange={(e) =>
                handleDocTypeChange(
                  e.target.value as 'Fitness' | 'PUC' | 'Road Tax' | 'Permit'
                )
              }
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="Fitness">Fitness Certificate (FC)</option>
              <option value="PUC">Pollution Under Control (PUC)</option>
              <option value="Road Tax">State Road Tax Receipt</option>
              <option value="Permit">Mining & Goods Transport Permit</option>
            </select>
          </div>

          {/* New Expiry Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              New Expiration Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                required
              />
            </div>
          </div>

          {/* Certificate File Link */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Certificate Document URL / Frappe File
            </label>
            <input
              type="text"
              value={formData.docUrl || ''}
              onChange={(e) => setFormData({ ...formData, docUrl: e.target.value })}
              placeholder="/files/fitness_cert_MH12AB1234.pdf"
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Provide the file path or URL to the scanned government certificate.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <FileCheck className="w-4 h-4" />
                  Save Certificate
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

