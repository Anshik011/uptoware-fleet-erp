'use client';

import React, { useEffect, useState } from 'react';
import { Driver, MiningTrip, Vehicle } from '@/types/fleet';
import {
  X,
  UserCheck,
  Phone,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Truck,
  Compass,
  Scale,
  Calendar,
  Loader2,
  Edit2,
  HeartPulse,
  Award,
  FileText
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DocumentListSection } from '@/components/documents/DocumentListSection';
import { ShiftAllocationSection } from '@/components/shifts/ShiftAllocationSection';

interface DriverDrawerProps {
  driverId: string | null;
  onClose: () => void;
  onEditDriver: (driver: Driver) => void;
  canManage: boolean;
}

export function DriverDrawer({ driverId, onClose, onEditDriver, canManage }: DriverDrawerProps) {
  const [driver, setDriver] = useState<Driver | null>(null);
  const [trips, setTrips] = useState<MiningTrip[]>([]);
  const [assignedVehicleDetails, setAssignedVehicleDetails] = useState<Vehicle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!driverId) {
      setDriver(null);
      return;
    }

    async function loadDriverDetails() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch(`/api/drivers/${encodeURIComponent(driverId!)}`);
        const json = await res.json();
        if (!res.ok || !json.success) {
          throw new Error(json.error || 'Failed to fetch driver profile');
        }
        setDriver(json.data.driver);
        setTrips(json.data.trips || []);
        setAssignedVehicleDetails(json.data.assignedVehicleDetails || null);
      } catch (err: any) {
        console.error('Driver drawer load error:', err);
        setError(err.message || 'Error loading driver profile');
      } finally {
        setIsLoading(false);
      }
    }

    loadDriverDetails();
  }, [driverId]);

  if (!driverId) return null;

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'Active':
        return 'positive';
      case 'Suspended':
        return 'warning';
      case 'Left':
      default:
        return 'neutral';
    }
  };

  const getComplianceInfo = (status: string, days: number | null) => {
    switch (status) {
      case 'valid':
        return {
          variant: 'positive' as const,
          label: `Valid (${days !== null ? `${days} days left` : 'Active'})`,
          icon: ShieldCheck,
        };
      case 'expiring_soon':
        return {
          variant: 'warning' as const,
          label: `Expiring Soon (${days} days)`,
          icon: AlertTriangle,
        };
      case 'expired':
        return {
          variant: 'critical' as const,
          label: `Expired (${days !== null ? `${Math.abs(days)} days ago` : 'Overdue'})`,
          icon: ShieldAlert,
        };
      case 'missing':
      default:
        return {
          variant: 'neutral' as const,
          label: 'Document Missing',
          icon: FileText,
        };
    }
  };

  const getTripStatusVariant = (status: string) => {
    switch (status) {
      case 'Delivered':
        return 'positive';
      case 'Dispatched':
      case 'Approved':
      case 'Weighbridge Confirmed':
        return 'info';
      case 'Cancelled':
        return 'critical';
      default:
        return 'neutral';
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
            <div className="w-11 h-11 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              {driver
                ? driver.fullName
                    .split(' ')
                    .map((n) => n[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase()
                : 'DR'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  {driver?.fullName || driverId}
                </h2>
                {driver && (
                  <Badge variant={getStatusBadgeVariant(driver.status)} size="sm">
                    {driver.status}
                  </Badge>
                )}
              </div>
              <p className="text-xs font-mono text-slate-500 font-medium">
                Driver ID: {driverId} {driver?.isTestRecord ? '· [Test Record]' : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
            aria-label="Close driver details drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-900" />
              <p className="text-xs text-slate-500">Retrieving operational driver records...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <p className="font-semibold mb-1">Failed to load driver profile</p>
              <p>{error}</p>
            </div>
          ) : driver ? (
            <>
              {/* Performance Metric Strip */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
                    <Award className="w-3.5 h-3.5 text-amber-500" />
                    Safety Score
                  </div>
                  <div className="text-xl font-bold text-slate-900">
                    {driver.safetyScore.toFixed(1)}%
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        driver.safetyScore >= 90
                          ? 'bg-emerald-500'
                          : driver.safetyScore >= 75
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, driver.safetyScore))}%` }}
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
                    <Compass className="w-3.5 h-3.5 text-blue-600" />
                    Total Trips
                  </div>
                  <div className="text-xl font-bold text-slate-900">
                    {driver.totalTrips ?? trips.length}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Recorded mining runs</p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold uppercase tracking-wider mb-1">
                    <Scale className="w-3.5 h-3.5 text-indigo-600" />
                    Total Hauled
                  </div>
                  <div className="text-xl font-bold text-slate-900">
                    {(driver.totalTonnage ?? 0).toLocaleString()} <span className="text-xs font-normal text-slate-500">T</span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Dispatched tonnage</p>
                </div>
              </div>

              {/* Contact & Personal Information */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Phone className="w-4 h-4 text-slate-500" />
                  Contact Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">Primary Cellphone</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {driver.cellNumber || 'Not provided'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Employment Status</span>
                    <span className="font-semibold text-slate-900">
                      {driver.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Emergency Contact Person</span>
                    <span className="font-semibold text-slate-900">
                      {driver.emergencyContactName || 'None listed'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Emergency Contact Phone</span>
                    <span className="font-semibold text-slate-900 font-mono">
                      {driver.emergencyContactPhone || 'None listed'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Licensing & Regulatory Compliance */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-900" />
                  Driving License & Regulatory Compliance
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block mb-0.5">License Number</span>
                    <span className="font-semibold font-mono text-slate-900">
                      {driver.licenseNumber || 'Not recorded'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">License Status</span>
                    {(() => {
                      const c = getComplianceInfo(driver.licenseStatus, driver.daysToLicenseExpiry);
                      const Icon = c.icon;
                      return (
                        <Badge variant={c.variant} size="sm" className="gap-1 mt-0.5">
                          <Icon className="w-3 h-3" />
                          {c.label}
                        </Badge>
                      );
                    })()}
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Issuing Date</span>
                    <span className="font-semibold text-slate-700">
                      {driver.issuingDate || 'Not recorded'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block mb-0.5">Expiry Date</span>
                    <span className="font-semibold text-slate-700">
                      {driver.expiryDate || 'Not recorded'}
                    </span>
                  </div>
                  <div className="sm:col-span-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <HeartPulse className="w-4 h-4 text-emerald-600" />
                      <span className="text-slate-600">Medical Fitness Certificate:</span>
                    </div>
                    <span className="font-semibold text-slate-900 font-mono">
                      {driver.medicalFitnessExpiry ? `Expires ${driver.medicalFitnessExpiry}` : 'Not Required / Unrecorded'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Assigned Vehicle Details */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Truck className="w-4 h-4 text-blue-900" />
                  Assigned Transport Asset
                </h3>
                {driver.assignedVehicle ? (
                  <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        <Truck className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          {driver.assignedVehicle}
                        </div>
                        <div className="text-xs text-slate-500">
                          {assignedVehicleDetails
                            ? `${assignedVehicleDetails.make} · ${assignedVehicleDetails.model}`
                            : 'Dedicated Fleet Unit'}
                        </div>
                      </div>
                    </div>
                    {assignedVehicleDetails && (
                      <Badge variant="info" size="sm">
                        {assignedVehicleDetails.status}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-slate-50 border border-dashed border-slate-300 text-center">
                    <p className="text-xs text-slate-500 font-medium">
                      No transport vehicle is currently assigned to this driver.
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Driver is in standby status ready for dispatch allocation.
                    </p>
                  </div>
                )}
              </div>

              {/* Statutory & Verification Documents */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <DocumentListSection
                  entityType="driver"
                  entityId={driver.id}
                  entityLabel={driver.name}
                  canManage={canManage}
                />
              </div>

              {/* Shift Allocations & Multi-Driver Roster */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                <ShiftAllocationSection
                  driverId={driver.id}
                  canManage={canManage}
                />
              </div>

              {/* Driver-wise Trip History */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-blue-900" />
                    Trip Operations History
                  </span>
                  <span className="text-[11px] font-normal text-slate-500">
                    {trips.length} recent runs
                  </span>
                </h3>

                {trips.length === 0 ? (
                  <div className="p-6 rounded-xl border border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
                    <Compass className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                    <p className="font-medium text-slate-700">No mining trips recorded</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Completed and dispatched trips linked to this driver will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="py-2.5 px-3">Trip ID</th>
                          <th className="py-2.5 px-3">Mine Site</th>
                          <th className="py-2.5 px-3 text-right">Net Weight</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {trips.map((trip) => (
                          <tr key={trip.id} className="hover:bg-slate-50/80">
                            <td className="py-2.5 px-3 font-mono font-medium text-blue-900">
                              {trip.id}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 truncate max-w-[130px]">
                              {trip.mineSite}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-900">
                              {trip.netWeightTons ? `${trip.netWeightTons} T` : '—'}
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge variant={getTripStatusVariant(trip.status)} size="sm">
                                {trip.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Drawer Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
          {canManage && driver && (
            <Button
              variant="primary"
              size="sm"
              icon={Edit2}
              onClick={() => {
                onClose();
                onEditDriver(driver);
              }}
              data-testid="btn-drawer-edit-driver"
            >
              Edit Driver Profile
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

