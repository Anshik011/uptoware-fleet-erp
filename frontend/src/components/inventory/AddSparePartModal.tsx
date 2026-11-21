'use client';

import React, { useState, useEffect } from 'react';
import { CreateSparePartInput } from '@/types/fleet';
import { X, Package, AlertCircle } from 'lucide-react';
import { LinkedField } from '@/components/ui/LinkedField';
import { AddSupplierModal } from '@/components/procurement/AddSupplierModal';
import { SupplierDetailDrawer } from '@/components/procurement/SupplierDetailDrawer';

interface AddSparePartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  itemGroups: string[];
  suppliers: Array<{ id: string; name: string }>;
}

export function AddSparePartModal({
  isOpen,
  onClose,
  onSuccess,
  itemGroups,
  suppliers,
}: AddSparePartModalProps) {
  const [localSuppliers, setLocalSuppliers] = useState<Array<{ id: string; name: string }>>(suppliers);
  const [itemCode, setItemCode] = useState('');
  const [itemName, setItemName] = useState('');
  const [itemGroup, setItemGroup] = useState(itemGroups[0] || 'All Item Groups');
  const [stockUom, setStockUom] = useState('Nos');
  const [valuationRate, setValuationRate] = useState<number | ''>(0);
  const [partNumber, setPartNumber] = useState('');
  const [compatibleModel, setCompatibleModel] = useState('');
  const [preferredSupplier, setPreferredSupplier] = useState('');
  const [reorderLevel, setReorderLevel] = useState<number | ''>(5);
  const [reorderQty, setReorderQty] = useState<number | ''>(10);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contextual modal and drawer state
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [viewSupplierId, setViewSupplierId] = useState<string | null>(null);

  useEffect(() => {
    setLocalSuppliers(suppliers);
  }, [suppliers]);

  const refreshSuppliers = async (autoSelectId?: string) => {
    try {
      const res = await fetch('/api/procurement/suppliers');
      const data = await res.json();
      if (data.suppliers && Array.isArray(data.suppliers)) {
        const formatted = data.suppliers.map((s: any) => ({
          id: s.name || s.id,
          name: s.supplier_name || s.name,
        }));
        setLocalSuppliers(formatted);
        if (autoSelectId) {
          setPreferredSupplier(autoSelectId);
        } else if (formatted.length > 0) {
          const latest = formatted[formatted.length - 1];
          setPreferredSupplier(latest.id);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh suppliers in AddSparePartModal:', err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!itemName.trim()) {
      setError('Item Name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedCode = 'SP-' + itemName.trim().replace(/[^a-zA-Z0-9]/g, '-').toUpperCase().slice(0, 15) + '-' + Math.floor(100 + Math.random() * 900);
      const payload: CreateSparePartInput = {
        itemCode: itemCode.trim() || generatedCode,
        itemName: itemName.trim(),
        itemGroup,
        stockUom,
        valuationRate: Number(valuationRate) || 0,
        partNumber: partNumber.trim() || undefined,
        compatibleModel: compatibleModel.trim() || undefined,
        preferredSupplier: preferredSupplier || undefined,
        reorderLevel: Number(reorderLevel) || 0,
        reorderQty: Number(reorderQty) || 0,
      };

      const res = await fetch('/api/inventory/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create spare part in ERPNext');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving the spare part.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Add Spare Part</h3>
                <p className="text-xs text-slate-500">
                  Register a new inventory spare part in ERPNext
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Item Name */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Item Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Heavy Duty Brake Pad Set"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                <select
                  value={itemGroup}
                  onChange={(e) => setItemGroup(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {itemGroups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stock UOM */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Unit of Measure</label>
                <select
                  value={stockUom}
                  onChange={(e) => setStockUom(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="Nos">Nos (Units)</option>
                  <option value="Set">Set</option>
                  <option value="Box">Box</option>
                  <option value="Litre">Litre</option>
                  <option value="Kg">Kg</option>
                  <option value="Mtr">Mtr</option>
                </select>
              </div>

              {/* Standard Valuation Rate */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Standard Valuation Rate (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={valuationRate}
                  onChange={(e) => setValuationRate(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Part Number / OEM Reference */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Part Number / OEM Ref
                </label>
                <input
                  type="text"
                  placeholder="e.g. VOLVO-21496833"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Compatible Vehicle Model */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Compatible Vehicle Model
                </label>
                <input
                  type="text"
                  placeholder="e.g. Volvo FMX 460 / Scania G440"
                  value={compatibleModel}
                  onChange={(e) => setCompatibleModel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Preferred Supplier with Contextual LinkedField */}
              <div className="sm:col-span-2">
                <LinkedField
                  label="Preferred Supplier"
                  value={preferredSupplier}
                  onChange={setPreferredSupplier}
                  options={localSuppliers.map((s) => ({
                    value: s.id,
                    label: s.name,
                  }))}
                  placeholder="None / Open Sourcing (Select or create supplier...)"
                  entityName="Supplier"
                  onCreateNew={() => setShowAddSupplier(true)}
                  onViewRecord={preferredSupplier ? (id) => setViewSupplierId(id) : undefined}
                />
              </div>

              {/* Reorder Level */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reorder Threshold Level
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="5"
                  value={reorderLevel}
                  onChange={(e) => setReorderLevel(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Reorder Quantity */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reorder Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="10"
                  value={reorderQty}
                  onChange={(e) => setReorderQty(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                {isSubmitting && (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>Save Spare Part</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Child Contextual Modals and Drawers */}
      {showAddSupplier && (
        <AddSupplierModal
          isOpen={showAddSupplier}
          onClose={() => setShowAddSupplier(false)}
          onSuccess={() => {
            setShowAddSupplier(false);
            refreshSuppliers();
          }}
          groups={['All Supplier Groups', 'Services', 'Raw Material', 'Distributor']}
        />
      )}

      {viewSupplierId && (
        <SupplierDetailDrawer
          supplierId={viewSupplierId}
          onClose={() => setViewSupplierId(null)}
        />
      )}
    </>
  );
}
