'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { ShoppingCart, X, AlertTriangle, Loader2, Fuel, Building2, Calendar, FileText, CheckCircle2 } from 'lucide-react';
import { toLocalDateString } from '@/lib/datetime';

interface AddFuelPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicles: Array<{ id: string; licensePlate: string }>;
  mineSites?: Array<{ id: string; siteName: string }>;
}

const DEFAULT_SUPPLIERS = [
  'JAGA BALIA FS',
  'IOCL Talcher Depot',
  'BPCL Consumer Pump',
  'HPCL Bulk Fuels',
  'Mahanadi Fuel Station',
  'Kalinga Fuel Center',
];

export function AddFuelPurchaseModal({
  isOpen,
  onClose,
  onSuccess,
  vehicles,
  mineSites = [],
}: AddFuelPurchaseModalProps) {
  const [fuelDate, setFuelDate] = useState(() => toLocalDateString());
  const [supplyName, setSupplyName] = useState(DEFAULT_SUPPLIERS[0]);
  const [availableSuppliers, setAvailableSuppliers] = useState<string[]>(DEFAULT_SUPPLIERS);
  const [selectedVehicle, setSelectedVehicle] = useState('Site Bowser 01');
  const [selectedMineSite, setSelectedMineSite] = useState('JBR Eastern — Talcher Site');
  const [quantityLitres, setQuantityLitres] = useState('');
  const [ratePerLitre, setRatePerLitre] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<'Draft' | 'Approved'>('Draft');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch registered suppliers on open to auto-populate supply name options
  useEffect(() => {
    if (!isOpen) return;
    async function loadSuppliers() {
      try {
        const res = await fetch('/api/procurement/suppliers');
        const json = await res.json();
        if (json.success && Array.isArray(json.suppliers)) {
          const names = json.suppliers.map((s: any) => s.supplierName || s.name || s.id);
          const merged = Array.from(new Set([...names, ...DEFAULT_SUPPLIERS]));
          setAvailableSuppliers(merged);
          if (!supplyName && merged.length > 0) {
            setSupplyName(merged[0]);
          }
        }
      } catch (e) {
        // Fallback to DEFAULT_SUPPLIERS
      }
    }
    loadSuppliers();
  }, [isOpen]);

  useEffect(() => {
    if (mineSites.length > 0) {
      const match = mineSites.find((m) => m.id.includes('Talcher') || m.siteName.includes('Talcher'));
      if (match) {
        setSelectedMineSite(match.id || match.siteName);
      } else {
        setSelectedMineSite(mineSites[0].id || mineSites[0].siteName);
      }
    }
  }, [mineSites]);

  if (!isOpen) return null;

  const totalAmount =
    quantityLitres && ratePerLitre && !isNaN(Number(quantityLitres)) && !isNaN(Number(ratePerLitre))
      ? Number(quantityLitres) * Number(ratePerLitre)
      : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!supplyName.trim()) {
      setError('Supply Name (Supplier / Bowser / Petrol Pump) is required.');
      return;
    }
    if (!quantityLitres || Number(quantityLitres) <= 0) {
      setError('Please enter a valid fuel purchase quantity in Litres.');
      return;
    }
    if (!ratePerLitre || Number(ratePerLitre) <= 0) {
      setError('Please enter a valid rate per Litre.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Normalize mine site name: replace single hyphen with em dash '—' to match Frappe doctype
      const normalizedMineSite = (selectedMineSite || 'JBR Eastern — Talcher Site')
        .replace(/\s*-\s*/g, ' — ')
        .trim();

      const payload = {
        fuelDate,
        fuelStation: supplyName.trim(),
        vehicle: selectedVehicle || 'Site Bowser 01',
        mineSite: normalizedMineSite,
        fuelSource: 'Site Bowser',
        odometerReading: 0,
        isFullTank: true,
        quantityLitres: Number(quantityLitres),
        ratePerLitre: Number(ratePerLitre),
        totalCost: totalAmount,
        remarks: `[TYPE:PURCHASE] ${remarks.trim()}`.trim(),
      };

      const res = await fetch('/api/fuel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to record fuel purchase.');
      }

      // If user selected instant Approved status, trigger approval transition
      if (approvalStatus === 'Approved' && json.data?.id) {
        await fetch(`/api/fuel/${encodeURIComponent(json.data.id)}/transition`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'Approve' }),
        }).catch(() => null);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error recording fuel purchase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/75">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Create Fuel Purchase (Inward)</h2>
              <p className="text-xs text-slate-500">Structured procurement flow matching spare parts requisition</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body with Multi-Step Layout */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-800">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Supply Details & Mine Site */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-900 text-white text-[11px] font-bold flex items-center justify-center">1</span>
                Supplier & Mine Site Location
              </span>
              <span className="text-[11px] text-blue-700 font-semibold">Auto Supply Name</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Supply Name (Supplier / Petrol Pump) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="fuel-supplier-options"
                    placeholder="Select or enter supplier..."
                    value={supplyName}
                    onChange={(e) => setSupplyName(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900 font-semibold"
                  />
                  <datalist id="fuel-supplier-options">
                    {availableSuppliers.map((s, idx) => (
                      <option key={idx} value={s} />
                    ))}
                  </datalist>
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {availableSuppliers.slice(0, 3).map((name, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSupplyName(name)}
                      className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors ${
                        supplyName === name
                          ? 'bg-blue-900 text-white border-blue-900 font-bold'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Mine Site Location <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedMineSite}
                  onChange={(e) => setSelectedMineSite(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900 font-medium"
                >
                  <option value="JBR Eastern — Talcher Site">JBR Eastern — Talcher Site</option>
                  <option value="JBR Eastern — Ib Valley Site">JBR Eastern — Ib Valley Site</option>
                  {mineSites
                    .filter((m) => !m.siteName.includes('Talcher') && !m.siteName.includes('Ib Valley'))
                    .map((m) => (
                      <option key={m.id} value={m.id || m.siteName}>
                        {m.siteName}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* STEP 2: Storage Unit & Date */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-900 text-white text-[11px] font-bold flex items-center justify-center">2</span>
                Storage Unit & Date
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Purchase Date <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={fuelDate}
                  onChange={(e) => setFuelDate(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Target Tank / Bowser <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedVehicle}
                  onChange={(e) => setSelectedVehicle(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-800 font-medium"
                >
                  <option value="Site Bowser 01">Site Bowser 01</option>
                  <option value="Site Bowser 02">Site Bowser 02</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.licensePlate || v.id}>
                      {v.licensePlate || v.id}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Workflow Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={approvalStatus}
                  onChange={(e) => setApprovalStatus(e.target.value as 'Draft' | 'Approved')}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-800 font-medium"
                >
                  <option value="Draft">Pending Approval (Draft)</option>
                  <option value="Approved">Direct Approved</option>
                </select>
              </div>
            </div>
          </div>

          {/* STEP 3: Fuel Quantity & Commercial Value */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-900 text-white text-[11px] font-bold flex items-center justify-center">3</span>
                Quantity & Pricing (HSD Diesel)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-white p-3 rounded-lg border border-slate-200">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Quantity (Litres) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.1"
                  placeholder="e.g. 5000"
                  value={quantityLitres}
                  onChange={(e) => setQuantityLitres(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Rate / Litre (₹) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  placeholder="e.g. 94.50"
                  value={ratePerLitre}
                  onChange={(e) => setRatePerLitre(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900 font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                  Total Bill Amount (₹)
                </label>
                <div className="w-full px-3 py-2 text-xs bg-blue-50/70 border border-blue-200 rounded-lg text-blue-900 font-mono font-bold">
                  ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* STEP 4: Remarks / Invoice Reference */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Purchase Remarks / Tanker Invoice #
            </label>
            <input
              type="text"
              placeholder="e.g. Invoice #IOCL-8842, Bulk tanker delivery"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-800"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={isSubmitting}
              className="px-5 font-bold bg-blue-900 hover:bg-blue-950 text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  <span>Recording Fuel Purchase...</span>
                </>
              ) : (
                'Save Fuel Purchase'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
