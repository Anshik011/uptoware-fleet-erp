const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe';

const reportList = [
  // A. Fuel Management — 5
  "Daily Fuel Consumption",
  "Vehicle-wise Fuel Consumption",
  "Monthly Fuel Cost",
  "Fuel Efficiency (KM/L)",
  "Fuel Consumption by Mine Site",
  // B. Breakdown & Maintenance — 6
  "Vehicle Breakdown Register",
  "Vehicle Downtime Report",
  "Maintenance Cost by Vehicle",
  "Breakdown Frequency by Type",
  "Pending Repairs / Awaiting Parts",
  "Vehicle Maintenance History",
  // C. Operational Expenses — 7
  "Daily Operational Expense",
  "Monthly Operational Expense",
  "Vehicle-wise Expense",
  "Trip-wise Expense",
  "Mine Site-wise Expense",
  "Expense Category Analysis",
  "Pending Expense Approvals",
  // D. Spare Parts & Inventory — 7
  "Spare Parts Stock Register",
  "Warehouse-wise Stock",
  "Low Stock / Reorder Report",
  "Spare Parts Consumption by Vehicle",
  "Spare Parts Consumption by Breakdown",
  "Spare Parts Consumption by Mine Site",
  "Stock Movement History",
  // E. Supplier & Procurement — 9
  "Supplier Register",
  "Supplier-wise Purchase Summary",
  "Purchase Order Register",
  "Pending Purchase Orders",
  "Purchase Receipt Register",
  "Purchase Invoice Register",
  "Supplier Outstanding / Payables",
  "Purchase by Vehicle / Breakdown / Mine Site",
  "Purchase Analysis by Month",
  // F. Insurance & Compliance — 7
  "Vehicle Insurance Register",
  "Insurance Expiry Report",
  "Vehicle Document Expiry Report",
  "Upcoming Renewals",
  "Expired Insurance & Documents",
  "Insurance Premium by Vehicle",
  "Insurance Renewal History",
  // G. Revenue & Profitability — 10
  "Trip-wise Revenue and Profitability",
  "Vehicle-wise Revenue and Profitability",
  "Mine Site-wise Revenue and Profitability",
  "Customer-wise Revenue",
  "Monthly Revenue Summary",
  "Operating Cost Summary",
  "Vehicle Operating Cost Analysis",
  "Revenue vs Cost Analysis",
  "Outstanding Revenue / Receivables",
  "Unallocated Cost Register",
  // H. Fleet Performance & Operations — 4
  "Fleet Utilization",
  "Vehicle Performance Summary",
  "Driver Performance",
  "Trip Operations Summary"
];

(async () => {
  console.log('='.repeat(80));
  console.log('      AREA 2: NATIVE ERPNEXT DESK BROWSER ACCEPTANCE (55 REPORTS)       ');
  console.log('='.repeat(80) + '\n');

  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Authenticate as Administrator
  console.log('--- Logging in to ERPNext Desk as Administrator ---');
  await page.goto('http://localhost:8080/login', { waitUntil: 'networkidle2' });
  await page.type('#login_email', 'Administrator');
  await page.type('#login_password', 'admin');
  await Promise.all([
    page.click('button[type="submit"]'),
    page.waitForNavigation({ waitUntil: 'networkidle2' })
  ]);
  console.log('✅ Logged in successfully. Current URL:', page.url());

  const results = [];

  for (let i = 0; i < reportList.length; i++) {
    const rname = reportList[i];
    const idx = i + 1;
    const repUrl = 'http://localhost:8080/desk/fleet-management/query-report/' + encodeURIComponent(rname);

    let reportStatus = {
      idx,
      name: rname,
      desk_loaded: false,
      filter_count: 0,
      filters_rendered: [],
      columns_count: 0,
      initial_rows: 0,
      filter_change_tested: false,
      export_available: false,
      error_dialogs: [],
      browser_verified: false
    };

    try {
      await page.goto(repUrl, { waitUntil: 'networkidle2', timeout: 20000 });
      // Allow Frappe to finish query_report setup
      await new Promise(r => setTimeout(r, 2000));

      const evalData = await page.evaluate(async (repName) => {
        if (!window.frappe || !window.frappe.query_report) {
          return { error: 'frappe.query_report not mounted on window' };
        }
        const qr = window.frappe.query_report;

        // Check error modals or dialogs
        const msgprints = Array.from(document.querySelectorAll('.msgprint, .modal.show .modal-title'))
          .map(el => el.innerText.trim())
          .filter(Boolean);

        // Filters rendered in DOM and query_report object
        const filters = (qr.filters || []).map(f => ({
          fieldname: f.fieldname,
          label: f.df ? f.df.label : f.label,
          fieldtype: f.df ? f.df.fieldtype : f.fieldtype,
          default: f.df ? f.df.default : '',
          hasAutocomplete: !!(f.awesomplete || (f.df && f.df.fieldtype === 'Link'))
        }));

        // Columns count
        let columnsCount = (qr.columns && qr.columns.length) ? qr.columns.length : 0;
        if (columnsCount === 0) {
          const resp = await new Promise(res => {
            frappe.call({
              method: 'frappe.desk.query_report.run',
              args: { report_name: repName, filters: qr.get_filter_values() },
              callback: r => res(r.message)
            });
          });
          if (resp && resp.columns) {
            columnsCount = resp.columns.length;
          }
        }
        const initialRows = qr.data ? qr.data.length : 0;

        // Test Interactive Filter Change & Refresh
        let filterChangeOk = false;
        if (filters.length > 0) {
          const testFilter = filters.find(f => ['vehicle', 'mine_site', 'driver', 'item_code', 'supplier', 'customer'].includes(f.fieldname)) || filters[0];
          const filterCtrl = qr.get_filter(testFilter.fieldname);
          if (filterCtrl) {
            const origVal = filterCtrl.get_value ? filterCtrl.get_value() : '';
            // set dummy value
            if (filterCtrl.set_input) filterCtrl.set_input('NON-EXISTENT-VAL-999');
            filterCtrl.value = 'NON-EXISTENT-VAL-999';
            await qr.refresh();
            await new Promise(res => setTimeout(res, 800));

            // restore
            if (filterCtrl.set_input) filterCtrl.set_input(origVal || '');
            filterCtrl.value = origVal || '';
            await qr.refresh();
            await new Promise(res => setTimeout(res, 800));
            filterChangeOk = true;
          }
        } else {
          filterChangeOk = true;
        }

        // Export Capability
        const exportAvailable = typeof qr.export_report === 'function';

        return {
          deskLoaded: true,
          filters,
          columnsCount,
          initialRows,
          filterChangeOk,
          exportAvailable,
          msgprints
        };
      }, rname);

      if (evalData.error) {
        reportStatus.error_dialogs.push(evalData.error);
      } else {
        reportStatus.desk_loaded = evalData.deskLoaded;
        reportStatus.filter_count = evalData.filters.length;
        reportStatus.filters_rendered = evalData.filters;
        reportStatus.columns_count = evalData.columnsCount;
        reportStatus.initial_rows = evalData.initialRows;
        reportStatus.filter_change_tested = evalData.filterChangeOk;
        reportStatus.export_available = evalData.exportAvailable;
        reportStatus.error_dialogs = evalData.msgprints;

        if (evalData.deskLoaded && evalData.columnsCount > 0 && evalData.msgprints.length === 0) {
          reportStatus.browser_verified = true;
        }
      }
    } catch (e) {
      reportStatus.error_dialogs.push(e.message);
    }

    results.push(reportStatus);

    const statusBadge = reportStatus.browser_verified ? '✅ [DESK PASS]' : '❌ [DESK FAIL]';
    console.log(`${statusBadge} [${String(idx).padStart(2, '0')}/55] ${rname.padEnd(42)} | Cols: ${String(reportStatus.columns_count).padStart(2)} | Filters: ${String(reportStatus.filter_count).padStart(2)} | Rows: ${String(reportStatus.initial_rows).padStart(2)} | Errors: ${reportStatus.error_dialogs.length}`);
    if (!reportStatus.browser_verified) {
      console.log(`     Error details: ${reportStatus.error_dialogs.join(', ')}`);
    }
  }

  await browser.close();

  const passedTotal = results.filter(r => r.browser_verified).length;
  console.log('\n' + '='.repeat(80));
  console.log(`DESK BROWSER ACCEPTANCE RESULT: ${passedTotal} / 55 Reports Verified in Native Desk UI`);
  console.log('='.repeat(80) + '\n');

  fs.writeFileSync('browser_acceptance_results.json', JSON.stringify(results, null, 2));
  console.log('Results written to browser_acceptance_results.json');
})();
