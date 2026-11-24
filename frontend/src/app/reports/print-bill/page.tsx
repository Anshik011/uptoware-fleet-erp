'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { VehicleIncomeBillFormat } from '@/components/finance/VehicleIncomeBillFormat';
import { Loader2 } from 'lucide-react';

function PrintBillContent() {
  const searchParams = useSearchParams();
  const vehicle = searchParams.get('vehicle') || '';
  const periodFrom = searchParams.get('from') || '01.01.2026';
  const periodTo = searchParams.get('to') || '15.01.2026';
  const autoPrint = searchParams.get('autoprint') === 'true';

  useEffect(() => {
    if (autoPrint) {
      const timer = setTimeout(() => {
        window.print();
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [autoPrint]);

  return (
    <div className="bg-white min-h-screen text-black p-0 m-0">
      <div className="max-w-[210mm] mx-auto p-4 sm:p-6 print:p-0 print:max-w-none">
        {/* Isolated Pure Bill */}
        <VehicleIncomeBillFormat
          vehicleNo={vehicle}
          periodFrom={periodFrom}
          periodTo={periodTo}
          isPrintView={true}
        />
      </div>
    </div>
  );
}

export default function PrintBillPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen text-slate-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-900" />
          <span>Preparing Official Bill...</span>
        </div>
      }
    >
      <PrintBillContent />
    </Suspense>
  );
}
