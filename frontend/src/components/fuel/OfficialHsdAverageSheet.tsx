'use client';

import React from 'react';
import { Printer, X, CheckCircle2 } from 'lucide-react';
import { formatVehicleDisplay } from '@/lib/displayFormatters';

export interface ShiftTripAuditItem {
  id: string;
  date: string;
  shift: string;
  leadName: string;
  leadKm: number;
  tripCount: number;
}

interface OfficialHsdAverageSheetProps {
  vehicleNo: string;
  fillingDate: string;
  fillingShift: string;
  fuelFilledLitres: number;
  isFullTank?: boolean;
  cycleTrips: ShiftTripAuditItem[];
  isPrintView?: boolean;
  onClose?: () => void;
  onPrint?: () => void;
}

export function OfficialHsdAverageSheet({
  vehicleNo,
  fillingDate,
  fillingShift,
  fuelFilledLitres,
  isFullTank = true,
  cycleTrips,
  isPrintView = false,
  onClose,
  onPrint,
}: OfficialHsdAverageSheetProps) {
  // Aggregate math
  const totalTripCount = cycleTrips.reduce((acc, t) => acc + (Number(t.tripCount) || 0), 0);
  const totalOneWayKm = cycleTrips.reduce((acc, t) => acc + (Number(t.leadKm) || 0), 0);
  const totalRoundTripKm = totalOneWayKm * 2;

  // Client Trip-Wise Formula: HSD Filling / Trip Count
  const tripWiseAvg = totalTripCount > 0 ? (fuelFilledLitres / totalTripCount).toFixed(2) : '0.00';

  // Client KM-Wise Formula: HSD Filling / (KM Count * 2)
  const kmWiseAvg = totalRoundTripKm > 0 ? (fuelFilledLitres / totalRoundTripKm).toFixed(2) : '0.00';

  // Format date helper (e.g. 2026-11-23 -> 23.11.2026)
  const formatDateDisplay = (dStr: string) => {
    if (!dStr) return '';
    if (dStr.includes('.')) return dStr;
    const parts = dStr.split('-');
    if (parts.length === 3) return `${parts[2]}.${parts[1]}.${parts[0]}`;
    return dStr;
  };

  const formattedFillingDate = formatDateDisplay(fillingDate);
  const earliestDate = cycleTrips.length > 0 ? formatDateDisplay(cycleTrips[0].date) : formattedFillingDate;

  const handlePrintClick = () => {
    if (onPrint) {
      onPrint();
    } else {
      window.print();
    }
  };

  return (
    <div className={`bg-white text-black font-sans ${isPrintView ? 'p-0' : 'p-6 max-w-4xl mx-auto'}`}>
      {/* Top Action Ribbon (Hidden in Print) */}
      {!isPrintView && (
        <div className="mb-4 flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Official HSD Average Assessment Sheet (1-Page Print Format)
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-900 text-white text-xs font-bold hover:bg-blue-800 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print 1-Page Sheet
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                title="Close Sheet"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Official Sheet Container (Strict Single-Page A4 Contract) */}
      <div className="border-2 border-black p-4 sm:p-5 text-[11px] leading-tight text-black bg-white">
        {/* Header Block */}
        <div className="text-center border-b-2 border-black pb-2.5 mb-2.5">
          <div className="text-[10px] font-bold tracking-widest uppercase text-slate-700">
            MINING HAULAGE & LOGISTICS FLEET MANAGEMENT
          </div>
          <h1 className="text-base sm:text-lg font-black uppercase tracking-tight text-black mt-0.5">
            UPTOWARE LOGISTICS & MINING SOLUTIONS
          </h1>
          <p className="text-[10px] text-slate-800 font-medium">
            Talcher Coalfield Site Operations | Lingaraj OCP & Ananta Haulage Sector
          </p>
          <div className="mt-1.5 inline-block border-y border-black py-0.5 px-4 font-black uppercase tracking-wider text-xs bg-slate-100">
            HSD AVERAGE CONSUMPTION & FUEL AUDIT SHEET
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-2.5 text-[11px] border border-black p-2 bg-slate-50/60">
          <div className="flex">
            <span className="font-bold w-36 text-slate-900">Vehicle Number:</span>
            <span className="font-mono font-bold text-slate-950 uppercase">
              {formatVehicleDisplay(vehicleNo)}
            </span>
          </div>
          <div className="flex">
            <span className="font-bold w-36 text-slate-900">Audit Sheet Ref No:</span>
            <span className="font-mono font-bold text-slate-950">
              HSD/AVG/{formattedFillingDate?.replace(/\./g, '')}/{vehicleNo.replace(/[^a-zA-Z0-9]/g, '')}
            </span>
          </div>
          <div className="flex">
            <span className="font-bold w-36 text-slate-900">HSD Filling Date:</span>
            <span className="font-mono font-semibold text-slate-950">{formattedFillingDate}</span>
          </div>
          <div className="flex">
            <span className="font-bold w-36 text-slate-900">Filling Shift Cycle:</span>
            <span className="font-semibold text-slate-950">{fillingShift} (End of Shift Refueling)</span>
          </div>
          <div className="flex">
            <span className="font-bold w-36 text-slate-900">HSD Dispensed:</span>
            <span className="font-mono font-black text-black">
              {fuelFilledLitres.toFixed(2)} Litres
            </span>
          </div>
          <div className="flex">
            <span className="font-bold w-36 text-slate-900">Tank Condition:</span>
            <span className="font-bold text-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-700" />
              {isFullTank ? 'Full Tank Certified (Top-to-Top Method)' : 'Partial Filling'}
            </span>
          </div>
        </div>

        {/* Operational Shift Cycle Breakdown Table */}
        <div className="mb-2.5">
          <div className="text-[10px] font-black uppercase tracking-wider text-black mb-1 bg-slate-200 px-2 py-0.5 border border-black">
            Operational Shift Cycle Prior to Full Tank Filling
          </div>
          <table className="w-full border-collapse border border-black text-center text-[10px]">
            <thead>
              <tr className="bg-slate-100 font-bold border-b border-black">
                <th className="border border-black py-1 px-1.5 w-8">SL</th>
                <th className="border border-black py-1 px-2 w-24">Date</th>
                <th className="border border-black py-1 px-2 w-24">Shift</th>
                <th className="border border-black py-1 px-2 text-left">Haulage Lead / Route Name</th>
                <th className="border border-black py-1 px-2 w-28">1-Way Lead (KM)</th>
                <th className="border border-black py-1 px-2 w-24">Trip Count</th>
                <th className="border border-black py-1 px-2 w-32">Round-Trip KM (2&times;)</th>
              </tr>
            </thead>
            <tbody>
              {cycleTrips.map((row, idx) => {
                const roundTrip = (Number(row.leadKm) || 0) * (Number(row.tripCount) || 1) * 2;
                return (
                  <tr key={row.id || idx} className="border-b border-black/70 font-mono">
                    <td className="border border-black py-1 px-1">{idx + 1}</td>
                    <td className="border border-black py-1 px-1.5">{formatDateDisplay(row.date)}</td>
                    <td className="border border-black py-1 px-1.5 font-bold font-sans">{row.shift}</td>
                    <td className="border border-black py-1 px-2 text-left font-sans">{row.leadName}</td>
                    <td className="border border-black py-1 px-2 text-right">{(Number(row.leadKm) || 0).toFixed(1)} KM</td>
                    <td className="border border-black py-1 px-2 text-right font-bold">{row.tripCount}</td>
                    <td className="border border-black py-1 px-2 text-right font-bold">{roundTrip.toFixed(1)} KM</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 border-t-2 border-black font-bold font-mono">
                <td colSpan={4} className="border border-black py-1 px-2 text-left font-sans text-[10px] uppercase">
                  Total Operational Cycle (Shift B + Shift C + Shift A)
                </td>
                <td className="border border-black py-1 px-2 text-right">
                  {totalOneWayKm.toFixed(1)} KM
                </td>
                <td className="border border-black py-1 px-2 text-right font-black text-black">
                  {totalTripCount} Trips
                </td>
                <td className="border border-black py-1 px-2 text-right font-black text-black">
                  {totalRoundTripKm.toFixed(1)} KM
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Dual Mode Calculations Grid (Exactly as Client Sheet) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-2.5">
          {/* Box 1: Trip Wise */}
          <div className="border-2 border-black p-2.5 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-black pb-1 mb-1.5">
                <span className="text-[11px] font-black uppercase text-black">
                  1. TRIP WISE HSD AVERAGE
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded border border-black bg-white">
                  TYPE 1
                </span>
              </div>
              <div className="space-y-1 font-mono text-[10.5px]">
                <div className="font-bold text-slate-900">
                  HSD AVG FORMULA IS = &#123; HSD FILLING / TRIP COUNT (SHIFT B + SHIFT C + SHIFT A) &#125;
                </div>
                <div className="text-slate-800">
                  = {fuelFilledLitres.toFixed(2)} LT / {cycleTrips.map((t) => t.tripCount).join('+')}
                </div>
                <div className="text-slate-800">
                  = {fuelFilledLitres.toFixed(2)} / {totalTripCount}
                </div>
                <div className="text-sm font-black text-black pt-1 border-t border-black/40">
                  = {tripWiseAvg} Per Trip
                </div>
              </div>
            </div>
            <div className="mt-2 pt-1.5 border-t border-black/30 text-[9.5px] text-slate-700 leading-snug">
              <span className="font-bold text-black">Note:</span> Shift B or Shift C is Dt. {earliestDate} and Shift A is Dt. {formattedFillingDate}. HSD count is filling Dt. {formattedFillingDate} after end Shift A.
            </div>
          </div>

          {/* Box 2: KM Wise */}
          <div className="border-2 border-black p-2.5 bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-black pb-1 mb-1.5">
                <span className="text-[11px] font-black uppercase text-black">
                  2. KM WISE HSD AVERAGE
                </span>
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded border border-black bg-white">
                  TYPE 2
                </span>
              </div>
              <div className="space-y-1 font-mono text-[10.5px]">
                <div className="font-bold text-slate-900">
                  HSD AVG FORMULA IS = &#123; HSD FILLING / KM COUNT (SHIFT B + SHIFT C + SHIFT A) &times; 2 &#125;
                </div>
                <div className="text-slate-800">
                  = {fuelFilledLitres.toFixed(2)} LT / ({cycleTrips.map((t) => t.leadKm).join('+')} = {totalOneWayKm.toFixed(1)} &times; 2 = {totalRoundTripKm.toFixed(1)})
                </div>
                <div className="text-slate-800">
                  = {fuelFilledLitres.toFixed(2)} / {totalRoundTripKm.toFixed(1)}
                </div>
                <div className="text-sm font-black text-black pt-1 border-t border-black/40">
                  = {kmWiseAvg} Per KM
                </div>
              </div>
            </div>
            <div className="mt-2 pt-1.5 border-t border-black/30 text-[9.5px] text-slate-700 leading-snug">
              <span className="font-bold text-black">Note:</span> Shift B or Shift C is Dt. {earliestDate} and Shift A is Dt. {formattedFillingDate}. HSD count is filling Dt. {formattedFillingDate} after end Shift A.
            </div>
          </div>
        </div>

        {/* Audit Certification Statement */}
        <div className="border border-black p-2 mb-4 bg-slate-50 text-[10px] text-slate-900">
          <p>
            <strong>Operational Verification & Certification:</strong> This HSD Average Assessment is audited against certified bowser dispensing receipts, shift vehicle logbooks, and computerised weighbridge gross/tare records. Fuel consumption factors both static coal hauling shifts and active round-trip transit.
          </p>
        </div>

        {/* Official 3-Party Signatures */}
        <div className="grid grid-cols-3 gap-6 pt-5 border-t-2 border-black text-center text-[10px]">
          <div>
            <div className="h-10 border-b border-dashed border-black mb-1" />
            <div className="font-bold uppercase text-slate-900">Fuel Bowser Operator</div>
            <div className="text-[9px] text-slate-600">Dispensation & Tank Certification</div>
          </div>
          <div>
            <div className="h-10 border-b border-dashed border-black mb-1" />
            <div className="font-bold uppercase text-slate-900">Fleet Maintenance Incharge</div>
            <div className="text-[9px] text-slate-600">Mechanical & Odometer Verification</div>
          </div>
          <div>
            <div className="h-10 border-b border-dashed border-black mb-1" />
            <div className="font-bold uppercase text-slate-900">Mine Operations Manager</div>
            <div className="text-[9px] text-slate-600">Authorised Approval Signatory</div>
          </div>
        </div>
      </div>
    </div>
  );
}
