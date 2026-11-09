const puppeteer = require('puppeteer-core');
const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';

(async () => {
  const browser = await puppeteer.launch({ executablePath: chromePath, headless: true });
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle2' });
  await page.type('#login_email', 'Administrator');
  await page.type('#login_password', 'admin');
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' })
  ]);

  const repUrl = 'http://localhost:8080/desk/fleet-management/query-report/' + encodeURIComponent('Daily Fuel Consumption');
  await page.goto(repUrl, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));

  const debug = await page.evaluate(async () => {
    const qr = window.frappe.query_report;
    const filter = qr.get_filter('vehicle');
    const valBefore = filter.get_value();
    
    await filter.set_value('KA-19-P-dBTF');
    const valAfter = filter.get_value();
    const filterValues = qr.get_filter_values();

    return {
      valBefore,
      valAfter,
      filterValues
    };
  });
  console.log('Debug result:', debug);
  await browser.close();
})();

