'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { ComplianceReportViewer } from '@/components/compliance/ComplianceReportViewer';
import { FileSpreadsheet, ShieldCheck, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function ComplianceReportsPage() {
  const [vehicles, setVehicles] = useState<Array<{ name: string; license_plate: string }>>([]);
  const [insuranceCompanies, setInsuranceCompanies] = useState<string[]>([]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await fetch('/api/insurance/options');
        const json = await res.json();
        if (res.ok && json.success) {
          if (json.vehicles) setVehicles(json.vehicles);
          if (json.companies) setInsuranceCompanies(json.companies);
        }
      } catch (err) {
        console.warn('Could not load compliance report options:', err);
      }
    }
    loadOptions();
  }, []);

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
              <div className="flex items-center gap-2">
                <Link
                  href="/compliance"
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-3 h-3" />
                  Back to Compliance
                </Link>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
                Statutory Compliance & Insurance Reports
              </h1>
              <p className="text-sm text-slate-500">
                7 native ERPNext Script Reports with parameter binding, live audit visibility, and CSV export
              </p>
            </div>
          </div>
        </div>

        {/* Report Runner & Viewer */}
        <ComplianceReportViewer
          vehicles={vehicles}
          insuranceCompanies={insuranceCompanies}
        />
      </PageContainer>
    </AppShell>
  );
}

