import frappe
from frappe.desk.query_report import run

def test_daily_fuel():
    frappe.init("frontend")
    frappe.connect()

    rep = frappe.get_doc("Report", "Daily Fuel Consumption")
    rep.report_type = "Script Report"
    rep.report_script = """
f = filters if isinstance(filters, dict) else {}

params = {
    'from_date': f.get('from_date') or None,
    'to_date': f.get('to_date') or None,
    'vehicle': f.get('vehicle') or None,
    'driver': f.get('driver') or None,
    'mine_site': f.get('mine_site') or None,
    'is_test_record': 0
}

if params['from_date'] and params['to_date'] and str(params['from_date']) > str(params['to_date']):
    data = [None, []]
else:
    columns = [
        {"fieldname": "fuel_date", "label": "Date", "fieldtype": "Date", "width": 110},
        {"fieldname": "total_qty", "label": "Total Quantity (L)", "fieldtype": "Float", "width": 140},
        {"fieldname": "total_cost", "label": "Total Fuel Cost", "fieldtype": "Currency", "width": 150},
        {"fieldname": "approved_entries", "label": "Approved Entries", "fieldtype": "Int", "width": 120},
        {"fieldname": "avg_rate", "label": "Avg Rate per Litre", "fieldtype": "Currency", "width": 140}
    ]
    query = '''SELECT
    fl.fuel_date,
    ROUND(SUM(fl.quantity_litres), 2) AS total_qty,
    ROUND(SUM(fl.total_fuel_cost), 2) AS total_cost,
    COUNT(fl.name) AS approved_entries,
    ROUND(SUM(fl.total_fuel_cost) / NULLIF(SUM(fl.quantity_litres), 0), 2) AS avg_rate
FROM `tabFuel Log` fl
WHERE fl.is_test_record = %(is_test_record)s
  AND fl.approval_status = 'Approved'
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR fl.fuel_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR fl.fuel_date <= %(to_date)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR fl.vehicle = %(vehicle)s)
  AND (%(driver)s IS NULL OR %(driver)s = '' OR fl.driver = %(driver)s)
  AND (%(mine_site)s IS NULL OR %(mine_site)s = '' OR fl.mine_site = %(mine_site)s)
GROUP BY fl.fuel_date
ORDER BY fl.fuel_date DESC'''
    res = frappe.db.sql(query, params, as_dict=True)
    data = [columns, res]
"""
    rep.save(ignore_permissions=True)
    frappe.db.commit()

    print("=== TESTING Daily Fuel Consumption as Script Report ===")
    print("1. No filters ({}):")
    r1 = run("Daily Fuel Consumption", filters={})
    print(f"   Success! Result rows: {len(r1.get('result', []))}")
    if r1.get('result'):
        print("   Sample row:", r1.get('result')[0])

    print("\n2. Vehicle filter only:")
    r2 = run("Daily Fuel Consumption", filters={"vehicle": "KA-19-B12-9901"})
    print(f"   Success! Result rows: {len(r2.get('result', []))}")

    print("\n3. Date range only:")
    r3 = run("Daily Fuel Consumption", filters={"from_date": "2026-11-01", "to_date": "2026-11-05"})
    print(f"   Success! Result rows: {len(r3.get('result', []))}")

    print("\n4. Reversed date range:")
    r4 = run("Daily Fuel Consumption", filters={"from_date": "2026-11-05", "to_date": "2026-11-01"})
    print(f"   Success! Result rows: {len(r4.get('result', []))}")

if __name__ == "__main__":
    test_daily_fuel()
