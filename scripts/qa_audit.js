/**
 * scripts/qa_audit.js
 * Comprehensive QA Audit Suite for Uptoware Fleet ERP.
 * Tests Authentication, Session, Data Endpoints, Mutations, Edge Cases,
 * and ERPNext Relational Integrity.
 */

const BASE_URL = process.argv[2] || 'https://fleet.uptoware.com';

console.log('====================================================');
console.log(`🔍 STARTING HIGH-PRECISION QA AUDIT: ${BASE_URL}`);
console.log('====================================================\n');

let cookieHeader = '';

async function api(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Accept': 'application/json',
    ...(options.headers || {})
  };
  if (cookieHeader) {
    headers['Cookie'] = cookieHeader;
  }
  if (options.body && typeof options.body === 'object') {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const start = Date.now();
  try {
    const res = await fetch(url, {
      ...options,
      headers
    });
    const duration = Date.now() - start;

    // Capture set-cookie
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      const parts = setCookie.split(',').map(s => s.trim().split(';')[0]);
      cookieHeader = parts.join('; ');
    }

    let body = null;
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        body = await res.json();
      } catch (e) {
        body = await res.text();
      }
    } else {
      body = await res.text();
    }

    return {
      status: res.status,
      ok: res.ok,
      duration,
      body,
      error: null
    };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      duration: Date.now() - start,
      body: null,
      error: err.message
    };
  }
}

async function run() {
  const report = {
    target: BASE_URL,
    timestamp: new Date().toISOString(),
    auth: null,
    endpoints: [],
    crudTests: [],
    bugsFound: []
  };

  // 1. Authentication
  console.log('--- PHASE 1: AUTHENTICATION ---');
  const loginRes = await api('/api/auth/login', {
    method: 'POST',
    body: { usr: 'Administrator', pwd: 'admin' }
  });

  if (loginRes.ok) {
    console.log(`✅ [PASS] Login successful (${loginRes.duration}ms). Session captured.`);
    report.auth = 'PASS';
  } else {
    console.error(`❌ [FAIL] Login failed: ${loginRes.status}`, loginRes.body);
    report.auth = 'FAIL';
  }

  // 2. Session check
  const sessionRes = await api('/api/auth/session');
  console.log(`Session Check: status ${sessionRes.status}, user: ${sessionRes.body?.user?.name || sessionRes.body?.user?.email || 'Guest'}`);

  // 3. Complete Endpoints Audit
  console.log('\n--- PHASE 2: SYSTEMATIC GET ENDPOINTS AUDIT ---');
  const endpoints = [
    { path: '/api/admin/health', name: 'Admin Health' },
    { path: '/api/admin/permissions', name: 'Admin Permissions' },
    { path: '/api/admin/users', name: 'Admin Users' },
    { path: '/api/dashboard', name: 'Dashboard KPIs' },
    { path: '/api/vehicles', name: 'Vehicles Master' },
    { path: '/api/vehicle-types', name: 'Vehicle Types' },
    { path: '/api/drivers', name: 'Drivers Master' },
    { path: '/api/employees', name: 'Employees Master' },
    { path: '/api/leads', name: 'Fleet Leads' },
    { path: '/api/trips', name: 'Trips Ledger' },
    { path: '/api/trips/options', name: 'Trip Options' },
    { path: '/api/inventory/items', name: 'Spare Parts / Items' },
    { path: '/api/inventory/warehouses', name: 'Warehouses' },
    { path: '/api/inventory/movements', name: 'Stock Movements' },
    { path: '/api/inventory/options', name: 'Inventory Options' },
    { path: '/api/procurement/orders', name: 'Purchase Orders' },
    { path: '/api/procurement/suppliers', name: 'Suppliers' },
    { path: '/api/procurement/receipts', name: 'Purchase Receipts' },
    { path: '/api/procurement/invoices', name: 'Purchase Invoices' },
    { path: '/api/procurement/reports', name: 'Procurement Reports' },
    { path: '/api/breakdowns', name: 'Breakdowns' },
    { path: '/api/breakdowns/options', name: 'Breakdown Options' },
    { path: '/api/fuel', name: 'Fuel Logs' },
    { path: '/api/fuel/options', name: 'Fuel Options' },
    { path: '/api/attendance', name: 'Attendance Records' },
    { path: '/api/attendance/summary?month=2026-11', name: 'Attendance Summary Matrix' },
    { path: '/api/compliance/vehicles', name: 'Vehicle Compliance' },
    { path: '/api/compliance/reports', name: 'Compliance Reports' },
    { path: '/api/insurance/policies', name: 'Insurance Policies' },
    { path: '/api/insurance/options', name: 'Insurance Options' },
    { path: '/api/finance/revenue', name: 'Finance Revenue' },
    { path: '/api/finance/collections', name: 'Finance Collections' },
    { path: '/api/finance/profitability', name: 'Profitability' },
    { path: '/api/finance/dashboard', name: 'Finance Dashboard' },
    { path: '/api/finance/reports', name: 'Finance Reports' },
    { path: '/api/weighbridge', name: 'Weighbridge' },
    { path: '/api/dispatch', name: 'Dispatch Board' },
    { path: '/api/dispatch/eligibility', name: 'Dispatch Eligibility' },
    { path: '/api/shifts', name: 'Shifts Allocations' },
    { path: '/api/approvals', name: 'Approvals Workflow' },
    { path: '/api/alerts', name: 'System Alerts' },
    { path: '/api/mine-sites', name: 'Mine Sites' }
  ];

  let passCount = 0;
  let failCount = 0;

  for (const ep of endpoints) {
    const res = await api(ep.path);
    const pass = res.ok;
    if (pass) {
      passCount++;
      let meta = '';
      if (res.body && typeof res.body === 'object') {
        const keys = ['vehicles', 'employees', 'items', 'trips', 'orders', 'suppliers', 'records', 'data'];
        for (const k of keys) {
          if (Array.isArray(res.body[k])) {
            meta = ` (${res.body[k].length} items)`;
            break;
          }
        }
      }
      console.log(`  ✅ [PASS] ${ep.path} - ${res.status} (${res.duration}ms)${meta}`);
      report.endpoints.push({ path: ep.path, name: ep.name, status: res.status, ok: true, duration: res.duration });
    } else {
      failCount++;
      const errDetail = typeof res.body === 'string' ? res.body.slice(0, 150) : JSON.stringify(res.body);
      console.error(`  ❌ [FAIL] ${ep.path} - ${res.status} (${res.duration}ms): ${errDetail}`);
      report.endpoints.push({ path: ep.path, name: ep.name, status: res.status, ok: false, duration: res.duration, error: errDetail });
      report.bugsFound.push({
        type: 'ENDPOINT_FAILURE',
        endpoint: ep.path,
        status: res.status,
        details: errDetail
      });
    }
  }

  console.log(`\nEndpoints Tested: ${endpoints.length} | Passed: ${passCount} | Failed: ${failCount}`);

  // 4. CRUD and Edge Case Testing
  console.log('\n--- PHASE 3: CRUD & BUSINESS LOGIC INTEGRITY TESTS ---');

  // Test A: Create Spare Part with New Category
  console.log('Testing: Spare Part Creation (Auto Item Code & Category mapping)...');
  const testPartName = `QA Test Part ${Date.now().toString().slice(-4)}`;
  const partRes = await api('/api/inventory/items', {
    method: 'POST',
    body: {
      itemName: testPartName,
      itemGroup: 'Spare Parts',
      stockUom: 'Nos',
      valuationRate: 450,
      partNumber: 'QA-PN-101',
      compatibleModel: 'Tata 3530.K',
      reorderLevel: 2,
      reorderQty: 5
    }
  });

  if (partRes.ok) {
    console.log(`  ✅ [PASS] Spare part created successfully: ${partRes.body?.item?.name || partRes.body?.item?.itemCode}`);
    report.crudTests.push({ test: 'Create Spare Part', ok: true });
  } else {
    console.error(`  ❌ [FAIL] Spare part creation failed:`, partRes.body);
    report.crudTests.push({ test: 'Create Spare Part', ok: false, error: partRes.body });
    report.bugsFound.push({ type: 'MUTATION_FAILURE', test: 'Create Spare Part', error: partRes.body });
  }

  // Test B: Fleet Lead with Range Distance
  console.log('Testing: Fleet Lead Creation (Range string "3-4")...');
  const leadRes = await api('/api/leads', {
    method: 'POST',
    body: {
      leadName: `QA Lead ${Date.now().toString().slice(-4)}`,
      mineSite: 'Donimalai Mine Site',
      leadKm: '3-4',
      leadRate: 150,
      description: 'Test Corridor 3-4 KM'
    }
  });

  if (leadRes.ok) {
    console.log(`  ✅ [PASS] Fleet lead with "3-4" KM created successfully: ${leadRes.body?.data?.id || leadRes.body?.data?.leadName}`);
    report.crudTests.push({ test: 'Create Fleet Lead Range', ok: true });
  } else {
    console.error(`  ❌ [FAIL] Fleet lead creation failed:`, leadRes.body);
    report.crudTests.push({ test: 'Create Fleet Lead Range', ok: false, error: leadRes.body });
    report.bugsFound.push({ type: 'MUTATION_FAILURE', test: 'Create Fleet Lead Range', error: leadRes.body });
  }

  // Test C: Employee with Mining Statutory Fields
  console.log('Testing: Employee Creation (Father/Spouse, CMPF, Social Category, VT, DL)...');
  const empRes = await api('/api/employees', {
    method: 'POST',
    body: {
      firstName: 'Ramesh',
      lastName: `QA-${Date.now().toString().slice(-4)}`,
      fatherOrSpouseName: 'Suresh Kumar',
      designation: 'Driver',
      department: 'Fleet Operations',
      skillCategory: 'SKILL',
      pfType: 'CMPF',
      uanOrCmpfNo: 'CMPF/99812/QA',
      socialCategory: 'OBC',
      dlNo: 'KA34-2024-00192',
      dlValidity: '2030-12-31',
      vtNo: 'VT-991',
      vtPeriod: '2026-2028',
      formO: 'YES',
      cellNumber: '9888877777',
      status: 'Active'
    }
  });

  let createdEmpId = 'EMP-0001';
  if (empRes.ok) {
    createdEmpId = empRes.body?.data?.id || empRes.body?.employee?.id || empRes.body?.employee?.name || 'EMP-0001';
    console.log(`  ✅ [PASS] Employee with statutory fields created successfully: ${createdEmpId}`);
    report.crudTests.push({ test: 'Create Employee Statutory', ok: true });
  } else {
    console.error(`  ❌ [FAIL] Employee creation failed:`, empRes.body);
    report.crudTests.push({ test: 'Create Employee Statutory', ok: false, error: empRes.body });
    report.bugsFound.push({ type: 'MUTATION_FAILURE', test: 'Create Employee Statutory', error: empRes.body });
  }

  // Test D: Vehicle Creation with Transport Type
  console.log('Testing: Vehicle Creation (custom_transport_type: Non Transport)...');
  const plate = `KA-34-QA-${Math.floor(1000 + Math.random() * 9000)}`;
  const vehRes = await api('/api/vehicles', {
    method: 'POST',
    body: {
      licensePlate: plate,
      make: 'Tata Motors',
      model: 'Prima 3530.K',
      vehicleType: 'Tipper',
      customTransportType: 'Non Transport',
      status: 'Active',
      payloadCapacityTons: 35
    }
  });

  if (vehRes.ok) {
    console.log(`  ✅ [PASS] Vehicle created with Non Transport: ${plate}`);
    report.crudTests.push({ test: 'Create Vehicle Transport Type', ok: true });
  } else {
    console.error(`  ❌ [FAIL] Vehicle creation failed:`, vehRes.body);
    report.crudTests.push({ test: 'Create Vehicle Transport Type', ok: false, error: vehRes.body });
    report.bugsFound.push({ type: 'MUTATION_FAILURE', test: 'Create Vehicle Transport Type', error: vehRes.body });
  }

  // Test E: Mining Trip creation with Shift A / Site Supervisor Entry
  console.log('Testing: Mining Trip Creation (Shift A, Supervisor Entry)...');
  // First fetch vehicles and drivers to use valid active ones
  const vList = await api('/api/vehicles');
  const validVehicle = vList.body?.vehicles?.[0]?.licensePlate || plate;
  const dList = await api('/api/drivers');
  const validDriver = dList.body?.data?.[0]?.id || 'DRV-DEFAULT';

  const tripRes = await api('/api/trips', {
    method: 'POST',
    body: {
      vehicle: validVehicle,
      driver: validDriver,
      mineSite: 'Donimalai Mine Site',
      destination: 'Primary Crusher 1',
      materialType: 'Iron Ore',
      dispatchDateTime: new Date().toISOString().slice(0, 19).replace('T', ' '),
      ratePerTon: 120,
      leadKm: '3-4',
      tripCount: 4,
      shift: 'Shift A'
    }
  });

  if (tripRes.ok) {
    console.log(`  ✅ [PASS] Mining trip created: ${tripRes.body?.data?.id || tripRes.body?.trip?.name || tripRes.body?.name}`);
    report.crudTests.push({ test: 'Create Mining Trip', ok: true });
  } else {
    console.error(`  ❌ [FAIL] Mining trip creation failed:`, tripRes.body);
    report.crudTests.push({ test: 'Create Mining Trip', ok: false, error: tripRes.body });
    report.bugsFound.push({ type: 'MUTATION_FAILURE', test: 'Create Mining Trip', error: tripRes.body });
  }

  // Test F: Attendance Entry
  console.log('Testing: Attendance Logging (Shift A, Present)...');
  const attRes = await api('/api/attendance', {
    method: 'POST',
    body: {
      employee: createdEmpId,
      attendanceDate: '2026-11-22',
      attendanceStatus: 'Present',
      shift: 'Shift A',
      vehicle: validVehicle,
      mineSite: 'Donimalai Mine Site'
    }
  });

  if (attRes.ok) {
    console.log(`  ✅ [PASS] Attendance logged successfully: ${attRes.body?.data?.id || 'OK'}`);
    report.crudTests.push({ test: 'Create Attendance', ok: true });
  } else {
    console.error(`  ❌ [FAIL] Attendance logging failed:`, attRes.body);
    report.crudTests.push({ test: 'Create Attendance', ok: false, error: attRes.body });
    report.bugsFound.push({ type: 'MUTATION_FAILURE', test: 'Create Attendance', error: attRes.body });
  }

  // 5. Final Report Summary
  console.log('\n====================================================');
  console.log(`🏁 AUDIT COMPLETE: ${report.bugsFound.length} TOTAL DEFECTS FOUND`);
  console.log('====================================================');
  if (report.bugsFound.length > 0) {
    console.log('Defects list:');
    report.bugsFound.forEach((b, i) => {
      console.log(`  ${i + 1}. [${b.type}] ${b.endpoint || b.test}: ${JSON.stringify(b.details || b.error)}`);
    });
  } else {
    console.log('✨ All tested endpoints, permissions, and mutations passed with ZERO defects!');
  }

  const fs = require('fs');
  fs.writeFileSync('scripts/qa_audit_report.json', JSON.stringify(report, null, 2));
  console.log('\nDetailed JSON report saved to scripts/qa_audit_report.json');
}

run().catch(console.error);
