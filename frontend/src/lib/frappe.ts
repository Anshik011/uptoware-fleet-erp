import {
  DashboardSummary,
  Driver,
  DriverStatus,
  CreateDriverInput,
  UpdateDriverInput,
  FleetAlert,
  MiningTrip,
  TripStatus,
  CreateMiningTripInput,
  TripTransitionInput,
  StatutoryDocument,
  StatutoryHealth,
  Vehicle,
  VehicleStatus,
  CreateVehicleInput,
  MineSite,
  MineSiteStatus,
  MineralType,
  CustomerOption,
  CreateMineSiteInput,
  UpdateMineSiteInput,
  DispatchMetrics,
  DispatchEligibilityCheck,
  DispatchEligibilityResult,
  WeighbridgeMetrics,
  ConfirmWeighbridgeInput,
  FuelLog,
  FuelMetrics,
  CreateFuelLogInput,
  FuelTransitionInput,
  FuelApprovalStatus,
  FuelSource,
  FuelPaymentMethod,
  BreakdownType,
  BreakdownSeverity,
  RepairStatus,
  VehicleBreakdownPart,
  VehicleBreakdown,
  BreakdownMetrics,
  CreateBreakdownInput,
  UpdateBreakdownInput,
  BreakdownTransitionInput,
  ExpenseCategory,
  ExpenseApprovalStatus,
  ExpenseWorkflowAction,
  ExpenseAccountingStatus,
  ExpensePaymentStatus,
  OperationalExpense,
  ExpenseMetrics,
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseTransitionInput,
  WarehouseBalance,
  SparePartItem,
  CreateSparePartInput,
  Warehouse,
  StockMovement,
  StockMovementItem,
  CreateStockEntryInput,
  Supplier,
  CreateSupplierInput,
  PurchaseOrder,
  PurchaseOrderItem,
  CreatePurchaseOrderInput,
  PurchaseReceipt,
  PurchaseReceiptItem,
  PurchaseInvoice,
  PurchaseInvoiceItem,
  InventoryMetrics,
  ProcurementMetrics,
  PartsConsumptionRecord,
  FleetReportColumn,
  FleetReportResult,
  VehicleInsurancePolicy,
  CreateInsurancePolicyInput,
  RenewInsurancePolicyInput,
  InsuranceMetrics,
  PolicyType,
  PolicyStatus,
  StatutoryDocDetail,
  VehicleComplianceRecord,
  ComplianceMetrics,
  UpdateComplianceInput,
  AlertMetrics,
  ApprovalItem,
  ApprovalMetrics,
  ApprovalActionInput,
  ApprovalDocType,
  UserRosterItem,
  RolePermissionItem,
  FleetOperationalSettings,
  SystemHealthStatus,
} from '@/types/fleet';

const FRAPPE_URL = process.env.FRAPPE_URL || 'http://localhost:8080';

/**
 * Parses and sanitizes raw Frappe error responses into clean, human-readable messages.
 * Strips raw serialized JSON from _server_messages and Python stack prefixes.
 */
export function extractCleanFrappeError(json: any, fallbackStatus = 500): string {
  if (!json) return `Frappe server error (${fallbackStatus})`;

  // 1. Try parsing _server_messages (Frappe stores serialized JSON array of messages)
  if (json._server_messages) {
    try {
      const parsed = typeof json._server_messages === 'string'
        ? JSON.parse(json._server_messages)
        : json._server_messages;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const first = typeof parsed[0] === 'string' ? JSON.parse(parsed[0]) : parsed[0];
        if (first && first.message) {
          return first.message.replace(/<[^>]*>/g, '').trim();
        }
      }
    } catch {
      // fallback
    }
  }

  // 2. Try json.exception (e.g. "frappe.exceptions.PermissionError: Must have report permission...")
  if (json.exception && typeof json.exception === 'string') {
    const parts = json.exception.split(':');
    if (parts.length > 1) {
      return parts.slice(1).join(':').trim();
    }
    return json.exception.trim();
  }

  // 3. Try json.message
  if (json.message) {
    if (typeof json.message === 'string') return json.message.trim();
    if (typeof json.message === 'object' && json.message.message) return String(json.message.message).trim();
  }

  // 4. Try json.error
  if (json.error) {
    if (typeof json.error === 'string') return json.error.trim();
    if (typeof json.error === 'object' && json.error.message) return String(json.error.message).trim();
  }

  return `Frappe API error (${fallbackStatus})`;
}

/**
 * Low-level authenticated fetch proxying directly to Frappe backend.
 * Executes strictly with the session of the authenticated user.
 * Never uses or falls back to Administrator credentials.
 */
async function frappeFetch<T = any>(
  endpoint: string,
  options: RequestInit & { sessionCookie?: string } = {}
): Promise<T> {
  const { sessionCookie, ...fetchOptions } = options;

  if (!sessionCookie) {
    const err: any = new Error('Unauthorized: No active Frappe session provided');
    err.status = 401;
    throw err;
  }

  const url = endpoint.startsWith('http') ? endpoint : `${FRAPPE_URL}${endpoint}`;
  const headers = new Headers(fetchOptions.headers || {});
  headers.set(
    'Cookie',
    sessionCookie.startsWith('sid=') ? sessionCookie : `sid=${sessionCookie}`
  );

  if (!headers.has('Referer')) {
    headers.set('Referer', FRAPPE_URL);
  }
  if (!headers.has('Origin')) {
    headers.set('Origin', FRAPPE_URL);
  }

  if (!headers.has('Content-Type') && fetchOptions.method && fetchOptions.method !== 'GET') {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(url, {
    ...fetchOptions,
    headers,
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({}));

  if (!res.ok) {
    const cleanMsg = extractCleanFrappeError(json, res.status);
    const err: any = new Error(cleanMsg);
    err.status = res.status;
    err.raw = json;
    throw err;
  }

  return json;
}

export async function callFrappeApi<T = any>(
  endpoint: string,
  sessionCookie: string,
  options: RequestInit = {}
): Promise<T> {
  return frappeFetch<T>(endpoint, {
    ...options,
    sessionCookie,
  });
}

function calculateStatutoryDoc(
  title: string,
  dateStr: string | null | undefined
): StatutoryDocument {
  if (!dateStr) {
    return { title, expiryDate: null, status: 'missing', daysRemaining: null };
  }

  const expiry = new Date(dateStr);
  const now = new Date();
  const diffTime = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let status: StatutoryHealth = 'valid';
  if (diffDays < 0) {
    status = 'expired';
  } else if (diffDays <= 30) {
    status = 'expiring_soon';
  }

  return {
    title,
    expiryDate: dateStr,
    status,
    daysRemaining: diffDays,
  };
}

function determineOverallHealth(docs: StatutoryDocument[]): StatutoryHealth {
  if (docs.some((d) => d.status === 'expired')) return 'expired';
  if (docs.some((d) => d.status === 'expiring_soon')) return 'expiring_soon';
  if (docs.some((d) => d.status === 'missing')) return 'missing';
  return 'valid';
}

export async function getDrivers(
  sessionCookie: string,
  includeTest = false
): Promise<Driver[]> {
  try {
    const fields = JSON.stringify([
      'name',
      'full_name',
      'status',
      'assigned_vehicle',
      'cell_number',
      'license_number',
      'issuing_date',
      'expiry_date',
      'medical_fitness_expiry',
      'safety_score',
      'emergency_contact_name',
      'emergency_contact_phone',
      'is_test_record',
    ]);
    const filters = includeTest ? [] : [['is_test_record', '=', 0]];
    const filterQuery =
      filters.length > 0 ? `&filters=${encodeURIComponent(JSON.stringify(filters))}` : '';
    const res = await frappeFetch<{ data: any[] }>(
      `/api/resource/Driver?fields=${encodeURIComponent(fields)}${filterQuery}&order_by=creation%20desc&limit_page_length=200`,
      { sessionCookie }
    );
    return (res.data || []).map((d) => {
      const licenseDoc = calculateStatutoryDoc('Driving License', d.expiry_date);
      return {
        id: d.name,
        name: d.full_name || d.name,
        fullName: d.full_name || d.name,
        status: (d.status as DriverStatus) || 'Active',
        cellNumber: d.cell_number || null,
        licenseNumber: d.license_number || null,
        issuingDate: d.issuing_date || null,
        expiryDate: d.expiry_date || null,
        medicalFitnessExpiry: d.medical_fitness_expiry || null,
        safetyScore: Number(d.safety_score ?? 100),
        assignedVehicle: d.assigned_vehicle || null,
        emergencyContactName: d.emergency_contact_name || null,
        emergencyContactPhone: d.emergency_contact_phone || null,
        isTestRecord: Boolean(d.is_test_record),
        licenseStatus: licenseDoc.status,
        daysToLicenseExpiry: licenseDoc.daysRemaining,
      };
    });
  } catch (error: any) {
    console.error('Failed to fetch drivers:', error);
    if (error.status === 401 || error.status === 403) throw error;
    return [];
  }
}

export async function getDriverDetails(
  sessionCookie: string,
  driverId: string,
  includeTest = false
): Promise<{
  driver: Driver | null;
  trips: MiningTrip[];
  assignedVehicleDetails: Vehicle | null;
}> {
  try {
    const res = await frappeFetch<{ data: any }>(
      `/api/resource/Driver/${encodeURIComponent(driverId)}`,
      { sessionCookie }
    );
    const d = res.data;
    if (!d) {
      return { driver: null, trips: [], assignedVehicleDetails: null };
    }

    const licenseDoc = calculateStatutoryDoc('Driving License', d.expiry_date);

    // Fetch trips assigned to this driver
    const tripFields = JSON.stringify([
      'name',
      'vehicle',
      'driver',
      'mine_site',
      'destination',
      'material_type',
      'net_weight_tons',
      'gross_revenue',
      'trip_status',
      'dispatch_date_time',
      'is_test_record',
    ]);
    const tripFilters: any[] = [['driver', '=', driverId]];
    if (!includeTest) {
      tripFilters.push(['is_test_record', '=', 0]);
    }

    const tripsRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Mining%20Trip?fields=${encodeURIComponent(
        tripFields
      )}&filters=${encodeURIComponent(JSON.stringify(tripFilters))}&order_by=creation%20desc&limit_page_length=20`,
      { sessionCookie }
    ).catch(() => ({ data: [] }));

    const trips: MiningTrip[] = (tripsRes.data || []).map((t) => ({
      id: t.name,
      vehicle: t.vehicle,
      driver: t.driver,
      driverName: d.full_name || d.name,
      mineSite: t.mine_site,
      destination: t.destination,
      materialType: t.material_type,
      netWeightTons: Number(t.net_weight_tons || 0),
      grossRevenue: Number(t.gross_revenue || 0),
      status: t.trip_status,
      tripStatus: t.trip_status || 'Draft',
      workflowState: t.workflow_state || t.trip_status || 'Draft',
      ratePerTon: Number(t.rate_per_ton || 0),
      dispatchDateTime: t.dispatch_date_time,
    }));

    // Fetch assigned vehicle details if vehicle is assigned
    let assignedVehicleDetails: Vehicle | null = null;
    if (d.assigned_vehicle) {
      try {
        const vehicles = await getVehicles(sessionCookie, includeTest);
        assignedVehicleDetails =
          vehicles.find(
            (v) => v.id === d.assigned_vehicle || v.licensePlate === d.assigned_vehicle
          ) || null;
      } catch (err) {
        console.warn('Could not fetch vehicle details for driver:', err);
      }
    }

    const totalTrips = trips.length;
    const totalTonnage = trips.reduce(
      (sum, t) => sum + (Number(t.netWeightTons) || 0),
      0
    );

    const driver: Driver = {
      id: d.name,
      name: d.full_name || d.name,
      fullName: d.full_name || d.name,
      status: (d.status as DriverStatus) || 'Active',
      cellNumber: d.cell_number || null,
      licenseNumber: d.license_number || null,
      issuingDate: d.issuing_date || null,
      expiryDate: d.expiry_date || null,
      medicalFitnessExpiry: d.medical_fitness_expiry || null,
      safetyScore: Number(d.safety_score ?? 100),
      assignedVehicle: d.assigned_vehicle || null,
      emergencyContactName: d.emergency_contact_name || null,
      emergencyContactPhone: d.emergency_contact_phone || null,
      isTestRecord: Boolean(d.is_test_record),
      licenseStatus: licenseDoc.status,
      daysToLicenseExpiry: licenseDoc.daysRemaining,
      totalTrips,
      totalTonnage,
    };

    return { driver, trips, assignedVehicleDetails };
  } catch (error: any) {
    console.error('Failed to get driver details:', error);
    if (error.status === 401 || error.status === 403) throw error;
    return { driver: null, trips: [], assignedVehicleDetails: null };
  }
}

export async function createDriver(
  sessionCookie: string,
  input: CreateDriverInput
): Promise<Driver> {
  const payload: any = {
    full_name: input.fullName.trim(),
    status: input.status || 'Active',
    cell_number: input.cellNumber?.trim() || null,
    license_number: input.licenseNumber?.trim() || null,
    issuing_date: input.issuingDate || null,
    expiry_date: input.expiryDate || null,
    medical_fitness_expiry: input.medicalFitnessExpiry || null,
    safety_score: Number(input.safetyScore ?? 100),
    assigned_vehicle: input.assignedVehicle || null,
    emergency_contact_name: input.emergencyContactName?.trim() || null,
    emergency_contact_phone: input.emergencyContactPhone?.trim() || null,
    is_test_record: 0,
  };

  const res = await frappeFetch<{ data: any }>('/api/resource/Driver', {
    method: 'POST',
    body: JSON.stringify(payload),
    sessionCookie,
  });

  const d = res.data;
  const licenseDoc = calculateStatutoryDoc('Driving License', d.expiry_date);

  return {
    id: d.name,
    name: d.full_name || d.name,
    fullName: d.full_name || d.name,
    status: (d.status as DriverStatus) || 'Active',
    cellNumber: d.cell_number || null,
    licenseNumber: d.license_number || null,
    issuingDate: d.issuing_date || null,
    expiryDate: d.expiry_date || null,
    medicalFitnessExpiry: d.medical_fitness_expiry || null,
    safetyScore: Number(d.safety_score ?? 100),
    assignedVehicle: d.assigned_vehicle || null,
    emergencyContactName: d.emergency_contact_name || null,
    emergencyContactPhone: d.emergency_contact_phone || null,
    isTestRecord: Boolean(d.is_test_record),
    licenseStatus: licenseDoc.status,
    daysToLicenseExpiry: licenseDoc.daysRemaining,
  };
}

export async function updateDriver(
  sessionCookie: string,
  driverId: string,
  input: UpdateDriverInput
): Promise<Driver> {
  const payload: any = {};
  if (input.fullName !== undefined) payload.full_name = input.fullName.trim();
  if (input.status !== undefined) payload.status = input.status;
  if (input.cellNumber !== undefined) payload.cell_number = input.cellNumber?.trim() || null;
  if (input.licenseNumber !== undefined) payload.license_number = input.licenseNumber?.trim() || null;
  if (input.issuingDate !== undefined) payload.issuing_date = input.issuingDate || null;
  if (input.expiryDate !== undefined) payload.expiry_date = input.expiryDate || null;
  if (input.medicalFitnessExpiry !== undefined) payload.medical_fitness_expiry = input.medicalFitnessExpiry || null;
  if (input.safetyScore !== undefined) payload.safety_score = Number(input.safetyScore);
  if (input.assignedVehicle !== undefined) payload.assigned_vehicle = input.assignedVehicle || null;
  if (input.emergencyContactName !== undefined) payload.emergency_contact_name = input.emergencyContactName?.trim() || null;
  if (input.emergencyContactPhone !== undefined) payload.emergency_contact_phone = input.emergencyContactPhone?.trim() || null;

  const res = await frappeFetch<{ data: any }>(
    `/api/resource/Driver/${encodeURIComponent(driverId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
      sessionCookie,
    }
  );

  const d = res.data;
  const licenseDoc = calculateStatutoryDoc('Driving License', d.expiry_date);

  return {
    id: d.name,
    name: d.full_name || d.name,
    fullName: d.full_name || d.name,
    status: (d.status as DriverStatus) || 'Active',
    cellNumber: d.cell_number || null,
    licenseNumber: d.license_number || null,
    issuingDate: d.issuing_date || null,
    expiryDate: d.expiry_date || null,
    medicalFitnessExpiry: d.medical_fitness_expiry || null,
    safetyScore: Number(d.safety_score ?? 100),
    assignedVehicle: d.assigned_vehicle || null,
    emergencyContactName: d.emergency_contact_name || null,
    emergencyContactPhone: d.emergency_contact_phone || null,
    isTestRecord: Boolean(d.is_test_record),
    licenseStatus: licenseDoc.status,
    daysToLicenseExpiry: licenseDoc.daysRemaining,
  };
}

export async function getCustomers(
  sessionCookie: string,
  includeTest = false
): Promise<CustomerOption[]> {
  try {
    const fields = JSON.stringify(['name', 'customer_name', 'custom_is_test_record']);
    const filters = includeTest ? [] : [['custom_is_test_record', '=', 0]];
    const filterQuery =
      filters.length > 0 ? `&filters=${encodeURIComponent(JSON.stringify(filters))}` : '';
    const res = await frappeFetch<{ data: any[] }>(
      `/api/resource/Customer?fields=${encodeURIComponent(
        fields
      )}${filterQuery}&order_by=customer_name%20asc&limit_page_length=200`,
      { sessionCookie }
    );
    let list = res.data || [];
    if (!includeTest) {
      list = list.filter(
        (c) =>
          !c.custom_is_test_record &&
          !c.name.includes('(TEST)') &&
          !c.customer_name?.includes('(TEST)')
      );
    }
    return list.map((c) => ({
      id: c.name,
      customerName: c.customer_name || c.name,
    }));
  } catch (error: any) {
    console.error('Failed to fetch customers:', error);
    if (error.status === 401 || error.status === 403) throw error;
    return [];
  }
}

export async function getMineSites(
  sessionCookie: string,
  includeTest = false
): Promise<MineSite[]> {
  try {
    // 1. Fetch Customers to map names
    const customers = await getCustomers(sessionCookie, includeTest).catch(() => []);
    const customerMap = new Map<string, string>();
    customers.forEach((c) => customerMap.set(c.id, c.customerName));

    // 2. Fetch Trips to compute trip volume & tonnage per site
    const tripFields = JSON.stringify(['name', 'mine_site', 'net_weight_tons', 'is_test_record']);
    const tripFilters = includeTest ? [] : [['is_test_record', '=', 0]];
    const filterTripQuery =
      tripFilters.length > 0 ? `&filters=${encodeURIComponent(JSON.stringify(tripFilters))}` : '';
    const tripsRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Mining%20Trip?fields=${encodeURIComponent(tripFields)}${filterTripQuery}&limit_page_length=1000`,
      { sessionCookie }
    ).catch(() => ({ data: [] }));

    const tripCountMap = new Map<string, number>();
    const tripTonnageMap = new Map<string, number>();
    for (const t of tripsRes.data || []) {
      if (t.mine_site) {
        tripCountMap.set(t.mine_site, (tripCountMap.get(t.mine_site) || 0) + 1);
        tripTonnageMap.set(
          t.mine_site,
          (tripTonnageMap.get(t.mine_site) || 0) + (Number(t.net_weight_tons) || 0)
        );
      }
    }

    // 3. Fetch Mine Sites
    const fields = JSON.stringify([
      'name',
      'site_name',
      'client',
      'status',
      'mineral_type',
      'daily_target_tonnage',
      'active_loading_pits',
      'location',
      'rate_per_ton',
      'is_test_record',
    ]);
    const filters = includeTest ? [] : [['is_test_record', '=', 0]];
    const filterQuery =
      filters.length > 0 ? `&filters=${encodeURIComponent(JSON.stringify(filters))}` : '';
    const res = await frappeFetch<{ data: any[] }>(
      `/api/resource/Mine%20Site?fields=${encodeURIComponent(fields)}${filterQuery}&order_by=site_name%20asc&limit_page_length=200`,
      { sessionCookie }
    );

    return (res.data || []).map((s) => ({
      id: s.name,
      siteName: s.site_name || s.name,
      client: s.client || null,
      clientName: s.client ? customerMap.get(s.client) || s.client : null,
      status: (s.status as MineSiteStatus) || 'Operational',
      mineralType: (s.mineral_type as MineralType) || 'Iron Ore',
      dailyTargetTonnage: Number(s.daily_target_tonnage) || 0,
      activeLoadingPits: Number(s.active_loading_pits) || 1,
      location: s.location || null,
      ratePerTon: Number(s.rate_per_ton) || 0,
      isTestRecord: Boolean(s.is_test_record),
      totalTrips: tripCountMap.get(s.name) || 0,
      totalHauledTons: Number((tripTonnageMap.get(s.name) || 0).toFixed(2)),
    }));
  } catch (error: any) {
    console.error('Failed to fetch mine sites:', error);
    if (error.status === 401 || error.status === 403) throw error;
    return [];
  }
}

export async function getMineSiteDetails(
  sessionCookie: string,
  siteId: string,
  includeTest = false
): Promise<{
  site: MineSite | null;
  trips: MiningTrip[];
  clientDetails: CustomerOption | null;
}> {
  try {
    const res = await frappeFetch<{ data: any }>(
      `/api/resource/Mine%20Site/${encodeURIComponent(siteId)}`,
      { sessionCookie }
    );
    const s = res.data;
    if (!s) {
      return { site: null, trips: [], clientDetails: null };
    }

    // Fetch trips assigned to this site
    const tripFields = JSON.stringify([
      'name',
      'vehicle',
      'driver',
      'mine_site',
      'destination',
      'material_type',
      'net_weight_tons',
      'gross_revenue',
      'trip_status',
      'dispatch_date_time',
      'is_test_record',
    ]);
    const tripFilters: any[] = [['mine_site', '=', siteId]];
    if (!includeTest) {
      tripFilters.push(['is_test_record', '=', 0]);
    }

    const tripsRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Mining%20Trip?fields=${encodeURIComponent(
        tripFields
      )}&filters=${encodeURIComponent(JSON.stringify(tripFilters))}&order_by=creation%20desc&limit_page_length=50`,
      { sessionCookie }
    ).catch(() => ({ data: [] }));

    const trips: MiningTrip[] = (tripsRes.data || []).map((t) => ({
      id: t.name,
      vehicle: t.vehicle,
      driver: t.driver,
      mineSite: t.mine_site,
      destination: t.destination,
      materialType: t.material_type,
      netWeightTons: Number(t.net_weight_tons || 0),
      grossRevenue: Number(t.gross_revenue || 0),
      status: t.trip_status,
      tripStatus: t.trip_status || 'Draft',
      workflowState: t.workflow_state || t.trip_status || 'Draft',
      ratePerTon: Number(t.rate_per_ton || 0),
      dispatchDateTime: t.dispatch_date_time,
    }));

    // Fetch customer details if client is linked
    let clientDetails: CustomerOption | null = null;
    if (s.client) {
      try {
        const clientRes = await frappeFetch<{ data: any }>(
          `/api/resource/Customer/${encodeURIComponent(s.client)}?fields=${encodeURIComponent(
            JSON.stringify(['name', 'customer_name'])
          )}`,
          { sessionCookie }
        );
        if (clientRes.data) {
          clientDetails = {
            id: clientRes.data.name,
            customerName: clientRes.data.customer_name || clientRes.data.name,
          };
        }
      } catch (err) {
        console.warn('Could not fetch client details for mine site:', err);
      }
    }

    const totalTrips = trips.length;
    const totalHauledTons = Number(
      trips.reduce((sum, t) => sum + (Number(t.netWeightTons) || 0), 0).toFixed(2)
    );

    const site: MineSite = {
      id: s.name,
      siteName: s.site_name || s.name,
      client: s.client || null,
      clientName: clientDetails ? clientDetails.customerName : s.client || null,
      status: (s.status as MineSiteStatus) || 'Operational',
      mineralType: (s.mineral_type as MineralType) || 'Iron Ore',
      dailyTargetTonnage: Number(s.daily_target_tonnage) || 0,
      activeLoadingPits: Number(s.active_loading_pits) || 1,
      location: s.location || null,
      ratePerTon: Number(s.rate_per_ton) || 0,
      isTestRecord: Boolean(s.is_test_record),
      totalTrips,
      totalHauledTons,
    };

    return { site, trips, clientDetails };
  } catch (error: any) {
    console.error('Failed to get mine site details:', error);
    if (error.status === 401 || error.status === 403) throw error;
    return { site: null, trips: [], clientDetails: null };
  }
}

export async function createMineSite(
  sessionCookie: string,
  input: CreateMineSiteInput
): Promise<MineSite> {
  const payload: any = {
    site_name: input.siteName.trim(),
    client: input.client?.trim() || null,
    status: input.status || 'Operational',
    mineral_type: input.mineralType || 'Iron Ore',
    daily_target_tonnage: Number(input.dailyTargetTonnage) || 0,
    active_loading_pits: Number(input.activeLoadingPits) || 1,
    location: input.location?.trim() || null,
    rate_per_ton: Number(input.ratePerTon) || 0,
    is_test_record: 0,
  };

  const res = await frappeFetch<{ data: any }>('/api/resource/Mine%20Site', {
    method: 'POST',
    body: JSON.stringify(payload),
    sessionCookie,
  });

  const s = res.data;
  return {
    id: s.name,
    siteName: s.site_name || s.name,
    client: s.client || null,
    clientName: s.client || null,
    status: (s.status as MineSiteStatus) || 'Operational',
    mineralType: (s.mineral_type as MineralType) || 'Iron Ore',
    dailyTargetTonnage: Number(s.daily_target_tonnage) || 0,
    activeLoadingPits: Number(s.active_loading_pits) || 1,
    location: s.location || null,
    ratePerTon: Number(s.rate_per_ton) || 0,
    isTestRecord: Boolean(s.is_test_record),
    totalTrips: 0,
    totalHauledTons: 0,
  };
}

export async function updateMineSite(
  sessionCookie: string,
  siteId: string,
  input: UpdateMineSiteInput
): Promise<MineSite> {
  const payload: any = {};
  if (input.client !== undefined) payload.client = input.client ? input.client.trim() : null;
  if (input.status !== undefined) payload.status = input.status;
  if (input.mineralType !== undefined) payload.mineral_type = input.mineralType;
  if (input.dailyTargetTonnage !== undefined)
    payload.daily_target_tonnage = Number(input.dailyTargetTonnage);
  if (input.activeLoadingPits !== undefined)
    payload.active_loading_pits = Number(input.activeLoadingPits);
  if (input.location !== undefined)
    payload.location = input.location ? input.location.trim() : null;
  if (input.ratePerTon !== undefined) payload.rate_per_ton = Number(input.ratePerTon);

  const res = await frappeFetch<{ data: any }>(
    `/api/resource/Mine%20Site/${encodeURIComponent(siteId)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
      sessionCookie,
    }
  );

  const s = res.data;
  return {
    id: s.name,
    siteName: s.site_name || s.name,
    client: s.client || null,
    clientName: s.client || null,
    status: (s.status as MineSiteStatus) || 'Operational',
    mineralType: (s.mineral_type as MineralType) || 'Iron Ore',
    dailyTargetTonnage: Number(s.daily_target_tonnage) || 0,
    activeLoadingPits: Number(s.active_loading_pits) || 1,
    location: s.location || null,
    ratePerTon: Number(s.rate_per_ton) || 0,
    isTestRecord: Boolean(s.is_test_record),
  };
}


export async function getVehicles(
  sessionCookie: string,
  includeTest = false
): Promise<Vehicle[]> {
  try {
    const drivers = await getDrivers(sessionCookie, includeTest);
    const driverMap = new Map<string, string>();
    drivers.forEach((d) => driverMap.set(d.id, d.name));

    const fields = JSON.stringify([
      'name',
      'license_plate',
      'make',
      'model',
      'vehicle_status',
      'assigned_driver',
      'payload_capacity_tons',
      'last_odometer',
      'fuel_type',
      'end_date',
      'fitness_expiry_date',
      'puc_expiry_date',
      'road_tax_expiry_date',
      'permit_expiry_date',
      'modified',
      'is_test_record',
    ]);

    const filters = includeTest ? [] : [['is_test_record', '=', 0]];
    const filterQuery =
      filters.length > 0 ? `&filters=${encodeURIComponent(JSON.stringify(filters))}` : '';

    const res = await frappeFetch<{ data: any[] }>(
      `/api/resource/Vehicle?fields=${encodeURIComponent(
        fields
      )}${filterQuery}&order_by=modified%20desc&limit_page_length=100`,
      { sessionCookie }
    );

    const rawVehicles = res.data || [];

    return rawVehicles.map((v) => {
      const insurance = calculateStatutoryDoc('Commercial Insurance', v.end_date);
      const fitness = calculateStatutoryDoc('Fitness Certificate', v.fitness_expiry_date);
      const puc = calculateStatutoryDoc('Pollution Under Control (PUC)', v.puc_expiry_date);
      const roadTax = calculateStatutoryDoc('Road Tax Receipt', v.road_tax_expiry_date);
      const permit = calculateStatutoryDoc('Mining & Goods Permit', v.permit_expiry_date);

      const docs = [insurance, fitness, puc, roadTax, permit];
      const overall = determineOverallHealth(docs);

      return {
        id: v.name,
        licensePlate: v.license_plate || v.name,
        make: v.make || 'Tata',
        model: v.model || 'Commercial Vehicle',
        status: (v.vehicle_status as VehicleStatus) || 'Active',
        assignedDriverId: v.assigned_driver || null,
        assignedDriverName: v.assigned_driver
          ? driverMap.get(v.assigned_driver) || v.assigned_driver
          : null,
        lastOdometer: Number(v.last_odometer) || 0,
        payloadCapacityTons: Number(v.payload_capacity_tons) || 35,
        fuelType: v.fuel_type || 'Diesel',
        statutory: {
          overall,
          insurance,
          fitness,
          puc,
          roadTax,
          permit,
        },
        lastUpdated: v.modified,
      };
    });
  } catch (error: any) {
    console.error('Failed to fetch vehicles:', error);
    if (error.status === 401 || error.status === 403) throw error;
    return [];
  }
}

export async function getVehicleDetails(
  sessionCookie: string,
  vehicleId: string
): Promise<{
  vehicle: Vehicle | null;
  trips: MiningTrip[];
  alerts: FleetAlert[];
  recentFuel: any[];
  recentMaintenance: any[];
}> {
  try {
    const vehicles = await getVehicles(sessionCookie, true);
    const vehicle = vehicles.find((v) => v.id === vehicleId || v.licensePlate === vehicleId) || null;

    if (!vehicle) {
      return { vehicle: null, trips: [], alerts: [], recentFuel: [], recentMaintenance: [] };
    }

    // Fetch trips for this vehicle
    const tripFields = JSON.stringify([
      'name',
      'vehicle',
      'driver',
      'mine_site',
      'destination',
      'material_type',
      'net_weight_tons',
      'gross_revenue',
      'trip_status',
      'dispatch_date_time',
    ]);
    const tripFilters = JSON.stringify([['vehicle', '=', vehicle.id]]);
    const tripsRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Mining%20Trip?fields=${encodeURIComponent(
        tripFields
      )}&filters=${encodeURIComponent(tripFilters)}&order_by=creation%20desc&limit_page_length=10`,
      { sessionCookie }
    ).catch(() => ({ data: [] }));

    const trips: MiningTrip[] = (tripsRes.data || []).map((t) => ({
      id: t.name,
      vehicle: t.vehicle,
      driver: t.driver,
      mineSite: t.mine_site || '',
      destination: t.destination || '',
      materialType: t.material_type || '',
      netWeightTons: Number(t.net_weight_tons) || 0,
      grossRevenue: Number(t.gross_revenue) || 0,
      status: t.trip_status || '',
      tripStatus: t.trip_status || 'Draft',
      workflowState: t.workflow_state || t.trip_status || 'Draft',
      ratePerTon: Number(t.rate_per_ton || 0),
      dispatchDateTime: t.dispatch_date_time || t.creation || '',
    }));

    // Fetch alerts for this vehicle
    const alertFields = JSON.stringify([
      'name',
      'alert_title',
      'alert_category',
      'severity',
      'status',
      'vehicle',
      'alert_timestamp',
      'action_required',
    ]);
    const alertFilters = JSON.stringify([['vehicle', '=', vehicle.id]]);
    const alertsRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Fleet%20Alert%20Log?fields=${encodeURIComponent(
        alertFields
      )}&filters=${encodeURIComponent(alertFilters)}&order_by=alert_timestamp%20desc&limit_page_length=10`,
      { sessionCookie }
    ).catch(() => ({ data: [] }));

    const alerts: FleetAlert[] = (alertsRes.data || []).map((a) => ({
      id: a.name,
      title: a.alert_title,
      category: a.alert_category,
      severity: a.severity || 'Medium',
      status: a.status || 'Unread',
      vehicle: a.vehicle,
      timestamp: a.alert_timestamp,
      actionRequired: a.action_required,
    }));

    // Fetch fuel logs
    const fuelFields = JSON.stringify([
      'name',
      'fuel_date',
      'quantity_litres',
      'rate_per_litre',
      'total_fuel_cost',
      'odometer_reading_km',
      'approval_status',
    ]);
    const fuelFilters = JSON.stringify([['vehicle', '=', vehicle.id]]);
    const fuelRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Fuel%20Log?fields=${encodeURIComponent(
        fuelFields
      )}&filters=${encodeURIComponent(fuelFilters)}&order_by=fuel_date%20desc&limit_page_length=5`,
      { sessionCookie }
    ).catch(() => ({ data: [] }));

    // Fetch breakdowns / maintenance
    const bdFields = JSON.stringify([
      'name',
      'breakdown_date',
      'breakdown_type',
      'repair_status',
      'severity',
      'downtime_hours',
      'repair_start_date',
      'repair_completed_date',
      'total_maintenance_cost',
    ]);
    const bdFilters = JSON.stringify([
      ['vehicle', '=', vehicle.id],
      ['is_test_record', '=', 0],
    ]);
    const bdRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Vehicle%20Breakdown?fields=${encodeURIComponent(
        bdFields
      )}&filters=${encodeURIComponent(bdFilters)}&order_by=breakdown_date%20desc&limit_page_length=5`,
      { sessionCookie }
    ).catch(() => ({ data: [] }));

    return {
      vehicle,
      trips,
      alerts,
      recentFuel: fuelRes.data || [],
      recentMaintenance: bdRes.data || [],
    };
  } catch (error: any) {
    console.error('Failed to get vehicle details:', error);
    if (error.status === 401 || error.status === 403) throw error;
    return { vehicle: null, trips: [], alerts: [], recentFuel: [], recentMaintenance: [] };
  }
}

export async function createVehicle(
  sessionCookie: string,
  input: CreateVehicleInput
): Promise<Vehicle> {
  const payload = {
    license_plate: input.licensePlate.trim().toUpperCase(),
    make: input.make.trim(),
    model: input.model.trim(),
    vehicle_status: input.status || 'Active',
    company: 'Uptoware',
    uom: 'Nos',
    fuel_type: input.fuelType || 'Diesel',
    last_odometer: Number(input.lastOdometer) || 0,
    payload_capacity_tons: Number(input.payloadCapacityTons) || 35,
    assigned_driver: input.assignedDriverId || null,
    end_date: input.insuranceExpiryDate || null,
    fitness_expiry_date: input.fitnessExpiryDate || null,
    puc_expiry_date: input.pucExpiryDate || null,
    road_tax_expiry_date: input.roadTaxExpiryDate || null,
    permit_expiry_date: input.permitExpiryDate || null,
    is_test_record: 0,
  };

  const res = await frappeFetch<{ data: any }>('/api/resource/Vehicle', {
    method: 'POST',
    body: JSON.stringify(payload),
    sessionCookie,
  });

  const created = res.data;
  const insurance = calculateStatutoryDoc('Commercial Insurance', created.end_date);
  const fitness = calculateStatutoryDoc('Fitness Certificate', created.fitness_expiry_date);
  const puc = calculateStatutoryDoc('Pollution Under Control (PUC)', created.puc_expiry_date);
  const roadTax = calculateStatutoryDoc('Road Tax Receipt', created.road_tax_expiry_date);
  const permit = calculateStatutoryDoc('Mining & Goods Permit', created.permit_expiry_date);

  return {
    id: created.name,
    licensePlate: created.license_plate,
    make: created.make,
    model: created.model,
    status: created.vehicle_status,
    assignedDriverId: created.assigned_driver,
    assignedDriverName: null,
    lastOdometer: Number(created.last_odometer) || 0,
    payloadCapacityTons: Number(created.payload_capacity_tons) || 35,
    fuelType: created.fuel_type || 'Diesel',
    statutory: {
      overall: determineOverallHealth([insurance, fitness, puc, roadTax, permit]),
      insurance,
      fitness,
      puc,
      roadTax,
      permit,
    },
    lastUpdated: created.modified,
  };
}

export async function getDashboardData(
  sessionCookie: string,
  includeTest = false
): Promise<DashboardSummary> {
  try {
    const vehicles = await getVehicles(sessionCookie, includeTest);

    const totalVehicles = vehicles.length;
    const activeVehicles = vehicles.filter(
      (v) => v.status === 'Active' || v.status === 'On Trip'
    ).length;
    const inMaintenance = vehicles.filter((v) => v.status === 'Under Maintenance').length;
    const inBreakdown = vehicles.filter((v) => v.status === 'Breakdown').length;
    const outOfService = vehicles.filter((v) => v.status === 'Out of Service').length;

    const utilizationRate =
      totalVehicles > 0 ? Math.round((activeVehicles / totalVehicles) * 100) : 0;
    const totalCapacityTons = vehicles.reduce(
      (acc, v) => acc + (v.payloadCapacityTons || 35),
      0
    );
    const activeCapacityTons = vehicles
      .filter((v) => v.status === 'Active' || v.status === 'On Trip')
      .reduce((acc, v) => acc + (v.payloadCapacityTons || 35), 0);

    // Fetch mining trips strictly from ERPNext
    const tripFields = JSON.stringify([
      'name',
      'vehicle',
      'driver',
      'mine_site',
      'destination',
      'material_type',
      'net_weight_tons',
      'gross_revenue',
      'trip_status',
      'dispatch_date_time',
      'is_test_record',
    ]);
    const tripFilters = JSON.stringify(includeTest ? [] : [['is_test_record', '=', 0]]);
    const tripsRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Mining%20Trip?fields=${encodeURIComponent(
        tripFields
      )}&filters=${encodeURIComponent(tripFilters)}&order_by=creation%20desc&limit_page_length=50`,
      { sessionCookie }
    ).catch(() => ({ data: [] }));

    const rawTrips = tripsRes.data || [];
    const recentTrips: MiningTrip[] = rawTrips.slice(0, 6).map((t) => ({
      id: t.name,
      vehicle: t.vehicle,
      driver: t.driver,
      mineSite: t.mine_site || '',
      destination: t.destination || '',
      materialType: t.material_type || '',
      netWeightTons: Number(t.net_weight_tons) || 0,
      grossRevenue: Number(t.gross_revenue) || 0,
      status: t.trip_status || '',
      tripStatus: t.trip_status || 'Draft',
      workflowState: t.workflow_state || t.trip_status || '',
      ratePerTon: Number(t.rate_per_ton) || 0,
      dispatchDateTime: t.dispatch_date_time || '',
    }));

    // Aggregate completed trips & in-progress trips from live database records
    const completedTrips = rawTrips.filter((t) => t.trip_status === 'Delivered').length;
    const inProgressTrips = rawTrips.filter(
      (t) => t.trip_status === 'Dispatched' || t.trip_status === 'Weighbridge Confirmed'
    ).length;

    // Fetch recent alerts
    const alertFields = JSON.stringify([
      'name',
      'alert_title',
      'alert_category',
      'severity',
      'status',
      'vehicle',
      'alert_timestamp',
      'action_required',
      'is_test_record',
    ]);
    const alertFilters = JSON.stringify(includeTest ? [] : [['is_test_record', '=', 0]]);
    const alertsRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Fleet%20Alert%20Log?fields=${encodeURIComponent(
        alertFields
      )}&filters=${encodeURIComponent(
        alertFilters
      )}&order_by=alert_timestamp%20desc&limit_page_length=5`,
      { sessionCookie }
    ).catch(() => ({ data: [] }));

    const rawAlerts = alertsRes.data || [];
    const recentAlerts: FleetAlert[] = rawAlerts.map((a) => ({
      id: a.name,
      title: a.alert_title,
      category: a.alert_category,
      severity: a.severity || 'Medium',
      status: a.status || 'Unread',
      vehicle: a.vehicle,
      timestamp: a.alert_timestamp,
      actionRequired: a.action_required,
    }));

    // Aggregate fuel costs from approved Fuel Logs
    const fuelFields = JSON.stringify(['total_fuel_cost', 'approval_status', 'is_test_record']);
    const fuelFilters = JSON.stringify(
      includeTest
        ? [['approval_status', '=', 'Approved']]
        : [['is_test_record', '=', 0], ['approval_status', '=', 'Approved']]
    );
    const fuelRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Fuel%20Log?fields=${encodeURIComponent(
        fuelFields
      )}&filters=${encodeURIComponent(fuelFilters)}&limit_page_length=500`,
      { sessionCookie }
    ).catch(() => ({ data: [] }));
    const fuelCost = (fuelRes.data || []).reduce(
      (acc, f) => acc + (Number(f.total_fuel_cost) || 0),
      0
    );

    // Aggregate breakdown repair costs
    const bdFields = JSON.stringify(['total_repair_cost', 'is_test_record']);
    const bdFilters = JSON.stringify(includeTest ? [] : [['is_test_record', '=', 0]]);
    const bdRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Vehicle%20Breakdown?fields=${encodeURIComponent(
        bdFields
      )}&filters=${encodeURIComponent(bdFilters)}&limit_page_length=500`,
      { sessionCookie }
    ).catch(() => ({ data: [] }));
    const maintenanceCost = (bdRes.data || []).reduce(
      (acc, b) => acc + (Number(b.total_repair_cost) || 0),
      0
    );

    // Aggregate operational expenses
    const expFields = JSON.stringify(['amount', 'approval_status', 'is_test_record']);
    const expFilters = JSON.stringify(
      includeTest
        ? [['approval_status', '=', 'Approved']]
        : [['is_test_record', '=', 0], ['approval_status', '=', 'Approved']]
    );
    const expRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Operational%20Expense?fields=${encodeURIComponent(
        expFields
      )}&filters=${encodeURIComponent(expFilters)}&limit_page_length=500`,
      { sessionCookie }
    ).catch(() => ({ data: [] }));
    const operationalExpenses = (expRes.data || []).reduce(
      (acc, e) => acc + (Number(e.amount) || 0),
      0
    );

    // Aggregate Sales Invoices (grand_total for submitted invoices)
    const invFields = JSON.stringify(['grand_total', 'custom_is_test_record', 'docstatus']);
    const invFilters = JSON.stringify(
      includeTest
        ? [['docstatus', '=', 1]]
        : [['docstatus', '=', 1], ['custom_is_test_record', '=', 0]]
    );
    const invRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Sales%20Invoice?fields=${encodeURIComponent(
        invFields
      )}&filters=${encodeURIComponent(invFilters)}&limit_page_length=500`,
      { sessionCookie }
    ).catch(() => ({ data: [] }));
    const billedInvoiceTotal = (invRes.data || []).reduce(
      (acc, i) => acc + (Number(i.grand_total) || 0),
      0
    );

    // Actual billed revenue strictly sourced from submitted Sales Invoices (docstatus = 1).
    // Trip rate_per_ton and gross_revenue are indicative non-binding estimates and must NEVER affect accounting revenue.
    const totalRevenue = billedInvoiceTotal;
    const totalOperatingCost = fuelCost + maintenanceCost + operationalExpenses;
    const netOperatingIncome = totalRevenue - totalOperatingCost;

    return {
      kpi: {
        totalVehicles,
        activeVehicles,
        inMaintenance,
        inBreakdown,
        outOfService,
        utilizationRate,
        totalCapacityTons,
        activeCapacityTons,
        completedTrips,
        inProgressTrips,
        totalRevenue,
        totalOperatingCost,
        fuelCost,
        maintenanceCost,
        netOperatingIncome,
      },
      recentTrips,
      recentAlerts,
    };
  } catch (error: any) {
    console.error('Failed to get dashboard data:', error);
    if (error.status === 401 || error.status === 403) throw error;
    return {
      kpi: {
        totalVehicles: 0,
        activeVehicles: 0,
        inMaintenance: 0,
        inBreakdown: 0,
        outOfService: 0,
        utilizationRate: 0,
        totalCapacityTons: 0,
        activeCapacityTons: 0,
        completedTrips: 0,
        inProgressTrips: 0,
        totalRevenue: 0,
        totalOperatingCost: 0,
        fuelCost: 0,
        maintenanceCost: 0,
        netOperatingIncome: 0,
      },
      recentTrips: [],
      recentAlerts: [],
    };
  }
}

function mapMiningTrip(t: any): MiningTrip {
  return {
    id: t.name,
    namingSeries: t.naming_series || undefined,
    vehicle: t.vehicle || '',
    driver: t.driver || '',
    driverName: t.driver_name || undefined,
    mineSite: t.mine_site || '',
    mineSiteName: t.mine_site_name || undefined,
    destination: t.destination || '',
    materialType: t.material_type || '',
    challanNumber: t.challan_number || null,
    tripStatus: t.trip_status || 'Draft',
    workflowState: t.workflow_state || t.trip_status || 'Draft',
    status: t.trip_status || 'Draft',
    grossWeightTons: t.gross_weight_tons != null ? Number(t.gross_weight_tons) : undefined,
    tareWeightTons: t.tare_weight_tons != null ? Number(t.tare_weight_tons) : undefined,
    netWeightTons: Number(t.net_weight_tons || 0),
    confirmedBy: t.confirmed_by || null,
    confirmedOn: t.confirmed_on || null,
    ratePerTon: Number(t.rate_per_ton || 0),
    grossRevenue:
      Number(t.gross_revenue) > 0
        ? Number(t.gross_revenue)
        : Number(t.net_weight_tons || 0) > 0 && Number(t.rate_per_ton || 0) > 0
          ? Math.round(Number(t.net_weight_tons) * Number(t.rate_per_ton) * 100) / 100
          : 0,
    openingOdometer: t.opening_odometer != null ? Number(t.opening_odometer) : undefined,
    closingOdometer: t.closing_odometer != null ? Number(t.closing_odometer) : undefined,
    dispatchDateTime: t.dispatch_date_time || '',
    departureDateTime: t.departure_date_time || null,
    returnDateTime: t.return_date_time || null,
    approvedBy: t.approved_by || null,
    approvedOn: t.approved_on || null,
    cancelledBy: t.cancelled_by || null,
    cancelledOn: t.cancelled_on || null,
    cancellationReason: t.cancellation_reason || null,
    billingStatus: t.billing_status || undefined,
    billingNote: t.billing_note || null,
    salesInvoice: t.sales_invoice || null,
    isTestRecord: Boolean(t.is_test_record),
  };
}

const TRIP_FIELDS = JSON.stringify([
  'name',
  'naming_series',
  'dispatch_date_time',
  'vehicle',
  'driver',
  'mine_site',
  'destination',
  'material_type',
  'challan_number',
  'trip_status',
  'workflow_state',
  'gross_weight_tons',
  'tare_weight_tons',
  'net_weight_tons',
  'confirmed_by',
  'confirmed_on',
  'rate_per_ton',
  'gross_revenue',
  'billing_status',
  'billing_note',
  'sales_invoice',
  'departure_date_time',
  'opening_odometer',
  'return_date_time',
  'closing_odometer',
  'approved_by',
  'approved_on',
  'cancelled_by',
  'cancelled_on',
  'cancellation_reason',
  'is_test_record',
  'creation',
]);

export async function getMiningTrips(
  sessionCookie: string,
  includeTest = false,
  filters?: {
    status?: string;
    mineSite?: string;
    vehicle?: string;
    driver?: string;
    material?: string;
  }
): Promise<MiningTrip[]> {
  const tripFilters: any[] = [];
  if (!includeTest) {
    tripFilters.push(['is_test_record', '=', 0]);
  }
  if (filters?.status && filters.status !== 'All') {
    tripFilters.push(['trip_status', '=', filters.status]);
  }
  if (filters?.mineSite) {
    tripFilters.push(['mine_site', '=', filters.mineSite]);
  }
  if (filters?.vehicle) {
    tripFilters.push(['vehicle', '=', filters.vehicle]);
  }
  if (filters?.driver) {
    tripFilters.push(['driver', '=', filters.driver]);
  }
  if (filters?.material) {
    tripFilters.push(['material_type', '=', filters.material]);
  }

  const endpoint = `/api/resource/Mining%20Trip?fields=${encodeURIComponent(
    TRIP_FIELDS
  )}&filters=${encodeURIComponent(
    JSON.stringify(tripFilters)
  )}&order_by=creation%20desc&limit_page_length=200`;

  const res = await frappeFetch<{ data: any[] }>(endpoint, { sessionCookie });
  return (res.data || []).map(mapMiningTrip);
}

export async function getMiningTripById(
  sessionCookie: string,
  id: string,
  includeTest = false
): Promise<{
  trip: MiningTrip | null;
  validTransitions: string[];
  vehicleDetails: Vehicle | null;
  driverDetails: Driver | null;
  siteDetails: MineSite | null;
}> {
  const endpoint = `/api/resource/Mining%20Trip/${encodeURIComponent(id)}`;
  const res = await frappeFetch<{ data: any }>(endpoint, { sessionCookie });
  if (!res.data) {
    return {
      trip: null,
      validTransitions: [],
      vehicleDetails: null,
      driverDetails: null,
      siteDetails: null,
    };
  }

  if (!includeTest && res.data.is_test_record) {
    return {
      trip: null,
      validTransitions: [],
      vehicleDetails: null,
      driverDetails: null,
      siteDetails: null,
    };
  }

  const trip = mapMiningTrip(res.data);

  // Fetch valid workflow transitions for current user
  let validTransitions: string[] = [];
  try {
    const transRes = await frappeFetch<{ message?: any[] }>(
      '/api/method/frappe.model.workflow.get_transitions',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doc: res.data }),
        sessionCookie,
      }
    );
    validTransitions = (transRes.message || []).map((t) => t.action);
  } catch (err) {
    console.warn(`Could not fetch transitions for trip ${id}:`, err);
  }

  // Fetch linked vehicle details
  let vehicleDetails: Vehicle | null = null;
  if (res.data.vehicle) {
    try {
      const vRes = await frappeFetch<{ data: any }>(
        `/api/resource/Vehicle/${encodeURIComponent(res.data.vehicle)}`,
        { sessionCookie }
      );
      if (vRes.data) {
        vehicleDetails = {
          id: vRes.data.name,
          licensePlate: vRes.data.license_plate,
          make: vRes.data.make,
          model: vRes.data.model,
          status: vRes.data.vehicle_status,
          assignedDriverId: vRes.data.assigned_driver || null,
          assignedDriverName: null,
          lastOdometer: Number(vRes.data.last_odometer || 0),
          payloadCapacityTons: Number(vRes.data.payload_capacity_tons || 0),
          fuelType: vRes.data.fuel_type || 'Diesel',
          statutory: {
            overall: 'valid',
            insurance: { title: 'Insurance', expiryDate: vRes.data.end_date || null, status: 'valid', daysRemaining: null },
            fitness: { title: 'Fitness', expiryDate: vRes.data.fitness_expiry_date || null, status: 'valid', daysRemaining: null },
            puc: { title: 'PUC', expiryDate: vRes.data.puc_expiry_date || null, status: 'valid', daysRemaining: null },
            roadTax: { title: 'Road Tax', expiryDate: vRes.data.road_tax_expiry_date || null, status: 'valid', daysRemaining: null },
            permit: { title: 'Permit', expiryDate: vRes.data.permit_expiry_date || null, status: 'valid', daysRemaining: null },
          },
        };
      }
    } catch {
      // Ignored if vehicle details unavailable
    }
  }

  // Fetch linked driver details
  let driverDetails: Driver | null = null;
  if (res.data.driver) {
    try {
      const dRes = await frappeFetch<{ data: any }>(
        `/api/resource/Driver/${encodeURIComponent(res.data.driver)}`,
        { sessionCookie }
      );
      if (dRes.data) {
        driverDetails = {
          id: dRes.data.name,
          name: dRes.data.name,
          fullName: dRes.data.full_name,
          status: dRes.data.status,
          cellNumber: dRes.data.cell_number || null,
          licenseNumber: dRes.data.license_number || null,
          issuingDate: dRes.data.issuing_date || null,
          expiryDate: dRes.data.expiry_date || null,
          medicalFitnessExpiry: dRes.data.medical_fitness_expiry || null,
          safetyScore: Number(dRes.data.safety_score || 0),
          assignedVehicle: dRes.data.assigned_vehicle || null,
          emergencyContactName: dRes.data.emergency_contact_name || null,
          emergencyContactPhone: dRes.data.emergency_contact_phone || null,
          licenseStatus: 'valid',
          daysToLicenseExpiry: null,
        };
      }
    } catch {
      // Ignored if driver details unavailable
    }
  }

  // Fetch linked mine site details
  let siteDetails: MineSite | null = null;
  if (res.data.mine_site) {
    try {
      const sRes = await frappeFetch<{ data: any }>(
        `/api/resource/Mine%20Site/${encodeURIComponent(res.data.mine_site)}`,
        { sessionCookie }
      );
      if (sRes.data) {
        siteDetails = {
          id: sRes.data.name,
          siteName: sRes.data.site_name,
          client: sRes.data.client || null,
          status: sRes.data.status,
          mineralType: sRes.data.mineral_type,
          dailyTargetTonnage: Number(sRes.data.daily_target_tonnage || 0),
          activeLoadingPits: Number(sRes.data.active_loading_pits || 0),
          location: sRes.data.location || null,
          ratePerTon: Number(sRes.data.rate_per_ton || 0),
        };
      }
    } catch {
      // Ignored if site details unavailable
    }
  }

  return {
    trip,
    validTransitions,
    vehicleDetails,
    driverDetails,
    siteDetails,
  };
}

export async function createMiningTrip(
  sessionCookie: string,
  input: CreateMiningTripInput
): Promise<MiningTrip> {
  const payload: any = {
    vehicle: input.vehicle,
    driver: input.driver,
    mine_site: input.mineSite,
    destination: input.destination,
    material_type: input.materialType,
    dispatch_date_time: input.dispatchDateTime,
  };
  if (input.challanNumber) payload.challan_number = input.challanNumber;
  if (input.ratePerTon != null) payload.rate_per_ton = input.ratePerTon;
  if (input.openingOdometer != null) payload.opening_odometer = input.openingOdometer;
  if (input.isTestRecord) payload.is_test_record = 1;

  const res = await frappeFetch<{ data: any }>('/api/resource/Mining%20Trip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    sessionCookie,
  });

  return mapMiningTrip(res.data);
}

export async function applyTripTransition(
  sessionCookie: string,
  id: string,
  input: TripTransitionInput
): Promise<MiningTrip> {
  // First, fetch current trip document
  const tripRes = await frappeFetch<{ data: any }>(
    `/api/resource/Mining%20Trip/${encodeURIComponent(id)}`,
    { sessionCookie }
  );
  if (!tripRes.data) {
    throw new Error(`Mining Trip '${id}' not found`);
  }

  // Handle pre-transition updates required by conditions
  let doc = tripRes.data;

  if (input.action === 'Confirm Weighbridge') {
    if (input.grossWeightTons == null || input.tareWeightTons == null) {
      throw new Error('Gross weight and tare weight are mandatory for weighbridge confirmation.');
    }
    const updateRes = await frappeFetch<{ data: any }>(
      `/api/resource/Mining%20Trip/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gross_weight_tons: input.grossWeightTons,
          tare_weight_tons: input.tareWeightTons,
        }),
        sessionCookie,
      }
    );
    doc = updateRes.data;
  } else if (input.action === 'Mark Delivered') {
    if (input.closingOdometer == null) {
      throw new Error('Closing odometer reading is mandatory to mark trip as delivered.');
    }
    const nowStr = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const updateRes = await frappeFetch<{ data: any }>(
      `/api/resource/Mining%20Trip/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closing_odometer: input.closingOdometer,
          return_date_time: input.returnDateTime || nowStr,
        }),
        sessionCookie,
      }
    );
    doc = updateRes.data;
  } else if (input.action === 'Cancel') {
    if (!input.cancellationReason || !input.cancellationReason.trim()) {
      throw new Error('A cancellation reason is strictly required when cancelling a Mining Trip.');
    }
    const updateRes = await frappeFetch<{ data: any }>(
      `/api/resource/Mining%20Trip/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cancellation_reason: input.cancellationReason.trim(),
        }),
        sessionCookie,
      }
    );
    doc = updateRes.data;
  }

  // Apply workflow transition
  const wfRes = await frappeFetch<{ message?: any }>(
    '/api/method/frappe.model.workflow.apply_workflow',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doc,
        action: input.action,
      }),
      sessionCookie,
    }
  );

  // Re-fetch the updated trip document to ensure complete and up-to-date fields
  try {
    const finalTripRes = await frappeFetch<{ data: any }>(
      `/api/resource/Mining%20Trip/${encodeURIComponent(id)}`,
      { sessionCookie }
    );
    if (finalTripRes.data) {
      return mapMiningTrip(finalTripRes.data);
    }
  } catch {
    // Fall back to wfRes or pre-transition doc if re-fetch fails
  }

  return mapMiningTrip(wfRes.message && Object.keys(wfRes.message).length > 0 ? wfRes.message : doc);
}

let cachedMaterials: { timestamp: number; options: string[] } | null = null;
const MATERIAL_CACHE_TTL_MS = 60 * 1000;

export async function getMiningTripMaterialOptions(
  sessionCookie: string,
  forceRefresh = false
): Promise<string[]> {
  const now = Date.now();
  if (!forceRefresh && cachedMaterials && (now - cachedMaterials.timestamp < MATERIAL_CACHE_TTL_MS)) {
    return cachedMaterials.options;
  }

  try {
    const res = await frappeFetch<{ docs?: Array<{ fields?: Array<{ fieldname: string; options?: string }> }> }>(
      '/api/method/frappe.desk.form.load.getdoctype',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctype: 'Mining Trip' }),
        sessionCookie,
      }
    );

    const doc = (res.docs && res.docs[0]) || {};
    const field = (doc.fields || []).find((f) => f.fieldname === 'material_type');
    if (field && typeof field.options === 'string') {
      const options = field.options
        .split('\n')
        .map((opt) => opt.trim())
        .filter(Boolean);
      if (options.length > 0) {
        cachedMaterials = { timestamp: now, options };
        return options;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch Mining Trip metadata from Frappe desk API:', error);
  }

  if (cachedMaterials) {
    return cachedMaterials.options;
  }
  return ['Iron Ore', 'Coal', 'Bauxite', 'Limestone', 'Manganese', 'Overburden', 'Other'];
}

export async function getTripFormOptions(
  sessionCookie: string
): Promise<{
  vehicles: Vehicle[];
  drivers: Driver[];
  mineSites: MineSite[];
  materials: string[];
}> {
  const [vehicles, drivers, mineSites, materials] = await Promise.all([
    getVehicles(sessionCookie, false),
    getDrivers(sessionCookie, false),
    getMineSites(sessionCookie, false),
    getMiningTripMaterialOptions(sessionCookie),
  ]);

  const activeVehicles = vehicles.filter((v) => v.status === 'Active');
  const activeDrivers = drivers.filter((d) => d.status === 'Active');
  const operationalSites = mineSites.filter((s) => s.status === 'Operational');

  return {
    vehicles: activeVehicles,
    drivers: activeDrivers,
    mineSites: operationalSites,
    materials,
  };
}

export async function getDispatchSummary(
  sessionCookie: string,
  includeTest = false
): Promise<DispatchMetrics> {
  const [trips, vehicles, drivers] = await Promise.all([
    getMiningTrips(sessionCookie, includeTest),
    getVehicles(sessionCookie, includeTest),
    getDrivers(sessionCookie, includeTest),
  ]);

  const pendingDispatches = trips.filter((t) => t.tripStatus === 'Draft').length;
  const assignedTrips = trips.filter(
    (t) => t.tripStatus === 'Draft' && Boolean(t.vehicle) && Boolean(t.driver)
  ).length;
  const dispatchedTrips = trips.filter((t) => t.tripStatus === 'Dispatched').length;
  const awaitingWeighbridge = trips.filter((t) => t.tripStatus === 'Dispatched').length;
  const deliveredTrips = trips.filter((t) => t.tripStatus === 'Delivered').length;

  // Active trips currently holding vehicles/drivers on road
  const activeTrips = trips.filter(
    (t) => t.tripStatus === 'Dispatched' || t.tripStatus === 'Weighbridge Confirmed'
  );
  const busyVehicles = new Set(activeTrips.map((t) => t.vehicle));
  const busyDrivers = new Set(activeTrips.map((t) => t.driver));

  const activeVehiclesAvailable = vehicles.filter(
    (v) => v.status === 'Active' && !busyVehicles.has(v.id)
  ).length;

  const activeDriversAvailable = drivers.filter(
    (d) => d.status === 'Active' && !busyDrivers.has(d.id)
  ).length;

  return {
    pendingDispatches,
    assignedTrips,
    dispatchedTrips,
    awaitingWeighbridge,
    deliveredTrips,
    activeVehiclesAvailable,
    activeDriversAvailable,
  };
}

export async function checkDispatchEligibility(
  sessionCookie: string,
  vehicleId: string,
  driverId: string,
  openingOdometer?: number
): Promise<DispatchEligibilityResult> {
  const checks: DispatchEligibilityCheck[] = [];
  const errors: string[] = [];
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Fetch Vehicle record directly
  let vehicleDoc: any = null;
  try {
    const vRes = await frappeFetch<{ data: any }>(
      `/api/resource/Vehicle/${encodeURIComponent(vehicleId)}`,
      { sessionCookie }
    );
    vehicleDoc = vRes.data;
  } catch {
    errors.push(`Vehicle '${vehicleId}' not found or inaccessible.`);
    return {
      eligible: false,
      vehicle: vehicleId,
      driver: driverId,
      checks: [
        {
          item: 'Vehicle Record Exists',
          category: 'Vehicle',
          status: 'Fail',
          details: `Vehicle '${vehicleId}' does not exist in the database.`,
        },
      ],
      errors,
    };
  }

  // 2. Fetch Driver record directly
  let driverDoc: any = null;
  try {
    const dRes = await frappeFetch<{ data: any }>(
      `/api/resource/Driver/${encodeURIComponent(driverId)}`,
      { sessionCookie }
    );
    driverDoc = dRes.data;
  } catch {
    errors.push(`Driver '${driverId}' not found or inaccessible.`);
    return {
      eligible: false,
      vehicle: vehicleId,
      driver: driverId,
      checks: [
        {
          item: 'Driver Record Exists',
          category: 'Driver',
          status: 'Fail',
          details: `Driver '${driverId}' does not exist in the database.`,
        },
      ],
      errors,
    };
  }

  // Check 1: Vehicle Operational Status
  const vStatus = vehicleDoc.vehicle_status || 'Unknown';
  if (vStatus === 'Active') {
    checks.push({
      item: 'Vehicle Status Operational',
      category: 'Vehicle',
      status: 'Pass',
      details: 'Vehicle status is Active.',
    });
  } else {
    checks.push({
      item: 'Vehicle Status Operational',
      category: 'Vehicle',
      status: 'Fail',
      details: `Vehicle status is '${vStatus}'. Only Active vehicles are eligible for dispatch.`,
    });
    errors.push(`Vehicle '${vehicleId}' has status '${vStatus}' and is not available for dispatch.`);
  }

  // Check 2: Conflicting Active Trips for Vehicle
  const vTripFilter = JSON.stringify([
    ['vehicle', '=', vehicleId],
    ['trip_status', 'in', ['Dispatched', 'Weighbridge Confirmed']],
  ]);
  const vTripRes = await frappeFetch<{ data: any[] }>(
    `/api/resource/Mining%20Trip?filters=${encodeURIComponent(vTripFilter)}&fields=["name","challan_number"]`,
    { sessionCookie }
  ).catch(() => ({ data: [] }));

  if (vTripRes.data && vTripRes.data.length > 0) {
    const activeTrip = vTripRes.data[0];
    checks.push({
      item: 'Vehicle Active Trip Conflict',
      category: 'Vehicle',
      status: 'Fail',
      details: `Vehicle is already engaged on active trip '${activeTrip.name}'.`,
    });
    errors.push(
      `Vehicle '${vehicleId}' is already on active trip '${activeTrip.name}'. Concurrent active trips are prohibited.`
    );
  } else {
    checks.push({
      item: 'Vehicle Active Trip Conflict',
      category: 'Vehicle',
      status: 'Pass',
      details: 'No conflicting active trips for vehicle.',
    });
  }

  // Check 3: Vehicle Insurance Validity
  const insFilter = JSON.stringify([
    ['vehicle', '=', vehicleId],
    ['policy_status', '=', 'Active'],
    ['start_date', '<=', todayStr],
    ['end_date', '>=', todayStr],
  ]);
  const insRes = await frappeFetch<{ data: any[] }>(
    `/api/resource/Vehicle%20Insurance%20Policy?filters=${encodeURIComponent(insFilter)}`,
    { sessionCookie }
  ).catch(() => ({ data: [] }));

  const hasPolicy = insRes.data && insRes.data.length > 0;
  const legacyCovered =
    Boolean(vehicleDoc.end_date) &&
    Boolean(vehicleDoc.start_date) &&
    vehicleDoc.start_date <= todayStr &&
    vehicleDoc.end_date >= todayStr;

  if (hasPolicy || legacyCovered) {
    checks.push({
      item: 'Vehicle Statutory Insurance',
      category: 'Vehicle',
      status: 'Pass',
      details: `Active insurance coverage verified for today (${todayStr}).`,
    });
  } else {
    checks.push({
      item: 'Vehicle Statutory Insurance',
      category: 'Vehicle',
      status: 'Fail',
      details: 'No active insurance coverage recorded covering today.',
    });
    errors.push(
      `Cannot dispatch Vehicle '${vehicleId}': No active insurance coverage recorded covering today.`
    );
  }

  // Check 4: Vehicle Fitness Certificate Expiry
  const fitExp = vehicleDoc.fitness_expiry_date;
  if (fitExp && fitExp >= todayStr) {
    checks.push({
      item: 'Vehicle Fitness Certificate',
      category: 'Vehicle',
      status: 'Pass',
      details: `Valid fitness certificate until ${fitExp}.`,
    });
  } else {
    checks.push({
      item: 'Vehicle Fitness Certificate',
      category: 'Vehicle',
      status: 'Fail',
      details: fitExp
        ? `Fitness certificate expired on ${fitExp}.`
        : 'No fitness certificate recorded.',
    });
    errors.push(
      `Cannot dispatch Vehicle '${vehicleId}': Fitness certificate is ${fitExp ? `expired (${fitExp})` : 'missing'}.`
    );
  }

  // Check 4B: Vehicle Pollution Under Control (PUC) Certificate Expiry
  const pucExp = vehicleDoc.puc_expiry_date;
  if (pucExp && pucExp >= todayStr) {
    checks.push({
      item: 'Vehicle PUC Certificate',
      category: 'Vehicle',
      status: 'Pass',
      details: `Valid PUC certificate until ${pucExp}.`,
    });
  } else {
    checks.push({
      item: 'Vehicle PUC Certificate',
      category: 'Vehicle',
      status: 'Fail',
      details: pucExp
        ? `PUC certificate expired on ${pucExp}.`
        : 'No PUC certificate recorded.',
    });
    errors.push(
      `Cannot dispatch Vehicle '${vehicleId}': PUC certificate is ${pucExp ? `expired (${pucExp})` : 'missing'}.`
    );
  }

  // Check 4C: Vehicle Road Tax Expiry
  const taxExp = vehicleDoc.road_tax_expiry_date;
  if (taxExp && taxExp >= todayStr) {
    checks.push({
      item: 'Vehicle Road Tax Receipt',
      category: 'Vehicle',
      status: 'Pass',
      details: `Valid road tax receipt until ${taxExp}.`,
    });
  } else {
    checks.push({
      item: 'Vehicle Road Tax Receipt',
      category: 'Vehicle',
      status: 'Fail',
      details: taxExp
        ? `Road tax receipt expired on ${taxExp}.`
        : 'No road tax receipt recorded.',
    });
    errors.push(
      `Cannot dispatch Vehicle '${vehicleId}': Road tax receipt is ${taxExp ? `expired (${taxExp})` : 'missing'}.`
    );
  }

  // Check 4D: Vehicle Goods Permit Expiry
  const permitExp = vehicleDoc.permit_expiry_date;
  if (permitExp && permitExp >= todayStr) {
    checks.push({
      item: 'Vehicle Goods Permit',
      category: 'Vehicle',
      status: 'Pass',
      details: `Valid goods permit until ${permitExp}.`,
    });
  } else {
    checks.push({
      item: 'Vehicle Goods Permit',
      category: 'Vehicle',
      status: 'Fail',
      details: permitExp
        ? `Goods permit expired on ${permitExp}.`
        : 'No goods permit recorded.',
    });
    errors.push(
      `Cannot dispatch Vehicle '${vehicleId}': Goods permit is ${permitExp ? `expired (${permitExp})` : 'missing'}.`
    );
  }

  // Check 5: Odometer Monotonic Progression
  const lastOdo = Number(vehicleDoc.last_odometer || 0);
  if (openingOdometer != null && openingOdometer > 0) {
    if (openingOdometer < lastOdo) {
      checks.push({
        item: 'Odometer Progression',
        category: 'Vehicle',
        status: 'Fail',
        details: `Opening odometer (${openingOdometer} km) is less than vehicle's last recorded odometer (${lastOdo} km).`,
      });
      errors.push(
        `Opening odometer (${openingOdometer} km) cannot be less than vehicle's last recorded odometer (${lastOdo} km).`
      );
    } else {
      checks.push({
        item: 'Odometer Progression',
        category: 'Vehicle',
        status: 'Pass',
        details: `Opening odometer (${openingOdometer} km) is >= last recorded (${lastOdo} km).`,
      });
    }
  } else {
    checks.push({
      item: 'Odometer Reading',
      category: 'Vehicle',
      status: 'Pass',
      details: `Last recorded odometer: ${lastOdo} km.`,
    });
  }

  // Check 6: Driver Operational Status
  const dStatus = driverDoc.status || 'Unknown';
  if (dStatus === 'Active') {
    checks.push({
      item: 'Driver Operational Status',
      category: 'Driver',
      status: 'Pass',
      details: 'Driver status is Active.',
    });
  } else {
    checks.push({
      item: 'Driver Operational Status',
      category: 'Driver',
      status: 'Fail',
      details: `Driver status is '${dStatus}'. Only Active drivers are eligible for dispatch.`,
    });
    errors.push(`Driver '${driverId}' has status '${dStatus}' and is not available for dispatch.`);
  }

  // Check 7: Conflicting Active Trips for Driver
  const dTripFilter = JSON.stringify([
    ['driver', '=', driverId],
    ['trip_status', 'in', ['Dispatched', 'Weighbridge Confirmed']],
  ]);
  const dTripRes = await frappeFetch<{ data: any[] }>(
    `/api/resource/Mining%20Trip?filters=${encodeURIComponent(dTripFilter)}&fields=["name","challan_number"]`,
    { sessionCookie }
  ).catch(() => ({ data: [] }));

  if (dTripRes.data && dTripRes.data.length > 0) {
    const activeTrip = dTripRes.data[0];
    checks.push({
      item: 'Driver Active Trip Conflict',
      category: 'Driver',
      status: 'Fail',
      details: `Driver is already engaged on active trip '${activeTrip.name}'.`,
    });
    errors.push(
      `Driver '${driverId}' is already on active trip '${activeTrip.name}'. Multiple active trips for the same driver are prohibited.`
    );
  } else {
    checks.push({
      item: 'Driver Active Trip Conflict',
      category: 'Driver',
      status: 'Pass',
      details: 'No conflicting active trips for driver.',
    });
  }

  // Check 8: Driver License Validity
  const licExp = driverDoc.expiry_date;
  if (licExp && licExp >= todayStr) {
    checks.push({
      item: 'Driver Driving License',
      category: 'Driver',
      status: 'Pass',
      details: `Valid driving license until ${licExp}.`,
    });
  } else {
    checks.push({
      item: 'Driver Driving License',
      category: 'Driver',
      status: 'Fail',
      details: licExp
        ? `Driving license expired on ${licExp}.`
        : 'No driving license expiry recorded.',
    });
    errors.push(
      `Cannot dispatch Driver '${driverId}': Driving license is ${licExp ? `expired (${licExp})` : 'missing'}.`
    );
  }

  // Check 9: Driver Shift Allocation Conflict
  try {
    const shiftFilters = JSON.stringify([
      ['driver', '=', driverId],
      ['status', '=', 'Active'],
      ['vehicle', '!=', vehicleId],
    ]);
    const shiftRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Vehicle%20Driver%20Shift%20Allocation?filters=${encodeURIComponent(shiftFilters)}&fields=["name","vehicle","shift_type"]`,
      { sessionCookie }
    ).catch(() => ({ data: [] }));

    if (shiftRes.data && shiftRes.data.length > 0) {
      const activeShift = shiftRes.data[0];
      checks.push({
        item: 'Driver Shift Allocation Conflict',
        category: 'Driver',
        status: 'Fail',
        details: `Driver is currently actively allocated to vehicle '${activeShift.vehicle}' (${activeShift.shift_type}).`,
      });
      errors.push(
        `Cannot dispatch Driver '${driverId}': Driver is actively assigned to vehicle '${activeShift.vehicle}' in shift '${activeShift.shift_type}'.`
      );
    } else {
      checks.push({
        item: 'Driver Shift Allocation Conflict',
        category: 'Driver',
        status: 'Pass',
        details: 'No conflicting active shift allocation on another vehicle.',
      });
    }
  } catch {
    // Fail silently if shift allocation check is not reachable
  }

  return {
    eligible: errors.length === 0,
    vehicle: vehicleId,
    driver: driverId,
    checks,
    errors,
  };
}

// ============================================================================
// MODULE 5: WEIGHBRIDGE MANAGEMENT HELPERS
// ============================================================================

export async function getWeighbridgeData(
  sessionCookie: string,
  includeTest = false
): Promise<{
  metrics: WeighbridgeMetrics;
  pendingQueue: MiningTrip[];
  completedRecords: MiningTrip[];
}> {
  const trips = await getMiningTrips(sessionCookie, includeTest);

  const pendingQueue = trips.filter(
    (t) => t.tripStatus === 'Dispatched' || t.workflowState === 'Dispatched'
  );

  const completedRecords = trips.filter(
    (t) =>
      t.tripStatus === 'Weighbridge Confirmed' ||
      t.tripStatus === 'Approved' ||
      t.tripStatus === 'Delivered'
  );

  const todayStr = new Date().toISOString().substring(0, 10);
  const completedTodayCount = completedRecords.filter(
    (r) =>
      (r.dispatchDateTime && r.dispatchDateTime.startsWith(todayStr)) ||
      (r.modified && r.modified.startsWith(todayStr))
  ).length;

  const totalTonnageWeighed = completedRecords.reduce(
    (sum, r) => sum + (Number(r.netWeightTons) || 0),
    0
  );

  const averageNetPayloadTons =
    completedRecords.length > 0
      ? Math.round((totalTonnageWeighed / completedRecords.length) * 1000) / 1000
      : 0;

  return {
    metrics: {
      pendingTripsCount: pendingQueue.length,
      completedTodayCount,
      totalTonnageWeighed: Math.round(totalTonnageWeighed * 1000) / 1000,
      averageNetPayloadTons,
    },
    pendingQueue,
    completedRecords,
  };
}

export async function confirmWeighbridgeScale(
  sessionCookie: string,
  input: ConfirmWeighbridgeInput
): Promise<MiningTrip> {
  const { tripId, grossWeightTons, tareWeightTons, challanNumber } = input;

  if (challanNumber && challanNumber.trim()) {
    try {
      await frappeFetch(`/api/resource/Mining%20Trip/${encodeURIComponent(tripId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challan_number: challanNumber.trim() }),
        sessionCookie,
      });
    } catch (e) {
      console.warn(`Could not update challan number on trip ${tripId}:`, e);
    }
  }

  return await applyTripTransition(sessionCookie, tripId, {
    action: 'Confirm Weighbridge',
    grossWeightTons,
    tareWeightTons,
  });
}

// ============================================================================
// MODULE 6: FUEL MANAGEMENT HELPERS
// ============================================================================

export function mapFuelLog(
  raw: any,
  driverMap?: Map<string, string>,
  siteMap?: Map<string, string>
): FuelLog {
  return {
    id: raw.name,
    vehicle: raw.vehicle || '',
    driver: raw.driver || null,
    driverName:
      raw.driver && driverMap ? driverMap.get(raw.driver) || raw.driver : raw.driver || null,
    mineSite: raw.mine_site || null,
    mineSiteName:
      raw.mine_site && siteMap ? siteMap.get(raw.mine_site) || raw.mine_site : raw.mine_site || null,
    fuelDate: raw.fuel_date || '',
    fuelSource: (raw.fuel_source as FuelSource) || 'Site Bowser',
    odometerReading: Number(raw.odometer_reading_km) || 0,
    previousOdometer: raw.previous_odometer_km != null ? Number(raw.previous_odometer_km) : null,
    distanceTravelled: Number(raw.distance_travelled_km) || 0,
    isFullTank: Boolean(raw.is_full_tank),
    kmPerLitre: Number(raw.km_per_litre) || 0,
    efficiencyNote: raw.efficiency_note || null,
    quantityLitres: Number(raw.quantity_litres) || 0,
    ratePerLitre: Number(raw.rate_per_litre) || 0,
    totalCost: Number(raw.total_fuel_cost) || 0,
    paymentMethod: (raw.payment_method as FuelPaymentMethod) || null,
    fuelStation: raw.fuel_station || null,
    fuelSlipDoc: raw.fuel_slip_doc || null,
    remarks: raw.remarks || null,
    approvalStatus: (raw.approval_status as FuelApprovalStatus) || 'Draft',
    approvedBy: raw.approved_by || null,
    approvedOn: raw.approved_on || null,
    rejectedBy: raw.rejected_by || null,
    rejectedOn: raw.rejected_on || null,
    rejectionReason: raw.rejection_reason || null,
    workflowState: raw.workflow_state || null,
    owner: raw.owner || null,
    isTestRecord: Boolean(raw.is_test_record),
    creation: raw.creation,
    modified: raw.modified,
  };
}

export async function getFuelLogs(
  sessionCookie: string,
  options?: {
    vehicle?: string;
    status?: string;
    source?: string;
    mineSite?: string;
    includeTest?: boolean;
  }
): Promise<{ logs: FuelLog[]; metrics: FuelMetrics }> {
  try {
    const fields = JSON.stringify([
      'name',
      'owner',
      'vehicle',
      'driver',
      'mine_site',
      'fuel_date',
      'fuel_source',
      'odometer_reading_km',
      'previous_odometer_km',
      'distance_travelled_km',
      'is_full_tank',
      'km_per_litre',
      'efficiency_note',
      'quantity_litres',
      'rate_per_litre',
      'total_fuel_cost',
      'payment_method',
      'fuel_station',
      'remarks',
      'approval_status',
      'approved_by',
      'approved_on',
      'rejected_by',
      'rejected_on',
      'rejection_reason',
      'workflow_state',
      'is_test_record',
      'creation',
      'modified',
    ]);

    const filters: any[] = [];
    if (!options?.includeTest) {
      filters.push(['is_test_record', '=', 0]);
    }
    if (options?.vehicle) {
      filters.push(['vehicle', '=', options.vehicle]);
    }
    if (options?.status && options.status !== 'ALL') {
      filters.push(['approval_status', '=', options.status]);
    }
    if (options?.source && options.source !== 'ALL') {
      filters.push(['fuel_source', '=', options.source]);
    }
    if (options?.mineSite && options.mineSite !== 'ALL') {
      filters.push(['mine_site', '=', options.mineSite]);
    }

    const filterQuery =
      filters.length > 0 ? `&filters=${encodeURIComponent(JSON.stringify(filters))}` : '';

    const [logsRes, drivers, sites] = await Promise.all([
      frappeFetch<{ data: any[] }>(
        `/api/resource/Fuel%20Log?fields=${encodeURIComponent(
          fields
        )}${filterQuery}&order_by=fuel_date%20desc,creation%20desc&limit_page_length=200`,
        { sessionCookie }
      ),
      getDrivers(sessionCookie, options?.includeTest).catch(() => []),
      getMineSites(sessionCookie, options?.includeTest).catch(() => []),
    ]);

    const driverMap = new Map<string, string>();
    for (const d of drivers) {
      driverMap.set(d.id, d.fullName);
    }

    const siteMap = new Map<string, string>();
    for (const s of sites) {
      siteMap.set(s.id, s.siteName);
    }

    const rawLogs = logsRes.data || [];
    const logs = rawLogs.map((l) => mapFuelLog(l, driverMap, siteMap));

    const approvedLogs = logs.filter((l) => l.approvalStatus === 'Approved');
    const pendingLogs = logs.filter((l) => l.approvalStatus === 'Draft');

    const totalLitres =
      Math.round(approvedLogs.reduce((sum, l) => sum + (l.quantityLitres || 0), 0) * 10) / 10;

    const totalFuelCost =
      Math.round(approvedLogs.reduce((sum, l) => sum + (l.totalCost || 0), 0) * 100) / 100;

    const averageRatePerLitre =
      totalLitres > 0 ? Math.round((totalFuelCost / totalLitres) * 100) / 100 : 0;

    const fullTankApproved = approvedLogs.filter((l) => l.isFullTank && (l.kmPerLitre || 0) > 0);
    const sumKmPerLitre = fullTankApproved.reduce((sum, l) => sum + (l.kmPerLitre || 0), 0);
    const averageKmPerLitre =
      fullTankApproved.length > 0
        ? Math.round((sumKmPerLitre / fullTankApproved.length) * 100) / 100
        : 0;

    const metrics: FuelMetrics = {
      totalLitres,
      totalFuelCost,
      averageRatePerLitre,
      averageKmPerLitre,
      pendingApprovalsCount: pendingLogs.length,
      approvedLogsCount: approvedLogs.length,
    };

    return { logs, metrics };
  } catch (error: any) {
    console.error('Failed to fetch fuel logs:', error);
    if (error.status === 401 || error.status === 403) throw error;
    return {
      logs: [],
      metrics: {
        totalLitres: 0,
        totalFuelCost: 0,
        averageRatePerLitre: 0,
        averageKmPerLitre: 0,
        pendingApprovalsCount: 0,
        approvedLogsCount: 0,
      },
    };
  }
}

export async function getFuelLogDetails(
  sessionCookie: string,
  id: string
): Promise<{ log: FuelLog; recentVehicleLogs: FuelLog[] }> {
  const logRes = await frappeFetch<{ data: any }>(
    `/api/resource/Fuel%20Log/${encodeURIComponent(id)}`,
    { sessionCookie }
  );
  if (!logRes.data) {
    throw new Error(`Fuel Log '${id}' not found`);
  }

  const [drivers, sites] = await Promise.all([
    getDrivers(sessionCookie, true).catch(() => []),
    getMineSites(sessionCookie, true).catch(() => []),
  ]);

  const driverMap = new Map<string, string>();
  for (const d of drivers) driverMap.set(d.id, d.fullName);

  const siteMap = new Map<string, string>();
  for (const s of sites) siteMap.set(s.id, s.siteName);

  const log = mapFuelLog(logRes.data, driverMap, siteMap);

  let recentVehicleLogs: FuelLog[] = [];
  if (log.vehicle) {
    try {
      const vFilter = JSON.stringify([['vehicle', '=', log.vehicle]]);
      const vLogsRes = await frappeFetch<{ data: any[] }>(
        `/api/resource/Fuel%20Log?filters=${encodeURIComponent(
          vFilter
        )}&order_by=fuel_date%20desc,creation%20desc&limit_page_length=5`,
        { sessionCookie }
      );
      recentVehicleLogs = (vLogsRes.data || []).map((l) =>
        mapFuelLog(l, driverMap, siteMap)
      );
    } catch {
      recentVehicleLogs = [];
    }
  }

  return { log, recentVehicleLogs };
}

export async function createFuelLog(
  sessionCookie: string,
  input: CreateFuelLogInput
): Promise<FuelLog> {
  const calculatedCost =
    input.totalCost != null
      ? Number(input.totalCost)
      : Math.round(Number(input.quantityLitres) * Number(input.ratePerLitre) * 100) / 100;

  const payload: any = {
    doctype: 'Fuel Log',
    vehicle: input.vehicle.trim(),
    fuel_date: input.fuelDate,
    fuel_source: input.fuelSource,
    odometer_reading_km: Number(input.odometerReading),
    is_full_tank: input.isFullTank !== false ? 1 : 0,
    quantity_litres: Number(input.quantityLitres),
    rate_per_litre: Number(input.ratePerLitre),
    total_fuel_cost: calculatedCost,
    is_test_record: input.isTestRecord ? 1 : 0,
  };

  if (input.driver && input.driver.trim()) {
    payload.driver = input.driver.trim();
  }
  if (input.mineSite && input.mineSite.trim()) {
    payload.mine_site = input.mineSite.trim();
  }
  if (input.paymentMethod) {
    payload.payment_method = input.paymentMethod;
  }
  if (input.fuelStation && input.fuelStation.trim()) {
    payload.fuel_station = input.fuelStation.trim();
  }
  if (input.remarks && input.remarks.trim()) {
    payload.remarks = input.remarks.trim();
  }

  const res = await frappeFetch<{ data: any }>('/api/resource/Fuel%20Log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    sessionCookie,
  });

  return mapFuelLog(res.data);
}

export async function applyFuelTransition(
  sessionCookie: string,
  id: string,
  input: FuelTransitionInput,
  user?: { email: string; role: string }
): Promise<FuelLog> {
  const logRes = await frappeFetch<{ data: any }>(
    `/api/resource/Fuel%20Log/${encodeURIComponent(id)}`,
    { sessionCookie }
  );
  if (!logRes.data) {
    throw new Error(`Fuel Log '${id}' not found`);
  }

  let doc = logRes.data;

  // Anti-Self-Approval Enforcement:
  // The user who created the fuel log cannot approve it (unless System Administrator)
  if (input.action === 'Approve') {
    if (user && user.role !== 'Administrator' && doc.owner && (doc.owner.toLowerCase() === user.email.toLowerCase())) {
      const err: any = new Error('Self-approval prohibited: Creator cannot approve their own fuel entry.');
      err.status = 403;
      throw err;
    }
  }

  if (input.action === 'Reject') {
    if (!input.rejectionReason || !input.rejectionReason.trim()) {
      throw new Error('A rejection reason is strictly required when rejecting a Fuel Log.');
    }
    const updateRes = await frappeFetch<{ data: any }>(
      `/api/resource/Fuel%20Log/${encodeURIComponent(id)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rejection_reason: input.rejectionReason.trim(),
        }),
        sessionCookie,
      }
    );
    doc = updateRes.data;
  }

  const wfRes = await frappeFetch<{ message?: any }>(
    '/api/method/frappe.model.workflow.apply_workflow',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doc,
        action: input.action,
      }),
      sessionCookie,
    }
  );

  try {
    const finalLogRes = await frappeFetch<{ data: any }>(
      `/api/resource/Fuel%20Log/${encodeURIComponent(id)}`,
      { sessionCookie }
    );
    if (finalLogRes.data) {
      return mapFuelLog(finalLogRes.data);
    }
  } catch {
    // fallback
  }

  return mapFuelLog(wfRes.message && Object.keys(wfRes.message).length > 0 ? wfRes.message : doc);
}

export async function getFuelOptions(sessionCookie: string): Promise<{
  vehicles: Array<{ id: string; licensePlate: string; lastOdometer: number; status: string }>;
  drivers: Array<{ id: string; fullName: string; status: string }>;
  mineSites: Array<{ id: string; siteName: string }>;
  fuelSources: string[];
  paymentMethods: string[];
}> {
  const [vehicles, drivers, sites] = await Promise.all([
    getVehicles(sessionCookie, false),
    getDrivers(sessionCookie, false),
    getMineSites(sessionCookie, false),
  ]);

  const activeVehicles = vehicles
    .filter((v) => v.status === 'Active')
    .map((v) => ({
      id: v.id,
      licensePlate: v.licensePlate,
      lastOdometer: v.lastOdometer,
      status: v.status,
    }));

  const activeDrivers = drivers
    .filter((d) => d.status === 'Active')
    .map((d) => ({
      id: d.id,
      fullName: d.fullName,
      status: d.status,
    }));

  const operationalSites = sites
    .filter((s) => s.status === 'Operational')
    .map((s) => ({
      id: s.id,
      siteName: s.siteName,
    }));

  let fuelSources = ['Site Bowser', 'External Pump'];
  let paymentMethods = ['Company Card', 'Bank Transfer', 'UPI', 'Cash'];

  try {
    const metaRes = await frappeFetch<{
      docs?: Array<{ fields?: Array<{ fieldname: string; options?: string }> }>;
    }>('/api/method/frappe.desk.form.load.getdoctype', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctype: 'Fuel Log' }),
      sessionCookie,
    });

    const doc = (metaRes.docs && metaRes.docs[0]) || {};
    const sourceField = (doc.fields || []).find((f) => f.fieldname === 'fuel_source');
    if (sourceField && typeof sourceField.options === 'string') {
      const opts = sourceField.options.split('\n').map((o) => o.trim()).filter(Boolean);
      if (opts.length > 0) fuelSources = opts;
    }

    const payField = (doc.fields || []).find((f) => f.fieldname === 'payment_method');
    if (payField && typeof payField.options === 'string') {
      const opts = payField.options.split('\n').map((o) => o.trim()).filter(Boolean);
      if (opts.length > 0) paymentMethods = opts;
    }
  } catch (e) {
    console.warn('Could not fetch Fuel Log metadata options:', e);
  }

  return {
    vehicles: activeVehicles,
    drivers: activeDrivers,
    mineSites: operationalSites,
    fuelSources,
    paymentMethods,
  };
}

// ============================================================================
// PHASE 3 — MODULE A: BREAKDOWN & MAINTENANCE REPOSITORY
// ============================================================================

export async function getBreakdowns(
  sessionCookie: string,
  options?: {
    vehicle?: string;
    status?: string;
    severity?: string;
    breakdownType?: string;
    mineSite?: string;
    includeTest?: boolean;
  }
): Promise<{ breakdowns: VehicleBreakdown[]; metrics: BreakdownMetrics }> {
  try {
    const fields = JSON.stringify([
      'name',
      'naming_series',
      'breakdown_datetime',
      'vehicle',
      'driver',
      'mine_site',
      'related_trip',
      'breakdown_type',
      'severity',
      'odometer_reading',
      'reported_by',
      'description',
      'repair_status',
      'assigned_workshop',
      'workflow_state',
      'repair_start_datetime',
      'repair_completion_datetime',
      'downtime_hours',
      'repair_description',
      'parts_cost',
      'labour_cost',
      'total_repair_cost',
      'approved_by',
      'approved_on',
      'closed_by',
      'closed_on',
      'resolution_type',
      'rejection_reason',
      'is_test_record',
      'creation',
      'modified',
    ]);

    const filters: any[] = [];
    if (!options?.includeTest) {
      filters.push(['is_test_record', '=', 0]);
    }
    if (options?.vehicle && options.vehicle !== 'ALL') {
      filters.push(['vehicle', '=', options.vehicle]);
    }
    if (options?.status && options.status !== 'ALL') {
      filters.push(['repair_status', '=', options.status]);
    }
    if (options?.severity && options.severity !== 'ALL') {
      filters.push(['severity', '=', options.severity]);
    }
    if (options?.breakdownType && options.breakdownType !== 'ALL') {
      filters.push(['breakdown_type', '=', options.breakdownType]);
    }
    if (options?.mineSite && options.mineSite !== 'ALL') {
      filters.push(['mine_site', '=', options.mineSite]);
    }

    const res = await frappeFetch<{ data: any[] }>(
      `/api/resource/Vehicle%20Breakdown?fields=${encodeURIComponent(
        fields
      )}&filters=${encodeURIComponent(
        JSON.stringify(filters)
      )}&order_by=breakdown_datetime%20desc&limit_page_length=500`,
      { sessionCookie }
    );

    const raw = res.data || [];

    const breakdowns: VehicleBreakdown[] = raw.map((b) => {
      const partsCost = Number(b.parts_cost) || 0;
      const laborCost = Number(b.labour_cost) || 0;
      const totalCost = Number(b.total_repair_cost) || (partsCost + laborCost);

      return {
        id: b.name,
        namingSeries: b.naming_series,
        breakdownDate: b.breakdown_datetime ? b.breakdown_datetime.split(' ')[0] : '',
        breakdownTime: b.breakdown_datetime ? b.breakdown_datetime.split(' ')[1] : '',
        breakdownDatetime: b.breakdown_datetime || '',
        vehicle: b.vehicle,
        vehiclePlate: b.vehicle,
        driver: b.driver || null,
        driverName: b.driver || null,
        mineSite: b.mine_site || null,
        mineSiteName: b.mine_site || null,
        breakdownType: (b.breakdown_type as BreakdownType) || 'Other',
        severity: (b.severity as BreakdownSeverity) || 'Medium',
        breakdownLocation: b.description || 'On-site',
        odometerReading: b.odometer_reading != null ? Number(b.odometer_reading) : null,
        reportedBy: b.reported_by || null,
        reportedByName: b.reported_by || null,
        description: b.description || '',
        repairStatus: (b.repair_status as RepairStatus) || 'Reported',
        assignedWorkshop: b.assigned_workshop || null,
        assignedWorkshopName: b.assigned_workshop || null,
        workflowState: b.workflow_state || b.repair_status || 'Reported',
        repairStartDate: b.repair_start_datetime ? b.repair_start_datetime.split(' ')[0] : null,
        repairStartTime: b.repair_start_datetime ? b.repair_start_datetime.split(' ')[1] : null,
        repairStartDatetime: b.repair_start_datetime || null,
        repairCompletedDate: b.repair_completion_datetime ? b.repair_completion_datetime.split(' ')[0] : null,
        repairCompletedTime: b.repair_completion_datetime ? b.repair_completion_datetime.split(' ')[1] : null,
        repairCompletionDatetime: b.repair_completion_datetime || null,
        downtimeHours: Number(b.downtime_hours) || 0,
        repairDetails: b.repair_description || null,
        repairDescription: b.repair_description || null,
        partsCost,
        laborCost,
        labourCost: laborCost,
        totalCost,
        totalRepairCost: totalCost,
        parts: [],
        partsTable: [],
        approvedBy: b.approved_by || null,
        approvedOn: b.approved_on || null,
        closedBy: b.closed_by || null,
        closedOn: b.closed_on || null,
        rejectionReason: b.rejection_reason || null,
        isTestRecord: Boolean(b.is_test_record),
        creation: b.creation,
        modified: b.modified,
      };
    });

    const metrics: BreakdownMetrics = {
      totalIncidents: breakdowns.length,
      totalBreakdowns: breakdowns.length,
      inWorkshopCount: breakdowns.filter((b) => b.repairStatus === 'In Workshop').length,
      activeInWorkshop: breakdowns.filter((b) => b.repairStatus === 'In Workshop').length,
      awaitingPartsCount: breakdowns.filter((b) => b.repairStatus === 'Awaiting Parts').length,
      awaitingParts: breakdowns.filter((b) => b.repairStatus === 'Awaiting Parts').length,
      criticalIncidents: breakdowns.filter((b) => b.severity === 'Critical').length,
      totalDowntimeHours: Math.round(
        breakdowns.reduce((acc, b) => acc + (b.downtimeHours || 0), 0) * 10
      ) / 10,
      closedIncidents: breakdowns.filter((b) => b.repairStatus === 'Closed').length,
      totalRepairCost: breakdowns.reduce((acc, b) => acc + (b.totalCost || 0), 0),
    };

    return { breakdowns, metrics };
  } catch (error: any) {
    console.error('getBreakdowns error:', error?.message || error);
    throw new Error(error?.message || 'Failed to fetch vehicle breakdown records.');
  }
}

export async function getBreakdownDetails(
  sessionCookie: string,
  id: string
): Promise<VehicleBreakdown> {
  const res = await frappeFetch<{ data: any }>(
    `/api/resource/Vehicle%20Breakdown/${encodeURIComponent(id)}`,
    { sessionCookie }
  );

  const b = res.data;
  if (!b) throw new Error(`Vehicle breakdown '${id}' not found.`);

  const parts: VehicleBreakdownPart[] = (b.parts || b.parts_table || []).map((p: any) => ({
    name: p.name,
    itemCode: p.item_code,
    itemName: p.item_name || p.item_code,
    stockUom: p.stock_uom,
    plannedQty: Number(p.planned_qty) || 0,
    issuedQty: Number(p.issued_qty) || 0,
    warehouse: p.warehouse,
    rate: Number(p.rate) || 0,
    amount: Number(p.amount) || 0,
    stockEntry: p.stock_entry,
    status: p.status,
    returnedQty: Number(p.returned_qty) || 0,
    netIssuedQty: Number(p.net_issued_qty) || 0,
  }));

  const partsCost = Number(b.parts_cost) || 0;
  const laborCost = Number(b.labor_cost) || Number(b.labour_cost) || 0;
  const totalCost = Number(b.total_maintenance_cost) || Number(b.total_repair_cost) || (partsCost + laborCost);

  return {
    id: b.name,
    namingSeries: b.naming_series,
    breakdownDate: b.breakdown_date || (b.breakdown_datetime ? b.breakdown_datetime.split(' ')[0] : ''),
    breakdownTime: b.breakdown_time || (b.breakdown_datetime ? b.breakdown_datetime.split(' ')[1] : ''),
    breakdownDatetime: b.breakdown_datetime || `${b.breakdown_date || ''} ${b.breakdown_time || ''}`.trim(),
    vehicle: b.vehicle,
    vehiclePlate: b.vehicle,
    driver: b.driver || null,
    driverName: b.driver || null,
    mineSite: b.mine_site || null,
    mineSiteName: b.mine_site || null,
    breakdownType: (b.breakdown_type as BreakdownType) || 'Other',
    severity: (b.severity as BreakdownSeverity) || 'Medium',
    breakdownLocation: b.breakdown_location || 'On-site',
    odometerReading: b.odometer_reading != null ? Number(b.odometer_reading) : null,
    reportedBy: b.reported_by || null,
    reportedByName: b.reported_by || null,
    description: b.description || '',
    repairStatus: (b.repair_status as RepairStatus) || 'Reported',
    assignedWorkshop: b.assigned_workshop || null,
    assignedWorkshopName: b.assigned_workshop || null,
    workflowState: b.workflow_state || b.repair_status || 'Reported',
    repairStartDate: b.repair_start_date || (b.repair_start_datetime ? b.repair_start_datetime.split(' ')[0] : null),
    repairStartTime: b.repair_start_time || (b.repair_start_datetime ? b.repair_start_datetime.split(' ')[1] : null),
    repairStartDatetime: b.repair_start_datetime || `${b.repair_start_date || ''} ${b.repair_start_time || ''}`.trim() || null,
    repairCompletedDate: b.repair_completed_date || (b.repair_completion_datetime ? b.repair_completion_datetime.split(' ')[0] : null),
    repairCompletedTime: b.repair_completed_time || (b.repair_completion_datetime ? b.repair_completion_datetime.split(' ')[1] : null),
    repairCompletionDatetime: b.repair_completion_datetime || `${b.repair_completed_date || ''} ${b.repair_completed_time || ''}`.trim() || null,
    downtimeHours: Number(b.downtime_hours) || 0,
    repairDetails: b.repair_details || b.repair_description || null,
    repairDescription: b.repair_description || b.repair_details || null,
    workOrder: b.work_order || null,
    partsCost,
    laborCost,
    labourCost: laborCost,
    totalCost,
    totalRepairCost: totalCost,
    parts,
    partsTable: parts,
    approvedBy: b.approved_by || null,
    approvedOn: b.approved_on || null,
    closedBy: b.closed_by || null,
    closedOn: b.closed_on || null,
    rejectionReason: b.rejection_reason || null,
    isTestRecord: Boolean(b.is_test_record),
    creation: b.creation,
    modified: b.modified,
  };
}

export async function createBreakdown(
  sessionCookie: string,
  input: CreateBreakdownInput
): Promise<VehicleBreakdown> {
  const bdDate =
    input.breakdownDate ||
    (input.breakdownDatetime ? input.breakdownDatetime.split(' ')[0] : new Date().toISOString().substring(0, 10));
  const bdTime =
    input.breakdownTime ||
    (input.breakdownDatetime ? input.breakdownDatetime.split(' ')[1] : '10:00:00');
  const bdDatetime = `${bdDate} ${bdTime.length === 5 ? `${bdTime}:00` : bdTime}`.trim();

  // If driver was not passed, resolve from assigned vehicle driver or first active driver
  let driver = input.driver?.trim();
  if (!driver) {
    try {
      const vRes = await frappeFetch<{ data: any }>(
        `/api/resource/Vehicle/${encodeURIComponent(input.vehicle.trim())}`,
        { sessionCookie }
      );
      if (vRes.data && vRes.data.assigned_driver) {
        driver = vRes.data.assigned_driver;
      }
    } catch {}
  }
  if (!driver) {
    try {
      const dRes = await frappeFetch<{ data: any[] }>(
        `/api/resource/Driver?filters=${encodeURIComponent(JSON.stringify([['status', '=', 'Active']]))}&limit_page_length=1`,
        { sessionCookie }
      );
      if (dRes.data && dRes.data[0]) {
        driver = dRes.data[0].name;
      }
    } catch {}
  }

  const payload: any = {
    doctype: 'Vehicle Breakdown',
    vehicle: input.vehicle.trim(),
    driver: driver || undefined,
    breakdown_datetime: bdDatetime,
    breakdown_type: input.breakdownType,
    severity: input.severity,
    description: (input.description || input.breakdownLocation || 'Vehicle breakdown incident reported').trim(),
  };

  if (input.mineSite) payload.mine_site = input.mineSite.trim();
  if (input.relatedTrip) payload.related_trip = input.relatedTrip.trim();
  if (input.odometerReading != null && !isNaN(Number(input.odometerReading))) {
    payload.odometer_reading = Number(input.odometerReading);
  }
  if (input.assignedWorkshop) payload.assigned_workshop = input.assignedWorkshop.trim();
  if (input.repairDetails) payload.repair_description = input.repairDetails.trim();
  if (input.laborCost != null) payload.labour_cost = Number(input.laborCost);
  if (input.parts && Array.isArray(input.parts)) {
    payload.parts_table = input.parts.map((p) => ({
      item_code: p.itemCode,
      planned_qty: p.plannedQty,
      warehouse: p.warehouse,
      rate: p.rate || 0,
      amount: p.amount || p.plannedQty * (p.rate || 0),
    }));
  }
  if (input.isTestRecord) payload.is_test_record = 1;

  const res = await frappeFetch<{ data: any }>('/api/resource/Vehicle%20Breakdown', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    sessionCookie,
  });

  return getBreakdownDetails(sessionCookie, res.data.name);
}

export async function updateBreakdown(
  sessionCookie: string,
  id: string,
  input: UpdateBreakdownInput
): Promise<VehicleBreakdown> {
  const payload: any = {};
  if (input.assignedWorkshop !== undefined) payload.assigned_workshop = input.assignedWorkshop;
  if (input.repairStartDatetime !== undefined) payload.repair_start_datetime = input.repairStartDatetime;
  if (input.repairCompletionDatetime !== undefined) payload.repair_completion_datetime = input.repairCompletionDatetime;
  if (input.repairDescription !== undefined) payload.repair_description = input.repairDescription;
  if (input.labourCost !== undefined) payload.labour_cost = Number(input.labourCost);
  if (input.partsTable !== undefined) {
    payload.parts_table = input.partsTable.map((p) => ({
      item_code: p.itemCode,
      planned_qty: p.plannedQty,
      warehouse: p.warehouse,
    }));
  }

  await frappeFetch(`/api/resource/Vehicle%20Breakdown/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    sessionCookie,
  });

  return getBreakdownDetails(sessionCookie, id);
}

export async function applyBreakdownWorkflow(
  sessionCookie: string,
  id: string,
  action: string,
  extra?: {
    rejectionReason?: string;
    repairCompletionDatetime?: string;
    repairDescription?: string;
    repairDetails?: string;
    laborCost?: number;
    labourCost?: number;
    parts?: VehicleBreakdownPart[];
    partsTable?: VehicleBreakdownPart[];
  }
): Promise<VehicleBreakdown> {
  // If extra fields are provided (e.g. rejection reason or completion details), save them first
  if (extra) {
    const updatePayload: any = {};
    if (extra.rejectionReason) updatePayload.rejection_reason = extra.rejectionReason.trim();
    if (extra.repairCompletionDatetime) updatePayload.repair_completion_datetime = extra.repairCompletionDatetime;
    if (extra.repairDescription || extra.repairDetails) {
      updatePayload.repair_description = (extra.repairDescription || extra.repairDetails)!.trim();
    }
    const cost = extra.laborCost != null ? extra.laborCost : extra.labourCost;
    if (cost != null) {
      updatePayload.labour_cost = Number(cost);
    }
    const parts = extra.partsTable || extra.parts;
    if (parts && Array.isArray(parts) && parts.length > 0) {
      updatePayload.parts_table = parts.map((p) => ({
        item_code: p.itemCode,
        planned_qty: p.plannedQty,
        warehouse: p.warehouse,
        rate: p.rate || 0,
        amount: p.amount || p.plannedQty * (p.rate || 0),
      }));
    }

    if (Object.keys(updatePayload).length > 0) {
      await frappeFetch(`/api/resource/Vehicle%20Breakdown/${encodeURIComponent(id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
        sessionCookie,
      });
    }
  }

  // Fetch current doc for apply_workflow
  const current = await frappeFetch<{ data: any }>(
    `/api/resource/Vehicle%20Breakdown/${encodeURIComponent(id)}`,
    { sessionCookie }
  );

  await frappeFetch('/api/method/frappe.model.workflow.apply_workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      doc: current.data,
      action,
    }),
    sessionCookie,
  });

  return getBreakdownDetails(sessionCookie, id);
}

export async function getBreakdownOptions(sessionCookie: string): Promise<{
  vehicles: Array<{ id: string; licensePlate: string; status: string; lastOdometer: number }>;
  drivers: Array<{ id: string; fullName: string; status: string }>;
  mineSites: Array<{ id: string; siteName: string }>;
  workshops: Array<{ id: string; supplierName: string }>;
  breakdownTypes: string[];
  severities: string[];
  repairStatuses: string[];
}> {
  const [vehicles, drivers, sites] = await Promise.all([
    getVehicles(sessionCookie, false),
    getDrivers(sessionCookie, false),
    getMineSites(sessionCookie, false),
  ]);

  // Fetch workshops (Suppliers)
  let workshops: Array<{ id: string; supplierName: string }> = [];
  try {
    const supRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Supplier?fields=${encodeURIComponent(
        JSON.stringify(['name', 'supplier_name'])
      )}&limit_page_length=100`,
      { sessionCookie }
    );
    workshops = (supRes.data || []).map((s) => ({
      id: s.name,
      supplierName: s.supplier_name || s.name,
    }));
  } catch (e) {
    console.warn('Could not fetch Supplier workshops:', e);
  }

  let breakdownTypes = ['Engine', 'Hydraulic', 'Tyre', 'Electrical', 'Transmission', 'Brake', 'Other'];
  let severities = ['Low', 'Medium', 'Critical'];
  let repairStatuses = ['Reported', 'Approved', 'In Workshop', 'Awaiting Parts', 'Repaired', 'Closed'];

  try {
    const metaRes = await frappeFetch<{
      docs?: Array<{ fields?: Array<{ fieldname: string; options?: string }> }>;
    }>('/api/method/frappe.desk.form.load.getdoctype', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctype: 'Vehicle Breakdown' }),
      sessionCookie,
    });

    const doc = (metaRes.docs && metaRes.docs[0]) || {};
    const typeField = (doc.fields || []).find((f) => f.fieldname === 'breakdown_type');
    if (typeField && typeof typeField.options === 'string') {
      const opts = typeField.options.split('\n').map((o) => o.trim()).filter(Boolean);
      if (opts.length > 0) breakdownTypes = opts;
    }

    const sevField = (doc.fields || []).find((f) => f.fieldname === 'severity');
    if (sevField && typeof sevField.options === 'string') {
      const opts = sevField.options.split('\n').map((o) => o.trim()).filter(Boolean);
      if (opts.length > 0) severities = opts;
    }

    const statField = (doc.fields || []).find((f) => f.fieldname === 'repair_status');
    if (statField && typeof statField.options === 'string') {
      const opts = statField.options.split('\n').map((o) => o.trim()).filter(Boolean);
      if (opts.length > 0) repairStatuses = opts;
    }
  } catch (e) {
    console.warn('Could not fetch Vehicle Breakdown metadata options:', e);
  }

  return {
    vehicles: vehicles.map((v) => ({
      id: v.id,
      licensePlate: v.licensePlate,
      status: v.status,
      lastOdometer: v.lastOdometer,
    })),
    drivers: drivers.map((d) => ({
      id: d.id,
      fullName: d.fullName,
      status: d.status,
    })),
    mineSites: sites.map((s) => ({
      id: s.id,
      siteName: s.siteName,
    })),
    workshops,
    breakdownTypes,
    severities,
    repairStatuses,
  };
}

// ============================================================================
// PHASE 3 — MODULE B: OPERATIONAL EXPENSE REPOSITORY
// ============================================================================

export async function getExpenses(
  sessionCookie: string,
  options?: {
    category?: string;
    status?: string;
    vehicle?: string;
    miningTrip?: string;
    mineSite?: string;
    fromDate?: string;
    toDate?: string;
    includeTest?: boolean;
  }
): Promise<{ expenses: OperationalExpense[]; metrics: ExpenseMetrics }> {
  try {
    const fields = JSON.stringify([
      'name',
      'naming_series',
      'expense_date',
      'expense_category',
      'amount',
      'currency',
      'company',
      'approval_status',
      'accounting_status',
      'payment_status',
      'paid_amount',
      'posted_amount',
      'vehicle',
      'mining_trip',
      'mine_site',
      'driver',
      'supplier',
      'payee_name',
      'payment_method',
      'bill_reference',
      'receipt_attachment',
      'description',
      'rejection_reason',
      'expense_account',
      'payment_account',
      'cost_center',
      'posting_document_type',
      'posting_document_name',
      'posted_by',
      'posted_on',
      'submitted_by',
      'submitted_on',
      'approved_by',
      'approved_on',
      'rejected_by',
      'rejected_on',
      'owner',
      'is_test_record',
      'creation',
      'modified',
    ]);

    const filters: any[] = [];
    if (!options?.includeTest) {
      filters.push(['is_test_record', '=', 0]);
    }
    if (options?.category && options.category !== 'ALL') {
      filters.push(['expense_category', '=', options.category]);
    }
    if (options?.status && options.status !== 'ALL') {
      filters.push(['approval_status', '=', options.status]);
    }
    if (options?.vehicle && options.vehicle !== 'ALL') {
      filters.push(['vehicle', '=', options.vehicle]);
    }
    if (options?.miningTrip && options.miningTrip !== 'ALL') {
      filters.push(['mining_trip', '=', options.miningTrip]);
    }
    if (options?.mineSite && options.mineSite !== 'ALL') {
      filters.push(['mine_site', '=', options.mineSite]);
    }
    if (options?.fromDate) {
      filters.push(['expense_date', '>=', options.fromDate]);
    }
    if (options?.toDate) {
      filters.push(['expense_date', '<=', options.toDate]);
    }

    const res = await frappeFetch<{ data: any[] }>(
      `/api/resource/Operational%20Expense?fields=${encodeURIComponent(
        fields
      )}&filters=${encodeURIComponent(
        JSON.stringify(filters)
      )}&order_by=expense_date%20desc&limit_page_length=500`,
      { sessionCookie }
    );

    const raw = res.data || [];

    const expenses: OperationalExpense[] = raw.map((e) => ({
      id: e.name,
      namingSeries: e.naming_series,
      expenseDate: e.expense_date,
      expenseCategory: (e.expense_category as ExpenseCategory) || 'Miscellaneous Operational Expenses',
      amount: Number(e.amount) || 0,
      currency: e.currency || 'INR',
      company: e.company,
      approvalStatus: (e.approval_status as ExpenseApprovalStatus) || 'Draft',
      accountingStatus: (e.accounting_status as ExpenseAccountingStatus) || 'Unposted',
      paymentStatus: (e.payment_status as ExpensePaymentStatus) || 'Unpaid',
      paidAmount: Number(e.paid_amount) || 0,
      postedAmount: Number(e.posted_amount) || 0,
      vehicle: e.vehicle || null,
      miningTrip: e.mining_trip || null,
      mineSite: e.mine_site || null,
      mineSiteName: e.mine_site || null,
      driver: e.driver || null,
      driverName: e.driver || null,
      supplier: e.supplier || null,
      supplierName: e.supplier || null,
      payeeName: e.payee_name || null,
      paymentMethod: e.payment_method || null,
      billReference: e.bill_reference || null,
      receiptAttachment: e.receipt_attachment || null,
      description: e.description || null,
      rejectionReason: e.rejection_reason || null,
      expenseAccount: e.expense_account || null,
      paymentAccount: e.payment_account || null,
      costCenter: e.cost_center || null,
      postingDocumentType: e.posting_document_type || null,
      postingDocumentName: e.posting_document_name || null,
      postedBy: e.posted_by || null,
      postedOn: e.posted_on || null,
      submittedBy: e.submitted_by || null,
      submittedOn: e.submitted_on || null,
      approvedBy: e.approved_by || null,
      approvedOn: e.approved_on || null,
      rejectedBy: e.rejected_by || null,
      rejectedOn: e.rejected_on || null,
      owner: e.owner || null,
      isTestRecord: Boolean(e.is_test_record),
      creation: e.creation,
      modified: e.modified,
    }));

    // Category breakdown calculation
    const catTotals: Record<string, number> = {};
    for (const exp of expenses) {
      catTotals[exp.expenseCategory] = (catTotals[exp.expenseCategory] || 0) + exp.amount;
    }

    let topCategoryName = 'None';
    let topCategoryAmount = 0;
    for (const [cat, amt] of Object.entries(catTotals)) {
      if (amt > topCategoryAmount) {
        topCategoryAmount = amt;
        topCategoryName = cat;
      }
    }

    const metrics: ExpenseMetrics = {
      totalDisbursed: expenses.reduce((acc, e) => acc + e.amount, 0),
      approvedAmount: expenses
        .filter((e) => e.approvalStatus === 'Approved')
        .reduce((acc, e) => acc + e.amount, 0),
      pendingApprovalsCount: expenses.filter(
        (e) => e.approvalStatus === 'Submitted' || e.approvalStatus === 'Draft'
      ).length,
      unpostedAmount: expenses
        .filter((e) => e.accountingStatus === 'Unposted')
        .reduce((acc, e) => acc + e.amount, 0),
      topCategoryName,
      topCategoryAmount,
    };

    return { expenses, metrics };
  } catch (error: any) {
    console.error('getExpenses error:', error?.message || error);
    throw new Error(error?.message || 'Failed to fetch operational expenses.');
  }
}

export async function getExpenseDetails(
  sessionCookie: string,
  id: string
): Promise<OperationalExpense> {
  const res = await frappeFetch<{ data: any }>(
    `/api/resource/Operational%20Expense/${encodeURIComponent(id)}`,
    { sessionCookie }
  );

  const e = res.data;
  if (!e) throw new Error(`Operational Expense '${id}' not found.`);

  return {
    id: e.name,
    namingSeries: e.naming_series,
    expenseDate: e.expense_date,
    expenseCategory: (e.expense_category as ExpenseCategory) || 'Miscellaneous Operational Expenses',
    amount: Number(e.amount) || 0,
    currency: e.currency || 'INR',
    company: e.company,
    approvalStatus: (e.approval_status as ExpenseApprovalStatus) || 'Draft',
    accountingStatus: (e.accounting_status as ExpenseAccountingStatus) || 'Unposted',
    paymentStatus: (e.payment_status as ExpensePaymentStatus) || 'Unpaid',
    paidAmount: Number(e.paid_amount) || 0,
    postedAmount: Number(e.posted_amount) || 0,
    vehicle: e.vehicle || null,
    miningTrip: e.mining_trip || null,
    mineSite: e.mine_site || null,
    mineSiteName: e.mine_site || null,
    driver: e.driver || null,
    driverName: e.driver || null,
    supplier: e.supplier || null,
    supplierName: e.supplier || null,
    payeeName: e.payee_name || null,
    paymentMethod: e.payment_method || null,
    billReference: e.bill_reference || null,
    receiptAttachment: e.receipt_attachment || null,
    description: e.description || null,
    rejectionReason: e.rejection_reason || null,
    expenseAccount: e.expense_account || null,
    paymentAccount: e.payment_account || null,
    costCenter: e.cost_center || null,
    postingDocumentType: e.posting_document_type || null,
    postingDocumentName: e.posting_document_name || null,
    postedBy: e.posted_by || null,
    postedOn: e.posted_on || null,
    submittedBy: e.submitted_by || null,
    submittedOn: e.submitted_on || null,
    approvedBy: e.approved_by || null,
    approvedOn: e.approved_on || null,
    rejectedBy: e.rejected_by || null,
    rejectedOn: e.rejected_on || null,
    owner: e.owner || null,
    isTestRecord: Boolean(e.is_test_record),
    creation: e.creation,
    modified: e.modified,
  };
}

export async function createExpense(
  sessionCookie: string,
  input: CreateExpenseInput
): Promise<OperationalExpense> {
  const payload: any = {
    doctype: 'Operational Expense',
    naming_series: 'EXP-.YYYY.-.#####.',
    company: input.company?.trim() || 'Uptoware',
    expense_date: input.expenseDate,
    expense_category: input.expenseCategory,
    amount: Number(input.amount),
  };

  if (input.vehicle) payload.vehicle = input.vehicle.trim();
  if (input.miningTrip) payload.mining_trip = input.miningTrip.trim();
  if (input.mineSite) payload.mine_site = input.mineSite.trim();
  if (input.driver) payload.driver = input.driver.trim();
  if (input.supplier) payload.supplier = input.supplier.trim();
  if (input.payeeName) payload.payee_name = input.payeeName.trim();
  if (input.paymentMethod) payload.payment_method = input.paymentMethod.trim();
  if (input.billReference) payload.bill_reference = input.billReference.trim();
  if (input.receiptAttachment) payload.receipt_attachment = input.receiptAttachment;
  if (input.description) payload.description = input.description.trim();
  if (input.company) payload.company = input.company.trim();
  if (input.isTestRecord) payload.is_test_record = 1;

  const res = await frappeFetch<{ data: any }>('/api/resource/Operational%20Expense', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    sessionCookie,
  });

  return getExpenseDetails(sessionCookie, res.data.name);
}

export async function updateExpense(
  sessionCookie: string,
  id: string,
  input: UpdateExpenseInput
): Promise<OperationalExpense> {
  const payload: any = {};
  if (input.expenseDate !== undefined) payload.expense_date = input.expenseDate;
  if (input.expenseCategory !== undefined) payload.expense_category = input.expenseCategory;
  if (input.amount !== undefined) payload.amount = Number(input.amount);
  if (input.vehicle !== undefined) payload.vehicle = input.vehicle;
  if (input.miningTrip !== undefined) payload.mining_trip = input.miningTrip;
  if (input.mineSite !== undefined) payload.mine_site = input.mineSite;
  if (input.driver !== undefined) payload.driver = input.driver;
  if (input.supplier !== undefined) payload.supplier = input.supplier;
  if (input.payeeName !== undefined) payload.payee_name = input.payeeName;
  if (input.paymentMethod !== undefined) payload.payment_method = input.paymentMethod;
  if (input.billReference !== undefined) payload.bill_reference = input.billReference;
  if (input.receiptAttachment !== undefined) payload.receipt_attachment = input.receiptAttachment;
  if (input.description !== undefined) payload.description = input.description;

  await frappeFetch(`/api/resource/Operational%20Expense/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    sessionCookie,
  });

  return getExpenseDetails(sessionCookie, id);
}

export async function applyExpenseWorkflow(
  sessionCookie: string,
  id: string,
  action: string,
  options?: string | { rejectionReason?: string }
): Promise<OperationalExpense> {
  const rejectionReason =
    typeof options === 'string' ? options : options?.rejectionReason;

  if (action === 'Reject' && rejectionReason) {
    await frappeFetch(`/api/resource/Operational%20Expense/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rejection_reason: rejectionReason }),
      sessionCookie,
    });
  }

  const current = await frappeFetch<{ data: any }>(
    `/api/resource/Operational%20Expense/${encodeURIComponent(id)}`,
    { sessionCookie }
  );

  await frappeFetch('/api/method/frappe.model.workflow.apply_workflow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      doc: current.data,
      action,
    }),
    sessionCookie,
  });

  return getExpenseDetails(sessionCookie, id);
}

export async function getExpenseOptions(sessionCookie: string): Promise<{
  categories: string[];
  vehicles: Array<{ id: string; licensePlate: string }>;
  mineSites: Array<{ id: string; siteName: string }>;
  trips: Array<{ id: string; vehicle: string; mineSite: string }>;
  drivers: Array<{ id: string; fullName: string }>;
  suppliers: Array<{ id: string; supplierName: string }>;
  paymentMethods: string[];
}> {
  const [vehicles, sites, drivers] = await Promise.all([
    getVehicles(sessionCookie, false),
    getMineSites(sessionCookie, false),
    getDrivers(sessionCookie, false),
  ]);

  // Fetch recent trips
  let trips: Array<{ id: string; vehicle: string; mineSite: string }> = [];
  try {
    const tRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Mining%20Trip?fields=${encodeURIComponent(
        JSON.stringify(['name', 'vehicle', 'mine_site'])
      )}&filters=${encodeURIComponent(
        JSON.stringify([['is_test_record', '=', 0]])
      )}&limit_page_length=50`,
      { sessionCookie }
    );
    trips = (tRes.data || []).map((t) => ({
      id: t.name,
      vehicle: t.vehicle,
      mineSite: t.mine_site || '',
    }));
  } catch (e) {
    console.warn('Could not fetch Mining Trips for expense options:', e);
  }

  // Fetch suppliers
  let suppliers: Array<{ id: string; supplierName: string }> = [];
  try {
    const sRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Supplier?fields=${encodeURIComponent(
        JSON.stringify(['name', 'supplier_name'])
      )}&limit_page_length=100`,
      { sessionCookie }
    );
    suppliers = (sRes.data || []).map((s) => ({
      id: s.name,
      supplierName: s.supplier_name || s.name,
    }));
  } catch (e) {
    console.warn('Could not fetch Suppliers for expense options:', e);
  }

  let categories = [
    'Toll and Road Charges',
    'Parking',
    'Loading and Unloading',
    'Food and Accommodation',
    'Weighbridge Charges',
    'Permit and Documentation',
    'Miscellaneous Operational Expenses',
  ];

  let paymentMethods = ['Cash', 'Credit Card', 'Cheque', 'Wire Transfer', 'Bank Draft'];
  try {
    const mopRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Mode%20of%20Payment?fields=${encodeURIComponent(
        JSON.stringify(['name'])
      )}&limit_page_length=50`,
      { sessionCookie }
    );
    if (mopRes.data && mopRes.data.length > 0) {
      paymentMethods = mopRes.data.map((m) => m.name);
    }
  } catch (e) {
    console.warn('Could not fetch Mode of Payment options from Frappe:', e);
  }

  try {
    const metaRes = await frappeFetch<{
      docs?: Array<{ fields?: Array<{ fieldname: string; options?: string }> }>;
    }>('/api/method/frappe.desk.form.load.getdoctype', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctype: 'Operational Expense' }),
      sessionCookie,
    });

    const doc = (metaRes.docs && metaRes.docs[0]) || {};
    const catField = (doc.fields || []).find((f) => f.fieldname === 'expense_category');
    if (catField && typeof catField.options === 'string') {
      const opts = catField.options.split('\n').map((o) => o.trim()).filter(Boolean);
      if (opts.length > 0) categories = opts;
    }
  } catch (e) {
    console.warn('Could not fetch Operational Expense metadata options:', e);
  }

  return {
    categories,
    vehicles: vehicles.map((v) => ({ id: v.id, licensePlate: v.licensePlate })),
    mineSites: sites.map((s) => ({ id: s.id, siteName: s.siteName })),
    trips,
    drivers: drivers.map((d) => ({ id: d.id, fullName: d.fullName })),
    suppliers,
    paymentMethods,
  };
}

// ==========================================
// PHASE 4: INVENTORY & PROCUREMENT FUNCTIONS
// ==========================================

export async function getSpareParts(
  sessionCookie: string,
  filters?: {
    search?: string;
    itemGroup?: string;
    warehouse?: string;
    status?: string;
    showTestRecords?: boolean;
  }
): Promise<{ items: SparePartItem[]; metrics: InventoryMetrics }> {
  const itemFilters: any[] = [['is_stock_item', '=', 1]];
  if (!filters?.showTestRecords) {
    itemFilters.push(['custom_is_test_record', '=', 0]);
  }
  if (filters?.itemGroup && filters.itemGroup !== 'ALL') {
    itemFilters.push(['item_group', '=', filters.itemGroup]);
  }

  const itemsRes = await frappeFetch<{ data: any[] }>(
    `/api/resource/Item?filters=${encodeURIComponent(
      JSON.stringify(itemFilters)
    )}&fields=${encodeURIComponent(
      JSON.stringify([
        'name',
        'item_name',
        'item_group',
        'stock_uom',
        'valuation_rate',
        'is_stock_item',
        'custom_part_number',
        'custom_compatible_vehicle_model',
        'custom_preferred_supplier',
        'custom_is_test_record',
      ])
    )}&limit_page_length=500&order_by=item_name asc`,
    { sessionCookie }
  );

  // Fetch Bins to get real warehouse stock balances
  let bins: any[] = [];
  try {
    const binsRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Bin?fields=${encodeURIComponent(
        JSON.stringify([
          'name',
          'item_code',
          'warehouse',
          'actual_qty',
          'reserved_qty',
          'ordered_qty',
          'projected_qty',
          'valuation_rate',
          'stock_value',
        ])
      )}&limit_page_length=2000`,
      { sessionCookie }
    );
    bins = binsRes.data || [];
  } catch (err) {
    console.warn('Could not fetch Bins from Frappe:', err);
  }

  // Fetch Item Reorder levels if available
  const reorderMap = new Map<string, { reorderLevel: number; reorderQty: number }>();
  try {
    const reorderRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Item%20Reorder?fields=${encodeURIComponent(
        JSON.stringify(['parent', 'warehouse_reorder_level', 'warehouse_reorder_qty'])
      )}&limit_page_length=1000`,
      { sessionCookie }
    );
    for (const r of reorderRes.data || []) {
      if (!reorderMap.has(r.parent)) {
        reorderMap.set(r.parent, {
          reorderLevel: Number(r.warehouse_reorder_level || 0),
          reorderQty: Number(r.warehouse_reorder_qty || 0),
        });
      }
    }
  } catch (err) {
    // Child doctype query might not be exposed directly in all setups, non-fatal
  }

  const rawItems = itemsRes.data || [];
  const processedItems: SparePartItem[] = rawItems.map((item) => {
    const itemBins = bins.filter((b) => b.item_code === item.name);
    const warehouseBalances: WarehouseBalance[] = itemBins.map((b) => ({
      warehouse: b.warehouse,
      warehouseName: b.warehouse.split(' - ')[0] || b.warehouse,
      actualQty: Number(b.actual_qty || 0),
      reservedQty: Number(b.reserved_qty || 0),
      orderedQty: Number(b.ordered_qty || 0),
      projectedQty: Number(b.projected_qty || 0),
      valuationRate: Number(b.valuation_rate || item.valuation_rate || 0),
      stockValue: Number(b.stock_value || Number(b.actual_qty || 0) * Number(b.valuation_rate || item.valuation_rate || 0)),
    }));

    const totalActualQty = warehouseBalances.reduce((sum, b) => sum + b.actualQty, 0);
    const totalReservedQty = warehouseBalances.reduce((sum, b) => sum + b.reservedQty, 0);
    const totalOrderedQty = warehouseBalances.reduce((sum, b) => sum + b.orderedQty, 0);
    const totalProjectedQty = warehouseBalances.reduce((sum, b) => sum + b.projectedQty, 0);
    const totalStockValue = warehouseBalances.reduce((sum, b) => sum + b.stockValue, 0);

    const reorder = reorderMap.get(item.name) || { reorderLevel: 5, reorderQty: 10 };
    let stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
    if (totalActualQty <= 0) {
      stockStatus = 'Out of Stock';
    } else if (reorder.reorderLevel > 0 && totalActualQty <= reorder.reorderLevel) {
      stockStatus = 'Low Stock';
    }

    return {
      id: item.name,
      itemCode: item.name,
      itemName: item.item_name || item.name,
      itemGroup: item.item_group || 'All Item Groups',
      stockUom: item.stock_uom || 'Nos',
      valuationRate: Number(item.valuation_rate || 0),
      isStockItem: Boolean(item.is_stock_item),
      partNumber: item.custom_part_number || undefined,
      compatibleModel: item.custom_compatible_vehicle_model || undefined,
      preferredSupplier: item.custom_preferred_supplier || undefined,
      isTestRecord: Boolean(item.custom_is_test_record),
      totalActualQty,
      totalReservedQty,
      totalOrderedQty,
      totalProjectedQty,
      totalStockValue,
      reorderLevel: reorder.reorderLevel,
      reorderQty: reorder.reorderQty,
      stockStatus,
      warehouseBalances,
    };
  });

  // Apply in-memory search and filters
  let filtered = processedItems;
  if (filters?.search) {
    const q = filters.search.toLowerCase();
    filtered = filtered.filter(
      (i) =>
        i.itemCode.toLowerCase().includes(q) ||
        i.itemName.toLowerCase().includes(q) ||
        (i.partNumber && i.partNumber.toLowerCase().includes(q)) ||
        (i.compatibleModel && i.compatibleModel.toLowerCase().includes(q))
    );
  }

  if (filters?.warehouse && filters.warehouse !== 'ALL') {
    filtered = filtered.filter((i) =>
      i.warehouseBalances.some((b) => b.warehouse === filters.warehouse && b.actualQty > 0)
    );
  }

  if (filters?.status && filters.status !== 'ALL') {
    filtered = filtered.filter((i) => i.stockStatus === filters.status);
  }

  // Calculate Metrics from genuine items
  const genuineItems = processedItems.filter((i) => !i.isTestRecord);
  const metrics: InventoryMetrics = {
    totalInventoryValue: genuineItems.reduce((acc, i) => acc + i.totalStockValue, 0),
    activePartsCount: genuineItems.length,
    lowStockCount: genuineItems.filter((i) => i.stockStatus === 'Low Stock').length,
    outOfStockCount: genuineItems.filter((i) => i.stockStatus === 'Out of Stock').length,
    pendingReceiptsCount: genuineItems.reduce((acc, i) => acc + i.totalOrderedQty, 0),
    totalMovementsCount: 0, // Populated via stock movements
  };

  return { items: filtered, metrics };
}

export async function getSparePartDetails(
  sessionCookie: string,
  itemCode: string
): Promise<SparePartItem & { movements: StockMovementItem[]; consumptionHistory: PartsConsumptionRecord[] }> {
  const itemRes = await frappeFetch<{ data: any }>(
    `/api/resource/Item/${encodeURIComponent(itemCode)}`,
    { sessionCookie }
  );
  const item = itemRes.data;

  // Bins for this item
  const binsRes = await frappeFetch<{ data: any[] }>(
    `/api/resource/Bin?filters=${encodeURIComponent(
      JSON.stringify([['item_code', '=', itemCode]])
    )}&fields=${encodeURIComponent(
      JSON.stringify([
        'warehouse',
        'actual_qty',
        'reserved_qty',
        'ordered_qty',
        'projected_qty',
        'valuation_rate',
        'stock_value',
      ])
    )}`,
    { sessionCookie }
  );

  const warehouseBalances: WarehouseBalance[] = (binsRes.data || []).map((b) => ({
    warehouse: b.warehouse,
    warehouseName: b.warehouse.split(' - ')[0] || b.warehouse,
    actualQty: Number(b.actual_qty || 0),
    reservedQty: Number(b.reserved_qty || 0),
    orderedQty: Number(b.ordered_qty || 0),
    projectedQty: Number(b.projected_qty || 0),
    valuationRate: Number(b.valuation_rate || item.valuation_rate || 0),
    stockValue: Number(b.stock_value || Number(b.actual_qty || 0) * Number(b.valuation_rate || item.valuation_rate || 0)),
  }));

  const totalActualQty = warehouseBalances.reduce((sum, b) => sum + b.actualQty, 0);
  const totalReservedQty = warehouseBalances.reduce((sum, b) => sum + b.reservedQty, 0);
  const totalOrderedQty = warehouseBalances.reduce((sum, b) => sum + b.orderedQty, 0);
  const totalProjectedQty = warehouseBalances.reduce((sum, b) => sum + b.projectedQty, 0);
  const totalStockValue = warehouseBalances.reduce((sum, b) => sum + b.stockValue, 0);

  const reorderLevels = item.reorder_levels || [];
  const reorder = reorderLevels[0] || { warehouse_reorder_level: 5, warehouse_reorder_qty: 10 };
  const reorderLevel = Number(reorder.warehouse_reorder_level || 5);
  const reorderQty = Number(reorder.warehouse_reorder_qty || 10);

  let stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' = 'In Stock';
  if (totalActualQty <= 0) stockStatus = 'Out of Stock';
  else if (totalActualQty <= reorderLevel) stockStatus = 'Low Stock';

  // Recent Stock movements for this item
  let movements: StockMovementItem[] = [];
  try {
    const sedRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Stock%20Entry%20Detail?filters=${encodeURIComponent(
        JSON.stringify([['item_code', '=', itemCode]])
      )}&fields=${encodeURIComponent(
        JSON.stringify(['parent', 'item_code', 'item_name', 'qty', 'uom', 'basic_rate', 'amount', 's_warehouse', 't_warehouse'])
      )}&limit_page_length=20&order_by=creation desc`,
      { sessionCookie }
    );
    movements = (sedRes.data || []).map((m) => ({
      itemCode: m.item_code,
      itemName: m.item_name || item.item_name,
      qty: Number(m.qty || 0),
      uom: m.uom || 'Nos',
      basicRate: Number(m.basic_rate || 0),
      amount: Number(m.amount || 0),
      sWarehouse: m.s_warehouse,
      tWarehouse: m.t_warehouse,
    }));
  } catch (err) {
    console.warn('Could not fetch movements for item:', err);
  }

  // Consumption history by vehicle & breakdown
  let consumptionHistory: PartsConsumptionRecord[] = [];
  try {
    const seRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Stock%20Entry?filters=${encodeURIComponent(
        JSON.stringify([
          ['docstatus', '=', 1],
          ['stock_entry_type', '=', 'Material Issue'],
          ['custom_vehicle', 'is', 'set'],
        ])
      )}&fields=${encodeURIComponent(
        JSON.stringify(['name', 'posting_date', 'custom_vehicle', 'custom_vehicle_breakdown'])
      )}&limit_page_length=50&order_by=posting_date desc`,
      { sessionCookie }
    );
    for (const se of seRes.data || []) {
      const detailsRes = await frappeFetch<{ data: any[] }>(
        `/api/resource/Stock%20Entry%20Detail?filters=${encodeURIComponent(
          JSON.stringify([
            ['parent', '=', se.name],
            ['item_code', '=', itemCode],
          ])
        )}&fields=${encodeURIComponent(
          JSON.stringify(['qty', 'uom', 'amount'])
        )}`,
        { sessionCookie }
      );
      for (const d of detailsRes.data || []) {
        consumptionHistory.push({
          itemCode,
          itemName: item.item_name,
          vehicle: se.custom_vehicle,
          breakdown: se.custom_vehicle_breakdown,
          postingDate: se.posting_date,
          qty: Number(d.qty || 0),
          uom: d.uom || 'Nos',
          amount: Number(d.amount || 0),
          stockEntry: se.name,
        });
      }
    }
  } catch (err) {
    console.warn('Could not fetch consumption history for item:', err);
  }

  return {
    id: item.name,
    itemCode: item.name,
    itemName: item.item_name || item.name,
    itemGroup: item.item_group || 'All Item Groups',
    stockUom: item.stock_uom || 'Nos',
    valuationRate: Number(item.valuation_rate || 0),
    isStockItem: Boolean(item.is_stock_item),
    partNumber: item.custom_part_number || undefined,
    compatibleModel: item.custom_compatible_vehicle_model || undefined,
    preferredSupplier: item.custom_preferred_supplier || undefined,
    isTestRecord: Boolean(item.custom_is_test_record),
    totalActualQty,
    totalReservedQty,
    totalOrderedQty,
    totalProjectedQty,
    totalStockValue,
    reorderLevel,
    reorderQty,
    stockStatus,
    warehouseBalances,
    movements,
    consumptionHistory,
  };
}

export async function createSparePart(
  sessionCookie: string,
  input: CreateSparePartInput
): Promise<SparePartItem> {
  const payload: any = {
    item_code: input.itemCode.trim(),
    item_name: input.itemName.trim(),
    item_group: input.itemGroup || 'All Item Groups',
    stock_uom: input.stockUom || 'Nos',
    valuation_rate: Number(input.valuationRate || 0),
    is_stock_item: 1,
    custom_part_number: input.partNumber?.trim() || null,
    custom_compatible_vehicle_model: input.compatibleModel?.trim() || null,
    custom_preferred_supplier: input.preferredSupplier?.trim() || null,
    custom_is_test_record: input.isTestRecord ? 1 : 0,
  };

  if (input.reorderLevel && input.reorderLevel > 0) {
    payload.reorder_levels = [
      {
        warehouse: 'Stores - U',
        warehouse_reorder_level: Number(input.reorderLevel),
        warehouse_reorder_qty: Number(input.reorderQty || 10),
        material_request_type: 'Purchase',
      },
    ];
  }

  const res = await frappeFetch<{ data: any }>('/api/resource/Item', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    sessionCookie,
  });

  return getSparePartDetails(sessionCookie, res.data.name);
}

export async function getWarehouses(sessionCookie: string): Promise<Warehouse[]> {
  const whRes = await frappeFetch<{ data: any[] }>(
    `/api/resource/Warehouse?fields=${encodeURIComponent(
      JSON.stringify(['name', 'warehouse_name', 'company', 'is_group'])
    )}&limit_page_length=50&order_by=warehouse_name asc`,
    { sessionCookie }
  );

  const activeWarehouses = (whRes.data || []).filter((w) => !w.is_group);

  // Fetch Bins to calculate per-warehouse totals
  let bins: any[] = [];
  try {
    const binsRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Bin?fields=${encodeURIComponent(
        JSON.stringify(['warehouse', 'actual_qty', 'stock_value'])
      )}&limit_page_length=2000`,
      { sessionCookie }
    );
    bins = binsRes.data || [];
  } catch (err) {
    console.warn('Could not fetch bins for warehouse summary:', err);
  }

  return activeWarehouses.map((w) => {
    const wBins = bins.filter((b) => b.warehouse === w.name);
    const totalItems = wBins.filter((b) => Number(b.actual_qty || 0) > 0).length;
    const totalValuation = wBins.reduce((sum, b) => sum + Number(b.stock_value || 0), 0);

    return {
      id: w.name,
      name: w.name,
      warehouseName: w.warehouse_name || w.name,
      company: w.company || 'Uptoware',
      isGroup: Boolean(w.is_group),
      totalItems,
      totalValuation,
    };
  });
}

export async function getStockMovements(
  sessionCookie: string,
  filters?: {
    search?: string;
    entryType?: string;
    vehicle?: string;
    breakdown?: string;
    warehouse?: string;
    showTestRecords?: boolean;
  }
): Promise<{ movements: StockMovement[]; totalCount: number }> {
  const seFilters: any[] = [];
  if (filters?.entryType && filters.entryType !== 'ALL') {
    seFilters.push(['stock_entry_type', '=', filters.entryType]);
  }
  if (filters?.vehicle && filters.vehicle !== 'ALL') {
    seFilters.push(['custom_vehicle', '=', filters.vehicle]);
  }
  if (filters?.breakdown && filters.breakdown !== 'ALL') {
    seFilters.push(['custom_vehicle_breakdown', '=', filters.breakdown]);
  }

  const seRes = await frappeFetch<{ data: any[] }>(
    `/api/resource/Stock%20Entry?filters=${encodeURIComponent(
      JSON.stringify(seFilters)
    )}&fields=${encodeURIComponent(
      JSON.stringify([
        'name',
        'stock_entry_type',
        'purpose',
        'posting_date',
        'posting_time',
        'from_warehouse',
        'to_warehouse',
        'custom_vehicle',
        'custom_vehicle_breakdown',
        'custom_is_return',
        'docstatus',
        'total_amount',
      ])
    )}&limit_page_length=200&order_by=posting_date desc, creation desc`,
    { sessionCookie }
  );

  const rawEntries = seRes.data || [];
  const movements: StockMovement[] = rawEntries.map((e) => {
    let status: 'Draft' | 'Submitted' | 'Cancelled' = 'Draft';
    if (e.docstatus === 1) status = 'Submitted';
    else if (e.docstatus === 2) status = 'Cancelled';

    return {
      id: e.name,
      name: e.name,
      entryType: e.stock_entry_type || e.purpose || 'Material Issue',
      purpose: e.purpose || e.stock_entry_type || 'Material Issue',
      postingDate: e.posting_date,
      postingTime: e.posting_time,
      fromWarehouse: e.from_warehouse,
      toWarehouse: e.to_warehouse,
      vehicle: e.custom_vehicle || undefined,
      vehicleBreakdown: e.custom_vehicle_breakdown || undefined,
      isReturn: Boolean(e.custom_is_return),
      isTestRecord: false,
      docstatus: e.docstatus,
      status,
      totalQty: Number(e.total_qty || 0),
      totalAmount: Number(e.total_amount || 0),
      items: [],
    };
  });

  return { movements, totalCount: movements.length };
}

export async function createStockEntry(
  sessionCookie: string,
  input: CreateStockEntryInput
): Promise<StockMovement> {
  const todayStr = new Date().toISOString().split('T')[0];

  const payload: any = {
    doctype: 'Stock Entry',
    stock_entry_type: input.entryType,
    purpose: input.entryType,
    posting_date: input.postingDate || todayStr,
    from_warehouse: input.fromWarehouse || null,
    to_warehouse: input.toWarehouse || null,
    custom_vehicle: input.vehicle || null,
    custom_vehicle_breakdown: input.vehicleBreakdown || null,
    custom_is_return: input.isReturn ? 1 : 0,
    items: input.items.map((i) => ({
      item_code: i.itemCode,
      qty: Number(i.qty),
      uom: i.uom || 'Nos',
      basic_rate: Number(i.rate || 0),
      s_warehouse: input.entryType !== 'Material Receipt' ? i.sWarehouse || input.fromWarehouse : null,
      t_warehouse: input.entryType !== 'Material Issue' ? i.tWarehouse || input.toWarehouse : null,
    })),
  };

  // 1. Insert Stock Entry in Draft
  const res = await frappeFetch<{ data: any }>('/api/resource/Stock%20Entry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    sessionCookie,
  });

  const entryName = res.data.name;

  // 2. Submit Stock Entry to execute stock ledger movement and update breakdown parts
  await frappeFetch(`/api/resource/Stock%20Entry/${encodeURIComponent(entryName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docstatus: 1 }),
    sessionCookie,
  });

  // 3. Return updated movement
  const submittedRes = await frappeFetch<{ data: any }>(
    `/api/resource/Stock%20Entry/${encodeURIComponent(entryName)}`,
    { sessionCookie }
  );
  const se = submittedRes.data;

  return {
    id: se.name,
    name: se.name,
    entryType: se.stock_entry_type,
    purpose: se.purpose,
    postingDate: se.posting_date,
    postingTime: se.posting_time,
    fromWarehouse: se.from_warehouse,
    toWarehouse: se.to_warehouse,
    vehicle: se.custom_vehicle,
    vehicleBreakdown: se.custom_vehicle_breakdown,
    isReturn: Boolean(se.custom_is_return),
    isTestRecord: Boolean(se.custom_is_test_record),
    docstatus: se.docstatus,
    status: 'Submitted',
    totalQty: Number(se.total_qty || 0),
    totalAmount: Number(se.total_amount || 0),
    items: (se.items || []).map((i: any) => ({
      itemCode: i.item_code,
      itemName: i.item_name,
      qty: Number(i.qty || 0),
      uom: i.uom || 'Nos',
      basicRate: Number(i.basic_rate || 0),
      amount: Number(i.amount || 0),
      sWarehouse: i.s_warehouse,
      tWarehouse: i.t_warehouse,
    })),
  };
}

export async function getSuppliers(
  sessionCookie: string,
  filters?: {
    search?: string;
    group?: string;
    preferredOnly?: boolean;
    showTestRecords?: boolean;
  }
): Promise<{ suppliers: Supplier[]; metrics: ProcurementMetrics }> {
  const suppFilters: any[] = [];
  if (!filters?.showTestRecords) {
    suppFilters.push(['custom_is_test_record', '=', 0]);
  }
  if (filters?.group && filters.group !== 'ALL') {
    suppFilters.push(['supplier_group', '=', filters.group]);
  }
  if (filters?.preferredOnly) {
    suppFilters.push(['custom_is_preferred_supplier', '=', 1]);
  }

  const suppRes = await frappeFetch<{ data: any[] }>(
    `/api/resource/Supplier?filters=${encodeURIComponent(
      JSON.stringify(suppFilters)
    )}&fields=${encodeURIComponent(
      JSON.stringify([
        'name',
        'supplier_name',
        'supplier_group',
        'supplier_type',
        'country',
        'custom_pan',
        'custom_is_preferred_supplier',
        'custom_is_test_record',
      ])
    )}&limit_page_length=200&order_by=supplier_name asc`,
    { sessionCookie }
  );

  // Fetch Purchase Orders to calculate spend per supplier
  let poList: any[] = [];
  try {
    const poRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Purchase%20Order?fields=${encodeURIComponent(
        JSON.stringify(['supplier', 'grand_total', 'status', 'docstatus', 'custom_is_test_record'])
      )}&limit_page_length=1000`,
      { sessionCookie }
    );
    poList = (poRes.data || []).filter((p) => filters?.showTestRecords || !p.custom_is_test_record);
  } catch (err) {
    console.warn('Could not fetch POs for supplier summary:', err);
  }

  // Fetch Purchase Invoices to calculate payables per supplier
  let piList: any[] = [];
  try {
    const piRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Purchase%20Invoice?fields=${encodeURIComponent(
        JSON.stringify(['supplier', 'grand_total', 'outstanding_amount', 'status', 'docstatus', 'custom_is_test_record'])
      )}&limit_page_length=1000`,
      { sessionCookie }
    );
    piList = (piRes.data || []).filter((p) => filters?.showTestRecords || !p.custom_is_test_record);
  } catch (err) {
    console.warn('Could not fetch PIs for supplier summary:', err);
  }

  const suppliers: Supplier[] = (suppRes.data || []).map((s) => {
    const suppPOs = poList.filter((p) => p.supplier === s.name);
    const suppPIs = piList.filter((p) => p.supplier === s.name);

    const totalPurchases = suppPOs.reduce((acc, p) => acc + Number(p.grand_total || 0), 0);
    const outstandingPayables = suppPIs.reduce((acc, p) => acc + Number(p.outstanding_amount || 0), 0);
    const activeOrdersCount = suppPOs.filter((p) => p.docstatus === 1 && p.status !== 'Completed').length;

    return {
      id: s.name,
      name: s.name,
      supplierName: s.supplier_name || s.name,
      supplierGroup: s.supplier_group || 'All Supplier Groups',
      supplierType: s.supplier_type,
      country: s.country,
      pan: s.custom_pan || s.pan,
      isPreferred: Boolean(s.custom_is_preferred_supplier),
      isTestRecord: Boolean(s.custom_is_test_record),
      totalPurchases,
      outstandingPayables,
      activeOrdersCount,
    };
  });

  // Calculate Procurement Metrics from genuine records
  const genuineSuppliers = suppliers.filter((s) => !s.isTestRecord);
  const metrics: ProcurementMetrics = {
    totalSpend: poList.reduce((acc, p) => acc + Number(p.grand_total || 0), 0),
    openOrdersCount: poList.filter((p) => p.docstatus === 1 && p.status !== 'Completed').length,
    pendingReceiptsCount: poList.filter((p) => p.status === 'To Receive and Bill' || p.status === 'To Receive').length,
    outstandingPayables: piList.reduce((acc, p) => acc + Number(p.outstanding_amount || 0), 0),
    activeSuppliersCount: genuineSuppliers.length,
  };

  return { suppliers, metrics };
}

export async function getSupplierDetails(
  sessionCookie: string,
  supplierName: string
): Promise<Supplier & { orders: PurchaseOrder[]; invoices: PurchaseInvoice[] }> {
  const sRes = await frappeFetch<{ data: any }>(
    `/api/resource/Supplier/${encodeURIComponent(supplierName)}`,
    { sessionCookie }
  );
  const s = sRes.data;

  // Fetch orders for this supplier
  const poRes = await frappeFetch<{ data: any[] }>(
    `/api/resource/Purchase%20Order?filters=${encodeURIComponent(
      JSON.stringify([['supplier', '=', supplierName]])
    )}&fields=${encodeURIComponent(
      JSON.stringify([
        'name',
        'supplier',
        'transaction_date',
        'schedule_date',
        'grand_total',
        'status',
        'docstatus',
        'custom_procurement_type',
        'custom_vehicle',
        'custom_vehicle_breakdown',
        'custom_mine_site',
        'custom_approved_by',
        'custom_approved_on',
        'custom_is_test_record',
      ])
    )}&order_by=transaction_date desc&limit_page_length=50`,
    { sessionCookie }
  );

  const orders: PurchaseOrder[] = (poRes.data || []).map((p) => ({
    id: p.name,
    name: p.name,
    supplier: p.supplier,
    transactionDate: p.transaction_date,
    scheduleDate: p.schedule_date,
    grandTotal: Number(p.grand_total || 0),
    status: p.status,
    docstatus: p.docstatus,
    procurementType: p.custom_procurement_type,
    vehicle: p.custom_vehicle,
    vehicleBreakdown: p.custom_vehicle_breakdown,
    mineSite: p.custom_mine_site,
    approvedBy: p.custom_approved_by,
    approvedOn: p.custom_approved_on,
    isTestRecord: Boolean(p.custom_is_test_record),
    items: [],
  }));

  // Fetch invoices for this supplier
  const piRes = await frappeFetch<{ data: any[] }>(
    `/api/resource/Purchase%20Invoice?filters=${encodeURIComponent(
      JSON.stringify([['supplier', '=', supplierName]])
    )}&fields=${encodeURIComponent(
      JSON.stringify([
        'name',
        'supplier',
        'posting_date',
        'due_date',
        'grand_total',
        'outstanding_amount',
        'status',
        'docstatus',
        'custom_procurement_type',
        'custom_vehicle',
        'custom_vehicle_breakdown',
        'custom_mine_site',
        'custom_approved_by',
        'custom_approved_on',
        'custom_is_test_record',
      ])
    )}&order_by=posting_date desc&limit_page_length=50`,
    { sessionCookie }
  );

  const invoices: PurchaseInvoice[] = (piRes.data || []).map((i) => ({
    id: i.name,
    name: i.name,
    supplier: i.supplier,
    postingDate: i.posting_date,
    dueDate: i.due_date,
    grandTotal: Number(i.grand_total || 0),
    outstandingAmount: Number(i.outstanding_amount || 0),
    status: i.status,
    docstatus: i.docstatus,
    procurementType: i.custom_procurement_type,
    vehicle: i.custom_vehicle,
    vehicleBreakdown: i.custom_vehicle_breakdown,
    mineSite: i.custom_mine_site,
    approvedBy: i.custom_approved_by,
    approvedOn: i.custom_approved_on,
    isTestRecord: Boolean(i.custom_is_test_record),
    items: [],
  }));

  const totalPurchases = orders.reduce((acc, o) => acc + o.grandTotal, 0);
  const outstandingPayables = invoices.reduce((acc, i) => acc + i.outstandingAmount, 0);
  const activeOrdersCount = orders.filter((o) => o.docstatus === 1 && o.status !== 'Completed').length;

  return {
    id: s.name,
    name: s.name,
    supplierName: s.supplier_name || s.name,
    supplierGroup: s.supplier_group || 'All Supplier Groups',
    supplierType: s.supplier_type,
    country: s.country,
    pan: s.custom_pan || s.pan,
    isPreferred: Boolean(s.custom_is_preferred_supplier),
    isTestRecord: Boolean(s.custom_is_test_record),
    totalPurchases,
    outstandingPayables,
    activeOrdersCount,
    orders,
    invoices,
  };
}

export async function createSupplier(
  sessionCookie: string,
  input: CreateSupplierInput
): Promise<Supplier> {
  const payload: any = {
    doctype: 'Supplier',
    supplier_name: input.supplierName.trim(),
    supplier_group: input.supplierGroup || 'All Supplier Groups',
    supplier_type: input.supplierType || 'Company',
    country: input.country || 'India',
    custom_pan: input.pan?.trim() || null,
    custom_is_preferred_supplier: input.isPreferred ? 1 : 0,
    custom_is_test_record: input.isTestRecord ? 1 : 0,
  };

  const res = await frappeFetch<{ data: any }>('/api/resource/Supplier', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    sessionCookie,
  });

  return {
    id: res.data.name,
    name: res.data.name,
    supplierName: input.supplierName,
    supplierGroup: input.supplierGroup,
    country: input.country,
    pan: input.pan,
    isPreferred: input.isPreferred,
    isTestRecord: input.isTestRecord,
    totalPurchases: 0,
    outstandingPayables: 0,
    activeOrdersCount: 0,
  };
}

export async function getPurchaseOrders(
  sessionCookie: string,
  filters?: {
    search?: string;
    status?: string;
    supplier?: string;
    vehicle?: string;
    showTestRecords?: boolean;
  }
): Promise<{ orders: PurchaseOrder[]; metrics: ProcurementMetrics }> {
  const poFilters: any[] = [];
  if (!filters?.showTestRecords) {
    poFilters.push(['custom_is_test_record', '=', 0]);
  }
  if (filters?.status && filters.status !== 'ALL') {
    poFilters.push(['status', '=', filters.status]);
  }
  if (filters?.supplier && filters.supplier !== 'ALL') {
    poFilters.push(['supplier', '=', filters.supplier]);
  }
  if (filters?.vehicle && filters.vehicle !== 'ALL') {
    poFilters.push(['custom_vehicle', '=', filters.vehicle]);
  }

  const poRes = await frappeFetch<{ data: any[] }>(
    `/api/resource/Purchase%20Order?filters=${encodeURIComponent(
      JSON.stringify(poFilters)
    )}&fields=${encodeURIComponent(
      JSON.stringify([
        'name',
        'supplier',
        'transaction_date',
        'schedule_date',
        'grand_total',
        'status',
        'docstatus',
        'custom_procurement_type',
        'custom_vehicle',
        'custom_vehicle_breakdown',
        'custom_mine_site',
        'custom_approved_by',
        'custom_approved_on',
        'custom_is_test_record',
      ])
    )}&limit_page_length=200&order_by=transaction_date desc, creation desc`,
    { sessionCookie }
  );

  const rawOrders = poRes.data || [];
  const orders: PurchaseOrder[] = rawOrders.map((p) => ({
    id: p.name,
    name: p.name,
    supplier: p.supplier,
    transactionDate: p.transaction_date,
    scheduleDate: p.schedule_date,
    grandTotal: Number(p.grand_total || 0),
    status: p.status,
    docstatus: p.docstatus,
    procurementType: p.custom_procurement_type,
    vehicle: p.custom_vehicle,
    vehicleBreakdown: p.custom_vehicle_breakdown,
    mineSite: p.custom_mine_site,
    approvedBy: p.custom_approved_by,
    approvedOn: p.custom_approved_on,
    isTestRecord: Boolean(p.custom_is_test_record),
    items: [],
  }));

  const metrics: ProcurementMetrics = {
    totalSpend: orders.reduce((sum, o) => sum + o.grandTotal, 0),
    openOrdersCount: orders.filter((o) => o.docstatus === 1 && o.status !== 'Completed').length,
    pendingReceiptsCount: orders.filter((o) => o.status === 'To Receive and Bill' || o.status === 'To Receive').length,
    outstandingPayables: 0,
    activeSuppliersCount: new Set(orders.map((o) => o.supplier)).size,
  };

  return { orders, metrics };
}

export async function getPurchaseOrderDetails(
  sessionCookie: string,
  poId: string
): Promise<PurchaseOrder> {
  const poRes = await frappeFetch<{ data: any }>(
    `/api/resource/Purchase%20Order/${encodeURIComponent(poId)}`,
    { sessionCookie }
  );
  const p = poRes.data;

  return {
    id: p.name,
    name: p.name,
    supplier: p.supplier,
    transactionDate: p.transaction_date,
    scheduleDate: p.schedule_date,
    grandTotal: Number(p.grand_total || 0),
    status: p.status,
    docstatus: p.docstatus,
    procurementType: p.custom_procurement_type,
    vehicle: p.custom_vehicle,
    vehicleBreakdown: p.custom_vehicle_breakdown,
    mineSite: p.custom_mine_site,
    approvedBy: p.custom_approved_by,
    approvedOn: p.custom_approved_on,
    isTestRecord: Boolean(p.custom_is_test_record),
    items: (p.items || []).map((i: any) => ({
      itemCode: i.item_code,
      itemName: i.item_name || i.item_code,
      qty: Number(i.qty || 0),
      rate: Number(i.rate || 0),
      amount: Number(i.amount || 0),
      uom: i.uom || 'Nos',
      warehouse: i.warehouse,
      scheduleDate: i.schedule_date,
    })),
  };
}

export async function createPurchaseOrder(
  sessionCookie: string,
  input: CreatePurchaseOrderInput
): Promise<PurchaseOrder> {
  const todayStr = new Date().toISOString().split('T')[0];

  const payload: any = {
    doctype: 'Purchase Order',
    supplier: input.supplier,
    transaction_date: input.transactionDate || todayStr,
    schedule_date: input.scheduleDate || todayStr,
    custom_procurement_type: input.procurementType || 'Spare Parts Replenishment',
    custom_vehicle: input.vehicle || null,
    custom_vehicle_breakdown: input.vehicleBreakdown || null,
    custom_mine_site: input.mineSite || null,
    custom_is_test_record: input.isTestRecord ? 1 : 0,
    items: input.items.map((i) => ({
      item_code: i.itemCode,
      qty: Number(i.qty),
      rate: Number(i.rate),
      warehouse: i.warehouse || 'Stores - U',
      schedule_date: i.scheduleDate || input.scheduleDate || todayStr,
    })),
  };

  const res = await frappeFetch<{ data: any }>('/api/resource/Purchase%20Order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    sessionCookie,
  });

  return getPurchaseOrderDetails(sessionCookie, res.data.name);
}

export async function applyPurchaseOrderWorkflow(
  sessionCookie: string,
  poId: string,
  action: 'submit' | 'cancel'
): Promise<PurchaseOrder> {
  const targetDocstatus = action === 'submit' ? 1 : 2;

  await frappeFetch(`/api/resource/Purchase%20Order/${encodeURIComponent(poId)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docstatus: targetDocstatus }),
    sessionCookie,
  });

  return getPurchaseOrderDetails(sessionCookie, poId);
}

export async function getPurchaseReceipts(
  sessionCookie: string,
  filters?: {
    search?: string;
    supplier?: string;
    showTestRecords?: boolean;
  }
): Promise<PurchaseReceipt[]> {
  const prFilters: any[] = [];
  if (!filters?.showTestRecords) {
    prFilters.push(['custom_is_test_record', '=', 0]);
  }
  if (filters?.supplier && filters.supplier !== 'ALL') {
    prFilters.push(['supplier', '=', filters.supplier]);
  }

  const prRes = await frappeFetch<{ data: any[] }>(
    `/api/resource/Purchase%20Receipt?filters=${encodeURIComponent(
      JSON.stringify(prFilters)
    )}&fields=${encodeURIComponent(
      JSON.stringify([
        'name',
        'supplier',
        'posting_date',
        'grand_total',
        'status',
        'docstatus',
        'custom_procurement_type',
        'custom_vehicle',
        'custom_vehicle_breakdown',
        'custom_mine_site',
        'custom_verified_by',
        'custom_verified_on',
        'custom_is_test_record',
      ])
    )}&limit_page_length=100&order_by=posting_date desc`,
    { sessionCookie }
  );

  return (prRes.data || []).map((r) => ({
    id: r.name,
    name: r.name,
    supplier: r.supplier,
    postingDate: r.posting_date,
    grandTotal: Number(r.grand_total || 0),
    status: r.status,
    docstatus: r.docstatus,
    procurementType: r.custom_procurement_type,
    vehicle: r.custom_vehicle,
    vehicleBreakdown: r.custom_vehicle_breakdown,
    mineSite: r.custom_mine_site,
    verifiedBy: r.custom_verified_by,
    verifiedOn: r.custom_verified_on,
    isTestRecord: Boolean(r.custom_is_test_record),
    items: [],
  }));
}

export async function createPurchaseReceipt(
  sessionCookie: string,
  input: {
    purchaseOrder: string;
    postingDate?: string;
  }
): Promise<PurchaseReceipt> {
  const poDoc = await getPurchaseOrderDetails(sessionCookie, input.purchaseOrder);
  const todayStr = new Date().toISOString().split('T')[0];

  const payload: any = {
    doctype: 'Purchase Receipt',
    supplier: poDoc.supplier,
    posting_date: input.postingDate || todayStr,
    custom_procurement_type: poDoc.procurementType,
    custom_vehicle: poDoc.vehicle,
    custom_vehicle_breakdown: poDoc.vehicleBreakdown,
    custom_mine_site: poDoc.mineSite,
    custom_is_test_record: poDoc.isTestRecord ? 1 : 0,
    items: poDoc.items.map((i) => ({
      item_code: i.itemCode,
      qty: i.qty,
      received_qty: i.qty,
      rate: i.rate,
      warehouse: i.warehouse || 'Stores - U',
      purchase_order: poDoc.name,
    })),
  };

  const res = await frappeFetch<{ data: any }>('/api/resource/Purchase%20Receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    sessionCookie,
  });

  const prName = res.data.name;

  // Submit to update stock balances in Bin
  await frappeFetch(`/api/resource/Purchase%20Receipt/${encodeURIComponent(prName)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ docstatus: 1 }),
    sessionCookie,
  });

  const subRes = await frappeFetch<{ data: any }>(
    `/api/resource/Purchase%20Receipt/${encodeURIComponent(prName)}`,
    { sessionCookie }
  );
  const r = subRes.data;

  return {
    id: r.name,
    name: r.name,
    supplier: r.supplier,
    postingDate: r.posting_date,
    grandTotal: Number(r.grand_total || 0),
    status: r.status,
    docstatus: r.docstatus,
    purchaseOrder: input.purchaseOrder,
    procurementType: r.custom_procurement_type,
    vehicle: r.custom_vehicle,
    vehicleBreakdown: r.custom_vehicle_breakdown,
    mineSite: r.custom_mine_site,
    verifiedBy: r.custom_verified_by,
    verifiedOn: r.custom_verified_on,
    isTestRecord: Boolean(r.custom_is_test_record),
    items: (r.items || []).map((i: any) => ({
      itemCode: i.item_code,
      itemName: i.item_name,
      qty: Number(i.qty || 0),
      receivedQty: Number(i.received_qty || 0),
      rate: Number(i.rate || 0),
      amount: Number(i.amount || 0),
      warehouse: i.warehouse,
      purchaseOrder: i.purchase_order,
    })),
  };
}

export async function getPurchaseInvoices(
  sessionCookie: string,
  filters?: {
    search?: string;
    supplier?: string;
    status?: string;
    showTestRecords?: boolean;
  }
): Promise<PurchaseInvoice[]> {
  const piFilters: any[] = [];
  if (!filters?.showTestRecords) {
    piFilters.push(['custom_is_test_record', '=', 0]);
  }
  if (filters?.supplier && filters.supplier !== 'ALL') {
    piFilters.push(['supplier', '=', filters.supplier]);
  }
  if (filters?.status && filters.status !== 'ALL') {
    piFilters.push(['status', '=', filters.status]);
  }

  const piRes = await frappeFetch<{ data: any[] }>(
    `/api/resource/Purchase%20Invoice?filters=${encodeURIComponent(
      JSON.stringify(piFilters)
    )}&fields=${encodeURIComponent(
      JSON.stringify([
        'name',
        'supplier',
        'posting_date',
        'due_date',
        'grand_total',
        'outstanding_amount',
        'status',
        'docstatus',
        'custom_procurement_type',
        'custom_vehicle',
        'custom_vehicle_breakdown',
        'custom_mine_site',
        'custom_approved_by',
        'custom_approved_on',
        'custom_is_test_record',
      ])
    )}&limit_page_length=100&order_by=posting_date desc`,
    { sessionCookie }
  );

  return (piRes.data || []).map((i) => ({
    id: i.name,
    name: i.name,
    supplier: i.supplier,
    postingDate: i.posting_date,
    dueDate: i.due_date,
    grandTotal: Number(i.grand_total || 0),
    outstandingAmount: Number(i.outstanding_amount || 0),
    status: i.status,
    docstatus: i.docstatus,
    procurementType: i.custom_procurement_type,
    vehicle: i.custom_vehicle,
    vehicleBreakdown: i.custom_vehicle_breakdown,
    mineSite: i.custom_mine_site,
    approvedBy: i.custom_approved_by,
    approvedOn: i.custom_approved_on,
    isTestRecord: Boolean(i.custom_is_test_record),
    items: [],
  }));
}

export async function executeFleetReport(
  sessionCookie: string,
  reportName: string,
  filters?: Record<string, any>
): Promise<FleetReportResult> {
  const bodyPayload: any = {
    report_name: reportName,
    filters: {
      company: 'Uptoware',
      from_date: '2026-01-01',
      to_date: '2026-12-31',
      show_all: '1',
      ...filters,
      ...(reportName === 'Gross Profit' ? { group_by: filters?.group_by || 'Invoice' } : {}),
    },
  };

  const res = await frappeFetch<{ message: { columns: any[]; result: any[] } }>(
    '/api/method/frappe.desk.query_report.run',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
      sessionCookie,
    }
  );

  const rawCols = (res.message && res.message.columns) || [];
  const rawRows = (res.message && res.message.result) || [];

  const columns: FleetReportColumn[] = rawCols.map((c) => {
    if (typeof c === 'string') {
      const parts = c.split(':');
      return {
        label: parts[0] || c,
        fieldname: parts[1] || parts[0] || c,
        fieldtype: parts[2] || 'Data',
      };
    }
    return {
      label: c.label || c.fieldname,
      fieldname: c.fieldname,
      fieldtype: c.fieldtype || 'Data',
      width: c.width,
    };
  });

  return {
    columns,
    result: rawRows,
    reportName,
  };
}

export async function getInventoryOptions(sessionCookie: string): Promise<{
  warehouses: Array<{ id: string; name: string }>;
  itemGroups: string[];
  supplierGroups: string[];
  items: Array<{ itemCode: string; itemName: string; uom: string; rate: number }>;
  suppliers: Array<{ id: string; name: string }>;
  vehicles: Array<{ id: string; licensePlate: string }>;
  breakdowns: Array<{ id: string; vehicle: string; description: string; parts: Array<{ itemCode: string; plannedQty: number }> }>;
}> {
  // Warehouses
  let warehouses: Array<{ id: string; name: string }> = [];
  try {
    const whRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Warehouse?filters=${encodeURIComponent(
        JSON.stringify([['is_group', '=', 0]])
      )}&fields=${encodeURIComponent(JSON.stringify(['name', 'warehouse_name']))}&limit_page_length=50`,
      { sessionCookie }
    );
    warehouses = (whRes.data || []).map((w) => ({
      id: w.name,
      name: w.warehouse_name || w.name,
    }));
  } catch (err) {
    console.warn('Could not fetch warehouses:', err);
  }

  // Item Groups
  let itemGroups = ['All Item Groups', 'Spares', 'Filters and Lubricants', 'Consumables', 'Tyres'];
  try {
    const igRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Item%20Group?fields=${encodeURIComponent(JSON.stringify(['name']))}&limit_page_length=50`,
      { sessionCookie }
    );
    if (igRes.data && igRes.data.length > 0) {
      itemGroups = igRes.data.map((ig) => ig.name);
    }
  } catch (err) {
    console.warn('Could not fetch item groups:', err);
  }

  // Supplier Groups
  let supplierGroups = ['All Supplier Groups', 'Hardware', 'Local', 'Services', 'Raw Material', 'Distributor'];
  try {
    const sgRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Supplier%20Group?fields=${encodeURIComponent(JSON.stringify(['name']))}&limit_page_length=50`,
      { sessionCookie }
    );
    if (sgRes.data && sgRes.data.length > 0) {
      supplierGroups = sgRes.data.map((sg) => sg.name);
    }
  } catch (err) {
    console.warn('Could not fetch supplier groups:', err);
  }

  // Items
  let items: Array<{ itemCode: string; itemName: string; uom: string; rate: number }> = [];
  try {
    const itemRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Item?filters=${encodeURIComponent(
        JSON.stringify([['is_stock_item', '=', 1], ['custom_is_test_record', '=', 0]])
      )}&fields=${encodeURIComponent(JSON.stringify(['name', 'item_name', 'stock_uom', 'valuation_rate']))}&limit_page_length=100`,
      { sessionCookie }
    );
    items = (itemRes.data || []).map((i) => ({
      itemCode: i.name,
      itemName: i.item_name || i.name,
      uom: i.stock_uom || 'Nos',
      rate: Number(i.valuation_rate || 0),
    }));
  } catch (err) {
    console.warn('Could not fetch items:', err);
  }

  // Suppliers
  let suppliers: Array<{ id: string; name: string }> = [];
  try {
    const suppRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Supplier?filters=${encodeURIComponent(
        JSON.stringify([['custom_is_test_record', '=', 0]])
      )}&fields=${encodeURIComponent(JSON.stringify(['name', 'supplier_name']))}&limit_page_length=100`,
      { sessionCookie }
    );
    suppliers = (suppRes.data || []).map((s) => ({
      id: s.name,
      name: s.supplier_name || s.name,
    }));
  } catch (err) {
    console.warn('Could not fetch suppliers:', err);
  }

  // Vehicles
  let vehicles: Array<{ id: string; licensePlate: string }> = [];
  try {
    const vehList = await getVehicles(sessionCookie);
    vehicles = vehList.map((v) => ({ id: v.id, licensePlate: v.licensePlate }));
  } catch (err) {
    console.warn('Could not fetch vehicles:', err);
  }

  // Active Breakdowns
  let breakdowns: Array<{ id: string; vehicle: string; description: string; parts: Array<{ itemCode: string; plannedQty: number }> }> = [];
  try {
    const bkdRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Vehicle%20Breakdown?filters=${encodeURIComponent(
        JSON.stringify([
          ['docstatus', '<', 2],
          ['repair_status', 'in', ['Approved', 'In Workshop', 'Awaiting Parts']],
          ['is_test_record', '=', 0],
        ])
      )}&fields=${encodeURIComponent(JSON.stringify(['name', 'vehicle', 'description']))}&limit_page_length=50`,
      { sessionCookie }
    );
    for (const b of bkdRes.data || []) {
      const bDoc = await getBreakdownDetails(sessionCookie, b.name);
      breakdowns.push({
        id: b.name,
        vehicle: b.vehicle,
        description: b.description || 'Breakdown incident',
        parts: (bDoc.partsTable || []).map((p) => ({
          itemCode: p.itemCode,
          plannedQty: p.plannedQty,
        })),
      });
    }
  } catch (err) {
    console.warn('Could not fetch breakdowns:', err);
  }

  return {
    warehouses,
    itemGroups,
    supplierGroups,
    items,
    suppliers,
    vehicles,
    breakdowns,
  };
}

// =============================================================================
// PHASE 5: INSURANCE & STATUTORY COMPLIANCE IMPLEMENTATION
// =============================================================================

export async function getInsurancePolicies(
  sessionCookie: string,
  filters?: {
    search?: string;
    status?: string;
    policyType?: string;
    vehicle?: string;
    showTestRecords?: boolean;
  }
): Promise<{ policies: VehicleInsurancePolicy[]; metrics: InsuranceMetrics }> {
  const queryFilters: any[] = [];
  if (!filters?.showTestRecords) {
    queryFilters.push(['is_test_record', '=', 0]);
  }
  if (filters?.status && filters.status !== 'ALL') {
    queryFilters.push(['policy_status', '=', filters.status]);
  }
  if (filters?.policyType && filters.policyType !== 'ALL') {
    queryFilters.push(['policy_type', '=', filters.policyType]);
  }
  if (filters?.vehicle && filters.vehicle !== 'ALL') {
    queryFilters.push(['vehicle', '=', filters.vehicle]);
  }

  const fields = JSON.stringify([
    'name',
    'policy_no',
    'vehicle',
    'insurance_company',
    'policy_type',
    'policy_status',
    'company',
    'start_date',
    'end_date',
    'premium_amount',
    'insured_declared_value',
    'policy_doc',
    'is_renewal',
    'previous_policy',
    'approved_by',
    'approved_on',
    'cancelled_by',
    'cancelled_on',
    'cancellation_reason',
    'remarks',
    'is_test_record',
  ]);

  const filterQuery =
    queryFilters.length > 0 ? `&filters=${encodeURIComponent(JSON.stringify(queryFilters))}` : '';
  const res = await frappeFetch<{ data: any[] }>(
    `/api/resource/Vehicle%20Insurance%20Policy?fields=${encodeURIComponent(
      fields
    )}${filterQuery}&limit_page_length=500&order_by=end_date%20asc`,
    { sessionCookie }
  );

  const rawPolicies = res.data || [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let activeCount = 0;
  let expiringSoonCount = 0;
  let expiredCount = 0;
  let totalPremiumSpent = 0;

  const policies: VehicleInsurancePolicy[] = rawPolicies.map((p) => {
    const end = p.end_date ? new Date(p.end_date) : null;
    let daysRemaining: number | undefined = undefined;
    let expiryUrgency: 'valid' | 'expiring_soon' | 'expired' = 'valid';

    if (end) {
      end.setHours(0, 0, 0, 0);
      daysRemaining = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      if (daysRemaining < 0) {
        expiryUrgency = 'expired';
      } else if (daysRemaining <= 30) {
        expiryUrgency = 'expiring_soon';
      }
    }

    const premium = Number(p.premium_amount || 0);

    if (p.policy_status === 'Active') {
      activeCount++;
      if (expiryUrgency === 'expiring_soon') expiringSoonCount++;
      if (expiryUrgency === 'expired') expiredCount++;
    } else if (p.policy_status === 'Expired') {
      expiredCount++;
    }

    if (!p.is_test_record && p.policy_status !== 'Cancelled') {
      totalPremiumSpent += premium;
    }

    return {
      id: p.name,
      name: p.name,
      policyNo: p.policy_no,
      vehicle: p.vehicle,
      vehiclePlate: p.vehicle,
      insuranceCompany: p.insurance_company,
      policyType: p.policy_type as PolicyType,
      policyStatus: p.policy_status as PolicyStatus,
      company: p.company || 'Uptoware',
      startDate: p.start_date,
      endDate: p.end_date,
      premiumAmount: premium,
      idvAmount: Number(p.insured_declared_value || 0),
      policyDoc: p.policy_doc || null,
      isRenewal: Boolean(p.is_renewal),
      previousPolicy: p.previous_policy || null,
      approvedBy: p.approved_by || null,
      approvedOn: p.approved_on || null,
      cancelledBy: p.cancelled_by || null,
      cancelledOn: p.cancelled_on || null,
      cancellationReason: p.cancellation_reason || null,
      remarks: p.remarks || null,
      isTestRecord: Boolean(p.is_test_record),
      daysRemaining,
      expiryUrgency,
    };
  });

  const averagePremium = policies.length > 0 ? totalPremiumSpent / policies.length : 0;

  const metrics: InsuranceMetrics = {
    totalPolicies: policies.length,
    activePolicies: activeCount,
    expiringSoon: expiringSoonCount,
    expired: expiredCount,
    totalPremiumSpent,
    averagePremium,
  };

  return { policies, metrics };
}

export async function getInsurancePolicyDetails(
  sessionCookie: string,
  id: string
): Promise<VehicleInsurancePolicy & { renewalChain: { previous?: any; next?: any } }> {
  const res = await frappeFetch<{ data: any }>(
    `/api/resource/Vehicle%20Insurance%20Policy/${encodeURIComponent(id)}`,
    { sessionCookie }
  );
  const p = res.data;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = p.end_date ? new Date(p.end_date) : null;
  let daysRemaining: number | undefined = undefined;
  let expiryUrgency: 'valid' | 'expiring_soon' | 'expired' = 'valid';

  if (end) {
    end.setHours(0, 0, 0, 0);
    daysRemaining = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (daysRemaining < 0) expiryUrgency = 'expired';
    else if (daysRemaining <= 30) expiryUrgency = 'expiring_soon';
  }

  let previousPolicyInfo: any = null;
  if (p.previous_policy) {
    try {
      const prevRes = await frappeFetch<{ data: any }>(
        `/api/resource/Vehicle%20Insurance%20Policy/${encodeURIComponent(p.previous_policy)}`,
        { sessionCookie }
      );
      previousPolicyInfo = {
        name: prevRes.data.name,
        policyNo: prevRes.data.policy_no,
        insuranceCompany: prevRes.data.insurance_company,
        endDate: prevRes.data.end_date,
        policyStatus: prevRes.data.policy_status,
      };
    } catch {}
  }

  let nextRenewalInfo: any = null;
  try {
    const nextRes = await frappeFetch<{ data: any[] }>(
      `/api/resource/Vehicle%20Insurance%20Policy?filters=${encodeURIComponent(
        JSON.stringify([['previous_policy', '=', id]])
      )}&fields=["name","policy_no","insurance_company","start_date","end_date","policy_status"]`,
      { sessionCookie }
    );
    if (nextRes.data && nextRes.data.length > 0) {
      nextRenewalInfo = nextRes.data[0];
    }
  } catch {}

  return {
    id: p.name,
    name: p.name,
    policyNo: p.policy_no,
    vehicle: p.vehicle,
    vehiclePlate: p.vehicle,
    insuranceCompany: p.insurance_company,
    policyType: p.policy_type as PolicyType,
    policyStatus: p.policy_status as PolicyStatus,
    company: p.company || 'Uptoware',
    startDate: p.start_date,
    endDate: p.end_date,
    premiumAmount: Number(p.premium_amount || 0),
    idvAmount: Number(p.insured_declared_value || 0),
    policyDoc: p.policy_doc || null,
    isRenewal: Boolean(p.is_renewal),
    previousPolicy: p.previous_policy || null,
    previousPolicyNo: previousPolicyInfo?.policyNo || null,
    approvedBy: p.approved_by || null,
    approvedOn: p.approved_on || null,
    cancelledBy: p.cancelled_by || null,
    cancelledOn: p.cancelled_on || null,
    cancellationReason: p.cancellation_reason || null,
    remarks: p.remarks || null,
    isTestRecord: Boolean(p.is_test_record),
    daysRemaining,
    expiryUrgency,
    renewalChain: {
      previous: previousPolicyInfo,
      next: nextRenewalInfo,
    },
  };
}

export async function createInsurancePolicy(
  sessionCookie: string,
  input: CreateInsurancePolicyInput
): Promise<VehicleInsurancePolicy> {
  const payload: any = {
    doctype: 'Vehicle Insurance Policy',
    vehicle: input.vehicle.trim(),
    policy_no: input.policyNo.trim(),
    insurance_company: input.insuranceCompany.trim(),
    policy_type: input.policyType || 'Commercial Fleet Standard',
    start_date: input.startDate,
    end_date: input.endDate,
    premium_amount: Number(input.premiumAmount || 0),
    insured_declared_value: Number(input.idvAmount || 0),
    policy_status: input.activateNow ? 'Active' : 'Draft',
    policy_doc: input.policyDoc || null,
    remarks: input.remarks?.trim() || null,
    company: 'Uptoware',
    is_test_record: input.isTestRecord ? 1 : 0,
  };

  const res = await frappeFetch<{ data: any }>('/api/resource/Vehicle%20Insurance%20Policy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    sessionCookie,
  });

  return getInsurancePolicyDetails(sessionCookie, res.data.name);
}

export async function updateInsurancePolicyStatus(
  sessionCookie: string,
  id: string,
  action: 'activate' | 'cancel',
  reason?: string
): Promise<VehicleInsurancePolicy> {
  const payload: any = {};
  if (action === 'activate') {
    payload.policy_status = 'Active';
  } else if (action === 'cancel') {
    if (!reason || !reason.trim()) {
      throw new Error('Cancellation reason is mandatory when cancelling an insurance policy.');
    }
    payload.policy_status = 'Cancelled';
    payload.cancellation_reason = reason.trim();
  }

  await frappeFetch(`/api/resource/Vehicle%20Insurance%20Policy/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    sessionCookie,
  });

  return getInsurancePolicyDetails(sessionCookie, id);
}

export async function renewInsurancePolicy(
  sessionCookie: string,
  input: RenewInsurancePolicyInput
): Promise<VehicleInsurancePolicy> {
  const bodyPayload: any = {
    policy_name: input.policyName,
    new_policy_no: input.newPolicyNo.trim(),
    start_date: input.startDate,
    end_date: input.endDate,
    premium_amount: Number(input.premiumAmount),
    insurance_company: input.insuranceCompany?.trim(),
    remarks: input.remarks?.trim(),
    activate_now: input.activateNow ? 1 : 0,
  };

  const res = await frappeFetch<{ message: { status: string; new_policy: string } }>(
    '/api/method/renew_insurance_policy',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload),
      sessionCookie,
    }
  );

  const newPolName = res.message?.new_policy;
  if (!newPolName) {
    throw new Error('Failed to generate renewed policy from Frappe backend.');
  }

  return getInsurancePolicyDetails(sessionCookie, newPolName);
}

export async function getVehicleCompliance(
  sessionCookie: string,
  filters?: {
    search?: string;
    status?: string;
    showTestRecords?: boolean;
  }
): Promise<{ vehicles: VehicleComplianceRecord[]; metrics: ComplianceMetrics }> {
  const queryFilters: any[] = [];
  if (!filters?.showTestRecords) {
    queryFilters.push(['is_test_record', '=', 0]);
  }

  const fields = JSON.stringify([
    'name',
    'license_plate',
    'make',
    'model',
    'vehicle_status',
    'insurance_company',
    'policy_no',
    'start_date',
    'end_date',
    'insurance_policy_doc',
    'fitness_expiry_date',
    'fitness_doc',
    'puc_expiry_date',
    'puc_doc',
    'road_tax_expiry_date',
    'road_tax_doc',
    'permit_expiry_date',
    'permit_doc',
    'is_test_record',
  ]);

  const filterQuery =
    queryFilters.length > 0 ? `&filters=${encodeURIComponent(JSON.stringify(queryFilters))}` : '';
  const res = await frappeFetch<{ data: any[] }>(
    `/api/resource/Vehicle?fields=${encodeURIComponent(
      fields
    )}${filterQuery}&limit_page_length=500&order_by=license_plate%20asc`,
    { sessionCookie }
  );

  const rawVehicles = res.data || [];
  let fullyCompliantCount = 0;
  let expiringSoonCount = 0;
  let nonCompliantCount = 0;
  let insuranceExpiredCount = 0;
  let fitnessExpiredCount = 0;

  const vehicles: VehicleComplianceRecord[] = rawVehicles.map((v) => {
    const insurance = calculateStatutoryDoc('Commercial Insurance', v.end_date);
    const fitness = calculateStatutoryDoc('Fitness Certificate', v.fitness_expiry_date);
    const puc = calculateStatutoryDoc('Pollution Under Control (PUC)', v.puc_expiry_date);
    const roadTax = calculateStatutoryDoc('Road Tax Receipt', v.road_tax_expiry_date);
    const permit = calculateStatutoryDoc('Mining & Goods Permit', v.permit_expiry_date);

    const overall = determineOverallHealth([insurance, fitness, puc, roadTax, permit]);

    if (overall === 'valid') fullyCompliantCount++;
    else if (overall === 'expiring_soon') expiringSoonCount++;
    else nonCompliantCount++;

    if (insurance.status === 'expired' || insurance.status === 'missing') insuranceExpiredCount++;
    if (fitness.status === 'expired' || fitness.status === 'missing') fitnessExpiredCount++;

    return {
      vehicle: v.name,
      licensePlate: v.license_plate || v.name,
      make: v.make || 'Tata',
      model: v.model || 'Commercial Vehicle',
      vehicleStatus: (v.vehicle_status as VehicleStatus) || 'Active',
      overallCompliance: overall,
      insurance: {
        title: 'Commercial Insurance',
        documentType: 'Insurance',
        docNumber: v.policy_no || null,
        provider: v.insurance_company || null,
        startDate: v.start_date || null,
        expiryDate: v.end_date || null,
        docUrl: v.insurance_policy_doc || null,
        status: insurance.status,
        daysRemaining: insurance.daysRemaining,
      },
      fitness: {
        title: 'Fitness Certificate',
        documentType: 'Fitness',
        expiryDate: v.fitness_expiry_date || null,
        docUrl: v.fitness_doc || null,
        status: fitness.status,
        daysRemaining: fitness.daysRemaining,
      },
      puc: {
        title: 'PUC Certificate',
        documentType: 'PUC',
        expiryDate: v.puc_expiry_date || null,
        docUrl: v.puc_doc || null,
        status: puc.status,
        daysRemaining: puc.daysRemaining,
      },
      roadTax: {
        title: 'Road Tax Receipt',
        documentType: 'Road Tax',
        expiryDate: v.road_tax_expiry_date || null,
        docUrl: v.road_tax_doc || null,
        status: roadTax.status,
        daysRemaining: roadTax.daysRemaining,
      },
      permit: {
        title: 'Mining Permit',
        documentType: 'Permit',
        expiryDate: v.permit_expiry_date || null,
        docUrl: v.permit_doc || null,
        status: permit.status,
        daysRemaining: permit.daysRemaining,
      },
      isTestRecord: Boolean(v.is_test_record),
    };
  });

  const metrics: ComplianceMetrics = {
    totalVehicles: vehicles.length,
    fullyCompliant: fullyCompliantCount,
    expiringSoon: expiringSoonCount,
    nonCompliant: nonCompliantCount,
    insuranceExpired: insuranceExpiredCount,
    fitnessExpired: fitnessExpiredCount,
  };

  return { vehicles, metrics };
}

export async function updateVehicleCompliance(
  sessionCookie: string,
  input: UpdateComplianceInput
): Promise<VehicleComplianceRecord> {
  const payload: any = {};
  if (input.documentType === 'Fitness') {
    payload.fitness_expiry_date = input.expiryDate;
    if (input.docUrl) payload.fitness_doc = input.docUrl;
  } else if (input.documentType === 'PUC') {
    payload.puc_expiry_date = input.expiryDate;
    if (input.docUrl) payload.puc_doc = input.docUrl;
  } else if (input.documentType === 'Road Tax') {
    payload.road_tax_expiry_date = input.expiryDate;
    if (input.docUrl) payload.road_tax_doc = input.docUrl;
  } else if (input.documentType === 'Permit') {
    payload.permit_expiry_date = input.expiryDate;
    if (input.docUrl) payload.permit_doc = input.docUrl;
  }

  await frappeFetch(`/api/resource/Vehicle/${encodeURIComponent(input.vehicle)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    sessionCookie,
  });

  const { vehicles } = await getVehicleCompliance(sessionCookie, { showTestRecords: true });
  const updated = vehicles.find((v) => v.vehicle === input.vehicle);
  if (!updated) throw new Error(`Vehicle '${input.vehicle}' not found after update.`);
  return updated;
}

export async function getInsuranceOptions(sessionCookie: string): Promise<{
  vehicles: Array<{ id: string; licensePlate: string; make: string; model: string }>;
  insuranceCompanies: string[];
  policyTypes: string[];
}> {
  const vRes = await frappeFetch<{ data: any[] }>(
    `/api/resource/Vehicle?fields=["name","license_plate","make","model"]&limit_page_length=200&order_by=license_plate%20asc`,
    { sessionCookie }
  );

  const vehicles = (vRes.data || []).map((v) => ({
    id: v.name,
    licensePlate: v.license_plate || v.name,
    make: v.make || 'Tata',
    model: v.model || 'Commercial Vehicle',
  }));

  const insuranceCompanies = [
    'ICICI Lombard General Insurance',
    'Tata AIG General Insurance',
    'HDFC ERGO General Insurance',
    'National Insurance Co',
    'The New India Assurance',
    'Oriental Insurance Co',
    'United India Insurance',
    'Bajaj Allianz General Insurance',
    'Reliance General Insurance',
    'SBI General Insurance',
  ];

  const policyTypes = [
    'Commercial Fleet Standard',
    'Comprehensive',
    'Third Party Liability',
    'Zero Depreciation',
  ];

  return { vehicles, insuranceCompanies, policyTypes };
}



// ============================================================================
// PHASE 6: FINANCE & ANALYTICS INTERFACES AND CLIENT METHODS
// ============================================================================

export interface FinancialKpis {
  totalRevenue: number;
  totalCollections: number;
  outstandingReceivables: number;
  fuelExpenses: number;
  maintenanceExpenses: number;
  operationalExpenses: number;
  otherOperatingExpenses: number;
  totalOperatingCost: number;
  netOperatingIncome: number;
  operatingMarginPct: number;
  collectionEfficiencyPct: number;
  period: { fromDate: string; toDate: string };
  topVehicles: Array<{
    vehicle: string;
    revenue: number;
    cost: number;
    netMargin: number;
    marginPct: number;
  }>;
}

export interface SalesInvoiceRecord {
  id: string;
  customer: string;
  customerName: string;
  postingDate: string;
  dueDate: string;
  grandTotal: number;
  baseGrandTotal: number;
  outstandingAmount: number;
  status: string;
  isReturn: boolean;
  miningTrip: string | null;
  vehicle: string | null;
  mineSite: string | null;
  isTestRecord: boolean;
  items?: Array<{
    itemCode: string;
    itemName: string;
    qty: number;
    rate: number;
    amount: number;
    vehicle?: string;
    trip?: string;
    mineSite?: string;
  }>;
  payments?: Array<{
    paymentId: string;
    date: string;
    amount: number;
    mode: string;
  }>;
}

export interface PaymentEntryRecord {
  id: string;
  postingDate: string;
  paymentType: string;
  partyType: string;
  party: string;
  partyName: string;
  modeOfPayment: string;
  paidAmount: number;
  receivedAmount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  referenceNo: string;
  referenceDate: string;
  status: string;
  isTestRecord: boolean;
  references?: Array<{
    referenceDoctype: string;
    referenceName: string;
    totalAmount: number;
    outstandingAmount: number;
    allocatedAmount: number;
  }>;
}

export interface VehicleProfitabilityRecord {
  vehicle: string;
  make: string;
  model: string;
  tripsCount: number;
  totalTons: number;
  invoicedRevenue: number;
  fuelCost: number;
  partsCost: number;
  labourCost: number;
  maintenanceCost: number;
  directOpex: number;
  insurance: number;
  totalOperatingCost: number;
  netContribution: number;
  operatingMarginPct: number;
}

export interface TripProfitabilityRecord {
  tripId: string;
  dispatchDate: string;
  vehicle: string;
  driver: string;
  mineSite: string;
  client: string;
  netTons: number;
  tripStatus: string;
  billingStatus: string;
  indicativeRate: number;
  estimatedRevenue: number;
  invoicedRevenue: number;
  directTripOpex: number;
  directRepairCost: number;
  totalDirectCost: number;
  contribution: number;
  salesInvoice: string;
}

export interface CustomerRevenueRecord {
  customer: string;
  customerGroup: string;
  invoicesCount: number;
  grossInvoiced: number;
  creditNotes: number;
  netRevenue: number;
  collectedAmount: number;
  outstandingReceivables: number;
}

export async function getFinancialDashboard(
  sessionCookie: string,
  filters?: { fromDate?: string; toDate?: string; vehicle?: string; customer?: string },
  includeTest = false
): Promise<FinancialKpis> {
  const defaultFrom = filters?.fromDate || '2026-01-01';
  const defaultTo = filters?.toDate || '2026-12-31';

  // 1. Invoiced Revenue strictly from submitted Sales Invoices (docstatus = 1)
  const invFields = JSON.stringify([
    'name',
    'customer',
    'posting_date',
    'base_grand_total',
    'grand_total',
    'outstanding_amount',
    'is_return',
    'custom_vehicle',
    'custom_mining_trip',
    'custom_mine_site',
    'custom_is_test_record',
    'docstatus',
  ]);

  const invFilterConditions: any[] = [['docstatus', '=', 1]];
  if (!includeTest) {
    invFilterConditions.push(['custom_is_test_record', '=', 0]);
  }
  if (filters?.fromDate) {
    invFilterConditions.push(['posting_date', '>=', filters.fromDate]);
  }
  if (filters?.toDate) {
    invFilterConditions.push(['posting_date', '<=', filters.toDate]);
  }
  if (filters?.customer) {
    invFilterConditions.push(['customer', '=', filters.customer]);
  }
  if (filters?.vehicle) {
    invFilterConditions.push(['custom_vehicle', '=', filters.vehicle]);
  }

  const invRes = await frappeFetch<{ data: any[] }>(
    `/api/resource/Sales%20Invoice?fields=${encodeURIComponent(
      invFields
    )}&filters=${encodeURIComponent(JSON.stringify(invFilterConditions))}&limit_page_length=500`,
    { sessionCookie }
  ).catch(() => ({ data: [] }));

  let totalRevenue = 0;
  let outstandingReceivables = 0;
  const vehicleRevMap: Record<string, number> = {};

  for (const inv of invRes.data || []) {
    const amt = Number(inv.base_grand_total || inv.grand_total) || 0;
    const isRet = Number(inv.is_return) === 1;
    const netAmt = isRet ? -Math.abs(amt) : amt;
    totalRevenue += netAmt;
    outstandingReceivables += Number(inv.outstanding_amount) || 0;

    const v = inv.custom_vehicle;
    if (v) {
      vehicleRevMap[v] = (vehicleRevMap[v] || 0) + netAmt;
    }
  }

  // 2. Total Collections from submitted Payment Entries (docstatus = 1, Receive)
  const peFields = JSON.stringify([
    'name',
    'posting_date',
    'party',
    'payment_type',
    'received_amount',
    'total_allocated_amount',
    'custom_is_test_record',
    'docstatus',
  ]);

  const peFilterConditions: any[] = [
    ['docstatus', '=', 1],
    ['payment_type', '=', 'Receive'],
  ];
  if (!includeTest) {
    peFilterConditions.push(['custom_is_test_record', '=', 0]);
  }
  if (filters?.fromDate) {
    peFilterConditions.push(['posting_date', '>=', filters.fromDate]);
  }
  if (filters?.toDate) {
    peFilterConditions.push(['posting_date', '<=', filters.toDate]);
  }
  if (filters?.customer) {
    peFilterConditions.push(['party', '=', filters.customer]);
  }

  const peRes = await frappeFetch<{ data: any[] }>(
    `/api/resource/Payment%20Entry?fields=${encodeURIComponent(
      peFields
    )}&filters=${encodeURIComponent(JSON.stringify(peFilterConditions))}&limit_page_length=500`,
    { sessionCookie }
  ).catch(() => ({ data: [] }));

  let totalCollections = 0;
  for (const pe of peRes.data || []) {
    totalCollections += Number(pe.received_amount) || 0;
  }

  // 3. Fuel Expenses from approved Fuel Logs
  const fuelFields = JSON.stringify(['total_fuel_cost', 'vehicle', 'approval_status', 'is_test_record']);
  const fuelFilterConditions: any[] = [['approval_status', '=', 'Approved']];
  if (!includeTest) {
    fuelFilterConditions.push(['is_test_record', '=', 0]);
  }
  if (filters?.vehicle) {
    fuelFilterConditions.push(['vehicle', '=', filters.vehicle]);
  }
  if (filters?.fromDate) {
    fuelFilterConditions.push(['fuel_date', '>=', filters.fromDate]);
  }
  if (filters?.toDate) {
    fuelFilterConditions.push(['fuel_date', '<=', filters.toDate]);
  }

  const fuelRes = await frappeFetch<{ data: any[] }>(
    `/api/resource/Fuel%20Log?fields=${encodeURIComponent(
      fuelFields
    )}&filters=${encodeURIComponent(JSON.stringify(fuelFilterConditions))}&limit_page_length=500`,
    { sessionCookie }
  ).catch(() => ({ data: [] }));

  let fuelExpenses = 0;
  const vehicleCostMap: Record<string, number> = {};

  for (const f of fuelRes.data || []) {
    const c = Number(f.total_fuel_cost) || 0;
    fuelExpenses += c;
    if (f.vehicle) {
      vehicleCostMap[f.vehicle] = (vehicleCostMap[f.vehicle] || 0) + c;
    }
  }

  // 4. Maintenance Expenses from non-rejected Vehicle Breakdowns
  const bdFields = JSON.stringify([
    'total_repair_cost',
    'parts_cost',
    'labour_cost',
    'vehicle',
    'resolution_type',
    'is_test_record',
  ]);
  const bdFilterConditions: any[] = [['docstatus', '!=', 2]];
  if (!includeTest) {
    bdFilterConditions.push(['is_test_record', '=', 0]);
  }
  if (filters?.vehicle) {
    bdFilterConditions.push(['vehicle', '=', filters.vehicle]);
  }
  if (filters?.fromDate) {
    bdFilterConditions.push(['breakdown_datetime', '>=', filters.fromDate]);
  }
  if (filters?.toDate) {
    bdFilterConditions.push(['breakdown_datetime', '<=', filters.toDate]);
  }

  const bdRes = await frappeFetch<{ data: any[] }>(
    `/api/resource/Vehicle%20Breakdown?fields=${encodeURIComponent(
      bdFields
    )}&filters=${encodeURIComponent(JSON.stringify(bdFilterConditions))}&limit_page_length=500`,
    { sessionCookie }
  ).catch(() => ({ data: [] }));

  let maintenanceExpenses = 0;
  for (const b of bdRes.data || []) {
    if (b.resolution_type === 'Rejected') continue;
    const c = Number(b.total_repair_cost) || 0;
    maintenanceExpenses += c;
    if (b.vehicle) {
      vehicleCostMap[b.vehicle] = (vehicleCostMap[b.vehicle] || 0) + c;
    }
  }

  // 5. Operational Expenses from approved + posted expenses
  const expFields = JSON.stringify([
    'amount',
    'posted_amount',
    'vehicle',
    'mining_trip',
    'approval_status',
    'accounting_status',
    'is_test_record',
  ]);
  const expFilterConditions: any[] = [
    ['docstatus', '!=', 2],
    ['approval_status', '=', 'Approved'],
  ];
  if (!includeTest) {
    expFilterConditions.push(['is_test_record', '=', 0]);
  }
  if (filters?.vehicle) {
    expFilterConditions.push(['vehicle', '=', filters.vehicle]);
  }
  if (filters?.fromDate) {
    expFilterConditions.push(['expense_date', '>=', filters.fromDate]);
  }
  if (filters?.toDate) {
    expFilterConditions.push(['expense_date', '<=', filters.toDate]);
  }

  const expRes = await frappeFetch<{ data: any[] }>(
    `/api/resource/Operational%20Expense?fields=${encodeURIComponent(
      expFields
    )}&filters=${encodeURIComponent(JSON.stringify(expFilterConditions))}&limit_page_length=500`,
    { sessionCookie }
  ).catch(() => ({ data: [] }));

  let operationalExpenses = 0;
  let otherOperatingExpenses = 0;

  for (const e of expRes.data || []) {
    const c = Number(e.posted_amount || e.amount) || 0;
    operationalExpenses += c;
    if (e.vehicle) {
      vehicleCostMap[e.vehicle] = (vehicleCostMap[e.vehicle] || 0) + c;
    } else if (!e.mining_trip) {
      otherOperatingExpenses += c;
    }
  }

  // Consolidated non-duplicated Total Operating Cost
  const totalOperatingCost = fuelExpenses + maintenanceExpenses + operationalExpenses;
  const netOperatingIncome = totalRevenue - totalOperatingCost;
  const operatingMarginPct = totalRevenue > 0 ? Math.round((netOperatingIncome / totalRevenue) * 1000) / 10 : 0;
  const collectionEfficiencyPct = totalRevenue > 0 ? Math.min(100, Math.round((totalCollections / totalRevenue) * 100)) : 0;

  // Top vehicles summary
  const allVehicles = Array.from(new Set([...Object.keys(vehicleRevMap), ...Object.keys(vehicleCostMap)]));
  const topVehicles = allVehicles.map((v) => {
    const rev = vehicleRevMap[v] || 0;
    const cost = vehicleCostMap[v] || 0;
    const netMargin = rev - cost;
    const marginPct = rev > 0 ? Math.round((netMargin / rev) * 1000) / 10 : 0;
    return { vehicle: v, revenue: rev, cost, netMargin, marginPct };
  }).sort((a, b) => b.netMargin - a.netMargin);

  return {
    totalRevenue,
    totalCollections,
    outstandingReceivables,
    fuelExpenses,
    maintenanceExpenses,
    operationalExpenses,
    otherOperatingExpenses,
    totalOperatingCost,
    netOperatingIncome,
    operatingMarginPct,
    collectionEfficiencyPct,
    period: { fromDate: defaultFrom, toDate: defaultTo },
    topVehicles,
  };
}

export async function getSalesInvoices(
  sessionCookie: string,
  filters?: {
    customer?: string;
    status?: string;
    vehicle?: string;
    trip?: string;
    fromDate?: string;
    toDate?: string;
  },
  includeTest = false
): Promise<SalesInvoiceRecord[]> {
  const fields = JSON.stringify([
    'name',
    'customer',
    'customer_name',
    'posting_date',
    'due_date',
    'grand_total',
    'base_grand_total',
    'outstanding_amount',
    'status',
    'is_return',
    'custom_mining_trip',
    'custom_vehicle',
    'custom_mine_site',
    'custom_is_test_record',
    'docstatus',
  ]);

  const filterConditions: any[] = [['docstatus', '=', 1]];
  if (!includeTest) {
    filterConditions.push(['custom_is_test_record', '=', 0]);
  }
  if (filters?.customer) {
    filterConditions.push(['customer', '=', filters.customer]);
  }
  if (filters?.status) {
    filterConditions.push(['status', '=', filters.status]);
  }
  if (filters?.vehicle) {
    filterConditions.push(['custom_vehicle', '=', filters.vehicle]);
  }
  if (filters?.trip) {
    filterConditions.push(['custom_mining_trip', '=', filters.trip]);
  }
  if (filters?.fromDate) {
    filterConditions.push(['posting_date', '>=', filters.fromDate]);
  }
  if (filters?.toDate) {
    filterConditions.push(['posting_date', '<=', filters.toDate]);
  }

  const res = await frappeFetch<{ data: any[] }>(
    `/api/resource/Sales%20Invoice?fields=${encodeURIComponent(
      fields
    )}&filters=${encodeURIComponent(
      JSON.stringify(filterConditions)
    )}&order_by=posting_date%20desc&limit_page_length=200`,
    { sessionCookie }
  );

  return (res.data || []).map((inv) => ({
    id: inv.name,
    customer: inv.customer,
    customerName: inv.customer_name || inv.customer,
    postingDate: inv.posting_date,
    dueDate: inv.due_date,
    grandTotal: Number(inv.grand_total) || 0,
    baseGrandTotal: Number(inv.base_grand_total || inv.grand_total) || 0,
    outstandingAmount: Number(inv.outstanding_amount) || 0,
    status: inv.status || 'Submitted',
    isReturn: Number(inv.is_return) === 1,
    miningTrip: inv.custom_mining_trip || null,
    vehicle: inv.custom_vehicle || null,
    mineSite: inv.custom_mine_site || null,
    isTestRecord: Number(inv.custom_is_test_record) === 1,
  }));
}

export async function getSalesInvoiceDetail(
  sessionCookie: string,
  id: string
): Promise<SalesInvoiceRecord | null> {
  const res = await frappeFetch<{ data: any }>(
    `/api/resource/Sales%20Invoice/${encodeURIComponent(id)}`,
    { sessionCookie }
  ).catch(() => null);

  if (!res || !res.data) return null;
  const d = res.data;

  // Fetch payment references allocated to this invoice
  const refRes = await frappeFetch<{ data: any[] }>(
    `/api/resource/Payment%20Entry%20Reference?filters=${encodeURIComponent(
      JSON.stringify([
        ['reference_doctype', '=', 'Sales Invoice'],
        ['reference_name', '=', id],
        ['docstatus', '=', 1],
      ])
    )}&fields=["parent","allocated_amount","creation"]`,
    { sessionCookie }
  ).catch(() => ({ data: [] }));

  const payments = (refRes.data || []).map((r) => ({
    paymentId: r.parent,
    date: r.creation ? r.creation.split(' ')[0] : '',
    amount: Number(r.allocated_amount) || 0,
    mode: 'Bank / Cash',
  }));

  const items = (d.items || []).map((it: any) => ({
    itemCode: it.item_code,
    itemName: it.item_name || it.item_code,
    qty: Number(it.qty) || 0,
    rate: Number(it.rate) || 0,
    amount: Number(it.amount) || 0,
    vehicle: it.custom_vehicle || d.custom_vehicle || null,
    trip: it.custom_mining_trip || d.custom_mining_trip || null,
    mineSite: it.custom_mine_site || d.custom_mine_site || null,
  }));

  return {
    id: d.name,
    customer: d.customer,
    customerName: d.customer_name || d.customer,
    postingDate: d.posting_date,
    dueDate: d.due_date,
    grandTotal: Number(d.grand_total) || 0,
    baseGrandTotal: Number(d.base_grand_total || d.grand_total) || 0,
    outstandingAmount: Number(d.outstanding_amount) || 0,
    status: d.status || 'Submitted',
    isReturn: Number(d.is_return) === 1,
    miningTrip: d.custom_mining_trip || null,
    vehicle: d.custom_vehicle || null,
    mineSite: d.custom_mine_site || null,
    isTestRecord: Number(d.custom_is_test_record) === 1,
    items,
    payments,
  };
}

export async function getPaymentEntries(
  sessionCookie: string,
  filters?: {
    customer?: string;
    modeOfPayment?: string;
    fromDate?: string;
    toDate?: string;
  },
  includeTest = false
): Promise<PaymentEntryRecord[]> {
  const fields = JSON.stringify([
    'name',
    'posting_date',
    'payment_type',
    'party_type',
    'party',
    'party_name',
    'mode_of_payment',
    'paid_amount',
    'received_amount',
    'total_allocated_amount',
    'unallocated_amount',
    'reference_no',
    'reference_date',
    'status',
    'custom_is_test_record',
    'docstatus',
  ]);

  const filterConditions: any[] = [
    ['docstatus', '=', 1],
    ['payment_type', '=', 'Receive'],
  ];
  if (!includeTest) {
    filterConditions.push(['custom_is_test_record', '=', 0]);
  }
  if (filters?.customer) {
    filterConditions.push(['party', '=', filters.customer]);
  }
  if (filters?.modeOfPayment) {
    filterConditions.push(['mode_of_payment', '=', filters.modeOfPayment]);
  }
  if (filters?.fromDate) {
    filterConditions.push(['posting_date', '>=', filters.fromDate]);
  }
  if (filters?.toDate) {
    filterConditions.push(['posting_date', '<=', filters.toDate]);
  }

  const res = await frappeFetch<{ data: any[] }>(
    `/api/resource/Payment%20Entry?fields=${encodeURIComponent(
      fields
    )}&filters=${encodeURIComponent(
      JSON.stringify(filterConditions)
    )}&order_by=posting_date%20desc&limit_page_length=200`,
    { sessionCookie }
  );

  return (res.data || []).map((p) => ({
    id: p.name,
    postingDate: p.posting_date,
    paymentType: p.payment_type,
    partyType: p.party_type,
    party: p.party,
    partyName: p.party_name || p.party,
    modeOfPayment: p.mode_of_payment || 'Bank Transfer',
    paidAmount: Number(p.paid_amount) || 0,
    receivedAmount: Number(p.received_amount) || 0,
    allocatedAmount: Number(p.total_allocated_amount) || 0,
    unallocatedAmount: Number(p.unallocated_amount) || 0,
    referenceNo: p.reference_no || '—',
    referenceDate: p.reference_date || p.posting_date,
    status: p.status || 'Submitted',
    isTestRecord: Number(p.custom_is_test_record) === 1,
  }));
}

export async function getPaymentEntryDetail(
  sessionCookie: string,
  id: string
): Promise<PaymentEntryRecord | null> {
  const res = await frappeFetch<{ data: any }>(
    `/api/resource/Payment%20Entry/${encodeURIComponent(id)}`,
    { sessionCookie }
  ).catch(() => null);

  if (!res || !res.data) return null;
  const d = res.data;

  const references = (d.references || []).map((r: any) => ({
    referenceDoctype: r.reference_doctype,
    referenceName: r.reference_name,
    totalAmount: Number(r.total_amount) || 0,
    outstandingAmount: Number(r.outstanding_amount) || 0,
    allocatedAmount: Number(r.allocated_amount) || 0,
  }));

  return {
    id: d.name,
    postingDate: d.posting_date,
    paymentType: d.payment_type,
    partyType: d.party_type,
    party: d.party,
    partyName: d.party_name || d.party,
    modeOfPayment: d.mode_of_payment || 'Bank Transfer',
    paidAmount: Number(d.paid_amount) || 0,
    receivedAmount: Number(d.received_amount) || 0,
    allocatedAmount: Number(d.total_allocated_amount) || 0,
    unallocatedAmount: Number(d.unallocated_amount) || 0,
    referenceNo: d.reference_no || '—',
    referenceDate: d.reference_date || d.posting_date,
    status: d.status || 'Submitted',
    isTestRecord: Number(d.custom_is_test_record) === 1,
    references,
  };
}

export async function getVehicleProfitability(
  sessionCookie: string,
  filters?: { vehicle?: string; fromDate?: string; toDate?: string },
  includeTest = false
): Promise<VehicleProfitabilityRecord[]> {
  const reportRes = await executeFleetReport(
    sessionCookie,
    'Vehicle-wise Revenue and Profitability',
    {
      vehicle: filters?.vehicle || '',
      from_date: filters?.fromDate || '2026-01-01',
      to_date: filters?.toDate || '2026-12-31',
    }
  );

  return (reportRes.result || []).map((r: any) => ({
    vehicle: r.vehicle,
    make: r.make || 'Tata',
    model: r.model || 'Commercial Tipper',
    tripsCount: Number(r.trips_count) || 0,
    totalTons: Number(r.total_tons) || 0,
    invoicedRevenue: Number(r.invoiced_revenue) || 0,
    fuelCost: Number(r.fuel_cost) || 0,
    partsCost: Number(r.parts_cost) || 0,
    labourCost: Number(r.labour_cost) || 0,
    maintenanceCost: Number(r.maintenance_cost) || 0,
    directOpex: Number(r.direct_opex) || 0,
    insurance: Number(r.insurance) || 0,
    totalOperatingCost: Number(r.total_operating_cost) || 0,
    netContribution: Number(r.net_contribution) || 0,
    operatingMarginPct: Number(r['operating_margin_%%']) || 0,
  }));
}

export async function getTripProfitability(
  sessionCookie: string,
  filters?: { vehicle?: string; mineSite?: string; fromDate?: string; toDate?: string },
  includeTest = false
): Promise<TripProfitabilityRecord[]> {
  const reportRes = await executeFleetReport(
    sessionCookie,
    'Trip-wise Revenue and Profitability',
    {
      vehicle: filters?.vehicle || '',
      mine_site: filters?.mineSite || '',
      from_date: filters?.fromDate || '2026-01-01',
      to_date: filters?.toDate || '2026-12-31',
    }
  );

  return (reportRes.result || []).map((r: any) => ({
    tripId: r.trip_id,
    dispatchDate: r.dispatch_date || '',
    vehicle: r.vehicle,
    driver: r.driver,
    mineSite: r.mine_site,
    client: r.client || '—',
    netTons: Number(r.net_tons) || 0,
    tripStatus: r.trip_status || 'Draft',
    billingStatus: r.billing_status || 'Unbilled',
    indicativeRate: Number(r.indicative_rate) || 0,
    estimatedRevenue: Number(r.estimated_revenue) || 0,
    invoicedRevenue: Number(r.invoiced_revenue) || 0,
    directTripOpex: Number(r.direct_trip_opex) || 0,
    directRepairCost: Number(r.direct_repair_cost) || 0,
    totalDirectCost: Number(r.total_direct_cost) || 0,
    contribution: Number(r.contribution) || 0,
    salesInvoice: r.sales_invoice || '—',
  }));
}

export async function getCustomerRevenue(
  sessionCookie: string,
  filters?: { customer?: string; fromDate?: string; toDate?: string },
  includeTest = false
): Promise<CustomerRevenueRecord[]> {
  const reportRes = await executeFleetReport(
    sessionCookie,
    'Customer-wise Revenue',
    {
      customer: filters?.customer || '',
      from_date: filters?.fromDate || '2026-01-01',
      to_date: filters?.toDate || '2026-12-31',
    }
  );

  return (reportRes.result || []).map((r: any) => ({
    customer: r.customer,
    customerGroup: r.customer_group || 'Commercial',
    invoicesCount: Number(r.invoices_count) || 0,
    grossInvoiced: Number(r.gross_invoiced) || 0,
    creditNotes: Number(r.credit_notes) || 0,
    netRevenue: Number(r.net_revenue) || 0,
    collectedAmount: Number(r.collected_amount) || 0,
    outstandingReceivables: Number(r.outstanding_receivables) || 0,
  }));
}

// ============================================================================
// PHASE 7: ALERTS, NOTIFICATIONS, APPROVALS & ADMINISTRATION HELPERS
// ============================================================================

export function mapFleetAlert(r: any): FleetAlert {
  return {
    id: r.name,
    title: r.alert_title || r.name,
    category: r.alert_category || 'General',
    severity: (r.severity as 'Low' | 'Medium' | 'High' | 'Critical') || 'Medium',
    status: r.status || 'Unread',
    vehicle: r.vehicle || null,
    driver: r.driver || null,
    sourceDoctype: r.source_doctype || null,
    sourceName: r.source_name || null,
    recipientRole: r.recipient_role || null,
    forUser: r.for_user || null,
    message: r.message || null,
    timestamp: r.alert_timestamp || r.creation,
    actionRequired: r.action_required || null,
    resolvedBy: r.resolved_by || null,
    resolvedOn: r.resolved_on || null,
    resolutionNote: r.resolution_note || null,
    acknowledgedBy: r.acknowledged_by || null,
    acknowledgedOn: r.acknowledged_on || null,
    isTestRecord: Boolean(r.is_test_record),
  };
}

export async function getFleetAlerts(
  sessionCookie: string,
  options?: {
    category?: string;
    severity?: string;
    status?: string;
    vehicle?: string;
    fromDate?: string;
    toDate?: string;
    query?: string;
    limit?: number;
    offset?: number;
    includeTest?: boolean;
    countOnly?: boolean;
  }
): Promise<{ alerts: FleetAlert[]; metrics: AlertMetrics; totalCount: number }> {
  const fields = JSON.stringify([
    'name',
    'alert_title',
    'alert_category',
    'severity',
    'status',
    'source_doctype',
    'source_name',
    'vehicle',
    'driver',
    'is_test_record',
    'recipient_role',
    'for_user',
    'alert_timestamp',
    'action_required',
    'message',
    'resolved_by',
    'resolved_on',
    'resolution_note',
    'acknowledged_by',
    'acknowledged_on',
    'creation',
  ]);

  const filters: any[] = [];
  if (!options?.includeTest) {
    filters.push(['is_test_record', '=', 0]);
  }
  if (options?.category && options.category !== 'ALL') {
    filters.push(['alert_category', '=', options.category]);
  }
  if (options?.severity && options.severity !== 'ALL') {
    filters.push(['severity', '=', options.severity]);
  }
  if (options?.status && options.status !== 'ALL') {
    filters.push(['status', '=', options.status]);
  }
  if (options?.vehicle && options.vehicle !== 'ALL') {
    filters.push(['vehicle', '=', options.vehicle]);
  }
  if (options?.fromDate) {
    filters.push(['alert_timestamp', '>=', options.fromDate]);
  }
  if (options?.toDate) {
    filters.push(['alert_timestamp', '<=', options.toDate]);
  }

  const limit = options?.limit ?? 100;
  const start = options?.offset ?? 0;

  let endpoint = `/api/resource/Fleet%20Alert%20Log?fields=${encodeURIComponent(
    fields
  )}&order_by=creation%20desc&limit_page_length=${limit}&limit_start=${start}`;

  if (filters.length > 0) {
    endpoint += `&filters=${encodeURIComponent(JSON.stringify(filters))}`;
  }

  const res = await frappeFetch<{ data?: any[] }>(endpoint, { sessionCookie });
  const rawAlerts = res.data || [];

  let alerts = rawAlerts.map(mapFleetAlert);

  if (options?.query) {
    const q = options.query.toLowerCase();
    alerts = alerts.filter(
      (a) =>
        a.id.toLowerCase().includes(q) ||
        a.title.toLowerCase().includes(q) ||
        (a.message && a.message.toLowerCase().includes(q)) ||
        (a.vehicle && a.vehicle.toLowerCase().includes(q)) ||
        (a.actionRequired && a.actionRequired.toLowerCase().includes(q))
    );
  }

  // Calculate metrics across recent dataset
  let totalAlerts = 0;
  let unreadAlerts = 0;
  let criticalAlerts = 0;
  let highAlerts = 0;
  let resolvedAlerts = 0;
  const byCategory: Record<string, number> = {};

  for (const a of alerts) {
    totalAlerts++;
    if (a.status === 'Unread') unreadAlerts++;
    if (a.status === 'Resolved') resolvedAlerts++;
    if (a.severity === 'Critical') criticalAlerts++;
    if (a.severity === 'High') highAlerts++;
    byCategory[a.category] = (byCategory[a.category] || 0) + 1;
  }

  return {
    alerts,
    metrics: {
      totalAlerts,
      unreadAlerts,
      criticalAlerts,
      highAlerts,
      resolvedAlerts,
      byCategory,
    },
    totalCount: alerts.length,
  };
}

export async function updateFleetAlert(
  sessionCookie: string,
  id: string,
  data: {
    status?: 'Unread' | 'Read' | 'Acknowledged' | 'Resolved';
    resolutionNote?: string;
    resolvedBy?: string;
  }
): Promise<FleetAlert> {
  const updatePayload: Record<string, any> = {};
  if (data.status) {
    updatePayload.status = data.status;
  }
  if (data.status === 'Resolved') {
    updatePayload.resolved_by = data.resolvedBy || 'Administrator';
    updatePayload.resolved_on = new Date().toISOString().replace('T', ' ').substring(0, 19);
    if (data.resolutionNote) {
      updatePayload.resolution_note = data.resolutionNote;
    }
  } else if (data.status === 'Acknowledged') {
    updatePayload.acknowledged_by = data.resolvedBy || 'Administrator';
    updatePayload.acknowledged_on = new Date().toISOString().replace('T', ' ').substring(0, 19);
  }

  const endpoint = `/api/resource/Fleet%20Alert%20Log/${encodeURIComponent(id)}`;
  const res = await frappeFetch<{ data?: any }>(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updatePayload),
    sessionCookie,
  });

  if (!res.data) {
    throw new Error(`Failed to update Fleet Alert '${id}'`);
  }

  return mapFleetAlert(res.data);
}

export async function createFleetAlert(
  sessionCookie: string,
  alert: Partial<FleetAlert> & { isTestRecord?: boolean }
): Promise<FleetAlert> {
  const payload = {
    doctype: 'Fleet Alert Log',
    alert_title: alert.title,
    alert_category: alert.category || 'Compliance',
    severity: alert.severity || 'Medium',
    status: alert.status || 'Unread',
    source_doctype: alert.sourceDoctype || null,
    source_name: alert.sourceName || null,
    vehicle: alert.vehicle || null,
    driver: alert.driver || null,
    recipient_role: alert.recipientRole || 'Fleet Manager',
    for_user: alert.forUser || null,
    alert_timestamp: alert.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 19),
    action_required: alert.actionRequired || null,
    message: alert.message || null,
    is_test_record: alert.isTestRecord ? 1 : 0,
  };

  const res = await callFrappeApi('/api/method/frappe.client.insert', sessionCookie, {
    method: 'POST',
    body: JSON.stringify({ doc: payload }),
  });

  return mapFleetAlert(res.message);
}

export async function markAllFleetAlertsRead(
  sessionCookie: string,
  userEmail?: string,
  role?: string
): Promise<{ count: number }> {
  // Fetch up to 100 unread alerts
  const filters: any[] = [['status', '=', 'Unread']];
  const fields = JSON.stringify(['name']);
  const endpoint = `/api/resource/Fleet%20Alert%20Log?fields=${encodeURIComponent(
    fields
  )}&filters=${encodeURIComponent(JSON.stringify(filters))}&limit_page_length=100`;

  const res = await frappeFetch<{ data?: { name: string }[] }>(endpoint, { sessionCookie });
  const unreadList = res.data || [];

  let count = 0;
  for (const item of unreadList) {
    try {
      await updateFleetAlert(sessionCookie, item.name, { status: 'Read' });
      count++;
    } catch {
      // Continue updating remaining
    }
  }

  return { count };
}

export async function getPendingApprovals(
  sessionCookie: string,
  user: { email: string; role: string; roles: string[] },
  includeTest = false
): Promise<{ items: ApprovalItem[]; metrics: ApprovalMetrics }> {
  const items: ApprovalItem[] = [];

  const canViewTrips =
    user.role === 'Administrator' ||
    user.role === 'Fleet Manager' ||
    user.role === 'Dispatcher';

  const canViewFuel =
    user.role === 'Administrator' ||
    user.role === 'Fleet Manager' ||
    user.role === 'Workshop Supervisor';

  const canViewBreakdowns =
    user.role === 'Administrator' ||
    user.role === 'Fleet Manager' ||
    user.role === 'Workshop Supervisor';

  const canViewExpenses =
    user.role === 'Administrator' ||
    user.role === 'Fleet Manager' ||
    user.role === 'Accountant';

  const canViewProcurement =
    user.role === 'Administrator' ||
    user.role === 'Fleet Manager' ||
    user.role === 'Accountant';

  const canViewInsurance =
    user.role === 'Administrator' ||
    user.role === 'Fleet Manager' ||
    user.role === 'Accountant';

  // 1. Mining Trips (Weighbridge Confirmed, Dispatched, or Draft)
  if (canViewTrips) {
    try {
      const tripFields = JSON.stringify([
        'name',
        'workflow_state',
        'vehicle',
        'driver',
        'mine_site',
        'material_type',
        'net_weight_tons',
        'owner',
        'creation',
        'dispatch_date_time',
        'is_test_record',
      ]);
      const tripFilters: any[] = [
        ['workflow_state', 'in', ['Draft', 'Weighbridge Confirmed', 'Dispatched']],
      ];
      if (!includeTest) tripFilters.push(['is_test_record', '=', 0]);

      const tripRes = await frappeFetch<{ data?: any[] }>(
        `/api/resource/Mining%20Trip?fields=${encodeURIComponent(
          tripFields
        )}&filters=${encodeURIComponent(
          JSON.stringify(tripFilters)
        )}&limit_page_length=25&order_by=creation%20desc`,
        { sessionCookie }
      );

      for (const t of tripRes.data || []) {
        const isOwner = t.owner === user.email || t.owner === user.email.split('@')[0];
        items.push({
          id: t.name,
          doctype: 'Mining Trip',
          title: `Mining Trip ${t.name} (${t.material_type || 'Ore'} - ${t.net_weight_tons || 0} Tons)`,
          submitter: t.owner || 'Dispatcher',
          submissionDate: t.dispatch_date_time || t.creation,
          currentState: t.workflow_state || 'Draft',
          targetState: 'Approved',
          allowedActions:
            t.workflow_state === 'Weighbridge Confirmed'
              ? ['Approve', 'Cancel']
              : t.workflow_state === 'Dispatched'
              ? ['Confirm Weighbridge', 'Cancel']
              : ['Dispatch', 'Cancel'],
          vehicle: t.vehicle,
          driver: t.driver,
          mineSite: t.mine_site,
          quantity: t.net_weight_tons,
          urgency: 'Medium',
          details: { materialType: t.material_type, netWeightTons: t.net_weight_tons },
          canSelfApprove: !isOwner,
          isCurrentUserOwner: isOwner,
        });
      }
    } catch (e) {
      console.error('Error fetching pending Mining Trips:', e);
    }
  }

  // 2. Fuel Logs (Draft)
  if (canViewFuel) {
    try {
      const fuelFields = JSON.stringify([
        'name',
        'workflow_state',
        'vehicle',
        'driver',
        'quantity_litres',
        'rate_per_litre',
        'total_fuel_cost',
        'fuel_source',
        'owner',
        'creation',
        'fuel_date',
        'is_test_record',
      ]);
      const fuelFilters: any[] = [['workflow_state', '=', 'Draft']];
      if (!includeTest) fuelFilters.push(['is_test_record', '=', 0]);

      const fuelRes = await frappeFetch<{ data?: any[] }>(
        `/api/resource/Fuel%20Log?fields=${encodeURIComponent(
          fuelFields
        )}&filters=${encodeURIComponent(
          JSON.stringify(fuelFilters)
        )}&limit_page_length=25&order_by=creation%20desc`,
        { sessionCookie }
      );

      for (const f of fuelRes.data || []) {
        const isOwner = f.owner === user.email || f.owner === user.email.split('@')[0];
        items.push({
          id: String(f.name),
          doctype: 'Fuel Log',
          title: `Fuel Dispensation ${f.name} (${f.quantity_litres || 0} Liters)`,
          submitter: f.owner || 'Operator',
          submissionDate: f.fuel_date || f.creation,
          currentState: 'Draft',
          targetState: 'Approved',
          allowedActions: ['Approve', 'Reject'],
          vehicle: f.vehicle,
          driver: f.driver,
          amount: Number(f.total_fuel_cost) || 0,
          quantity: Number(f.quantity_litres) || 0,
          urgency: 'High',
          details: {
            fuelLiters: f.quantity_litres,
            fuelRate: f.rate_per_litre,
            fuelSource: f.fuel_source,
          },
          canSelfApprove: !isOwner,
          isCurrentUserOwner: isOwner,
        });
      }
    } catch (e) {
      console.error('Error fetching pending Fuel Logs:', e);
    }
  }

  // 3. Vehicle Breakdowns (Reported or Repaired)
  if (canViewBreakdowns) {
    try {
      const bkFields = JSON.stringify([
        'name',
        'workflow_state',
        'repair_status',
        'vehicle',
        'driver',
        'breakdown_type',
        'severity',
        'breakdown_datetime',
        'description',
        'owner',
        'creation',
        'is_test_record',
      ]);
      const bkFilters: any[] = [
        ['workflow_state', 'in', ['Reported', 'Repaired']],
      ];
      if (!includeTest) bkFilters.push(['is_test_record', '=', 0]);

      const bkRes = await frappeFetch<{ data?: any[] }>(
        `/api/resource/Vehicle%20Breakdown?fields=${encodeURIComponent(
          bkFields
        )}&filters=${encodeURIComponent(
          JSON.stringify(bkFilters)
        )}&limit_page_length=25&order_by=creation%20desc`,
        { sessionCookie }
      );

      for (const b of bkRes.data || []) {
        const isOwner = b.owner === user.email || b.owner === user.email.split('@')[0];
        const state = b.workflow_state || b.repair_status || 'Reported';
        items.push({
          id: b.name,
          doctype: 'Vehicle Breakdown',
          title: `Breakdown Incident ${b.name}: ${b.breakdown_type || 'Mechanical'} (${b.severity || 'Medium'})`,
          submitter: b.owner || 'Workshop Supervisor',
          submissionDate: b.breakdown_datetime || b.creation,
          currentState: state,
          targetState: state === 'Reported' ? 'Approved' : 'Closed',
          allowedActions: state === 'Reported' ? ['Approve', 'Reject'] : ['Close Breakdown'],
          vehicle: b.vehicle,
          driver: b.driver,
          urgency: (b.severity as any) || 'High',
          details: {
            breakdownType: b.breakdown_type,
            severity: b.severity,
            description: b.description,
          },
          canSelfApprove: !isOwner,
          isCurrentUserOwner: isOwner,
        });
      }
    } catch (e) {
      console.error('Error fetching pending Breakdowns:', e);
    }
  }

  // 4. Operational Expenses (Submitted or Draft)
  if (canViewExpenses) {
    try {
      const expFields = JSON.stringify([
        'name',
        'approval_status',
        'vehicle',
        'driver',
        'expense_category',
        'amount',
        'description',
        'owner',
        'creation',
        'expense_date',
        'is_test_record',
      ]);
      const expFilters: any[] = [
        ['approval_status', 'in', ['Submitted', 'Draft']],
      ];
      if (!includeTest) expFilters.push(['is_test_record', '=', 0]);

      const expRes = await frappeFetch<{ data?: any[] }>(
        `/api/resource/Operational%20Expense?fields=${encodeURIComponent(
          expFields
        )}&filters=${encodeURIComponent(
          JSON.stringify(expFilters)
        )}&limit_page_length=25&order_by=creation%20desc`,
        { sessionCookie }
      );

      for (const x of expRes.data || []) {
        const isOwner = x.owner === user.email || x.owner === user.email.split('@')[0];
        items.push({
          id: x.name,
          doctype: 'Operational Expense',
          title: `OpEx Claim ${x.name}: ${x.expense_category} (₹${Number(x.amount || 0).toLocaleString('en-IN')})`,
          submitter: x.owner || 'Staff',
          submissionDate: x.expense_date || x.creation,
          currentState: x.approval_status || 'Submitted',
          targetState: 'Approved',
          allowedActions: ['Approve', 'Reject'],
          vehicle: x.vehicle,
          driver: x.driver,
          amount: Number(x.amount) || 0,
          urgency: Number(x.amount) > 10000 ? 'High' : 'Medium',
          details: {
            expenseCategory: x.expense_category,
            amount: x.amount,
            description: x.description,
          },
          canSelfApprove: !isOwner,
          isCurrentUserOwner: isOwner,
        });
      }
    } catch (e) {
      console.error('Error fetching pending OpEx:', e);
    }
  }

  // 5. Purchase Orders (Draft docstatus=0)
  if (canViewProcurement) {
    try {
      const poFields = JSON.stringify([
        'name',
        'supplier',
        'grand_total',
        'status',
        'docstatus',
        'owner',
        'creation',
        'transaction_date',
      ]);
      const poFilters: any[] = [['docstatus', '=', 0]];

      const poRes = await frappeFetch<{ data?: any[] }>(
        `/api/resource/Purchase%20Order?fields=${encodeURIComponent(
          poFields
        )}&filters=${encodeURIComponent(
          JSON.stringify(poFilters)
        )}&limit_page_length=25&order_by=creation%20desc`,
        { sessionCookie }
      );

      for (const p of poRes.data || []) {
        const isOwner = p.owner === user.email || p.owner === user.email.split('@')[0];
        items.push({
          id: p.name,
          doctype: 'Purchase Order',
          title: `Purchase Order ${p.name} - ${p.supplier} (₹${Number(p.grand_total || 0).toLocaleString('en-IN')})`,
          submitter: p.owner || 'Buyer',
          submissionDate: p.transaction_date || p.creation,
          currentState: 'Draft',
          targetState: 'Submitted',
          allowedActions: ['Approve', 'Reject'],
          amount: Number(p.grand_total) || 0,
          urgency: 'Medium',
          details: { supplier: p.supplier, grandTotal: p.grand_total },
          canSelfApprove: !isOwner,
          isCurrentUserOwner: isOwner,
        });
      }
    } catch (e) {
      console.error('Error fetching pending Purchase Orders:', e);
    }
  }

  // 6. Vehicle Insurance Policies (Draft)
  if (canViewInsurance) {
    try {
      const polFields = JSON.stringify([
        'name',
        'vehicle',
        'insurance_company',
        'policy_no',
        'policy_status',
        'premium_amount',
        'owner',
        'creation',
        'start_date',
        'end_date',
        'is_test_record',
      ]);
      const polFilters: any[] = [['policy_status', '=', 'Draft']];
      if (!includeTest) polFilters.push(['is_test_record', '=', 0]);

      const polRes = await frappeFetch<{ data?: any[] }>(
        `/api/resource/Vehicle%20Insurance%20Policy?fields=${encodeURIComponent(
          polFields
        )}&filters=${encodeURIComponent(
          JSON.stringify(polFilters)
        )}&limit_page_length=25&order_by=creation%20desc`,
        { sessionCookie }
      );

      for (const pl of polRes.data || []) {
        const isOwner = pl.owner === user.email || pl.owner === user.email.split('@')[0];
        items.push({
          id: pl.name,
          doctype: 'Vehicle Insurance Policy',
          title: `Policy Renewal ${pl.name} - ${pl.vehicle} (${pl.insurance_company || 'Insurer'})`,
          submitter: pl.owner || 'Compliance Officer',
          submissionDate: pl.start_date || pl.creation,
          currentState: 'Draft',
          targetState: 'Active',
          allowedActions: ['Approve', 'Reject'],
          vehicle: pl.vehicle,
          amount: Number(pl.premium_amount) || 0,
          urgency: 'Critical',
          details: {
            insuranceCompany: pl.insurance_company,
            policyNumber: pl.policy_no,
            expiryDate: pl.end_date,
          },
          canSelfApprove: !isOwner,
          isCurrentUserOwner: isOwner,
        });
      }
    } catch (e) {
      console.error('Error fetching pending Insurance Policies:', e);
    }
  }

  // Compute metrics
  const metrics: ApprovalMetrics = {
    totalPending: items.length,
    pendingTrips: items.filter((i) => i.doctype === 'Mining Trip').length,
    pendingFuel: items.filter((i) => i.doctype === 'Fuel Log').length,
    pendingBreakdowns: items.filter((i) => i.doctype === 'Vehicle Breakdown').length,
    pendingExpenses: items.filter((i) => i.doctype === 'Operational Expense').length,
    pendingPurchases: items.filter((i) => i.doctype === 'Purchase Order').length,
    pendingInsurance: items.filter((i) => i.doctype === 'Vehicle Insurance Policy').length,
  };

  return { items, metrics };
}

export async function executeApprovalAction(
  sessionCookie: string,
  user: { email: string; role: string; roles: string[] },
  payload: ApprovalActionInput
): Promise<{ success: boolean; message: string; updatedDoc?: any }> {
  const { doctype, id, action, rejectionReason, notes } = payload;

  if (!doctype || !id || !action) {
    throw new Error('Mandatory approval parameters missing: doctype, id, and action are required.');
  }

  // 1. Fetch the target document to verify ownership and state
  const endpoint = `/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(id)}`;
  const docRes = await frappeFetch<{ data?: any }>(endpoint, { sessionCookie });
  if (!docRes.data) {
    throw new Error(`Target record '${doctype}' '${id}' not found.`);
  }

  const doc = docRes.data;

  // 2. Strict Anti-Self-Approval Enforcement
  const isOwner =
    doc.owner === user.email ||
    (doc.owner && user.email && doc.owner.toLowerCase() === user.email.toLowerCase()) ||
    (doc.owner && user.email && doc.owner === user.email.split('@')[0]);

  if (isOwner && (action === 'Approve' || action === 'Submit')) {
    // If user is super-admin executing system management, check if allowed, else enforce strictly
    if (user.role !== 'Administrator' || doc.owner === 'Administrator') {
      const err: any = new Error(
        'Anti-Self-Approval Violation: You cannot approve or submit your own record. Another authorized manager must approve it.'
      );
      err.status = 403;
      throw err;
    }
  }

  // 3. Mandatory Rejection Reason
  if (action === 'Reject' || action === 'Cancel') {
    if (!rejectionReason || !rejectionReason.trim()) {
      const err: any = new Error(
        'Rejection reason is strictly mandatory when rejecting or cancelling a record.'
      );
      err.status = 400;
      throw err;
    }
  }

  // 4. Execute transition per DocType
  let updatedDoc: any = null;

  if (doctype === 'Mining Trip') {
    const wfRes = await frappeFetch<{ message?: any }>(
      '/api/method/frappe.model.workflow.apply_workflow',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc,
          action,
        }),
        sessionCookie,
      }
    );
    updatedDoc = wfRes.message || doc;
  } else if (doctype === 'Fuel Log') {
    const wfRes = await frappeFetch<{ message?: any }>(
      '/api/method/frappe.model.workflow.apply_workflow',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc,
          action,
        }),
        sessionCookie,
      }
    );
    updatedDoc = wfRes.message || doc;
  } else if (doctype === 'Vehicle Breakdown') {
    if (action === 'Approve') {
      const wfRes = await frappeFetch<{ message?: any }>(
        '/api/method/frappe.model.workflow.apply_workflow',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doc,
            action: 'Approve',
          }),
          sessionCookie,
        }
      );
      updatedDoc = wfRes.message || doc;
    } else if (action === 'Reject') {
      const putRes = await frappeFetch<{ data?: any }>(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repair_status: 'Cancelled',
          resolution_notes: rejectionReason,
        }),
        sessionCookie,
      });
      updatedDoc = putRes.data;
    } else if (action === 'Close Breakdown') {
      const wfRes = await frappeFetch<{ message?: any }>(
        '/api/method/frappe.model.workflow.apply_workflow',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            doc,
            action: 'Close Breakdown',
          }),
          sessionCookie,
        }
      );
      updatedDoc = wfRes.message || doc;
    }
  } else if (doctype === 'Operational Expense') {
    updatedDoc = await applyExpenseWorkflow(
      sessionCookie,
      id,
      action as ExpenseWorkflowAction,
      { rejectionReason }
    );
  } else if (doctype === 'Purchase Order') {
    if (action === 'Approve' || action === 'Submit') {
      const putRes = await frappeFetch<{ data?: any }>(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docstatus: 1 }),
        sessionCookie,
      });
      updatedDoc = putRes.data;
    } else if (action === 'Reject' || action === 'Cancel') {
      const putRes = await frappeFetch<{ data?: any }>(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docstatus: 2,
          remarks: rejectionReason,
        }),
        sessionCookie,
      });
      updatedDoc = putRes.data;
    }
  } else if (doctype === 'Vehicle Insurance Policy') {
    if (action === 'Approve' || action === 'Activate Policy') {
      const putRes = await frappeFetch<{ data?: any }>(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ policy_status: 'Active' }),
        sessionCookie,
      });
      updatedDoc = putRes.data;
    } else if (action === 'Reject') {
      const putRes = await frappeFetch<{ data?: any }>(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          policy_status: 'Cancelled',
          remarks: rejectionReason,
        }),
        sessionCookie,
      });
      updatedDoc = putRes.data;
    }
  }

  return {
    success: true,
    message: `${doctype} '${id}' successfully updated via action '${action}'.`,
    updatedDoc,
  };
}

export async function getAdminUsers(sessionCookie: string): Promise<UserRosterItem[]> {
  const fields = JSON.stringify([
    'name',
    'full_name',
    'email',
    'enabled',
    'user_type',
    'creation',
    'last_login',
  ]);
  const filters = JSON.stringify([
    ['enabled', '=', 1],
    ['name', '!=', 'Guest'],
  ]);

  const res = await frappeFetch<{ data?: any[] }>(
    `/api/resource/User?fields=${encodeURIComponent(
      fields
    )}&filters=${encodeURIComponent(filters)}&limit_page_length=50&order_by=creation%20desc`,
    { sessionCookie }
  );

  const rawUsers = res.data || [];
  const users: UserRosterItem[] = [];

  for (const u of rawUsers) {
    // Fetch assigned roles for this user
    let userRoles: string[] = [];
    try {
      const roleRes = await frappeFetch<{ data?: { role: string }[] }>(
        `/api/resource/Has%20Role?fields=${encodeURIComponent(
          JSON.stringify(['role'])
        )}&filters=${encodeURIComponent(JSON.stringify([['parent', '=', u.name]]))}`,
        { sessionCookie }
      );
      userRoles = (roleRes.data || []).map((r) => r.role);
    } catch {
      userRoles = [];
    }

    // Filter to relevant operational roles
    const uptowareRoles = userRoles.filter((r) =>
      [
        'Administrator',
        'System Manager',
        'Fleet Manager',
        'Dispatcher',
        'Workshop Supervisor',
        'Accountant',
        'Weighbridge Operator',
        'Store Manager',
      ].includes(r)
    );

    users.push({
      name: u.name,
      fullName: u.full_name || u.name,
      email: u.email || u.name,
      enabled: Number(u.enabled) || 1,
      roles: uptowareRoles.length > 0 ? uptowareRoles : ['Desk User'],
      userType: u.user_type || 'System User',
      creation: u.creation,
      lastLogin: u.last_login || null,
    });
  }

  return users;
}

export async function getAdminPermissions(sessionCookie: string): Promise<RolePermissionItem[]> {
  const targetDocTypes = [
    'Vehicle',
    'Driver',
    'Mine Site',
    'Mining Trip',
    'Fuel Log',
    'Vehicle Breakdown',
    'Operational Expense',
    'Spare Part Item',
    'Purchase Order',
    'Stock Entry',
    'Vehicle Insurance Policy',
    'Sales Invoice',
    'Payment Entry',
    'Journal Entry',
    'Fleet Alert Log',
    'Fleet Settings',
  ];

  const targetRoles = [
    'Administrator',
    'Fleet Manager',
    'Dispatcher',
    'Workshop Supervisor',
    'Accountant',
  ];

  // 1. Fetch DocPerm base entries
  const dpFields = JSON.stringify([
    'parent',
    'role',
    'read',
    'write',
    'create',
    'submit',
    'cancel',
    'report',
  ]);
  const dpFilters = JSON.stringify([
    ['parent', 'in', targetDocTypes],
    ['role', 'in', targetRoles],
  ]);

  const [dpRes, customRes] = await Promise.all([
    frappeFetch<{ data?: any[] }>(
      `/api/resource/DocPerm?fields=${encodeURIComponent(
        dpFields
      )}&filters=${encodeURIComponent(dpFilters)}&limit_page_length=200`,
      { sessionCookie }
    ).catch(() => ({ data: [] })),
    frappeFetch<{ data?: any[] }>(
      `/api/resource/Custom%20DocPerm?fields=${encodeURIComponent(
        dpFields
      )}&filters=${encodeURIComponent(dpFilters)}&limit_page_length=200`,
      { sessionCookie }
    ).catch(() => ({ data: [] })),
  ]);

  // Merge map: Custom DocPerm overrides standard DocPerm
  const permMap = new Map<string, RolePermissionItem>();

  for (const p of dpRes.data || []) {
    const key = `${p.parent}::${p.role}`;
    permMap.set(key, {
      doctype: p.parent,
      role: p.role,
      read: Number(p.read) || 0,
      write: Number(p.write) || 0,
      create: Number(p.create) || 0,
      submit: Number(p.submit) || 0,
      cancel: Number(p.cancel) || 0,
      report: Number(p.report ?? p.read) || 0,
    });
  }

  for (const cp of customRes.data || []) {
    const key = `${cp.parent}::${cp.role}`;
    permMap.set(key, {
      doctype: cp.parent,
      role: cp.role,
      read: Number(cp.read) || 0,
      write: Number(cp.write) || 0,
      create: Number(cp.create) || 0,
      submit: Number(cp.submit) || 0,
      cancel: Number(cp.cancel) || 0,
      report: Number(cp.report ?? cp.read) || 0,
    });
  }

  // Ensure every pair exists deterministically
  const results: RolePermissionItem[] = [];
  for (const dt of targetDocTypes) {
    for (const r of targetRoles) {
      const key = `${dt}::${r}`;
      if (permMap.has(key)) {
        results.push(permMap.get(key)!);
      } else {
        const isAdmin = r === 'Administrator';
        results.push({
          doctype: dt,
          role: r,
          read: isAdmin ? 1 : 0,
          write: isAdmin ? 1 : 0,
          create: isAdmin ? 1 : 0,
          submit: isAdmin ? 1 : 0,
          cancel: isAdmin ? 1 : 0,
          report: isAdmin ? 1 : 0,
        });
      }
    }
  }

  return results;
}

export async function getFleetSettings(sessionCookie: string): Promise<FleetOperationalSettings> {
  const endpoint = '/api/resource/Fleet%20Settings/Fleet%20Settings';
  const res = await frappeFetch<{ data?: any }>(endpoint, { sessionCookie });
  if (!res.data) {
    throw new Error('Failed to retrieve Fleet Settings document.');
  }

  const d = res.data;
  return {
    warning_window_days: Number(d.warning_window_days) || 30,
    reminder_intervals: String(d.reminder_intervals || '30, 15, 7, 0'),
    notification_recipient_role: String(d.notification_recipient_role || 'Fleet Manager'),
    min_fuel_efficiency_kml: Number(d.min_fuel_efficiency_kml) || 2.5,
    breakdown_escalation_hours: Number(d.breakdown_escalation_hours) || 24,
    repeated_breakdown_threshold: Number(d.repeated_breakdown_threshold) || 3,
    enforce_insurance_on_dispatch: Number(d.enforce_insurance_on_dispatch) ? 1 : 0,
    enforce_fitness_on_dispatch: Number(d.enforce_fitness_on_dispatch) ? 1 : 0,
    enforce_puc_on_dispatch: Number(d.enforce_puc_on_dispatch) ? 1 : 0,
    enforce_road_tax_on_dispatch: Number(d.enforce_road_tax_on_dispatch) ? 1 : 0,
    enforce_permit_on_dispatch: Number(d.enforce_permit_on_dispatch) ? 1 : 0,
    enable_fleet_notifications: Number(d.enable_fleet_notifications ?? 1) ? 1 : 0,
    enable_in_app_notifications: Number(d.enable_in_app_notifications ?? 1) ? 1 : 0,
  };
}

export async function updateFleetSettings(
  sessionCookie: string,
  settings: Partial<FleetOperationalSettings>
): Promise<FleetOperationalSettings> {
  // Validate numerical boundaries
  if (settings.warning_window_days !== undefined) {
    const w = Number(settings.warning_window_days);
    if (isNaN(w) || w < 1 || w > 365) {
      throw new Error('Warning Window Days must be an integer between 1 and 365.');
    }
  }
  if (settings.min_fuel_efficiency_kml !== undefined) {
    const f = Number(settings.min_fuel_efficiency_kml);
    if (isNaN(f) || f <= 0 || f > 20) {
      throw new Error('Minimum Fuel Efficiency Floor must be between 0.1 and 20.0 km/L.');
    }
  }
  if (settings.breakdown_escalation_hours !== undefined) {
    const h = Number(settings.breakdown_escalation_hours);
    if (isNaN(h) || h < 1 || h > 720) {
      throw new Error('Breakdown Escalation Hours must be between 1 and 720.');
    }
  }

  const endpoint = '/api/resource/Fleet%20Settings/Fleet%20Settings';
  const res = await frappeFetch<{ data?: any }>(endpoint, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
    sessionCookie,
  });

  if (!res.data) {
    throw new Error('Failed to update Fleet Settings.');
  }

  return getFleetSettings(sessionCookie);
}

export async function getSystemHealth(sessionCookie: string): Promise<SystemHealthStatus> {
  const startTime = Date.now();
  let backendStatus: 'healthy' | 'degraded' | 'down' = 'healthy';
  let backendLatencyMs = 0;
  let databaseStatus: 'healthy' | 'down' = 'healthy';
  let redisStatus: 'healthy' | 'down' = 'healthy';

  try {
    const pingRes = await fetch(`${FRAPPE_URL}/api/method/frappe.ping`, {
      headers: { Cookie: sessionCookie },
    });
    backendLatencyMs = Date.now() - startTime;
    if (!pingRes.ok) {
      backendStatus = 'degraded';
    }
  } catch {
    backendStatus = 'down';
    backendLatencyMs = 999;
  }

  return {
    backendStatus,
    backendLatencyMs,
    databaseStatus,
    redisStatus,
    frontendStatus: 'healthy',
    uptimeSeconds: Math.floor(process.uptime()),
    activeJobs: 0,
    timestamp: new Date().toISOString(),
    versions: {
      frappeFramework: 'v15.34.0',
      erpnext: 'v15.31.0',
      nextjs: '15.1.0',
    },
  };
}



// ==========================================
// PHASE 9: DRIVER & VEHICLE DOCUMENTS, HRMS, SHIFTS
// ==========================================

import type {
  DriverDocument,
  VehicleDocument,
  VehicleDriverShiftAllocation,
  EmployeeProfile,
  DocumentVerificationStatus,
} from '@/types/fleet';

export async function getDriverDocuments(
  sessionCookie: string,
  options?:
    | {
        driver?: string;
        category?: string;
        verificationStatus?: string;
        includeTest?: boolean;
        limit?: number;
      }
    | string,
  includeTestFallback = false
): Promise<DriverDocument[]> {
  const filters: any[] = [];
  let includeTest = includeTestFallback;
  let limit = 100;

  if (typeof options === 'string') {
    if (options) filters.push(['driver', '=', options]);
  } else if (options && typeof options === 'object') {
    if (options.driver) filters.push(['driver', '=', options.driver]);
    if (options.category) filters.push(['document_category', '=', options.category]);
    if (options.verificationStatus) filters.push(['verification_status', '=', options.verificationStatus]);
    if (options.includeTest) includeTest = options.includeTest;
    if (options.limit) limit = options.limit;
  }

  if (!includeTest) {
    filters.push(['is_test_record', '=', 0]);
  }

  const queryParams = new URLSearchParams({
    doctype: 'Driver Document',
    fields: JSON.stringify([
      'name', 'driver', 'driver_name', 'document_category', 'document_number',
      'issue_date', 'expiry_date', 'issuing_authority', 'file_attachment',
      'file_name', 'file_type', 'verification_status', 'verified_by',
      'verification_date', 'rejection_reason', 'remarks', 'replaced_document',
      'is_active', 'uploaded_by', 'upload_date', 'is_test_record'
    ]),
    filters: JSON.stringify(filters),
    order_by: 'creation desc',
    limit_page_length: String(limit),
  });

  const res = await callFrappeApi(
    `/api/method/frappe.client.get_list?${queryParams.toString()}`,
    sessionCookie,
    { method: 'GET' }
  );

  return (res.message || []).map((d: any) => ({
    id: d.name,
    driver: d.driver,
    driverName: d.driver_name,
    documentCategory: d.document_category,
    documentNumber: d.document_number,
    issueDate: d.issue_date,
    expiryDate: d.expiry_date,
    issuingAuthority: d.issuing_authority,
    fileAttachment: d.file_attachment,
    fileName: d.file_name,
    fileType: d.file_type,
    verificationStatus: d.verification_status,
    verifiedBy: d.verified_by,
    verificationDate: d.verification_date,
    rejectionReason: d.rejection_reason,
    remarks: d.remarks,
    replacedDocument: d.replaced_document,
    isActive: Boolean(d.is_active),
    uploadedBy: d.uploaded_by,
    uploadDate: d.upload_date,
    isTestRecord: Boolean(d.is_test_record),
  }));
}

export async function createDriverDocument(
  sessionCookie: string,
  docData: Partial<DriverDocument>,
  username?: string
): Promise<DriverDocument> {
  const payload = {
    doctype: 'Driver Document',
    driver: docData.driver,
    document_category: docData.documentCategory,
    document_number: docData.documentNumber,
    issue_date: docData.issueDate || null,
    expiry_date: docData.expiryDate || null,
    issuing_authority: docData.issuingAuthority || null,
    file_attachment: docData.fileAttachment,
    file_name: docData.fileName || null,
    file_type: docData.fileType || null,
    verification_status: docData.verificationStatus || 'Pending',
    remarks: docData.remarks || null,
    replaced_document: docData.replacedDocument || null,
    is_active: docData.isActive !== false ? 1 : 0,
    uploaded_by: username || 'Administrator',
    upload_date: new Date().toISOString().replace('T', ' ').substring(0, 19),
    is_test_record: docData.isTestRecord ? 1 : 0,
  };

  const res = await callFrappeApi('/api/method/frappe.client.insert', sessionCookie, {
    method: 'POST',
    body: JSON.stringify({ doc: payload }),
  });

  const created = res.message;
  return {
    id: created.name,
    driver: created.driver,
    driverName: created.driver_name,
    documentCategory: created.document_category,
    documentNumber: created.document_number,
    issueDate: created.issue_date,
    expiryDate: created.expiry_date,
    issuingAuthority: created.issuing_authority,
    fileAttachment: created.file_attachment,
    fileName: created.file_name,
    fileType: created.file_type,
    verificationStatus: created.verification_status,
    verifiedBy: created.verified_by,
    verificationDate: created.verification_date,
    rejectionReason: created.rejection_reason,
    remarks: created.remarks,
    replacedDocument: created.replaced_document,
    isActive: Boolean(created.is_active),
    uploadedBy: created.uploaded_by,
    uploadDate: created.upload_date,
    isTestRecord: Boolean(created.is_test_record),
  };
}

export async function updateDriverDocumentStatus(
  sessionCookie: string,
  docId: string,
  status: DocumentVerificationStatus,
  username: string,
  rejectionReason?: string
): Promise<void> {
  const values: any = {
    verification_status: status,
    verified_by: username,
    verification_date: new Date().toISOString().replace('T', ' ').substring(0, 19),
  };
  if (rejectionReason) {
    values.rejection_reason = rejectionReason;
  }

  await callFrappeApi('/api/method/frappe.client.set_value', sessionCookie, {
    method: 'POST',
    body: JSON.stringify({
      doctype: 'Driver Document',
      name: docId,
      fieldname: values,
    }),
  });
}

export async function getVehicleDocuments(
  sessionCookie: string,
  options?:
    | {
        vehicle?: string;
        category?: string;
        verificationStatus?: string;
        includeTest?: boolean;
        limit?: number;
      }
    | string,
  includeTestFallback = false
): Promise<VehicleDocument[]> {
  const filters: any[] = [];
  let includeTest = includeTestFallback;
  let limit = 100;

  if (typeof options === 'string') {
    if (options) filters.push(['vehicle', '=', options]);
  } else if (options && typeof options === 'object') {
    if (options.vehicle) filters.push(['vehicle', '=', options.vehicle]);
    if (options.category) filters.push(['document_category', '=', options.category]);
    if (options.verificationStatus) filters.push(['verification_status', '=', options.verificationStatus]);
    if (options.includeTest) includeTest = options.includeTest;
    if (options.limit) limit = options.limit;
  }

  if (!includeTest) {
    filters.push(['is_test_record', '=', 0]);
  }

  const queryParams = new URLSearchParams({
    doctype: 'Vehicle Document',
    fields: JSON.stringify([
      'name', 'vehicle', 'license_plate', 'document_category', 'document_number',
      'issue_date', 'expiry_date', 'issuing_authority', 'file_attachment',
      'file_name', 'file_type', 'verification_status', 'verified_by',
      'verification_date', 'rejection_reason', 'remarks', 'replaced_document',
      'is_active', 'uploaded_by', 'upload_date', 'is_test_record'
    ]),
    filters: JSON.stringify(filters),
    order_by: 'creation desc',
    limit_page_length: String(limit),
  });

  const res = await callFrappeApi(
    `/api/method/frappe.client.get_list?${queryParams.toString()}`,
    sessionCookie,
    { method: 'GET' }
  );

  return (res.message || []).map((d: any) => ({
    id: d.name,
    vehicle: d.vehicle,
    licensePlate: d.license_plate,
    documentCategory: d.document_category,
    documentNumber: d.document_number,
    issueDate: d.issue_date,
    expiryDate: d.expiry_date,
    issuingAuthority: d.issuing_authority,
    fileAttachment: d.file_attachment,
    fileName: d.file_name,
    fileType: d.file_type,
    verificationStatus: d.verification_status,
    verifiedBy: d.verified_by,
    verificationDate: d.verification_date,
    rejectionReason: d.rejection_reason,
    remarks: d.remarks,
    replacedDocument: d.replaced_document,
    isActive: Boolean(d.is_active),
    uploadedBy: d.uploaded_by,
    uploadDate: d.upload_date,
    isTestRecord: Boolean(d.is_test_record),
  }));
}

export async function createVehicleDocument(
  sessionCookie: string,
  docData: Partial<VehicleDocument>,
  username?: string
): Promise<VehicleDocument> {
  const payload = {
    doctype: 'Vehicle Document',
    vehicle: docData.vehicle,
    document_category: docData.documentCategory,
    document_number: docData.documentNumber,
    issue_date: docData.issueDate || null,
    expiry_date: docData.expiryDate || null,
    issuing_authority: docData.issuingAuthority || null,
    file_attachment: docData.fileAttachment,
    file_name: docData.fileName || null,
    file_type: docData.fileType || null,
    verification_status: docData.verificationStatus || 'Pending',
    remarks: docData.remarks || null,
    replaced_document: docData.replacedDocument || null,
    is_active: docData.isActive !== false ? 1 : 0,
    uploaded_by: username || 'Administrator',
    upload_date: new Date().toISOString().replace('T', ' ').substring(0, 19),
    is_test_record: docData.isTestRecord ? 1 : 0,
  };

  const res = await callFrappeApi('/api/method/frappe.client.insert', sessionCookie, {
    method: 'POST',
    body: JSON.stringify({ doc: payload }),
  });

  const created = res.message;
  return {
    id: created.name,
    vehicle: created.vehicle,
    licensePlate: created.license_plate,
    documentCategory: created.document_category,
    documentNumber: created.document_number,
    issueDate: created.issue_date,
    expiryDate: created.expiry_date,
    issuingAuthority: created.issuing_authority,
    fileAttachment: created.file_attachment,
    fileName: created.file_name,
    fileType: created.file_type,
    verificationStatus: created.verification_status,
    verifiedBy: created.verified_by,
    verificationDate: created.verification_date,
    rejectionReason: created.rejection_reason,
    remarks: created.remarks,
    replacedDocument: created.replaced_document,
    isActive: Boolean(created.is_active),
    uploadedBy: created.uploaded_by,
    uploadDate: created.upload_date,
    isTestRecord: Boolean(created.is_test_record),
  };
}

export async function updateVehicleDocumentStatus(
  sessionCookie: string,
  docId: string,
  status: DocumentVerificationStatus,
  username: string,
  rejectionReason?: string
): Promise<void> {
  const values: any = {
    verification_status: status,
    verified_by: username,
    verification_date: new Date().toISOString().replace('T', ' ').substring(0, 19),
  };
  if (rejectionReason) {
    values.rejection_reason = rejectionReason;
  }

  await callFrappeApi('/api/method/frappe.client.set_value', sessionCookie, {
    method: 'POST',
    body: JSON.stringify({
      doctype: 'Vehicle Document',
      name: docId,
      fieldname: values,
    }),
  });
}

export async function getShiftAllocations(
  sessionCookie: string,
  options: {
    vehicle?: string;
    driver?: string;
    status?: string;
    includeTest?: boolean;
    limit?: number;
  } = {}
): Promise<VehicleDriverShiftAllocation[]> {
  const filters: any[] = [];
  if (options.vehicle) filters.push(['vehicle', '=', options.vehicle]);
  if (options.driver) filters.push(['driver', '=', options.driver]);
  if (options.status) filters.push(['status', '=', options.status]);
  if (!options.includeTest) filters.push(['is_test_record', '=', 0]);

  const queryParams = new URLSearchParams({
    doctype: 'Vehicle Driver Shift Allocation',
    fields: JSON.stringify([
      'name', 'vehicle', 'license_plate', 'driver', 'driver_name',
      'shift_type', 'allocation_start', 'allocation_end', 'status',
      'is_primary', 'remarks', 'created_by_user', 'is_test_record'
    ]),
    filters: JSON.stringify(filters),
    order_by: 'allocation_start desc',
    limit_page_length: String(options.limit || 100),
  });

  const res = await callFrappeApi(
    `/api/method/frappe.client.get_list?${queryParams.toString()}`,
    sessionCookie,
    { method: 'GET' }
  );

  return (res.message || []).map((s: any) => ({
    id: s.name,
    vehicle: s.vehicle,
    licensePlate: s.license_plate,
    driver: s.driver,
    driverName: s.driver_name,
    shiftType: s.shift_type,
    allocationStart: s.allocation_start,
    allocationEnd: s.allocation_end,
    status: s.status,
    isPrimary: Boolean(s.is_primary),
    remarks: s.remarks,
    createdByUser: s.created_by_user,
    isTestRecord: Boolean(s.is_test_record),
  }));
}

export async function createShiftAllocation(
  sessionCookie: string,
  allocData: Partial<VehicleDriverShiftAllocation>,
  username?: string
): Promise<VehicleDriverShiftAllocation> {
  const payload = {
    doctype: 'Vehicle Driver Shift Allocation',
    vehicle: allocData.vehicle,
    driver: allocData.driver,
    shift_type: allocData.shiftType || 'Morning (06:00 - 14:00)',
    allocation_start: allocData.allocationStart,
    allocation_end: allocData.allocationEnd || null,
    status: allocData.status || 'Active',
    is_primary: allocData.isPrimary ? 1 : 0,
    remarks: allocData.remarks || null,
    created_by_user: username || 'Administrator',
    is_test_record: allocData.isTestRecord ? 1 : 0,
  };

  const res = await callFrappeApi('/api/method/frappe.client.insert', sessionCookie, {
    method: 'POST',
    body: JSON.stringify({ doc: payload }),
  });

  const created = res.message;
  return {
    id: created.name,
    vehicle: created.vehicle,
    licensePlate: created.license_plate,
    driver: created.driver,
    driverName: created.driver_name,
    shiftType: created.shift_type,
    allocationStart: created.allocation_start,
    allocationEnd: created.allocation_end,
    status: created.status,
    isPrimary: Boolean(created.is_primary),
    remarks: created.remarks,
    createdByUser: created.created_by_user,
    isTestRecord: Boolean(created.is_test_record),
  };
}

export async function updateShiftAllocationStatus(
  sessionCookie: string,
  allocId: string,
  status: string,
  allocationEnd?: string
): Promise<void> {
  const values: any = { status };
  if (allocationEnd) values.allocation_end = allocationEnd;

  await callFrappeApi('/api/method/frappe.client.set_value', sessionCookie, {
    method: 'POST',
    body: JSON.stringify({
      doctype: 'Vehicle Driver Shift Allocation',
      name: allocId,
      fieldname: values,
    }),
  });
}

export async function getEmployees(
  sessionCookie: string,
  options: { status?: string; limit?: number } = {}
): Promise<EmployeeProfile[]> {
  const filters: any[] = [];
  if (options.status) filters.push(['status', '=', options.status]);

  const queryParams = new URLSearchParams({
    doctype: 'Employee',
    fields: JSON.stringify([
      'name', 'employee_name', 'first_name', 'last_name', 'status',
      'gender', 'date_of_birth', 'date_of_joining', 'cell_number',
      'company_email', 'personal_email', 'department', 'designation',
      'branch', 'reports_to', 'user_id', 'image'
    ]),
    filters: JSON.stringify(filters),
    order_by: 'employee_name asc',
    limit_page_length: String(options.limit || 100),
  });

  const res = await callFrappeApi(
    `/api/method/frappe.client.get_list?${queryParams.toString()}`,
    sessionCookie,
    { method: 'GET' }
  );

  return (res.message || []).map((e: any) => ({
    id: e.name,
    employeeName: e.employee_name,
    firstName: e.first_name,
    lastName: e.last_name,
    status: e.status,
    gender: e.gender,
    dateOfBirth: e.date_of_birth,
    dateOfJoining: e.date_of_joining,
    cellNumber: e.cell_number,
    companyEmail: e.company_email,
    personalEmail: e.personal_email,
    department: e.department,
    designation: e.designation,
    branch: e.branch,
    reportsTo: e.reports_to,
    userId: e.user_id,
    image: e.image,
  }));
}

export async function createEmployee(
  sessionCookie: string,
  empData: Partial<EmployeeProfile>
): Promise<EmployeeProfile> {
  const payload = {
    doctype: 'Employee',
    first_name: empData.firstName,
    last_name: empData.lastName || null,
    status: empData.status || 'Active',
    gender: empData.gender || 'Prefer not to say',
    date_of_birth: empData.dateOfBirth || '1990-01-01',
    date_of_joining: empData.dateOfJoining || new Date().toISOString().substring(0, 10),
    cell_number: empData.cellNumber || null,
    company_email: empData.companyEmail || null,
    personal_email: empData.personalEmail || null,
    department: empData.department || null,
    designation: empData.designation || null,
    branch: empData.branch || null,
    reports_to: empData.reportsTo || null,
    user_id: empData.userId || null,
  };

  const res = await callFrappeApi('/api/method/frappe.client.insert', sessionCookie, {
    method: 'POST',
    body: JSON.stringify({ doc: payload }),
  });

  const created = res.message;
  return {
    id: created.name,
    employeeName: created.employee_name,
    firstName: created.first_name,
    lastName: created.last_name,
    status: created.status,
    gender: created.gender,
    dateOfBirth: created.date_of_birth,
    dateOfJoining: created.date_of_joining,
    cellNumber: created.cell_number,
    companyEmail: created.company_email,
    personalEmail: created.personal_email,
    department: created.department,
    designation: created.designation,
    branch: created.branch,
    reportsTo: created.reports_to,
    userId: created.user_id,
    image: created.image,
  };
}
