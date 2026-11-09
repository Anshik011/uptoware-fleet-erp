'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { ReportViewer } from '@/components/procurement/ReportViewer';
import { FileSpreadsheet } from 'lucide-react';

export default function ReportsPage() {
  const [warehouses, setWarehouses] = useState<Array<{ id: string; name: string }>>([]);
  const [suppliers, setSuppliers] = useState<Array<{ id: string; name: string }>>([]);
  const [vehicles, setVehicles] = useState<Array<{ id: string; licensePlate: string }>>([]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await fetch('/api/inventory/options');
        const json = await res.json();
        if (res.ok && json.success) {
          if (json.warehouses) setWarehouses(json.warehouses);
          if (json.suppliers) setSuppliers(json.suppliers);
          if (json.vehicles) setVehicles(json.vehicles);
        }
      } catch (err) {
        console.warn('Could not load report options:', err);
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
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Inventory & Procurement Reports
              </h1>
              <p className="text-sm text-slate-500">
                16 native ERPNext Script Reports with parameter binding and live audit visibility
              </p>
            </div>
          </div>
        </div>

        {/* Report Runner & Viewer */}
        <ReportViewer
          warehouses={warehouses}
          suppliers={suppliers}
          vehicles={vehicles}
        />
      </PageContainer>
    </AppShell>
  );
}

