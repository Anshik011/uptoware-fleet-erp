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
import { toLocalDateTimeInput, toLocalDateTimeString } from '@/lib/datetime';
import { Button } from '@/components/ui/Button';
import { LinkedField } from '@/components/ui/LinkedField';
import { AddVehicleModal } from '@/components/vehicles/AddVehicleModal';
import { AddDriverModal } from '@/components/drivers/AddDriverModal';
import { AddMineSiteModal } from '@/components/mine-sites/AddMineSiteModal';
import { VehicleDrawer } from '@/components/vehicles/VehicleDrawer';
import { DriverDrawer } from '@/components/drivers/DriverDrawer';
import { MineSiteDrawer } from '@/components/mine-sites/MineSiteDrawer';

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
  const [localVehicles, setLocalVehicles] = useState<Vehicle[]>(vehicles);
  const [localDrivers, setLocalDrivers] = useState<Driver[]>(drivers);
  const [localMineSites, setLocalMineSites] = useState<MineSite[]>(mineSites);

  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showAddMineSite, setShowAddMineSite] = useState(false);
  const [viewVehicleId, setViewVehicleId] = useState<string | null>(null);
  const [viewDriverId, setViewDriverId] = useState<string | null>(null);
  const [viewMineSiteId, setViewMineSiteId] = useState<string | null>(null);

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

  useEffect(() => {
    setLocalVehicles(vehicles);
  }, [vehicles]);

  useEffect(() => {
    setLocalDrivers(drivers);
  }, [drivers]);

  useEffect(() => {
    setLocalMineSites(mineSites);
  }, [mineSites]);

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

      setDispatchDateTime(toLocalDateTimeInput());

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
          : toLocalDateTimeString(),
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
            <LinkedField
              label="Vehicle"
              required
              value={vehicle}
              onChange={handleVehicleChange}
              options={localVehicles.map((v) => ({
                id: v.id,
                label: v.licensePlate,
                subtext: `${v.model || 'Tipper'} • ${v.payloadCapacityTons || 25}T`,
              }))}
              placeholder="Select Active Vehicle"
              entityName="Vehicle"
              icon={Truck}
              onCreateNew={() => setShowAddVehicle(true)}
              onViewRecord={(id) => setViewVehicleId(id)}
              data-testid="select-dispatch-vehicle"
            />

            {/* Driver Selection */}
            <LinkedField
              label="Driver"
              required
              value={driver}
              onChange={setDriver}
              options={localDrivers.map((d) => ({
                id: d.id,
                label: d.fullName,
                subtext: d.licenseNumber ? `Lic: ${d.licenseNumber}` : 'Commercial Operator',
              }))}
              placeholder="Select Active Driver"
              entityName="Driver"
              icon={User}
              onCreateNew={() => setShowAddDriver(true)}
              onViewRecord={(id) => setViewDriverId(id)}
              data-testid="select-dispatch-driver"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Mine Site */}
            <LinkedField
              label="Loading Mine Site"
              required
              value={mineSite}
              onChange={handleMineSiteChange}
              options={localMineSites.map((s) => ({
                id: s.siteName,
                label: s.siteName,
                subtext: s.mineralType,
              }))}
              placeholder="Select Operational Pit"
              entityName="Mine Site"
              icon={MapPin}
              onCreateNew={() => setShowAddMineSite(true)}
              onViewRecord={(id) => {
                const siteObj = localMineSites.find((s) => s.siteName === id || s.id === id);
                setViewMineSiteId(siteObj ? siteObj.id : id);
              }}
              data-testid="select-dispatch-site"
            />

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

      {/* Contextual Modals & Drawers */}
      <AddVehicleModal
        isOpen={showAddVehicle}
        onClose={() => setShowAddVehicle(false)}
        onSuccess={() => {
          fetch('/api/vehicles?limit=100')
            .then((r) => r.json())
            .then((res) => {
              if (res.success && res.data) {
                setLocalVehicles(res.data);
                if (res.data[0]) setVehicle(res.data[0].id);
              }
            });
          setShowAddVehicle(false);
        }}
      />

      <AddDriverModal
        isOpen={showAddDriver}
        onClose={() => setShowAddDriver(false)}
        onSuccess={(newDriver) => {
          fetch('/api/drivers?limit=100')
            .then((r) => r.json())
            .then((res) => {
              if (res.success && res.data) {
                setLocalDrivers(res.data);
                if (newDriver?.id) setDriver(newDriver.id);
              }
            });
          setShowAddDriver(false);
        }}
      />

      <AddMineSiteModal
        isOpen={showAddMineSite}
        onClose={() => setShowAddMineSite(false)}
        onSuccess={(newSite) => {
          fetch('/api/mine-sites?limit=50')
            .then((r) => r.json())
            .then((res) => {
              if (res.success && res.data) {
                setLocalMineSites(res.data);
                if (newSite?.siteName) setMineSite(newSite.siteName);
              }
            });
          setShowAddMineSite(false);
        }}
      />

      <VehicleDrawer
        vehicleId={viewVehicleId}
        onClose={() => setViewVehicleId(null)}
      />

      <DriverDrawer
        driverId={viewDriverId}
        onClose={() => setViewDriverId(null)}
      />

      <MineSiteDrawer
        siteId={viewMineSiteId}
        onClose={() => setViewMineSiteId(null)}
      />
    </div>
  );
}

