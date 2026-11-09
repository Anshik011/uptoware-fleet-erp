'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { RefreshCw } from 'lucide-react';

export default function SettingsRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/admin?tab=settings');
  }, [router]);

  return (
    <AppShell headerTitle="Fleet System Settings" headerSubtitle="Redirecting to administration console...">
      <div className="p-12 text-center text-slate-400 space-y-3">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
        <p className="text-xs">Redirecting to Fleet System Settings...</p>
      </div>
    </AppShell>
  );
}

