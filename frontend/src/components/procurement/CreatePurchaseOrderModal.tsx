import React, { useState } from 'react';
import { CreatePurchaseOrderInput } from '@/types/fleet';
import { X, ShoppingCart, Plus, Trash2, AlertCircle } from 'lucide-react';

interface CreatePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  suppliers: Array<{ id: string; name: string }>;
  items: Array<{ itemCode: string; itemName: string; uom: string; rate: number }>;
  warehouses: Array<{ id: string; name: string }>;
  vehicles: Array<{ id: string; licensePlate: string }>;
  breakdowns: Array<{
    id: string;
    vehicle: string;
    description: string;
    parts: Array<{ itemCode: string; plannedQty: number }>;
  }>;
}

export function CreatePurchaseOrderModal({
  isOpen,
  onClose,
  onSuccess,
  suppliers,
  items,
  warehouses,
  vehicles,
  breakdowns,
}: CreatePurchaseOrderModalProps) {
  const todayStr = new Date().toISOString().split('T')[0];

  const [supplier, setSupplier] = useState(suppliers[0]?.id || '');
  const [transactionDate, setTransactionDate] = useState(todayStr);
  const [scheduleDate, setScheduleDate] = useState(todayStr);
  const [procurementType, setProcurementType] = useState('Spare Parts Replenishment');
  const [selectedVehicle, setSelectedVehicle] = useState('');
  const [selectedBreakdown, setSelectedBreakdown] = useState('');
  const [warehouse, setWarehouse] = useState(warehouses[0]?.id || 'Stores - U');

  const [rows, setRows] = useState<
    Array<{
      itemCode: string;
      qty: number;
      rate: number;
    }>
  >([{ itemCode: items[0]?.itemCode || '', qty: 10, rate: items[0]?.rate || 100 }]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBreakdownSelect = (bkdId: string) => {
    setSelectedBreakdown(bkdId);
    if (!bkdId) return;

    const bkd = breakdowns.find((b) => b.id === bkdId);
    if (bkd) {
      if (bkd.vehicle) setSelectedVehicle(bkd.vehicle);
      if (bkd.parts && bkd.parts.length > 0) {
        const newRows = bkd.parts.map((p) => {
          const matched = items.find((i) => i.itemCode === p.itemCode);
          return {
            itemCode: p.itemCode,
            qty: p.plannedQty || 1,
            rate: matched?.rate || 100,
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
    };
    setRows(updated);
  };

  const handleQtyChange = (index: number, qty: number) => {
    const updated = [...rows];
    updated[index].qty = qty;
    setRows(updated);
  };

  const handleRateChange = (index: number, rate: number) => {
    const updated = [...rows];
    updated[index].rate = rate;
    setRows(updated);
  };

  const addRow = () => {
    setRows([...rows, { itemCode: items[0]?.itemCode || '', qty: 5, rate: items[0]?.rate || 100 }]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, idx) => idx !== index));
  };

  const totalAmount = rows.reduce((sum, r) => sum + r.qty * r.rate, 0);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supplier) {
      setError('Supplier is required.');
      return;
    }

    if (procurementType === 'Vehicle Breakdown' && !selectedBreakdown) {
      setError('Breakdown record is required for Vehicle Breakdown procurement type.');
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
      if (r.rate < 0) {
        setError(`Rate cannot be negative for part '${r.itemCode}'.`);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: CreatePurchaseOrderInput = {
        supplier,
        transactionDate,
        scheduleDate,
        procurementType,
        vehicle: selectedVehicle || undefined,
        vehicleBreakdown: selectedBreakdown || undefined,
        items: rows.map((r) => ({
          itemCode: r.itemCode,
          qty: r.qty,
          rate: r.rate,
          warehouse,
          scheduleDate,
        })),
      };

      const res = await fetch('/api/procurement/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create purchase order in ERPNext');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'An error occurred while creating purchase order.');
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
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">New Purchase Order</h3>
              <p className="text-xs text-slate-500">
                Raise an official procurement order in ERPNext
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-md">
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
            {/* Supplier */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Supplier / Vendor <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Procurement Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Procurement Purpose
              </label>
              <select
                value={procurementType}
                onChange={(e) => setProcurementType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
              >
                <option value="Spare Parts Replenishment">Spare Parts Replenishment</option>
                <option value="Vehicle Breakdown">Vehicle Breakdown</option>
                <option value="Vehicle Maintenance">Vehicle Maintenance</option>
                <option value="Mine Site Requirement">Mine Site Requirement</option>
                <option value="General Fleet Operations">General Fleet Operations</option>
              </select>
            </div>

            {/* Dates */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Order Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expected Delivery Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={scheduleDate}
                onChange={(e) => setScheduleDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Target Warehouse */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Receiving Warehouse
              </label>
              <select
                value={warehouse}
                onChange={(e) => setWarehouse(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 focus:ring-2 focus:ring-blue-500"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Vehicle Breakdown Link (if selected) */}
            {procurementType === 'Vehicle Breakdown' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Active Breakdown Incident <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={selectedBreakdown}
                  onChange={(e) => handleBreakdownSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md text-sm text-slate-900 bg-amber-50/50 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Breakdown Incident</option>
                  {breakdowns.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.id} — {b.vehicle} ({b.description.slice(0, 30)})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Items Line Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700">Order Line Items</label>
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Line
              </button>
            </div>

            <div className="border border-slate-200 rounded-md overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-700 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Spare Part</th>
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
                      <td className="p-2 text-right">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.rate}
                          onChange={(e) => handleRateChange(idx, Number(e.target.value))}
                          className="w-28 px-2 py-1.5 border border-slate-300 rounded text-xs text-right text-slate-900 font-mono focus:ring-2 focus:ring-blue-500"
                        />
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
                <tfoot className="bg-slate-50 border-t border-slate-200">
                  <tr>
                    <td colSpan={3} className="py-2.5 px-3 font-semibold text-slate-700 text-right">
                      Estimated Grand Total:
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-right text-sm">
                      ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
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
              <span>Create Purchase Order</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

