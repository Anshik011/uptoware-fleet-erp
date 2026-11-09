'use client';

import React, { useState, useEffect } from 'react';
import { CreateVehicleInput, Driver, VehicleStatus } from '@/types/fleet';
import { X, Truck, Loader2 } from 'lucide-react';

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddVehicleModal({ isOpen, onClose, onSuccess }: AddVehicleModalProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const initialFormState: CreateVehicleInput = {
    licensePlate: '',
    make: 'BharatBenz',
    model: '3528CM',
    status: 'Active',
    assignedDriverId: '',
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

  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      // Fetch active drivers for dropdown
      fetch('/api/drivers')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setDrivers(data.data.filter((d: Driver) => d.status === 'Active'));
          }
        })
        .catch((err) => console.error('Driver fetch error:', err));
    }
  }, [isOpen]);

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

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/vehicles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to register vehicle in fleet database');
      }

      setFormData(initialFormState);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Vehicle registration error:', err);
      setFormError(err.message || 'Error occurred while saving vehicle');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      data-testid="add-vehicle-modal"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl my-8 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900 text-white flex items-center justify-center shadow-sm">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                Register Commercial Vehicle
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Add an operational transport unit to the Uptoware fleet directory
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="btn-close-modal-top"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form Scrollable Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
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
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Operational Status <span className="text-rose-600">*</span>
                </label>
                <select
                  data-testid="select-status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as VehicleStatus })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="Active">Active (Ready for Dispatch)</option>
                  <option value="On Trip">On Trip (In Transit)</option>
                  <option value="Under Maintenance">Under Maintenance (Routine Service)</option>
                  <option value="Breakdown">Breakdown (Workshop Repack)</option>
                  <option value="Out of Service">Out of Service (Standby)</option>
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
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Driver & Specifications */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
              2. Operations & Driver Allocation
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Assigned Driver
                </label>
                <select
                  data-testid="select-driver"
                  value={formData.assignedDriverId || ''}
                  onChange={(e) => setFormData({ ...formData, assignedDriverId: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                >
                  <option value="">-- No Driver Assigned (Available) --</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                  Fuel Type
                </label>
                <select
                  value={formData.fuelType}
                  onChange={(e) => setFormData({ ...formData, fuelType: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-mono text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Statutory Document Expiry Dates */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              3. Statutory Document Expiry Milestones
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
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
                  className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
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
            className="border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-medium px-4 py-2.5 rounded-lg transition-colors text-sm disabled:opacity-60"
          >
            Cancel
          </button>

          <button
            type="button"
            data-testid="btn-submit-vehicle"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 bg-blue-900 hover:bg-blue-800 text-white font-medium px-5 py-2.5 rounded-lg shadow-sm transition-colors text-sm disabled:opacity-60"
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
  );
}
