'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  clientNavigationSections,
  administrationNavSection,
  ClientNavSection,
} from '@/config/navigation';
import { useBranding } from '@/context/BrandingContext';
import { useAuth } from '@/context/AuthContext';
import {
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Settings2,
  Home,
} from 'lucide-react';

interface SidebarProps {
  className?: string;
}

let inMemorySidebarScroll = 0;

export function Sidebar({ className = '' }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { branding } = useBranding();
  const { hasRole } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);
  const isRestoringRef = useRef(true);

  // Conventional single-open accordion: All groups CLOSED by default on fresh load / reload.
  // Only the user's explicit click expands a group; clicking another closes the previous.
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);

  const toggleSection = (sectionId: string) => {
    setOpenSectionId((prev) => (prev === sectionId ? null : sectionId));
  };

  // Helper to persist scroll position on link click
  const saveScroll = useCallback(() => {
    if (scrollRef.current) {
      const top = scrollRef.current.scrollTop;
      if (top > 0) {
        inMemorySidebarScroll = top;
        try {
          sessionStorage.setItem('uptoware_sidebar_scroll', String(top));
        } catch {
          // ignore storage errors
        }
      }
      isRestoringRef.current = true;
    }
  }, []);

  // Restore sidebar scroll position on route changes without mutating accordion open state
  useEffect(() => {
    isRestoringRef.current = true;

    const restoreScroll = () => {
      if (!scrollRef.current) return;
      let target = inMemorySidebarScroll;
      try {
        const saved = sessionStorage.getItem('uptoware_sidebar_scroll');
        if (saved !== null) {
          const parsed = parseInt(saved, 10);
          if (!isNaN(parsed) && parsed > 0) target = parsed;
        }
      } catch {
        // ignore storage errors
      }

      if (target > 0) {
        scrollRef.current.scrollTop = target;
      }

      setTimeout(() => {
        isRestoringRef.current = false;
      }, 150);
    };

    restoreScroll();
    const t = setTimeout(restoreScroll, 50);
    return () => clearTimeout(t);
  }, [pathname, searchParams]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (isRestoringRef.current) return;
    const top = e.currentTarget.scrollTop;
    if (top > 0) {
      inMemorySidebarScroll = top;
      try {
        sessionStorage.setItem('uptoware_sidebar_scroll', String(top));
      } catch {
        // ignore storage errors
      }
    }
  };

  // Check if a link is active based on pathname and searchParams
  const isLinkActive = useCallback((href: string): boolean => {
    if (!href) return false;
    const [targetPath, targetQuery] = href.split('?');

    if (pathname !== targetPath) {
      return false;
    }

    if (!targetQuery) {
      if (searchParams.toString() === '') {
        return true;
      }
      if (searchParams.get('action') || searchParams.get('status') || searchParams.get('tab') || searchParams.get('report')) {
        return false;
      }
      return true;
    }

    const targetParams = new URLSearchParams(targetQuery);
    for (const [key, value] of targetParams.entries()) {
      if (searchParams.get(key) !== value) {
        return false;
      }
    }
    return true;
  }, [pathname, searchParams]);

  // Check if a section contains the currently active page (for visual indication when collapsed)
  const isSectionActive = useCallback((section: ClientNavSection): boolean => {
    if (pathname === section.href && searchParams.toString() === '') return true;
    if (section.items?.some((item) => isLinkActive(item.href))) return true;
    if (section.groups?.some((grp) => grp.items.some((item) => isLinkActive(item.href)))) return true;
    return false;
  }, [pathname, searchParams, isLinkActive]);

  const isHomeActive = pathname === '/' && searchParams.toString() === '';

  return (
    <aside
      className={`w-72 flex-shrink-0 bg-slate-900 border-r border-slate-800 hidden lg:flex flex-col min-h-screen text-slate-300 ${className}`}
    >
      {/* Brand & Organization Area with Official Uptoware Logo */}
      <div className="p-5 border-b border-slate-800">
        <Link href="/" className="flex flex-col gap-2" onClick={saveScroll}>
          <div className="relative w-44 h-10">
            <Image
              src={branding.assets.logoDark}
              alt={branding.name}
              fill
              priority
              sizes="(max-width: 768px) 100vw, 200px"
              className="object-contain object-left"
            />
          </div>
          <div className="text-[11px] font-semibold text-blue-400 tracking-wider uppercase">
            Fleet Management ERP
          </div>
        </Link>

        {/* Operational Status Pill */}
        <div className="mt-3 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 flex items-center justify-between">
          <span className="text-xs text-slate-300 font-medium">Enterprise Engine</span>
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Operational
          </span>
        </div>
      </div>

      {/* Navigation Sections */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 px-3 py-4 space-y-2.5 overflow-y-auto"
      >
        {/* Quick Link to Main Home Dashboard */}
        <div className="mb-2">
          <Link
            href="/"
            onClick={saveScroll}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
              isHomeActive
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Home className="w-4 h-4 text-blue-400" />
            <span>HOME DASHBOARD</span>
          </Link>
        </div>

        {/* Client's Exact Nine Main Sections (Closed by default; Single-open Accordion) */}
        {clientNavigationSections.map((section: ClientNavSection) => {
          const isExpanded = openSectionId === section.id;
          const currentActive = isSectionActive(section);
          const Icon = section.icon;

          return (
            <div
              key={section.id}
              className={`rounded-lg border transition-colors overflow-hidden ${
                currentActive
                  ? 'border-blue-500/50 bg-slate-950/60'
                  : 'border-slate-800/80 bg-slate-950/40'
              }`}
            >
              {/* Entire Section Heading Button (Toggles Accordion Expand/Collapse) */}
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors cursor-pointer select-none ${
                  currentActive
                    ? 'bg-slate-800/90 text-blue-300 font-bold border-l-2 border-blue-500'
                    : 'bg-slate-800/50 hover:bg-slate-800 text-slate-200'
                }`}
                aria-expanded={isExpanded}
                data-testid={`accordion-heading-${section.id}`}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      currentActive ? 'text-blue-400' : 'text-slate-400'
                    }`}
                  />
                  <span className="text-xs font-bold tracking-tight truncate">
                    {section.title}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                  {currentActive && !isExpanded && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Active Section" />
                  )}
                  {isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Submenu Items (Displayed ONLY when explicitly expanded by user) */}
              {isExpanded && (
                <div className="px-2 py-1.5 space-y-0.5 bg-slate-900/60 border-t border-slate-800/60">
                  {/* Direct Items (for single-tier sections) */}
                  {section.items && (
                    <div className="space-y-0.5">
                      {section.items.map((subItem) => {
                        const active = isLinkActive(subItem.href);
                        return (
                          <Link
                            key={subItem.name}
                            href={subItem.href}
                            onClick={saveScroll}
                            className={`flex items-center justify-between px-3 py-1.5 rounded text-[11px] font-medium transition-colors ${
                              active
                                ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`}
                          >
                            <span className="truncate">{subItem.name}</span>
                            {active && <ChevronRight className="w-3 h-3 text-blue-200 ml-1" />}
                          </Link>
                        );
                      })}
                    </div>
                  )}

                  {/* Multi-tier Child Groups (e.g., SPARE PARTS REPORT -> PURCHASES & SALES) */}
                  {section.groups && (
                    <div className="space-y-2 py-1">
                      {section.groups.map((group) => (
                        <div key={group.title} className="space-y-0.5">
                          <div className="px-2 pt-1 pb-0.5 text-[10px] font-bold tracking-wider uppercase text-blue-400/90 border-b border-slate-800/60 mb-0.5">
                            {group.title}
                          </div>
                          {group.items.map((subItem) => {
                            const active = isLinkActive(subItem.href);
                            return (
                              <Link
                                key={`${group.title}-${subItem.name}`}
                                href={subItem.href}
                                onClick={saveScroll}
                                className={`flex items-center justify-between px-3 py-1.5 rounded text-[11px] font-medium transition-colors pl-3 ${
                                  active
                                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                }`}
                              >
                                <span className="truncate">{subItem.name}</span>
                                {active && <ChevronRight className="w-3 h-3 text-blue-200 ml-1" />}
                              </Link>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Technical Administration Controls (Segregated at bottom; Collapsed by default) */}
        {hasRole(administrationNavSection.roles) && (
          <div className="pt-2">
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 overflow-hidden">
              <button
                type="button"
                onClick={() => toggleSection('admin-section')}
                className="w-full flex items-center justify-between px-3 py-2 bg-slate-800/40 hover:bg-slate-800 transition-colors text-left cursor-pointer"
                aria-expanded={openSectionId === 'admin-section'}
              >
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                  <Settings2 className="w-4 h-4 text-slate-400" />
                  <span className="text-[11px] uppercase tracking-wider">{administrationNavSection.title}</span>
                </div>
                {openSectionId === 'admin-section' ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              {openSectionId === 'admin-section' && (
                <div className="px-2 py-1.5 space-y-0.5 bg-slate-900/40 border-t border-slate-800/60">
                  {administrationNavSection.items.map((item) => {
                    const active = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        onClick={saveScroll}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded text-[11px] font-medium transition-colors ${
                          active
                            ? 'bg-blue-600 text-white font-semibold shadow-xs'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5 text-slate-400" />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* SLA / Cloud Health Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/60">
        <div className="p-2.5 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-start gap-2.5">
          <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-xs">
            <div className="font-semibold text-slate-200 text-[11px]">{branding.company}</div>
            <div className="text-slate-400 text-[10px] leading-tight mt-0.5">
              Client PDF Compliant Navigation
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
