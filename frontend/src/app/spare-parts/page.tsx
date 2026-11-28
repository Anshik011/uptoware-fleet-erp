'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SparePartItem, InventoryMetrics, StockMovement } from '@/types/fleet';
import { useAuth } from '@/context/AuthContext';
import { useMine } from '@/context/MineContext';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { InventoryDashboard } from '@/components/inventory/InventoryDashboard';
import { SparePartsTable } from '@/components/inventory/SparePartsTable';
import { AddSparePartModal } from '@/components/inventory/AddSparePartModal';
import { SparePartDrawer } from '@/components/inventory/SparePartDrawer';
import { AddStockEntryModal, WarehouseOption, ItemOption, VehicleOption, BreakdownOption } from '@/components/inventory/AddStockEntryModal';
import { Button } from '@/components/ui/Button';
import { Package, PlusCircle, RefreshCw, AlertCircle, ArrowLeftRight, Loader2, Trash2, X } from 'lucide-react';

function SparePartsContent() {
  const searchParams = useSearchParams();
  const { hasRole } = useAuth();
  const { currentMine } = useMine();
  const canManage = hasRole(['Fleet Manager', 'Workshop Supervisor', 'Maintenance Stores User', 'Administrator']);

  const actionParam = searchParams.get('action');
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState<'catalog' | 'scrap'>(
    tabParam === 'scrap' || actionParam === 'scrap' ? 'scrap' : 'catalog'
  );
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

  // Scrap Parts state
  const [scrapMovements, setScrapMovements] = useState<StockMovement[]>([]);
  const [isScrapLoading, setIsScrapLoading] = useState(false);
  const [isScrapModalOpen, setIsScrapModalOpen] = useState(actionParam === 'scrap');
  const [scrapItemCode, setScrapItemCode] = useState('');
  const [scrapWarehouse, setScrapWarehouse] = useState('');
  const [scrapVehicle, setScrapVehicle] = useState('');
  const [scrapQty, setScrapQty] = useState('1');
  const [scrapReason, setScrapReason] = useState('');
  const [isSubmittingScrap, setIsSubmittingScrap] = useState(false);
  const [scrapError, setScrapError] = useState<string | null>(null);

  useEffect(() => {
    if (tabParam === 'scrap') setActiveTab('scrap');
    else if (tabParam === 'catalog') setActiveTab('catalog');
  }, [tabParam]);

  useEffect(() => {
    if (actionParam === 'adjust') setIsAdjustmentModalOpen(true);
    if (actionParam === 'new') setIsAddModalOpen(true);
    if (actionParam === 'scrap') {
      setActiveTab('scrap');
      setIsScrapModalOpen(true);
    }
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

  const loadScrapMovements = useCallback(async () => {
    setIsScrapLoading(true);
    try {
      const params = new URLSearchParams({ entry_type: 'Material Issue' });
      if (currentMine && currentMine !== 'ALL' && currentMine !== 'UNASSIGNED') {
        params.set('mine_site', currentMine);
      }
      const res = await fetch(`/api/inventory/movements?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        const allMoves: StockMovement[] = json.movements || [];
        setScrapMovements(
          allMoves.filter(
            (m) =>
              (m.remarks || '').toUpperCase().includes('[SCRAP]') ||
              (m.remarks || '').toUpperCase().includes('SCRAP')
          )
        );
      }
    } catch (err) {
      console.warn('Could not load scrap parts movements:', err);
    } finally {
      setIsScrapLoading(false);
    }
  }, [currentMine]);

  useEffect(() => {
    if (activeTab === 'scrap') {
      loadScrapMovements();
    }
  }, [activeTab, loadScrapMovements]);

  const handleLogScrapSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setScrapError(null);
    const qtyNum = Number(scrapQty);
    const chosenItem = movementItems.find((i) => i.itemCode === scrapItemCode) || movementItems[0];
    const chosenWh = scrapWarehouse || warehouses[0]?.id || 'Stores - U';

    if (!chosenItem?.itemCode) {
      setScrapError('Please select a spare part item to scrap.');
      return;
    }
    if (!qtyNum || qtyNum <= 0) {
      setScrapError('Scrap quantity must be greater than 0.');
      return;
    }
    if (!scrapReason.trim()) {
      setScrapError('Please enter a scrap reason / condition note.');
      return;
    }

    setIsSubmittingScrap(true);
    try {
      const selectedWhObj = warehouses.find((w) => w.id === chosenWh) as
        | { id: string; name: string; customMineSite?: string | null }
        | undefined;
      const resolvedMineSite = selectedWhObj?.customMineSite || undefined;

      const res = await fetch('/api/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entryType: 'Material Issue',
          fromWarehouse: chosenWh,
          vehicle: scrapVehicle || undefined,
          mineSite: resolvedMineSite,
          remarks: `[SCRAP] ${scrapReason.trim()}`,
          items: [
            {
              itemCode: chosenItem.itemCode,
              qty: qtyNum,
              rate: chosenItem.rate || 0,
              uom: chosenItem.uom || 'Nos',
            },
          ],
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to log scrap part.');
      }
      setIsScrapModalOpen(false);
      setScrapReason('');
      setScrapQty('1');
      loadScrapMovements();
      loadParts();
    } catch (err: any) {
      setScrapError(err.message || 'Failed to log scrap part.');
    } finally {
      setIsSubmittingScrap(false);
    }
  };

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
                {activeTab === 'scrap' ? 'Spare Parts — Scrap Register' : 'Spare Parts Catalog'}
              </h1>
              <p className="text-sm text-slate-500">
                {activeTab === 'scrap'
                  ? 'Condemned, damaged, and written-off spare parts log'
                  : 'Fleet inventory master, warehouse stock balances, and reorder levels'}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => (activeTab === 'scrap' ? loadScrapMovements() : loadParts())}
              disabled={isLoading || isScrapLoading}
              className="flex items-center space-x-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading || isScrapLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>

            {canManage && activeTab === 'scrap' && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  setScrapError(null);
                  setIsScrapModalOpen(true);
                }}
                className="flex items-center space-x-1.5 shadow-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>Log Scrap Part</span>
              </Button>
            )}

            {canManage && activeTab === 'catalog' && (
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

        {/* Section Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 mb-6">
          <button
            type="button"
            onClick={() => setActiveTab('catalog')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'catalog'
                ? 'border-blue-900 text-blue-900'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Spare Parts Catalog</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('scrap')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'scrap'
                ? 'border-rose-700 text-rose-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Trash2 className="w-4 h-4" />
            <span>Scrap Parts</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-800 font-bold">
              {scrapMovements.length}
            </span>
          </button>
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

        {activeTab === 'catalog' ? (
          <>
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
          </>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/75">
              <div>
                <h2 className="text-base font-bold text-slate-900">Scrap Parts Register</h2>
                <p className="text-xs text-slate-500">
                  Condemned or worn-out spare parts written off from warehouse stock
                </p>
              </div>
              <div className="text-right">
                <span className="text-[11px] font-semibold text-slate-500 uppercase block">
                  Total Scrap Entries
                </span>
                <span className="text-lg font-bold text-rose-700">{scrapMovements.length}</span>
              </div>
            </div>

            {isScrapLoading ? (
              <div className="p-12 flex items-center justify-center gap-2 text-slate-500 text-sm">
                <Loader2 className="w-5 h-5 animate-spin text-rose-600" />
                <span>Loading scrap parts register...</span>
              </div>
            ) : scrapMovements.length === 0 ? (
              <div className="p-12 text-center text-slate-500">
                <Trash2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700">No scrap parts logged yet</p>
                <p className="text-xs text-slate-400 mt-1">
                  Click &ldquo;Log Scrap Part&rdquo; to record damaged or condemned spare parts.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase">
                      <th className="py-3 px-4">Entry ID</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Items / Qty</th>
                      <th className="py-3 px-4">Vehicle</th>
                      <th className="py-3 px-4">Scrap Reason</th>
                      <th className="py-3 px-4 text-right">Scrap Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {scrapMovements.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">{m.name}</td>
                        <td className="py-3 px-4 text-slate-600 font-mono">{m.postingDate}</td>
                        <td className="py-3 px-4 text-slate-800 font-medium">
                          {(m.items || []).map((it) => `${it.itemName || it.itemCode} × ${it.qty}`).join(', ') || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-700">{m.vehicle || 'Workshop / General'}</td>
                        <td className="py-3 px-4 text-slate-600">
                          {(m.remarks || '').replace(/\[SCRAP\]\s*/i, '')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                          ₹{Number(m.totalAmount || 0).toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Log Scrap Part Modal */}
        {isScrapModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-rose-700 text-white flex items-center justify-center">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Log Scrap Spare Part</h2>
                    <p className="text-xs text-slate-500">Write off damaged/unusable parts from stock</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsScrapModalOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleLogScrapSubmit} className="p-6 space-y-4">
                {scrapError && (
                  <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    {scrapError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Spare Part Item *
                  </label>
                  <select
                    value={scrapItemCode || movementItems[0]?.itemCode || ''}
                    onChange={(e) => setScrapItemCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white"
                  >
                    {movementItems.map((it) => (
                      <option key={it.itemCode} value={it.itemCode}>
                        {it.itemName} ({it.itemCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Warehouse *
                    </label>
                    <select
                      value={scrapWarehouse || warehouses[0]?.id || ''}
                      onChange={(e) => setScrapWarehouse(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Scrap Qty *
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={scrapQty}
                      onChange={(e) => setScrapQty(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Vehicle (Optional)
                  </label>
                  <select
                    value={scrapVehicle}
                    onChange={(e) => setScrapVehicle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white"
                  >
                    <option value="">Workshop / General</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.licensePlate}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Scrap Reason / Condition *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={scrapReason}
                    onChange={(e) => setScrapReason(e.target.value)}
                    placeholder="e.g. Cracked casing, worn beyond repair"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 resize-none"
                  />
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsScrapModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" variant="primary" size="sm" disabled={isSubmittingScrap}>
                    {isSubmittingScrap ? 'Saving...' : 'Save Scrap Entry'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

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

