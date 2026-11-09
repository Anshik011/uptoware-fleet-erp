def run():
    import frappe
    import frappe.desk.query_report as qr
    
    print("=== TESTING ALL 5 FUEL MANAGEMENT REPORTS ===")
    report_names = [
        "Daily Fuel Consumption",
        "Vehicle-wise Fuel Consumption",
        "Monthly Fuel Cost",
        "Fuel Efficiency (KM/L)",
        "Fuel Consumption by Mine Site"
    ]
    
    empty_filters = {
        "from_date": "",
        "to_date": "",
        "vehicle": "",
        "driver": "",
        "mine_site": ""
    }
    
    for rname in report_names:
        res = qr.run(report_name=rname, filters=empty_filters)
        print(f"Report: {rname} -> OK! {len(res.get('columns', []))} columns parsed.")

run()
