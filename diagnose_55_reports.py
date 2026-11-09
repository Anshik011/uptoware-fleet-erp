import frappe
from frappe.desk.query_report import run

def diagnose_reports():
    frappe.init("frontend")
    frappe.connect()

    report_list = [
        # A. Fuel Management — 5
        "Daily Fuel Consumption",
        "Vehicle-wise Fuel Consumption",
        "Monthly Fuel Cost",
        "Fuel Efficiency (KM/L)",
        "Fuel Consumption by Mine Site",
        # B. Breakdown & Maintenance — 6
        "Vehicle Breakdown Register",
        "Vehicle Downtime Report",
        "Maintenance Cost by Vehicle",
        "Breakdown Frequency by Type",
        "Pending Repairs / Awaiting Parts",
        "Vehicle Maintenance History",
        # C. Operational Expenses — 7
        "Daily Operational Expense",
        "Monthly Operational Expense",
        "Vehicle-wise Expense",
        "Trip-wise Expense",
        "Mine Site-wise Expense",
        "Expense Category Analysis",
        "Pending Expense Approvals",
        # D. Spare Parts & Inventory — 7
        "Spare Parts Stock Register",
        "Warehouse-wise Stock",
        "Low Stock / Reorder Report",
        "Spare Parts Consumption by Vehicle",
        "Spare Parts Consumption by Breakdown",
        "Spare Parts Consumption by Mine Site",
        "Stock Movement History",
        # E. Supplier & Procurement — 9
        "Supplier Register",
        "Supplier-wise Purchase Summary",
        "Purchase Order Register",
        "Pending Purchase Orders",
        "Purchase Receipt Register",
        "Purchase Invoice Register",
        "Supplier Outstanding / Payables",
        "Purchase by Vehicle / Breakdown / Mine Site",
        "Purchase Analysis by Month",
        # F. Insurance & Compliance — 7
        "Vehicle Insurance Register",
        "Insurance Expiry Report",
        "Vehicle Document Expiry Report",
        "Upcoming Renewals",
        "Expired Insurance & Documents",
        "Insurance Premium by Vehicle",
        "Insurance Renewal History",
        # G. Revenue & Profitability — 10
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
        # H. Fleet Performance & Operations — 4
        "Fleet Utilization",
        "Vehicle Performance Summary",
        "Driver Performance",
        "Trip Operations Summary"
    ]

    print("=" * 80)
    print(f"DIAGNOSING ALL {len(report_list)} FLEET MANAGEMENT REPORTS")
    print("=" * 80)

    # 1. Check existence in tabReport
    existing_reports = frappe.db.sql("""
        SELECT name, report_type, ref_doctype, is_standard, disabled
        FROM `tabReport`
        WHERE name IN %s
    """, (tuple(report_list),), as_dict=True)

    existing_map = {r['name']: r for r in existing_reports}
    print(f"Reports found in tabReport: {len(existing_reports)} / {len(report_list)}")

    missing = [r for r in report_list if r not in existing_map]
    if missing:
        print(f"WARNING: Reports NOT in tabReport ({len(missing)}): {missing}")

    # 2. Test execution of each report with empty filters {}
    print("\n--- TESTING EXECUTION WITH EMPTY FILTERS ({}) ---")
    failing = []
    passing = []

    for idx, rname in enumerate(report_list, 1):
        if rname not in existing_map:
            print(f"[{idx:02d}/55] ❌ {rname}: NOT IN DATABASE")
            failing.append((rname, "NOT_IN_DB", "Report record not found in tabReport"))
            continue

        rep_meta = existing_map[rname]
        rpt_type = rep_meta.get('report_type')

        try:
            # Execute exactly as Desk does
            res = run(rname, filters={})
            columns = res.get('columns', [])
            result = res.get('result', [])
            print(f"[{idx:02d}/55] ✅ {rname} ({rpt_type}): SUCCESS (Cols: {len(columns)}, Rows: {len(result)})")
            passing.append((rname, rpt_type, len(columns), len(result)))
        except Exception as e:
            err_msg = str(e)
            print(f"[{idx:02d}/55] ❌ {rname} ({rpt_type}): FAILED -> {err_msg[:120]}")
            failing.append((rname, rpt_type, err_msg))

    print("\n" + "=" * 80)
    print(f"EXECUTION SUMMARY WITH EMPTY FILTERS:")
    print(f"  PASSING: {len(passing)} / {len(report_list)}")
    print(f"  FAILING: {len(failing)} / {len(report_list)}")
    print("=" * 80)

    if failing:
        print("\nDETAILED FAILURES:")
        for rname, rpt_type, err in failing:
            print(f"--- {rname} ({rpt_type}) ---")
            print(f"Error: {err}\n")

if __name__ == "__main__":
    diagnose_reports()

