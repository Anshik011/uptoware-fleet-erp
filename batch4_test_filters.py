def run():
    import frappe
    import frappe.desk.query_report as qr
    
    print("=== TESTING BATCH 4 REPORTS WITH ACTIVE FILTERS ===")
    
    def get_f(custom):
        base = {"from_date": "", "to_date": "", "vehicle": "", "breakdown_type": "", "repair_status": ""}
        base.update(custom)
        return base

    # 1. Filter by breakdown_type = 'Hydraulic' on Register
    f1 = get_f({"breakdown_type": "Hydraulic"})
    r1 = qr.run(report_name="Vehicle Breakdown Register", filters=f1)
    rows1 = r1.get("result", [])
    print(f"Vehicle Breakdown Register with Type='Hydraulic': {len(rows1)} rows, Cost = ₹{sum(float(r['total_cost']) for r in rows1)}")
    assert len(rows1) == 1
    assert float(rows1[0]['total_cost']) == 4000.0

    # 2. Filter by repair_status = 'In Workshop' on Register
    f2 = get_f({"repair_status": "In Workshop"})
    r2 = qr.run(report_name="Vehicle Breakdown Register", filters=f2)
    rows2 = r2.get("result", [])
    print(f"Vehicle Breakdown Register with Status='In Workshop': {len(rows2)} rows")
    assert len(rows2) == 1
    assert rows2[0]['type'] == "Tyre"

    # 3. Filter by vehicle = 'KA-19-MG-9001' on Maintenance Cost
    f3 = get_f({"vehicle": "KA-19-MG-9001"})
    r3 = qr.run(report_name="Maintenance Cost by Vehicle", filters=f3)
    rows3 = r3.get("result", [])
    print(f"Maintenance Cost by Vehicle with Vehicle filter: {len(rows3)} rows, Total = ₹{rows3[0]['total_maintenance_cost']}")
    assert len(rows3) == 1
    assert float(rows3[0]['total_maintenance_cost']) == 6000.0

    # 4. Filter by non-existent vehicle
    f4 = get_f({"vehicle": "NON-EXISTENT-VEH"})
    r4 = qr.run(report_name="Maintenance Cost by Vehicle", filters=f4)
    assert len(r4.get("result", [])) == 0
    print("Maintenance Cost by Vehicle with non-existent vehicle returned 0 rows correctly.")

    print("\nALL BATCH 4 REPORT FILTERS FUNCTION ACCURATELY WITHOUT SQL ERRORS!")

run()
