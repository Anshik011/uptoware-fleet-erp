/**
 * Uptoware Fleet ERP - Human-Readable Display Formatters
 *
 * Replaces internal Frappe/ERPNext document IDs (DEMO-OD-*, HR-DRI-*, PART-*, JBR-*)
 * with human-readable labels across all user-facing screens while preserving
 * underlying identifiers for database queries, API routing, and audit records.
 */

export interface VehicleLookup {
  id: string;
  licensePlate?: string;
  make?: string;
  model?: string;
}

export interface DriverLookup {
  id?: string;
  name?: string;
  fullName?: string;
}

export interface MineSiteLookup {
  id?: string;
  name?: string;
  siteName?: string;
}

export interface ItemLookup {
  itemCode?: string;
  itemName?: string;
}

export const KNOWN_VEHICLES: Record<
  string,
  { plate: string; make: string; model: string; label: string }
> = {
  'DEMO-OD-01': {
    plate: 'OD-05-BB-1001',
    make: 'BharatBenz',
    model: '3128T',
    label: 'BharatBenz 3128T (OD-05-BB-1001)',
  },
  'DEMO-OD-02': {
    plate: 'OD-05-TP-2002',
    make: 'Tata Prima',
    model: '2830.K',
    label: 'Tata Prima 2830.K (OD-05-TP-2002)',
  },
  'DEMO-OD-03': {
    plate: 'OD-05-AL-3003',
    make: 'Ashok Leyland',
    model: '2820',
    label: 'Ashok Leyland 2820 (OD-05-AL-3003)',
  },
  'DEMO-OD-04': {
    plate: 'OD-05-SC-4004',
    make: 'Scania',
    model: 'G460',
    label: 'Scania G460 (OD-05-SC-4004)',
  },
};

export const KNOWN_DRIVERS: Record<string, string> = {
  'HR-DRI-2026-00393': 'Rajesh Kumar',
  'HR-DRI-2026-00394': 'Suresh Verma',
  'HR-DRI-2026-00395': 'Ramesh Patel',
  'HR-DRI-2026-00396': 'Manoj Singh',
  'HR-EMP-2026-00393': 'Rajesh Kumar',
  'HR-EMP-2026-00394': 'Suresh Verma',
  'HR-EMP-2026-00395': 'Ramesh Patel',
  'HR-EMP-2026-00396': 'Manoj Singh',
  'HR-EMP-00034': 'Rajesh Kumar',
  'HR-EMP-00035': 'Suresh Verma',
  'HR-EMP-00036': 'Ramesh Patel',
  'HR-EMP-00037': 'Manoj Singh',
  'Demo Driver 01': 'Rajesh Kumar',
  'Demo Driver 02': 'Suresh Verma',
  'Demo Driver 03': 'Ramesh Patel',
  'Demo Driver 04': 'Manoj Singh',
};

export const KNOWN_MINE_SITES: Record<string, string> = {
  'JBR-TALCHER': 'JBR Eastern — Talcher Site',
  'JBR-IB-VALLEY': 'JBR Western — Ib Valley Site',
  'JBR-SUKINDA': 'JBR Chromite — Sukinda Site',
  'JBR-Talcher': 'JBR Eastern — Talcher Site',
  'JBR-Ib-Valley': 'JBR Western — Ib Valley Site',
  'JBR-Sukinda': 'JBR Chromite — Sukinda Site',
};

export const KNOWN_SPARE_PARTS: Record<string, string> = {
  'PART-FIL-001': 'Heavy Duty Diesel Fuel Filter',
  'PART-BRK-002': 'Brake Lining Kit (Heavy Commercial)',
  'PART-TYR-003': 'Radial Mining Tyre (12.00R20)',
  'PART-OIL-004': '15W-40 CI-4 Heavy Engine Oil',
  'PART-HYD-005': 'Hydraulic Hose Assembly (High Pressure)',
};

/**
 * Formats a vehicle identifier into a human-readable registration plate or model name.
 */
export function formatVehicleDisplay(
  vehicleId?: string | null,
  vehicles?: VehicleLookup[],
  options?: { plateOnly?: boolean; includeModel?: boolean }
): string {
  if (!vehicleId) return 'Unassigned Unit';

  // 1. Check known vehicle registry map
  if (KNOWN_VEHICLES[vehicleId]) {
    const v = KNOWN_VEHICLES[vehicleId];
    if (options?.includeModel) return v.label;
    return v.plate;
  }

  // 2. Check dynamic vehicles list if provided
  if (vehicles && vehicles.length > 0) {
    const match = vehicles.find(
      (v) => v.id === vehicleId || v.licensePlate === vehicleId
    );
    if (match) {
      if (options?.includeModel && match.make && match.model) {
        return match.licensePlate
          ? `${match.make} ${match.model} (${match.licensePlate})`
          : `${match.make} ${match.model}`;
      }
      if (match.licensePlate) return match.licensePlate;
    }
  }

  // 3. If ID already looks like an Indian registration plate (e.g., OD-05-BB-1001, MH-12-...)
  if (/^[A-Z]{2}[-\s]?\d{2}[-\s]?[A-Z0-9]{1,4}[-\s]?\d{1,4}$/i.test(vehicleId)) {
    return vehicleId;
  }

  return vehicleId;
}

/**
 * Formats a driver identifier into a human-readable full name.
 */
export function formatDriverDisplay(
  driverIdOrName?: string | null,
  driverName?: string | null,
  drivers?: DriverLookup[]
): string {
  const key = driverIdOrName || driverName;
  if (!key) return 'Unassigned Driver';

  // 1. Check known driver map for primary key
  if (KNOWN_DRIVERS[key]) {
    return KNOWN_DRIVERS[key];
  }

  // 2. Check known driver map for secondary name
  if (driverName && KNOWN_DRIVERS[driverName]) {
    return KNOWN_DRIVERS[driverName];
  }

  // 3. If driverName is given and not a raw ID or placeholder, use it directly
  if (driverName && !driverName.startsWith('HR-DRI-') && !driverName.startsWith('HR-EMP-') && !driverName.startsWith('Demo Driver')) {
    return driverName;
  }

  // 2. Check dynamic drivers list if provided
  if (drivers && drivers.length > 0) {
    const match = drivers.find((d) => d.id === key || d.name === key);
    if (match && match.fullName) return match.fullName;
    if (match && match.name && !match.name.startsWith('HR-DRI-')) return match.name;
  }

  // 3. Fallback: if starts with HR-DRI- or HR-EMP-, present clean operator role rather than raw hash
  if (key.startsWith('HR-DRI-') || key.startsWith('HR-EMP-')) {
    return 'Designated Fleet Operator';
  }

  return key;
}

/**
 * Formats a mine site identifier into a human-readable site title.
 */
export function formatMineSiteDisplay(
  siteIdOrName?: string | null,
  siteName?: string | null,
  sites?: MineSiteLookup[]
): string {
  if (siteName && !siteName.startsWith('JBR-') && siteName.includes(' ')) {
    return siteName;
  }

  const key = siteIdOrName || siteName;
  if (!key) return 'All Operating Sites';

  // 1. Check known mine site map
  if (KNOWN_MINE_SITES[key]) {
    return KNOWN_MINE_SITES[key];
  }

  // 2. Check dynamic sites list
  if (sites && sites.length > 0) {
    const match = sites.find((s) => s.id === key || s.name === key);
    if (match && match.siteName) return match.siteName;
    if (match && match.name && KNOWN_MINE_SITES[match.name]) {
      return KNOWN_MINE_SITES[match.name];
    }
  }

  return key;
}

/**
 * Formats an inventory/procurement item code into a human-readable spare part name.
 */
export function formatItemDisplay(
  itemCode?: string | null,
  itemName?: string | null,
  items?: ItemLookup[]
): string {
  if (itemName && itemName.trim() && itemName !== itemCode) {
    return itemName;
  }

  if (!itemCode) return 'Spare Part Item';

  // 1. Check known spare parts map
  if (KNOWN_SPARE_PARTS[itemCode]) {
    return KNOWN_SPARE_PARTS[itemCode];
  }

  // 2. Check dynamic items list
  if (items && items.length > 0) {
    const match = items.find((i) => i.itemCode === itemCode);
    if (match && match.itemName) return match.itemName;
  }

  return itemCode;
}
