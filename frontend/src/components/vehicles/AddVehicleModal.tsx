'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CreateVehicleInput, Driver, VehicleStatus, FleetVehicleType } from '@/types/fleet';
import { useMine } from '@/context/MineContext';
import { X, Truck, Loader2 } from 'lucide-react';
import { LinkedField } from '@/components/ui/LinkedField';
import { AddDriverModal } from '@/components/drivers/AddDriverModal';
import { DriverDrawer } from '@/components/drivers/DriverDrawer';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddVehicleModal({ isOpen, onClose, onSuccess }: AddVehicleModalProps) {
  const { currentMine, allowedMines, isAllMines, isSingleMine, mineOptions, activeMineLabel } = useMine();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicleTypes, setVehicleTypes] = useState<FleetVehicleType[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Contextual Sub-Modals and Drawers
  const [showAddDriverModal, setShowAddDriverModal] = useState(false);
  const [viewDriverId, setViewDriverId] = useState<string | null>(null);

  const initialFormState: CreateVehicleInput = {
    licensePlate: '',
    make: 'BharatBenz',
    model: '3528CM',
    status: 'Active',
    vehicleType: 'Hyva',
    customTransportType: 'Transport',
    ownerName: '',
    chassisNumber: '',
    engineNumber: '',
    registrationDate: '',
    assignedDriverId: '',
    customMineSite: currentMine !== 'ALL' ? currentMine : (mineOptions[0]?.value || ''),
    payloadCapacityTons: 35,
    lastOdometer: 10000,
    fuelType: 'Diesel',
    insuranceExpiryDate: '',
    fitnessExpiryDate: '',
    pucExpiryDate: '',
    roadTaxExpiryDate: '',
    permitExpiryDate: '',
  };

  const [formData, setFormData] = useState<CreateVehicleInput>(initialFormState);

  const loadDrivers = useCallback(async (selectCreatedId?: string) => {
    try {
      const res = await fetch('/api/drivers');
      const data = await res.json();
      if (data.success && data.data) {
        const activeDrivers = data.data.filter((d: Driver) => d.status === 'Active');
        setDrivers(activeDrivers);
        if (selectCreatedId) {
          setFormData((prev) => ({ ...prev, assignedDriverId: selectCreatedId }));
        }
      }
    } catch (err) {
      console.error('Driver fetch error:', err);
    }
  }, []);

  const loadVehicleTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/vehicle-types');
      const data = await res.json();
      if (data.success && data.data) {
        setVehicleTypes(data.data);
      }
    } catch (err) {
      console.error('Vehicle types fetch error:', err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      loadDrivers();
      loadVehicleTypes();
    }
  }, [isOpen, loadDrivers, loadVehicleTypes]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.licensePlate.trim()) {
      setFormError('Please enter a valid Registration Number / License Plate.');
      return;
    }
    if (!formData.make.trim()) {
      setFormError('Please enter the vehicle manufacturer / make.');
      return;
    }
    if (!formData.model.trim()) {
      setFormError('Please enter the vehicle model.');
      return;
    }
    if (!formData.customMineSite?.trim()) {
      setFormError('Please select an operational mine site.');
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to register vehicle.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Add vehicle error:', err);
      setFormError(err.message || 'Error communicating with fleet server.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        role="dialog"
        aria-modal="true"
        data-testid="modal-add-vehicle"
      >
        <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
          {/* Modal Header */}
          <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-900 text-white flex items-center justify-center shadow-sm">
                <Truck className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Register Transport Asset</h2>
                <p className="text-xs text-slate-500 font-medium">
                  Add a new commercial fleet truck or heavy equipment
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              data-testid="btn-close-modal"
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Form Body */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto flex-1">
            {formError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
                {formError}
              </div>
            )}

            {/* Section 1: Identification & Model */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                1. Asset Identification & Specification
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Registration Number / Plate <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    data-testid="input-plate"
                    placeholder="e.g. KA-19-MG-8805"
                    value={formData.licensePlate}
                    onChange={(e) => setFormData({ ...formData, licensePlate: e.target.value.toUpperCase() })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-mono text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Vehicle Type <span className="text-rose-600">*</span>
                  </label>
                  <select
                    value={formData.vehicleType || 'Hyva'}
                    onChange={(e) => {
                      const selectedType = e.target.value;
                      const foundType = vehicleTypes.find((vt) => vt.vehicleTypeName === selectedType);
                      setFormData({
                        ...formData,
                        vehicleType: selectedType,
                        payloadCapacityTons: foundType?.defaultPayloadCapacityTons || formData.payloadCapacityTons,
                      });
                    }}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                  >
                    {vehicleTypes.map((vt) => (
                      <option key={vt.id} value={vt.vehicleTypeName}>
                        {vt.vehicleTypeName} ({vt.category} • {vt.defaultPayloadCapacityTons}T)
                      </option>
                    ))}
                    {vehicleTypes.length === 0 && (
                      <>
                        <option value="Hyva">Hyva (Heavy Haulage • 35T)</option>
                        <option value="Loader">Loader (Earthmoving • 25T)</option>
                        <option value="Pickup">Pickup (Light Commercial • 2.5T)</option>
                        <option value="Bolero">Bolero (Utility • 1.5T)</option>
                        <option value="Tanker">Tanker (Tanker • 20T)</option>
                        <option value="Innova">Innova (Passenger • 1T)</option>
                        <option value="Other">Other</option>
                      </>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Operational Status <span className="text-rose-600">*</span>
                  </label>
                  <select
                    data-testid="select-status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as VehicleStatus })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="Active">Active (Ready for Dispatch)</option>
                    <option value="On Trip">On Trip (In Transit)</option>
                    <option value="Under Maintenance">Under Maintenance (Routine Service)</option>
                    <option value="Breakdown">Breakdown (Workshop Repack)</option>
                    <option value="Out of Service">Out of Service (Standby)</option>
                    <option value="Withdrawn">Withdrawn (Decommissioned)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Manufacturer / Make <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    data-testid="input-make"
                    placeholder="e.g. BharatBenz, Tata, Volvo"
                    value={formData.make}
                    onChange={(e) => setFormData({ ...formData, make: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Vehicle Model <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    data-testid="input-model"
                    placeholder="e.g. 3528CM Heavy Tipper"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Operational Mine Site <span className="text-rose-600">*</span>
                  </label>
                  {isSingleMine ? (
                    <div className="w-full rounded-lg border border-slate-200 bg-slate-100 px-3.5 py-2 text-sm font-semibold text-slate-800">
                      {activeMineLabel}
                    </div>
                  ) : (
                    <select
                      data-testid="select-mine-site"
                      value={formData.customMineSite || ''}
                      onChange={(e) => setFormData({ ...formData, customMineSite: e.target.value })}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                      required
                    >
                      <option value="">Select Stationed Mine...</option>
                      {mineOptions
                        .filter((opt) => isAllMines || allowedMines.includes(opt.value))
                        .map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                    </select>
                  )}
                </div>
              </div>
            </div>

            {/* Section 2: Vehicle Type & Fuel */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                2. Operations & Vehicle Classification
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Vehicle Type <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.customTransportType || 'Transport'}
                    onChange={(e) => setFormData({ ...formData, customTransportType: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="Transport">Transport</option>
                    <option value="Non Transport">Non Transport</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Fuel Type
                  </label>
                  <select
                    value={formData.fuelType}
                    onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  >
                    <option value="Diesel">Diesel</option>
                    <option value="Petrol">Petrol</option>
                    <option value="CNG">CNG</option>
                    <option value="Electric">Electric</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Payload Capacity (Metric Tons)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={formData.payloadCapacityTons}
                    onChange={(e) => setFormData({ ...formData, payloadCapacityTons: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Current Odometer Reading (KM)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.lastOdometer}
                    onChange={(e) => setFormData({ ...formData, lastOdometer: Number(e.target.value) })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-mono text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Section 2.5: Ownership & Engine Identifiers */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                3. Ownership & Engine Identifiers
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Owner Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Uptoware Mining Logistics / Fleet Owner"
                    value={formData.ownerName || ''}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Registration Date
                  </label>
                  <input
                    type="date"
                    value={formData.registrationDate || ''}
                    onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Chassis Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. MAT4837190ABCD881"
                    value={formData.chassisNumber || ''}
                    onChange={(e) => setFormData({ ...formData, chassisNumber: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-mono uppercase text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Engine Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 4D34-ENG-992817"
                    value={formData.engineNumber || ''}
                    onChange={(e) => setFormData({ ...formData, engineNumber: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-mono uppercase text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>

            {/* Section 4: Statutory Document Expiry Dates */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                4. Statutory Document Expiry Milestones
              </h3>
              <p className="text-[11px] text-slate-500 mb-3">
                Automated notifications alert operations at 30, 15, and 7 days prior to expiry
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Commercial Insurance Expiry
                  </label>
                  <input
                    type="date"
                    data-testid="input-insurance-date"
                    value={formData.insuranceExpiryDate || ''}
                    onChange={(e) => setFormData({ ...formData, insuranceExpiryDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Fitness Certificate Expiry
                  </label>
                  <input
                    type="date"
                    data-testid="input-fitness-date"
                    value={formData.fitnessExpiryDate || ''}
                    onChange={(e) => setFormData({ ...formData, fitnessExpiryDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Pollution Under Control (PUC) Expiry
                  </label>
                  <input
                    type="date"
                    data-testid="input-puc-date"
                    value={formData.pucExpiryDate || ''}
                    onChange={(e) => setFormData({ ...formData, pucExpiryDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Road Tax Expiry
                  </label>
                  <input
                    type="date"
                    data-testid="input-tax-date"
                    value={formData.roadTaxExpiryDate || ''}
                    onChange={(e) => setFormData({ ...formData, roadTaxExpiryDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                    Mining & Commercial Goods Permit Expiry
                  </label>
                  <input
                    type="date"
                    data-testid="input-permit-date"
                    value={formData.permitExpiryDate || ''}
                    onChange={(e) => setFormData({ ...formData, permitExpiryDate: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                  />
                </div>
              </div>
            </div>
          </form>

          {/* Modal Action Buttons Footer */}
          <div className="p-6 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-3 flex-shrink-0">
            <button
              type="button"
              data-testid="btn-cancel-modal"
              onClick={onClose}
              disabled={isSubmitting}
              className="border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium px-4 py-2 rounded-lg transition-colors text-sm disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="button"
              data-testid="btn-submit-vehicle"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-medium px-5 py-2 rounded-lg shadow-sm transition-colors text-sm disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering Vehicle...</span>
                </>
              ) : (
                <span>Register Vehicle</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Contextual Sub-Modals and Drawers */}
      <AddDriverModal
        isOpen={showAddDriverModal}
        onClose={() => setShowAddDriverModal(false)}
        onSuccess={() => {
          setShowAddDriverModal(false);
          loadDrivers();
        }}
      />

      <DriverDrawer
        driverId={viewDriverId}
        onClose={() => setViewDriverId(null)}
        onEditDriver={() => {}}
        canManage={false}
      />
    </>
  );
}
