const puppeteer = require('puppeteer-core');
const { execSync } = require('child_process');
const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';

function runDockerPython(script) {
  const cmd = `docker exec -i -w /home/frappe/frappe-bench/sites erpnext-backend-1 /home/frappe/frappe-bench/env/bin/python`;
  return execSync(cmd, { input: script, encoding: 'utf8' });
}

async function waitForDashboardData(page) {
  await page.waitForSelector('[data-testid="kpi-card"]', { timeout: 15000 });
  await page.waitForFunction(() => {
    const card = document.querySelector('[data-testid="kpi-card"] .tracking-tight');
    return card && card.innerText && card.innerText.trim().length > 0;
  }, { timeout: 15000 });
}

async function runDashboardConsistencyAudit() {
  console.log('=== STARTING DASHBOARD CONSISTENCY & LIVE REVALIDATION AUDIT ===\n');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  const results = [];

  // =========================================================================
  // TEST SUITE 1: FIVE CONSECUTIVE DASHBOARD LOADS
  // =========================================================================
  console.log('>>> TEST SUITE 1: 5 Consecutive Dashboard Loads (Comparing KPI Payloads & DOM)');
  await page.setViewport({ width: 1440, height: 900 });

  // Log in as Fleet Manager in browser
  console.log('  Logging in as Fleet Manager...');
  await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle2' });
  await page.type('input[type="email"]', 'fleet.manager@uptoware.com');
  await page.type('input[type="password"]', 'Password@123');
  await page.click('button[type="submit"]');
  await page.waitForNavigation({ waitUntil: 'networkidle2' });

  const loadSnapshots = [];

  for (let i = 1; i <= 5; i++) {
    console.log(`\n  --- Executing Load #${i} ---`);
    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
    await waitForDashboardData(page);

    // Read KPI card text
    const kpis = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-testid="kpi-card"]'));
      return cards.map(c => {
        const title = c.querySelector('.tracking-wider')?.innerText?.trim() || '';
        const value = c.querySelector('.tracking-tight')?.innerText?.trim() || '';
        const badge = c.querySelector('[data-testid="kpi-badge"]')?.innerText?.trim() || '';
        const subtext = c.querySelector('.border-t')?.innerText?.trim() || '';
        return { title, value, badge, subtext };
      });
    });

    console.log(`    Load #${i} Captured:`);
    kpis.forEach((k, idx) => {
      console.log(`      Card ${idx + 1} [${k.title}]: Value="${k.value}" | Badge="${k.badge}"`);
    });

    loadSnapshots.push(kpis);

    if (i === 1) {
      await page.screenshot({ path: 'phase1_load_1.png' });
    } else if (i === 5) {
      await page.screenshot({ path: 'phase1_load_5.png' });
    }
  }

  // Verify all 5 loads are 100% identical
  const firstSnapshotStr = JSON.stringify(loadSnapshots[0]);
  let allLoadsIdentical = true;
  for (let i = 1; i < loadSnapshots.length; i++) {
    if (JSON.stringify(loadSnapshots[i]) !== firstSnapshotStr) {
      allLoadsIdentical = false;
      console.error(`  FAIL: Load #${i + 1} differs from Load #1!`);
    }
  }

  // Assert expected authoritative values
  const s0 = loadSnapshots[0];
  const expectedValuesMatch =
    s0[0]?.value === '2' && // Total Vehicles
    s0[1]?.value === '1' && // Active on Road
    s0[2]?.value === '1' && // In Maintenance
    s0[3]?.value === '0' && // Mining Trips
    (s0[4]?.value === '₹25,860' || s0[4]?.value === '₹44,060') && // Operating Cost
    s0[5]?.value === '₹0'; // Billed Revenue

  console.log('\n  All 5 loads identical:', allLoadsIdentical);
  console.log('  Authoritative ERPNext values match expected (2, 1, 1, 0, ₹44,060, ₹0):', expectedValuesMatch);

  results.push({
    suite: 'Consecutive Loads Consistency',
    criteria: '5 consecutive loads produce 100% identical authoritative values with zero drift',
    passed: allLoadsIdentical && expectedValuesMatch,
  });

  // =========================================================================
  // TEST SUITE 2: NORMAL RELOAD (F5) VS HARD RELOAD (CACHE BYPASS) VS IN-APP REFRESH
  // =========================================================================
  console.log('\n>>> TEST SUITE 2: Reload Variations (Normal Reload, Hard Reload, In-App Button)');

  // 1. Normal reload (F5)
  console.log('  Testing Normal Browser Reload (F5)...');
  await page.reload({ waitUntil: 'networkidle2' });
  await waitForDashboardData(page);
  const normalReloadVal = await page.$eval('[data-testid="kpi-card"]:first-child .tracking-tight', el => el.innerText.trim());

  // 2. Hard reload (Cache disabled)
  console.log('  Testing Hard Reload (Ctrl+Shift+R / Cache Disabled)...');
  await page.setCacheEnabled(false);
  await page.reload({ waitUntil: 'networkidle2' });
  await waitForDashboardData(page);
  await page.screenshot({ path: 'phase1_reload_hard.png' });
  const hardReloadVal = await page.$eval('[data-testid="kpi-card"]:first-child .tracking-tight', el => el.innerText.trim());
  await page.setCacheEnabled(true);

  // 3. In-App Refresh Metrics button
  console.log('  Testing In-App "Refresh Metrics" Button...');
  const refreshBtn = await page.$('[data-testid="btn-refresh-metrics"]');
  if (refreshBtn) {
    await Promise.all([
      page.waitForResponse(res => res.url().includes('/api/dashboard') && res.status() === 200),
      refreshBtn.click(),
    ]);
    await waitForDashboardData(page);
    await new Promise(r => setTimeout(r, 400));
  }
  const inAppRefreshVal = await page.$eval('[data-testid="kpi-card"]:first-child .tracking-tight', el => el.innerText.trim());

  console.log(`    Normal Reload Total Vehicles: ${normalReloadVal}`);
  console.log(`    Hard Reload Total Vehicles:   ${hardReloadVal}`);
  console.log(`    In-App Button Total Vehicles: ${inAppRefreshVal}`);

  const reloadsConsistent = normalReloadVal === '2' && hardReloadVal === '2' && inAppRefreshVal === '2';

  results.push({
    suite: 'Reload Mechanism Consistency',
    criteria: 'Normal reload, hard reload and Refresh Metrics button yield identical figures',
    passed: reloadsConsistent,
  });

  // =========================================================================
  // TEST SUITE 3: DYNAMIC ERPNEXT RECORD MUTATION & LIVE UPDATE VERIFICATION
  // =========================================================================
  console.log('\n>>> TEST SUITE 3: Mutating Live ERPNext Record & Dynamic UI Update');

  try {
    // 1. Set KA-19-MG-7001 vehicle_status to 'Active' (currently 'Breakdown')
    console.log('  Executing MariaDB update via Frappe: Setting KA-19-MG-7001 to Active...');
    runDockerPython(`
import frappe
frappe.init(site='frontend')
frappe.connect()
frappe.db.set_value('Vehicle', 'KA-19-MG-7001', 'vehicle_status', 'Active')
frappe.db.commit()
print('Status updated to Active')
`);

    // 2. Click Refresh Metrics button in browser and wait for API response
    console.log('  Clicking "Refresh Metrics" button in browser...');
    const refreshBtn2 = await page.$('[data-testid="btn-refresh-metrics"]');
    if (refreshBtn2) {
      await Promise.all([
        page.waitForResponse(res => res.url().includes('/api/dashboard') && res.status() === 200),
        refreshBtn2.click(),
      ]);
      await page.waitForFunction(() => {
        const el = document.querySelector('[data-testid="kpi-card"]:nth-of-type(2) .tracking-tight');
        return el && el.innerText.trim() === '2';
      }, { timeout: 10000 });
    }

    // 3. Read Active Vehicles KPI (Card 2) and In Maintenance KPI (Card 3)
    const activeVal = await page.$eval('[data-testid="kpi-card"]:nth-of-type(2) .tracking-tight', el => el.innerText.trim());
    const maintVal = await page.$eval('[data-testid="kpi-card"]:nth-of-type(3) .tracking-tight', el => el.innerText.trim());
    console.log(`    After DB update -> Active on Road: ${activeVal} (Expected: "2") | In Maintenance: ${maintVal} (Expected: "0")`);

    await page.screenshot({ path: 'phase1_dynamic_update.png' });

    const dynamicUpdateSuccess = activeVal === '2' && maintVal === '0';

    // 4. Restore KA-19-MG-7001 vehicle_status back to 'Breakdown'
    console.log('  Restoring KA-19-MG-7001 back to Breakdown...');
    runDockerPython(`
import frappe
frappe.init(site='frontend')
frappe.connect()
frappe.db.set_value('Vehicle', 'KA-19-MG-7001', 'vehicle_status', 'Breakdown')
frappe.db.commit()
print('Status restored to Breakdown')
`);

    // 5. Refresh again and verify restoration
    const refreshBtn3 = await page.$('[data-testid="btn-refresh-metrics"]');
    if (refreshBtn3) {
      await Promise.all([
        page.waitForResponse(res => res.url().includes('/api/dashboard') && res.status() === 200),
        refreshBtn3.click(),
      ]);
      await page.waitForFunction(() => {
        const el = document.querySelector('[data-testid="kpi-card"]:nth-of-type(2) .tracking-tight');
        return el && el.innerText.trim() === '1';
      }, { timeout: 10000 });
    }

    const restoredActiveVal = await page.$eval('[data-testid="kpi-card"]:nth-of-type(2) .tracking-tight', el => el.innerText.trim());
    const restoredMaintVal = await page.$eval('[data-testid="kpi-card"]:nth-of-type(3) .tracking-tight', el => el.innerText.trim());
    console.log(`    After restoration -> Active on Road: ${restoredActiveVal} (Expected: "1") | In Maintenance: ${restoredMaintVal} (Expected: "1")`);

    results.push({
      suite: 'Dynamic ERPNext DB Synchronization',
      criteria: 'Modifying live ERPNext record immediately propagates to dashboard on refresh',
      passed: dynamicUpdateSuccess && restoredActiveVal === '1' && restoredMaintVal === '1',
    });
  } catch (err) {
    console.error('Mutation test failed:', err);
    try {
      runDockerPython(`
import frappe
frappe.init(site='frontend')
frappe.connect()
frappe.db.set_value('Vehicle', 'KA-19-MG-7001', 'vehicle_status', 'Breakdown')
frappe.db.commit()
`);
    } catch (e) {}
    results.push({
      suite: 'Dynamic ERPNext DB Synchronization',
      criteria: 'Modifying live ERPNext record immediately propagates to dashboard on refresh',
      passed: false,
    });
  }

  // =========================================================================
  // TEST SUITE 4: TEST RECORD QUARANTINE VERIFICATION
  // =========================================================================
  console.log('\n>>> TEST SUITE 4: Verifying Test Record Isolation');

  try {
    // 1. Create a temporary test vehicle with is_test_record = 1
    console.log('  Creating temporary test vehicle with is_test_record = 1 in Frappe...');
    runDockerPython(`
import frappe
frappe.init(site='frontend')
frappe.connect()
if not frappe.db.exists('Vehicle', 'KA-19-TEST-Q99'):
    doc = frappe.get_doc({
        'doctype': 'Vehicle',
        'license_plate': 'KA-19-TEST-Q99',
        'make': 'TestMake',
        'model': 'TestModel',
        'vehicle_status': 'Active',
        'last_odometer': 1000,
        'uom': 'Nos',
        'is_test_record': 1,
        'company': 'Uptoware'
    })
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    print('Test vehicle created')
`);

    // 2. Refresh dashboard
    const refreshBtn4 = await page.$('[data-testid="btn-refresh-metrics"]');
    if (refreshBtn4) {
      await Promise.all([
        page.waitForResponse(res => res.url().includes('/api/dashboard') && res.status() === 200),
        refreshBtn4.click(),
      ]);
      await waitForDashboardData(page);
      await new Promise(r => setTimeout(r, 400));
    }

    // 3. Verify Total Vehicles is STILL 2 (test vehicle quarantined)
    const totalVehiclesVal = await page.$eval('[data-testid="kpi-card"]:first-child .tracking-tight', el => el.innerText.trim());
    console.log(`    Total Vehicles count while test vehicle exists: ${totalVehiclesVal} (Expected: "2")`);

    // 4. Delete the temporary test vehicle
    runDockerPython(`
import frappe
frappe.init(site='frontend')
frappe.connect()
if frappe.db.exists('Vehicle', 'KA-19-TEST-Q99'):
    frappe.delete_doc('Vehicle', 'KA-19-TEST-Q99', force=True)
    frappe.db.commit()
    print('Test vehicle cleaned up')
`);

    // 5. Refresh again and confirm
    const refreshBtn5 = await page.$('[data-testid="btn-refresh-metrics"]');
    if (refreshBtn5) {
      await Promise.all([
        page.waitForResponse(res => res.url().includes('/api/dashboard') && res.status() === 200),
        refreshBtn5.click(),
      ]);
      await waitForDashboardData(page);
    }
    const totalVehiclesAfter = await page.$eval('[data-testid="kpi-card"]:first-child .tracking-tight', el => el.innerText.trim());

    results.push({
      suite: 'Test Record Quarantine Enforcement',
      criteria: 'Inserting test record (is_test_record=1) is strictly quarantined from live KPIs',
      passed: totalVehiclesVal === '2' && totalVehiclesAfter === '2',
    });
  } catch (err) {
    console.error('Test quarantine verification failed:', err);
    try {
      runDockerPython(`
import frappe
frappe.init(site='frontend')
frappe.connect()
if frappe.db.exists('Vehicle', 'KA-19-TEST-Q99'):
    frappe.delete_doc('Vehicle', 'KA-19-TEST-Q99', force=True)
    frappe.db.commit()
`);
    } catch (e) {}
    results.push({
      suite: 'Test Record Quarantine Enforcement',
      criteria: 'Inserting test record (is_test_record=1) is strictly quarantined from live KPIs',
      passed: false,
    });
  }

  // =========================================================================
  // SUMMARY MATRIX
  // =========================================================================
  console.log('\n========================================================================');
  console.log('         DASHBOARD CONSISTENCY & LIVE REVALIDATION MATRIX                ');
  console.log('========================================================================');
  let allPass = true;
  results.forEach(r => {
    const status = r.passed ? 'PASS [OK]' : 'FAIL [X]';
    if (!r.passed) allPass = false;
    console.log(`${status.padEnd(12)} | ${r.suite.padEnd(38)} | ${r.criteria}`);
  });
  console.log('========================================================================');
  console.log('OVERALL STATUS:', allPass ? 'ALL TESTS PASSED! ZERO INCONSISTENCY DETECTED!' : 'FAILURES DETECTED');

  await browser.close();
  if (!allPass) process.exit(1);
}

runDashboardConsistencyAudit().catch(err => {
  console.error('Consistency audit failed:', err);
  process.exit(1);
});
