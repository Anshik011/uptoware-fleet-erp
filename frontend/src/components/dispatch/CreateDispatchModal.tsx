'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Truck,
  User,
  MapPin,
  Calendar,
  Layers,
  FileText,
  AlertTriangle,
  Loader2,
  Send,
} from 'lucide-react';
import { Vehicle, Driver, MineSite } from '@/types/fleet';
import { Button } from '@/components/ui/Button';

interface CreateDispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTripCreated: () => void;
  vehicles: Vehicle[];
  drivers: Driver[];
  mineSites: MineSite[];
  materials: string[];
}

export function CreateDispatchModal({
  isOpen,
  onClose,
  onTripCreated,
  vehicles,
  drivers,
  mineSites,
  materials,
}: CreateDispatchModalProps) {
  const [vehicle, setVehicle] = useState('');
  const [driver, setDriver] = useState('');
  const [mineSite, setMineSite] = useState('');
  const [destination, setDestination] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [dispatchDateTime, setDispatchDateTime] = useState('');
  const [openingOdometer, setOpeningOdometer] = useState<number | ''>('');
  const [ratePerTon, setRatePerTon] = useState<number | ''>('');
  const [challanNumber, setChallanNumber] = useState('');
  const [dispatchImmediately, setDispatchImmediately] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize defaults on open
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setLoading(false);
      setVehicle(vehicles[0]?.id || '');
      setDriver(drivers[0]?.id || '');
      setMineSite(mineSites[0]?.siteName || '');
      setDestination(mineSites[0]?.location || 'Mangalore Port Berth 8');
      setMaterialType(materials[0] || 'Iron Ore');
      setChallanNumber('');
      setDispatchImmediately(true);

      const now = new Date();
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setDispatchDateTime(localIso);

      if (vehicles[0]) {
        setOpeningOdometer(vehicles[0].lastOdometer || 0);
      }
      if (mineSites[0]) {
        setRatePerTon(mineSites[0].ratePerTon || '');
      }
    }
  }, [isOpen, vehicles, drivers, mineSites, materials]);

  // When vehicle changes, update opening odometer
  const handleVehicleChange = (vId: string) => {
    setVehicle(vId);
    const sel = vehicles.find((v) => v.id === vId);
    if (sel && sel.lastOdometer != null) {
      setOpeningOdometer(sel.lastOdometer);
    }
  };

  // When mine site changes, update destination and rate
  const handleMineSiteChange = (sName: string) => {
    setMineSite(sName);
    const sel = mineSites.find((s) => s.siteName === sName);
    if (sel) {
      if (sel.location) setDestination(sel.location);
      if (sel.ratePerTon != null) setRatePerTon(sel.ratePerTon);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!vehicle) {
      setError('Vehicle selection is mandatory.');
      return;
    }
    if (!driver) {
      setError('Driver selection is mandatory.');
      return;
    }
    if (!mineSite) {
      setError('Mine Site selection is mandatory.');
      return;
    }
    if (!destination.trim()) {
      setError('Destination is mandatory.');
      return;
    }
    if (!materialType) {
      setError('Material Type is mandatory.');
      return;
    }

    setLoading(true);
    try {
      const payload: any = {
        vehicle,
        driver,
        mineSite,
        destination: destination.trim(),
        materialType,
        dispatchDateTime: dispatchDateTime
          ? dispatchDateTime.replace('T', ' ') + ':00'
          : new Date().toISOString().replace('T', ' ').substring(0, 19),
        action: dispatchImmediately ? 'Dispatch' : undefined,
      };

      if (openingOdometer !== '') payload.openingOdometer = Number(openingOdometer);
      if (ratePerTon !== '') payload.ratePerTon = Number(ratePerTon);
      if (challanNumber.trim()) payload.challanNumber = challanNumber.trim();

      const res = await fetch('/api/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to dispatch mining trip.');
      }

      onTripCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error creating dispatch.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
      data-testid="create-dispatch-modal"
    >
      <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-50 text-blue-900 border border-blue-200">
              <Send className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">New Haulage Dispatch</h2>
              <p className="text-xs text-slate-500">
                Authorize mining haulage trip across active operational pits
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Vehicle Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Vehicle <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Truck className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={vehicle}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                  required
                  data-testid="select-dispatch-vehicle"
                >
                  <option value="">Select Active Vehicle</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate} ({v.model || 'Tipper'} &bull; {v.payloadCapacityTons || 25}T)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Driver Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Driver <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                  required
                  data-testid="select-dispatch-driver"
                >
                  <option value="">Select Active Driver</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} ({d.id})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mine Site */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Loading Mine Site <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={mineSite}
                  onChange={(e) => handleMineSiteChange(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                  required
                  data-testid="select-dispatch-site"
                >
                  <option value="">Select Operational Pit</option>
                  {mineSites.map((s) => (
                    <option key={s.id} value={s.siteName}>
                      {s.siteName} ({s.mineralType})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Destination */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Destination <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Mangalore Port Berth 8"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                required
                data-testid="input-dispatch-destination"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Material Type */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Material <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Layers className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <select
                  value={materialType}
                  onChange={(e) => setMaterialType(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                  required
                  data-testid="select-dispatch-material"
                >
                  {materials.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Opening Odometer */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Opening Odometer (km)
              </label>
              <input
                type="number"
                min="0"
                value={openingOdometer}
                onChange={(e) =>
                  setOpeningOdometer(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 font-mono"
                data-testid="input-dispatch-odometer"
              />
            </div>

            {/* Challan Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Challan Number
              </label>
              <div className="relative">
                <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="e.g. CH-2026-088"
                  value={challanNumber}
                  onChange={(e) => setChallanNumber(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 font-mono"
                  data-testid="input-dispatch-challan"
                />
              </div>
            </div>
          </div>

          {/* Immediate Dispatch Toggle */}
          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-800 block">
                Authorize & Dispatch Immediately
              </span>
              <span className="text-[11px] text-slate-500 block">
                Transition trip to &apos;Dispatched&apos; and synchronize vehicle status to &apos;On Trip&apos;
              </span>
            </div>
            <input
              type="checkbox"
              checked={dispatchImmediately}
              onChange={(e) => setDispatchImmediately(e.target.checked)}
              className="w-4 h-4 rounded text-blue-900 focus:ring-blue-600 border-slate-300"
              data-testid="check-dispatch-immediately"
            />
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button type="button" onClick={onClose} variant="outline" size="md">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={loading}
              data-testid="btn-submit-create-dispatch"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin" /> Dispatching...
                </span>
              ) : dispatchImmediately ? (
                'Create & Dispatch'
              ) : (
                'Create Draft Trip'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

