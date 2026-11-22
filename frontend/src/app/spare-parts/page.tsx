'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SparePartItem, InventoryMetrics } from '@/types/fleet';
import { useAuth } from '@/context/AuthContext';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { InventoryDashboard } from '@/components/inventory/InventoryDashboard';
import { SparePartsTable } from '@/components/inventory/SparePartsTable';
import { AddSparePartModal } from '@/components/inventory/AddSparePartModal';
import { SparePartDrawer } from '@/components/inventory/SparePartDrawer';
import { AddStockEntryModal, WarehouseOption, ItemOption, VehicleOption, BreakdownOption } from '@/components/inventory/AddStockEntryModal';
import { Button } from '@/components/ui/Button';
import { Package, PlusCircle, RefreshCw, AlertCircle, ArrowLeftRight, Loader2 } from 'lucide-react';

function SparePartsContent() {
  const searchParams = useSearchParams();
  const { hasRole } = useAuth();
  const canManage = hasRole(['Fleet Manager', 'Workshop Supervisor', 'Administrator']);

  const actionParam = searchParams.get('action');

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [metrics, setMetrics] = useState<InventoryMetrics>({
    totalInventoryValue: 0,
    activePartsCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    pendingReceiptsCount: 0,
    totalMovementsCount: 0,
  });

  const [items, setItems] = useState<SparePartItem[]>([]);
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);
  const [itemGroups, setItemGroups] = useState<string[]>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('ALL');
  const [selectedWarehouse, setSelectedWarehouse] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(actionParam === 'new');
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(actionParam === 'adjust');
  const [movementItems, setMovementItems] = useState<ItemOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [breakdowns, setBreakdowns] = useState<BreakdownOption[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);

  useEffect(() => {
    if (actionParam === 'adjust') setIsAdjustmentModalOpen(true);
    if (actionParam === 'new') setIsAddModalOpen(true);
  }, [actionParam]);

  // Load options (warehouses, groups, suppliers, vehicles, breakdowns)
  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await fetch('/api/inventory/options');
        const json = await res.json();
        if (res.ok && json.success) {
          if (json.warehouses) setWarehouses(json.warehouses);
          if (json.itemGroups) setItemGroups(json.itemGroups);
          if (json.suppliers) setSuppliers(json.suppliers);
          if (json.items) setMovementItems(json.items);
          if (json.vehicles) setVehicles(json.vehicles);
          if (json.breakdowns) setBreakdowns(json.breakdowns);
        }
      } catch (err) {
        console.warn('Could not load inventory options:', err);
      }
    }
    loadOptions();
  }, []);

  // Fetch spare parts catalog
  const loadParts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (selectedGroup !== 'ALL') params.set('item_group', selectedGroup);
      if (selectedWarehouse !== 'ALL') params.set('warehouse', selectedWarehouse);
      if (selectedStatus !== 'ALL') params.set('status', selectedStatus);

      const res = await fetch(`/api/inventory/items?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load spare parts catalog');
      }

      setItems(json.items || []);
      if (json.metrics) setMetrics(json.metrics);
    } catch (err: any) {
      setError(err.message || 'Error communicating with inventory server');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, selectedGroup, selectedWarehouse, selectedStatus]);

  useEffect(() => {
    loadParts();
  }, [loadParts]);

  const handleDeleteItem = async (item: SparePartItem) => {
    if (!window.confirm(`Are you sure you want to delete spare part "${item.itemName}" (${item.id})?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/inventory/items/${encodeURIComponent(item.id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        alert(json.error || 'Cannot delete spare part. If this item has existing stock ledger entries or purchase orders, deletion is prevented.');
        return;
      }
      loadParts();
    } catch (err: any) {
      alert(err.message || 'Failed to delete spare part.');
    }
  };

  return (
    <AppShell>
      <PageContainer>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Spare Parts Catalog
              </h1>
              <p className="text-sm text-slate-500">
                Fleet inventory master, warehouse stock balances, and reorder levels
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadParts()}
              disabled={isLoading}
              className="flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>

            {canManage && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAdjustmentModalOpen(true)}
                  className="flex items-center space-x-1.5 shadow-sm"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Adjust Stock</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsAddModalOpen(true)}
                  className="flex items-center space-x-1.5 shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Add Spare Part</span>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Inventory System Alert: </span>
              {error}
            </div>
          </div>
        )}

        {/* Inventory Metrics Dashboard */}
        <InventoryDashboard metrics={metrics} isLoading={isLoading} />

        {/* Spare Parts Table */}
        <SparePartsTable
          items={items}
          isLoading={isLoading}
          warehouses={warehouses}
          itemGroups={itemGroups}
          onSelectItem={(item) => setSelectedItemId(item.id)}
          onEditItem={(item) => setSelectedItemId(item.id)}
          onDeleteItem={handleDeleteItem}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          selectedGroup={selectedGroup}
          onGroupChange={setSelectedGroup}
          selectedWarehouse={selectedWarehouse}
          onWarehouseChange={setSelectedWarehouse}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
        />

        {/* Add Spare Part Modal */}
        {isAddModalOpen && (
          <AddSparePartModal
            isOpen={isAddModalOpen}
            onClose={() => setIsAddModalOpen(false)}
            onSuccess={() => loadParts()}
            itemGroups={itemGroups}
            suppliers={suppliers}
          />
        )}

        {/* Stock Adjustment Modal */}
        {isAdjustmentModalOpen && (
          <AddStockEntryModal
            isOpen={isAdjustmentModalOpen}
            onClose={() => setIsAdjustmentModalOpen(false)}
            onSuccess={() => {
              setIsAdjustmentModalOpen(false);
              loadParts();
            }}
            warehouses={warehouses}
            items={movementItems}
            vehicles={vehicles}
            breakdowns={breakdowns}
          />
        )}

        {/* Spare Part Details Slide-Over Drawer */}
        {selectedItemId && (
          <SparePartDrawer
            itemId={selectedItemId}
            onClose={() => setSelectedItemId(null)}
          />
        )}
      </PageContainer>
    </AppShell>
  );
}

export default function SparePartsPage() {
  return (
    <Suspense
      fallback={
        <AppShell>
          <PageContainer>
            <div className="flex items-center justify-center p-12 text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Loading Spare Parts & Inventory...</span>
            </div>
          </PageContainer>
        </AppShell>
      }
    >
      <SparePartsContent />
    </Suspense>
  );
}

