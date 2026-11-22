// ============================================================================
// UPTOWARE FLEET ERP - LOCAL DEMO SANDBOX STORE
// Provides isolated, persistent in-memory/file storage with exactly 1 record
// per operational module for local testing (localhost:3001) without touching
// production (fleet.uptoware.com).
// Includes both Frappe native snake_case attributes and frontend camelCase
// attributes to guarantee seamless compatibility across all portal layers.
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
  bins: any[];
  purchaseOrders: any[];
  breakdowns: any[];
  expenses: any[];
  designations: string[];
}

const DEFAULT_STORE: LocalStoreData = {
  designations: [
    'Clerk',
    'Driver',
    'Mines Supervisor',
    'Fleet Manager',
  ],
  vehicles: [
    {
      name: 'OD-35-LOCAL-001',
      id: 'OD-35-LOCAL-001',
      license_plate: 'OD-35-LOCAL-001',
      licensePlate: 'OD-35-LOCAL-001',
      make: 'Tata Motors',
      model: 'Prima 3528.K',
      status: 'Active',
      vehicle_status: 'Active',
      vehicleStatus: 'Active',
      assigned_driver: 'DRV-LOCAL-001',
      assignedDriverId: 'DRV-LOCAL-001',
      assignedDriverName: 'Payal Garanayak',
      payload_capacity_tons: 35,
      payloadCapacityTons: 35,
      last_odometer: 14250,
      lastOdometer: 14250,
      fuel_type: 'Diesel',
      fuelType: 'Diesel',
      custom_transport_type: 'Transport',
      customTransportType: 'Transport',
      custom_vehicle_type: 'Mining Tipper',
      customVehicleType: 'Mining Tipper',
      custom_mine_site: 'JBR Eastern — Talcher Site',
      mineSite: 'JBR Eastern — Talcher Site',
      end_date: '2027-11-20',
      fitness_expiry_date: '2027-10-15',
      puc_expiry_date: '2027-09-01',
      road_tax_expiry_date: '2027-12-31',
      permit_expiry_date: '2028-05-15',
      is_test_record: 0,
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
      name: 'DRV-LOCAL-001',
      id: 'DRV-LOCAL-001',
      full_name: 'Payal Garanayak',
      fullName: 'Payal Garanayak',
      status: 'Active',
      cell_number: '+91 98765 43210',
      cellNumber: '+91 98765 43210',
      license_number: 'OD-05-2022-9876543',
      licenseNumber: 'OD-05-2022-9876543',
      issuing_date: '2022-04-10',
      issuingDate: '2022-04-10',
      expiry_date: '2032-04-09',
      expiryDate: '2032-04-09',
      medical_fitness_expiry: '2027-05-15',
      medicalFitnessExpiry: '2027-05-15',
      assigned_vehicle: 'OD-35-LOCAL-001',
      assignedVehicle: 'OD-35-LOCAL-001',
      safety_score: 98,
      safetyScore: 98,
      licenseStatus: 'valid',
      employee: 'HR-EMP-LOCAL-002',
      employeeId: 'HR-EMP-LOCAL-002',
      custom_mine_site: 'JBR Eastern — Talcher Site',
      mineSite: 'JBR Eastern — Talcher Site',
      is_test_record: 0,
    },
  ],
  employees: [
    {
      name: 'HR-EMP-LOCAL-001',
      id: 'HR-EMP-LOCAL-001',
      employee_name: 'Jisu Nayak',
      employeeName: 'Jisu Nayak',
      first_name: 'Jisu',
      firstName: 'Jisu',
      last_name: 'Nayak',
      lastName: 'Nayak',
      designation: 'Clerk',
      status: 'Active',
      date_of_joining: '2026-01-10',
      dateOfJoining: '2026-01-10',
      cell_number: '+91 98765 11223',
      cellNumber: '+91 98765 11223',
      custom_daily_salary: 850,
      custom_daily_salary_rate: 850,
      dailySalary: 850,
      monthlyWageBasis: 'Daily Wage x Days Present',
      form_o_done: 'YES (Completed)',
      formOMedicalCompleted: 'YES (Completed)',
      vt_no: 'VT-TALCHER-001',
      vtCompleted: 'YES (Completed)',
      social_category: 'GENERAL',
      socialCategory: 'GENERAL',
      department: 'Mining Operations',
      custom_mine_site: 'JBR Eastern — Talcher Site',
      gender: 'Male',
    },
    {
      name: 'HR-EMP-LOCAL-002',
      id: 'HR-EMP-LOCAL-002',
      employee_name: 'Payal Garanayak',
      employeeName: 'Payal Garanayak',
      first_name: 'Payal',
      firstName: 'Payal',
      last_name: 'Garanayak',
      lastName: 'Garanayak',
      designation: 'Driver',
      status: 'Active',
      date_of_joining: '2026-02-01',
      dateOfJoining: '2026-02-01',
      cell_number: '+91 98765 43210',
      cellNumber: '+91 98765 43210',
      custom_daily_salary: 950,
      custom_daily_salary_rate: 950,
      dailySalary: 950,
      monthlyWageBasis: 'Daily Wage x Days Present',
      form_o_done: 'YES (Completed)',
      formOMedicalCompleted: 'YES (Completed)',
      vt_no: 'VT-TALCHER-002',
      vtCompleted: 'YES (Completed)',
      social_category: 'OBC',
      socialCategory: 'OBC',
      department: 'Fleet Operations',
      custom_mine_site: 'JBR Eastern — Talcher Site',
      custom_assigned_vehicle: 'OD-35-LOCAL-001',
      gender: 'Male',
    },
  ],
  mineSites: [
    {
      name: 'JBR Eastern — Talcher Site',
      id: 'JBR Eastern — Talcher Site',
      site_name: 'JBR Eastern — Talcher Site',
      siteName: 'JBR Eastern — Talcher Site',
      client: 'Mahanadi Coalfields Limited',
      status: 'Operational',
      mineral_type: 'Coal',
      mineralType: 'Coal',
      daily_target_tonnage: 2500,
      dailyTargetTonnage: 2500,
      active_loading_pits: 4,
      activeLoadingPits: 4,
      rate_per_ton: 120,
      ratePerTon: 120,
      location: 'Talcher Colliery Sector 4',
      is_test_record: 0,
    },
  ],
  leads: [
    {
      name: 'CHP',
      id: 'CHP',
      lead_name: 'CHP Siding (0-4 km)',
      leadName: 'CHP Siding (0-4 km)',
      mine_site: 'JBR Eastern — Talcher Site',
      mineSite: 'JBR Eastern — Talcher Site',
      lead_km: 4,
      leadKm: 4,
      lead_rate: 120,
      leadRate: 120,
      is_active: 1,
      isActive: true,
      description: 'Pit head to primary washery hopper siding',
    },
  ],
  trips: [
    {
      name: 'TRIP-LOCAL-001',
      id: 'TRIP-LOCAL-001',
      vehicle: 'OD-35-LOCAL-001',
      driver: 'DRV-LOCAL-001',
      driver_name: 'Payal Garanayak',
      driverName: 'Payal Garanayak',
      mine_site: 'JBR Eastern — Talcher Site',
      mineSite: 'JBR Eastern — Talcher Site',
      destination: 'CHP Siding (0-4 km)',
      material_type: 'Coal',
      materialType: 'Coal',
      trip_status: 'Approved',
      tripStatus: 'Approved',
      workflow_state: 'Approved',
      workflowState: 'Approved',
      status: 'Approved',
      net_weight_tons: 140,
      netWeightTons: 140,
      gross_revenue: 16800,
      grossRevenue: 16800,
      dispatch_date_time: '2026-11-22 09:30:00',
      dispatchDateTime: '2026-11-22 09:30:00',
      rate_per_ton: 120,
      custom_shift: 'Shift A',
      shift: 'Shift A',
      custom_trip_count: 4,
      tripCount: 4,
      custom_average_tonnage: 35.0,
      averageTonnage: 35.0,
      custom_lead: 'CHP',
      lead: 'CHP',
      custom_lead_km: 4,
      leadKm: 4,
      custom_lead_rate: 120,
      leadRate: 120,
      custom_calculated_quantity: 140.0,
      calculatedQuantity: 140.0,
      custom_calculated_amount: 16800.0,
      calculatedAmount: 16800.0,
      custom_opening_odometer: 14200,
      openingOdometer: 14200,
      custom_closing_odometer: 14250,
      closingOdometer: 14250,
      is_test_record: 0,
    },
  ],
  attendance: [
    {
      name: 'ATT-LOCAL-001',
      employee: 'HR-EMP-LOCAL-001',
      employee_name: 'Jisu Nayak',
      attendance_date: '2026-11-22',
      status: 'Present',
      attendance_status: 'Present',
      shift: 'Shift A',
      custom_shift: 'Shift A',
      mine_site: 'JBR Eastern — Talcher Site',
      daily_salary_rate: 850,
      calculated_salary_amount: 850,
    },
  ],
  fuelLogs: [
    {
      name: 'FUEL-LOCAL-001',
      id: 1,
      vehicle: 'OD-35-LOCAL-001',
      driver: 'DRV-LOCAL-001',
      mine_site: 'JBR Eastern — Talcher Site',
      mineSite: 'JBR Eastern — Talcher Site',
      fuel_date: '2026-11-22',
      date: '2026-11-22',
      quantity_litres: 150,
      fuelLiters: 150,
      cost_per_litre: 92.5,
      costPerLiter: 92.5,
      total_fuel_cost: 13875,
      totalCost: 13875,
      odometer_reading_km: 14250,
      odometerReading: 14250,
      previous_odometer_km: 14000,
      distance_travelled_km: 250,
      approval_status: 'Approved',
      approvalStatus: 'Approved',
      is_full_tank: 1,
      isFullTank: true,
      km_per_litre: 1.67,
      fuel_type: 'Diesel',
      fuelType: 'Diesel',
      fuel_source: 'Direct Bowser Refuel',
      dispensationMode: 'Direct Bowser Refuel',
      supplier: 'IOCL Commercial Fleet Depot',
      is_test_record: 0,
    },
  ],
  items: [
    {
      name: 'SP-HEAVY-DUTY-ALTE-1666',
      id: 'SP-HEAVY-DUTY-ALTE-1666',
      item_code: 'SP-HEAVY-DUTY-ALTE-1666',
      item_name: 'Heavy Duty Alternator 24V',
      itemName: 'Heavy Duty Alternator 24V',
      item_group: 'Electrical & Alternators',
      itemGroup: 'Electrical & Alternators',
      stock_uom: 'Nos',
      stockUom: 'Nos',
      standard_rate: 12500,
      standardRate: 12500,
      valuation_rate: 12500,
      valuationRate: 12500,
      is_stock_item: 1,
      reorderLevel: 2,
      reorderQty: 5,
      currentStock: 6,
      custom_part_number: 'TATA-2871A003',
      oemPartNumber: 'TATA-2871A003',
      custom_compatible_vehicle_model: 'Tata Prima 3528.K / 3530.K',
      compatibleModel: 'Tata Prima 3528.K / 3530.K',
      custom_preferred_supplier: 'Talcher Auto Spares',
      preferredSupplier: 'Talcher Auto Spares',
      custom_is_test_record: 0,
    },
  ],
  bins: [
    {
      name: 'BIN-LOCAL-001',
      item_code: 'SP-HEAVY-DUTY-ALTE-1666',
      warehouse: 'Stores - U',
      actual_qty: 6,
      reserved_qty: 0,
      ordered_qty: 2,
      projected_qty: 8,
      valuation_rate: 12500,
      stock_value: 75000,
    },
  ],
  purchaseOrders: [
    {
      name: 'PUR-ORD-LOCAL-001',
      id: 'PUR-ORD-LOCAL-001',
      supplier: 'Talcher Auto Spares',
      transaction_date: '2026-11-22',
      transactionDate: '2026-11-22',
      schedule_date: '2026-11-24',
      scheduleDate: '2026-11-24',
      grand_total: 25000,
      grandTotal: 25000,
      status: 'Submitted',
      docstatus: 1,
      custom_procurement_type: 'Spare Parts Replenishment',
      procurementType: 'Spare Parts Replenishment',
      custom_vehicle: 'OD-35-LOCAL-001',
      vehicle: 'OD-35-LOCAL-001',
      custom_mine_site: 'JBR Eastern — Talcher Site',
      mineSite: 'JBR Eastern — Talcher Site',
      custom_approved_by: 'demo.admin@uptoware.com',
      approvedBy: 'demo.admin@uptoware.com',
      custom_is_test_record: 0,
      items: [
        {
          item_code: 'SP-HEAVY-DUTY-ALTE-1666',
          itemCode: 'SP-HEAVY-DUTY-ALTE-1666',
          item_name: 'Heavy Duty Alternator 24V',
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
      name: 'BKD-LOCAL-001',
      id: 'BKD-LOCAL-001',
      naming_series: 'BKD-',
      vehicle: 'OD-35-LOCAL-001',
      driver: 'DRV-LOCAL-001',
      breakdown_datetime: '2026-11-20 14:00:00',
      breakdownDateTime: '2026-11-20 14:00:00',
      breakdown_type: 'Electrical',
      breakdownType: 'Electrical',
      severity: 'Medium',
      repair_status: 'Closed',
      status: 'Closed',
      mine_site: 'JBR Eastern — Talcher Site',
      mineSite: 'JBR Eastern — Talcher Site',
      odometer_reading: 14100,
      odometerReading: 14100,
      reported_by: 'demo.admin@uptoware.com',
      description: 'Alternator warning light triggered on dash',
      is_test_record: 0,
    },
  ],
  expenses: [
    {
      name: 'EXP-LOCAL-001',
      id: 'EXP-LOCAL-001',
      naming_series: 'EXP-',
      expense_date: '2026-11-22',
      expenseDate: '2026-11-22',
      expense_category: 'Toll & Weighbridge Tax',
      expenseCategory: 'Toll & Weighbridge Tax',
      amount: 450,
      currency: 'INR',
      company: 'Uptoware Fleet Logistics',
      approval_status: 'Approved',
      approvalStatus: 'Approved',
      accounting_status: 'Unposted',
      payment_status: 'Paid',
      paid_amount: 450,
      mode_of_payment: 'Cash',
      vehicle: 'OD-35-LOCAL-001',
      mine_site: 'JBR Eastern — Talcher Site',
      mineSite: 'JBR Eastern — Talcher Site',
      driver: 'DRV-LOCAL-001',
      supplier: 'Talcher Tollway Authority',
      is_test_record: 0,
    },
  ],
};

function getStoreFilePath(): string {
  const dataDir = path.join(process.cwd(), 'data');
  return path.join(dataDir, 'local_demo_store.json');
}

export const localStore = {
  get(): LocalStoreData {
    const filePath = getStoreFilePath();
    try {
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[LocalStore] Failed to read store file, using default store:', e);
    }
    this.save(DEFAULT_STORE);
    return JSON.parse(JSON.stringify(DEFAULT_STORE));
  },

  save(data: LocalStoreData): void {
    const filePath = getStoreFilePath();
    try {
      const dataDir = path.dirname(filePath);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('[LocalStore] Failed to write store file:', e);
    }
  },

  reset(): void {
    this.save(DEFAULT_STORE);
  },
};
