import React, { useState, useEffect } from 'react';
import { CreateStockEntryInput } from '@/types/fleet';
import { X, ArrowLeftRight, AlertCircle, Plus, Trash2, CheckCircle2 } from 'lucide-react';

interface AddStockEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  warehouses: Array<{ id: string; name: string }>;
  items: Array<{ itemCode: string; itemName: string; uom: string; rate: number }>;
  vehicles: Array<{ id: string; licensePlate: string }>;
  breakdowns: Array<{
    id: string;
    vehicle: string;
    description: string;
    parts: Array<{ itemCode: string; plannedQty: number }>;
  }>;
}

export function AddStockEntryModal({
  isOpen,
  onClose,
  onSuccess,
  warehouses,
  items,
  vehicles,
  breakdowns,
}: AddStockEntryModalProps) {
  const [entryType, setEntryType] = useState<'Material Issue' | 'Material Receipt' | 'Material Transfer'>(
    'Material Issue'
  );
  const [fromWarehouse, setFromWarehouse] = useState(warehouses[0]?.id || 'Stores - U');
  const [toWarehouse, setToWarehouse] = useState(warehouses[1]?.id || 'Kudremukh Spares - U');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedBreakdown, setSelectedBreakdown] = useState('');

  const [rows, setRows] = useState<
    Array<{
      itemCode: string;
      qty: number;
      rate: number;
      uom: string;
    }>
  >([{ itemCode: items[0]?.itemCode || '', qty: 1, rate: items[0]?.rate || 0, uom: items[0]?.uom || 'Nos' }]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // When breakdown changes, auto-populate vehicle and suggested parts
  const handleBreakdownSelect = (bkdId: string) => {
    setSelectedBreakdown(bkdId);
    if (!bkdId) return;

    const bkd = breakdowns.find((b) => b.id === bkdId);
    if (bkd) {
      if (bkd.vehicle) setSelectedVehicle(bkd.vehicle);
      if (bkd.parts && bkd.parts.length > 0) {
        const newRows = bkd.parts.map((p) => {
          const matchedItem = items.find((i) => i.itemCode === p.itemCode);
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
    const matched = items.find((i) => i.itemCode === itemCode);
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
    setRows([...rows, { itemCode: items[0]?.itemCode || '', qty: 1, rate: items[0]?.rate || 0, uom: items[0]?.uom || 'Nos' }]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, idx) => idx !== index));
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

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

    setIsSubmitting(true);
    try {
      const payload: CreateStockEntryInput = {
        entryType,
        fromWarehouse: entryType !== 'Material Receipt' ? fromWarehouse : undefined,
        toWarehouse: entryType !== 'Material Issue' ? toWarehouse : undefined,
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-3xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">New Stock Movement</h3>
              <p className="text-xs text-slate-500">
                Execute and submit a live Stock Entry in ERPNext
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Movement Type Radio / Buttons */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Movement Type</label>
            <div className="grid grid-cols-3 gap-3">
              {(['Material Issue', 'Material Receipt', 'Material Transfer'] as const).map((t) => (
                <button
                  type="button"
                  key={t}
                  onClick={() => setEntryType(t)}
                  className={`py-2 px-3 text-xs font-semibold rounded-md border text-center transition-all ${
                    entryType === t
                      ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
                      : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Warehouse Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {entryType !== 'Material Receipt' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Source Warehouse (From) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={fromWarehouse}
                  onChange={(e) => setFromWarehouse(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {entryType !== 'Material Issue' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Warehouse (To) <span className="text-rose-500">*</span>
                </label>
                <select
                  value={toWarehouse}
                  onChange={(e) => setToWarehouse(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Fleet Attribution (For Material Issue) */}
          {entryType === 'Material Issue' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-blue-50/50 rounded-lg border border-blue-100">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Active Vehicle Breakdown (Optional Link)
                </label>
                <select
                  value={selectedBreakdown}
                  onChange={(e) => handleBreakdownSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None / Routine Workshop Maintenance</option>
                  {breakdowns.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.id} — {b.vehicle} ({b.description.slice(0, 30)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vehicle Attribution
                </label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None / General Stock</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Items Line Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">Spare Parts Items</label>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Part
              </button>
            </div>

            <div className="border border-slate-200 rounded-md overflow-hidden">
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
                        <select
                          value={row.itemCode}
                          onChange={(e) => handleItemChange(idx, e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-300 rounded text-xs text-slate-900 bg-white focus:ring-2 focus:ring-blue-500"
                        >
                          {items.map((i) => (
                            <option key={i.itemCode} value={i.itemCode}>
                              {i.itemCode} — {i.itemName}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={row.qty}
                          onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                          className="w-20 px-2 py-1.5 border border-slate-300 rounded text-xs text-right text-slate-900 font-mono focus:ring-2 focus:ring-blue-500"
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
                          className="text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:cursor-not-allowed"
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
              <span>Submit Stock Entry</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

