'use client';

import React, { useState, useEffect } from 'react';
import { MiningTrip, Vehicle, Driver, MineSite, TripStatus } from '@/types/fleet';
import {
  X,
  Compass,
  Truck,
  User,
  MapPin,
  Scale,
  Calendar,
  Gauge,
  IndianRupee,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  FileText,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';

interface TripDrawerProps {
  tripId: string | null;
  onClose: () => void;
  onOpenActionModal: (trip: MiningTrip, action: string) => void;
  canManage: boolean;
}

export function TripDrawer({
  tripId,
  onClose,
  onOpenActionModal,
  canManage,
}: TripDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trip, setTrip] = useState<MiningTrip | null>(null);
  const [validTransitions, setValidTransitions] = useState<string[]>([]);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [mineSite, setMineSite] = useState<MineSite | null>(null);

  useEffect(() => {
    if (!tripId) {
      setTrip(null);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/trips/${encodeURIComponent(tripId)}`)
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.data) {
          setTrip(data.data.trip);
          setValidTransitions(data.data.validTransitions || []);
          setVehicle(data.data.vehicleDetails || null);
          setDriver(data.data.driverDetails || null);
          setMineSite(data.data.siteDetails || null);
        } else {
          setError(data.error || 'Failed to load trip profile.');
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'An error occurred loading trip details.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [tripId]);

  if (!tripId) return null;

  const getStatusBadge = (status: TripStatus | string) => {
    switch (status) {
      case 'Draft':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-600/20">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            Draft
          </span>
        );
      case 'Dispatched':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Dispatched (In Transit)
          </span>
        );
      case 'Weighbridge Confirmed':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">
            <Scale className="w-3.5 h-3.5 text-amber-600" />
            Weighbridge Confirmed
          </span>
        );
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Approved
          </span>
        );
      case 'Delivered':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-600/20">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            Delivered & Completed
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20">
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-600/20">
            {status}
          </span>
        );
    }
  };

  const formatDateTime = (dtStr?: string | null) => {
    if (!dtStr) return '—';
    try {
      const d = new Date(dtStr);
      if (isNaN(d.getTime())) return dtStr;
      return d.toLocaleString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dtStr;
    }
  };

  // Lifecycle progression states
  const lifecycleSteps = [
    'Draft',
    'Dispatched',
    'Weighbridge Confirmed',
    'Approved',
    'Delivered',
  ];

  const currentStatus = trip?.tripStatus || trip?.status || 'Draft';
  const isCancelled = currentStatus === 'Cancelled';
  const currentStepIndex = lifecycleSteps.indexOf(currentStatus);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/75">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900 text-white flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  {trip ? `Trip — ${trip.vehicle}` : tripId}
                </h2>
                {trip && (
                  <Badge variant="neutral" size="sm" className="font-semibold">
                    {trip.materialType || 'Bulk Mineral'}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-600 bg-slate-100 border border-slate-200">
                  Trip ID: {tripId}
                </span>
                <span className="text-xs text-slate-500">
                  {trip?.mineSite} &rarr; {trip?.destination}
                </span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-3 border-blue-900 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Loading trip profile...</span>
            </div>
          )}

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
              <div>
                <p className="font-semibold">Failed to load trip</p>
                <p className="text-xs mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {!loading && trip && (
            <>
              {/* Lifecycle Progress Banner */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Lifecycle Progression
                  </span>
                  <div>{getStatusBadge(currentStatus)}</div>
                </div>

                {isCancelled ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs">
                    <p className="font-bold flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      Trip Cancelled
                    </p>
                    <p className="mt-1 text-slate-600">
                      Reason:{' '}
                      <span className="font-medium text-slate-900">
                        {trip.cancellationReason || 'No reason provided'}
                      </span>
                    </p>
                    {trip.cancelledBy && (
                      <p className="mt-0.5 text-slate-500 text-[11px]">
                        By {trip.cancelledBy} on {formatDateTime(trip.cancelledOn)}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="relative flex items-center justify-between">
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 w-full z-0" />
                    <div
                      className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 transition-all duration-500 z-0"
                      style={{
                        width: `${Math.max(0, (currentStepIndex / (lifecycleSteps.length - 1)) * 100)}%`,
                      }}
                    />

                    {lifecycleSteps.map((step, idx) => {
                      const isCompleted = idx <= currentStepIndex;
                      const isCurrent = idx === currentStepIndex;
                      return (
                        <div
                          key={step}
                          className="relative z-10 flex flex-col items-center group"
                        >
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              isCompleted
                                ? 'bg-blue-900 text-white ring-4 ring-white shadow-xs'
                                : 'bg-slate-200 text-slate-500 ring-4 ring-white'
                            } ${isCurrent ? 'ring-blue-200' : ''}`}
                          >
                            {isCompleted && idx < currentStepIndex ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              idx + 1
                            )}
                          </div>
                          <span
                            className={`text-[10px] mt-1.5 font-medium max-w-[70px] text-center leading-tight ${
                              isCurrent
                                ? 'text-blue-900 font-bold'
                                : isCompleted
                                  ? 'text-slate-800'
                                  : 'text-slate-400'
                            }`}
                          >
                            {step}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Haulage Route & Entity Overview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Vehicle Card */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Truck className="w-4 h-4 text-blue-900" />
                    Assigned Vehicle
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-slate-900">
                      {trip.vehicle}
                    </span>
                    {vehicle ? (
                      <span className="text-xs text-slate-600 mt-0.5">
                        {vehicle.make} {vehicle.model} &bull; Capacity: {vehicle.payloadCapacityTons} T
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 mt-0.5">Vehicle record linked</span>
                    )}
                    <span className="text-[11px] text-slate-400 mt-1">
                      Status: <strong className="text-slate-700">{vehicle?.status || 'Active'}</strong>
                    </span>
                  </div>
                </div>

                {/* Driver Card */}
                <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs">
                  <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <User className="w-4 h-4 text-blue-900" />
                    Assigned Driver
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-slate-900">
                      {driver?.fullName || trip.driverName || trip.driver}
                    </span>
                    <span className="text-xs text-slate-600 mt-0.5">
                      Driver ID: {trip.driver}
                    </span>
                    {driver?.licenseNumber && (
                      <span className="text-[11px] text-slate-400 mt-1">
                        License: <strong className="text-slate-700">{driver.licenseNumber}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Weighbridge Readings */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <Scale className="w-4 h-4 text-blue-900" />
                    <h3 className="text-sm font-bold text-slate-900">
                      Weighbridge Integration & Readings
                    </h3>
                  </div>
                  {trip.confirmedBy && (
                    <span className="text-[11px] text-slate-400">
                      Confirmed by <strong className="text-slate-600">{trip.confirmedBy}</strong>
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg text-center">
                    <span className="text-[11px] font-medium text-slate-500 block">Gross Weight</span>
                    <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                      {trip.grossWeightTons != null ? `${trip.grossWeightTons.toFixed(3)} T` : '—'}
                    </span>
                    <span className="text-[10px] text-slate-400">Loaded Truck</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg text-center">
                    <span className="text-[11px] font-medium text-slate-500 block">Tare Weight</span>
                    <span className="text-lg font-bold text-slate-900 mt-0.5 block">
                      {trip.tareWeightTons != null ? `${trip.tareWeightTons.toFixed(3)} T` : '—'}
                    </span>
                    <span className="text-[10px] text-slate-400">Empty Tare</span>
                  </div>

                  <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg text-center">
                    <span className="text-[11px] font-bold text-blue-900 block">Net Hauled Weight</span>
                    <span className="text-lg font-extrabold text-blue-900 mt-0.5 block">
                      {trip.netWeightTons > 0 ? `${trip.netWeightTons.toFixed(3)} T` : '—'}
                    </span>
                    <span className="text-[10px] text-blue-700">Calculated (Gross - Tare)</span>
                  </div>
                </div>

                {trip.confirmedOn && (
                  <p className="text-[11px] text-slate-500 mt-3 text-right">
                    Weighbridge timestamp: {formatDateTime(trip.confirmedOn)}
                  </p>
                )}
              </div>

              {/* Haulage Route & Odometer Readings */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <Gauge className="w-4 h-4 text-blue-900" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Odometer Progression & Haulage Route
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm mb-4">
                  <div>
                    <span className="text-xs text-slate-500 block">Origin Loading Pit</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">
                      {trip.mineSite}
                    </span>
                    {mineSite?.client && (
                      <span className="text-[11px] text-slate-400">Client: {mineSite.client}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-xs text-slate-500 block">Destination Terminal / Plant</span>
                    <span className="font-semibold text-slate-900 mt-0.5 block">
                      {trip.destination}
                    </span>
                    {trip.challanNumber && (
                      <span className="text-[11px] text-slate-400">Challan: #{trip.challanNumber}</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-100 text-center">
                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-[11px] text-slate-500 block">Opening Odometer</span>
                    <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                      {trip.openingOdometer != null ? `${trip.openingOdometer.toLocaleString()} km` : '—'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-[11px] text-slate-500 block">Closing Odometer</span>
                    <span className="text-sm font-bold text-slate-800 mt-0.5 block">
                      {trip.closingOdometer != null ? `${trip.closingOdometer.toLocaleString()} km` : '—'}
                    </span>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg">
                    <span className="text-[11px] text-slate-500 block">Total Distance</span>
                    <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                      {trip.openingOdometer != null && trip.closingOdometer != null && trip.closingOdometer >= trip.openingOdometer
                        ? `${(trip.closingOdometer - trip.openingOdometer).toLocaleString()} km`
                        : '—'}
                    </span>
                  </div>
                </div>

                <div className="mt-3 flex flex-col sm:flex-row justify-between text-xs text-slate-500 gap-1 pt-2">
                  <span>Dispatched: {formatDateTime(trip.dispatchDateTime)}</span>
                  <span>Delivered: {formatDateTime(trip.returnDateTime)}</span>
                </div>
              </div>

              {/* Commercials & Billing */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs">
                <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                  <IndianRupee className="w-4 h-4 text-blue-900" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Commercials & Valuation</h3>
                    <span className="text-[11px] text-slate-400 block font-normal">
                      Indicative haulage estimates and actual accounts billing
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 block font-medium">Indicative Haulage Rate</span>
                    <span className="text-base font-bold text-slate-900 mt-0.5 block">
                      ₹{(trip.ratePerTon || 0).toLocaleString('en-IN')} / Ton
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Mine Site indicative base rate
                    </span>
                  </div>

                  <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100">
                    <span className="text-xs text-slate-500 block font-medium">Estimated Commercial Value</span>
                    <span className="text-base font-bold text-slate-700 mt-0.5 block">
                      ₹{trip.grossRevenue.toLocaleString('en-IN')}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Net weight × indicative rate (non-binding)
                    </span>
                  </div>
                </div>

                {/* Actual Billed Revenue from Accounts */}
                <div className="mt-4 p-3 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-slate-700 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800">Actual Billed Revenue (Accounts):</span>
                    <span className="font-mono font-bold text-blue-950">
                      {trip.salesInvoice ? `Linked (${trip.salesInvoice})` : '₹0.00 (Unbilled)'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                    Actual billed revenue is sourced exclusively from submitted Sales Invoices in Accounts. Indicative trip estimates do not generate accounting revenue.
                  </p>
                </div>

                {trip.billingStatus && (
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600 flex items-center justify-between">
                    <span>Billing Status:</span>
                    <strong className="text-slate-800 bg-slate-100 px-2 py-0.5 rounded font-mono text-[11px]">
                      {trip.billingStatus}
                    </strong>
                    {trip.billingNote && <p className="text-slate-500 mt-1 italic w-full">{trip.billingNote}</p>}
                  </div>
                )}
              </div>

              {/* Audit Stamping */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 space-y-1">
                <div className="font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-900" />
                  Security & Audit Trail
                </div>
                {trip.approvedBy && (
                  <p>
                    Approved by <strong className="text-slate-700">{trip.approvedBy}</strong> on{' '}
                    {formatDateTime(trip.approvedOn)}
                  </p>
                )}
                {trip.cancelledBy && (
                  <p className="text-rose-600">
                    Cancelled by <strong className="text-rose-800">{trip.cancelledBy}</strong> on{' '}
                    {formatDateTime(trip.cancelledOn)}
                  </p>
                )}
                <p className="text-[11px] text-slate-400">
                  Document engine: Frappe REST API &bull; DocType: Mining Trip
                </p>
              </div>
            </>
          )}
        </div>

        {/* Workflow Actions Footer */}
        {trip && !loading && canManage && (
          <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-end gap-3">
            {/* Render transition action buttons based on validTransitions */}
            {validTransitions.map((action) => {
              if (action === 'Cancel') {
                return (
                  <Button
                    key={action}
                    onClick={() => onOpenActionModal(trip, 'Cancel')}
                    variant="danger"
                    size="sm"
                    icon={XCircle}
                  >
                    Cancel Trip
                  </Button>
                );
              }
              if (action === 'Dispatch') {
                return (
                  <Button
                    key={action}
                    onClick={() => onOpenActionModal(trip, 'Dispatch')}
                    variant="primary"
                    size="sm"
                    icon={Compass}
                  >
                    Dispatch Trip
                  </Button>
                );
              }
              if (action === 'Confirm Weighbridge') {
                return (
                  <Button
                    key={action}
                    onClick={() => onOpenActionModal(trip, 'Confirm Weighbridge')}
                    variant="primary"
                    size="sm"
                    icon={Scale}
                  >
                    Confirm Weighbridge
                  </Button>
                );
              }
              if (action === 'Approve') {
                return (
                  <Button
                    key={action}
                    onClick={() => onOpenActionModal(trip, 'Approve')}
                    variant="primary"
                    size="sm"
                    icon={CheckCircle2}
                  >
                    Approve Trip
                  </Button>
                );
              }
              if (action === 'Mark Delivered') {
                return (
                  <Button
                    key={action}
                    onClick={() => onOpenActionModal(trip, 'Mark Delivered')}
                    variant="primary"
                    size="sm"
                    icon={CheckCircle2}
                  >
                    Mark Delivered
                  </Button>
                );
              }
              return (
                <Button
                  key={action}
                  onClick={() => onOpenActionModal(trip, action)}
                  variant="primary"
                  size="sm"
                >
                  {action}
                </Button>
              );
            })}

            <Button onClick={onClose} variant="outline" size="sm">
              Close
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
