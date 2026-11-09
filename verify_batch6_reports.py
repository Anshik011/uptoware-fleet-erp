def run():
    import frappe
    from frappe.desk.query_report import run as run_report

    print("=== TESTING ALL 7 BATCH 6 QUERY REPORTS ===")
    reports = [
        "Spare Parts Stock Register",
        "Warehouse-wise Stock",
        "Low Stock / Reorder Report",
        "Spare Parts Consumption by Vehicle",
        "Spare Parts Consumption by Breakdown",
        "Spare Parts Consumption by Mine Site",
        "Stock Movement History"
    ]

    filters = {
        "from_date": "2026-01-01",
        "to_date": "2026-12-31",
        "warehouse": "",
        "item_group": "",
        "item_code": "",
        "brand": "",
        "company": "Uptoware",
        "preferred_supplier": "",
        "show_all": "1",
        "vehicle": "",
        "breakdown_type": "",
        "mine_site": "",
        "voucher_type": ""
    }

    for r_name in reports:
        try:
            res = run_report(r_name, filters=filters)
            cols = res.get("columns", [])
            data = res.get("result", [])
            print(f"[PASS] Report '{r_name}': {len(cols)} columns, {len(data)} rows.")
        except Exception as e:
            print(f"[FAIL] Report '{r_name}': {e}")
            raise e

run()

