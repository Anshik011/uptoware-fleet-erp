'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Vehicle, Driver, MineSite, CreateMiningTripInput, FleetLead } from '@/types/fleet';
import { toLocalDateString, toLocalDateTimeInput } from '@/lib/datetime';
import { formatVehicleDisplay } from '@/lib/displayFormatters';
import { useMine } from '@/context/MineContext';
import { useAuth } from '@/context/AuthContext';
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
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  Plus,
  Check,
  Search,
  RotateCcw,
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
  const { user } = useAuth();

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

  // Reconcile supervisor state & trips list
  const [supervisorTrips, setSupervisorTrips] = useState<any[]>([]);
  const [loadingSupervisorTrips, setLoadingSupervisorTrips] = useState(false);
  const [selectedTripToReconcile, setSelectedTripToReconcile] = useState<any | null>(null);
  const [isManualReconcileEntry, setIsManualReconcileEntry] = useState(false);

  // Tab 1 (Site Supervisor Today-only My vs Others) & Tab 2 (Reconcile Filters)
  const [supervisorEntryScope, setSupervisorEntryScope] = useState<'mine' | 'others'>('mine');
  const [reconcileStatusFilter, setReconcileStatusFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED'>('ALL');
  const [reconcileDateFilter, setReconcileDateFilter] = useState<string>(() => toLocalDateString());
  const [reconcileVehicleFilter, setReconcileVehicleFilter] = useState<string>('ALL');
  const [reconcileShiftFilter, setReconcileShiftFilter] = useState<string>('ALL');
  const [reconcileSearch, setReconcileSearch] = useState<string>('');
  const [reconcileActionSuccess, setReconcileActionSuccess] = useState<string | null>(null);

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
        } else {
          setDriver(selectedVeh.assignedDriverId);
        }
      } else {
        setDriver('');
      }
    } else {
      setDriver('');
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

  // Fetch trips entered by supervisor for reconciliation
  const fetchSupervisorTrips = useCallback(async () => {
    try {
      setLoadingSupervisorTrips(true);
      const res = await fetch('/api/trips?status=ALL');
      const json = await res.json();
      if (res.ok && json.success) {
        setSupervisorTrips(json.data || []);
      }
    } catch (e) {
      console.error('Failed to fetch supervisor trips for reconciliation:', e);
    } finally {
      setLoadingSupervisorTrips(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && tripEntryMode === 'reconcile') {
      fetchSupervisorTrips();
    }
  }, [isOpen, tripEntryMode, fetchSupervisorTrips]);

  const handleSelectTripForReconciliation = (t: any) => {
    setSelectedTripToReconcile(t);
    setIsManualReconcileEntry(false);
    setVehicle(t.vehicle || '');
    setDriver(t.driver || '');
    setMineSite(t.mineSite || '');
    setDestination(t.destination || '');
    setShift(t.shift || 'Shift A');
    setDispatchDateTime(t.dispatchDateTime ? t.dispatchDateTime.slice(0, 16) : toLocalDateTimeInput());
    setSelectedLead(t.lead || '');
    setLeadKm(t.leadKm || '');
    
    // Resolve lead rate from Lead master if not already populated on trip
    const matchedLead = leads.find((l) => l.id === t.lead || l.leadName === t.lead || l.leadName === t.destination);
    const resolvedRate = t.leadRate || matchedLead?.leadRate || t.ratePerTon || '';
    setLeadRate(resolvedRate);
    setRatePerTon(resolvedRate);

    setTripCount(t.tripCount || 1);
    setAverageTonnage(
      t.averageTonnage
        ? Number(t.averageTonnage)
        : t.netWeightTons && t.tripCount
        ? Number((t.netWeightTons / t.tripCount).toFixed(2))
        : ''
    );
    setChallanNumber(t.challanNumber || '');
    setError(null);
    setReconcileActionSuccess(null);
  };

  const handleReconcileSubmit = async (finalize: boolean) => {
    if (!selectedTripToReconcile) return;
    if (averageTonnage === '' || Number(averageTonnage) <= 0) {
      setError('Please enter a valid average payload / tonnage (e.g. 35.00 Tons) to reconcile this trip.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${encodeURIComponent(selectedTripToReconcile.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripCount: Number(tripCount || 1),
          averageTonnage: Number(averageTonnage),
          lead: selectedLead || undefined,
          leadKm: leadKm !== '' ? leadKm : undefined,
          leadRate: leadRate !== '' ? Number(leadRate) : undefined,
          ratePerTon: effectiveRate > 0 ? effectiveRate : undefined,
          shift: shift || undefined,
          vehicle: vehicle || undefined,
          finalize,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reconcile trip');

      setReconcileActionSuccess(
        finalize
          ? `Trip ${selectedTripToReconcile.id} successfully finalized & reconciled!`
          : `Trip ${selectedTripToReconcile.id} draft changes saved.`
      );
      fetchSupervisorTrips();
      onSuccess(data.data);
      setTimeout(() => {
        setSelectedTripToReconcile(null);
        setReconcileActionSuccess(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to update/reconcile trip.');
    } finally {
      setSubmitting(false);
    }
  };

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
      (driver && driver.trim()) ||
      selectedVehicleObj?.assignedDriverId ||
      undefined;

    if (!effectiveDriver) {
      setError('Driver is mandatory: A commercial haulage vehicle cannot operate or be dispatched on a trip without an assigned driver. Please select an active driver from the roster or register a new one.');
      return;
    }
    const effectiveDestination =
      destination.trim() || leadObj?.leadName || 'Mine Delivery Siding';
    const effectiveMaterial =
      materialType || (materials.length > 0 ? materials[0] : 'Coal');

    if (tripEntryMode === 'reconcile') {
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
        averageTonnage: tripEntryMode === 'reconcile' ? effectiveTonnage : undefined,
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
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden my-4 sm:my-8">
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

              {/* Row 2: Vehicle & Driver */}
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

                <LinkedField
                  label="Driver / Operator"
                  required
                  value={driver}
                  onChange={(dId) => setDriver(dId)}
                  options={drivers.map((d) => ({
                    id: d.id,
                    label: d.fullName,
                    subtext: d.licenseNumber ? `Lic: ${d.licenseNumber}` : 'Active Fleet Driver',
                  }))}
                  placeholder="-- Select Driver --"
                  entityName="Driver"
                  icon={User}
                  onCreateNew={() => setShowAddDriver(true)}
                  onViewRecord={(id) => setViewDriverId(id)}
                  helperText={
                    driver
                      ? undefined
                      : selectedVehicleObj && !selectedVehicleObj.assignedDriverId
                      ? 'No default driver allocated to this vehicle. Please choose a driver.'
                      : undefined
                  }
                />
              </div>

              {/* Row 3: Lead / Route & Origin Mine */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
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

              {/* Row 4: Trip Count */}
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
              </div>

              {/* Today's Site Supervisor Entries (Strictly Today Only — My Entries vs Others' Entries) */}
              {(() => {
                const todayIso = toLocalDateString();
                const todaysTrips = supervisorTrips.filter((t) => {
                  const d = t.dispatchDateTime
                    ? (t.dispatchDateTime.includes('T') ? t.dispatchDateTime.split('T')[0] : t.dispatchDateTime.split(' ')[0])
                    : '';
                  return d === todayIso;
                });
                const currentUserEmail = (user?.email || '').toLowerCase().trim();
                const currentUserName = (user?.name || '').toLowerCase().trim();

                const isMyEntry = (t: any) => {
                  const owner = (t.owner || '').toLowerCase().trim();
                  const confirmedBy = (t.confirmedBy || '').toLowerCase().trim();
                  if (!owner && !confirmedBy) return true;
                  return (
                    (currentUserEmail && (owner === currentUserEmail || confirmedBy === currentUserEmail)) ||
                    (currentUserName && (owner === currentUserName || confirmedBy === currentUserName))
                  );
                };

                const myTodaysTrips = todaysTrips.filter(isMyEntry);
                const otherTodaysTrips = todaysTrips.filter((t) => !isMyEntry(t));
                const displayedTodaysTrips =
                  supervisorEntryScope === 'mine' ? myTodaysTrips : otherTodaysTrips;

                return (
                  <div className="pt-3 border-t border-slate-200 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Today&apos;s Dispatch Log ({todayIso.split('-').reverse().join('.')})
                      </span>
                      <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => setSupervisorEntryScope('mine')}
                          className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                            supervisorEntryScope === 'mine'
                              ? 'bg-blue-900 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          My Entries ({myTodaysTrips.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSupervisorEntryScope('others')}
                          className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                            supervisorEntryScope === 'others'
                              ? 'bg-blue-900 text-white'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Others&apos; Entries ({otherTodaysTrips.length})
                        </button>
                      </div>
                    </div>

                    {displayedTodaysTrips.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-lg">
                        {supervisorEntryScope === 'mine'
                          ? 'No entries logged by you today.'
                          : 'No entries logged by other supervisors today.'}
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                        {displayedTodaysTrips.map((t) => (
                          <div
                            key={t.id}
                            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs"
                          >
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono font-bold text-slate-900">{t.id}</span>
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 text-[10px] font-semibold">
                                {t.shift || 'Shift A'}
                              </span>
                              <span className="font-semibold text-slate-800">
                                {formatVehicleDisplay(t.vehicle)}
                              </span>
                              <span className="text-slate-500">
                                {t.lead || t.destination || 'Direct Route'}
                              </span>
                            </div>
                            <span className="font-bold text-blue-900 shrink-0">
                              {t.tripCount || 1} Trips
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </>
          ) : (
            /* ======================================================== */
            /* MODE 2: RECONCILE TRIP ENTRY                            */
            /* Reconcile Supervisor: Verify Supervisor Trips, Enter     */
            /* Average, and Finalize Haulage Quantity & Value           */
            /* ======================================================== */
            <>
              {!selectedTripToReconcile && !isManualReconcileEntry ? (
                /* ---------------------------------------------------- */
                /* VIEW A: LIST OF SUPERVISOR TRIPS TO RECONCILE        */
                /* ---------------------------------------------------- */
                <div className="space-y-4">
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                      <div>
                        <span className="font-bold">Reconcile Supervisor Hub</span>
                        <p className="text-[11px] text-emerald-700 mt-0.5">
                          Verify Site Supervisor Dispatched Trips, Enter Average Tonnage, and Finalize Haulage.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={fetchSupervisorTrips}
                        className="p-1.5 text-emerald-800 hover:text-emerald-950 hover:bg-emerald-100 rounded-lg transition-colors"
                        title="Refresh Trips"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${loadingSupervisorTrips ? 'animate-spin' : ''}`} />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsManualReconcileEntry(true);
                          setSelectedTripToReconcile(null);
                        }}
                        className="px-2.5 py-1 text-xs font-semibold bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Direct Entry</span>
                      </button>
                    </div>
                  </div>

                  {reconcileActionSuccess && (
                    <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-xl text-xs flex items-center gap-2 font-medium">
                      <Check className="w-4 h-4 text-emerald-700 shrink-0" />
                      <span>{reconcileActionSuccess}</span>
                    </div>
                  )}

                  {/* Reconcile Filter Bar (All / Pending / Completed + Date, Vehicle, Shift, Search) */}
                  {(() => {
                    const todayIso = toLocalDateString();
                    const reconcileVehicles = Array.from(
                      new Set(supervisorTrips.map((t) => t.vehicle).filter(Boolean))
                    ).sort();

                    const filteredReconcileTrips = supervisorTrips.filter((t) => {
                      const isReconciled = t.workflowState === 'Approved' || t.tripStatus === 'Approved';
                      if (reconcileStatusFilter === 'PENDING' && isReconciled) return false;
                      if (reconcileStatusFilter === 'COMPLETED' && !isReconciled) return false;

                      const rawDate = t.dispatchDateTime
                        ? (t.dispatchDateTime.includes('T') ? t.dispatchDateTime.split('T')[0] : t.dispatchDateTime.split(' ')[0])
                        : '';
                      if (reconcileDateFilter && rawDate !== reconcileDateFilter) return false;
                      if (reconcileVehicleFilter !== 'ALL' && t.vehicle !== reconcileVehicleFilter) return false;
                      if (reconcileShiftFilter !== 'ALL' && (t.shift || 'Shift A') !== reconcileShiftFilter) return false;

                      if (reconcileSearch.trim()) {
                        const q = reconcileSearch.trim().toLowerCase();
                        const hay = `${t.id} ${t.vehicle} ${t.lead || ''} ${t.destination || ''} ${t.driverName || ''}`.toLowerCase();
                        if (!hay.includes(q)) return false;
                      }
                      return true;
                    });

                    const pendingCount = supervisorTrips.filter(
                      (t) => !(t.workflowState === 'Approved' || t.tripStatus === 'Approved')
                    ).length;
                    const completedCount = supervisorTrips.length - pendingCount;

                    return (
                      <>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-semibold">
                              <button
                                type="button"
                                onClick={() => setReconcileStatusFilter('ALL')}
                                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                                  reconcileStatusFilter === 'ALL'
                                    ? 'bg-blue-900 text-white'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                All ({supervisorTrips.length})
                              </button>
                              <button
                                type="button"
                                onClick={() => setReconcileStatusFilter('PENDING')}
                                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                                  reconcileStatusFilter === 'PENDING'
                                    ? 'bg-amber-600 text-white'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                Pending ({pendingCount})
                              </button>
                              <button
                                type="button"
                                onClick={() => setReconcileStatusFilter('COMPLETED')}
                                className={`px-3 py-1 rounded-md transition-colors cursor-pointer ${
                                  reconcileStatusFilter === 'COMPLETED'
                                    ? 'bg-emerald-700 text-white'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                Completed ({completedCount})
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setReconcileDateFilter(todayIso)}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                                  reconcileDateFilter === todayIso
                                    ? 'bg-blue-900 text-white border-blue-900'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                Today Only
                              </button>
                              <button
                                type="button"
                                onClick={() => setReconcileDateFilter('')}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                                  reconcileDateFilter === ''
                                    ? 'bg-blue-900 text-white border-blue-900'
                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                }`}
                              >
                                All Dates
                              </button>
                              {(reconcileStatusFilter !== 'ALL' ||
                                reconcileDateFilter !== todayIso ||
                                reconcileVehicleFilter !== 'ALL' ||
                                reconcileShiftFilter !== 'ALL' ||
                                reconcileSearch) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setReconcileStatusFilter('ALL');
                                    setReconcileDateFilter(todayIso);
                                    setReconcileVehicleFilter('ALL');
                                    setReconcileShiftFilter('ALL');
                                    setReconcileSearch('');
                                  }}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 cursor-pointer"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Reset</span>
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                              <input
                                type="text"
                                value={reconcileSearch}
                                onChange={(e) => setReconcileSearch(e.target.value)}
                                placeholder="Search ID, route..."
                                className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                              />
                            </div>
                            <input
                              type="date"
                              value={reconcileDateFilter}
                              onChange={(e) => setReconcileDateFilter(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                            />
                            <select
                              value={reconcileVehicleFilter}
                              onChange={(e) => setReconcileVehicleFilter(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                            >
                              <option value="ALL">All Vehicles</option>
                              {reconcileVehicles.map((v) => (
                                <option key={v} value={v}>
                                  {v}
                                </option>
                              ))}
                            </select>
                            <select
                              value={reconcileShiftFilter}
                              onChange={(e) => setReconcileShiftFilter(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-600"
                            >
                              <option value="ALL">All Shifts</option>
                              <option value="Shift A">Shift A</option>
                              <option value="Shift B">Shift B</option>
                              <option value="Shift C">Shift C</option>
                              <option value="Day">Day</option>
                              <option value="Night">Night</option>
                            </select>
                          </div>
                        </div>

                        {loadingSupervisorTrips ? (
                          <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-400">
                            <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
                            <span className="text-xs">Loading supervisor trip logs...</span>
                          </div>
                        ) : filteredReconcileTrips.length === 0 ? (
                          <div className="p-8 text-center border border-dashed border-slate-300 rounded-xl bg-slate-50/50">
                            <FileText className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-slate-700">
                              {supervisorTrips.length === 0
                                ? 'No trips recorded by site supervisor'
                                : 'No trips match the selected reconcile filters'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1">
                              {supervisorTrips.length === 0
                                ? 'Switch to tab 1 to log trips or click Direct Entry to record a trip with average tonnage.'
                                : 'Try clearing or adjusting the status, date, vehicle, or shift filters.'}
                            </p>
                            {supervisorTrips.length === 0 && (
                              <button
                                type="button"
                                onClick={() => setIsManualReconcileEntry(true)}
                                className="mt-4 px-3 py-1.5 text-xs font-semibold bg-blue-900 text-white rounded-lg hover:bg-blue-800"
                              >
                                Create Direct Reconciled Entry
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                            {filteredReconcileTrips.map((t) => {
                              const isReconciled = t.workflowState === 'Approved' || t.tripStatus === 'Approved';
                              const rawDate = t.dispatchDateTime
                                ? (t.dispatchDateTime.includes('T') ? t.dispatchDateTime.split('T')[0] : t.dispatchDateTime.split(' ')[0])
                                : '';
                              const dateFormatted = rawDate && rawDate.includes('-')
                                ? rawDate.split('-').reverse().join('.')
                                : (rawDate || 'Today');

                              return (
                                <div
                                  key={t.id}
                                  className="p-3.5 border border-slate-200 rounded-xl bg-white hover:border-emerald-500 hover:shadow-xs transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-mono font-bold text-xs text-slate-900">{t.id}</span>
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 font-mono">
                                        {dateFormatted}
                                      </span>
                                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                                        {t.shift || 'Shift A'}
                                      </span>
                                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-900">
                                        {formatVehicleDisplay(t.vehicle)}
                                      </span>
                                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                        isReconciled
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-amber-100 text-amber-800'
                                      }`}>
                                        {isReconciled ? 'Reconciled / Approved' : 'Pending Reconcile'}
                                      </span>
                                    </div>
                                    <div className="text-xs text-slate-600 mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1">
                                      <span>Route: <strong className="text-slate-900">{t.lead || t.destination || 'Direct Route'}</strong></span>
                                      <span>Trips: <strong className="text-blue-900 font-bold">{t.tripCount || 1}</strong></span>
                                      {isReconciled && Number(t.averageTonnage || 0) > 0 && (
                                        <>
                                          <span>Avg: <strong className="text-slate-900">{Number(t.averageTonnage).toFixed(2)} T</strong></span>
                                          <span>Qty: <strong className="text-emerald-800">{Number(t.calculatedQuantity || t.netWeightTons || 0).toFixed(2)} T</strong></span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleSelectTripForReconciliation(t)}
                                    className="shrink-0 px-3 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-2xs"
                                  >
                                    <span>{isReconciled ? 'Edit / View' : 'Reconcile & Enter Avg'}</span>
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : (
                /* ---------------------------------------------------- */
                /* VIEW B: RECONCILE / EDIT SELECTED TRIP FORM          */
                /* ---------------------------------------------------- */
                <>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTripToReconcile(null);
                          setIsManualReconcileEntry(false);
                        }}
                        className="text-emerald-800 hover:text-emerald-950 flex items-center gap-1 font-bold"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Back to Trips List
                      </button>
                      {selectedTripToReconcile && (
                        <>
                          <span className="text-slate-300">|</span>
                          <span>Reconciling: <strong className="font-mono">{selectedTripToReconcile.id}</strong></span>
                        </>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setTripEntryMode('supervisor')}
                      className="font-bold underline text-emerald-900 hover:text-emerald-700"
                    >
                      ← Supervisor Entry
                    </button>
                  </div>

                  {/* Auto-shown Supervisor Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Date & Time <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        value={dispatchDateTime}
                        onChange={(e) => setDispatchDateTime(e.target.value)}
                        required
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Shift <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={shift}
                        onChange={(e) => setShift(e.target.value as any)}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900 font-medium"
                      >
                        <option value="Shift A">Shift A (06:00 - 14:00)</option>
                        <option value="Shift B">Shift B (14:00 - 22:00)</option>
                        <option value="Shift C">Shift C (22:00 - 06:00)</option>
                      </select>
                    </div>

                    <div>
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
                    </div>
                  </div>

                  {/* Route & Metrics: Lead, Trip Count, Avg, Quantity, Rate */}
                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-3.5 sm:gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Lead / Route <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={selectedLead}
                        onChange={(e) => handleLeadChange(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-900 text-slate-900 font-medium"
                      >
                        <option value="">-- Choose Lead --</option>
                        {leads.map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.leadName} ({l.leadKm} km)
                          </option>
                        ))}
                      </select>
                    </div>

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
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Avg (Tons) <span className="text-rose-500">*</span>
                        </label>
                        {selectedVehicleObj?.payloadCapacityTons && (
                          <button
                            type="button"
                            onClick={() => setAverageTonnage(selectedVehicleObj.payloadCapacityTons)}
                            className="text-[10px] text-blue-900 font-bold hover:underline"
                          >
                            Rated ({selectedVehicleObj.payloadCapacityTons}T)
                          </button>
                        )}
                      </div>
                      <input
                        type="number"
                        min="0.1"
                        step="0.01"
                        value={averageTonnage}
                        onChange={(e) => setAverageTonnage(e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder={selectedVehicleObj ? `${selectedVehicleObj.payloadCapacityTons}` : '35.00'}
                        required
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-900 font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Quantity (T)
                      </label>
                      <div className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-300 rounded-lg text-blue-900 font-mono font-bold text-center">
                        {calculatedQuantity.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          Rate / Ton (₹) <span className="text-[10px] text-slate-500 font-normal">(from Lead Master)</span>
                        </label>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Fixed Contract</span>
                      </div>
                      <input
                        type="number"
                        readOnly
                        value={leadRate !== '' ? leadRate : ratePerTon}
                        placeholder="Contracted Rate"
                        className="w-full px-3 py-2 text-sm bg-slate-100 border border-slate-300 rounded-lg text-slate-700 font-mono font-bold cursor-not-allowed select-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Calculated Reconciled Amount
                      </label>
                      <div className="w-full px-3 py-2 text-sm bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-mono font-bold text-right flex items-center justify-between">
                        <span className="text-xs text-emerald-600 font-sans font-medium">Reconciled Amount:</span>
                        <span>₹{calculatedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Haulage Quantity & Value Calculation Summary Card */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Reconciled Mineral Quantity Formula
                      </span>
                      <span className="font-semibold text-slate-900 mt-0.5">
                        {tripCount || 1} Trip(s) × {effectiveTonnage} Tons = <span className="text-blue-900 font-bold">{calculatedQuantity.toFixed(2)} Tons</span>
                      </span>
                    </div>
                    <div className="flex flex-col sm:items-end">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Total Haulage Valuation
                      </span>
                      <span className="text-sm font-bold text-emerald-700 mt-0.5">
                        ₹{calculatedAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </>
          )}

          {/* Form Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3">
            <div>
              {tripEntryMode === 'reconcile' && selectedTripToReconcile ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTripToReconcile(null);
                    setIsManualReconcileEntry(false);
                  }}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
                >
                  ← Back to List
                </button>
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <Button type="button" onClick={onClose} variant="outline" size="md">
                Cancel
              </Button>

              {tripEntryMode === 'reconcile' && selectedTripToReconcile ? (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    size="md"
                    isLoading={submitting}
                    disabled={submitting}
                    onClick={() => handleReconcileSubmit(false)}
                  >
                    Save Draft
                  </Button>
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    isLoading={submitting}
                    disabled={submitting}
                    icon={CheckCircle2}
                    onClick={() => handleReconcileSubmit(true)}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white"
                  >
                    Finalize & Reconcile Trip
                  </Button>
                </>
              ) : (
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
              )}
            </div>
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

