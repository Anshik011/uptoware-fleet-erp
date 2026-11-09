import frappe
from frappe.desk.query_report import run as run_report

def verify():
    import frappe
    from frappe.desk.query_report import run as run_report
    print("=== VERIFYING BATCH 7 REPORTS ===")
    reports = [
        "Supplier Register",
        "Supplier-wise Purchase Summary",
        "Purchase Order Register",
        "Pending Purchase Orders",
        "Purchase Receipt Register",
        "Purchase Invoice Register",
        "Supplier Outstanding / Payables",
        "Item-wise Purchase History",
        "Purchase by Vehicle / Breakdown / Mine Site",
        "Purchase Analysis by Month"
    ]
    f = {
        "company": "Uptoware",
        "from_date": "2026-01-01",
        "to_date": "2026-12-31",
        "supplier": "",
        "supplier_group": "",
        "disabled": "",
        "vehicle": "",
        "breakdown": "",
        "mine_site": "",
        "warehouse": "",
        "procurement_type": "",
        "status": "",
        "item_code": "",
        "item_group": ""
    }
    for r in reports:
        try:
            res = run_report(r, filters=f)
            cols = len(res.get("columns", []))
            rows = len(res.get("result", []))
            print(f"[OK] Report '{r}': {cols} cols, {rows} rows")
        except Exception as e:
            print(f"[FAIL] Report '{r}': {e}")

if __name__ == '__main__':
    verify()
