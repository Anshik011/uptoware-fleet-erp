'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Vehicle, MiningTrip, FleetAlert } from '@/types/fleet';
import { useAuth } from '@/context/AuthContext';
import { DocumentListSection } from '@/components/documents/DocumentListSection';
import { ShiftAllocationSection } from '@/components/shifts/ShiftAllocationSection';
import {
  X,
  Truck,
  User,
  Gauge,
  Weight,
  Fuel,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Calendar,
  Loader2,
  Wrench,
  Compass,
  ExternalLink,
  Shield,
} from 'lucide-react';

interface VehicleDrawerProps {
  vehicleId: string | null;
  onClose: () => void;
}

export function VehicleDrawer({ vehicleId, onClose }: VehicleDrawerProps) {
  const { hasRole } = useAuth();
  const canManage = hasRole(['Fleet Manager', 'Administrator']);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [trips, setTrips] = useState<MiningTrip[]>([]);
  const [alerts, setAlerts] = useState<FleetAlert[]>([]);
  const [recentFuel, setRecentFuel] = useState<any[]>([]);
  const [recentMaintenance, setRecentMaintenance] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!vehicleId) {
      setVehicle(null);
      return;
    }

    async function loadDetails() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/vehicles/${encodeURIComponent(vehicleId!)}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to fetch vehicle details');
        }
        setVehicle(json.data.vehicle);
        setTrips(json.data.trips || []);
        setAlerts(json.data.alerts || []);
        setRecentFuel(json.data.recentFuel || []);
        setRecentMaintenance(json.data.recentMaintenance || []);
      } catch (err: any) {
        console.error('Drawer load error:', err);
        setError(err.message || 'Error loading vehicle specification');
      } finally {
        setIsLoading(false);
      }
    }

    loadDetails();
  }, [vehicleId]);

  if (!vehicleId) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
      case 'On Trip':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Under Maintenance':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Breakdown':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getStatutoryBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: 'Compliant & Valid',
          icon: ShieldCheck,
        };
      case 'expiring_soon':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          label: 'Expiring Soon',
          icon: AlertTriangle,
        };
      case 'expired':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          label: 'Expired',
          icon: AlertTriangle,
        };
      default:
        return {
          bg: 'bg-slate-100 text-slate-600 border-slate-200',
          label: 'Document Missing',
          icon: FileText,
        };
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end transition-opacity"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col justify-between overflow-hidden border-l border-slate-200">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-900 text-white flex items-center justify-center shadow-sm">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 font-mono tracking-tight">
                  {vehicle?.licensePlate || vehicleId}
                </h2>
                {vehicle && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadge(
                      vehicle.status
                    )}`}
                  >
                    {vehicle.status}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-medium">
                {vehicle ? `${vehicle.make} · ${vehicle.model}` : 'Asset Details'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
            aria-label="Close vehicle details drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs font-medium">Loading vehicle specifications and compliance records...</span>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
              {error}
            </div>
          ) : vehicle ? (
            <>
              {/* Asset Technical Specifications */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Asset Specifications & Capacity
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                      <Gauge className="w-3.5 h-3.5 text-blue-600" />
                      <span>Odometer</span>
                    </div>
                    <div className="text-base font-bold text-slate-900 font-mono">
                      {vehicle.lastOdometer.toLocaleString('en-IN')} KM
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                      <Weight className="w-3.5 h-3.5 text-amber-600" />
                      <span>Payload</span>
                    </div>
                    <div className="text-base font-bold text-slate-900">
                      {vehicle.payloadCapacityTons} MT
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
                      <Fuel className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Fuel Type</span>
                    </div>
                    <div className="text-base font-bold text-slate-900">
                      {vehicle.fuelType}
                    </div>
                  </div>
                </div>
              </div>

              {/* Assigned Driver Card */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Operator Assignment
                </h3>
                <div className="p-4 rounded-lg border border-slate-200 bg-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900">
                        {vehicle.assignedDriverName || 'No Driver Assigned'}
                      </div>
                      <div className="text-xs text-slate-500">
                        {vehicle.assignedDriverId ? `ID: ${vehicle.assignedDriverId}` : 'Vehicle currently available for driver roster'}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded ${
                      vehicle.assignedDriverId
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {vehicle.assignedDriverId ? 'Assigned' : 'Unallocated'}
                  </span>
                </div>
              </div>

              {/* Statutory Compliance Section (5 Document Cards) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Statutory Documents & Certifications
                  </h3>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${
                        getStatutoryBadge(vehicle.statutory.overall).bg
                      }`}
                    >
                      {getStatutoryBadge(vehicle.statutory.overall).label}
                    </span>
                    <Link
                      href="/compliance"
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition-colors"
                      title="Manage Vehicle Statutory Dossier"
                    >
                      Manage <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {[
                    vehicle.statutory.insurance,
                    vehicle.statutory.fitness,
                    vehicle.statutory.puc,
                    vehicle.statutory.roadTax,
                    vehicle.statutory.permit,
                  ].map((doc, idx) => {
                    const badge = getStatutoryBadge(doc.status);
                    const Icon = badge.icon;

                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-start sm:items-center justify-between gap-3 hover:bg-slate-50 transition-colors min-w-0 flex-wrap sm:flex-nowrap"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Icon className={`w-4 h-4 shrink-0 ${doc.status === 'valid' ? 'text-emerald-600' : doc.status === 'expiring_soon' ? 'text-amber-600' : 'text-rose-600'}`} />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-slate-900 break-words">
                              {doc.title}
                            </div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">Expiry: {doc.expiryDate || 'No record on file'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`inline-block text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${badge.bg}`}
                          >
                            {badge.label}
                          </span>
                          {doc.daysRemaining !== null && (
                            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                              {doc.daysRemaining > 0
                                ? `${doc.daysRemaining} days left`
                                : `${Math.abs(doc.daysRemaining)} days overdue`}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Operational Dispatches History */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Recent Mining Dispatches ({trips.length})
                </h3>
                {trips.length === 0 ? (
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                    No mining trips logged for this vehicle yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {trips.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Compass className="w-3.5 h-3.5 text-blue-600" />
                          <div>
                            <span className="font-semibold text-slate-900">{t.id}</span>
                            <span className="text-slate-500 ml-2">
                              {t.mineSite} → {t.destination}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-slate-900">{t.netWeightTons} MT</span>
                          <span className="text-slate-500 ml-2 font-mono">
                            {t.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Statutory & Verification Documents */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <DocumentListSection
                  entityType="vehicle"
                  entityId={vehicle.id}
                  entityLabel={vehicle.licensePlate}
                  canManage={canManage}
                />
              </div>

              {/* Shift Allocations & Multi-Driver Roster */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <ShiftAllocationSection
                  vehicleId={vehicle.id}
                  canManage={canManage}
                />
              </div>

              {/* Maintenance & Workshop Logs */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Workshop & Breakdown History ({recentMaintenance.length})
                </h3>
                {recentMaintenance.length === 0 ? (
                  <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
                    No breakdown incidents or corrective maintenance records.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentMaintenance.map((m) => (
                      <div
                        key={m.name}
                        className="p-3 rounded-lg border border-slate-200 bg-white flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Wrench className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <div>
                            <span className="font-semibold text-slate-900 font-mono">{m.name}</span>
                            <span className="text-slate-500 ml-2">
                              {m.breakdown_type || 'Workshop Service'} • {m.breakdown_date || ''}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-slate-900 font-mono">
                            {m.total_maintenance_cost ? `₹${Number(m.total_maintenance_cost).toLocaleString('en-IN')}` : ''}
                          </span>
                          <span className="text-slate-600 font-medium ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-[10px]">
                            {m.repair_status || m.status || 'Reported'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-sm transition-colors"
          >
            Close Overview
          </button>
        </div>
      </div>
    </div>
  );
}

