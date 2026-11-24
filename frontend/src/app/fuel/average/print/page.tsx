'use client';

import React, { useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { OfficialHsdAverageSheet, ShiftTripAuditItem } from '@/components/fuel/OfficialHsdAverageSheet';
import { Loader2, Printer, X } from 'lucide-react';
import { toLocalDateString } from '@/lib/datetime';

function PrintHsdAverageContent() {
  const searchParams = useSearchParams();

  const vehicle = searchParams.get('vehicle') || '';
  const date = searchParams.get('date') || toLocalDateString();
  const shift = searchParams.get('shift') || 'Shift A';
  const litres = parseFloat(searchParams.get('litres') || '0') || 0;
  const isFullTank = searchParams.get('fulltank') !== 'false';
  const autoPrint = searchParams.get('autoprint') === 'true';

  // Decode cycleTrips from URL
  const cycleTrips: ShiftTripAuditItem[] = useMemo(() => {
    const rawTrips = searchParams.get('trips');
    if (rawTrips) {
      try {
        const parsed = JSON.parse(decodeURIComponent(rawTrips));
        if (Array.isArray(parsed)) {
          return parsed;
        }
      } catch (err) {
        console.warn('Failed to parse trips from search params:', err);
      }
    }
    return [];
  }, [searchParams]);

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  return (
    <div className="bg-white min-h-screen text-black p-0 m-0 print:p-0">
      {/* Action Bar for Manual Print/Close (Hidden during actual print) */}
      <div className="bg-slate-900 text-white px-6 py-3 flex items-center justify-between print:hidden shadow-md">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-bold tracking-wide uppercase">
            Official HSD Fuel Average Assessment Sheet &bull; Print Preview
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
          >
            <Printer className="w-3.5 h-3.5" />
            Print 1-Page Sheet (A4)
          </button>
          <button
            type="button"
            onClick={() => window.close()}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Close
          </button>
        </div>
      </div>

      {/* Main Single-Page A4 Sheet */}
      <div className="max-w-[210mm] mx-auto p-4 sm:p-6 print:p-0 print:max-w-none">
        <OfficialHsdAverageSheet
          vehicleNo={vehicle}
          fillingDate={date}
          fillingShift={shift}
          fuelFilledLitres={litres}
          isFullTank={isFullTank}
          cycleTrips={cycleTrips}
          isPrintView={true}
        />
      </div>
    </div>
  );
}

export default function PrintHsdAveragePage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen text-slate-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-900" />
          <span>Generating Official HSD Average Sheet...</span>
        </div>
      }
    >
      <PrintHsdAverageContent />
    </Suspense>
  );
}
