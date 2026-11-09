'use client';

import React, { useState, useEffect } from 'react';
import { Vehicle, Driver, MineSite, CreateMiningTripInput } from '@/types/fleet';
import {
  X,
  Compass,
  Truck,
  User,
  MapPin,
  Calendar,
  Gauge,
  IndianRupee,
  AlertTriangle,
  Loader2,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface CreateTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newTrip: any) => void;
}

export function CreateTripModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateTripModalProps) {
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [mineSites, setMineSites] = useState<MineSite[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);

  // Form state
  const [vehicle, setVehicle] = useState('');
  const [driver, setDriver] = useState('');
  const [mineSite, setMineSite] = useState('');
  const [destination, setDestination] = useState('');
  const [materialType, setMaterialType] = useState('');
  const [challanNumber, setChallanNumber] = useState('');
  const [ratePerTon, setRatePerTon] = useState<number | ''>('');
  const [openingOdometer, setOpeningOdometer] = useState<number | ''>('');
  const [dispatchDateTime, setDispatchDateTime] = useState('');

  // Fetch form options on modal open
  useEffect(() => {
    if (!isOpen) {
      resetForm();
      return;
    }

    // Set default dispatch datetime to current local datetime
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setDispatchDateTime(localIso);

    setLoadingOptions(true);
    setError(null);

    fetch('/api/trips/options')
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (data.success && data.data) {
          setVehicles(data.data.vehicles || []);
          setDrivers(data.data.drivers || []);
          setMineSites(data.data.mineSites || []);
          setMaterials(data.data.materials || []);

          if (data.data.materials?.length > 0) {
            setMaterialType(data.data.materials[0]);
          }
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to fetch form options from backend.');
      })
      .finally(() => {
        setLoadingOptions(false);
      });
  }, [isOpen]);

  const resetForm = () => {
    setVehicle('');
    setDriver('');
    setMineSite('');
    setDestination('');
    setMaterialType('');
    setChallanNumber('');
    setRatePerTon('');
    setOpeningOdometer('');
    setDispatchDateTime('');
    setError(null);
  };

  // Auto-fill defaults when vehicle changes
  const handleVehicleChange = (vId: string) => {
    setVehicle(vId);
    const selectedVeh = vehicles.find((v) => v.id === vId || v.licensePlate === vId);
    if (selectedVeh) {
      setOpeningOdometer(selectedVeh.lastOdometer || 0);
      if (selectedVeh.assignedDriverId) {
        const assigned = drivers.find((d) => d.id === selectedVeh.assignedDriverId);
        if (assigned) {
          setDriver(assigned.id);
        }
      }
    }
  };

  // Auto-fill defaults when mine site changes
  const handleMineSiteChange = (sId: string) => {
    setMineSite(sId);
    const selectedSite = mineSites.find((s) => s.id === sId || s.siteName === sId);
    if (selectedSite) {
      if (selectedSite.ratePerTon) {
        setRatePerTon(selectedSite.ratePerTon);
      }
      if (selectedSite.mineralType) {
        setMaterialType(selectedSite.mineralType);
      }
    }
  };

  const selectedVehicleObj = vehicles.find((v) => v.id === vehicle || v.licensePlate === vehicle);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!vehicle) {
      setError('Please select an active operational vehicle.');
      return;
    }
    if (!driver) {
      setError('Please select an active driver.');
      return;
    }
    if (!mineSite) {
      setError('Please select an operational mine site pit.');
      return;
    }
    if (!destination.trim()) {
      setError('Destination location or delivery terminal is required.');
      return;
    }
    if (!materialType) {
      setError('Material type must be specified.');
      return;
    }

    if (
      openingOdometer !== '' &&
      selectedVehicleObj &&
      Number(openingOdometer) < selectedVehicleObj.lastOdometer
    ) {
      setError(
        `Opening odometer (${openingOdometer} km) cannot be less than vehicle's last recorded odometer (${selectedVehicleObj.lastOdometer} km).`
      );
      return;
    }

    setSubmitting(true);

    try {
      const formattedDt = dispatchDateTime.replace('T', ' ') + ':00';
      const input: CreateMiningTripInput = {
        vehicle,
        driver,
        mineSite,
        destination: destination.trim(),
        materialType,
        dispatchDateTime: formattedDt,
        ratePerTon: ratePerTon !== '' ? Number(ratePerTon) : undefined,
        openingOdometer: openingOdometer !== '' ? Number(openingOdometer) : undefined,
        challanNumber: challanNumber.trim() || undefined,
      };

      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `HTTP ${res.status}`);
      }

      onSuccess(data.data);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create mining trip.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50/75 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900 text-white flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Dispatch New Mining Trip</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign vehicle, driver, and destination for ore haulage
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
              <div>
                <p className="font-semibold">Validation Error</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {loadingOptions ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
              <span className="text-xs font-medium">Loading fleet operational assets...</span>
            </div>
          ) : (
            <>
              {/* Row 1: Vehicle & Driver */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Select Vehicle <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={vehicle}
                      onChange={(e) => handleVehicleChange(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900 font-medium"
                    >
                      <option value="">-- Choose Active Vehicle --</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.licensePlate} ({v.make} {v.model} &bull; {v.payloadCapacityTons}T)
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedVehicleObj && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Last recorded odometer: <strong>{selectedVehicleObj.lastOdometer.toLocaleString()} km</strong>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Assign Driver <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={driver}
                      onChange={(e) => setDriver(e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900 font-medium"
                    >
                      <option value="">-- Choose Active Driver --</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.fullName} ({d.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Row 2: Mine Site & Destination */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Origin Mine Site / Pit <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={mineSite}
                    onChange={(e) => handleMineSiteChange(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900 font-medium"
                  >
                    <option value="">-- Choose Operational Mine Site --</option>
                    {mineSites.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.siteName} ({s.mineralType})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Destination Terminal / Port <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mangalore Port Berth 8"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900"
                  />
                </div>
              </div>

              {/* Row 3: Material Type & Challan Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Material / Commodity <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={materialType}
                    onChange={(e) => setMaterialType(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900 font-medium"
                  >
                    {materials.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Challan / Transit Pass #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CH-2026-908"
                    value={challanNumber}
                    onChange={(e) => setChallanNumber(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-slate-900"
                  />
                </div>
              </div>

              {/* Row 4: Dispatch Date & Opening Odometer */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Dispatch Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={dispatchDateTime}
                    onChange={(e) => setDispatchDateTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Opening Odometer (km)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 62100"
                    value={openingOdometer}
                    onChange={(e) =>
                      setOpeningOdometer(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 font-mono"
                  />
                </div>

                <div className="sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Rate / Ton (₹) <span className="text-slate-400 font-normal lowercase">(indicative)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="e.g. 350"
                    value={ratePerTon}
                    onChange={(e) =>
                      setRatePerTon(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 text-slate-900 font-mono"
                  />
                </div>
              </div>
            </>
          )}

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <Button type="button" onClick={onClose} variant="outline" size="md">
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={submitting}
              icon={Compass}
              disabled={loadingOptions || submitting}
            >
              Create Mining Trip
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

