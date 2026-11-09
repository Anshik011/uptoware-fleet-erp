import frappe

def run():
    from frappe.desk.query_report import run as run_report
    print("=== VERIFYING EXECUTION OF ALL 10 BATCH 9 QUERY REPORTS ===")
    
    reports = [
        ("Trip-wise Revenue and Profitability", {"vehicle": "", "mine_site": "", "trip_status": "", "billing_status": "", "from_date": "", "to_date": ""}),
        ("Vehicle-wise Revenue and Profitability", {"vehicle": "", "make": "", "from_date": "", "to_date": ""}),
        ("Mine Site-wise Revenue and Profitability", {"mine_site": "", "customer": "", "from_date": "", "to_date": ""}),
        ("Customer-wise Revenue", {"customer": "", "from_date": "", "to_date": ""}),
        ("Monthly Revenue Summary", {"year": "2026", "customer": ""}),
        ("Operating Cost Summary", {"from_date": "", "to_date": ""}),
        ("Vehicle Operating Cost Analysis", {"vehicle": "", "from_date": "", "to_date": ""}),
        ("Revenue vs Cost Analysis", {"vehicle": "", "from_date": "", "to_date": ""}),
        ("Outstanding Revenue / Receivables", {"customer": "", "from_date": "", "to_date": ""}),
        ("Unallocated Cost Register", {"expense_category": "", "from_date": "", "to_date": ""})
    ]

    for r_name, filters in reports:
        try:
            res = run_report(r_name, filters=filters)
            cols = res.get("columns", [])
            data = res.get("result", [])
            print(f"[OK] Report '{r_name}' executed cleanly | Columns: {len(cols)}, Rows: {len(data)}")
        except Exception as e:
            print(f"[ERROR] Report '{r_name}' failed: {e}")

if __name__ == "__main__":
    run()
