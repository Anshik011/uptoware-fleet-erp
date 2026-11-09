def test_reports():
    import frappe
    from frappe.desk.query_report import run

    report_names = [
        "Daily Operational Expense",
        "Monthly Operational Expense",
        "Vehicle-wise Expense",
        "Trip-wise Expense",
        "Mine Site-wise Expense",
        "Expense Category Analysis",
        "Pending Expense Approvals"
    ]

    print("=== TESTING ALL 7 BATCH 5 QUERY REPORTS ===")
    for r_name in report_names:
        try:
            filters = {
                "from_date": "2026-01-01",
                "to_date": "2026-12-31",
                "vehicle": "",
                "mining_trip": "",
                "mine_site": "",
                "driver": "",
                "expense_category": "",
                "approval_status": "",
                "accounting_status": ""
            }
            res = run(r_name, filters=filters)
            columns = res.get("columns", [])
            result = res.get("result", [])
            print(f"[PASS] Report '{r_name}': {len(columns)} columns, {len(result)} rows returned.")
        except Exception as e:
            print(f"[FAIL] Report '{r_name}': {e}")
            raise e

test_reports()
