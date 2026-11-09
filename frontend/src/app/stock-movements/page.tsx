'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { StockMovement } from '@/types/fleet';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { StockMovementsTable } from '@/components/inventory/StockMovementsTable';
import { AddStockEntryModal } from '@/components/inventory/AddStockEntryModal';
import { Button } from '@/components/ui/Button';
import { ArrowLeftRight, PlusCircle, RefreshCw, AlertCircle } from 'lucide-react';

export default function StockMovementsPage() {
  const { hasRole } = useAuth();
  const canManage = hasRole(['Fleet Manager', 'Workshop Supervisor', 'Administrator']);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);
  const [items, setItems] = useState<Array<{ itemCode: string; itemName: string; uom: string; rate: number }>>([]);
  const [vehicles, setVehicles] = useState<Array<{ id: string; licensePlate: string }>>([]);
  const [breakdowns, setBreakdowns] = useState<Array<{
    id: string;
    vehicle: string;
    description: string;
    parts: Array<{ itemCode: string; plannedQty: number }>;
  }>>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedVehicle, setSelectedVehicle] = useState('ALL');

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Load options
  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await fetch('/api/inventory/options');
        const json = await res.json();
        if (res.ok && json.success) {
          if (json.warehouses) setWarehouses(json.warehouses);
          if (json.items) setItems(json.items);
          if (json.vehicles) setVehicles(json.vehicles);
          if (json.breakdowns) setBreakdowns(json.breakdowns);
        }
      } catch (err) {
        console.warn('Could not load movement options:', err);
      }
    }
    loadOptions();
  }, []);

  // Fetch stock movements
  const loadMovements = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (selectedType !== 'ALL') params.set('entry_type', selectedType);
      if (selectedVehicle !== 'ALL') params.set('vehicle', selectedVehicle);

      const res = await fetch(`/api/inventory/movements?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load stock movements');
      }

      setMovements(json.movements || []);
    } catch (err: any) {
      setError(err.message || 'Error communicating with ERPNext');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedType, selectedVehicle]);

  useEffect(() => {
    loadMovements();
  }, [loadMovements]);

  return (
    <AppShell>
      <PageContainer>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Stock Movements Ledger
              </h1>
              <p className="text-sm text-slate-500">
                Live inventory transfers, workshop material issues, and parts returns
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadMovements()}
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
                <span>New Stock Movement</span>
              </Button>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Stock Movement Alert: </span>
              {error}
            </div>
          </div>
        )}

        {/* Movements Table */}
        <StockMovementsTable
          movements={movements}
          isLoading={isLoading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedType={selectedType}
          onTypeChange={setSelectedType}
          selectedVehicle={selectedVehicle}
          onVehicleChange={setSelectedVehicle}
          vehicles={vehicles}
        />

        {/* Add Stock Entry Modal */}
        {isAddModalOpen && (
          <AddStockEntryModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSuccess={() => loadMovements()}
            warehouses={warehouses}
            items={items}
            vehicles={vehicles}
            breakdowns={breakdowns}
          />
        )}
      </PageContainer>
    </AppShell>
  );
}

