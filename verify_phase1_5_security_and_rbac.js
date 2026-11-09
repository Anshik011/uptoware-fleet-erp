const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');
const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';

const BASE_URL = 'http://localhost:3001';

function runDockerPython(script) {
  const cmd = `docker exec -i -w /home/frappe/frappe-bench/sites erpnext-backend-1 /home/frappe/frappe-bench/env/bin/python`;
  return execSync(cmd, { input: script, encoding: 'utf8' });
}

const CREDENTIALS = {
  fleetManager: {
    email: 'fleet.manager@uptoware.com',
    password: 'Password@123',
    role: 'Fleet Manager',
    canManageVehicles: true,
  },
  dispatcher: {
    email: 'dispatcher@uptoware.com',
    password: 'Password@123',
    role: 'Dispatcher',
    canManageVehicles: false,
  },
  workshopSupervisor: {
    email: 'workshop.supervisor@uptoware.com',
    password: 'Password@123',
    role: 'Workshop Supervisor',
    canManageVehicles: false,
  },
  accountant: {
    email: 'accountant@uptoware.com',
    password: 'Password@123',
    role: 'Accountant',
    canManageVehicles: false,
  },
  admin: {
    email: 'Administrator',
    password: 'admin',
    role: 'Administrator',
    canManageVehicles: true,
  },
};

async function loginApi(email, password) {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const cookie = res.headers.get('set-cookie');
  const json = await res.json().catch(() => ({}));
  return { status: res.status, json, cookie };
}

async function runSecurityAudit() {
  console.log('========================================================================');
  console.log('  STARTING PHASE 1.5 PRODUCTION-GRADE AUTHENTICATION & RBAC AUDIT       ');
  console.log('========================================================================\n');

  const matrix = [];

  // =========================================================================
  // TEST SUITE 1: AUTHENTICATION CORE LIFECYCLE (API)
  // =========================================================================
  console.log('>>> TEST SUITE 1: Authentication Core Lifecycle');

  // 1.1 Valid credentials login
  console.log('  1.1 Valid credentials login (Fleet Manager)...');
  const validLogin = await loginApi(CREDENTIALS.fleetManager.email, CREDENTIALS.fleetManager.password);
  const test1_1_pass =
    validLogin.status === 200 &&
    validLogin.json.success === true &&
    validLogin.json.user.email === CREDENTIALS.fleetManager.email &&
    validLogin.json.user.role === 'Fleet Manager' &&
    validLogin.cookie &&
    validLogin.cookie.includes('uptoware_sid=');
  console.log(`      Status: ${validLogin.status} | Role: ${validLogin.json.user?.role} | Pass: ${test1_1_pass}`);
  matrix.push({
    suite: 'Authentication Core',
    test: '1.1 Valid credentials login',
    criteria: 'Authenticates against Frappe, returns user profile, issues HttpOnly session cookie',
    passed: test1_1_pass,
  });

  // 1.2 Invalid credentials rejected
  console.log('  1.2 Invalid credentials rejected...');
  const invalidLogin = await loginApi(CREDENTIALS.fleetManager.email, 'WrongPassword999!');
  const test1_2_pass =
    invalidLogin.status === 401 &&
    invalidLogin.json.success === false &&
    invalidLogin.json.error.includes('Invalid');
  console.log(`      Status: ${invalidLogin.status} | Error: "${invalidLogin.json.error}" | Pass: ${test1_2_pass}`);
  matrix.push({
    suite: 'Authentication Core',
    test: '1.2 Invalid credentials rejection',
    criteria: 'Rejects incorrect password with HTTP 401, issues no session',
    passed: test1_2_pass,
  });

  // 1.3 Unauthenticated API access rejected (No Admin fallback!)
  console.log('  1.3 Unauthenticated API access (Zero Admin Fallback)...');
  const unauthDash = await fetch(`${BASE_URL}/api/dashboard`);
  const unauthVeh = await fetch(`${BASE_URL}/api/vehicles`);
  const test1_3_pass = unauthDash.status === 401 && unauthVeh.status === 401;
  console.log(`      Dashboard status: ${unauthDash.status} | Vehicles status: ${unauthVeh.status} | Pass: ${test1_3_pass}`);
  matrix.push({
    suite: 'Authentication Core',
    test: '1.3 Unauthenticated API rejection',
    criteria: 'Returns HTTP 401 when no session provided; zero fallback to Administrator',
    passed: test1_3_pass,
  });

  // 1.4 Expired / forged session cookie rejected
  console.log('  1.4 Forged session cookie rejected...');
  const forgedRes = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { Cookie: 'uptoware_sid=forged_bogus_session_token_xyz999' },
  });
  const test1_4_pass = forgedRes.status === 401;
  console.log(`      Forged session status: ${forgedRes.status} | Pass: ${test1_4_pass}`);
  matrix.push({
    suite: 'Authentication Core',
    test: '1.4 Forged/expired session rejection',
    criteria: 'Forged or non-existent token rejected by Frappe verification with HTTP 401',
    passed: test1_4_pass,
  });

  // 1.5 Logout lifecycle
  console.log('  1.5 Logout lifecycle...');
  const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: validLogin.cookie },
  });
  const checkAfterLogout = await fetch(`${BASE_URL}/api/auth/session`, {
    headers: { Cookie: logoutRes.headers.get('set-cookie') || '' },
  });
  const test1_5_pass = logoutRes.status === 200 && checkAfterLogout.status === 401;
  console.log(`      Logout status: ${logoutRes.status} | Session after logout: ${checkAfterLogout.status} | Pass: ${test1_5_pass}`);
  matrix.push({
    suite: 'Authentication Core',
    test: '1.5 Logout session invalidation',
    criteria: 'Logout endpoint expires cookie and terminates session; subsequent queries return 401',
    passed: test1_5_pass,
  });

  // =========================================================================
  // TEST SUITE 2: MULTI-ROLE AUTHORIZATION & SERVER-SIDE RBAC ENFORCEMENT
  // =========================================================================
  console.log('\n>>> TEST SUITE 2: Multi-Role Authorization & Server-Side RBAC Enforcement');

  const roleTestResults = {};

  for (const [key, creds] of Object.entries(CREDENTIALS)) {
    console.log(`\n  --- Testing Operational Role: ${creds.role} (${creds.email}) ---`);
    const login = await loginApi(creds.email, creds.password);
    if (login.status !== 200) {
      console.error(`      FAIL: Could not login as ${creds.role}`);
      roleTestResults[key] = { login: false };
      continue;
    }

    const sessionCookie = login.cookie;

    // 1. Verify /api/auth/session returns actual Frappe roles
    const sessionRes = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { Cookie: sessionCookie },
    });
    const sessionData = await sessionRes.json();
    const roleMatched = sessionData.user?.role === creds.role;

    // 2. View Dashboard (Permitted for all 5 roles)
    const dashRes = await fetch(`${BASE_URL}/api/dashboard`, {
      headers: { Cookie: sessionCookie },
    });
    const canViewDashboard = dashRes.status === 200;

    // 3. View Vehicles (Permitted for all 5 roles)
    const vehRes = await fetch(`${BASE_URL}/api/vehicles`, {
      headers: { Cookie: sessionCookie },
    });
    const canViewVehicles = vehRes.status === 200;

    // 4. Register Vehicle (POST /api/vehicles)
    // Permitted ONLY for Fleet Manager and Administrator; Forbidden (403) for Dispatcher, Workshop Sup, Accountant
    const tempPlate = `TEST-RBAC-${Math.floor(1000 + Math.random() * 9000)}`;
    const createRes = await fetch(`${BASE_URL}/api/vehicles`, {
      method: 'POST',
      headers: {
        Cookie: sessionCookie,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        licensePlate: tempPlate,
        make: 'BharatBenz',
        model: '3528C Heavy Tipper',
        payloadCapacityTons: 35,
        lastOdometer: 100,
        fuelType: 'Diesel',
      }),
    });

    const createStatus = createRes.status;
    let createAuthorizedProperly = false;

    if (creds.canManageVehicles) {
      // Expected 201 Created
      createAuthorizedProperly = createStatus === 201;
      if (createStatus === 201) {
        // Clean up created vehicle immediately via Frappe
        runDockerPython(`
import frappe
frappe.init(site='frontend')
frappe.connect()
if frappe.db.exists('Vehicle', '${tempPlate}'):
    frappe.delete_doc('Vehicle', '${tempPlate}', force=True)
    frappe.db.commit()
print('Cleaned up ${tempPlate}')
`);
      }
    } else {
      // Expected 403 Forbidden
      createAuthorizedProperly = createStatus === 403;
    }

    console.log(`      Role Verified: ${sessionData.user?.role} (${roleMatched ? 'PASS' : 'FAIL'})`);
    console.log(`      View Dashboard: Status ${dashRes.status} (${canViewDashboard ? 'PASS' : 'FAIL'})`);
    console.log(`      View Vehicles:  Status ${vehRes.status} (${canViewVehicles ? 'PASS' : 'FAIL'})`);
    console.log(`      Create Vehicle: Status ${createStatus} (Expected: ${creds.canManageVehicles ? '201' : '403'}) -> ${createAuthorizedProperly ? 'PASS' : 'FAIL'}`);

    const allRoleChecksPassed = roleMatched && canViewDashboard && canViewVehicles && createAuthorizedProperly;
    roleTestResults[key] = { passed: allRoleChecksPassed };

    matrix.push({
      suite: 'Server-Side RBAC',
      test: `2. Role Authorization: ${creds.role}`,
      criteria: creds.canManageVehicles
        ? `View dashboard (200), view vehicles (200), register vehicle (201)`
        : `View dashboard (200), view vehicles (200), register vehicle BLOCKED (403 Forbidden)`,
      passed: allRoleChecksPassed,
    });
  }

  // =========================================================================
  // TEST SUITE 3: CLIENT-SIDE TAMPERING & DIRECT BYPASS RESISTANCE
  // =========================================================================
  console.log('\n>>> TEST SUITE 3: Tamper Resistance & Direct API Bypass Defense');

  // Attempt to forge a header pretending to be Administrator while using Dispatcher's session
  const dispLogin = await loginApi(CREDENTIALS.dispatcher.email, CREDENTIALS.dispatcher.password);
  const spoofRes = await fetch(`${BASE_URL}/api/vehicles`, {
    method: 'POST',
    headers: {
      Cookie: dispLogin.cookie,
      'Content-Type': 'application/json',
      'X-User-Role': 'Administrator',
      'X-Frappe-Role': 'System Manager',
      'X-Forwarded-User': 'Administrator',
    },
    body: JSON.stringify({
      licensePlate: 'TEST-SPOOF-01',
      make: 'Tata',
      model: 'Prima',
    }),
  });
  const test3_1_pass = spoofRes.status === 403;
  console.log(`  3.1 Header Spoofing Attempt Status: ${spoofRes.status} (Expected: 403) | Pass: ${test3_1_pass}`);
  matrix.push({
    suite: 'Security Hardening',
    test: '3.1 Client Header Spoofing Resistance',
    criteria: 'Tampering with client headers (X-User-Role: Administrator) cannot bypass server authorization (403)',
    passed: test3_1_pass,
  });

  // =========================================================================
  // TEST SUITE 4: END-TO-END BROWSER AUTOMATION (PUPPETEER)
  // =========================================================================
  console.log('\n>>> TEST SUITE 4: Browser Automation (Login, Profile Popover, Role Switcher Removal, Sign Out)');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 4.1 Unauthenticated redirect to /login
  console.log('  4.1 Verifying unauthenticated browser access redirects to /login...');
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle2' });
  const redirectedUrl = page.url();
  const test4_1_pass = redirectedUrl.includes('/login');
  console.log(`      Landed URL: ${redirectedUrl} | Pass: ${test4_1_pass}`);
  matrix.push({
    suite: 'Browser Acceptance',
    test: '4.1 Unauthenticated Page Route Protection',
    criteria: 'Navigating to / unauthenticated immediately redirects to /login',
    passed: test4_1_pass,
  });

  // 4.2 Browser UI Login Form Submission with Invalid Credentials
  console.log('  4.2 Testing invalid credentials in browser form...');
  await page.type('input[type="email"]', 'fleet.manager@uptoware.com');
  await page.type('input[type="password"]', 'WrongPassword123');
  await page.click('button[type="submit"]');
  await page.waitForSelector('[data-testid="login-error-message"]', { timeout: 5000 });
  const errorMsgText = await page.$eval('[data-testid="login-error-message"]', el => el.innerText);
  const test4_2_pass = errorMsgText.includes('Authentication failed') || errorMsgText.includes('Invalid');
  console.log(`      Error Banner: "${errorMsgText}" | Pass: ${test4_2_pass}`);
  matrix.push({
    suite: 'Browser Acceptance',
    test: '4.2 Browser Invalid Credential Feedback',
    criteria: 'Form rejects bad credentials and displays accessible error banner',
    passed: test4_2_pass,
  });

  // 4.3 Browser UI Login with Valid Credentials (Fleet Manager)
  console.log('  4.3 Testing valid login in browser form...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.type('input[type="email"]', CREDENTIALS.fleetManager.email);
  await page.type('input[type="password"]', CREDENTIALS.fleetManager.password);
  
  await Promise.all([
    page.waitForResponse(res => res.url().includes('/api/auth/login') && res.status() === 200),
    page.click('button[type="submit"]'),
  ]);

  await page.waitForSelector('[data-testid="btn-user-profile"]', { timeout: 15000 });
  const afterLoginUrl = page.url();
  const test4_3_pass = afterLoginUrl === `${BASE_URL}/` || afterLoginUrl === `${BASE_URL}`;
  console.log(`      URL after login: ${afterLoginUrl} | Pass: ${test4_3_pass}`);
  await page.screenshot({ path: 'phase1_5_logged_in_dashboard.png' });
  matrix.push({
    suite: 'Browser Acceptance',
    test: '4.3 Valid Browser Authentication & Redirection',
    criteria: 'Valid login redirects operator to / and establishes authenticated session',
    passed: test4_3_pass,
  });

  // 4.4 Verify Simulated Role Switcher is REMOVED from Profile Dropdown
  console.log('  4.4 Verifying simulated role switcher is completely removed...');
  await page.waitForSelector('[data-testid="btn-user-profile"]', { timeout: 5000 });
  await page.click('[data-testid="btn-user-profile"]');
  await new Promise(r => setTimeout(r, 400));

  const profileText = await page.evaluate(() => {
    return document.querySelector('[role="menu"]')?.innerText || '';
  });

  // Should have "Assigned Frappe Roles" and "Sign Out"
  // Should NOT have "Switch Operator Role"
  const textLower = profileText.toLowerCase();
  const hasRoleSwitcher = textLower.includes('switch operator role');
  const hasAssignedRoles = textLower.includes('assigned frappe roles');
  const hasSignOut = textLower.includes('sign out');
  const test4_4_pass = !hasRoleSwitcher && hasAssignedRoles && hasSignOut;
  console.log(`      Role Switcher Removed: ${!hasRoleSwitcher} | Assigned Roles Shown: ${hasAssignedRoles} | Sign Out Present: ${hasSignOut} | Pass: ${test4_4_pass}`);
  await page.screenshot({ path: 'phase1_5_profile_popover.png' });
  matrix.push({
    suite: 'Browser Acceptance',
    test: '4.4 Simulated Role Switcher Eradication',
    criteria: 'Profile menu displays genuine Frappe assigned roles; simulated switcher is completely eradicated',
    passed: test4_4_pass,
  });

  // 4.5 Browser Sign Out Flow
  console.log('  4.5 Testing browser Sign Out action...');
  const signOutBtn = await page.$('[data-testid="btn-sign-out"]');
  if (signOutBtn) {
    await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/auth/logout') && res.status() === 200),
      signOutBtn.click(),
    ]);
  }
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });
  const afterLogoutUrl = page.url();
  const test4_5_pass = afterLogoutUrl.includes('/login');
  console.log(`      URL after Sign Out: ${afterLogoutUrl} | Pass: ${test4_5_pass}`);
  matrix.push({
    suite: 'Browser Acceptance',
    test: '4.5 End-to-End Sign Out Action',
    criteria: 'Clicking Sign Out terminates session and navigates back to /login',
    passed: test4_5_pass,
  });

  // =========================================================================
  // TEST SUITE 5: REGRESSION & DASHBOARD DATA INTEGRITY
  // =========================================================================
  console.log('\n>>> TEST SUITE 5: Regression & Consistency Across Reloads');

  // Login as Fleet Manager again for regression test
  await page.type('input[type="email"]', CREDENTIALS.fleetManager.email);
  await page.type('input[type="password"]', CREDENTIALS.fleetManager.password);
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('button[type="submit"]'),
  ]);

  await page.waitForSelector('[data-testid="kpi-card"]', { timeout: 15000 });
  await page.waitForFunction(() => {
    const card = document.querySelector('[data-testid="kpi-card"] .tracking-tight');
    return card && card.innerText && card.innerText.trim().length > 0;
  }, { timeout: 15000 });

  const kpis = await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('[data-testid="kpi-card"]'));
    return cards.map(c => ({
      title: c.querySelector('.tracking-wider')?.innerText?.trim() || '',
      value: c.querySelector('.tracking-tight')?.innerText?.trim() || '',
    }));
  });

  console.log('    Captured Dashboard KPIs:');
  kpis.forEach((k, idx) => console.log(`      Card ${idx + 1} [${k.title}]: ${k.value}`));

  const expectedMatch =
    kpis[0]?.value === '2' && // Total Vehicles
    kpis[1]?.value === '1' && // Active on Road
    kpis[2]?.value === '1' && // In Maintenance
    kpis[3]?.value === '0' && // Mining Trips
    kpis[4]?.value === '₹44,060' && // Operating Cost
    kpis[5]?.value === '₹0'; // Billed Revenue

  console.log(`    Expected values match authoritative database: ${expectedMatch}`);
  matrix.push({
    suite: 'Regression & Integrity',
    test: '5.1 Authenticated Dashboard KPI Integrity',
    criteria: 'Authoritative database values (2, 1, 1, 0, ₹44,060, ₹0) render without drift under authenticated session',
    passed: expectedMatch,
  });

  // Navigate to Vehicles page as authenticated user
  await page.goto(`${BASE_URL}/vehicles`, { waitUntil: 'networkidle2' });
  await page.waitForSelector('table', { timeout: 10000 });
  const vehicleRowsCount = await page.$$eval('tbody tr', rows => rows.length);
  const test5_2_pass = vehicleRowsCount === 2;
  console.log(`    Vehicles page rendered rows: ${vehicleRowsCount} (Expected: 2) | Pass: ${test5_2_pass}`);
  await page.screenshot({ path: 'phase1_5_vehicles_page.png' });
  matrix.push({
    suite: 'Regression & Integrity',
    test: '5.2 Authenticated Vehicles Directory View',
    criteria: 'Vehicles page loads authoritative non-test vehicles (2 units) under authenticated session',
    passed: test5_2_pass,
  });

  await browser.close();

  // =========================================================================
  // SUMMARY REPORT MATRIX
  // =========================================================================
  console.log('\n=========================================================================================================');
  console.log('                        PHASE 1.5 SECURITY & RBAC ACCEPTANCE MATRIX                              ');
  console.log('=========================================================================================================');
  let allPass = true;
  matrix.forEach(m => {
    const status = m.passed ? 'PASS [OK]' : 'FAIL [X]';
    if (!m.passed) allPass = false;
    console.log(`${status.padEnd(12)} | ${m.suite.padEnd(22)} | ${m.test.padEnd(38)} | ${m.criteria}`);
  });
  console.log('=========================================================================================================');
  console.log('OVERALL AUDIT STATUS:', allPass ? 'ALL TESTS PASSED! PRODUCTION-GRADE AUTH & RBAC VERIFIED!' : 'FAILURES DETECTED');
  console.log('=========================================================================================================\n');

  if (!allPass) process.exit(1);
}

runSecurityAudit().catch(err => {
  console.error('Security audit script failed:', err);
  process.exit(1);
});
