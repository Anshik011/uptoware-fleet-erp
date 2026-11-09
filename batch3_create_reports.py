import frappe

def run():
    print("=== UPDATING BATCH 3 FUEL MANAGEMENT REPORTS (APPROVED RECORDS ONLY) ===")

    filter_def = [
        {"fieldname": "from_date", "label": "From Date", "fieldtype": "Date"},
        {"fieldname": "to_date", "label": "To Date", "fieldtype": "Date"},
        {"fieldname": "vehicle", "label": "Vehicle", "fieldtype": "Link", "options": "Vehicle"},
        {"fieldname": "driver", "label": "Driver", "fieldtype": "Link", "options": "Driver"},
        {"fieldname": "mine_site", "label": "Mine Site", "fieldtype": "Link", "options": "Mine Site"}
    ]

    roles_list = [
        {"role": "System Manager"},
        {"role": "Fleet Manager"},
        {"role": "Weighbridge Operator"},
        {"role": "Accountant"},
        {"role": "Driver"}
    ]

    reports = [
        {
            "report_name": "Daily Fuel Consumption",
            "query": """SELECT
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
ORDER BY fl.fuel_date DESC"""
        },
        {
            "report_name": "Vehicle-wise Fuel Consumption",
            "query": """SELECT
    fl.vehicle AS "Vehicle:Link/Vehicle:140",
    fl.fuel_source AS "Fuel Source:Data:120",
    ROUND(SUM(fl.quantity_litres), 2) AS "Total Quantity (L):Float:140",
    ROUND(SUM(fl.total_fuel_cost), 2) AS "Total Cost:Currency:140",
    SUM(IFNULL(fl.distance_travelled_km, 0)) AS "Total Distance (KM):Int:150",
    ROUND(SUM(IFNULL(fl.distance_travelled_km, 0)) / NULLIF(SUM(CASE WHEN IFNULL(fl.distance_travelled_km, 0) > 0 THEN fl.quantity_litres ELSE 0 END), 0), 2) AS "Avg Interval KM/L:Float:150",
    COUNT(fl.name) AS "Refuel Count:Int:100"
FROM `tabFuel Log` fl
WHERE fl.is_test_record = 0
  AND fl.approval_status = 'Approved'
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR fl.fuel_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR fl.fuel_date <= %(to_date)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR fl.vehicle = %(vehicle)s)
  AND (%(driver)s IS NULL OR %(driver)s = '' OR fl.driver = %(driver)s)
  AND (%(mine_site)s IS NULL OR %(mine_site)s = '' OR fl.mine_site = %(mine_site)s)
GROUP BY fl.vehicle, fl.fuel_source
ORDER BY fl.vehicle ASC"""
        },
        {
            "report_name": "Monthly Fuel Cost",
            "query": """SELECT
    LEFT(fl.fuel_date, 7) AS "Month:Data:120",
    ROUND(SUM(fl.quantity_litres), 2) AS "Total Litres:Float:130",
    ROUND(SUM(fl.total_fuel_cost), 2) AS "Total Fuel Cost:Currency:150",
    ROUND(SUM(CASE WHEN fl.fuel_source = 'Site Bowser' THEN fl.total_fuel_cost ELSE 0 END), 2) AS "Bowser Cost:Currency:140",
    ROUND(SUM(CASE WHEN fl.fuel_source = 'External Pump' THEN fl.total_fuel_cost ELSE 0 END), 2) AS "External Pump Cost:Currency:150",
    COUNT(fl.name) AS "Approved Entries:Int:120"
FROM `tabFuel Log` fl
WHERE fl.is_test_record = 0
  AND fl.approval_status = 'Approved'
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR fl.fuel_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR fl.fuel_date <= %(to_date)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR fl.vehicle = %(vehicle)s)
  AND (%(driver)s IS NULL OR %(driver)s = '' OR fl.driver = %(driver)s)
  AND (%(mine_site)s IS NULL OR %(mine_site)s = '' OR fl.mine_site = %(mine_site)s)
GROUP BY LEFT(fl.fuel_date, 7)
ORDER BY `Month:Data:120` DESC"""
        },
        {
            "report_name": "Fuel Efficiency (KM/L)",
            "query": """SELECT
    fl.name AS "Fuel Log:Link/Fuel Log:130",
    fl.fuel_date AS "Date:Date:100",
    fl.vehicle AS "Vehicle:Link/Vehicle:130",
    fl.driver AS "Driver:Link/Driver:130",
    fl.mine_site AS "Mine Site:Link/Mine Site:140",
    fl.is_full_tank AS "Full Tank:Check:80",
    fl.odometer_reading_km AS "Odometer (KM):Int:120",
    fl.previous_odometer_km AS "Prev Odometer (KM):Int:130",
    fl.distance_travelled_km AS "Distance (KM):Int:120",
    fl.quantity_litres AS "Quantity (L):Float:110",
    fl.km_per_litre AS "Estimated KM/L:Float:130",
    fl.total_fuel_cost AS "Cost:Currency:120",
    fl.efficiency_note AS "Calculation Basis:Data:220"
FROM `tabFuel Log` fl
WHERE fl.is_test_record = 0
  AND fl.approval_status = 'Approved'
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR fl.fuel_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR fl.fuel_date <= %(to_date)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR fl.vehicle = %(vehicle)s)
  AND (%(driver)s IS NULL OR %(driver)s = '' OR fl.driver = %(driver)s)
  AND (%(mine_site)s IS NULL OR %(mine_site)s = '' OR fl.mine_site = %(mine_site)s)
ORDER BY fl.fuel_date DESC, fl.odometer_reading_km DESC"""
        },
        {
            "report_name": "Fuel Consumption by Mine Site",
            "query": """SELECT
    IFNULL(fl.mine_site, 'Unassigned') AS "Mine Site:Link/Mine Site:160",
    ROUND(SUM(fl.quantity_litres), 2) AS "Total Quantity (L):Float:140",
    ROUND(SUM(CASE WHEN fl.fuel_source = 'Site Bowser' THEN fl.quantity_litres ELSE 0 END), 2) AS "Bowser (L):Float:130",
    ROUND(SUM(CASE WHEN fl.fuel_source = 'External Pump' THEN fl.quantity_litres ELSE 0 END), 2) AS "External Pump (L):Float:140",
    ROUND(SUM(fl.total_fuel_cost), 2) AS "Total Cost:Currency:140",
    COUNT(fl.name) AS "Approved Refuels:Int:120"
FROM `tabFuel Log` fl
WHERE fl.is_test_record = 0
  AND fl.approval_status = 'Approved'
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR fl.fuel_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR fl.fuel_date <= %(to_date)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR fl.vehicle = %(vehicle)s)
  AND (%(driver)s IS NULL OR %(driver)s = '' OR fl.driver = %(driver)s)
  AND (%(mine_site)s IS NULL OR %(mine_site)s = '' OR fl.mine_site = %(mine_site)s)
GROUP BY fl.mine_site
ORDER BY `Total Quantity (L):Float:140` DESC"""
        }
    ]

    for r_data in reports:
        rep_name = r_data["report_name"]
        
        js_code = f"""frappe.query_reports["{rep_name}"] = {{
    "filters": [
        {{"fieldname": "from_date", "label": __("From Date"), "fieldtype": "Date"}},
        {{"fieldname": "to_date", "label": __("To Date"), "fieldtype": "Date"}},
        {{"fieldname": "vehicle", "label": __("Vehicle"), "fieldtype": "Link", "options": "Vehicle"}},
        {{"fieldname": "driver", "label": __("Driver"), "fieldtype": "Link", "options": "Driver"}},
        {{"fieldname": "mine_site", "label": __("Mine Site"), "fieldtype": "Link", "options": "Mine Site"}}
    ]
}};
"""

        doc_dict = {
            "doctype": "Report",
            "report_name": rep_name,
            "ref_doctype": "Fuel Log",
            "report_type": "Query Report",
            "module": "Fleet Management",
            "is_standard": "No",
            "disabled": 0,
            "query": r_data["query"],
            "javascript": js_code
        }

        if frappe.db.exists("Report", rep_name):
            rep_doc = frappe.get_doc("Report", rep_name)
            rep_doc.query = r_data["query"]
            rep_doc.javascript = js_code
            rep_doc.filters = []
            for f in filter_def:
                rep_doc.append("filters", f)
            rep_doc.roles = []
            for role in roles_list:
                rep_doc.append("roles", role)
            rep_doc.save(ignore_permissions=True)
            print(f"Updated Report: {rep_name}")
        else:
            rep_doc = frappe.get_doc(doc_dict)
            for f in filter_def:
                rep_doc.append("filters", f)
            for role in roles_list:
                rep_doc.append("roles", role)
            rep_doc.insert(ignore_permissions=True)
            print(f"Created Report: {rep_name}")

    frappe.clear_cache(doctype="Report")
    frappe.clear_cache()
    frappe.db.commit()
    print("SUCCESS: All 5 Fuel Management Reports updated with Approved-only filtering.")

run()
