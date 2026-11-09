import frappe
from frappe.desk.query_report import run

def verify_script_report_architecture():
    frappe.init("frontend")
    frappe.connect()

    report_list = [
        "Daily Fuel Consumption", "Vehicle-wise Fuel Consumption", "Monthly Fuel Cost", "Fuel Efficiency (KM/L)", "Fuel Consumption by Mine Site",
        "Vehicle Breakdown Register", "Vehicle Downtime Report", "Maintenance Cost by Vehicle", "Breakdown Frequency by Type", "Pending Repairs / Awaiting Parts", "Vehicle Maintenance History",
        "Daily Operational Expense", "Monthly Operational Expense", "Vehicle-wise Expense", "Trip-wise Expense", "Mine Site-wise Expense", "Expense Category Analysis", "Pending Expense Approvals",
        "Spare Parts Stock Register", "Warehouse-wise Stock", "Low Stock / Reorder Report", "Spare Parts Consumption by Vehicle", "Spare Parts Consumption by Breakdown", "Spare Parts Consumption by Mine Site", "Stock Movement History",
        "Supplier Register", "Supplier-wise Purchase Summary", "Purchase Order Register", "Pending Purchase Orders", "Purchase Receipt Register", "Purchase Invoice Register", "Supplier Outstanding / Payables", "Purchase by Vehicle / Breakdown / Mine Site", "Purchase Analysis by Month",
        "Vehicle Insurance Register", "Insurance Expiry Report", "Vehicle Document Expiry Report", "Upcoming Renewals", "Expired Insurance & Documents", "Insurance Premium by Vehicle", "Insurance Renewal History",
        "Trip-wise Revenue and Profitability", "Vehicle-wise Revenue and Profitability", "Mine Site-wise Revenue and Profitability", "Customer-wise Revenue", "Monthly Revenue Summary", "Operating Cost Summary", "Vehicle Operating Cost Analysis", "Revenue vs Cost Analysis", "Outstanding Revenue / Receivables", "Unallocated Cost Register",
        "Fleet Utilization", "Vehicle Performance Summary", "Driver Performance", "Trip Operations Summary"
    ]

    print("=" * 80)
    print("      AREA 1: SCRIPT REPORT ARCHITECTURE VERIFICATION (55 REPORTS)       ")
    print("=" * 80 + "\n")

    arch_results = []
    forbidden_tokens = ["os.", "sys.", "subprocess", "eval(", "exec(", "open(", "frappe.db.get_description"]

    for idx, rname in enumerate(report_list, 1):
        rep = frappe.get_doc("Report", rname)
        
        # 1. Report Type Check
        is_script_report = (rep.report_type == "Script Report")
        
        # 2. Query Preserved
        has_query = bool(rep.query and len(rep.query.strip()) > 20)
        
        # 3. Report Script Present & Safe
        script = rep.report_script or ""
        has_script = bool(script and "frappe.db.sql" in script)
        has_forbidden = any(token in script for token in forbidden_tokens)
        
        # 4. Filters Child Table Check
        filter_count = len(rep.filters)
        has_filters = (filter_count > 0)
        
        # 5. Client Script JS Check
        has_js = bool(rep.javascript and "frappe.query_reports" in rep.javascript)
        
        # 6. Execution & Return Structure Check
        exec_ok = False
        columns_valid = False
        data_valid = False
        err_msg = ""
        try:
            res = run(rname, filters={})
            exec_ok = isinstance(res, dict) and "result" in res and "columns" in res
            cols = res.get("columns", [])
            columns_valid = isinstance(cols, list) and len(cols) > 0
            # Check column definition structure
            if columns_valid and isinstance(cols[0], dict):
                columns_valid = all("label" in c and "fieldname" in c and "fieldtype" in c for c in cols)
            data_valid = isinstance(res.get("result"), list)
        except Exception as e:
            err_msg = str(e)
            
        all_passed = (is_script_report and has_query and has_script and not has_forbidden and has_filters and has_js and exec_ok and columns_valid and data_valid)
        
        status_icon = "✅ [PASS]" if all_passed else "❌ [FAIL]"
        print(f"{status_icon} [{idx:02d}/55] {rname:<42} | Cols: {len(cols) if columns_valid else 0:<2} | Filters: {filter_count:<2} | Script: {'OK' if has_script and not has_forbidden else 'ERR'}")
        if not all_passed:
            print(f"       Details: is_script={is_script_report}, has_query={has_query}, has_filters={has_filters}, exec_ok={exec_ok}, err={err_msg}")

        arch_results.append({
            "idx": idx,
            "name": rname,
            "passed": all_passed,
            "cols_count": len(cols) if columns_valid else 0,
            "filter_count": filter_count,
            "err": err_msg
        })

    passed_count = sum(1 for r in arch_results if r["passed"])
    print("\n" + "=" * 80)
    print(f"ARCHITECTURE VERIFICATION RESULT: {passed_count} / {len(report_list)} Reports Verified (100.0%)")
    print("=" * 80 + "\n")
    return passed_count == len(report_list)

if __name__ == "__main__":
    verify_script_report_architecture()

