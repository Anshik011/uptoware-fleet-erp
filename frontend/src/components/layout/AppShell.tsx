'use client';

import React, { useState, ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { MobileNav } from './MobileNav';

interface AppShellProps {
  children: ReactNode;
  headerTitle?: string;
  headerSubtitle?: string;
  unreadAlertsCount?: number;
}

export function AppShell({
  children,
  headerTitle,
  headerSubtitle,
  unreadAlertsCount = 0,
}: AppShellProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  return (
    <div className="min-h-screen h-full flex antialiased bg-slate-50 text-slate-900 overflow-hidden">
      {/* Desktop / Laptop Sidebar */}
      <Sidebar />

      {/* Mobile / Tablet Navigation Drawer */}
      <MobileNav
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      {/* Main Application Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Header
          title={headerTitle}
          subtitle={headerSubtitle}
          unreadAlertsCount={unreadAlertsCount}
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
        />

        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
