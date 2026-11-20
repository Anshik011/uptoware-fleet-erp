'use client';

import React, { useState, useEffect } from 'react';
import { MiningTrip } from '@/types/fleet';
import { SalesInvoiceRecord } from '@/lib/frappe';
import { formatCurrency, formatDate } from '@/config/branding';
import { X, FileText, Calendar, Truck, IndianRupee, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { formatVehicleDisplay, formatMineSiteDisplay } from '@/lib/displayFormatters';

interface InvoicePreparationModalProps {
  isOpen: boolean;
  trip: MiningTrip | null;
  onClose: () => void;
  onInvoiceCreated: (invoice: SalesInvoiceRecord) => void;
}

export function InvoicePreparationModal({ isOpen, trip, onClose, onInvoiceCreated }: InvoicePreparationModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<SalesInvoiceRecord | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setInvoice(null);
      setError(null);
    }
  }, [isOpen]);

  // Fetch trip details to check eligibility
  useEffect(() => {
    if (!isOpen || !trip) return;

    const checkEligibility = async () => {
      setLoading(true);
      setError(null);

      try {
        // Validate trip is eligible for invoicing - only Delivered trips
        if (trip.tripStatus !== 'Delivered') {
          setError(`Trip must be 'Delivered' before invoicing. Current status: ${trip.tripStatus}`);
          setLoading(false);
          return;
        }

        // Check if already invoiced
        if (trip.salesInvoice) {
          setError(`Trip already has an associated Sales Invoice: ${trip.salesInvoice}`);
          setLoading(false);
          return;
        }

        // Fetch invoice if it exists (shouldn't if not already invoiced, but check anyway)
        if (trip.id) {
          const res = await fetch(`/api/finance/revenue?trip=${encodeURIComponent(trip.id)}`);
          const json = await res.json();
          if (json.success && json.invoices && json.invoices.length > 0) {
            setError(`Invoice already exists for this trip: ${json.invoices[0].id}`);
            setLoading(false);
            return;
          }
        }

        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Failed to check trip eligibility.');
        setLoading(false);
      }
    };

    checkEligibility();
  }, [isOpen, trip]);

  if (!isOpen || !trip) return null;

  // Calculate invoice details
  const confirmedWeight = trip.netWeightTons || 0;
  const ratePerTon = trip.ratePerTon || 0;
  const billingAmount = Math.round(confirmedWeight * ratePerTon * 100) / 100;

  const handleCreateInvoice = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/finance/revenue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tripId: trip.id }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create invoice.');
      }

      setInvoice(data.invoice);
      onInvoiceCreated(data.invoice);
    } catch (err: any) {
      setError(err.message || 'Error creating invoice.');
    } finally {
      setLoading(false);
    }
  };

  // Get mine site and rate info
  const mineSiteId = trip.mineSite || 'Unknown';
  const customerName = trip.id ? `Trip ${trip.id}` : 'Customer from site';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg my-8">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900 text-white flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Prepare Invoice from Trip</h2>
              <p className="text-xs text-slate-500">Create Draft Sales Invoice for delivered trip</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/60 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {error && (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <div>
                <p className="font-semibold">Error</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {loading && (
            <div className="py-8 flex flex-col items-center justify-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="text-xs font-medium">Preparing invoice...</span>
            </div>
          )}

          {!loading && !error && !invoice && (
            <>
              {/* Trip Details */}
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Trip Summary</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-400">Trip ID</span>
                    <div className="font-medium text-slate-900">{trip.id}</div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Vehicle</span>
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-slate-400" />
                      <span className="font-medium text-slate-900 font-mono">
                        {formatVehicleDisplay(trip.vehicle)}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Mine Site / Client</span>
                    <div className="font-medium text-slate-900">
                      {formatMineSiteDisplay(mineSiteId, trip.mineSiteName)}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Material</span>
                    <div className="font-medium text-slate-900">{trip.materialType || 'Bulk Material'}</div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Destination</span>
                    <div className="font-medium text-slate-900">{trip.destination}</div>
                  </div>
                </div>
              </div>

              {/* Billing Details */}
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Billing Details (Draft)</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-400">Customer</span>
                    <div className="font-medium text-slate-900">{customerName}</div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Confirmed Net Weight</span>
                    <div className="font-medium text-slate-900">
                      {confirmedWeight.toFixed(3)} T
                      {trip.returnDateTime && (
                        <span className="text-[11px] text-slate-400 block">Delivered: {formatDate(trip.returnDateTime)}</span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400">Rate per Ton</span>
                    <div className="font-medium text-slate-900">₹{ratePerTon.toLocaleString('en-IN')} / T</div>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Line Item Description</span>
                    <span className="text-xs text-slate-400">Haulage Service</span>
                  </div>
                </div>
              </div>

              {/* Calculated Amount */}
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">Invoice Amount</span>
                  <IndianRupee className="w-5 h-5 text-blue-900" />
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {formatCurrency(billingAmount)}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {confirmedWeight.toFixed(3)}T × ₹{ratePerTon.toLocaleString('en-IN')}/T
                </div>
              </div>
            </>
          )}

          {invoice && (
            <div className="border border-emerald-200 rounded-lg p-4 bg-emerald-50">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-emerald-900">Invoice Created Successfully</p>
                  <p className="text-xs text-emerald-800 mt-1">
                    Draft Sales Invoice <strong className="font-mono">{invoice.id}</strong> has been created.
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-slate-600">Due Date</span>
                      <div className="font-medium text-slate-900">{formatDate(invoice.dueDate)}</div>
                    </div>
                    <div>
                      <span className="text-xs text-slate-600">Amount</span>
                      <div className="font-medium text-slate-900">{formatCurrency(invoice.baseGrandTotal)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            size="md"
            disabled={loading}
          >
            {invoice ? 'Close' : 'Cancel'}
          </Button>
          {!invoice && (
            <Button
              onClick={handleCreateInvoice}
              variant="primary"
              size="md"
              isLoading={loading}
              disabled={loading || !!error}
            >
              Create Draft Invoice
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}