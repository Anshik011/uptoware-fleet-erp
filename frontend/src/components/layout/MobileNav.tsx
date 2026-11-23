'use client';

import React, { useState, useCallback } from 'react';
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
  X,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Settings2,
  Home,
} from 'lucide-react';

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileNav({ isOpen, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { branding } = useBranding();
  const { hasRole } = useAuth();

  // Collapsed by default: all groups closed until user taps to expand
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);

  const toggleSection = (sectionId: string) => {
    setOpenSectionId((prev) => (prev === sectionId ? null : sectionId));
  };

  const isLinkActive = useCallback((href: string): boolean => {
    if (!href) return false;
    const [targetPath, targetQuery] = href.split('?');

    if (pathname !== targetPath) {
      return false;
    }

    if (!targetQuery) {
      if (searchParams.toString() === '') return true;
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

  const isSectionActive = useCallback((section: ClientNavSection): boolean => {
    if (pathname === section.href && searchParams.toString() === '') return true;
    if (section.items?.some((item) => isLinkActive(item.href))) return true;
    if (section.groups?.some((grp) => grp.items.some((item) => isLinkActive(item.href)))) return true;
    return false;
  }, [pathname, searchParams, isLinkActive]);

  if (!isOpen) return null;

  const isHomeActive = pathname === '/' && searchParams.toString() === '';

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden bg-slate-950/60 backdrop-blur-xs flex"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="w-4/5 max-w-xs bg-slate-900 border-r border-slate-800 h-full flex flex-col text-slate-300 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Brand & Close Button */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <Link href="/" onClick={onClose} className="flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 bg-white/10 p-1">
              <Image
                src={branding.assets.icon}
                alt={branding.name}
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <div>
              <div className="font-bold text-white tracking-tight text-sm leading-tight">
                {branding.shortName}
              </div>
              <div className="text-[10px] text-blue-400 font-medium tracking-wider uppercase">
                Fleet Management ERP
              </div>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
          {/* Quick Link to Main Home Dashboard */}
          <div>
            <Link
              href="/"
              onClick={onClose}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-colors ${
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
                {/* Entire Section Header Button */}
                <button
                  type="button"
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-left transition-colors cursor-pointer select-none ${
                    currentActive
                      ? 'bg-slate-800/90 text-blue-300 font-bold border-l-2 border-blue-500'
                      : 'bg-slate-800/50 hover:bg-slate-800 text-slate-200'
                  }`}
                  aria-expanded={isExpanded}
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

                {/* Submenu Items (Displayed only when tapped) */}
                {isExpanded && (
                  <div className="px-2 py-1.5 space-y-0.5 bg-slate-900/60 border-t border-slate-800/60">
                    {section.items && (
                      <div className="space-y-0.5">
                        {section.items.map((subItem) => {
                          const active = isLinkActive(subItem.href);
                          return (
                            <Link
                              key={subItem.name}
                              href={subItem.href}
                              onClick={onClose}
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
                                  onClick={onClose}
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

          {/* Technical Administration Controls (10. TECHNICAL & WORKSHOP CONTROLS; Uniform with sections 1-9) */}
          {hasRole(administrationNavSection.roles) && (() => {
            const isAdminActive = administrationNavSection.items.some(
              (item) => pathname === item.href || isLinkActive(item.href)
            );
            const isExpanded = openSectionId === 'admin-section';

            return (
              <div
                className={`rounded-lg border transition-colors overflow-hidden ${
                  isAdminActive
                    ? 'border-blue-500/50 bg-slate-950/60'
                    : 'border-slate-800/80 bg-slate-950/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => toggleSection('admin-section')}
                  className={`w-full flex items-center justify-between px-3 py-2.5 text-left transition-colors cursor-pointer select-none ${
                    isAdminActive
                      ? 'bg-slate-800/90 text-blue-300 font-bold border-l-2 border-blue-500'
                      : 'bg-slate-800/50 hover:bg-slate-800 text-slate-200'
                  }`}
                  aria-expanded={isExpanded}
                  data-testid="accordion-heading-admin-section-mobile"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Settings2
                      className={`w-4 h-4 flex-shrink-0 ${
                        isAdminActive ? 'text-blue-400' : 'text-slate-400'
                      }`}
                    />
                    <span className="text-xs font-bold tracking-tight truncate">
                      {administrationNavSection.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 ml-2 flex-shrink-0">
                    {isAdminActive && !isExpanded && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" title="Active Section" />
                    )}
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                    )}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-2 py-1.5 space-y-0.5 bg-slate-900/60 border-t border-slate-800/60">
                    {administrationNavSection.items.map((item) => {
                      const active = pathname === item.href || isLinkActive(item.href);
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.name}
                          href={item.href}
                          onClick={onClose}
                          className={`flex items-center justify-between px-3 py-1.5 rounded text-[11px] font-medium transition-colors pl-3 ${
                            active
                              ? 'bg-blue-600 text-white font-semibold shadow-xs'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                            <span className="truncate">{item.name}</span>
                          </div>
                          {active && <ChevronRight className="w-3 h-3 text-blue-200 ml-1 flex-shrink-0" />}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <span className="text-[11px]">Uptoware Cloud Architecture v16</span>
          </div>
        </div>
      </div>
    </div>
  );
}
