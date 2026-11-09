'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Supplier, ProcurementMetrics } from '@/types/fleet';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { SuppliersTable } from '@/components/procurement/SuppliersTable';
import { AddSupplierModal } from '@/components/procurement/AddSupplierModal';
import { SupplierDetailDrawer } from '@/components/procurement/SupplierDetailDrawer';
import { Button } from '@/components/ui/Button';
import { Users, PlusCircle, RefreshCw, AlertCircle, Star, IndianRupee, ShoppingCart } from 'lucide-react';

export default function SuppliersPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole(['Fleet Manager', 'Accountant', 'Administrator']);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [metrics, setMetrics] = useState<ProcurementMetrics>({
    totalSpend: 0,
    openOrdersCount: 0,
    pendingReceiptsCount: 0,
    outstandingPayables: 0,
    activeSuppliersCount: 0,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [preferredOnly, setPreferredOnly] = useState(false);
  const [groups, setGroups] = useState<string[]>(['All Supplier Groups', 'Automotive Spares', 'Lubricants & Fuel', 'Workshop Services']);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  const loadSuppliers = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (selectedGroup !== 'ALL') params.set('group', selectedGroup);
      if (preferredOnly) params.set('preferred_only', 'true');

      const res = await fetch(`/api/procurement/suppliers?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load suppliers');
      }

      setSuppliers(json.suppliers || []);
      if (json.metrics) setMetrics(json.metrics);
    } catch (err: any) {
      setError(err.message || 'Error communicating with ERPNext');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedGroup, preferredOnly]);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  return (
    <AppShell>
      <PageContainer>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Suppliers & Vendors Directory
              </h1>
              <p className="text-sm text-slate-500">
                Authorized parts vendors, workshops, purchase histories, and outstanding payables
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadSuppliers()}
              disabled={isLoading}
              className="flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>

            {canManage && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center space-x-1.5 shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Add Supplier</span>
              </Button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Supplier Directory Alert: </span>
              {error}
            </div>
          </div>
        )}

        {/* Quick KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Active Suppliers</span>
              <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900">{metrics.activeSuppliersCount}</div>
            <span className="text-xs text-slate-500">Registered vendors</span>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Preferred Vendors</span>
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                <Star className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-indigo-600">
              {suppliers.filter((s) => s.isPreferred).length}
            </div>
            <span className="text-xs text-slate-500">Pre-approved fleet suppliers</span>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Cumulative Spend</span>
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                <IndianRupee className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-900 font-mono">
              ₹{metrics.totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-xs text-slate-500">Purchase orders total</span>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600">Outstanding Payables</span>
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                <IndianRupee className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-bold text-rose-700 font-mono">
              ₹{metrics.outstandingPayables.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <span className="text-xs text-slate-500">Unsettled purchase invoices</span>
          </div>
        </div>

        {/* Suppliers Table */}
        <SuppliersTable
          suppliers={suppliers}
          isLoading={isLoading}
          onSelectSupplier={(s) => setSelectedSupplierId(s.id)}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedGroup={selectedGroup}
          onGroupChange={setSelectedGroup}
          preferredOnly={preferredOnly}
          onPreferredOnlyChange={setPreferredOnly}
          groups={groups}
        />

        {/* Add Supplier Modal */}
        {isAddModalOpen && (
          <AddSupplierModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSuccess={() => loadSuppliers()}
            groups={groups}
          />
        )}

        {/* Supplier Details Drawer */}
        {selectedSupplierId && (
          <SupplierDetailDrawer
            supplierId={selectedSupplierId}
            onClose={() => setSelectedSupplierId(null)}
          />
        )}
      </PageContainer>
    </AppShell>
  );
}

