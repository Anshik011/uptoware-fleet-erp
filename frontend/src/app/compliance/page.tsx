'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { VehicleComplianceRecord, ComplianceMetrics } from '@/types/fleet';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { ComplianceDashboard } from '@/components/compliance/ComplianceDashboard';
import { ComplianceTable } from '@/components/compliance/ComplianceTable';
import { VehicleComplianceDrawer } from '@/components/compliance/VehicleComplianceDrawer';
import { UpdateComplianceModal } from '@/components/compliance/UpdateComplianceModal';
import { ShieldCheck, RefreshCw, AlertCircle, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';

export default function CompliancePage() {
  const { hasRole } = useAuth();
  const canManage = hasRole(['Fleet Manager', 'Administrator']);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<ComplianceMetrics>({
    totalVehicles: 0,
    fullyCompliant: 0,
    expiringSoon: 0,
    nonCompliant: 0,
    insuranceExpired: 0,
    fitnessExpired: 0,
  });

  const [records, setRecords] = useState<VehicleComplianceRecord[]>([]);

  // Modal & Drawer State
  const [selectedRecord, setSelectedRecord] = useState<VehicleComplianceRecord | null>(null);
  const [updateModalRecord, setUpdateModalRecord] = useState<VehicleComplianceRecord | null>(null);
  const [initialDocType, setInitialDocType] = useState<'Fitness' | 'PUC' | 'Road Tax' | 'Permit'>('Fitness');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/compliance/vehicles');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch statutory compliance records');
      }

      setRecords(json.data || []);
      if (json.metrics) {
        setMetrics(json.metrics);
      }

      // If drawer is currently open for a vehicle, refresh its state
      if (selectedRecord) {
        const updated = (json.data || []).find(
          (r: VehicleComplianceRecord) => r.vehicle === selectedRecord.vehicle
        );
        if (updated) setSelectedRecord(updated);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading compliance data');
    } finally {
      setIsLoading(false);
    }
  }, [selectedRecord]);

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenUpdateModal = (
    rec: VehicleComplianceRecord,
    docType: 'Fitness' | 'PUC' | 'Road Tax' | 'Permit' = 'Fitness'
  ) => {
    setInitialDocType(docType);
    setUpdateModalRecord(rec);
  };

  return (
    <AppShell>
      <PageContainer>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Vehicle Statutory Compliance
              </h1>
              <p className="text-sm text-slate-500">
                Fleet statutory certificates, fitness, emission PUC, road taxes, and dispatch eligibility
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/compliance/reports"
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
            >
              <FileSpreadsheet className="w-4 h-4 text-blue-600" />
              <span>Compliance Reports</span>
            </Link>

            <button
              onClick={() => loadData()}
              disabled={isLoading}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
              title="Refresh Compliance"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Dashboard KPIs */}
        <ComplianceDashboard metrics={metrics} isLoading={isLoading} />

        {/* Compliance Table */}
        <ComplianceTable
          records={records}
          onSelectVehicle={(r) => setSelectedRecord(r)}
          onUpdateDocument={canManage ? (r, docType) => handleOpenUpdateModal(r, docType) : undefined}
          isLoading={isLoading}
        />

        {/* Modals & Drawers */}
        <VehicleComplianceDrawer
          record={selectedRecord}
          isOpen={Boolean(selectedRecord)}
          onClose={() => setSelectedRecord(null)}
          onUpdateDocument={canManage ? (r, docType) => handleOpenUpdateModal(r, docType) : undefined}
        />

        <UpdateComplianceModal
          isOpen={Boolean(updateModalRecord)}
          onClose={() => setUpdateModalRecord(null)}
          onSuccess={() => loadData()}
          record={updateModalRecord}
          initialDocType={initialDocType}
        />
      </PageContainer>
    </AppShell>
  );
}

