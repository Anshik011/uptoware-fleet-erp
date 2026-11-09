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

  const repUrl = 'http://localhost:8080/desk/fleet-management/query-report/' + encodeURIComponent('Trip-wise Expense');
  await page.goto(repUrl, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 3000));

  const check = await page.evaluate(() => {
    const qr = window.frappe.query_report;
    const rawCols = qr.raw_data ? qr.raw_data.columns : null;
    const noResultText = document.querySelector('.no-result, .msg-box, .text-muted')?.innerText;
    return {
      has_qr: !!qr,
      rawColsCount: rawCols ? rawCols.length : 0,
      rawCols: rawCols,
      noResultText: noResultText
    };
  });
  console.log('Empty report rawCols check:', check);

  await browser.close();
})();

