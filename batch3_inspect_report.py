def test():
    import frappe
    import frappe.desk.query_report as qr
    
    rep_name = "Test Fuel Report"
    if frappe.db.exists("Report", rep_name):
        frappe.delete_doc("Report", rep_name, force=True)
    
    rep = frappe.get_doc({
        "doctype": "Report",
        "report_name": rep_name,
        "ref_doctype": "Fuel Log",
        "report_type": "Query Report",
        "module": "Fleet Management",
        "is_standard": "No",
        "filters": [
            {"fieldname": "vehicle", "label": "Vehicle", "fieldtype": "Link", "options": "Vehicle", "default": ""},
            {"fieldname": "mine_site", "label": "Mine Site", "fieldtype": "Link", "options": "Mine Site", "default": ""}
        ],
        "query": """SELECT
            fl.name AS "Fuel Log:Link/Fuel Log:140",
            fl.fuel_date AS "Date:Date:110",
            fl.vehicle AS "Vehicle:Link/Vehicle:140",
            fl.quantity_litres AS "Quantity (L):Float:120",
            fl.total_fuel_cost AS "Total Cost:Currency:120"
        FROM `tabFuel Log` fl
        WHERE fl.is_test_record = 0
          AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR fl.vehicle = %(vehicle)s)
          AND (%(mine_site)s IS NULL OR %(mine_site)s = '' OR fl.mine_site = %(mine_site)s)
        """
    })
    rep.insert(ignore_permissions=True)
    
    try:
        res2 = qr.run(report_name=rep_name)
        print("Run with default qr.run():", res2.get("columns"))
    except Exception as e:
        print("Error with default qr.run():", type(e), e)
    
    frappe.delete_doc("Report", rep_name, force=True)
    frappe.db.commit()

test()
