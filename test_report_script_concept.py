import frappe
from frappe.desk.query_report import run
from frappe.utils.safe_exec import safe_exec

def test_concept():
    frappe.init("frontend")
    frappe.connect()

    script = """
f = filters if isinstance(filters, dict) else {}

params = {
    "from_date": f.get("from_date") or None,
    "to_date": f.get("to_date") or None,
    "vehicle": f.get("vehicle") or None,
    "driver": f.get("driver") or None,
    "mine_site": f.get("mine_site") or None
}

query = '''
SELECT
    fl.fuel_date AS "Date:Date:110",
    ROUND(SUM(fl.quantity_litres), 2) AS "Total Quantity (L):Float:140",
    ROUND(SUM(fl.total_fuel_cost), 2) AS "Total Fuel Cost:Currency:150",
    COUNT(fl.name) AS "Approved Entries:Int:120",
    ROUND(SUM(fl.total_fuel_cost) / NULLIF(SUM(fl.quantity_litres), 0), 2) AS "Avg Rate per Litre:Currency:140"
FROM `tabFuel Log` fl
WHERE fl.is_test_record = 0
  AND fl.approval_status = 'Approved'
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR fl.fuel_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR fl.fuel_date <= %(to_date)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR fl.vehicle = %(vehicle)s)
  AND (%(driver)s IS NULL OR %(driver)s = '' OR fl.driver = %(driver)s)
  AND (%(mine_site)s IS NULL OR %(mine_site)s = '' OR fl.mine_site = %(mine_site)s)
GROUP BY fl.fuel_date
ORDER BY fl.fuel_date DESC
'''

data = frappe.db.sql(query, params, as_list=True)

# Return data
data = [None, data]
"""

    # Test via safe_exec with empty filters {}
    loc = {"filters": {}, "data": None, "result": None}
    safe_exec(script, None, loc)
    print("Execution with {} ->", loc["data"])

    # Test via safe_exec with partial filters
    loc2 = {"filters": {"vehicle": "KA-19-B12-9901"}, "data": None, "result": None}
    safe_exec(script, None, loc2)
    print("Execution with vehicle ->", loc2["data"])

if __name__ == "__main__":
    test_concept()
