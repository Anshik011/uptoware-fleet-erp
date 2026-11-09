/**
 * Centralized Branding & Appearance Configuration
 * Uptoware Fleet Management ERP
 *
 * All logos, brand names, visual styles, color tokens, and formatting standards
 * must be sourced from this configuration rather than hardcoded in individual components.
 */

export interface BrandingConfig {
  name: string;
  shortName: string;
  company: string;
  tagline: string;
  contact: {
    email: string;
    phone: string;
    website: string;
    location: string;
  };
  assets: {
    logo: string;
    logoDark: string;
    icon: string;
    favicon: string;
  };
  colors: {
    primary: string;
    primaryHover: string;
    primaryLight: string;
    accent: string;
    secondary: string;
    success: string;
    warning: string;
    danger: string;
    neutralBg: string;
    cardBg: string;
  };
  formatting: {
    locale: string;
    currency: string;
    currencySymbol: string;
    dateFormat: string;
    weightUnit: string;
    distanceUnit: string;
    volumeUnit: string;
  };
  terminology: Record<string, string>;
}

export const branding: BrandingConfig = {
  name: 'Uptoware Fleet Management',
  shortName: 'Uptoware Fleet',
  company: 'Uptoware Logistics & Mining Solutions',
  tagline: 'Simplifying Business. Digitally.',
  contact: {
    email: 'support@uptoware.com',
    phone: '+91 8480 508 761',
    website: 'https://uptoware.com',
    location: 'Bhubaneswar, Odisha, India',
  },
  assets: {
    logo: '/branding/logo.png',
    logoDark: '/branding/logo-dark.png',
    icon: '/branding/icon.png',
    favicon: '/branding/favicon.png',
  },
  colors: {
    primary: '#1e3a8a', // Deep Navy Blue
    primaryHover: '#172554',
    primaryLight: '#eff6ff',
    accent: '#2563eb', // Royal Blue
    secondary: '#475569', // Slate
    success: '#059669', // Emerald
    warning: '#d97706', // Amber
    danger: '#e11d48', // Rose
    neutralBg: '#f8fafc',
    cardBg: '#ffffff',
  },
  formatting: {
    locale: 'en-IN',
    currency: 'INR',
    currencySymbol: '₹',
    dateFormat: 'DD MMM YYYY',
    weightUnit: 'MT',
    distanceUnit: 'KM',
    volumeUnit: 'Litre',
  },
  // Clean business terms mapping
  terminology: {
    vehicle: 'Commercial Transport Unit',
    vehicles: 'Fleet Vehicles',
    trip: 'Mining Dispatch & Haul',
    trips: 'Mining Dispatches',
    fuelLog: 'Fuel Dispensation Record',
    breakdown: 'Vehicle Breakdown Incident',
    maintenance: 'Workshop Service & Repairs',
    driver: 'Designated Operator / Driver',
    statutory: 'Regulatory & Document Compliance',
    insurance: 'Commercial Insurance Policy',
    fitness: 'Fitness Certification',
    puc: 'Pollution Under Control (PUC)',
    roadTax: 'Commercial Road Tax Receipt',
    permit: 'Mining & Goods Transport Permit',
    expense: 'Fleet Operating Disbursement',
    spareParts: 'Mechanical Spares & Consumables',
  },
};

/**
 * Standardized Formatting Utilities
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat(branding.formatting.locale, {
    style: 'currency',
    currency: branding.formatting.currency,
    maximumFractionDigits: 0,
  }).format(amount || 0);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat(branding.formatting.locale).format(num || 0);
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(branding.formatting.locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return String(dateStr);
  }
}

export function formatDateTime(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(branding.formatting.locale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateStr);
  }
}

export function formatWeight(tons: number): string {
  return `${formatNumber(tons)} ${branding.formatting.weightUnit}`;
}

export function formatDistance(km: number): string {
  return `${formatNumber(km)} ${branding.formatting.distanceUnit}`;
}

