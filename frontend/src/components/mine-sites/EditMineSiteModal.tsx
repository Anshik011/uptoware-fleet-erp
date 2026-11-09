'use client';

import React, { useState, useEffect } from 'react';
import {
  MineSite,
  UpdateMineSiteInput,
  MineSiteStatus,
  MineralType,
  CustomerOption,
} from '@/types/fleet';
import { X, Mountain, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface EditMineSiteModalProps {
  site: MineSite | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedSite: MineSite) => void;
}

const MINERAL_OPTIONS: MineralType[] = [
  'Iron Ore',
  'Coal',
  'Bauxite',
  'Limestone',
  'Manganese',
  'Overburden',
  'Other',
];

export function EditMineSiteModal({
  site,
  isOpen,
  onClose,
  onSuccess,
}: EditMineSiteModalProps) {
  const [client, setClient] = useState('');
  const [status, setStatus] = useState<MineSiteStatus>('Operational');
  const [mineralType, setMineralType] = useState<MineralType>('Iron Ore');
  const [dailyTargetTonnage, setDailyTargetTonnage] = useState('0');
  const [activeLoadingPits, setActiveLoadingPits] = useState('1');
  const [ratePerTon, setRatePerTon] = useState('0');
  const [location, setLocation] = useState('');

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !site) return;

    setClient(site.client || '');
    setStatus(site.status || 'Operational');
    setMineralType(site.mineralType || 'Iron Ore');
    setDailyTargetTonnage(String(site.dailyTargetTonnage ?? 0));
    setActiveLoadingPits(String(site.activeLoadingPits ?? 1));
    setRatePerTon(String(site.ratePerTon ?? 0));
    setLocation(site.location || '');
    setError(null);

    async function loadCustomers() {
      try {
        const res = await fetch('/api/mine-sites/customers');
        const json = await res.json();
        if (res.ok && json.success) {
          setCustomers(json.data || []);
        }
      } catch (err) {
        console.error('Failed to load customers for mine site editing:', err);
      }
    }

    loadCustomers();
  }, [isOpen, site]);

  if (!isOpen || !site) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetTons = Number(dailyTargetTonnage);
    if (isNaN(targetTons) || targetTons < 0) {
      setError('Daily target tonnage must be a non-negative number.');
      return;
    }

    const pits = Number(activeLoadingPits);
    if (isNaN(pits) || !Number.isInteger(pits) || pits < 1) {
      setError('Active loading pits must be an integer greater than or equal to 1.');
      return;
    }

    const rate = Number(ratePerTon);
    if (isNaN(rate) || rate < 0) {
      setError('Indicative rate per ton must be a non-negative number.');
      return;
    }

    const payload: UpdateMineSiteInput = {
      client: client.trim() || undefined,
      status,
      mineralType,
      dailyTargetTonnage: targetTons,
      activeLoadingPits: pits,
      ratePerTon: rate,
      location: location.trim() || undefined,
    };

    try {
      setIsSubmitting(true);
      const res = await fetch(`/api/mine-sites/${encodeURIComponent(site.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update mine site');
      }

      onSuccess(json.data);
      onClose();
    } catch (err: any) {
      console.error('Edit mine site error:', err);
      setError(err.message || 'Error occurred while updating mine site.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden my-8">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900 text-white flex items-center justify-center shrink-0">
              <Mountain className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Edit Mine Site: {site.siteName}
              </h2>
              <p className="text-xs text-slate-500 font-mono">
                Site ID: {site.id}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
            aria-label="Close modal"
            data-testid="btn-close-edit-modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div
              className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5"
              data-testid="edit-form-error-alert"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client / Customer */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Client / Customer
              </label>
              <select
                value={client}
                onChange={(e) => setClient(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs bg-white"
                data-testid="edit-select-client"
              >
                <option value="">Captive / Internal Operation</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.customerName}
                  </option>
                ))}
              </select>
            </div>

            {/* Mineral Type */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mineral Extracted <span className="text-rose-500">*</span>
              </label>
              <select
                value={mineralType}
                onChange={(e) => setMineralType(e.target.value as MineralType)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs bg-white"
                data-testid="edit-select-mineral-type"
              >
                {MINERAL_OPTIONS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Operating Status <span className="text-rose-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MineSiteStatus)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs bg-white"
                data-testid="edit-select-status"
              >
                <option value="Operational">Operational</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Active Loading Pits */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Active Loading Pits <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={activeLoadingPits}
                onChange={(e) => setActiveLoadingPits(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
                data-testid="edit-input-loading-pits"
              />
            </div>

            {/* Daily Target Tonnage */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Daily Target Capacity (MT/day)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={dailyTargetTonnage}
                onChange={(e) => setDailyTargetTonnage(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
                data-testid="edit-input-target-tonnage"
              />
            </div>

            {/* Indicative Rate per Ton */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Indicative Rate / Ton (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={ratePerTon}
                onChange={(e) => setRatePerTon(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs"
                data-testid="edit-input-rate-per-ton"
              />
            </div>
          </div>

          {/* Location & Access Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Site Address & Access Notes
            </label>
            <textarea
              rows={3}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600 shadow-xs resize-none"
              data-testid="edit-textarea-location"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              data-testid="btn-cancel-edit-modal"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={isSubmitting}
              className="gap-2"
              data-testid="btn-save-edit-mine-site"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

