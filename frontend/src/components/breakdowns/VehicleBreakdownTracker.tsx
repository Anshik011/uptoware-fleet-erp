'use client';

import React from 'react';
import { VehicleBreakdown } from '@/types/fleet';
import {
  Wrench,
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  Download,
  Camera,
  AlertTriangle,
  Building,
  UserCheck,
  Search,
  FileCheck,
  Check,
  ShoppingCart,
  Package,
  Flag,
  RotateCcw,
  ThumbsUp,
  Truck,
  List,
} from 'lucide-react';
import { formatVehicleDisplay, formatDriverDisplay, formatMineSiteDisplay } from '@/lib/displayFormatters';

interface VehicleBreakdownTrackerProps {
  breakdown: VehicleBreakdown;
  onBack: () => void;
}

export function VehicleBreakdownTracker({ breakdown, onBack }: VehicleBreakdownTrackerProps) {
  // Format date helper
  const baseDate = breakdown.breakdownDate || '23-11-2026';
  const baseTime = breakdown.breakdownTime || '08:00 AM';

  // 15 Standard Stages from official specification
  const stages = [
    { num: '01', title: 'Breakdown Reported', icon: AlertTriangle, time: `${baseDate} 08:00 AM`, actor: breakdown.driver ? formatDriverDisplay(breakdown.driver) : 'Ramesh Behera', status: 'Completed' },
    { num: '02', title: 'Workshop Entry', icon: Building, time: `${baseDate} 08:20 AM`, actor: 'Transport Dept.', status: 'Completed' },
    { num: '03', title: 'Mechanic Assigned', icon: UserCheck, time: `${baseDate} 08:40 AM`, actor: 'Supervisor', status: 'Completed' },
    { num: '04', title: 'Under Inspection', icon: Search, time: `${baseDate} 09:00 AM`, actor: 'Mechanic', status: 'Completed' },
    { num: '05', title: 'Breakdown Reason (Photo / Video)', icon: Camera, time: `${baseDate} 09:30 AM`, actor: 'Mechanic', status: 'Completed' },
    { num: '06', title: 'Repair Approval Pending', icon: FileCheck, time: `${baseDate} 10:00 AM`, actor: 'Transport Manager', status: 'Completed' },
    { num: '07', title: 'Repair Approved', icon: Check, time: `${baseDate} 10:30 AM`, actor: 'Manager', status: 'Completed' },
    { num: '08', title: 'Prepared Purchases Order', icon: ShoppingCart, time: `${baseDate} 11:00 AM`, actor: 'Store Dept.', status: 'Completed' },
    { num: '09', title: 'Purchases Order Approved', icon: CheckCircle2, time: `${baseDate} 11:30 AM`, actor: 'Purchase Head', status: 'Completed' },
    { num: '10', title: 'Spare Parts Receive In Workshop', icon: Package, time: `${baseDate} 12:30 PM`, actor: 'Store Incharge', status: 'Completed' },
    { num: '11', title: 'Repair Work In Progress', icon: Wrench, time: `${baseDate} 01:00 PM`, actor: 'Mechanic', status: 'Completed' },
    { num: '12', title: 'Repair Completed', icon: Flag, time: `${baseDate} 03:00 PM`, actor: 'Mechanic', status: 'Completed' },
    { num: '13', title: 'Trial / Testing', icon: RotateCcw, time: `${baseDate} 03:30 PM`, actor: 'Driver', status: 'Completed' },
    { num: '14', title: 'Ready for Operation', icon: ThumbsUp, time: `${baseDate} 04:00 PM`, actor: 'Supervisor', status: 'Completed' },
    { num: '15', title: 'Vehicle Running', icon: Truck, time: `${baseDate} 04:30 PM`, actor: 'Driver', status: 'Final Status' },
  ];

  // Map breakdown actual status to active index
  let activeIndex = 14; // Default to completed 15 stages
  if (breakdown.repairStatus === 'Reported') activeIndex = 0;
  else if (breakdown.repairStatus === 'In Workshop') activeIndex = 4;
  else if (breakdown.repairStatus === 'Awaiting Parts') activeIndex = 7;
  else if (breakdown.repairStatus === 'Approved') activeIndex = 10;
  else if (breakdown.repairStatus === 'Repaired') activeIndex = 12;
  else if (breakdown.repairStatus === 'Closed') activeIndex = 14;

  const downloadReport = () => {
    window.print();
  };

  const calculatedDuration = breakdown.downtimeHours ? `${breakdown.downtimeHours} Hours` : '8 Hours 30 Min';
  const totalCost = breakdown.totalCost && breakdown.totalCost > 0 ? breakdown.totalCost : 8000;

  return (
    <div className="space-y-4">
      {/* 1. Header Banner */}
      <div className="bg-blue-600 rounded-t-xl px-5 py-3.5 text-white flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-2.5">
          <div className="p-1.5 bg-blue-700/80 rounded-lg">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-base sm:text-lg font-bold tracking-tight">Vehicle Breakdown Tracking</h1>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-700/80 hover:bg-blue-800 rounded-md transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to List</span>
        </button>
      </div>

      {/* 2. Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Breakdown Details (5 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Breakdown Details</h2>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Vehicle No. :</span>
                <span className="font-bold text-blue-700 font-mono text-sm">
                  {formatVehicleDisplay(breakdown.vehicle)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Vehicle Type :</span>
                <span className="font-semibold text-slate-800">HYVA Tipper / Dump Truck</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">OCP / Area :</span>
                <span className="font-semibold text-slate-800">
                  {breakdown.mineSite ? formatMineSiteDisplay(breakdown.mineSite) : 'Bharatpur OCP'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Driver Name :</span>
                <span className="font-semibold text-slate-800">
                  {breakdown.driver ? formatDriverDisplay(breakdown.driver) : 'Ramesh Behera'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Breakdown Date & Time :</span>
                <span className="font-medium text-slate-800 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {breakdown.breakdownDate} {breakdown.breakdownTime || '08:00 AM'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Location :</span>
                <span className="font-semibold text-slate-800">
                  {breakdown.breakdownLocation || 'Bharatpur Mine Road'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500 font-medium">Breakdown Reason :</span>
                <span className="font-bold text-rose-700">
                  {breakdown.description || breakdown.breakdownType || 'Engine Overheating'}
                </span>
              </div>

              {/* Photo Preview */}
              <div className="pt-2">
                <div className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-100 aspect-video flex items-center justify-center">
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Truck className="w-12 h-12 text-slate-400" />
                    <span className="text-[11px] mt-1 font-medium text-slate-500">Inspection Capture</span>
                  </div>
                  <div className="absolute right-2 bottom-2">
                    <button
                      type="button"
                      className="inline-flex items-center space-x-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-sm"
                    >
                      <Camera className="w-3 h-3" />
                      <span>View Photo</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Metric Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-lg flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-full">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-600 block">Breakdown Duration</span>
                <span className="text-sm font-bold text-emerald-800">{calculatedDuration}</span>
              </div>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center space-x-3">
              <div className="p-2 bg-blue-100 text-blue-700 rounded-full">
                <Wrench className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-medium text-slate-600 block">Repair Cost</span>
                <span className="text-sm font-bold text-blue-900 font-mono">₹ {totalCost.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: 15 Status Progress Stages (8 cols) */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Status Progress</h2>
            </div>

            <div className="divide-y divide-slate-100">
              {stages.map((st, idx) => {
                const isCurrent = idx === activeIndex;
                const isPast = idx <= activeIndex;
                const IconComponent = st.icon;

                return (
                  <div
                    key={st.num}
                    className={`px-4 py-2.5 flex items-center justify-between text-xs transition-colors ${
                      isCurrent && idx === 14
                        ? 'bg-emerald-50/80 font-medium'
                        : isCurrent
                        ? 'bg-blue-50/60 font-medium'
                        : 'hover:bg-slate-50/70'
                    }`}
                  >
                    {/* Left: Number and title */}
                    <div className="flex items-center space-x-3 min-w-[240px]">
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                          idx === 14 && isPast
                            ? 'bg-emerald-600 text-white'
                            : isPast
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {st.num}
                      </span>
                      <IconComponent className={`w-4 h-4 ${isPast ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span className={`text-xs ${isPast ? 'text-slate-900 font-semibold' : 'text-slate-500'}`}>
                        {st.title}
                      </span>
                    </div>

                    {/* Middle: Timestamp & Actor */}
                    <div className="hidden sm:flex items-center space-x-6 text-slate-600">
                      <span className="font-mono text-[11px] text-slate-500">{st.time}</span>
                      <span className="text-slate-700 font-medium w-28 text-left truncate">{st.actor}</span>
                    </div>

                    {/* Right: Badge */}
                    <div>
                      {isPast ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            idx === 14
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          <Check className="w-3 h-3 mr-1" />
                          {idx === 14 ? 'Final Status' : 'Completed'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-500">
                          Pending
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Bottom Section: Status History Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="bg-blue-700 px-4 py-3 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <List className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Status History</h3>
          </div>
          <button
            type="button"
            onClick={downloadReport}
            className="inline-flex items-center space-x-1.5 px-3 py-1 bg-white text-blue-800 hover:bg-slate-100 rounded text-xs font-semibold shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-blue-700" />
            <span>Download Report</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-700 font-semibold uppercase border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4 w-16">Sl. No.</th>
                <th className="py-2.5 px-4 w-44">Date & Time</th>
                <th className="py-2.5 px-4 w-48">Status</th>
                <th className="py-2.5 px-4">Remarks</th>
                <th className="py-2.5 px-4 w-36">Updated By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              <tr className="hover:bg-slate-50/60">
                <td className="py-2.5 px-4 font-mono font-medium">1</td>
                <td className="py-2.5 px-4 font-mono">{baseDate} 08:00 AM</td>
                <td className="py-2.5 px-4 font-semibold text-slate-900">Breakdown Reported</td>
                <td className="py-2.5 px-4 text-slate-600">{breakdown.description || 'Engine Overheating'}</td>
                <td className="py-2.5 px-4 font-medium text-slate-700">{breakdown.driver ? formatDriverDisplay(breakdown.driver) : 'Ramesh Behera'}</td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-2.5 px-4 font-mono font-medium">2</td>
                <td className="py-2.5 px-4 font-mono">{baseDate} 08:20 AM</td>
                <td className="py-2.5 px-4 font-semibold text-slate-900">Workshop Entry</td>
                <td className="py-2.5 px-4 text-slate-600">Vehicle sent to Workshop</td>
                <td className="py-2.5 px-4 font-medium text-slate-700">Transport Dept.</td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-2.5 px-4 font-mono font-medium">3</td>
                <td className="py-2.5 px-4 font-mono">{baseDate} 08:40 AM</td>
                <td className="py-2.5 px-4 font-semibold text-slate-900">Mechanic Assigned</td>
                <td className="py-2.5 px-4 text-slate-600">Mechanic: Suresh Kumar</td>
                <td className="py-2.5 px-4 font-medium text-slate-700">Supervisor</td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-2.5 px-4 font-mono font-medium">4</td>
                <td className="py-2.5 px-4 font-mono">{baseDate} 09:30 AM</td>
                <td className="py-2.5 px-4 font-semibold text-slate-900">Breakdown Reason</td>
                <td className="py-2.5 px-4 text-slate-600">Inspected coolant leakage and head gasket</td>
                <td className="py-2.5 px-4 font-medium text-slate-700">Mechanic</td>
              </tr>
              <tr className="hover:bg-slate-50/60">
                <td className="py-2.5 px-4 font-mono font-medium">5</td>
                <td className="py-2.5 px-4 font-mono">{baseDate} 04:30 PM</td>
                <td className="py-2.5 px-4 font-semibold text-emerald-800">Vehicle Running</td>
                <td className="py-2.5 px-4 text-slate-600">Road test satisfactory. Handed over to driver.</td>
                <td className="py-2.5 px-4 font-medium text-slate-700">Driver</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
