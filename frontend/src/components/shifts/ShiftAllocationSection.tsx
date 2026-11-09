'use client';

import React, { useEffect, useState } from 'react';
import { Clock, Calendar, Truck, User, Plus, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ShiftAllocationModal } from './ShiftAllocationModal';
import { VehicleDriverShiftAllocation } from '@/types/fleet';

interface ShiftAllocationSectionProps {
  vehicleId?: string;
  driverId?: string;
  canManage: boolean;
}

export function ShiftAllocationSection({
  vehicleId,
  driverId,
  canManage,
}: ShiftAllocationSectionProps) {
  const [allocations, setAllocations] = useState<VehicleDriverShiftAllocation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const loadAllocations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const params = new URLSearchParams({ include_test: 'true' });
      if (vehicleId) params.append('vehicle', vehicleId);
      if (driverId) params.append('driver', driverId);

      const res = await fetch(`/api/shifts?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to fetch shift allocations.');
      }
      setAllocations(json.data || []);
    } catch (err: any) {
      console.error('Error loading shifts:', err);
      setError(err.message || 'Failed to retrieve shifts.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (vehicleId || driverId) {
      loadAllocations();
    }
  }, [vehicleId, driverId]);

  const handleUpdateStatus = async (allocId: string, newStatus: string) => {
    try {
      setActionLoading(allocId);
      const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
      const res = await fetch(`/api/shifts/${encodeURIComponent(allocId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          allocationEnd: newStatus === 'Completed' ? nowStr : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to update shift status.');
      }

      await loadAllocations();
    } catch (err: any) {
      alert(err.message || 'Error updating shift.');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active':
        return (
          <Badge variant="positive" size="sm">
            Active Shift
          </Badge>
        );
      case 'Scheduled':
        return (
          <Badge variant="info" size="sm">
            Scheduled
          </Badge>
        );
      case 'Completed':
        return (
          <Badge variant="neutral" size="sm">
            Completed
          </Badge>
        );
      case 'Cancelled':
      default:
        return (
          <Badge variant="critical" size="sm">
            Cancelled
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-900" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Shift Allocations & Multi-Driver Roster
          </h3>
          <span className="text-[11px] text-slate-500 font-normal">
            ({allocations.length} records)
          </span>
        </div>

        {canManage && (
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={() => setShowModal(true)}
          >
            Allocate Shift
          </Button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="p-8 border border-slate-200 rounded-xl bg-slate-50/50 flex flex-col items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-900" />
          <span className="text-xs text-slate-500">Retrieving shift schedules...</span>
        </div>
      ) : error ? (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
          {error}
        </div>
      ) : allocations.length === 0 ? (
        <div className="p-6 border border-dashed border-slate-300 rounded-xl bg-slate-50 text-center">
          <Clock className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
          <p className="text-xs font-semibold text-slate-700">No shift allocations found</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Assign multiple drivers to morning, afternoon, night or full-day shifts.
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-2.5 px-3">Shift Type</th>
                  <th className="py-2.5 px-3">{vehicleId ? 'Assigned Driver' : 'Vehicle'}</th>
                  <th className="py-2.5 px-3">Timeline</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocations.map((alloc) => (
                  <tr key={alloc.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-900 shrink-0" />
                        <span>{alloc.shiftType}</span>
                        {alloc.isPrimary && (
                          <span className="px-1.5 py-0.2 text-[9px] bg-blue-100 text-blue-800 font-semibold rounded">
                            Primary
                          </span>
                        )}
                      </div>
                      {alloc.remarks && (
                        <div className="text-[10px] text-slate-400 italic mt-0.5 truncate max-w-xs">
                          {alloc.remarks}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3">
                      {vehicleId ? (
                        <div className="font-medium text-slate-800 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-500" />
                          <span>{alloc.driverName || alloc.driver}</span>
                        </div>
                      ) : (
                        <div className="font-mono font-medium text-slate-800 flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-slate-500" />
                          <span>{alloc.licensePlate || alloc.vehicle}</span>
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                      <div>{alloc.allocationStart?.slice(0, 16) || '—'}</div>
                      {alloc.allocationEnd && (
                        <div className="text-slate-400 text-[10px]">
                          to {alloc.allocationEnd.slice(0, 16)}
                        </div>
                      )}
                    </td>

                    <td className="py-2.5 px-3">{getStatusBadge(alloc.status)}</td>

                    <td className="py-2.5 px-3 text-right">
                      {canManage && (alloc.status === 'Active' || alloc.status === 'Scheduled') && (
                        <div className="flex items-center justify-end gap-1.5">
                          {alloc.status === 'Scheduled' && (
                            <button
                              type="button"
                              disabled={actionLoading === alloc.id}
                              onClick={() => handleUpdateStatus(alloc.id, 'Active')}
                              className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded text-[11px] font-medium transition-colors"
                              title="Activate Shift"
                            >
                              Activate
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={actionLoading === alloc.id}
                            onClick={() => handleUpdateStatus(alloc.id, 'Completed')}
                            className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded text-[11px] font-medium transition-colors"
                            title="Complete Shift"
                          >
                            Complete
                          </button>
                          <button
                            type="button"
                            disabled={actionLoading === alloc.id}
                            onClick={() => handleUpdateStatus(alloc.id, 'Cancelled')}
                            className="px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded text-[11px] font-medium transition-colors"
                            title="Cancel Shift"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ShiftAllocationModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={loadAllocations}
        initialVehicle={vehicleId}
        initialDriver={driverId}
      />
    </div>
  );
}

