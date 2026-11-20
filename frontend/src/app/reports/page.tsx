'use client';

import React, { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { FinancialReportViewer } from '@/components/finance/FinancialReportViewer';
import { FileSpreadsheet, Loader2 } from 'lucide-react';

export default function ReportsPage() {
  return (
    <AppShell>
      <PageContainer>
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-slate-200 gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-blue-100 text-blue-700 rounded-lg">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Finance & Analytics Reports
              </h1>
              <p className="text-sm text-slate-500">
                Native ERPNext Query & Script Reports covering fleet revenue, operating costs, and commercial profitability
              </p>
            </div>
          </div>
        </div>

        <Suspense fallback={
          <div className="flex items-center justify-center p-12 text-slate-500 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>Loading report viewer...</span>
          </div>
        }>
          <FinancialReportViewer />
        </Suspense>
      </PageContainer>
    </AppShell>
  );
}
