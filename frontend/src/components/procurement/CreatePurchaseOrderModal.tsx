import React, { useState, useEffect } from 'react';
import { CreatePurchaseOrderInput } from '@/types/fleet';
import { toLocalDateString } from '@/lib/datetime';
import {
  X,
  ShoppingCart,
  Plus,
  Trash2,
  AlertCircle,
  Camera,
  Upload,
  CheckCircle2,
  Video,
  Eye,
  Loader2,
  FileCheck,
} from 'lucide-react';
import { LinkedField } from '@/components/ui/LinkedField';
import { AddSupplierModal } from '@/components/procurement/AddSupplierModal';
import { SupplierDetailDrawer } from '@/components/procurement/SupplierDetailDrawer';
import { AddVehicleModal } from '@/components/vehicles/AddVehicleModal';
import { VehicleDrawer } from '@/components/vehicles/VehicleDrawer';
import { AddSparePartModal } from '@/components/inventory/AddSparePartModal';
import { SparePartDrawer } from '@/components/inventory/SparePartDrawer';
import { formatVehicleDisplay } from '@/lib/displayFormatters';
import { SignaturePadModal } from './SignaturePadModal';

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
  initialBreakdown?: string | null;
  initialVehicle?: string | null;
  initialType?: string | null;
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
  initialBreakdown,
  initialVehicle,
  initialType,
}: CreatePurchaseOrderModalProps) {
  const todayStr = toLocalDateString();

  const [localSuppliers, setLocalSuppliers] = useState(suppliers);
  const [localItems, setLocalItems] = useState(items);
  const [localVehicles, setLocalVehicles] = useState(vehicles);

  useEffect(() => {
    setLocalSuppliers(suppliers);
    if (suppliers.length > 0) {
      setSupplier((curr) => curr || suppliers[0].id);
    }
  }, [suppliers]);

  useEffect(() => {
    setLocalItems(items);
    setRows((prev) => {
      if ((prev.length === 0 || (prev.length === 1 && !prev[0].itemCode)) && items.length > 0) {
        return [
          {
            itemCode: items[0].itemCode,
            qty: prev[0]?.qty || 1,
            rate: items[0].rate || 100,
          },
        ];
      }
      return prev;
    });
  }, [items]);

  useEffect(() => {
    setLocalVehicles(vehicles);
  }, [vehicles]);

  const [supplier, setSupplier] = useState(suppliers[0]?.id || '');
  const [transactionDate, setTransactionDate] = useState(todayStr);
  const [scheduleDate, setScheduleDate] = useState(todayStr);
  const [procurementType, setProcurementType] = useState(
    initialType === 'service'
      ? 'Service Order'
      : initialBreakdown
        ? 'Breakdown Emergency Procurement'
        : 'Spare Parts Replenishment'
  );
  const [selectedVehicle, setSelectedVehicle] = useState(initialVehicle || '');
  const [selectedBreakdown, setSelectedBreakdown] = useState(initialBreakdown || '');
  const [warehouse, setWarehouse] = useState(warehouses[0]?.id || 'Stores - U');

  useEffect(() => {
    if (!isOpen) return;
    if (initialVehicle) setSelectedVehicle(initialVehicle);
    if (initialType === 'service') {
      setProcurementType('Service Order');
    } else if (initialBreakdown) {
      setSelectedBreakdown(initialBreakdown);
      setProcurementType('Breakdown Emergency Procurement');
    }
  }, [isOpen, initialBreakdown, initialVehicle, initialType]);

  const [rows, setRows] = useState<
    Array<{
      itemCode: string;
      qty: number;
      rate: number;
    }>
  >([{ itemCode: items[0]?.itemCode || '', qty: 10, rate: items[0]?.rate || 100 }]);

  const [evidenceMediaUrl, setEvidenceMediaUrl] = useState('');
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaUploadError, setMediaUploadError] = useState<string | null>(null);

  // Signatures State
  const [workshopSign, setWorkshopSign] = useState<string>('');
  const [mechanicalSign, setMechanicalSign] = useState<string>('');
  const [signModalConfig, setSignModalConfig] = useState<{
    isOpen: boolean;
    role: string;
    onSave: (dataUrl: string) => void;
  }>({
    isOpen: false,
    role: '',
    onSave: () => {},
  });

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setMediaUploadError(null);
    setIsUploadingMedia(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });
      const json = await res.json();
      if (!res.ok || !json.success || !json.data?.fileUrl) {
        throw new Error(json.error || 'Failed to upload photo or video file.');
      }
      setEvidenceMediaUrl(json.data.fileUrl);
    } catch (err: any) {
      setMediaUploadError(err.message || 'Error uploading file.');
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contextual modal & drawer states
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [viewSupplierId, setViewSupplierId] = useState<string | null>(null);

  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [viewVehicleId, setViewVehicleId] = useState<string | null>(null);

  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [viewPartId, setViewPartId] = useState<string | null>(null);
  const [activePartRowIndex, setActivePartRowIndex] = useState<number | null>(null);

  // Synchronize modal state on open
  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    if (!supplier && localSuppliers.length > 0) {
      setSupplier(localSuppliers[0].id);
    }
    if ((rows.length === 0 || (rows.length === 1 && !rows[0].itemCode)) && localItems.length > 0) {
      setRows([
        {
          itemCode: localItems[0].itemCode,
          qty: 1,
          rate: localItems[0].rate || 100,
        },
      ]);
    }
  }, [isOpen, localSuppliers, localItems]);

  const handleBreakdownSelect = (bkdId: string) => {
    setSelectedBreakdown(bkdId);
    if (!bkdId) return;

    const bkd = breakdowns.find((b) => b.id === bkdId);
    if (bkd) {
      if (bkd.vehicle) setSelectedVehicle(bkd.vehicle);
      if (bkd.parts && bkd.parts.length > 0) {
        const newRows = bkd.parts.map((p) => {
          const matched = localItems.find((i) => i.itemCode === p.itemCode);
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
    const matched = localItems.find((i) => i.itemCode === itemCode);
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
    setRows([...rows, { itemCode: localItems[0]?.itemCode || '', qty: 5, rate: localItems[0]?.rate || 100 }]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, idx) => idx !== index));
  };

  const refreshSuppliers = async () => {
    try {
      const res = await fetch('/api/procurement/suppliers');
      const data = await res.json();
      if (res.ok && data.success && data.suppliers) {
        setLocalSuppliers(data.suppliers.map((s: any) => ({ id: s.id, name: s.supplierName || s.id })));
        if (data.suppliers.length > 0) {
          setSupplier(data.suppliers[data.suppliers.length - 1].id);
        }
      }
    } catch (err) {
      console.warn('Failed to refresh suppliers:', err);
    }
  };

  const refreshVehicles = async () => {
    try {
      const res = await fetch('/api/vehicles');
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        setLocalVehicles(data.data.map((v: any) => ({ id: v.id, licensePlate: v.licensePlate || v.id })));
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
        if (mapped.length > 0) {
          const newest = mapped[mapped.length - 1];
          if (activePartRowIndex !== null && activePartRowIndex < rows.length) {
            handleItemChange(activePartRowIndex, newest.itemCode);
          } else {
            const emptyIdx = rows.findIndex((r) => !r.itemCode);
            const targetIdx = emptyIdx !== -1 ? emptyIdx : 0;
            handleItemChange(targetIdx, newest.itemCode);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to refresh items:', err);
    }
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

    // Auto-resolve itemCode from available catalog if empty
    const sanitizedRows = rows.map((r) => {
      let resolvedCode = r.itemCode?.trim();
      let resolvedRate = r.rate;
      if (!resolvedCode && localItems.length > 0) {
        resolvedCode = localItems[0].itemCode;
        if (!resolvedRate) resolvedRate = localItems[0].rate || 100;
      }
      return {
        ...r,
        itemCode: resolvedCode || '',
        rate: resolvedRate != null ? resolvedRate : 0,
      };
    });

    for (const r of sanitizedRows) {
      if (!r.itemCode || !r.itemCode.trim()) {
        setError('Please select a spare part for all order line items.');
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

    if (!evidenceMediaUrl) {
      setError('Part requisition proof (Photo/Video) is mandatory to create a Purchase Order.');
      return;
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
        evidenceMediaUrl: evidenceMediaUrl || undefined,
        workshopSignature: workshopSign || undefined,
        mechanicalSignature: mechanicalSign || undefined,
        items: sanitizedRows.map((r) => ({
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
        throw new Error(data.error || 'Failed to create purchase order');
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
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header (Pinned so Close X is always visible) */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 shrink-0">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-lg">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {procurementType === 'Service Order' ? 'New Service Order' : 'New Purchase Order'}
                </h3>
                <p className="text-xs text-slate-500">
                  Raise an official procurement order with linked master records
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close modal"
              className="text-slate-500 hover:text-slate-800 hover:bg-slate-200/70 p-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Supplier LinkedField */}
              <LinkedField
                label="Supplier / Vendor"
                required
                value={supplier}
                onChange={setSupplier}
                options={localSuppliers.map((s) => ({ value: s.id, label: s.name }))}
                entityName="Supplier"
                placeholder="Select or register supplier..."
                onCreateNew={() => setShowAddSupplierModal(true)}
                onViewRecord={supplier ? () => setViewSupplierId(supplier) : undefined}
                hint="Authorized vendor for spare parts replenishment"
              />

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
                  <option value="Service Order">Service Order (Workshop / External Service)</option>
                  <option value="Vehicle Breakdown">Vehicle Breakdown</option>
                  <option value="Vehicle Maintenance">Vehicle Maintenance</option>
                  <option value="Mine Site Requirement">Mine Site Requirement</option>
                  <option value="General Fleet Operations">General Fleet Operations</option>
                </select>
              </div>

              {/* Target Fleet Vehicle / Vehicle Number */}
              <LinkedField
                label="Vehicle Number (Optional)"
                value={selectedVehicle}
                onChange={setSelectedVehicle}
                options={localVehicles.map((v: any) => ({ value: v.id || v.name, label: v.licensePlate || v.name || v.id }))}
                entityName="Vehicle"
                placeholder="Select vehicle number..."
                onCreateNew={() => setShowAddVehicleModal(true)}
                onViewRecord={selectedVehicle ? () => setViewVehicleId(selectedVehicle) : undefined}
                hint="Fleet vehicle parts or services are designated for"
              />

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

              {/* Vehicle Breakdown Link (if selected) */}
              {procurementType === 'Vehicle Breakdown' && (
                <div className="sm:col-span-2">
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
                        {formatVehicleDisplay(b.vehicle, vehicles)} — Workshop Repair ({b.description?.slice(0, 30)})
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
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActivePartRowIndex(null);
                      setShowAddPartModal(true);
                    }}
                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
                  >
                    <Plus className="w-3 h-3 mr-1 text-slate-500" /> New Catalog Part
                  </button>
                  <button
                    type="button"
                    onClick={addRow}
                    className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Add Line
                  </button>
                </div>
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
                              className="flex-1 px-2 py-1.5 border border-slate-300 rounded text-xs text-slate-900 bg-white focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="" disabled>-- Select Spare Part --</option>
                              {localItems.map((i) => (
                                <option key={i.itemCode} value={i.itemCode}>
                                  {i.itemName || i.itemCode} ({i.itemCode})
                                </option>
                              ))}
                              {row.itemCode && !localItems.some((i) => i.itemCode === row.itemCode) && (
                                <option value={row.itemCode}>{row.itemCode}</option>
                              )}
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
                                <span className="text-[10px] font-mono px-1 border border-slate-200 rounded">View</span>
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

            {/* Photo / Video Proof Section (Mandatory to Create PO) */}
            <div className={`p-4 rounded-lg space-y-3 border ${evidenceMediaUrl ? 'bg-slate-50 border-slate-200' : 'bg-rose-50/40 border-rose-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Camera className="w-4 h-4 text-blue-900" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Part Verification Proof (Photo / Video Evidence) <span className="text-rose-600">* Mandatory</span>
                  </span>
                </div>
                {evidenceMediaUrl ? (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Proof Attached
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
                    Required *
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Upload photo or video of requisition slip, quotation, or damaged/replacement parts. Mandatory to create Purchase Order.
              </p>

              {evidenceMediaUrl ? (
                <div className="p-3 bg-white border border-emerald-200 rounded-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Evidence Uploaded
                    </div>
                    <div className="flex items-center gap-2">
                      <a
                        href={evidenceMediaUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-semibold"
                      >
                        <Eye className="w-3.5 h-3.5" /> Open Full Size
                      </a>
                      <button
                        type="button"
                        onClick={() => setEvidenceMediaUrl('')}
                        className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 hover:bg-rose-50 rounded"
                      >
                        Remove & Replace
                      </button>
                    </div>
                  </div>
                  {evidenceMediaUrl.match(/\.(mp4|mov|webm)$/i) ? (
                    <video
                      src={evidenceMediaUrl}
                      controls
                      className="w-full max-h-72 bg-slate-900 rounded-lg object-contain"
                    />
                  ) : (
                    <a href={evidenceMediaUrl} target="_blank" rel="noreferrer" className="block">
                      <img
                        src={evidenceMediaUrl}
                        alt="Evidence Proof"
                        className="w-full max-h-72 object-contain rounded-lg border border-slate-200 bg-slate-50"
                      />
                    </a>
                  )}
                </div>
              ) : (
                <div>
                  <label className="cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-slate-300 rounded-md shadow-xs text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition-colors gap-2">
                    {isUploadingMedia ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-blue-900" />
                        <span>Uploading Media...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 text-slate-500" />
                        <span>Upload Photo / Video Proof</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*,video/*"
                      capture="environment"
                      disabled={isUploadingMedia}
                      onChange={handleMediaUpload}
                      className="hidden"
                    />
                  </label>
                  {mediaUploadError && (
                    <p className="text-xs text-rose-600 font-medium mt-1.5">{mediaUploadError}</p>
                  )}
                </div>
              )}
            </div>

            {/* Signatures Section: Workshop Incharge & Mechanical Inspection */}
            <div className="border border-slate-200 rounded-lg p-3 bg-slate-50 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                  Requisition Signatures (Workshop & Mechanical)
                </label>
                <span className="text-[11px] text-slate-500">Sign with draw or typed signature</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Sign 1: Workshop Incharge */}
                <div className="border border-slate-300 rounded-lg p-2.5 bg-white flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-900">Workshop Incharge Sign</span>
                    {workshopSign ? (
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Signed
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Pending</span>
                    )}
                  </div>
                  <div className="h-14 flex items-center justify-center border border-dashed border-slate-200 rounded bg-slate-50/50 my-1">
                    {workshopSign ? (
                      <img src={workshopSign} alt="Workshop Sign" className="max-h-12 object-contain" />
                    ) : (
                      <span className="text-[11px] text-slate-400">Click below to apply signature</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setSignModalConfig({
                          isOpen: true,
                          role: 'Workshop Incharge',
                          onSave: (dataUrl) => setWorkshopSign(dataUrl),
                        })
                      }
                      className="text-xs text-blue-700 hover:text-blue-900 font-semibold hover:underline"
                    >
                      {workshopSign ? 'Change Signature' : '✍ Sign Here'}
                    </button>
                    {workshopSign && (
                      <button
                        type="button"
                        onClick={() => setWorkshopSign('')}
                        className="text-xs text-rose-600 hover:text-rose-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Sign 2: Mechanical Inspection */}
                <div className="border border-slate-300 rounded-lg p-2.5 bg-white flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-slate-900">Mechanical / Technical Sign</span>
                    {mechanicalSign ? (
                      <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> Signed
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Pending</span>
                    )}
                  </div>
                  <div className="h-14 flex items-center justify-center border border-dashed border-slate-200 rounded bg-slate-50/50 my-1">
                    {mechanicalSign ? (
                      <img src={mechanicalSign} alt="Mechanical Sign" className="max-h-12 object-contain" />
                    ) : (
                      <span className="text-[11px] text-slate-400">Click below to apply signature</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setSignModalConfig({
                          isOpen: true,
                          role: 'Mechanical / Technical Inspector',
                          onSave: (dataUrl) => setMechanicalSign(dataUrl),
                        })
                      }
                      className="text-xs text-blue-700 hover:text-blue-900 font-semibold hover:underline"
                    >
                      {mechanicalSign ? 'Change Signature' : '✍ Sign Here'}
                    </button>
                    {mechanicalSign && (
                      <button
                        type="button"
                        onClick={() => setMechanicalSign('')}
                        className="text-xs text-rose-600 hover:text-rose-700"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
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

      {/* Contextual Sub-Modals and Drawers */}
      <AddSupplierModal
        isOpen={showAddSupplierModal}
        onClose={() => setShowAddSupplierModal(false)}
        onSuccess={() => {
          setShowAddSupplierModal(false);
          refreshSuppliers();
        }}
        groups={['Parts & Consumables', 'Services', 'Fuel', 'Hardware']}
      />

      <SupplierDetailDrawer
        supplierId={viewSupplierId}
        onClose={() => setViewSupplierId(null)}
      />

      <AddVehicleModal
        isOpen={showAddVehicleModal}
        onClose={() => setShowAddVehicleModal(false)}
        onSuccess={() => {
          setShowAddVehicleModal(false);
          refreshVehicles();
        }}
      />

      <VehicleDrawer
        vehicleId={viewVehicleId}
        onClose={() => setViewVehicleId(null)}
      />

      <AddSparePartModal
        isOpen={showAddPartModal}
        onClose={() => setShowAddPartModal(false)}
        onSuccess={() => {
          setShowAddPartModal(false);
          refreshItems();
        }}
        itemGroups={['Spare Parts', 'Consumables', 'Lubricants', 'Tyres', 'Mechanical', 'Electrical']}
        suppliers={localSuppliers}
      />

      <SparePartDrawer
        itemId={viewPartId}
        onClose={() => setViewPartId(null)}
      />

      <SignaturePadModal
        isOpen={signModalConfig.isOpen}
        onClose={() => setSignModalConfig((prev) => ({ ...prev, isOpen: false }))}
        onSave={signModalConfig.onSave}
        roleTitle={signModalConfig.role}
      />
    </>
  );
}
