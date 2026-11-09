'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { VehicleInsurancePolicy, InsuranceMetrics } from '@/types/fleet';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { InsuranceDashboard } from '@/components/insurance/InsuranceDashboard';
import { InsuranceTable } from '@/components/insurance/InsuranceTable';
import { AddInsurancePolicyModal } from '@/components/insurance/AddInsurancePolicyModal';
import { InsurancePolicyDrawer } from '@/components/insurance/InsurancePolicyDrawer';
import { RenewPolicyModal } from '@/components/insurance/RenewPolicyModal';
import { Shield, PlusCircle, RefreshCw, AlertCircle } from 'lucide-react';

export default function InsurancePage() {
  const { hasRole } = useAuth();
  const canManage = hasRole(['Fleet Manager', 'Administrator']);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<InsuranceMetrics>({
    totalPolicies: 0,
    activePolicies: 0,
    expiringSoon: 0,
    expired: 0,
    totalPremiumSpent: 0,
    averagePremium: 0,
  });

  const [policies, setPolicies] = useState<VehicleInsurancePolicy[]>([]);
  const [vehicles, setVehicles] = useState<Array<{ name: string; license_plate: string }>>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<string[]>([]);
  const [policyTypes, setPolicyTypes] = useState<string[]>([]);

  // Modal & Drawer State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<VehicleInsurancePolicy | null>(null);
  const [renewPolicyTarget, setRenewPolicyTarget] = useState<VehicleInsurancePolicy | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [policiesRes, optionsRes] = await Promise.all([
        fetch('/api/insurance/policies'),
        fetch('/api/insurance/options'),
      ]);

      const policiesJson = await policiesRes.json();
      if (!policiesRes.ok || !policiesJson.success) {
        throw new Error(policiesJson.error || 'Failed to fetch insurance policies');
      }

      setPolicies(policiesJson.data || []);
      if (policiesJson.metrics) {
        setMetrics(policiesJson.metrics);
      }

      if (optionsRes.ok) {
        const optionsJson = await optionsRes.json();
        if (optionsJson.vehicles) setVehicles(optionsJson.vehicles);
        if (optionsJson.companies) setInsuranceCompanies(optionsJson.companies);
        if (optionsJson.policyTypes) setPolicyTypes(optionsJson.policyTypes);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading insurance data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleActivatePolicy = async (policy: VehicleInsurancePolicy) => {
    try {
      const res = await fetch(`/api/insurance/policies/${encodeURIComponent(policy.id)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate' }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to activate policy');
      await loadData();
      if (selectedPolicy && selectedPolicy.id === policy.id) {
        setSelectedPolicy(null);
      }
    } catch (err: any) {
      alert(err.message || 'Error activating policy');
    }
  };

  const handleCancelPolicy = async (policy: VehicleInsurancePolicy, reason: string) => {
    const res = await fetch(`/api/insurance/policies/${encodeURIComponent(policy.id)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', cancellationReason: reason }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Failed to cancel policy');
    await loadData();
    if (selectedPolicy && selectedPolicy.id === policy.id) {
      setSelectedPolicy(null);
    }
  };

  const handleOpenRenewModal = (policy: VehicleInsurancePolicy) => {
    setRenewPolicyTarget(policy);
  };

  return (
    <AppShell>
      <PageContainer>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Vehicle Insurance Management
              </h1>
              <p className="text-sm text-slate-500">
                Commercial fleet policies, renewals, IDV valuations, and coverage horizons
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => loadData()}
              disabled={isLoading}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200"
              title="Refresh Register"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {canManage && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition-colors flex items-center space-x-2"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Register Policy</span>
              </button>
            )}
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
        <InsuranceDashboard metrics={metrics} isLoading={isLoading} />

        {/* Insurance Policies Register Table */}
        <InsuranceTable
          policies={policies}
          onSelectPolicy={(p) => setSelectedPolicy(p)}
          onRenewPolicy={canManage ? handleOpenRenewModal : undefined}
          onActivatePolicy={canManage ? handleActivatePolicy : undefined}
          isLoading={isLoading}
        />

        {/* Modals & Drawers */}
        <AddInsurancePolicyModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          onSuccess={() => loadData()}
          vehicles={vehicles}
          insuranceCompanies={insuranceCompanies}
          policyTypes={policyTypes}
        />

        <RenewPolicyModal
          isOpen={Boolean(renewPolicyTarget)}
          onClose={() => setRenewPolicyTarget(null)}
          onSuccess={() => loadData()}
          policy={renewPolicyTarget}
        />

        <InsurancePolicyDrawer
          policy={selectedPolicy}
          isOpen={Boolean(selectedPolicy)}
          onClose={() => setSelectedPolicy(null)}
          onActivate={canManage ? handleActivatePolicy : undefined}
          onCancel={canManage ? handleCancelPolicy : undefined}
          onRenew={canManage ? handleOpenRenewModal : undefined}
        />
      </PageContainer>
    </AppShell>
  );
}

