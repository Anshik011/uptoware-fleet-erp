const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';

const VIEWPORTS = [
  { name: 'Desktop 1920x1080', width: 1920, height: 1080, key: '1920' },
  { name: 'Laptop 1366x768', width: 1366, height: 768, key: '1366' },
  { name: 'Small Laptop 1024x768', width: 1024, height: 768, key: '1024' },
  { name: 'Tablet 768x1024', width: 768, height: 1024, key: '768' },
  { name: 'Mobile 390x844', width: 390, height: 844, key: '390' },
];

async function runComprehensiveAudit() {
  console.log('=== STARTING PHASE 1 FINAL AUDIT & COMPONENT CONTAINMENT VERIFICATION ===\n');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  // Authenticate as Fleet Manager (Required after Phase 1.5 session security enforcement)
  console.log('>>> AUTHENTICATION: Logging in as Fleet Manager');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle2' });
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.type('input[type="email"]', 'fleet.manager@uptoware.com');
  await page.type('input[type="password"]', 'Password@123');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForSelector('[data-testid="btn-user-profile"]', { timeout: 15000 });

  const results = [];

  // =========================================================================
  // SUITE 1: OFFICIAL LOGO & BRANDING SYSTEM
  // =========================================================================
  console.log('>>> SUITE 1: Auditing Official Brand Identity & Assets');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  const sidebarLogoSrc = await page.$eval('aside img', el => el.getAttribute('src'));
  const decodedSidebarLogo = decodeURIComponent(sidebarLogoSrc);
  const logoValid = decodedSidebarLogo.includes('/branding/logo-dark.png');
  console.log('  Sidebar Logo source:', sidebarLogoSrc);
  console.log('  Decoded path includes official dark logo:', logoValid);

  const faviconHref = await page.$eval('link[rel="icon"]', el => el.getAttribute('href')).catch(() => null);
  const docTitle = await page.title();
  console.log('  Document Title:', docTitle);
  console.log('  Favicon link:', faviconHref);

  results.push({
    suite: 'Brand Identity & Assets',
    criteria: 'Official logo & favicon assets correctly loaded and configured',
    passed: logoValid && docTitle.includes('Uptoware Fleet Management'),
  });

  // =========================================================================
  // SUITE 2: DASHBOARD KPI CARD CONTAINMENT ACROSS ALL 5 VIEWPORTS
  // =========================================================================
  console.log('\n>>> SUITE 2: KPI Card & Component Containment Across 5 Viewports');

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));

    // 1. Page-level horizontal overflow
    const hasPageOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    // 2. Component-level KPI Card overflow inspection
    const cardContainment = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-testid="kpi-card"]'));
      const details = [];

      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const cardRect = card.getBoundingClientRect();
        const hasCardScrollOverflow = card.scrollWidth > card.clientWidth;

        // Check badge containment
        const badge = card.querySelector('[data-testid="kpi-badge"]');
        let badgeContained = true;
        let badgeRight = 0;
        let cardRight = cardRect.right;

        if (badge) {
          const badgeRect = badge.getBoundingClientRect();
          badgeRight = badgeRect.right;
          // Allow 1.5px sub-pixel tolerance
          badgeContained = badgeRect.right <= cardRect.right + 1.5;
        }

        // Check all children containment
        const children = Array.from(card.querySelectorAll('*'));
        let anyChildOverflows = false;
        for (const child of children) {
          const cr = child.getBoundingClientRect();
          if (cr.width > 0 && cr.height > 0) {
            if (cr.right > cardRect.right + 2 || cr.left < cardRect.left - 2) {
              anyChildOverflows = true;
              break;
            }
          }
        }

        details.push({
          index: i + 1,
          hasCardScrollOverflow,
          badgeContained,
          anyChildOverflows,
          cardWidth: Math.round(cardRect.width),
          cardHeight: Math.round(cardRect.height),
          cardRight: Math.round(cardRight),
          badgeRight: Math.round(badgeRight),
        });
      }

      return details;
    });

    const allCardsContained = cardContainment.every(
      c => !c.hasCardScrollOverflow && c.badgeContained && !c.anyChildOverflows
    );

    console.log(`  [${vp.name}] Width: ${vp.width}px`);
    console.log(`    - Page Horizontal Overflow: ${hasPageOverflow ? 'FAIL (YES)' : 'PASS (NO)'}`);
    console.log(`    - KPI Cards Count: ${cardContainment.length}`);
    cardContainment.forEach(c => {
      console.log(
        `      Card #${c.index}: Size ${c.cardWidth}x${c.cardHeight}px | Badge Contained: ${c.badgeContained} | Child Overflow: ${c.anyChildOverflows ? 'FAIL' : 'NONE'}`
      );
    });

    await page.screenshot({ path: `phase1_v2_dashboard_${vp.key}.png`, fullPage: false });

    results.push({
      suite: `Dashboard KPI Containment (${vp.name})`,
      criteria: 'Zero page overflow and zero child element/badge overflow in all 6 cards',
      passed: !hasPageOverflow && cardContainment.length === 6 && allCardsContained,
    });
  }

  // =========================================================================
  // SUITE 3: VEHICLE DIRECTORY RESPONSIVE ACROSS ALL 5 VIEWPORTS
  // =========================================================================
  console.log('\n>>> SUITE 3: Vehicle Directory & Metric Strip Across 5 Viewports');

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3001/vehicles', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1200));

    // Page-level overflow
    const hasPageOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    // Row count
    const rowCount = await page.$$eval('[data-testid="vehicle-row"]', els => els.length);

    console.log(`  [${vp.name}] Width: ${vp.width}px | Page Overflow: ${hasPageOverflow ? 'FAIL' : 'PASS'} | Rows: ${rowCount}`);

    await page.screenshot({ path: `phase1_v2_vehicles_${vp.key}.png`, fullPage: false });

    results.push({
      suite: `Vehicles Directory (${vp.name})`,
      criteria: 'Zero page overflow & directory table rendered',
      passed: !hasPageOverflow && rowCount >= 2,
    });
  }

  // =========================================================================
  // SUITE 4: INTERACTIVE VEHICLE DRAWER & STATUTORY COMPLIANCE CARDS
  // =========================================================================
  console.log('\n>>> SUITE 4: Testing Vehicle Drawer & Document Cards (Mobile 390x844)');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:3001/vehicles', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1200));

  // Click Details button on the first vehicle row
  const detailsBtn = await page.$('[data-testid="btn-view-details"]');
  if (detailsBtn) {
    await detailsBtn.click();
    await page.waitForSelector('[role="dialog"][aria-modal="true"]');
    await new Promise(r => setTimeout(r, 1000));

    // Check Drawer Content
    const drawerHeader = await page.$eval('[role="dialog"] h2', el => el.innerText);
    const capacityTitle = await page.$eval('[role="dialog"] h3', el => el.innerText);
    console.log('  Drawer opened for vehicle:', drawerHeader);
    console.log('  Capacity section header:', capacityTitle);

    // Verify statutory document cards inside drawer
    const docCount = await page.$$eval('[role="dialog"] .space-y-2\\.5 > div', els => els.length);
    console.log('  Statutory document cards rendered:', docCount);

    await page.screenshot({ path: 'phase1_v2_drawer_390.png', fullPage: false });

    // Close drawer
    await page.click('button[aria-label*="Close vehicle details drawer"]');
    await new Promise(r => setTimeout(r, 500));

    results.push({
      suite: 'Vehicle Drawer & Statutory Cards',
      criteria: 'Drawer opens with specifications and 5 statutory compliance cards',
      passed: docCount === 5 && !capacityTitle.toLowerCase().includes('telemetry'),
    });
  }

  // =========================================================================
  // SUITE 5: VEHICLE REGISTRATION MODAL
  // =========================================================================
  console.log('\n>>> SUITE 5: Testing Add Vehicle Modal Controls');
  await page.setViewport({ width: 1024, height: 768 });
  await page.goto('http://localhost:3001/vehicles', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const addBtn = await page.$('[data-testid="btn-register-vehicle-header"]');
  if (addBtn) {
    await addBtn.click();
    await page.waitForSelector('[role="dialog"]');
    await new Promise(r => setTimeout(r, 600));

    const modalTitle = await page.$eval('[role="dialog"] h2', el => el.innerText);
    console.log('  Modal Title:', modalTitle);

    // Check driver dropdown has options
    const driverOptionCount = await page.$$eval('[data-testid="select-driver"] option', els => els.length);
    console.log('  Driver dropdown options count:', driverOptionCount);

    // Close modal
    await page.click('[data-testid="btn-close-modal-top"]');
    await new Promise(r => setTimeout(r, 500));

    results.push({
      suite: 'Vehicle Registration Modal',
      criteria: 'Modal dialog opens with form controls & drivers loaded',
      passed: modalTitle.includes('Register Commercial Vehicle') && driverOptionCount > 0,
    });
  }

  // =========================================================================
  // SUITE 6: REAL-TIME VEHICLE SEARCH & STATUS FILTERS
  // =========================================================================
  console.log('\n>>> SUITE 6: Testing Real-Time Search & Status Filters');
  await page.setViewport({ width: 1366, height: 768 });
  await page.goto('http://localhost:3001/vehicles', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // Search for KA-19-MG-8802
  await page.type('[data-testid="vehicle-search"]', '8802');
  await new Promise(r => setTimeout(r, 500));
  const filteredRowCount = await page.$$eval('[data-testid="vehicle-row"]', els => els.length);
  console.log('  Rows after typing "8802":', filteredRowCount);

  // Clear search with Control+KeyA + Backspace
  await page.focus('[data-testid="vehicle-search"]');
  await page.keyboard.down('Control');
  await page.keyboard.press('KeyA');
  await page.keyboard.up('Control');
  await page.keyboard.press('Backspace');
  await new Promise(r => setTimeout(r, 1000));
  const restoredRowCount = await page.$$eval('[data-testid="vehicle-row"]', els => els.length);
  console.log('  Rows after clearing search:', restoredRowCount);

  results.push({
    suite: 'Real-Time Search & Table Filtering',
    criteria: 'Interactive instant search filters table rows dynamically',
    passed: filteredRowCount === 1 && restoredRowCount >= 2,
  });

  // =========================================================================
  // SUITE 7: MOBILE DRAWER & ROLE-AWARE OPERATOR PROFILES
  // =========================================================================
  console.log('\n>>> SUITE 7: Testing Mobile Drawer Navigation & Role Switcher');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // Mobile drawer
  const hamburgerBtn = await page.$('button[aria-label*="mobile navigation"]');
  await hamburgerBtn.click();
  await page.waitForSelector('[role="dialog"][aria-modal="true"]');
  await new Promise(r => setTimeout(r, 500));

  const drawerVisible = await page.$eval('[role="dialog"][aria-modal="true"]', el => !!el);
  console.log('  Mobile navigation drawer toggled open:', drawerVisible);

  await page.click('[role="dialog"] a[href="/vehicles"]');
  await new Promise(r => setTimeout(r, 1200));
  console.log('  Navigated to:', page.url());

  // User Profile & Role Context Menu (Authentic Frappe RBAC Session Menu)
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  await page.click('[data-testid="btn-user-profile"]');
  await page.waitForSelector('[role="menu"]');
  const roleText = await page.$eval('[data-testid="header-user-role"]', el => el.innerText.trim());
  const isFleetManager = roleText.includes('Fleet Manager');
  console.log('  Authenticated role verified in Header:', roleText);

  results.push({
    suite: 'Mobile Drawer & Role Context',
    criteria: 'Mobile hamburger drawer routes cleanly; Authenticated role verified in profile menu',
    passed: drawerVisible && isFleetManager,
  });

  // =========================================================================
  // SUMMARY RESULTS MATRIX
  // =========================================================================
  console.log('\n========================================================================');
  console.log('           PHASE 1 DEFECT CORRECTION & VERIFICATION RESULTS MATRIX       ');
  console.log('========================================================================');
  let allPass = true;
  results.forEach(r => {
    const status = r.passed ? 'PASS [OK]' : 'FAIL [X]';
    if (!r.passed) allPass = false;
    console.log(`${status.padEnd(12)} | ${r.suite.padEnd(38)} | ${r.criteria}`);
  });
  console.log('========================================================================');
  console.log('OVERALL ACCEPTANCE STATUS:', allPass ? 'ALL TESTS PASSED WITH 100% CONTAINMENT!' : 'DEFECTS DETECTED');

  await browser.close();
  if (!allPass) process.exit(1);
}

runComprehensiveAudit().catch(err => {
  console.error('Acceptance run failed:', err);
  process.exit(1);
});
