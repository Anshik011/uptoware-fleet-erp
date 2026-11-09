def run():
    import frappe
    import frappe.desk.query_report as qr
    
    print("=== TESTING REPORTS WITH ACTIVE FILTERS ===")
    
    # Helper to ensure all report filter keys exist as Desk does
    def get_f(custom):
        base = {"from_date": "", "to_date": "", "vehicle": "", "driver": "", "mine_site": ""}
        base.update(custom)
        return base

    # 1. Test Date filter on Daily Fuel Consumption
    f1 = get_f({"from_date": "2026-11-01", "to_date": "2026-11-02"})
    r1 = qr.run(report_name="Daily Fuel Consumption", filters=f1)
    rows1 = r1.get("result", [])
    print(f"Daily Fuel Consumption with Date Filter (2026-11-01 to 2026-11-02): {len(rows1)} rows, Total L = {sum(float(r['total_quantity_(l)']) for r in rows1)}")
    assert len(rows1) == 1
    assert float(rows1[0]['total_quantity_(l)']) == 100.0
    
    # 2. Test Vehicle filter on Vehicle-wise Fuel Consumption (groups by vehicle, fuel_source -> 2 rows: Bowser & External Pump)
    f2 = get_f({"vehicle": "KA-19-MG-9001"})
    r2 = qr.run(report_name="Vehicle-wise Fuel Consumption", filters=f2)
    rows2 = r2.get("result", [])
    print(f"Vehicle-wise Fuel Consumption with Vehicle Filter: {len(rows2)} rows, Total L = {sum(float(r['total_quantity_(l)']) for r in rows2)}")
    assert len(rows2) == 2
    assert float(sum(float(r['total_quantity_(l)']) for r in rows2)) == 200.0
    
    # 3. Test Non-existent Vehicle filter
    f2_none = get_f({"vehicle": "NON-EXISTENT-VEHICLE"})
    r2_none = qr.run(report_name="Vehicle-wise Fuel Consumption", filters=f2_none)
    assert len(r2_none.get("result", [])) == 0
    print("Vehicle-wise with non-existent filter returned 0 rows correctly.")
    
    # 4. Test Fuel Efficiency with Vehicle filter
    f4 = get_f({"vehicle": "KA-19-MG-9001"})
    r4 = qr.run(report_name="Fuel Efficiency (KM/L)", filters=f4)
    rows4 = r4.get("result", [])
    print(f"Fuel Efficiency with Vehicle Filter: {len(rows4)} rows")
    assert len(rows4) == 2
    
    # 5. Test Fuel Consumption by Mine Site with Mine Site Filter
    f5 = get_f({"mine_site": "Kudremukh North Pit"})
    r5 = qr.run(report_name="Fuel Consumption by Mine Site", filters=f5)
    rows5 = r5.get("result", [])
    print(f"Fuel Consumption by Mine Site with Site Filter: {len(rows5)} rows, Total L = {sum(float(r['total_quantity_(l)']) for r in rows5)}")
    assert len(rows5) == 1
    assert float(rows5[0]['total_quantity_(l)']) == 200.0
    
    print("\nALL REPORT FILTERS FUNCTION ACCURATELY AND SAFELY WITHOUT SQL ERRORS!")

run()
