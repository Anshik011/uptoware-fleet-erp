'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { ShoppingCart, X, AlertTriangle, Loader2 } from 'lucide-react';
import { toLocalDateString } from '@/lib/datetime';

interface AddFuelPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  vehicles: Array<{ id: string; licensePlate: string }>;
  mineSites?: Array<{ id: string; siteName: string }>;
}

export function AddFuelPurchaseModal({
  isOpen,
  onClose,
  onSuccess,
  vehicles,
  mineSites = [],
}: AddFuelPurchaseModalProps) {
  const [fuelDate, setFuelDate] = useState(() => toLocalDateString());
  const [supplyName, setSupplyName] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState(vehicles[0]?.licensePlate || vehicles[0]?.id || 'Site Bowser 01');
  const [selectedMineSite, setSelectedMineSite] = useState(mineSites[0]?.id || 'JBR Eastern - Talcher Site');
  const [quantityLitres, setQuantityLitres] = useState('');
  const [ratePerLitre, setRatePerLitre] = useState('');
  const [approvalStatus, setApprovalStatus] = useState<'Draft' | 'Approved'>('Draft');
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const payload = {
        fuelDate,
        fuelStation: supplyName.trim(),
        vehicle: selectedVehicle || 'Site Bowser 01',
        mineSite: selectedMineSite || 'JBR Eastern - Talcher Site',
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
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/75">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Log Fuel Purchase (Inward)</h2>
              <p className="text-xs text-slate-500">Record diesel purchase into bowsers or fleet bulk storage</p>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Row 1: Date & Supply Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Purchase Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={fuelDate}
                onChange={(e) => setFuelDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Supply Name / Vendor <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. IOCL Talcher / BPCL Depot"
                value={supplyName}
                onChange={(e) => setSupplyName(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-800"
              />
            </div>
          </div>

          {/* Row 2: Vehicle Number / Bowser & Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Vehicle / Bowser Tanker <span className="text-rose-500">*</span>
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
                Approval Status <span className="text-rose-500">*</span>
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

          {/* Row 3: Quantity (L), Rate (₹), Amount (₹) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Quantity (Litres) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                placeholder="5000"
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
                placeholder="94.50"
                value={ratePerLitre}
                onChange={(e) => setRatePerLitre(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Total Amount (₹)
              </label>
              <div className="w-full px-3 py-2 text-xs bg-slate-200/70 border border-slate-300 rounded-lg text-blue-900 font-mono font-bold">
                ₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
              Purchase Remarks / Challan Ref
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
              className="px-5 font-bold"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  <span>Recording Purchase...</span>
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
