def run():
    import frappe
    import frappe.desk.query_report as qr
    from frappe.model.workflow import apply_workflow
    
    print("=== POPULATING CONTROLLED FUEL DATA & VERIFYING ALL 5 REPORTS ===")

    veh_plate = "KA-19-MG-9001"
    if not frappe.db.exists("Vehicle", veh_plate):
        veh = frappe.get_doc({
            "doctype": "Vehicle",
            "license_plate": veh_plate,
            "make": "Tata",
            "model": "Prima 3530.K",
            "fuel_type": "Diesel",
            "uom": "Nos",
            "vehicle_status": "Active",
            "last_odometer": 80000,
            "is_test_record": 0
        }).insert(ignore_permissions=True)
    else:
        veh = frappe.get_doc("Vehicle", veh_plate)
        veh.is_test_record = 0
        veh.save(ignore_permissions=True)
        frappe.db.set_value("Vehicle", veh_plate, "last_odometer", 80000)

    drv_name = "Rajesh Kumar"
    drv_id = frappe.db.get_value("Driver", {"full_name": drv_name}, "name")
    if not drv_id:
        d = frappe.get_doc({
            "doctype": "Driver",
            "full_name": drv_name,
            "status": "Active",
            "license_number": "DL-042018009124",
            "is_test_record": 0
        }).insert(ignore_permissions=True)
        drv_id = d.name

    site_name = "Kudremukh North Pit"
    if not frappe.db.exists("Mine Site", site_name):
        s = frappe.get_doc({
            "doctype": "Mine Site",
            "site_name": site_name,
            "site_code": "KNP-01",
            "status": "Operational",
            "is_test_record": 0
        }).insert(ignore_permissions=True)

    # Clean existing non-test fuel logs for this vehicle
    frappe.db.delete("Fuel Log", {"vehicle": veh_plate})
    frappe.db.commit()

    # 1. Create Log A: Approved Fuel Log at 80,100 KM (Baseline)
    log_a = frappe.get_doc({
        "doctype": "Fuel Log",
        "fuel_date": "2026-11-01",
        "vehicle": veh_plate,
        "driver": drv_id,
        "mine_site": site_name,
        "fuel_source": "Site Bowser",
        "quantity_litres": 100.0,
        "rate_per_litre": 90.0, # Cost = 9,000
        "odometer_reading_km": 80100,
        "is_full_tank": 1,
        "is_test_record": 0
    }).insert(ignore_permissions=True)
    apply_workflow(log_a, "Approve")

    # 2. Create Log B: Approved Fuel Log at 80,600 KM (Distance = 500 KM, Qty = 100 L, KM/L = 5.0)
    log_b = frappe.get_doc({
        "doctype": "Fuel Log",
        "fuel_date": "2026-11-03",
        "vehicle": veh_plate,
        "driver": drv_id,
        "mine_site": site_name,
        "fuel_source": "External Pump",
        "quantity_litres": 100.0,
        "rate_per_litre": 92.0, # Cost = 9,200
        "odometer_reading_km": 80600,
        "is_full_tank": 1,
        "is_test_record": 0
    }).insert(ignore_permissions=True)
    apply_workflow(log_b, "Approve")

    # 3. Create Log C: DRAFT Fuel Log at 80,900 KM (Must NOT be counted in totals!)
    log_c = frappe.get_doc({
        "doctype": "Fuel Log",
        "fuel_date": "2026-11-04",
        "vehicle": veh_plate,
        "driver": drv_id,
        "mine_site": site_name,
        "fuel_source": "Site Bowser",
        "quantity_litres": 50.0,
        "rate_per_litre": 90.0, # Cost = 4,500 (Draft - excluded!)
        "odometer_reading_km": 80900,
        "is_full_tank": 0,
        "is_test_record": 0
    }).insert(ignore_permissions=True)

    # 4. Create Log D: REJECTED Fuel Log at 81,000 KM (Must NOT be counted in totals!)
    log_d = frappe.get_doc({
        "doctype": "Fuel Log",
        "fuel_date": "2026-11-04",
        "vehicle": veh_plate,
        "driver": drv_id,
        "mine_site": site_name,
        "fuel_source": "Site Bowser",
        "quantity_litres": 60.0,
        "rate_per_litre": 90.0, # Cost = 5,400 (Rejected - excluded!)
        "odometer_reading_km": 81000,
        "is_full_tank": 1,
        "is_test_record": 0
    }).insert(ignore_permissions=True)
    apply_workflow(log_d, "Reject")

    # 5. Create Log E: TEST RECORD Fuel Log (Must NOT be counted in totals!)
    log_e = frappe.get_doc({
        "doctype": "Fuel Log",
        "fuel_date": "2026-11-04",
        "vehicle": veh_plate,
        "driver": drv_id,
        "mine_site": site_name,
        "fuel_source": "Site Bowser",
        "quantity_litres": 200.0,
        "rate_per_litre": 90.0,
        "odometer_reading_km": 81500,
        "is_full_tank": 1,
        "is_test_record": 1 # Test record - excluded!
    }).insert(ignore_permissions=True)
    apply_workflow(log_e, "Approve")

    frappe.db.commit()

    filters = {"from_date": "", "to_date": "", "vehicle": "", "driver": "", "mine_site": ""}
    
    # 1. Daily Fuel Consumption
    r1 = qr.run(report_name="Daily Fuel Consumption", filters=filters)
    r1_rows = r1.get("result", [])
    total_qty_r1 = sum(float(r['total_quantity_(l)']) for r in r1_rows)
    total_cost_r1 = sum(float(r['total_fuel_cost']) for r in r1_rows)
    print(f"Report 1 (Daily Fuel Consumption): Total L = {total_qty_r1}, Total Cost = ₹{total_cost_r1}")
    assert total_qty_r1 == 200.0, f"Expected 200 L, got {total_qty_r1}"
    assert total_cost_r1 == 18200.0, f"Expected 18200, got {total_cost_r1}"

    # 2. Vehicle-wise Fuel Consumption
    r2 = qr.run(report_name="Vehicle-wise Fuel Consumption", filters=filters)
    r2_rows = r2.get("result", [])
    total_qty_r2 = sum(float(r['total_quantity_(l)']) for r in r2_rows)
    total_cost_r2 = sum(float(r['total_cost']) for r in r2_rows)
    print(f"Report 2 (Vehicle-wise Fuel Consumption): Total L = {total_qty_r2}, Total Cost = ₹{total_cost_r2}")
    assert total_qty_r2 == 200.0, f"Expected 200 L, got {total_qty_r2}"
    assert total_cost_r2 == 18200.0, f"Expected 18200, got {total_cost_r2}"

    # 3. Monthly Fuel Cost
    r3 = qr.run(report_name="Monthly Fuel Cost", filters=filters)
    r3_rows = r3.get("result", [])
    total_qty_r3 = sum(float(r['total_litres']) for r in r3_rows)
    total_cost_r3 = sum(float(r['total_fuel_cost']) for r in r3_rows)
    bowser_cost_r3 = sum(float(r['bowser_cost']) for r in r3_rows)
    pump_cost_r3 = sum(float(r['external_pump_cost']) for r in r3_rows)
    print(f"Report 3 (Monthly Fuel Cost): Total L = {total_qty_r3}, Cost = ₹{total_cost_r3} (Bowser: ₹{bowser_cost_r3}, Pump: ₹{pump_cost_r3})")
    assert total_cost_r3 == 18200.0
    assert bowser_cost_r3 == 9000.0
    assert pump_cost_r3 == 9200.0

    # 4. Fuel Efficiency (KM/L)
    r4 = qr.run(report_name="Fuel Efficiency (KM/L)", filters=filters)
    r4_rows = r4.get("result", [])
    print(f"Report 4 (Fuel Efficiency): Rows returned = {len(r4_rows)} (Strictly only Log A and Log B)")
    assert len(r4_rows) == 2, f"Expected 2 approved rows, got {len(r4_rows)}"
    log_b_row = [r for r in r4_rows if r['fuel_log'] == log_b.name][0]
    assert float(log_b_row['estimated_km/l']) == 5.0, f"Expected 5.0 KM/L, got {log_b_row['estimated_km/l']}"

    # 5. Fuel Consumption by Mine Site
    r5 = qr.run(report_name="Fuel Consumption by Mine Site", filters=filters)
    r5_rows = r5.get("result", [])
    total_qty_r5 = sum(float(r['total_quantity_(l)']) for r in r5_rows)
    total_cost_r5 = sum(float(r['total_cost']) for r in r5_rows)
    print(f"Report 5 (Fuel Consumption by Mine Site): Total L = {total_qty_r5}, Total Cost = ₹{total_cost_r5}")
    assert total_qty_r5 == 200.0
    assert total_cost_r5 == 18200.0

    print("\nALL 5 REPORTS PERFECTLY RECONCILED WITH 100% MATHEMATICAL PRECISION!")
    print("Draft, Rejected, and Test Records were 100% excluded.")

run()
