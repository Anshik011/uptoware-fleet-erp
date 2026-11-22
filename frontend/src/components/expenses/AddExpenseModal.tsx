'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import {
  IndianRupee,
  X,
  AlertCircle,
  Truck,
  MapPin,
  Calendar,
  Building2,
  Receipt,
  CreditCard,
  User,
  FileText,
  AlertTriangle,
  Lock,
} from 'lucide-react';
import { ExpenseCategory } from '@/types/fleet';
import { toLocalDateString } from '@/lib/datetime';
import { LinkedField } from '@/components/ui/LinkedField';
import { AddVehicleModal } from '@/components/vehicles/AddVehicleModal';
import { AddDriverModal } from '@/components/drivers/AddDriverModal';
import { AddMineSiteModal } from '@/components/mine-sites/AddMineSiteModal';
import { AddSupplierModal } from '@/components/procurement/AddSupplierModal';
import { VehicleDrawer } from '@/components/vehicles/VehicleDrawer';
import { DriverDrawer } from '@/components/drivers/DriverDrawer';
import { MineSiteDrawer } from '@/components/mine-sites/MineSiteDrawer';
import { useMine } from '@/context/MineContext';
import { formatVehicleDisplay, formatMineSiteDisplay } from '@/lib/displayFormatters';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedVehicle?: string;
  preselectedTrip?: string;
}

export function AddExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedVehicle,
  preselectedTrip,
}: AddExpenseModalProps) {
  const { currentMine, allowedMines, isSingleMine, isAllMines, isUnassigned, activeMineLabel } = useMine();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Contextual modals and view drawers
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [showAddMineSite, setShowAddMineSite] = useState(false);
  const [showAddSupplier, setShowAddSupplier] = useState(false);
  const [viewVehicleId, setViewVehicleId] = useState<string | null>(null);
  const [viewDriverId, setViewDriverId] = useState<string | null>(null);
  const [viewMineSiteId, setViewMineSiteId] = useState<string | null>(null);

  // Form fields
  const [expenseCategory, setExpenseCategory] = useState<string>('Toll and Road Charges');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState('');
  const [vehicle, setVehicle] = useState(preselectedVehicle || '');
  const [miningTrip, setMiningTrip] = useState(preselectedTrip || '');
  const [mineSite, setMineSite] = useState('');
  const [driver, setDriver] = useState('');
  const [supplier, setSupplier] = useState('');
  const [payeeName, setPayeeName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [billReference, setBillReference] = useState('');
  const [receiptAttachment, setReceiptAttachment] = useState('');
  const [description, setDescription] = useState('');
  const [isTestRecord, setIsTestRecord] = useState(false);

  // Options state
  const [categories, setCategories] = useState<string[]>([
    'Toll and Road Charges',
    'Parking',
    'Loading and Unloading',
    'Food and Accommodation',
    'Weighbridge Charges',
    'Permit and Documentation',
    'Miscellaneous Operational Expenses',
  ]);
  const [vehicles, setVehicles] = useState<Array<{ id: string; licensePlate: string; customMineSite?: string; mineSite?: string }>>([]);
  const [mineSites, setMineSites] = useState<Array<{ id: string; siteName: string }>>([]);
  const [trips, setTrips] = useState<Array<{ id: string; vehicle: string; mineSite: string }>>([]);
  const [drivers, setDrivers] = useState<Array<{ id: string; fullName: string; customMineSite?: string; mineSite?: string }>>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; supplierName: string }>>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([
    'Cash',
    'Credit Card',
    'Cheque',
    'Wire Transfer',
    'Bank Draft',
  ]);

  // Lock status for single-mine / restricted users
  const isMineLocked = isSingleMine || (!isAllMines && allowedMines.length === 1);

  const loadOptions = useCallback(
    async (
      targetSiteParam?: string,
      selectCreated?: { type: 'vehicle' | 'driver' | 'mineSite' | 'supplier'; id: string }
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

        const res = await fetch(`/api/expenses/options?${params.toString()}`);
        const json = await res.json();
        if (res.ok && json.success) {
          if (json.categories?.length) setCategories(json.categories);
          if (json.vehicles) setVehicles(json.vehicles);
          if (json.mineSites) setMineSites(json.mineSites);
          if (json.trips) setTrips(json.trips);
          if (json.drivers) setDrivers(json.drivers);
          if (json.suppliers) setSuppliers(json.suppliers);
          if (json.paymentMethods?.length) setPaymentMethods(json.paymentMethods);

          if (selectCreated) {
            if (selectCreated.type === 'vehicle') setVehicle(selectCreated.id);
            else if (selectCreated.type === 'driver') setDriver(selectCreated.id);
            else if (selectCreated.type === 'mineSite') setMineSite(selectCreated.id);
            else if (selectCreated.type === 'supplier') setSupplier(selectCreated.id);
          } else {
            if (preselectedVehicle) setVehicle(preselectedVehicle);
            if (preselectedTrip) setMiningTrip(preselectedTrip);
          }
        }
      } catch (err) {
        console.warn('Failed to load expense form options:', err);
      }
    },
    [preselectedVehicle, preselectedTrip, currentMine]
  );

  useEffect(() => {
    if (!isOpen) return;

    setExpenseDate(toLocalDateString());

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
    setMiningTrip('');
    setDriver('');
  }

  const availableMineSites = useMemo(() => {
    if (isAllMines) return mineSites;
    return mineSites.filter((s) => allowedMines.includes(s.id) || allowedMines.includes(s.siteName));
  }, [mineSites, isAllMines, allowedMines]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (isUnassigned) {
      setErrorMessage('You are not assigned to any operational mine site. Operational expense logging is restricted.');
      return;
    }

    if (!mineSite || mineSite === 'ALL' || mineSite === 'UNASSIGNED') {
      setErrorMessage('Please select an operational mine site.');
      return;
    }

    if (!isAllMines && !allowedMines.includes(mineSite)) {
      setErrorMessage(`Access Denied: You do not have authorization to record expenses for Mine Site '${mineSite}'.`);
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage('Amount must be a positive number greater than 0.');
      return;
    }

    if (!expenseDate) {
      setErrorMessage('Expense date is strictly mandatory.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseCategory,
          amount: numAmount,
          expenseDate,
          vehicle: vehicle || undefined,
          miningTrip: miningTrip || undefined,
          mineSite,
          driver: driver || undefined,
          supplier: supplier || undefined,
          payeeName: payeeName.trim() || undefined,
          paymentMethod,
          billReference: billReference.trim() || undefined,
          receiptAttachment: receiptAttachment.trim() || undefined,
          description: description.trim() || undefined,
          isTestRecord,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to record operational expense.');
      }

      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error recording operational expense.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
      data-testid="modal-add-expense"
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-blue-900" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-900">Record Operational Expense</h3>
              <p className="text-xs text-slate-500">
                {isMineLocked ? (
                  <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                    <Lock className="w-3 h-3 text-slate-400" /> Locked to {activeMineLabel}
                  </span>
                ) : (
                  'Log fleet disbursement with cost attribution and audit trails'
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
                  You are not currently assigned to any operational mine site. Operational expense logging is restricted until mine permissions are allocated.
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

          {/* Row 1: Category & Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expense Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={expenseCategory}
                onChange={(e) => setExpenseCategory(e.target.value)}
                required
                data-testid="input-expense-category"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Disbursement Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <IndianRupee className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 1250.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  data-testid="input-expense-amount"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Date & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Expense Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="date"
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  required
                  data-testid="input-expense-date"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payment Method <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  required
                  data-testid="input-expense-method"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                >
                  {paymentMethods.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Row 3: Vehicle & Mining Trip Attribution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LinkedField
              label="Vehicle Attribution (Optional)"
              value={vehicle}
              onChange={setVehicle}
              options={vehicles.map((v) => ({
                id: v.id,
                label: v.licensePlate || v.id,
              }))}
              placeholder="General Fleet / Unlinked"
              entityName="Vehicle"
              icon={Truck}
              onCreateNew={() => setShowAddVehicle(true)}
              onViewRecord={(id) => setViewVehicleId(id)}
              data-testid="input-expense-vehicle"
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Mining Trip Link (Optional)
              </label>
              <select
                value={miningTrip}
                onChange={(e) => setMiningTrip(e.target.value)}
                data-testid="input-expense-trip"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
              >
                <option value="">None / Not Trip Specific</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {formatVehicleDisplay(t.vehicle)} — {t.mineSite ? `Site: ${formatMineSiteDisplay(t.mineSite)}` : 'Active Mining Trip'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Mine Site & Driver Attribution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LinkedField
              label="Mine Site"
              required
              disabled={isMineLocked}
              value={mineSite}
              onChange={handleMineSiteChange}
              options={availableMineSites.map((s) => ({
                id: s.id,
                label: s.siteName || s.id,
              }))}
              placeholder="-- Select Mine Site --"
              entityName="Mine Site"
              icon={MapPin}
              onCreateNew={isMineLocked ? undefined : () => setShowAddMineSite(true)}
              onViewRecord={(id) => setViewMineSiteId(id)}
              hint={isMineLocked ? 'Mine site locked to user operational assignment' : 'Project site incurring operational disbursement'}
              data-testid="input-expense-minesite"
            />

            <LinkedField
              label="Driver (Optional)"
              value={driver}
              onChange={setDriver}
              options={drivers.map((d) => ({
                id: d.id,
                label: d.fullName || d.id,
              }))}
              placeholder="None"
              entityName="Driver"
              icon={User}
              onCreateNew={() => setShowAddDriver(true)}
              onViewRecord={(id) => setViewDriverId(id)}
              data-testid="input-expense-driver"
            />
          </div>

          {/* Row 5: Supplier / Vendor & Payee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <LinkedField
              label="Supplier / Vendor (Optional)"
              value={supplier}
              onChange={setSupplier}
              options={suppliers.map((s) => ({
                id: s.id,
                label: s.supplierName || s.id,
              }))}
              placeholder="None / Direct Expense"
              entityName="Supplier / Vendor"
              icon={Building2}
              onCreateNew={() => setShowAddSupplier(true)}
              data-testid="input-expense-supplier"
            />

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
                Payee / Beneficiary Name
              </label>
              <input
                type="text"
                placeholder="e.g. NHAI Fastag Toll Plaza, Hotel Annapurna"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                data-testid="input-expense-payee"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Row 6: Bill / Invoice Reference */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5">
              Bill / Invoice Reference #
            </label>
            <div className="relative">
              <Receipt className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="e.g. INV-2026-9042"
                value={billReference}
                onChange={(e) => setBillReference(e.target.value)}
                data-testid="input-expense-billref"
                className="w-full pl-9 pr-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Business Justification
            </label>
            <textarea
              rows={2}
              placeholder="Provide reason for disbursement, route segment details, or special operational context..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              data-testid="input-expense-description"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>

          {/* Test Record Isolation Checkbox */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
            <input
              type="checkbox"
              id="expenseIsTestRecord"
              checked={isTestRecord}
              onChange={(e) => setIsTestRecord(e.target.checked)}
              data-testid="checkbox-expense-test"
              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <label htmlFor="expenseIsTestRecord" className="text-xs text-slate-500 font-medium">
              Flag as test record (quarantined from financial reports and expense totals)
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
              data-testid="btn-submit-expense"
            >
              {isSubmitting ? 'Recording...' : 'Record Expense'}
            </Button>
          </div>
        </form>
      </div>

      {/* Contextual Linked Modals & Drawers */}
      <AddVehicleModal
        isOpen={showAddVehicle}
        onClose={() => setShowAddVehicle(false)}
        onSuccess={() => {
          loadOptions();
          setShowAddVehicle(false);
        }}
      />

      <AddDriverModal
        isOpen={showAddDriver}
        onClose={() => setShowAddDriver(false)}
        onSuccess={(newDriver) => {
          loadOptions(mineSite, newDriver ? { type: 'driver', id: newDriver.id } : undefined);
          setShowAddDriver(false);
        }}
      />

      <AddMineSiteModal
        isOpen={showAddMineSite}
        onClose={() => setShowAddMineSite(false)}
        onSuccess={(newSite) => {
          const siteId = newSite ? newSite.id : mineSite;
          if (newSite) setMineSite(newSite.id);
          loadOptions(siteId, newSite ? { type: 'mineSite', id: newSite.id } : undefined);
          setShowAddMineSite(false);
        }}
      />

      <AddSupplierModal
        isOpen={showAddSupplier}
        onClose={() => setShowAddSupplier(false)}
        onSuccess={() => {
          loadOptions();
          setShowAddSupplier(false);
        }}
        groups={['All Supplier Groups', 'Services', 'Spare Parts', 'Fuel Vendor']}
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
