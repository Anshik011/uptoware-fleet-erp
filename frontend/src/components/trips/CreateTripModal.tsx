'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Vehicle, Driver, MineSite, CreateMiningTripInput, FleetLead } from '@/types/fleet';
import { toLocalDateTimeInput } from '@/lib/datetime';
import { useMine } from '@/context/MineContext';
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
  Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LinkedField } from '@/components/ui/LinkedField';
import { AddVehicleModal } from '@/components/vehicles/AddVehicleModal';
import { AddDriverModal } from '@/components/drivers/AddDriverModal';
import { AddMineSiteModal } from '@/components/mine-sites/AddMineSiteModal';
import { VehicleDrawer } from '@/components/vehicles/VehicleDrawer';
import { DriverDrawer } from '@/components/drivers/DriverDrawer';
import { MineSiteDrawer } from '@/components/mine-sites/MineSiteDrawer';

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
  const { currentMine, allowedMines, isSingleMine, isAllMines, isUnassigned, activeMineLabel } = useMine();

  const [loadingOptions, setLoadingOptions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Contextual modals and view drawers
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showAddMineSite, setShowAddMineSite] = useState(false);
  const [viewVehicleId, setViewVehicleId] = useState<string | null>(null);
  const [viewDriverId, setViewDriverId] = useState<string | null>(null);
  const [viewMineSiteId, setViewMineSiteId] = useState<string | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [mineSites, setMineSites] = useState<MineSite[]>([]);
  const [materials, setMaterials] = useState<string[]>([]);
  const [leads, setLeads] = useState<FleetLead[]>([]);

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
  const [shift, setShift] = useState<'Shift A' | 'Shift B' | 'Shift C' | 'Day' | 'Night' | 'General'>('Shift A');
  const [tripEntryMode, setTripEntryMode] = useState<'supervisor' | 'reconcile'>('supervisor');
  const [selectedLead, setSelectedLead] = useState<string>('');
  const [leadKm, setLeadKm] = useState<number | string | ''>('');
  const [leadRate, setLeadRate] = useState<number | ''>('');
  const [tripCount, setTripCount] = useState<number>(1);
  const [averageTonnage, setAverageTonnage] = useState<number | ''>('');

  // Lock status for single-mine / restricted users
  const isMineLocked = isSingleMine || (!isAllMines && allowedMines.length === 1);

  const fetchOptions = useCallback(
    async (
      targetSiteParam?: string,
      selectCreated?: { type: 'vehicle' | 'driver' | 'mineSite'; id: string }
    ) => {
      try {
        setLoadingOptions(true);
        const params = new URLSearchParams();
        const effectiveSite =
          targetSiteParam !== undefined
            ? targetSiteParam
            : (currentMine !== 'ALL' && currentMine !== 'UNASSIGNED' ? currentMine : '');

        if (effectiveSite && effectiveSite !== 'ALL' && effectiveSite !== 'UNASSIGNED') {
          params.set('mine_site', effectiveSite);
        }

        const res = await fetch(`/api/trips/options?${params.toString()}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        if (data.success && data.data) {
          setVehicles(data.data.vehicles || []);
          setDrivers(data.data.drivers || []);
          setMineSites(data.data.mineSites || []);
          setMaterials(data.data.materials || []);
          setLeads(data.data.leads || []);

          if (selectCreated) {
            if (selectCreated.type === 'vehicle') {
              setVehicle(selectCreated.id);
              const foundV = (data.data.vehicles || []).find((v: any) => v.id === selectCreated.id);
              if (foundV?.lastOdometer !== undefined) setOpeningOdometer(foundV.lastOdometer);
              if (foundV?.assignedDriverId) setDriver(foundV.assignedDriverId);
            } else if (selectCreated.type === 'driver') {
              setDriver(selectCreated.id);
            } else if (selectCreated.type === 'mineSite') {
              setMineSite(selectCreated.id);
              const foundS = (data.data.mineSites || []).find((s: any) => s.id === selectCreated.id);
              if (foundS?.mineralType) setMaterialType(foundS.mineralType);
              if (foundS?.ratePerTon) setRatePerTon(foundS.ratePerTon);
              if (foundS?.location) setDestination(foundS.location);
            }
          } else if (data.data.materials?.length > 0 && !materialType) {
            setMaterialType(data.data.materials[0]);
          }
        }
      } catch (err: any) {
        setError(err.message || 'Failed to fetch form options from backend.');
      } finally {
        setLoadingOptions(false);
      }
    },
    [currentMine, materialType]
  );

  // Initialize form and fetch options on modal open
  useEffect(() => {
    if (!isOpen) {
      resetForm();
      return;
    }

    setDispatchDateTime(toLocalDateTimeInput());
    setError(null);

    const initialSite =
      currentMine !== 'ALL' && currentMine !== 'UNASSIGNED'
        ? currentMine
        : (!isAllMines && allowedMines.length === 1 ? allowedMines[0] : '');

    setMineSite(initialSite);
    fetchOptions(initialSite);
  }, [isOpen, currentMine, isAllMines, allowedMines, fetchOptions]);

  const resetForm = () => {
    const defaultSite =
      currentMine !== 'ALL' && currentMine !== 'UNASSIGNED'
        ? currentMine
        : (!isAllMines && allowedMines.length === 1 ? allowedMines[0] : '');

    setVehicle('');
    setDriver('');
    setMineSite(defaultSite);
    setDestination('');
    setMaterialType('');
    setChallanNumber('');
    setRatePerTon('');
    setOpeningOdometer('');
    setDispatchDateTime('');
    setShift('Shift A');
    setTripEntryMode('supervisor');
    setSelectedLead('');
    setLeadKm('');
    setLeadRate('');
    setTripCount(1);
    setAverageTonnage('');
    setError(null);
  };

  // Auto-fill defaults when vehicle changes
  const handleVehicleChange = (vId: string) => {
    setVehicle(vId);
    const selectedVeh = vehicles.find((v) => v.id === vId || v.licensePlate === vId);
    if (selectedVeh) {
      setOpeningOdometer(selectedVeh.lastOdometer || 0);
      if (selectedVeh.payloadCapacityTons && averageTonnage === '') {
        setAverageTonnage(selectedVeh.payloadCapacityTons);
      }
      if (selectedVeh.assignedDriverId) {
        const assigned = drivers.find((d) => d.id === selectedVeh.assignedDriverId);
        if (assigned) {
          setDriver(assigned.id);
        }
      }
    }
  };

  // Auto-fill defaults when lead changes
  const handleLeadChange = (leadId: string) => {
    setSelectedLead(leadId);
    if (!leadId) {
      setLeadKm('');
      setLeadRate('');
      return;
    }
    const foundLead = leads.find((l) => l.id === leadId || l.leadName === leadId);
    if (foundLead) {
      setDestination(foundLead.leadName);
      setLeadKm(foundLead.leadKm);
      setLeadRate(foundLead.leadRate);
      setRatePerTon(foundLead.leadRate);
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
    // Re-fetch scoped options for newly selected mine
    fetchOptions(sId);
    // Reset vehicle and driver selections if incompatible
    setVehicle('');
    setDriver('');
    setOpeningOdometer('');
    setSelectedLead('');
    setLeadKm('');
    setLeadRate('');
  };

  const selectedVehicleObj = vehicles.find((v) => v.id === vehicle || v.licensePlate === vehicle);

  // Derived calculation metrics
  const effectiveTonnage = Number(averageTonnage !== '' ? averageTonnage : (selectedVehicleObj?.payloadCapacityTons || 35));
  const calculatedQuantity = Number(tripCount || 1) * effectiveTonnage;
  const effectiveRate = Number(leadRate !== '' ? leadRate : (ratePerTon !== '' ? ratePerTon : 0));
  const calculatedAmount = calculatedQuantity * effectiveRate;

  // Filter available mine sites to only user's authorized mines if not All-Mines
  const availableMineSites = useMemo(() => {
    if (isAllMines) return mineSites;
    return mineSites.filter((s) => allowedMines.includes(s.id) || allowedMines.includes(s.siteName));
  }, [mineSites, isAllMines, allowedMines]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isUnassigned) {
      setError('You are not assigned to any operational mine site. Mine-specific transactions cannot be created.');
      return;
    }
    if (!mineSite || mineSite === 'ALL' || mineSite === 'UNASSIGNED') {
      setError('Please select an operational mine site pit.');
      return;
    }
    if (!isAllMines && !allowedMines.includes(mineSite)) {
      setError(`Access Denied: You do not have authorization to create trips for Mine Site '${mineSite}'.`);
      return;
    }
    if (!vehicle) {
      setError('Please select an active operational vehicle.');
      return;
    }

    const leadObj = leads.find((l) => l.id === selectedLead || l.leadName === selectedLead);
    const effectiveDriver =
      driver ||
      selectedVehicleObj?.assignedDriverId ||
      (drivers.length > 0 ? drivers[0].id : 'DRV-DEFAULT');
    const effectiveDestination =
      destination.trim() || leadObj?.leadName || 'Mine Delivery Siding';
    const effectiveMaterial =
      materialType || (materials.length > 0 ? materials[0] : 'Iron Ore');

    if (tripEntryMode === 'reconcile') {
      if (!effectiveDriver) {
        setError('Please select an active driver.');
        return;
      }
      if (!effectiveDestination) {
        setError('Destination location or delivery terminal is required.');
        return;
      }
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
        driver: effectiveDriver,
        mineSite,
        destination: effectiveDestination,
        materialType: effectiveMaterial,
        dispatchDateTime: formattedDt,
        ratePerTon: effectiveRate > 0 ? effectiveRate : undefined,
        openingOdometer: openingOdometer !== '' ? Number(openingOdometer) : undefined,
        challanNumber: challanNumber.trim() || undefined,
        lead: selectedLead || undefined,
        leadKm: leadKm !== '' ? leadKm : undefined,
        leadRate: leadRate !== '' ? Number(leadRate) : undefined,
        tripCount: Number(tripCount || 1),
        averageTonnage: effectiveTonnage,
        shift: shift || 'Shift A',
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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-8">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50/75 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-blue-900 text-white flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">Trip entry site supervisor</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isMineLocked ? (
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                    <Lock className="w-3 h-3 text-slate-400" /> Locked to {activeMineLabel}
                  </span>
                ) : (
                  'Site Supervisor Daily Trip Log & Reconciliation'
                )}
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

        {/* Two-Tab Entry Mode Switcher */}
        <div className="flex items-center gap-1 border-b border-slate-200 bg-slate-100/70 px-4 pt-2">
          <button
            type="button"
            onClick={() => setTripEntryMode('supervisor')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              tripEntryMode === 'supervisor'
                ? 'border-blue-900 text-blue-900 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>1. Site Supervisor Trip Entry</span>
          </button>
          <button
            type="button"
            onClick={() => setTripEntryMode('reconcile')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              tripEntryMode === 'reconcile'
                ? 'border-blue-900 text-blue-900 bg-white rounded-t-lg shadow-2xs'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>2. Reconcile Trip Entry</span>
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Unassigned Warning */}
          {isUnassigned && (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-semibold">Unassigned Mine Site</p>
                <p className="text-xs mt-0.5">
                  You are not currently assigned to any operational mine site. Trip creation is restricted until mine permissions are allocated.
                </p>
              </div>
            </div>
          )}

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
          ) : tripEntryMode === 'supervisor' ? (
            /* ======================================================== */
            /* MODE 1: SITE SUPERVISOR TRIP ENTRY                      */
            /* Fields: Date, Shift, Vehicle, Lead/Route, Trip count    */
            /* ======================================================== */
            <>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs flex items-center justify-between">
                <span>Fast pit-head dispatch entry for site supervisor.</span>
                <button
                  type="button"
                  onClick={() => setTripEntryMode('reconcile')}
                  className="font-bold underline text-blue-900 hover:text-blue-700"
                >
                  View Reconciliation & Value →
                </button>
              </div>

              {/* Row: Date & Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Trip Date & Time <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    value={dispatchDateTime}
                    onChange={(e) => setDispatchDateTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Operating Shift <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={shift}
                    onChange={(e) => setShift(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900 font-medium"
                  >
                    <option value="Shift A">Shift A (06:00 - 14:00)</option>
                    <option value="Shift B">Shift B (14:00 - 22:00)</option>
                    <option value="Shift C">Shift C (22:00 - 06:00)</option>
                    <option value="Day">Day Shift</option>
                    <option value="Night">Night Shift</option>
                    <option value="General">General Shift</option>
                  </select>
                </div>
              </div>

              {/* Row: Vehicle & Lead / Route */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <LinkedField
                  label="Vehicle No"
                  required
                  value={vehicle}
                  onChange={handleVehicleChange}
                  options={vehicles.map((v) => ({
                    id: v.id,
                    label: v.licensePlate,
                    subtext: `${(v as any).make || ''} ${(v as any).model || ''} • ${v.payloadCapacityTons}T`,
                  }))}
                  placeholder="-- Select Vehicle --"
                  entityName="Vehicle"
                  icon={Truck}
                  onCreateNew={() => setShowAddVehicle(true)}
                  onViewRecord={(id) => setViewVehicleId(id)}
                  helperText={
                    selectedVehicleObj
                      ? `Payload: ${selectedVehicleObj.payloadCapacityTons}T • Last Odo: ${selectedVehicleObj.lastOdometer} km`
                      : undefined
                  }
                />

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Lead / Route <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={selectedLead}
                    onChange={(e) => handleLeadChange(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900 font-medium"
                  >
                    <option value="">-- Choose Lead / Route --</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.leadName} ({l.leadKm} km • ₹{l.leadRate}/T)
                      </option>
                    ))}
                  </select>
                  {leadKm !== '' && (
                    <span className="text-[11px] text-slate-500 font-medium mt-1 block">
                      Distance: {leadKm} km • Agreed Rate: ₹{leadRate}/T
                    </span>
                  )}
                </div>
              </div>

              {/* Row: Trip Count & Origin Mine */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Trip Count <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={tripCount}
                    onChange={(e) => setTripCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900 font-mono font-bold"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Number of round trips completed in this shift
                  </span>
                </div>

                <LinkedField
                  label="Mine Site / Pit"
                  required
                  disabled={isMineLocked}
                  value={mineSite}
                  onChange={handleMineSiteChange}
                  options={availableMineSites.map((s) => ({
                    id: s.id,
                    label: s.siteName,
                    subtext: s.mineralType,
                  }))}
                  placeholder="-- Origin Pit --"
                  entityName="Mine Site"
                  icon={MapPin}
                  onCreateNew={() => setShowAddMineSite(true)}
                  onViewRecord={(id) => setViewMineSiteId(id)}
                  hint={isMineLocked ? 'Locked to assigned mine' : undefined}
                />
              </div>

              {/* Quick Summary Strip */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                <span className="text-slate-600">
                  Estimated Quantity: <strong className="text-slate-900">{calculatedQuantity.toFixed(2)} Tons</strong> ({tripCount} trips × {effectiveTonnage}T)
                </span>
                <span className="text-slate-600">
                  Est. Value: <strong className="text-emerald-700">₹{calculatedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong>
                </span>
              </div>
            </>
          ) : (
            /* ======================================================== */
            /* MODE 2: RECONCILE TRIP ENTRY                            */
            /* Fields: Date, Vehicle, Lead, Trip Count, Avg,           */
            /* Quantity, Amount                                        */
            /* ======================================================== */
            <>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between">
                <span>Reconciliation mode: Auto-populates supervisor trip counts with tonnage and rates.</span>
                <button
                  type="button"
                  onClick={() => setTripEntryMode('supervisor')}
                  className="font-bold underline text-emerald-900 hover:text-emerald-700"
                >
                  ← Back to Supervisor Entry
                </button>
              </div>

              {/* Auto-shown Supervisor Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Date & Shift
                  </label>
                  <input
                    type="datetime-local"
                    value={dispatchDateTime}
                    onChange={(e) => setDispatchDateTime(e.target.value)}
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900"
                  />
                </div>

                <LinkedField
                  label="Vehicle No"
                  required
                  value={vehicle}
                  onChange={handleVehicleChange}
                  options={vehicles.map((v) => ({
                    id: v.id,
                    label: v.licensePlate,
                    subtext: `${v.payloadCapacityTons}T`,
                  }))}
                  placeholder="-- Vehicle --"
                  entityName="Vehicle"
                  icon={Truck}
                  onCreateNew={() => setShowAddVehicle(true)}
                  onViewRecord={(id) => setViewVehicleId(id)}
                />

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Lead / Route
                  </label>
                  <select
                    value={selectedLead}
                    onChange={(e) => handleLeadChange(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900 font-medium"
                  >
                    <option value="">-- Choose Lead --</option>
                    {leads.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.leadName} ({l.leadKm} km)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Reconcile Metrics: Trip Count, Avg, Quantity, Rate, Amount */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Trip Count <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={tripCount}
                    onChange={(e) => setTripCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    required
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Avg Payload (Tons)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={averageTonnage}
                    onChange={(e) => setAverageTonnage(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={selectedVehicleObj ? `${selectedVehicleObj.payloadCapacityTons}` : '35.00'}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Quantity (Tons)
                  </label>
                  <div className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-300 rounded-lg text-blue-900 font-mono font-bold">
                    {calculatedQuantity.toFixed(2)} T
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Rate / Ton (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="120"
                    value={leadRate !== '' ? leadRate : ratePerTon}
                    onChange={(e) => {
                      const val = e.target.value === '' ? '' : Number(e.target.value);
                      setRatePerTon(val);
                      if (selectedLead) setLeadRate(val);
                    }}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900 font-mono"
                  />
                </div>
              </div>

              {/* Haulage Quantity & Value Calculation Summary Card */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex flex-col">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Reconciled Mineral Quantity
                  </span>
                  <span className="text-sm font-semibold text-slate-900 mt-0.5">
                    {tripCount || 1} Trip(s) × {effectiveTonnage} Tons = <span className="text-blue-900 font-bold">{calculatedQuantity.toFixed(2)} Tons</span>
                  </span>
                </div>
                <div className="flex flex-col sm:items-end">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Calculated Reconciled Amount
                  </span>
                  <span className="text-base font-bold text-emerald-700 mt-0.5">
                    ₹{calculatedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Row: Driver & Challan Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                <LinkedField
                  label="Assign Driver"
                  value={driver}
                  onChange={setDriver}
                  options={drivers.map((d) => ({
                    id: d.id,
                    label: d.fullName,
                    subtext: d.licenseNumber ? `Lic: ${d.licenseNumber}` : 'Operator',
                  }))}
                  placeholder="-- Choose Driver --"
                  entityName="Driver"
                  icon={User}
                  onCreateNew={() => setShowAddDriver(true)}
                  onViewRecord={(id) => setViewDriverId(id)}
                />

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Challan / Transit Pass #
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CH-2026-908"
                    value={challanNumber}
                    onChange={(e) => setChallanNumber(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900"
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
              disabled={loadingOptions || submitting || isUnassigned}
              data-testid="btn-submit-trip"
            >
              {tripEntryMode === 'supervisor' ? 'Save Supervisor Trip Entry' : 'Confirm & Reconcile Trip Entry'}
            </Button>
          </div>
        </form>
      </div>

      {/* Contextual Linked Modals & Drawers */}
      <AddVehicleModal
        isOpen={showAddVehicle}
        onClose={() => setShowAddVehicle(false)}
        onSuccess={() => {
          fetchOptions();
          setShowAddVehicle(false);
        }}
      />

      <AddDriverModal
        isOpen={showAddDriver}
        onClose={() => setShowAddDriver(false)}
        onSuccess={(newDriver) => {
          fetchOptions(mineSite, newDriver ? { type: 'driver', id: newDriver.id } : undefined);
          setShowAddDriver(false);
        }}
      />

      <AddMineSiteModal
        isOpen={showAddMineSite}
        onClose={() => setShowAddMineSite(false)}
        onSuccess={(newSite) => {
          const siteId = newSite ? newSite.id : mineSite;
          if (newSite) setMineSite(newSite.id);
          fetchOptions(siteId, newSite ? { type: 'mineSite', id: newSite.id } : undefined);
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

