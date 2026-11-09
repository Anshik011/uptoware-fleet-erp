def run():
    import frappe
    import frappe.desk.query_report as qr
    from frappe.model.workflow import apply_workflow
    
    print("=== POPULATING CONTROLLED MAINTENANCE DATA & VERIFYING ALL REPORTS ===")

    veh_plate = "KA-19-MG-7001"
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
        frappe.get_doc({
            "doctype": "Mine Site",
            "site_name": site_name,
            "site_code": "KNP-01",
            "status": "Operational",
            "is_test_record": 0
        }).insert(ignore_permissions=True)

    workshop = "AutoMech Central Workshop"
    if not frappe.db.exists("Supplier", workshop):
        frappe.get_doc({
            "doctype": "Supplier",
            "supplier_name": workshop,
            "supplier_group": "All Supplier Groups",
            "supplier_type": "Company"
        }).insert(ignore_permissions=True)

    # Clean existing non-test breakdowns for this vehicle
    frappe.db.delete("Vehicle Breakdown", {"vehicle": veh_plate})
    frappe.db.commit()

    # 1. Breakdown A: Closed Hydraulic Breakdown (Downtime: 8.0 hrs, Cost: 4000)
    bkd_a = frappe.get_doc({
        "doctype": "Vehicle Breakdown",
        "breakdown_datetime": "2026-11-01 08:00:00",
        "vehicle": veh_plate,
        "driver": drv_id,
        "mine_site": site_name,
        "odometer_reading": 80100,
        "breakdown_type": "Hydraulic",
        "severity": "Critical",
        "assigned_workshop": workshop,
        "description": "Main hoist pump seal blown",
        "parts_table": [{
            "item_code": "SP-HYD-SEAL-01",
            "item_name": "Hydraulic Cylinder Seal Kit",
            "planned_qty": 2.0,
            "issued_qty": 2.0,
            "warehouse": "Stores - U",
            "rate": 1250.0,
            "amount": 2500.0,
            "status": "Issued"
        }],
        "parts_cost": 2500.0,
        "labour_cost": 1500.0,
        "total_repair_cost": 4000.0,
        "repair_start_datetime": "2026-11-01 09:00:00",
        "repair_completion_datetime": "2026-11-01 16:00:00",
        "downtime_hours": 8.0,
        "is_test_record": 0
    }).insert(ignore_permissions=True)
    apply_workflow(bkd_a, "Approve")
    apply_workflow(bkd_a, "Send to Workshop")
    apply_workflow(bkd_a, "Mark Repaired")
    apply_workflow(bkd_a, "Close Breakdown")

    # 2. Breakdown B: Closed Engine Breakdown (Downtime: 4.0 hrs, Cost: 2000)
    bkd_b = frappe.get_doc({
        "doctype": "Vehicle Breakdown",
        "breakdown_datetime": "2026-11-03 10:00:00",
        "vehicle": veh_plate,
        "driver": drv_id,
        "mine_site": site_name,
        "odometer_reading": 80100,
        "breakdown_type": "Engine",
        "severity": "Medium",
        "assigned_workshop": workshop,
        "description": "Coolant thermostat stuck closed",
        "parts_cost": 0.0,
        "labour_cost": 2000.0,
        "total_repair_cost": 2000.0,
        "repair_start_datetime": "2026-11-03 10:30:00",
        "repair_completion_datetime": "2026-11-03 14:00:00",
        "downtime_hours": 4.0,
        "is_test_record": 0
    }).insert(ignore_permissions=True)
    apply_workflow(bkd_b, "Approve")
    apply_workflow(bkd_b, "Send to Workshop")
    apply_workflow(bkd_b, "Mark Repaired")
    apply_workflow(bkd_b, "Close Breakdown")

    # 3. Breakdown C: Active Pending Breakdown (In Workshop)
    bkd_c = frappe.get_doc({
        "doctype": "Vehicle Breakdown",
        "breakdown_datetime": "2026-11-04 09:00:00",
        "vehicle": veh_plate,
        "driver": drv_id,
        "mine_site": site_name,
        "odometer_reading": 80100,
        "breakdown_type": "Tyre",
        "severity": "Low",
        "assigned_workshop": workshop,
        "description": "Rear dual tyre puncture",
        "parts_cost": 0.0,
        "labour_cost": 0.0,
        "total_repair_cost": 0.0,
        "is_test_record": 0
    }).insert(ignore_permissions=True)
    apply_workflow(bkd_c, "Approve")
    apply_workflow(bkd_c, "Send to Workshop")

    # 4. Breakdown D: Test Record Breakdown (Must be 100% excluded from reports!)
    bkd_d = frappe.get_doc({
        "doctype": "Vehicle Breakdown",
        "breakdown_datetime": "2026-11-04 10:00:00",
        "vehicle": veh_plate,
        "driver": drv_id,
        "mine_site": site_name,
        "odometer_reading": 80100,
        "breakdown_type": "Transmission",
        "severity": "Critical",
        "assigned_workshop": workshop,
        "description": "Test breakdown record",
        "total_repair_cost": 15000.0,
        "downtime_hours": 24.0,
        "is_test_record": 1 # Test record - excluded!
    }).insert(ignore_permissions=True)
    apply_workflow(bkd_d, "Approve")

    frappe.db.commit()

    filters = {"from_date": "", "to_date": "", "vehicle": "", "breakdown_type": "", "repair_status": ""}

    # Report 1: Vehicle Breakdown Register
    r1 = qr.run(report_name="Vehicle Breakdown Register", filters=filters)
    r1_rows = r1.get("result", [])
    print(f"Report 1 (Vehicle Breakdown Register): Rows = {len(r1_rows)}")
    assert len(r1_rows) == 3, f"Expected 3 operational rows, got {len(r1_rows)}"
    total_cost_r1 = sum(float(r['total_cost']) for r in r1_rows)
    print(f"  Total Cost = ₹{total_cost_r1}")
    assert total_cost_r1 == 6000.0

    # Report 2: Vehicle Downtime Report
    r2 = qr.run(report_name="Vehicle Downtime Report", filters=filters)
    r2_rows = r2.get("result", [])
    print(f"Report 2 (Vehicle Downtime Report): Rows = {len(r2_rows)}")
    assert len(r2_rows) == 1
    total_dt = float(r2_rows[0]['total_downtime_(hrs)'])
    print(f"  Total Downtime = {total_dt} hrs (Expected: 12.0 hrs)")
    assert total_dt == 12.0

    # Report 3: Maintenance Cost by Vehicle
    r3 = qr.run(report_name="Maintenance Cost by Vehicle", filters=filters)
    r3_rows = r3.get("result", [])
    print(f"Report 3 (Maintenance Cost by Vehicle): Rows = {len(r3_rows)}")
    assert len(r3_rows) == 1
    parts_cost = float(r3_rows[0]['parts_cost'])
    labour_cost = float(r3_rows[0]['labour_cost'])
    total_maint = float(r3_rows[0]['total_maintenance_cost'])
    print(f"  Parts: ₹{parts_cost}, Labour: ₹{labour_cost}, Total: ₹{total_maint}")
    assert parts_cost == 2500.0
    assert labour_cost == 3500.0
    assert total_maint == 6000.0

    # Report 4: Breakdown Frequency by Type
    r4 = qr.run(report_name="Breakdown Frequency by Type", filters=filters)
    r4_rows = r4.get("result", [])
    print(f"Report 4 (Breakdown Frequency by Type): Rows = {len(r4_rows)} (Hydraulic, Engine, Tyre)")
    assert len(r4_rows) == 3

    # Report 5: Pending Repairs / Awaiting Parts
    r5 = qr.run(report_name="Pending Repairs / Awaiting Parts", filters=filters)
    r5_rows = r5.get("result", [])
    print(f"Report 5 (Pending Repairs / Awaiting Parts): Rows = {len(r5_rows)} (Strictly only Breakdown C)")
    assert len(r5_rows) == 1
    assert r5_rows[0]['breakdown_id'] == bkd_c.name
    assert r5_rows[0]['current_status'] == "In Workshop"

    # Report 6: Vehicle Maintenance History
    r6 = qr.run(report_name="Vehicle Maintenance History", filters=filters)
    r6_rows = r6.get("result", [])
    print(f"Report 6 (Vehicle Maintenance History): Rows = {len(r6_rows)}")
    assert len(r6_rows) == 3
    # Check parts consumed string on bkd_a
    bkd_a_row = [r for r in r6_rows if r['breakdown_id'] == bkd_a.name][0]
    print(f"  Breakdown A Parts Consumed: {bkd_a_row['parts_consumed']}")
    assert "SP-HYD-SEAL-01" in bkd_a_row['parts_consumed']

    print("\nALL 6 BATCH 4 REPORTS VERIFIED WITH 100% MATHEMATICAL PRECISION!")
    print("Test records and unauthorized data completely quarantined.")

run()
