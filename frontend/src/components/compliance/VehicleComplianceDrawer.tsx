'use client';

import React from 'react';
import {
  X,
  Truck,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Calendar,
  FileText,
  ExternalLink,
  Edit,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from 'lucide-react';
import { VehicleComplianceRecord, StatutoryDocDetail, StatutoryHealth } from '@/types/fleet';
import Link from 'next/link';

interface VehicleComplianceDrawerProps {
  record: VehicleComplianceRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateDocument?: (
    record: VehicleComplianceRecord,
    docType: 'Fitness' | 'PUC' | 'Road Tax' | 'Permit'
  ) => void;
}

export function VehicleComplianceDrawer({
  record,
  isOpen,
  onClose,
  onUpdateDocument,
}: VehicleComplianceDrawerProps) {
  if (!isOpen || !record) return null;

  const getHealthBadge = (health: StatutoryHealth) => {
    switch (health) {
      case 'valid':
        return {
          label: 'Valid & Dispatch Compliant',
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500',
        };
      case 'expiring_soon':
        return {
          label: 'Expiring Soon (<30 Days)',
          bg: 'bg-amber-50 text-amber-800 border-amber-300',
          dot: 'bg-amber-500',
        };
      case 'expired':
        return {
          label: 'Expired / Non-Compliant',
          bg: 'bg-rose-50 text-rose-800 border-rose-300',
          dot: 'bg-rose-500',
        };
      case 'missing':
      default:
        return {
          label: 'Missing Statutory Document',
          bg: 'bg-slate-100 text-slate-700 border-slate-300',
          dot: 'bg-slate-400',
        };
    }
  };

  const isDispatchBlocked =
    record.insurance.status === 'expired' ||
    record.insurance.status === 'missing' ||
    record.fitness.status === 'expired' ||
    record.fitness.status === 'missing';

  const overallBadge = getHealthBadge(record.overallCompliance);

  const renderDocCard = (
    doc: StatutoryDocDetail,
    docType: 'Insurance' | 'Fitness' | 'PUC' | 'Road Tax' | 'Permit'
  ) => {
    const badge = getHealthBadge(doc.status);

    return (
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
            <h4 className="text-sm font-bold text-slate-900">{doc.title}</h4>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.bg}`}
          >
            {badge.label}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <div>
            <span className="text-slate-400 block text-[11px]">Document Expiry</span>
            <span className="font-semibold text-slate-800 font-mono">
              {doc.expiryDate || 'Not Recorded'}
            </span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Validity Horizon</span>
            <span
              className={`font-semibold ${
                doc.daysRemaining !== null
                  ? doc.daysRemaining > 30
                    ? 'text-emerald-700'
                    : doc.daysRemaining > 0
                    ? 'text-amber-700'
                    : 'text-rose-700'
                  : 'text-slate-500'
              }`}
            >
              {doc.daysRemaining !== null
                ? doc.daysRemaining > 0
                  ? `${doc.daysRemaining} days remaining`
                  : doc.daysRemaining === 0
                  ? 'Expires today'
                  : `Expired ${Math.abs(doc.daysRemaining)} days ago`
                : 'No data'}
            </span>
          </div>
        </div>

        {/* Certificate File Attachment */}
        <div className="flex items-center justify-between pt-1">
          {doc.docUrl ? (
            <a
              href={doc.docUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              <FileText className="w-3.5 h-3.5" />
              View Uploaded Certificate <ExternalLink className="w-3 h-3" />
            </a>
          ) : (
            <span className="text-xs text-slate-400 italic">No document file attached</span>
          )}

          {docType === 'Insurance' ? (
            <Link
              href="/insurance"
              className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded flex items-center gap-1 transition-colors"
            >
              Manage Policy
            </Link>
          ) : (
            onUpdateDocument && (
              <button
                onClick={() => onUpdateDocument(record, docType as any)}
                className="px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded flex items-center gap-1 transition-colors"
              >
                <Edit className="w-3 h-3" />
                Update Certificate
              </button>
            )
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50">
            <div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-mono font-bold text-blue-600">
                  STATUTORY COMPLIANCE DOSSIER
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-1 font-mono tracking-tight">
                {record.vehicle}
              </h2>
              <div className="text-xs text-slate-500 font-mono mt-0.5">
                Plate: <span className="font-semibold text-slate-800">{record.licensePlate || 'N/A'}</span>
                {record.make && ` • ${record.make} ${record.model || ''}`}
              </div>
              <div className="mt-2.5">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${overallBadge.bg}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${overallBadge.dot}`} />
                  {overallBadge.label}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* Dispatch Blocking Notice */}
            {isDispatchBlocked ? (
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-900">
                  <span className="font-bold block text-sm">Dispatch Gate Locked</span>
                  This vehicle is prohibited from being dispatched. ERPNext automated eligibility
                  safeguards reject any trip dispatch until valid Commercial Insurance and
                  Fitness Certificates are updated.
                </div>
              </div>
            ) : (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Dispatch gate clearance active. All mandatory statutory covenants verified.</span>
              </div>
            )}

            {/* Document Details List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Statutory Certificates (5 Covenants)
              </h3>

              {/* 1. Insurance */}
              {renderDocCard(record.insurance, 'Insurance')}

              {/* 2. Fitness */}
              {renderDocCard(record.fitness, 'Fitness')}

              {/* 3. PUC */}
              {renderDocCard(record.puc, 'PUC')}

              {/* 4. Road Tax */}
              {renderDocCard(record.roadTax, 'Road Tax')}

              {/* 5. Permit */}
              {renderDocCard(record.permit, 'Permit')}
            </div>
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              Close Dossier
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

