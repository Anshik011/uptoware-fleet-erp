'use client';

import React, { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { AllReportsHub } from '@/components/reports/AllReportsHub';
import { FileSpreadsheet, Loader2 } from 'lucide-react';

export default function AllReportsPage() {
  return (
    <AppShell>
      <PageContainer>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-900 rounded-lg">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                All Reports Center
              </h1>
              <p className="text-sm text-slate-500">
                Unified access to all Operations, Fuel, HR Attendance, Finance, Spare Parts, and Compliance reports with Excel, PDF, and multi-filter support.
              </p>
            </div>
          </div>
        </div>

        <Suspense
          fallback={
            <div className="flex items-center justify-center p-12 text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              <span>Loading All Reports Hub...</span>
            </div>
          }
        >
          <AllReportsHub />
        </Suspense>
      </PageContainer>
    </AppShell>
  );
}
