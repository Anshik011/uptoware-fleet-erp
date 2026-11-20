import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CreateStockEntryInput } from '@/types/fleet';
import { X, ArrowLeftRight, AlertCircle, AlertTriangle, Lock, Plus, Trash2, MapPin } from 'lucide-react';
import { LinkedField } from '@/components/ui/LinkedField';
import { AddVehicleModal } from '@/components/vehicles/AddVehicleModal';
import { VehicleDrawer } from '@/components/vehicles/VehicleDrawer';
import { AddSparePartModal } from '@/components/inventory/AddSparePartModal';
import { SparePartDrawer } from '@/components/inventory/SparePartDrawer';
import { useMine } from '@/context/MineContext';
import { formatVehicleDisplay } from '@/lib/displayFormatters';

export interface WarehouseOption {
  id: string;
  name: string;
  customMineSite?: string | null;
  warehouseName?: string;
}

export interface ItemOption {
  itemCode: string;
  itemName: string;
  uom: string;
  rate: number;
}

export interface VehicleOption {
  id: string;
  licensePlate: string;
  customMineSite?: string | null;
}

export interface BreakdownOption {
  id: string;
  vehicle: string;
  description: string;
  parts: Array<{ itemCode: string; plannedQty: number }>;
  mineSite?: string | null;
}

interface AddStockEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  warehouses?: WarehouseOption[];
  items?: ItemOption[];
  vehicles?: VehicleOption[];
  breakdowns?: BreakdownOption[];
}

export function AddStockEntryModal({
  isOpen,
  onClose,
  onSuccess,
  warehouses: propWarehouses = [],
  items: propItems = [],
  vehicles: propVehicles = [],
  breakdowns: propBreakdowns = [],
}: AddStockEntryModalProps) {
  const { currentMine, allowedMines, isAllMines, isSingleMine, isUnassigned } = useMine();

  // Mine lock logic
  const isMineLocked = isSingleMine || (!isAllMines && allowedMines.length === 1);

  // Operational Mine attribution state
  const [selectedMineSite, setSelectedMineSite] = useState<string>('');
  const [availableMineSites, setAvailableMineSites] = useState<Array<{ id: string; siteName: string }>>([]);

  // Local state for options
  const [localWarehouses, setLocalWarehouses] = useState<WarehouseOption[]>(propWarehouses);
  const [localItems, setLocalItems] = useState<ItemOption[]>(propItems);
  const [localVehicles, setLocalVehicles] = useState<VehicleOption[]>(propVehicles);
  const [localBreakdowns, setLocalBreakdowns] = useState<BreakdownOption[]>(propBreakdowns);

  const [entryType, setEntryType] = useState<'Material Issue' | 'Material Receipt' | 'Material Transfer'>(
    'Material Issue'
  );
  const [fromWarehouse, setFromWarehouse] = useState('');
  const [toWarehouse, setToWarehouse] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedBreakdown, setSelectedBreakdown] = useState('');

  const [rows, setRows] = useState<
    Array<{
      itemCode: string;
      qty: number;
      rate: number;
      uom: string;
    }>
  >([
    {
      itemCode: propItems[0]?.itemCode || '',
      qty: 1,
      rate: propItems[0]?.rate || 0,
      uom: propItems[0]?.uom || 'Nos',
    },
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contextual modals and drawers
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [viewVehicleId, setViewVehicleId] = useState<string | null>(null);

  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [viewPartId, setViewPartId] = useState<string | null>(null);
  const [activePartRowIndex, setActivePartRowIndex] = useState<number | null>(null);

  // Load inventory options scoped by mine
  const loadScopedOptions = useCallback(async (mineFilterParam?: string) => {
    try {
      const params = new URLSearchParams();
      const effective =
        mineFilterParam !== undefined
          ? mineFilterParam
          : (currentMine !== 'ALL' && currentMine !== 'UNASSIGNED' ? currentMine : '');

      if (effective && effective !== 'ALL' && effective !== 'UNASSIGNED') {
        params.set('mine_site', effective);
      }

      const res = await fetch(`/api/inventory/options?${params.toString()}`);
      const json = await res.json();
      if (res.ok && json.success) {
        if (json.warehouses) setLocalWarehouses(json.warehouses);
        if (json.items) setLocalItems(json.items);
        if (json.vehicles) setLocalVehicles(json.vehicles);
        if (json.breakdowns) setLocalBreakdowns(json.breakdowns);
        if (json.mineSites) setAvailableMineSites(json.mineSites);
      }
    } catch (err) {
      console.warn('Failed to load scoped inventory options:', err);
    }
  }, [currentMine]);

  // Initialize modal state on open
  useEffect(() => {
    if (!isOpen) return;

    setError(null);

    const initialSite =
      currentMine !== 'ALL' && currentMine !== 'UNASSIGNED'
        ? currentMine
        : (!isAllMines && allowedMines.length === 1 ? allowedMines[0] : '');

    setSelectedMineSite(initialSite);
    loadScopedOptions(initialSite);
  }, [isOpen, currentMine, isAllMines, allowedMines, loadScopedOptions]);

  // Update default warehouses when warehouse list changes
  useEffect(() => {
    if (localWarehouses.length > 0) {
      if (!fromWarehouse || !localWarehouses.some((w) => w.id === fromWarehouse)) {
        setFromWarehouse(localWarehouses[0].id);
      }
      if (!toWarehouse || !localWarehouses.some((w) => w.id === toWarehouse)) {
        const nextWh = localWarehouses.length > 1 ? localWarehouses[1].id : localWarehouses[0].id;
        setToWarehouse(nextWh);
      }
    }
  }, [localWarehouses, fromWarehouse, toWarehouse]);

  // Handle changing selected operational mine
  const handleMineChange = (newSite: string) => {
    setSelectedMineSite(newSite);
    setSelectedVehicle('');
    setSelectedBreakdown('');
    loadScopedOptions(newSite);
  };

  // When breakdown changes, auto-populate vehicle and suggested parts
  const handleBreakdownSelect = (bkdId: string) => {
    setSelectedBreakdown(bkdId);
    if (!bkdId) return;

    const bkd = localBreakdowns.find((b) => b.id === bkdId);
    if (bkd) {
      if (bkd.vehicle) setSelectedVehicle(bkd.vehicle);
      if (bkd.parts && bkd.parts.length > 0) {
        const newRows = bkd.parts.map((p) => {
          const matchedItem = localItems.find((i) => i.itemCode === p.itemCode);
          return {
            itemCode: p.itemCode,
            qty: p.plannedQty || 1,
            rate: matchedItem?.rate || 0,
            uom: matchedItem?.uom || 'Nos',
          };
        });
        setRows(newRows);
      }
    }
  };

  const handleItemChange = (index: number, itemCode: string) => {
    const matched = localItems.find((i) => i.itemCode === itemCode);
    const updated = [...rows];
    updated[index] = {
      ...updated[index],
      itemCode,
      rate: matched?.rate || 0,
      uom: matched?.uom || 'Nos',
    };
    setRows(updated);
  };

  const handleQtyChange = (index: number, qty: number) => {
    const updated = [...rows];
    updated[index].qty = qty;
    setRows(updated);
  };

  const addRow = () => {
    setRows([
      ...rows,
      {
        itemCode: localItems[0]?.itemCode || '',
        qty: 1,
        rate: localItems[0]?.rate || 0,
        uom: localItems[0]?.uom || 'Nos',
      },
    ]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, idx) => idx !== index));
  };

  const refreshVehicles = async () => {
    try {
      const res = await fetch('/api/vehicles');
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setLocalVehicles(data.data.map((v: any) => ({
          id: v.id,
          licensePlate: v.licensePlate || v.id,
          customMineSite: v.customMineSite || null,
        })));
        if (data.data.length > 0) {
          setSelectedVehicle(data.data[data.data.length - 1].id);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh vehicles:', err);
    }
  };

  const refreshItems = async () => {
    try {
      const res = await fetch('/api/inventory/items');
      const data = await res.json();
      if (res.ok && data.success && data.items) {
        const mapped = data.items.map((i: any) => ({
          itemCode: i.itemCode,
          itemName: i.itemName,
          uom: i.stockUom || 'Nos',
          rate: i.valuationRate || 0,
        }));
        setLocalItems(mapped);
        if (activePartRowIndex !== null && mapped.length > 0) {
          const newest = mapped[mapped.length - 1];
          handleItemChange(activePartRowIndex, newest.itemCode);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh items:', err);
    }
  };

  // Cross-mine transfer guard check
  const crossMineError = useMemo(() => {
    if (entryType !== 'Material Transfer') return null;
    if (fromWarehouse && toWarehouse && fromWarehouse === toWarehouse) {
      return 'Source and Target warehouses cannot be identical for Material Transfer.';
    }

    const srcWh = localWarehouses.find((w) => w.id === fromWarehouse);
    const tgtWh = localWarehouses.find((w) => w.id === toWarehouse);

    if (srcWh && tgtWh) {
      const srcMine = srcWh.customMineSite;
      const tgtMine = tgtWh.customMineSite;

      // Cross-mine transfer between two distinct mine sites
      if (srcMine && tgtMine && srcMine !== tgtMine) {
        if (!isAllMines) {
          const hasSrc = allowedMines.includes(srcMine);
          const hasTgt = allowedMines.includes(tgtMine);
          if (!hasSrc || !hasTgt) {
            return `Cross-Mine Stock Movement Rejected: You do not possess multi-mine authorization to transfer stock between '${srcMine}' and '${tgtMine}'.`;
          }
        }
      }
    }
    return null;
  }, [entryType, fromWarehouse, toWarehouse, localWarehouses, isAllMines, allowedMines]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isUnassigned) {
      setError('Unassigned user accounts are blocked from submitting stock movements.');
      return;
    }

    if (crossMineError) {
      setError(crossMineError);
      return;
    }

    if (rows.length === 0) {
      setError('Please add at least one spare part line.');
      return;
    }

    for (const r of rows) {
      if (!r.itemCode) {
        setError('Please select an item for all rows.');
        return;
      }
      if (r.qty <= 0) {
        setError(`Quantity must be greater than zero for part '${r.itemCode}'.`);
        return;
      }
    }

    // Vehicle attribution validation for Material Issue
    if (entryType === 'Material Issue' && selectedVehicle && selectedMineSite) {
      const veh = localVehicles.find((v) => v.id === selectedVehicle);
      if (veh && veh.customMineSite && veh.customMineSite !== selectedMineSite) {
        setError(
          `Stationing Conflict: Vehicle '${veh.licensePlate || veh.id}' is stationed at '${veh.customMineSite}', not '${selectedMineSite}'.`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: CreateStockEntryInput = {
        entryType,
        postingDate: new Date().toISOString().split('T')[0],
        fromWarehouse: entryType !== 'Material Receipt' ? fromWarehouse : undefined,
        toWarehouse: entryType !== 'Material Issue' ? toWarehouse : undefined,
        mineSite: selectedMineSite || undefined,
        vehicle: selectedVehicle || undefined,
        vehicleBreakdown: selectedBreakdown || undefined,
        items: rows.map((r) => ({
          itemCode: r.itemCode,
          qty: r.qty,
          rate: r.rate,
          uom: r.uom,
          sWarehouse: entryType !== 'Material Receipt' ? fromWarehouse : undefined,
          tWarehouse: entryType !== 'Material Issue' ? toWarehouse : undefined,
        })),
      };

      const res = await fetch('/api/inventory/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to submit stock movement');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while executing stock movement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const activeMineDisplay =
    selectedMineSite || (isSingleMine && allowedMines[0]) || (isAllMines ? 'Central / All Mines' : 'Select Mine Site');

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <ArrowLeftRight className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-900">New Stock Movement</h3>
                  {isMineLocked ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                      <Lock className="w-3 h-3 text-slate-500" />
                      Locked: {activeMineDisplay}
                    </span>
                  ) : selectedMineSite ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      <MapPin className="w-3 h-3 text-blue-600" />
                      {selectedMineSite}
                    </span>
                  ) : null}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Execute live Stock Entry with multi-mine warehouse scoping and asset attribution
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Unassigned Warning Banner */}
            {isUnassigned && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Unassigned Mine Site</p>
                  <p className="text-xs mt-0.5">
                    Your account has no operational mine site allocations. Inventory stock entry execution is prohibited under enterprise policy.
                  </p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Cross-Mine Guard Warning */}
            {crossMineError && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{crossMineError}</span>
              </div>
            )}

            {/* Operational Mine Attribution Selector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Operational Mine Site {isMineLocked && <span className="text-slate-400 font-normal">(Locked)</span>}
                </label>
                <div className="relative">
                  <select
                    value={selectedMineSite}
                    onChange={(e) => handleMineChange(e.target.value)}
                    disabled={isMineLocked}
                    data-testid="input-stock-minesite"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
                  >
                    {isAllMines && <option value="">Central / Shared Inventory</option>}
                    {availableMineSites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.siteName || s.id}
                      </option>
                    ))}
                    {!availableMineSites.some((s) => s.id === selectedMineSite) && selectedMineSite && (
                      <option value={selectedMineSite}>{selectedMineSite}</option>
                    )}
                  </select>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {isMineLocked
                    ? 'Attributed strictly to your operational assignment.'
                    : 'Target mine site for inventory valuation and ledger attribution.'}
                </p>
              </div>

              {/* Movement Type */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Movement Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Material Issue', 'Material Receipt', 'Material Transfer'] as const).map((t) => (
                    <button
                      type="button"
                      key={t}
                      onClick={() => setEntryType(t)}
                      className={`py-2 px-2.5 text-xs font-semibold rounded-lg border text-center transition-all ${
                        entryType === t
                          ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-xs'
                          : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {t.replace('Material ', '')}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  {entryType === 'Material Issue' && 'Issue spare parts for vehicle repairs or workshop tasks.'}
                  {entryType === 'Material Receipt' && 'Receive parts from external supplier or procurement.'}
                  {entryType === 'Material Transfer' && 'Relocate parts between central stores and site warehouses.'}
                </p>
              </div>
            </div>

            {/* Warehouse Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {entryType !== 'Material Receipt' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Source Warehouse (From) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={fromWarehouse}
                    onChange={(e) => setFromWarehouse(e.target.value)}
                    data-testid="select-from-warehouse"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  >
                    {localWarehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.customMineSite ? `(${w.customMineSite})` : '(Central)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {entryType !== 'Material Issue' && (
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Target Warehouse (To) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={toWarehouse}
                    onChange={(e) => setToWarehouse(e.target.value)}
                    data-testid="select-to-warehouse"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  >
                    {localWarehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} {w.customMineSite ? `(${w.customMineSite})` : '(Central)'}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Fleet Attribution (For Material Issue) */}
            {entryType === 'Material Issue' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-blue-50/50 rounded-xl border border-blue-100">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Active Breakdown (Optional Link)
                  </label>
                  <select
                    value={selectedBreakdown}
                    onChange={(e) => handleBreakdownSelect(e.target.value)}
                    data-testid="select-stock-breakdown"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  >
                    <option value="">None / Routine Workshop Maintenance</option>
                    {localBreakdowns.map((b) => (
                      <option key={b.id} value={b.id}>
                        {formatVehicleDisplay(b.vehicle)} — {b.description?.slice(0, 30)}
                      </option>
                    ))}
                  </select>
                </div>

                <LinkedField
                  label="Vehicle Attribution"
                  value={selectedVehicle}
                  onChange={setSelectedVehicle}
                  options={localVehicles.map((v) => ({
                    value: v.id,
                    label: v.licensePlate || v.id,
                  }))}
                  entityName="Vehicle"
                  placeholder="Select vehicle..."
                  onCreateNew={() => setShowAddVehicleModal(true)}
                  onViewRecord={selectedVehicle ? () => setViewVehicleId(selectedVehicle) : undefined}
                  hint="Unit consuming issued spare parts"
                  data-testid="input-stock-vehicle"
                />
              </div>
            )}

            {/* Items Line Table */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Spare Parts Items
                </label>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePartRowIndex(null);
                      setShowAddPartModal(true);
                    }}
                    className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <Plus className="w-3 h-3 mr-1 text-slate-500" /> New Catalog Part
                  </button>
                  <button
                    type="button"
                    onClick={addRow}
                    className="inline-flex items-center px-3 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Part
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-700 font-semibold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Part Selection</th>
                      <th className="py-2.5 px-3 w-28 text-right">Quantity</th>
                      <th className="py-2.5 px-3 w-32 text-right">Unit Rate (₹)</th>
                      <th className="py-2.5 px-3 w-32 text-right">Amount (₹)</th>
                      <th className="py-2.5 px-3 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2">
                          <div className="flex items-center space-x-1.5">
                            <select
                              value={row.itemCode}
                              onChange={(e) => {
                                if (e.target.value === '__create_new__') {
                                  setActivePartRowIndex(idx);
                                  setShowAddPartModal(true);
                                } else {
                                  handleItemChange(idx, e.target.value);
                                }
                              }}
                              className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600"
                            >
                              {localItems.map((i) => (
                                <option key={i.itemCode} value={i.itemCode}>
                                  {i.itemName || i.itemCode} ({i.itemCode})
                                </option>
                              ))}
                              <option value="__create_new__" className="text-blue-600 font-semibold">
                                ➕ + Create New Spare Part...
                              </option>
                            </select>
                            {row.itemCode && (
                              <button
                                type="button"
                                onClick={() => setViewPartId(row.itemCode)}
                                className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                title="View spare part details"
                              >
                                <span className="text-[10px] font-mono px-1 border border-slate-200 rounded">
                                  View
                                </span>
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            min="1"
                            step="1"
                            value={row.qty}
                            onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                            className="w-20 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs text-right text-slate-900 font-mono focus:outline-none focus:ring-1 focus:ring-blue-600"
                          />
                        </td>
                        <td className="p-2 text-right font-mono text-slate-700">
                          ₹{row.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right font-mono font-semibold text-slate-900">
                          ₹{(row.qty * row.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => removeRow(idx)}
                            disabled={rows.length === 1}
                            className="text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUnassigned || Boolean(crossMineError)}
                data-testid="btn-submit-stock-movement"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isSubmitting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>Submit Stock Movement</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Contextual Sub-Modals and Drawers */}
      <AddVehicleModal
        isOpen={showAddVehicleModal}
        onClose={() => setShowAddVehicleModal(false)}
        onSuccess={() => {
          setShowAddVehicleModal(false);
          refreshVehicles();
        }}
      />
      <VehicleDrawer vehicleId={viewVehicleId} onClose={() => setViewVehicleId(null)} />

      <AddSparePartModal
        isOpen={showAddPartModal}
        onClose={() => setShowAddPartModal(false)}
        onSuccess={() => {
          setShowAddPartModal(false);
          refreshItems();
        }}
        itemGroups={['Spare Parts', 'Consumables', 'Lubricants', 'Tyres', 'Mechanical', 'Electrical']}
        suppliers={[]}
      />
      <SparePartDrawer itemId={viewPartId} onClose={() => setViewPartId(null)} />
    </>
  );
}
