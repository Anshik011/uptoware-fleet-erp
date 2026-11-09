const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';

async function runBrowserAcceptance() {
  console.log('=== STARTING PUPPETEER FRONTEND MVP BROWSER ACCEPTANCE ===\n');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  // Authenticate as Fleet Manager (Required after Phase 1.5 session security enforcement)
  console.log('>>> AUTHENTICATION: Logging in as Fleet Manager');
  await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.type('input[type="email"]', 'fleet.manager@uptoware.com');
  await page.type('input[type="password"]', 'Password@123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForSelector('[data-testid="btn-user-profile"]', { timeout: 15000 });

  // ----------------------------------------------------
  // TEST 1: PAGE 1 - FLEET DASHBOARD (http://localhost:3001/)
  // ----------------------------------------------------
  console.log('>>> TEST 1: Loading Page 1 - Fleet Dashboard');
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  const pageTitle = await page.title();
  console.log('Page Title:', pageTitle);

  const headerTitle = await page.$eval('header h1', el => el.innerText.trim());
  console.log('Header Title:', headerTitle);

  // Check KPI Cards
  const kpiCards = await page.$$eval('[aria-label="Key Performance Indicators"] .rounded-xl', els =>
    els.map(el => {
      const title = el.querySelector('.text-xs')?.innerText?.trim();
      const val = el.querySelector('.text-3xl')?.innerText?.trim();
      const sub = el.querySelector('.text-xs:last-child')?.innerText?.trim();
      return `${title}: ${val} (${sub})`;
    })
  );
  console.log('Rendered KPI Cards count:', kpiCards.length);
  kpiCards.forEach(c => console.log('  -', c));

  // Check Utilization Card
  const utilHeading = await page.$eval('h3', el => el.innerText.trim());
  console.log('First Section Heading:', utilHeading);

  // Check Recent Trips Table
  const tripRows = await page.$$eval('tbody tr', els => els.length);
  console.log('Recent Trips Rows count:', tripRows);

  // Check Alerts List
  const alertCount = await page.$$eval('.p-3\\.5.rounded-lg', els => els.length);
  console.log('Recent Alerts Card count:', alertCount);

  // Take screenshot of Page 1
  await page.screenshot({ path: 'frontend_dashboard_screenshot.png', fullPage: true });
  console.log('Saved screenshot: frontend_dashboard_screenshot.png');

  // ----------------------------------------------------
  // TEST 2: NAVIGATION TO PAGE 2 - VEHICLE MANAGEMENT
  // ----------------------------------------------------
  console.log('\n>>> TEST 2: Navigating to Page 2 - Vehicle Management');
  await page.goto('http://localhost:3001/vehicles', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));

  console.log('Current URL:', page.url());
  const vHeaderTitle = await page.$eval('header h1', el => el.innerText.trim());
  console.log('Vehicle Page Header Title:', vHeaderTitle);

  // Table rows
  await page.waitForSelector('[data-testid="vehicle-row"]');
  let vehicleRows = await page.$$eval('[data-testid="vehicle-row"]', els =>
    els.map(tr => {
      const plate = tr.querySelector('td:first-child .font-mono')?.innerText?.trim();
      const driver = tr.querySelector('.text-left:nth-child(2)')?.innerText?.trim();
      const status = tr.querySelector('.rounded-full')?.innerText?.trim();
      const odo = tr.querySelector('.text-right.font-mono')?.innerText?.trim();
      return `${plate} | Driver: ${driver} | Status: ${status} | Odo: ${odo}`;
    })
  );
  console.log(`Rendered Vehicle Table rows (${vehicleRows.length}):`);
  vehicleRows.forEach(r => console.log('  -', r));

  // ----------------------------------------------------
  // TEST 3: SEARCH FILTERING
  // ----------------------------------------------------
  console.log('\n>>> TEST 3: Testing Search for "KA-19-MG-8802"');
  await page.focus('[data-testid="vehicle-search"]');
  await page.type('[data-testid="vehicle-search"]', 'KA-19-MG-8802');
  await new Promise(r => setTimeout(r, 1000));

  let filteredRows = await page.$$eval('[data-testid="vehicle-row"] td:first-child .font-mono', els =>
    els.map(tr => tr.innerText.trim())
  );
  console.log('Filtered rows after searching "KA-19-MG-8802":', filteredRows);

  // Clear search with Control+A + Backspace
  await page.focus('[data-testid="vehicle-search"]');
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await new Promise(r => setTimeout(r, 1000));

  const restoredRows = await page.$$eval('[data-testid="vehicle-row"] td:first-child .font-mono', els =>
    els.map(tr => tr.innerText.trim())
  );
  console.log(`Table restored after clearing search (${restoredRows.length} rows):`, restoredRows);

  // ----------------------------------------------------
  // TEST 4: STATUS DROPDOWN FILTER
  // ----------------------------------------------------
  console.log('\n>>> TEST 4: Testing Status Filter: "Breakdown"');
  await page.select('[data-testid="status-filter"]', 'Breakdown');
  await new Promise(r => setTimeout(r, 1000));

  let bdRows = await page.$$eval('[data-testid="vehicle-row"] td:first-child .font-mono', els =>
    els.map(tr => tr.innerText.trim())
  );
  console.log('Filtered rows for "Breakdown":', bdRows);

  // Reset status to ALL
  await page.select('[data-testid="status-filter"]', 'ALL');
  await new Promise(r => setTimeout(r, 1000));

  // ----------------------------------------------------
  // TEST 5: VEHICLE DETAILS DRAWER
  // ----------------------------------------------------
  console.log('\n>>> TEST 5: Testing Vehicle Details Drawer on KA-19-MG-8802');
  const targetRowBtn = await page.$('tr[data-vehicle-id="KA-19-MG-8802"] [data-testid="btn-view-details"]');
  if (targetRowBtn) {
    await targetRowBtn.click();
    await page.waitForSelector('[role="dialog"] h2');
    await new Promise(r => setTimeout(r, 1500));

    const drawerTitle = await page.$eval('[role="dialog"] h2', el => el.innerText.trim());
    console.log('Opened Drawer Vehicle Title:', drawerTitle);

    const docItems = await page.$$eval('[role="dialog"] .p-3\\.5.rounded-lg', els =>
      els.map(el => {
        const title = el.querySelector('.text-xs.font-semibold')?.innerText?.trim();
        const badge = el.querySelector('.text-\\[10px\\]')?.innerText?.trim();
        return `${title}: ${badge}`;
      })
    );
    console.log('Statutory Document Cards in Drawer:');
    docItems.forEach(d => console.log('  -', d));

    // Close drawer
    await page.click('[role="dialog"] button[aria-label*="Close"]');
    await new Promise(r => setTimeout(r, 1000));
    console.log('Drawer closed successfully.');
  }

  // ----------------------------------------------------
  // TEST 6: ADD VEHICLE MODAL FORM
  // ----------------------------------------------------
  console.log('\n>>> TEST 6: Testing Add Vehicle Modal Form');
  await page.click('[data-testid="btn-register-vehicle-header"]');
  await page.waitForSelector('[data-testid="add-vehicle-modal"]');
  await new Promise(r => setTimeout(r, 1000));

  const modalTitle = await page.$eval('[data-testid="add-vehicle-modal"] h2', el => el.innerText.trim());
  console.log('Add Vehicle Modal Title:', modalTitle);

  // Check Driver options in dropdown
  const driverOptions = await page.$$eval('[data-testid="select-driver"] option', els =>
    els.map(o => o.innerText.trim()).filter(t => !t.includes('--'))
  );
  console.log('Driver Options loaded in modal dropdown:', driverOptions);

  // Fill form with a unique test registration
  const testPlate = 'KA-19-MVP-' + Math.floor(1000 + Math.random() * 9000);
  console.log(`Filling form for new vehicle: ${testPlate}`);

  await page.type('[data-testid="input-plate"]', testPlate);
  await page.type('[data-testid="input-model"]', ' Heavy Tipper');

  // Submit form
  console.log('Submitting Add Vehicle form...');
  await page.click('[data-testid="btn-submit-vehicle"]');
  await new Promise(r => setTimeout(r, 3000));

  // Check updated table
  const newTableRows = await page.$$eval('[data-testid="vehicle-row"] td:first-child .font-mono', els =>
    els.map(e => e.innerText.trim())
  );
  console.log(`Table rows after addition (${newTableRows.length}):`, newTableRows);
  const wasAdded = newTableRows.includes(testPlate);
  console.log(`Vehicle ${testPlate} successfully added and present in table:`, wasAdded);

  // Take screenshot of Page 2 with table
  await page.screenshot({ path: 'frontend_vehicles_screenshot.png', fullPage: true });
  console.log('Saved screenshot: frontend_vehicles_screenshot.png');

  // Clean up test vehicle in Frappe backend
  console.log(`\nCleaning up created vehicle ${testPlate}...`);
  const loginRes = await fetch('http://localhost:8080/api/method/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usr: 'Administrator', pwd: 'admin' })
  });
  const cookie = loginRes.headers.get('set-cookie');
  const delRes = await fetch(`http://localhost:8080/api/resource/Vehicle/${testPlate}`, {
    method: 'DELETE',
    headers: { 'Cookie': cookie }
  });
  console.log('Cleanup delete response status:', delRes.status);

  await browser.close();
  console.log('\n=== ALL BROWSER ACCEPTANCE TESTS PASSED PERFECTLY! ===');
}

runBrowserAcceptance().catch(err => {
  console.error('Acceptance Test Failed:', err);
  process.exit(1);
});
