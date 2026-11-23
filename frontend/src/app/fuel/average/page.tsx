'use client';

import React, { Suspense } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageContainer } from '@/components/ui/PageContainer';
import { PageHeader } from '@/components/ui/PageHeader';
import { HsdAverageMenu } from '@/components/fuel/HsdAverageMenu';
import { Fuel, Loader2 } from 'lucide-react';

export default function HsdAveragePage() {
  return (
    <AppShell
      headerTitle="HSD Average Menu (Trip & KM Wise)"
      headerSubtitle="Dual-mode HSD consumption calculation per trip and per round-trip kilometre"
    >
      <PageContainer className="space-y-6">
        <PageHeader
          title="HSD Average Menu"
          subtitle="Trip Wise and KM Wise fuel consumption auditing across operational shifts"
          breadcrumbs={[
            { label: 'Dashboard', href: '/' },
            { label: 'Fuel Management', href: '/fuel' },
            { label: 'HSD Average Menu' },
          ]}
        />

        <Suspense
          fallback={
            <div className="flex items-center justify-center p-12 text-slate-500 gap-2">
              <Loader2 className="w-5 h-5 animate-spin text-blue-900" />
              <span>Loading HSD Average Menu...</span>
            </div>
          }
        >
          <HsdAverageMenu />
        </Suspense>
      </PageContainer>
    </AppShell>
  );
}
