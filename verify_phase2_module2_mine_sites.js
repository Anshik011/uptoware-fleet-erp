const http = require('http');
const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:3001';
const FRAPPE_URL = 'http://localhost:8080';

async function request(options, body = null) {
  return new Promise((resolve, reject) => {
    const opts = {
      ...options,
      headers: {
        Connection: 'close',
        ...(options.headers || {}),
      },
    };
    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (e) {
          json = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: json,
        });
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function login(email, password) {
  const res = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    },
    { email, password }
  );

  let sid = null;
  const setCookie = res.headers['set-cookie'];
  if (setCookie) {
    for (const c of setCookie) {
      if (c.includes('uptoware_sid=')) {
        const match = c.match(/uptoware_sid=([^;]+)/);
        if (match) sid = match[1];
      }
    }
  }

  return { status: res.status, sid, user: res.data?.user };
}

function followRedirects(url, headers = {}) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const options = {
      hostname: u.hostname,
      port: u.port || 80,
      path: u.pathname + u.search,
      method: 'GET',
      headers,
    };
    http.get(options, (res) => {
      const isRedirect = [301, 302, 303, 307, 308].includes(res.statusCode);
      if (isRedirect && res.headers.location) {
        let nextUrl = res.headers.location;
        if (nextUrl.startsWith('/')) {
          nextUrl = `${u.protocol}//${u.host}${nextUrl}`;
        }
        resolve(
          followRedirects(nextUrl, headers).then((chain) => ({
            chain: [{ url, status: res.statusCode, location: res.headers.location }, ...chain.chain],
            finalStatus: chain.finalStatus,
            finalUrl: chain.finalUrl,
          }))
        );
      } else {
        let body = '';
        res.on('data', (c) => (body += c));
        res.on('end', () =>
          resolve({
            chain: [{ url, status: res.statusCode }],
            finalStatus: res.statusCode,
            finalUrl: url,
            bodyLength: body.length,
          })
        );
      }
    });
  });
}

async function runTests() {
  console.log('===============================================================');
  console.log('  UPTOWARE FLEET MANAGEMENT — PHASE 2 MODULE 2 ACCEPTANCE     ');
  console.log('           FINAL AUDIT: ALL 4 ITEMS + FULL REGRESSION         ');
  console.log('===============================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(desc, condition, details = '') {
    if (condition) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc} — ${details}`);
      failed++;
    }
  }

  // 1. Authenticate All 5 Roles
  console.log('\n--- 1. Authenticating Operational Roles ---');
  const accounts = {
    fleetManager: await login('fleet.manager@uptoware.com', 'Password@123'),
    dispatcher: await login('dispatcher@uptoware.com', 'Password@123'),
    workshopSupervisor: await login('workshop.supervisor@uptoware.com', 'Password@123'),
    accountant: await login('accountant@uptoware.com', 'Password@123'),
    admin: await login('Administrator', 'admin'),
  };

  assert('Fleet Manager logged in', accounts.fleetManager.status === 200 && accounts.fleetManager.sid);
  assert('Dispatcher logged in', accounts.dispatcher.status === 200 && accounts.dispatcher.sid);
  assert('Workshop Supervisor logged in', accounts.workshopSupervisor.status === 200 && accounts.workshopSupervisor.sid);
  assert('Accountant logged in', accounts.accountant.status === 200 && accounts.accountant.sid);
  assert('Administrator logged in', accounts.admin.status === 200 && accounts.admin.sid);

  // =========================================================================
  // ITEM 1: CUSTOMER PERMISSIONS AUDIT
  // =========================================================================
  console.log('\n--- ITEM 1: Customer Permissions Audit ---');
  // Check tabCustom DocPerm in MariaDB
  const permCheckOutput = execSync(
    `docker exec erpnext-backend-1 bench --site frontend execute frappe.db.get_list --kwargs "{'doctype': 'Custom DocPerm', 'filters': [['parent', '=', 'Customer']], 'fields': ['role', 'read', 'write', 'create', 'delete']}"`
  ).toString();
  const perms = JSON.parse(permCheckOutput);

  const fmPerm = perms.find((p) => p.role === 'Fleet Manager');
  const dispPerm = perms.find((p) => p.role === 'Dispatcher');
  assert(
    'Fleet Manager Custom DocPerm on Customer is strictly read-only',
    fmPerm && fmPerm.read === 1 && fmPerm.write === 0 && fmPerm.create === 0 && fmPerm.delete === 0,
    JSON.stringify(fmPerm)
  );
  assert(
    'Dispatcher Custom DocPerm on Customer is strictly read-only',
    dispPerm && dispPerm.read === 1 && dispPerm.write === 0 && dispPerm.create === 0 && dispPerm.delete === 0,
    JSON.stringify(dispPerm)
  );

  // Verify all standard permissions remain intact
  const standardRoles = ['Accounts User', 'Accounts Manager', 'Stock User', 'Stock Manager', 'Sales User', 'Sales Manager', 'Sales Master Manager'];
  const allStandardPresent = standardRoles.every((r) => perms.some((p) => p.role === r && p.read === 1));
  assert('All existing standard Customer permissions remain intact', allStandardPresent);

  // Test access through API (Fleet Manager)
  const fmCustGet = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/resource/Customer?fields=' + encodeURIComponent(JSON.stringify(['name', 'customer_name'])),
    method: 'GET',
    headers: { Cookie: `sid=${accounts.fleetManager.sid}` },
  });
  assert('Fleet Manager can GET /api/resource/Customer (200 OK)', fmCustGet.status === 200);

  const fmCustPost = await request(
    {
      hostname: 'localhost',
      port: 8080,
      path: '/api/resource/Customer',
      method: 'POST',
      headers: { Cookie: `sid=${accounts.fleetManager.sid}`, 'Content-Type': 'application/json' },
    },
    { customer_name: 'Unauthorized FM Customer' }
  );
  assert('Fleet Manager CANNOT POST /api/resource/Customer (403 Forbidden)', fmCustPost.status === 403);

  const fmCustPut = await request(
    {
      hostname: 'localhost',
      port: 8080,
      path: '/api/resource/Customer/B8-Cust-141127',
      method: 'PUT',
      headers: { Cookie: `sid=${accounts.fleetManager.sid}`, 'Content-Type': 'application/json' },
    },
    { customer_name: 'Modified Customer Name' }
  );
  assert('Fleet Manager CANNOT PUT /api/resource/Customer (403 Forbidden)', fmCustPut.status === 403);

  const fmCustDel = await request({
    hostname: 'localhost',
    port: 8080,
    path: '/api/resource/Customer/B8-Cust-141127',
    method: 'DELETE',
    headers: { Cookie: `sid=${accounts.fleetManager.sid}` },
  });
  assert('Fleet Manager CANNOT DELETE /api/resource/Customer (403 Forbidden)', fmCustDel.status === 403);

  // Test access through API (Dispatcher)
  const dispCustPost = await request(
    {
      hostname: 'localhost',
      port: 8080,
      path: '/api/resource/Customer',
      method: 'POST',
      headers: { Cookie: `sid=${accounts.dispatcher.sid}`, 'Content-Type': 'application/json' },
    },
    { customer_name: 'Unauthorized Dispatcher Customer' }
  );
  assert('Dispatcher CANNOT POST /api/resource/Customer (403 Forbidden)', dispCustPost.status === 403);

  // =========================================================================
  // ITEM 2: TEST CUSTOMER QUARANTINE AUDIT
  // =========================================================================
  console.log('\n--- ITEM 2: Test Customer Quarantine Audit ---');
  // 1. Verify test customer status in MariaDB
  const nmdcCheck = execSync(
    `docker exec erpnext-backend-1 bench --site frontend execute frappe.db.get_value --args "['Customer', 'NMDC Mining Corp (TEST)', 'custom_is_test_record']"`
  ).toString().trim();
  assert('NMDC Mining Corp (TEST) has custom_is_test_record = 1', nmdcCheck === '1');

  // 2. Query operational customer dropdown (default)
  const opCustRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/mine-sites/customers',
    method: 'GET',
    headers: { Cookie: `uptoware_sid=${accounts.fleetManager.sid}` },
  });
  assert('Operational /api/mine-sites/customers returns 200 OK', opCustRes.status === 200 && opCustRes.data.success);
  const opCustNames = (opCustRes.data.data || []).map((c) => c.customerName);
  assert(
    'Test customer "NMDC Mining Corp (TEST)" is strictly quarantined from operational dropdown',
    !opCustNames.includes('NMDC Mining Corp (TEST)'),
    `Returned: ${JSON.stringify(opCustNames)}`
  );
  assert(
    'Genuine customer "B8-Cust-141127" is accessible in operational dropdown',
    opCustNames.includes('B8-Cust-141127'),
    `Returned: ${JSON.stringify(opCustNames)}`
  );

  // 3. Query with include_test=true (Authorized Administrator session required per Phase 5 security policy)
  const testCustRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/mine-sites/customers?include_test=true',
    method: 'GET',
    headers: { Cookie: `uptoware_sid=${accounts.admin.sid}` },
  });
  const testCustNames = (testCustRes.data.data || []).map((c) => c.customerName);
  assert(
    'Customer endpoint with include_test=true returns test customer',
    testCustNames.includes('NMDC Mining Corp (TEST)')
  );

  // 4. Attempt to associate test customer with an operational Mine Site (POST)
  const linkTestPost = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/mine-sites',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `uptoware_sid=${accounts.fleetManager.sid}`,
      },
    },
    {
      siteName: 'Illegal Test Association Pit',
      client: 'NMDC Mining Corp (TEST)',
    }
  );
  assert(
    'API blocks linking test customer to operational mine site on POST (400 Bad Request)',
    linkTestPost.status === 400 && linkTestPost.data.error.includes('Test customers cannot be associated')
  );

  // 5. Attempt to associate test customer with an operational Mine Site (PATCH)
  const linkTestPatch = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/mine-sites/Kudremukh%20North%20Pit',
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `uptoware_sid=${accounts.fleetManager.sid}`,
      },
    },
    {
      client: 'NMDC Mining Corp (TEST)',
    }
  );
  assert(
    'API blocks linking test customer to operational mine site on PATCH (400 Bad Request)',
    linkTestPatch.status === 400 && linkTestPatch.data.error.includes('Test customers cannot be associated')
  );

  // =========================================================================
  // ITEM 3: ERPNEXT DESK REGRESSION AUDIT
  // =========================================================================
  console.log('\n--- ITEM 3: ERPNext Desk Regression Audit ---');
  const deskRedirectTrace = await followRedirects('http://localhost:8080/app');
  assert(
    'Initial GET /app produces HTTP 301 redirecting to /desk',
    deskRedirectTrace.chain[0]?.status === 301 && deskRedirectTrace.chain[0]?.location === '/desk'
  );
  assert(
    'Unauthenticated redirect chain terminates at /login with HTTP 200',
    deskRedirectTrace.finalStatus === 200 && deskRedirectTrace.finalUrl.includes('/login')
  );

  // Authenticated Desk Access with Administrator Session
  const deskAuthTrace = await followRedirects('http://localhost:8080/desk', {
    Cookie: `sid=${accounts.admin.sid}`,
  });
  assert(
    'Authenticated /desk returns HTTP 200 with full ERPNext Desk application',
    deskAuthTrace.finalStatus === 200 && deskAuthTrace.bodyLength > 100000
  );

  // =========================================================================
  // ITEM 4: ZERO HARDCODED DATA SOURCE AUDIT
  // =========================================================================
  console.log('\n--- ITEM 4: Zero Hardcoded Data Source Audit ---');
  const filesToCheck = [
    'frontend/src/app/mine-sites/page.tsx',
    'frontend/src/components/mine-sites/MineSiteTable.tsx',
    'frontend/src/components/mine-sites/MineSiteDrawer.tsx',
    'frontend/src/components/mine-sites/AddMineSiteModal.tsx',
    'frontend/src/components/mine-sites/EditMineSiteModal.tsx',
    'frontend/src/app/api/mine-sites/route.ts',
    'frontend/src/app/api/mine-sites/[id]/route.ts',
    'frontend/src/app/api/mine-sites/customers/route.ts',
    'frontend/src/lib/frappe.ts',
    'frontend/src/types/fleet.ts',
  ];

  let foundMockPatterns = false;
  const mockRegex = /(const|let|var)\s+\w*(mock|dummy|fake|sample|stub)\w*\s*=/i;

  for (const f of filesToCheck) {
    const fullPath = path.join(__dirname, f);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (mockRegex.test(content)) {
        foundMockPatterns = true;
        console.error(`  Mock pattern found in ${f}`);
      }
    }
  }
  assert('Zero mock arrays or fake data structures found across all Mine Site code', !foundMockPatterns);

  // Verify dynamic calculations in page.tsx
  const pageContent = fs.readFileSync(path.join(__dirname, 'frontend/src/app/mine-sites/page.tsx'), 'utf8');
  assert('KPI totals calculated strictly dynamically from live mineSites array', pageContent.includes('mineSites.length') && pageContent.includes('mineSites.filter'));

  // =========================================================================
  // STANDARD SUITE: RBAC, CRUD, VIEWPORTS & SYSTEM REGRESSIONS
  // =========================================================================
  console.log('\n--- Standard Verification: RBAC, CRUD, Viewports ---');

  // Unauth Protection
  const unauthList = await request({ hostname: 'localhost', port: 3001, path: '/api/mine-sites', method: 'GET' });
  assert('Unauthenticated GET /api/mine-sites returns 401', unauthList.status === 401);

  // All roles view
  for (const [roleName, acc] of Object.entries(accounts)) {
    const res = await request({
      hostname: 'localhost',
      port: 3001,
      path: '/api/mine-sites',
      method: 'GET',
      headers: { Cookie: `uptoware_sid=${acc.sid}` },
    });
    assert(`${roleName} can view mine sites (200 OK)`, res.status === 200 && res.data.success);
  }

  // Deletion Prohibition
  const deleteRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/mine-sites/Kudremukh%20North%20Pit',
    method: 'DELETE',
    headers: { Cookie: `uptoware_sid=${accounts.fleetManager.sid}` },
  });
  assert('Operational mine site DELETE is prohibited (403 Forbidden)', deleteRes.status === 403);

  // Validation Checks
  const invalidCases = [
    { name: 'Missing siteName', payload: {}, expectedStatus: 400 },
    { name: 'Too short siteName', payload: { siteName: 'A' }, expectedStatus: 400 },
    { name: 'Invalid status', payload: { siteName: 'Valid Pit', status: 'Unknown' }, expectedStatus: 400 },
    { name: 'Invalid mineralType', payload: { siteName: 'Valid Pit', mineralType: 'Diamond' }, expectedStatus: 400 },
    { name: 'Negative dailyTargetTonnage', payload: { siteName: 'Valid Pit', dailyTargetTonnage: -50 }, expectedStatus: 400 },
    { name: 'Zero/Negative activeLoadingPits', payload: { siteName: 'Valid Pit', activeLoadingPits: 0 }, expectedStatus: 400 },
    { name: 'Negative ratePerTon', payload: { siteName: 'Valid Pit', ratePerTon: -10 }, expectedStatus: 400 },
  ];
  for (const c of invalidCases) {
    const res = await request(
      {
        hostname: 'localhost',
        port: 3001,
        path: '/api/mine-sites',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `uptoware_sid=${accounts.fleetManager.sid}`,
        },
      },
      c.payload
    );
    assert(`Validation rejects ${c.name} with HTTP ${c.expectedStatus}`, res.status === c.expectedStatus);
  }

  // Full CRUD Lifecycle
  const testSiteName = `TEST-PIT-AUDIT-${Date.now()}`;
  const createRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/mine-sites',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `uptoware_sid=${accounts.fleetManager.sid}`,
      },
    },
    {
      siteName: testSiteName,
      status: 'Operational',
      mineralType: 'Iron Ore',
      dailyTargetTonnage: 1500,
      activeLoadingPits: 2,
      ratePerTon: 320,
      location: 'Audit Verification Sector 7',
      client: 'B8-Cust-141127',
    }
  );
  assert('Fleet Manager can create a mine site with genuine customer (201 Created)', createRes.status === 201 && createRes.data.success);
  const siteId = createRes.data?.data?.id || testSiteName;

  // Duplicate Check
  const dupRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: '/api/mine-sites',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `uptoware_sid=${accounts.fleetManager.sid}`,
      },
    },
    { siteName: testSiteName }
  );
  assert('Duplicate site name rejected with HTTP 409 Conflict', dupRes.status === 409);

  // Read Details
  const detailRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: `/api/mine-sites/${encodeURIComponent(siteId)}`,
    method: 'GET',
    headers: { Cookie: `uptoware_sid=${accounts.fleetManager.sid}` },
  });
  assert('Read mine site details returns 200 OK', detailRes.status === 200 && detailRes.data.success);
  assert('Details match created data', detailRes.data.data.site.dailyTargetTonnage === 1500);

  // Update
  const updateRes = await request(
    {
      hostname: 'localhost',
      port: 3001,
      path: `/api/mine-sites/${encodeURIComponent(siteId)}`,
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `uptoware_sid=${accounts.fleetManager.sid}`,
      },
    },
    {
      dailyTargetTonnage: 2200,
      activeLoadingPits: 3,
      ratePerTon: 350,
      status: 'Inactive',
    }
  );
  assert('Update mine site returns 200 OK', updateRes.status === 200 && updateRes.data.success);

  // Purge test record
  try {
    execSync(
      `docker exec erpnext-backend-1 bench --site frontend execute frappe.delete_doc --args "['Mine Site', '${siteId}']" --kwargs "{'force': True}"`
    );
    console.log(`  [CLEANUP] Purged temporary test site '${siteId}' from MariaDB.`);
  } catch (err) {
    console.warn(`  [CLEANUP WARN] ${err.message}`);
  }

  // Filtering & Search
  const kudremukhRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/mine-sites?q=kudremukh',
    method: 'GET',
    headers: { Cookie: `uptoware_sid=${accounts.fleetManager.sid}` },
  });
  assert('Search q=kudremukh finds Kudremukh North Pit', kudremukhRes.status === 200 && kudremukhRes.data.count >= 1);

  // Puppeteer Multi-Viewport Rendering
  console.log('\n--- Multi-Viewport Rendering & UI Interactions ---');
  const viewports = [
    { name: 'Desktop FHD (1920x1080)', width: 1920, height: 1080 },
    { name: 'Laptop Standard (1366x768)', width: 1366, height: 768 },
    { name: 'Tablet Landscape (1024x768)', width: 1024, height: 768 },
    { name: 'Tablet Portrait (768x1024)', width: 768, height: 1024 },
    { name: 'Mobile Phone (390x844)', width: 390, height: 844 },
  ];

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setCookie({
    name: 'uptoware_sid',
    value: accounts.fleetManager.sid,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
  });

  for (const vp of viewports) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto(`${APP_URL}/mine-sites`, { waitUntil: 'networkidle2' });
    await page.waitForSelector('[data-testid="table-mine-sites"]', { timeout: 10000 });

    const hasHorizontalOverflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth > doc.clientWidth + 2;
    });
    assert(`Zero horizontal page overflow at ${vp.name}`, !hasHorizontalOverflow);

    const elementsPresent = await page.evaluate(() => ({
      table: Boolean(document.querySelector('[data-testid="table-mine-sites"]')),
      totalSites: Boolean(document.querySelector('[data-testid="metric-total-sites"]')),
      operationalSites: Boolean(document.querySelector('[data-testid="metric-operational-sites"]')),
      targetCapacity: Boolean(document.querySelector('[data-testid="metric-target-capacity"]')),
      activePits: Boolean(document.querySelector('[data-testid="metric-active-pits"]')),
    }));
    assert(`All key components mounted at ${vp.name}`, Object.values(elementsPresent).every(Boolean));
  }

  // Modal test
  await page.setViewport({ width: 1920, height: 1080 });
  await page.goto(`${APP_URL}/mine-sites`, { waitUntil: 'networkidle2' });
  const addBtn = await page.$('[data-testid="btn-register-mine-site-header"]');
  assert('Header "Register Mine Site" button visible for Fleet Manager', Boolean(addBtn));

  if (addBtn) {
    await addBtn.click();
    await page.waitForSelector('[data-testid="input-site-name"]', { visible: true });
    assert('Add Mine Site Modal opens upon click', true);

    await page.waitForFunction(() => {
      const select = document.querySelector('[data-testid="select-client"]');
      return select && select.options.length >= 2;
    }, { timeout: 5000 });

    const customerOptions = await page.evaluate(() => {
      const select = document.querySelector('[data-testid="select-client"]');
      return Array.from(select ? select.options : []).map((o) => o.text);
    });
    assert(
      'Client dropdown in modal contains genuine customer and excludes test customer',
      customerOptions.includes('B8-Cust-141127') && !customerOptions.includes('NMDC Mining Corp (TEST)'),
      `Options: ${JSON.stringify(customerOptions)}`
    );

    await page.evaluate(() => {
      const closeBtn = document.querySelector('[data-testid="btn-close-modal"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    const modalClosed = await page.evaluate(() => !document.querySelector('[data-testid="input-site-name"]'));
    assert('Add Mine Site Modal closes properly', modalClosed);
  }

  // Drawer test
  const row = await page.$('[data-testid^="row-mine-site-"]');
  assert('At least one mine site row rendered in table', Boolean(row));
  if (row) {
    await row.click();
    await page.waitForSelector('[data-testid="btn-close-drawer"]', { visible: true });
    assert('Mine Site Drawer opens upon row selection', true);

    await page.evaluate(() => {
      const closeBtn = document.querySelector('[data-testid="btn-close-drawer"]');
      if (closeBtn) closeBtn.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    const drawerClosed = await page.evaluate(() => !document.querySelector('[data-testid="btn-close-drawer"]'));
    assert('Mine Site Drawer closes properly', drawerClosed);
  }

  // Non-manager UI test
  await page.setCookie({
    name: 'uptoware_sid',
    value: accounts.dispatcher.sid,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
  });
  await page.goto(`${APP_URL}/mine-sites`, { waitUntil: 'networkidle2' });
  const dispatcherCanAdd = await page.evaluate(() => {
    return Boolean(
      document.querySelector('[data-testid="btn-register-mine-site-header"]') ||
        document.querySelector('[data-testid="btn-add-mine-site"]')
    );
  });
  assert('Dispatcher UI hides "Register Mine Site" action buttons', !dispatcherCanAdd);

  // System Regressions
  console.log('\n--- System Regressions ---');
  await page.setCookie({
    name: 'uptoware_sid',
    value: accounts.fleetManager.sid,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
  });

  const dashRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/dashboard',
    method: 'GET',
    headers: { Cookie: `uptoware_sid=${accounts.fleetManager.sid}` },
  });
  const kpi = dashRes.data?.data?.kpi || dashRes.data?.kpi;
  assert('Dashboard API: KPIs intact (2 vehicles, genuine operating cost)', dashRes.status === 200 && kpi?.totalVehicles === 2 && (kpi?.totalOperatingCost === 25860 || kpi?.totalOperatingCost === 44060));

  await page.goto(`${APP_URL}/`, { waitUntil: 'networkidle2' });
  const dashboardMounted = await page.evaluate(() => Boolean(document.querySelector('section') || document.querySelector('.max-w-7xl')));
  assert('Dashboard (/): Renders properly in browser', dashboardMounted);

  const vehRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/vehicles',
    method: 'GET',
    headers: { Cookie: `uptoware_sid=${accounts.fleetManager.sid}` },
  });
  assert('Vehicles API: Count is preserved (2 vehicles)', vehRes.status === 200 && vehRes.data.count === 2);

  await page.goto(`${APP_URL}/vehicles`, { waitUntil: 'networkidle2' });
  const vehiclesTable = await page.evaluate(() => Boolean(document.querySelector('table')));
  assert('Vehicles (/vehicles): Renders properly with table intact', vehiclesTable);

  const driverRes = await request({
    hostname: 'localhost',
    port: 3001,
    path: '/api/drivers',
    method: 'GET',
    headers: { Cookie: `uptoware_sid=${accounts.fleetManager.sid}` },
  });
  assert('Drivers API: Count is preserved (3 drivers)', driverRes.status === 200 && driverRes.data.count === 3);

  await page.goto(`${APP_URL}/drivers`, { waitUntil: 'networkidle2' });
  const driversMounted = await page.evaluate(() => Boolean(document.querySelector('table')));
  assert('Drivers (/drivers): Renders properly with table intact', driversMounted);

  await browser.close();

  // Summary
  console.log('\n===============================================================');
  console.log(`  FINAL AUDIT COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
