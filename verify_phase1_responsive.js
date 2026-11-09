const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';

const VIEWPORTS = [
  { name: 'Desktop 1920x1080', width: 1920, height: 1080 },
  { name: 'Laptop 1366x768', width: 1366, height: 768 },
  { name: 'Small Laptop 1024x768', width: 1024, height: 768 },
  { name: 'Tablet 768x1024', width: 768, height: 1024 },
  { name: 'Mobile 390x844', width: 390, height: 844 },
];

async function runResponsiveAcceptance() {
  console.log('=== STARTING PHASE 1 RESPONSIVE ACCEPTANCE & AUDIT ===\n');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));

  const results = [];

  // =========================================================================
  // SUITE 1: OFFICIAL LOGO & BRANDING SYSTEM AUDIT
  // =========================================================================
  console.log('>>> SUITE 1: Auditing Official Logo & Branding Configuration');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1500));

  // Check Sidebar Logo
  const sidebarLogoSrc = await page.$eval('aside img', el => el.getAttribute('src'));
  console.log('Sidebar Logo image source:', sidebarLogoSrc);
  const decodedSidebarLogo = decodeURIComponent(sidebarLogoSrc);
  const logoExists = decodedSidebarLogo.includes('/branding/logo-dark.png');
  console.log('Uses official Uptoware dark logo:', logoExists);

  // Check Favicon in document head
  const faviconHref = await page.$eval('link[rel="icon"]', el => el.getAttribute('href')).catch(() => null);
  console.log('Favicon link href:', faviconHref);

  // Check Page Title
  const docTitle = await page.title();
  console.log('Document Title:', docTitle);
  const titleValid = docTitle.includes('Uptoware Fleet Management');

  results.push({
    suite: 'Logo & Branding System',
    criteria: 'Official logo assets & title configuration',
    passed: logoExists && titleValid,
  });

  // =========================================================================
  // SUITE 2: RESPONSIVE ACCEPTANCE MATRIX - DASHBOARD (http://localhost:3001/)
  // =========================================================================
  console.log('\n>>> SUITE 2: Responsive Testing on Page 1 (Fleet Dashboard)');

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Check for horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    // Check KPI cards rendered
    const kpiCount = await page.$$eval('[aria-label="Key Performance Indicators"] .rounded-xl', els => els.length);

    console.log(
      `  [${vp.name}] Width: ${vp.width}px | Overflow: ${hasHorizontalOverflow ? 'FAIL (YES)' : 'PASS (NO)'} | KPI Cards: ${kpiCount}`
    );

    if (vp.width === 1920) {
      await page.screenshot({ path: 'phase1_dashboard_1920.png', fullPage: false });
    } else if (vp.width === 768) {
      await page.screenshot({ path: 'phase1_dashboard_768.png', fullPage: false });
    } else if (vp.width === 390) {
      await page.screenshot({ path: 'phase1_dashboard_390.png', fullPage: false });
    }

    results.push({
      suite: `Dashboard Responsive (${vp.name})`,
      criteria: 'Zero horizontal page overflow & cards visible',
      passed: !hasHorizontalOverflow && kpiCount === 6,
    });
  }

  // =========================================================================
  // SUITE 3: RESPONSIVE ACCEPTANCE MATRIX - VEHICLES (http://localhost:3001/vehicles)
  // =========================================================================
  console.log('\n>>> SUITE 3: Responsive Testing on Page 2 (Vehicle Directory)');

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height });
    await page.goto('http://localhost:3001/vehicles', { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 1000));

    // Check for horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });

    // Check table rendered
    const rowCount = await page.$$eval('[data-testid="vehicle-row"]', els => els.length);

    console.log(
      `  [${vp.name}] Width: ${vp.width}px | Overflow: ${hasHorizontalOverflow ? 'FAIL (YES)' : 'PASS (NO)'} | Table Rows: ${rowCount}`
    );

    if (vp.width === 1920) {
      await page.screenshot({ path: 'phase1_vehicles_1920.png', fullPage: false });
    } else if (vp.width === 390) {
      await page.screenshot({ path: 'phase1_vehicles_390.png', fullPage: false });
    }

    results.push({
      suite: `Vehicles Responsive (${vp.name})`,
      criteria: 'Zero horizontal page overflow & rows rendered',
      passed: !hasHorizontalOverflow && rowCount === 7,
    });
  }

  // =========================================================================
  // SUITE 4: MOBILE NAVIGATION DRAWER INTERACTION
  // =========================================================================
  console.log('\n>>> SUITE 4: Testing Mobile Navigation Drawer (Viewport 390x844)');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // Find hamburger button
  const hamburgerBtn = await page.$('button[aria-label*="mobile navigation"]');
  const hamburgerVisible = !!hamburgerBtn;
  console.log('Hamburger button visible on mobile:', hamburgerVisible);

  if (hamburgerBtn) {
    await hamburgerBtn.click();
    await page.waitForSelector('[role="dialog"][aria-modal="true"]');
    await new Promise(r => setTimeout(r, 500));

    const drawerOpen = await page.$eval('[role="dialog"][aria-modal="true"]', el => !!el);
    console.log('Mobile navigation drawer opened:', drawerOpen);

    // Click link to Vehicles inside drawer
    await page.click('[role="dialog"] a[href="/vehicles"]');
    await new Promise(r => setTimeout(r, 1500));
    console.log('Navigated to URL from mobile drawer:', page.url());

    results.push({
      suite: 'Mobile Drawer Navigation',
      criteria: 'Hamburger toggle opens drawer and routes cleanly',
      passed: hamburgerVisible && drawerOpen && page.url().includes('/vehicles'),
    });
  }

  // =========================================================================
  // SUITE 5: ROLE-AWARE OPERATOR PROFILES & SWITCHER
  // =========================================================================
  console.log('\n>>> SUITE 5: Testing Operator Role Switcher');
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3001/', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  // Click User profile dropdown
  await page.click('button[aria-haspopup="true"]');
  await page.waitForSelector('[role="menu"]');
  await new Promise(r => setTimeout(r, 500));

  // Switch role to Dispatcher
  await page.click('[role="menu"] button:nth-of-type(2)');
  await new Promise(r => setTimeout(r, 500));

  const updatedRoleText = await page.$eval('header', el => el.innerText);
  const roleSwitched = updatedRoleText.includes('Dispatcher');
  console.log('Profile badge updated to "Dispatcher":', roleSwitched);

  // Switch back to Fleet Manager
  await page.click('button[aria-haspopup="true"]');
  await page.waitForSelector('[role="menu"]');
  await new Promise(r => setTimeout(r, 500));
  await page.click('[role="menu"] button:nth-of-type(1)');
  await new Promise(r => setTimeout(r, 500));

  results.push({
    suite: 'Role-Aware Operator Profile',
    criteria: 'Interactive operator profile & role context switcher',
    passed: roleSwitched,
  });

  // =========================================================================
  // SUITE 6: ENTERPRISE LOGIN PAGE (`http://localhost:3001/login`)
  // =========================================================================
  console.log('\n>>> SUITE 6: Testing Dedicated Enterprise Login Page');
  await page.setViewport({ width: 390, height: 844 });
  await page.goto('http://localhost:3001/login', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 1000));

  const loginTitle = await page.$eval('h2', el => el.innerText.trim());
  console.log('Login Header:', loginTitle);

  const loginLogo = await page.$eval('img', el => el.getAttribute('src'));
  console.log('Login Logo Image source:', loginLogo);
  const decodedLoginLogo = decodeURIComponent(loginLogo);

  await page.screenshot({ path: 'phase1_login_390.png', fullPage: true });

  // Submit login form
  await page.click('button[type="submit"]');
  await new Promise(r => setTimeout(r, 2000));
  console.log('Redirected after login to:', page.url());

  results.push({
    suite: 'Enterprise Login Page',
    criteria: 'Branded login layout, validation & redirect',
    passed: decodedLoginLogo.includes('/branding/logo-dark.png') && page.url().endsWith('/'),
  });

  // =========================================================================
  // SUMMARY MATRIX
  // =========================================================================
  console.log('\n======================================================');
  console.log('          PHASE 1 ACCEPTANCE RESULTS MATRIX           ');
  console.log('======================================================');
  let allPass = true;
  results.forEach(r => {
    const status = r.passed ? 'PASS [OK]' : 'FAIL [X]';
    if (!r.passed) allPass = false;
    console.log(`${status.padEnd(12)} | ${r.suite.padEnd(35)} | ${r.criteria}`);
  });
  console.log('======================================================');
  console.log('OVERALL RESULT:', allPass ? 'ALL TESTS PASSED PERFECTLY!' : 'FAILURES DETECTED');

  await browser.close();
  if (!allPass) process.exit(1);
}

runResponsiveAcceptance().catch(err => {
  console.error('Acceptance suite failed:', err);
  process.exit(1);
});
