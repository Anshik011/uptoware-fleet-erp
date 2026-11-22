// ============================================================================
// UPTOWARE FLEET ERP - LOCAL DEMO SANDBOX STORE
// Provides isolated, persistent in-memory/file storage with exactly 1 record
// per operational module for local testing (localhost:3001) without touching
// production (fleet.uptoware.com).
// ============================================================================

import fs from 'fs';
import path from 'path';

export interface LocalStoreData {
  vehicles: any[];
  drivers: any[];
  employees: any[];
  mineSites: any[];
  leads: any[];
  trips: any[];
  attendance: any[];
  fuelLogs: any[];
  items: any[];
  purchaseOrders: any[];
  breakdowns: any[];
  expenses: any[];
}

const DEFAULT_STORE: LocalStoreData = {
  vehicles: [
    {
      id: 'OD-35-LOCAL-001',
      licensePlate: 'OD-35-LOCAL-001',
      make: 'Tata Motors',
      model: 'Prima 3528.K',
      status: 'Active',
      vehicleStatus: 'Active',
      assignedDriverId: 'DRV-LOCAL-001',
      assignedDriverName: 'Payal Garanayak',
      payloadCapacityTons: 35,
      lastOdometer: 14250,
      fuelType: 'Diesel',
      customTransportType: 'Transport',
      customVehicleType: 'Mining Tipper',
      statutory: {
        overall: 'valid',
        insurance: { title: 'Insurance', expiryDate: '2027-11-20', status: 'valid', daysRemaining: 365 },
        fitness: { title: 'Fitness', expiryDate: '2027-10-15', status: 'valid', daysRemaining: 320 },
        puc: { title: 'PUC', expiryDate: '2027-09-01', status: 'valid', daysRemaining: 280 },
        roadTax: { title: 'Road Tax', expiryDate: '2027-12-31', status: 'valid', daysRemaining: 400 },
        permit: { title: 'Permit', expiryDate: '2028-05-15', status: 'valid', daysRemaining: 540 },
      },
    },
  ],
  drivers: [
    {
      id: 'DRV-LOCAL-001',
      name: 'DRV-LOCAL-001',
      fullName: 'Payal Garanayak',
      status: 'Active',
      cellNumber: '+91 98765 43210',
      licenseNumber: 'OD-05-2022-9876543',
      issuingDate: '2022-04-10',
      expiryDate: '2032-04-09',
      medicalFitnessExpiry: '2027-05-15',
      assignedVehicle: 'OD-35-LOCAL-001',
      safetyScore: 98,
      licenseStatus: 'valid',
    },
  ],
  employees: [
    {
      id: 'HR-EMP-LOCAL-001',
      employeeName: 'Jisu Nayak',
      firstName: 'Jisu',
      lastName: 'Nayak',
      designation: 'Clerk',
      status: 'Active',
      dateOfJoining: '2026-01-10',
      cellNumber: '+91 98765 11223',
      dailySalary: 850,
      monthlyWageBasis: 'Daily Wage x Days Present',
      formOMedicalCompleted: 'YES (Completed)',
      vtCompleted: 'YES (Completed)',
      socialCategory: 'GENERAL',
      department: 'Mining Operations',
    },
    {
      id: 'HR-EMP-LOCAL-002',
      employeeName: 'Payal Garanayak',
      firstName: 'Payal',
      lastName: 'Garanayak',
      designation: 'Driver',
      status: 'Active',
      dateOfJoining: '2026-02-01',
      cellNumber: '+91 98765 43210',
      dailySalary: 950,
      monthlyWageBasis: 'Daily Wage x Days Present',
      formOMedicalCompleted: 'YES (Completed)',
      vtCompleted: 'YES (Completed)',
      socialCategory: 'OBC',
      department: 'Fleet Operations',
    },
  ],
  mineSites: [
    {
      id: 'JBR Eastern — Talcher Site',
      siteName: 'JBR Eastern — Talcher Site',
      client: 'Mahanadi Coalfields Limited',
      status: 'Operational',
      mineralType: 'Coal',
      dailyTargetTonnage: 2500,
      activeLoadingPits: 4,
      ratePerTon: 120,
      location: 'Talcher Colliery Sector 4',
    },
  ],
  leads: [
    {
      id: 'CHP',
      leadName: 'CHP Siding (0-4 km)',
      mineSite: 'JBR Eastern — Talcher Site',
      leadKm: 4,
      leadRate: 120,
      isActive: true,
      description: 'Pit head to primary washery hopper siding',
    },
  ],
  trips: [
    {
      id: 'TRIP-LOCAL-001',
      vehicle: 'OD-35-LOCAL-001',
      driver: 'DRV-LOCAL-001',
      driverName: 'Payal Garanayak',
      mineSite: 'JBR Eastern — Talcher Site',
      destination: 'CHP Siding (0-4 km)',
      materialType: 'Coal',
      tripStatus: 'Approved',
      workflowState: 'Approved',
      status: 'Approved',
      netWeightTons: 140,
      grossRevenue: 16800,
      dispatchDateTime: '2026-11-22 09:30:00',
      shift: 'Shift A',
      tripCount: 4,
      averageTonnage: 35.0,
      lead: 'CHP',
      leadKm: 4,
      leadRate: 120,
      calculatedQuantity: 140.0,
      calculatedAmount: 16800.0,
      openingOdometer: 14200,
      closingOdometer: 14250,
    },
  ],
  attendance: [
    {
      name: 'ATT-LOCAL-001',
      employee: 'HR-EMP-LOCAL-001',
      employee_name: 'Jisu Nayak',
      attendance_date: '2026-11-22',
      attendance_status: 'Present',
      shift: 'Shift A',
      mine_site: 'JBR Eastern — Talcher Site',
      daily_salary_rate: 850,
      calculated_salary_amount: 850,
    },
  ],
  fuelLogs: [
    {
      id: 1,
      vehicle: 'OD-35-LOCAL-001',
      driver: 'DRV-LOCAL-001',
      mineSite: 'JBR Eastern — Talcher Site',
      date: '2026-11-22',
      fuelLiters: 150,
      costPerLiter: 92.5,
      totalCost: 13875,
      odometerReading: 14250,
      approvalStatus: 'Approved',
      isFullTank: true,
      fuelType: 'Diesel',
      dispensationMode: 'Direct Bowser Refuel',
      supplier: 'IOCL Commercial Fleet Depot',
    },
  ],
  items: [
    {
      id: 'SP-HEAVY-DUTY-ALTE-1666',
      name: 'SP-HEAVY-DUTY-ALTE-1666',
      itemName: 'Heavy Duty Alternator 24V',
      itemGroup: 'Electrical & Alternators',
      stockUom: 'Nos',
      standardRate: 12500,
      valuationRate: 12500,
      reorderLevel: 2,
      reorderQty: 5,
      currentStock: 6,
      oemPartNumber: 'TATA-2871A003',
      compatibleModel: 'Tata Prima 3528.K / 3530.K',
      preferredSupplier: 'Talcher Auto Spares',
    },
  ],
  purchaseOrders: [
    {
      id: 'PUR-ORD-LOCAL-001',
      name: 'PUR-ORD-LOCAL-001',
      supplier: 'Talcher Auto Spares',
      transactionDate: '2026-11-22',
      scheduleDate: '2026-11-24',
      grandTotal: 25000,
      status: 'Submitted',
      docstatus: 1,
      customVehicle: 'OD-35-LOCAL-001',
      items: [
        {
          itemCode: 'SP-HEAVY-DUTY-ALTE-1666',
          itemName: 'Heavy Duty Alternator 24V',
          qty: 2,
          rate: 12500,
          amount: 25000,
        },
      ],
    },
  ],
  breakdowns: [
    {
      id: 'BKD-LOCAL-001',
      vehicle: 'OD-35-LOCAL-001',
      breakdownDateTime: '2026-11-20 14:00:00',
      breakdownType: 'Electrical',
      status: 'Repaired',
      mineSite: 'JBR Eastern — Talcher Site',
      description: 'Alternator voltage regulator failure on pit climb',
      actionTaken: 'Replaced alternator assembly from on-site stock',
    },
  ],
  expenses: [
    {
      id: 'EXP-LOCAL-001',
      vehicle: 'OD-35-LOCAL-001',
      expenseType: 'Toll & Mining RTO Pass',
      amount: 1200,
      expenseDate: '2026-11-22',
      status: 'Approved',
      modeOfPayment: 'Cash',
      supplier: 'Talcher Mining Entry Booth',
    },
  ],
};

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'local_demo_store.json');

function ensureDataFile(): LocalStoreData {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_STORE, null, 2), 'utf-8');
      return DEFAULT_STORE;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return DEFAULT_STORE;
  }
}

function saveDataFile(data: LocalStoreData) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save local demo store:', err);
  }
}

export const localStore = {
  get: ensureDataFile,
  save: saveDataFile,
  reset: () => {
    saveDataFile(DEFAULT_STORE);
    return DEFAULT_STORE;
  },
};
