'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import {
  Wrench,
  X,
  AlertCircle,
  Calendar,
  Clock,
  Gauge,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { BreakdownType, BreakdownSeverity } from '@/types/fleet';
import { toLocalDateString } from '@/lib/datetime';
import { LinkedField } from '@/components/ui/LinkedField';
import { AddVehicleModal } from '@/components/vehicles/AddVehicleModal';
import { VehicleDrawer } from '@/components/vehicles/VehicleDrawer';
import { AddDriverModal } from '@/components/drivers/AddDriverModal';
import { DriverDrawer } from '@/components/drivers/DriverDrawer';
import { AddMineSiteModal } from '@/components/mine-sites/AddMineSiteModal';
import { MineSiteDrawer } from '@/components/mine-sites/MineSiteDrawer';
import { AddSupplierModal } from '@/components/procurement/AddSupplierModal';
import { SupplierDetailDrawer } from '@/components/procurement/SupplierDetailDrawer';
import { useMine } from '@/context/MineContext';
import { formatDriverDisplay } from '@/lib/displayFormatters';

interface AddBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedVehicle?: string;
}

export function AddBreakdownModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedVehicle,
}: AddBreakdownModalProps) {
  const { currentMine, allowedMines, isSingleMine, isAllMines, isUnassigned, activeMineLabel } = useMine();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form fields
  const [vehicle, setVehicle] = useState(preselectedVehicle || '');
  const [breakdownDate, setBreakdownDate] = useState('');
  const [breakdownTime, setBreakdownTime] = useState('');
  const [breakdownType, setBreakdownType] = useState<BreakdownType>('Engine');
  const [severity, setSeverity] = useState<BreakdownSeverity>('Medium');
  const [breakdownLocation, setBreakdownLocation] = useState('');
  const [odometerReading, setOdometerReading] = useState('');
  const [driver, setDriver] = useState('');
  const [mineSite, setMineSite] = useState('');
  const [assignedWorkshop, setAssignedWorkshop] = useState('');
  const [description, setDescription] = useState('');
  const [isTestRecord, setIsTestRecord] = useState(false);

  // Options state
  const [vehicles, setVehicles] = useState<
    Array<{ id: string; licensePlate: string; status: string; lastOdometer: number; customMineSite?: string; mineSite?: string }>
  >([]);
  const [drivers, setDrivers] = useState<Array<{ id: string; fullName: string; status: string; customMineSite?: string; mineSite?: string }>>([]);
  const [mineSites, setMineSites] = useState<Array<{ id: string; siteName: string }>>([]);
  const [workshops, setWorkshops] = useState<Array<{ id: string; supplierName: string }>>([]);
  const [breakdownTypes, setBreakdownTypes] = useState<string[]>([
    'Engine',
    'Hydraulic',
    'Tyre',
    'Electrical',
    'Transmission',
    'Brake',
    'Other',
  ]);
  const [severities, setSeverities] = useState<string[]>(['Low', 'Medium', 'Critical']);

  // Lock status for single-mine / restricted users
  const isMineLocked = isSingleMine || (!isAllMines && allowedMines.length === 1);

  // Contextual Sub-Modals and Drawers
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [viewVehicleId, setViewVehicleId] = useState<string | null>(null);

  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [viewDriverId, setViewDriverId] = useState<string | null>(null);

  const [showAddMineSiteModal, setShowAddMineSiteModal] = useState(false);
  const [viewMineSiteId, setViewMineSiteId] = useState<string | null>(null);

  const [showAddWorkshopModal, setShowAddWorkshopModal] = useState(false);
  const [viewWorkshopId, setViewWorkshopId] = useState<string | null>(null);

  const loadOptions = useCallback(
    async (
      targetSiteParam?: string,
      selectCreated?: { type: 'vehicle' | 'driver' | 'mineSite' | 'workshop'; id: string }
    ) => {
      try {
        const params = new URLSearchParams();
        const effectiveSite =
          targetSiteParam !== undefined
            ? targetSiteParam
            : (currentMine !== 'ALL' && currentMine !== 'UNASSIGNED' ? currentMine : '');

        if (effectiveSite && effectiveSite !== 'ALL' && effectiveSite !== 'UNASSIGNED') {
          params.set('mine_site', effectiveSite);
        }

        const res = await fetch(`/api/breakdowns/options?${params.toString()}`);
        const json = await res.json();
        if (res.ok && json.success) {
          if (json.vehicles) setVehicles(json.vehicles);
          if (json.drivers) setDrivers(json.drivers);
          if (json.mineSites) setMineSites(json.mineSites);
          if (json.workshops) setWorkshops(json.workshops);
          if (json.breakdownTypes?.length) setBreakdownTypes(json.breakdownTypes);
          if (json.severities?.length) setSeverities(json.severities);

          if (selectCreated) {
            if (selectCreated.type === 'vehicle') setVehicle(selectCreated.id);
            else if (selectCreated.type === 'driver') setDriver(selectCreated.id);
            else if (selectCreated.type === 'mineSite') setMineSite(selectCreated.id);
            else if (selectCreated.type === 'workshop') setAssignedWorkshop(selectCreated.id);
          } else if (preselectedVehicle) {
            setVehicle(preselectedVehicle);
          }
        }
      } catch (err) {
        console.warn('Failed to load breakdown form options:', err);
      }
    },
    [preselectedVehicle, currentMine]
  );

  useEffect(() => {
    if (!isOpen) return;

    const d = new Date();
    setBreakdownDate(toLocalDateString(d));
    setBreakdownTime(
      `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`
    );

    const initialSite =
      currentMine !== 'ALL' && currentMine !== 'UNASSIGNED'
        ? currentMine
        : (!isAllMines && allowedMines.length === 1 ? allowedMines[0] : '');

    setMineSite(initialSite);
    loadOptions(initialSite);
  }, [isOpen, currentMine, isAllMines, allowedMines, loadOptions]);

  // When mine changes via dropdown
  function handleMineSiteChange(siteId: string) {
    setMineSite(siteId);
    loadOptions(siteId);
    setVehicle('');
    setDriver('');
    setOdometerReading('');
  }

  // Selected vehicle info for odometer hint
  const currentVehicleObj = vehicles.find((v) => v.id === vehicle || v.licensePlate === vehicle);

  const availableMineSites = useMemo(() => {
    if (isAllMines) return mineSites;
    return mineSites.filter((s) => allowedMines.includes(s.id) || allowedMines.includes(s.siteName));
  }, [mineSites, isAllMines, allowedMines]);

  useEffect(() => {
    if (currentVehicleObj && currentVehicleObj.lastOdometer && !odometerReading) {
      setOdometerReading(String(currentVehicleObj.lastOdometer));
    }
  }, [currentVehicleObj, odometerReading]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (isUnassigned) {
      setErrorMessage('You are not assigned to any operational mine site. Breakdown reporting is restricted.');
      return;
    }

    if (!mineSite || mineSite === 'ALL' || mineSite === 'UNASSIGNED') {
      setErrorMessage('Please select an operational mine site.');
      return;
    }

    if (!isAllMines && !allowedMines.includes(mineSite)) {
      setErrorMessage(`Access Denied: You do not have authorization to report breakdowns for Mine Site '${mineSite}'.`);
      return;
    }

    if (!vehicle) {
      setErrorMessage('Please select a vehicle.');
      return;
    }

    if (
      currentVehicleObj &&
      (currentVehicleObj as any).customMineSite &&
      (currentVehicleObj as any).customMineSite !== mineSite
    ) {
      setErrorMessage(
        `Vehicle '${currentVehicleObj.licensePlate || currentVehicleObj.id}' is stationed at '${(currentVehicleObj as any).customMineSite}', but selected incident location is '${mineSite}'.`
      );
      return;
    }

    if (!breakdownDate) {
      setErrorMessage('Breakdown date is mandatory.');
      return;
    }
    if (!breakdownLocation.trim()) {
      setErrorMessage('Breakdown location description is mandatory.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/breakdowns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle,
          breakdownDate,
          breakdownTime,
          breakdownType,
          severity,
          breakdownLocation: breakdownLocation.trim(),
          odometerReading: odometerReading ? Number(odometerReading) : undefined,
          driver: driver || undefined,
          mineSite,
          assignedWorkshop: assignedWorkshop || undefined,
          description: description.trim() || undefined,
          isTestRecord,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to report breakdown incident.');
      }

      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error reporting breakdown incident.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
        data-testid="modal-add-breakdown"
      >
        <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200">
          {/* Header */}
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-rose-700" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Report Breakdown Incident</h3>
                <p className="text-xs text-slate-500">
                  {isMineLocked ? (
                    <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                      <Lock className="w-3 h-3 text-slate-400" /> Locked to {activeMineLabel}
                    </span>
                  ) : (
                    'Log a vehicle failure, assign workshop, and initiate maintenance tracking'
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Unassigned Warning */}
            {isUnassigned && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2.5 text-xs text-amber-800">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Unassigned Mine Site</p>
                  <p className="text-xs mt-0.5">
                    You are not currently assigned to any operational mine site. Breakdown reporting is restricted until mine permissions are allocated.
                  </p>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2.5 text-xs text-rose-800">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Row 1: Vehicle & Breakdown Type */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <LinkedField
                label="Vehicle"
                required
                value={vehicle}
                onChange={setVehicle}
                options={vehicles.map((v) => ({
                  value: v.id,
                  label: `${v.licensePlate || v.id} (${v.status})`,
                }))}
                entityName="Vehicle"
                placeholder="Select breakdown vehicle..."
                onCreateNew={() => setShowAddVehicleModal(true)}
                onViewRecord={vehicle ? () => setViewVehicleId(vehicle) : undefined}
                hint="Fleet unit requiring emergency recovery or repair"
              />

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Breakdown Type <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Wrench className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <select
                    value={breakdownType}
                    onChange={(e) => setBreakdownType(e.target.value as BreakdownType)}
                    required
                    data-testid="input-breakdown-type"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  >
                    {breakdownTypes.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Row 2: Severity & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Severity <span className="text-rose-500">*</span>
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value as BreakdownSeverity)}
                  required
                  data-testid="input-breakdown-severity"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                >
                  {severities.map((s) => (
                    <option key={s} value={s}>
                      {s} Severity
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Breakdown Location <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kudremukh Haul Road KM 4"
                  value={breakdownLocation}
                  onChange={(e) => setBreakdownLocation(e.target.value)}
                  required
                  data-testid="input-breakdown-location"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>

            {/* Row 3: Date, Time & Odometer */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={breakdownDate}
                    onChange={(e) => setBreakdownDate(e.target.value)}
                    required
                    data-testid="input-breakdown-date"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Time</label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="time"
                    step="1"
                    value={breakdownTime}
                    onChange={(e) => setBreakdownTime(e.target.value)}
                    data-testid="input-breakdown-time"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Odometer (KM)
                  {currentVehicleObj?.lastOdometer ? (
                    <span className="text-[10px] text-slate-500 ml-1">
                      (Last: {currentVehicleObj.lastOdometer})
                    </span>
                  ) : null}
                </label>
                <div className="relative">
                  <Gauge className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    placeholder="e.g. 52400"
                    value={odometerReading}
                    onChange={(e) => setOdometerReading(e.target.value)}
                    data-testid="input-breakdown-odometer"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Row 4: Driver, Mine Site, Workshop LinkedFields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <LinkedField
                label="Operating Driver"
                value={driver}
                onChange={setDriver}
                options={drivers.map((d) => ({
                  value: d.id,
                  label: formatDriverDisplay(d.id, d.fullName),
                }))}
                entityName="Driver"
                placeholder="Select or register driver..."
                onCreateNew={() => setShowAddDriverModal(true)}
                onViewRecord={driver ? () => setViewDriverId(driver) : undefined}
                hint="Assigned operator during incident"
              />

              <LinkedField
                label="Associated Mine Site"
                required
                disabled={isMineLocked}
                value={mineSite}
                onChange={handleMineSiteChange}
                options={availableMineSites.map((s) => ({
                  value: s.id,
                  label: s.siteName || s.id,
                }))}
                entityName="Mine Site"
                placeholder="Select mine site..."
                onCreateNew={() => setShowAddMineSiteModal(true)}
                onViewRecord={mineSite ? () => setViewMineSiteId(mineSite) : undefined}
                hint={isMineLocked ? 'Mine site locked to user operational assignment' : 'Location or dispatch origin'}
              />

              <LinkedField
                label="Assigned Workshop / Vendor"
                value={assignedWorkshop}
                onChange={setAssignedWorkshop}
                options={workshops.map((w) => ({
                  value: w.id,
                  label: w.supplierName || w.id,
                }))}
                entityName="Supplier"
                placeholder="Select repair workshop..."
                onCreateNew={() => setShowAddWorkshopModal(true)}
                onViewRecord={assignedWorkshop ? () => setViewWorkshopId(assignedWorkshop) : undefined}
                hint="Authorized garage or internal bay"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description / Failure Symptoms
              </label>
              <textarea
                rows={2}
                placeholder="Describe observed failure, abnormal sounds, smoke, hydraulic fluid leakage..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                data-testid="input-breakdown-description"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>

            {/* Test Record Isolation Checkbox */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
              <input
                type="checkbox"
                id="breakdownIsTestRecord"
                checked={isTestRecord}
                onChange={(e) => setIsTestRecord(e.target.checked)}
                data-testid="checkbox-breakdown-test"
                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
              />
              <label htmlFor="breakdownIsTestRecord" className="text-xs text-slate-500 font-medium">
                Flag as test record (quarantined from production reports and KPI calculations)
              </label>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={isSubmitting || isUnassigned}
                data-testid="btn-submit-breakdown"
              >
                {isSubmitting ? 'Recording...' : 'Report Incident'}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Contextual Sub-Modals and Drawers */}
      <AddVehicleModal
        isOpen={showAddVehicleModal}
        onClose={() => setShowAddVehicleModal(false)}
        onSuccess={() => {
          setShowAddVehicleModal(false);
          loadOptions();
        }}
      />
      <VehicleDrawer
        vehicleId={viewVehicleId}
        onClose={() => setViewVehicleId(null)}
      />

      <AddDriverModal
        isOpen={showAddDriverModal}
        onClose={() => setShowAddDriverModal(false)}
        onSuccess={() => {
          setShowAddDriverModal(false);
          loadOptions();
        }}
      />
      <DriverDrawer
        driverId={viewDriverId}
        onClose={() => setViewDriverId(null)}
      />

      <AddMineSiteModal
        isOpen={showAddMineSiteModal}
        onClose={() => setShowAddMineSiteModal(false)}
        onSuccess={() => {
          setShowAddMineSiteModal(false);
          loadOptions();
        }}
      />
      <MineSiteDrawer
        siteId={viewMineSiteId}
        onClose={() => setViewMineSiteId(null)}
      />

      <AddSupplierModal
        isOpen={showAddWorkshopModal}
        onClose={() => setShowAddWorkshopModal(false)}
        onSuccess={() => {
          setShowAddWorkshopModal(false);
          loadOptions();
        }}
        groups={['Services', 'Parts & Consumables', 'Hardware']}
      />
      <SupplierDetailDrawer
        supplierId={viewWorkshopId}
        onClose={() => setViewWorkshopId(null)}
      />
    </>
  );
}
