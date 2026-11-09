'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { ExpenseCategory } from '@/types/fleet';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
  const [vehicles, setVehicles] = useState<Array<{ id: string; licensePlate: string }>>([]);
  const [mineSites, setMineSites] = useState<Array<{ id: string; siteName: string }>>([]);
  const [trips, setTrips] = useState<Array<{ id: string; vehicle: string; mineSite: string }>>([]);
  const [drivers, setDrivers] = useState<Array<{ id: string; fullName: string }>>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; supplierName: string }>>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([
    'Cash',
    'Credit Card',
    'Cheque',
    'Wire Transfer',
    'Bank Draft',
  ]);

  useEffect(() => {
    if (!isOpen) return;

    setExpenseDate(new Date().toISOString().substring(0, 10));

    async function loadOptions() {
      try {
        const res = await fetch('/api/expenses/options');
        const json = await res.json();
        if (res.ok && json.success) {
          if (json.categories?.length) setCategories(json.categories);
          if (json.vehicles) setVehicles(json.vehicles);
          if (json.mineSites) setMineSites(json.mineSites);
          if (json.trips) setTrips(json.trips);
          if (json.drivers) setDrivers(json.drivers);
          if (json.suppliers) setSuppliers(json.suppliers);
          if (json.paymentMethods?.length) setPaymentMethods(json.paymentMethods);

          if (preselectedVehicle) setVehicle(preselectedVehicle);
          if (preselectedTrip) setMiningTrip(preselectedTrip);
        }
      } catch (err) {
        console.warn('Failed to load expense form options:', err);
      }
    }

    loadOptions();
  }, [isOpen, preselectedVehicle, preselectedTrip]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

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
          mineSite: mineSite || undefined,
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
                Log fleet disbursement with cost attribution and audit trails
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
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vehicle Attribution (Optional)
              </label>
              <div className="relative">
                <Truck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={vehicle}
                  onChange={(e) => setVehicle(e.target.value)}
                  data-testid="input-expense-vehicle"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                >
                  <option value="">General Fleet / Unlinked</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.licensePlate || v.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mining Trip Link (Optional)
              </label>
              <select
                value={miningTrip}
                onChange={(e) => setMiningTrip(e.target.value)}
                data-testid="input-expense-trip"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
              >
                <option value="">None / Not Trip Specific</option>
                {trips.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.id} ({t.vehicle})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 4: Mine Site & Driver Attribution */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mine Site (Optional)
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={mineSite}
                  onChange={(e) => setMineSite(e.target.value)}
                  data-testid="input-expense-minesite"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                >
                  <option value="">None / Fleet General</option>
                  {mineSites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.siteName || s.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Driver (Optional)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select
                  value={driver}
                  onChange={(e) => setDriver(e.target.value)}
                  data-testid="input-expense-driver"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                >
                  <option value="">None</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName || d.id}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Row 5: Payee & Bill Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Payee / Beneficiary Name
              </label>
              <input
                type="text"
                placeholder="e.g. NHAI Fastag Toll Plaza, Hotel Annapurna"
                value={payeeName}
                onChange={(e) => setPayeeName(e.target.value)}
                data-testid="input-expense-payee"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
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
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                />
              </div>
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
              disabled={isSubmitting}
              data-testid="btn-submit-expense"
            >
              {isSubmitting ? 'Recording...' : 'Record Expense'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
