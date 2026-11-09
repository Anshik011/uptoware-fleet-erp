import frappe

def run_regression_tests():
    results = []

    def record_result(name, passed, detail=""):
        results.append({
            "name": name,
            "status": "PASS" if passed else "FAIL",
            "detail": detail
        })
        print(f"[{'PASS' if passed else 'FAIL'}] {name}: {detail}")

    print("=== STARTING BATCH 1 FINAL ACCEPTANCE & REGRESSION SUITE ===")

    # Setup dedicated test records
    # Vehicles: REG-VEH-01, REG-VEH-02
    # Drivers: RegDriver-A (Active), RegDriver-B (Active), RegDriver-Inactive (Suspended)
    v_test_ids = ["REG-VEH-01", "REG-VEH-02", "REG-VEH-NEG"]
    d_test_names = ["RegDriver ActiveOne", "RegDriver ActiveTwo", "RegDriver SuspendedOne"]

    for vid in v_test_ids:
        if frappe.db.exists("Vehicle", vid):
            frappe.delete_doc("Vehicle", vid, force=1)

    for dname in d_test_names:
        for did in frappe.get_all("Driver", filters={"full_name": dname}, pluck="name"):
            frappe.delete_doc("Driver", did, force=1)

    frappe.db.commit()

    # Create test driver records
    drv_a = frappe.get_doc({
        "doctype": "Driver",
        "full_name": "RegDriver ActiveOne",
        "status": "Active",
        "license_number": "DL-TEST-REG-001",
        "expiry_date": "2028-01-01",
        "is_test_record": 1
    }).insert()

    drv_b = frappe.get_doc({
        "doctype": "Driver",
        "full_name": "RegDriver ActiveTwo",
        "status": "Active",
        "license_number": "DL-TEST-REG-002",
        "expiry_date": "2028-01-01",
        "is_test_record": 1
    }).insert()

    drv_susp = frappe.get_doc({
        "doctype": "Driver",
        "full_name": "RegDriver SuspendedOne",
        "status": "Suspended",
        "license_number": "DL-TEST-REG-003",
        "expiry_date": "2028-01-01",
        "is_test_record": 1
    }).insert()

    # Create test vehicle records
    veh_1 = frappe.get_doc({
        "doctype": "Vehicle",
        "license_plate": "REG-VEH-01",
        "make": "BharatBenz",
        "model": "3528CM",
        "fuel_type": "Diesel",
        "uom": "Nos",
        "last_odometer": 50000,
        "vehicle_status": "Active",
        "payload_capacity_tons": 35.0,
        "is_test_record": 1
    }).insert()

    veh_2 = frappe.get_doc({
        "doctype": "Vehicle",
        "license_plate": "REG-VEH-02",
        "make": "Tata",
        "model": "Prima 3530.K",
        "fuel_type": "Diesel",
        "uom": "Nos",
        "last_odometer": 72000,
        "vehicle_status": "Active",
        "payload_capacity_tons": 35.0,
        "is_test_record": 1
    }).insert()

    frappe.db.commit()

    # TEST 1: Assigning a driver to a vehicle (Vehicle side)
    try:
        v1 = frappe.get_doc("Vehicle", "REG-VEH-01")
        v1.assigned_driver = drv_a.name
        v1.save()

        drv_a_check = frappe.get_doc("Driver", drv_a.name)
        if drv_a_check.assigned_vehicle == "REG-VEH-01":
            record_result("1. Assign Driver to Vehicle", True, f"Assigned {drv_a.name} to REG-VEH-01 -> Driver.assigned_vehicle automatically synced to 'REG-VEH-01'.")
        else:
            record_result("1. Assign Driver to Vehicle", False, f"Expected 'REG-VEH-01', got '{drv_a_check.assigned_vehicle}'.")
    except Exception as e:
        record_result("1. Assign Driver to Vehicle", False, str(e))

    # TEST 2: Changing the assigned driver on a vehicle
    try:
        v1 = frappe.get_doc("Vehicle", "REG-VEH-01")
        v1.assigned_driver = drv_b.name
        v1.save()

        drv_a_check = frappe.get_doc("Driver", drv_a.name)
        drv_b_check = frappe.get_doc("Driver", drv_b.name)

        if drv_b_check.assigned_vehicle == "REG-VEH-01" and drv_a_check.assigned_vehicle is None:
            record_result("2. Change Assigned Driver on Vehicle", True, f"Changed driver from {drv_a.name} to {drv_b.name} -> New driver synced to 'REG-VEH-01' and old driver unassigned cleanly.")
        else:
            record_result("2. Change Assigned Driver on Vehicle", False, f"Old driver veh: '{drv_a_check.assigned_vehicle}', New driver veh: '{drv_b_check.assigned_vehicle}'")
    except Exception as e:
        record_result("2. Change Assigned Driver on Vehicle", False, str(e))

    # TEST 3: Clearing a vehicle's driver (Vehicle side)
    try:
        v1 = frappe.get_doc("Vehicle", "REG-VEH-01")
        v1.assigned_driver = None
        v1.save()

        drv_b_check = frappe.get_doc("Driver", drv_b.name)
        if drv_b_check.assigned_vehicle is None:
            record_result("3. Clear Vehicle's Driver", True, f"Cleared assigned_driver on REG-VEH-01 -> Driver {drv_b.name}.assigned_vehicle is cleanly cleared to None.")
        else:
            record_result("3. Clear Vehicle's Driver", False, f"Driver.assigned_vehicle was not cleared: '{drv_b_check.assigned_vehicle}'")
    except Exception as e:
        record_result("3. Clear Vehicle's Driver", False, str(e))

    # TEST 4: Clearing a driver's vehicle (Driver side)
    try:
        # First assign drv_a to veh_2
        drv_a_doc = frappe.get_doc("Driver", drv_a.name)
        drv_a_doc.assigned_vehicle = "REG-VEH-02"
        drv_a_doc.save()

        v2_check = frappe.get_doc("Vehicle", "REG-VEH-02")
        assert v2_check.assigned_driver == drv_a.name, "Failed intermediate setup for test 4"

        # Now clear from driver side
        drv_a_doc = frappe.get_doc("Driver", drv_a.name)
        drv_a_doc.assigned_vehicle = None
        drv_a_doc.save()

        v2_check = frappe.get_doc("Vehicle", "REG-VEH-02")
        if v2_check.assigned_driver is None:
            record_result("4. Clear Driver's Vehicle", True, f"Cleared assigned_vehicle on Driver {drv_a.name} -> Vehicle REG-VEH-02.assigned_driver is cleanly cleared to None.")
        else:
            record_result("4. Clear Driver's Vehicle", False, f"Vehicle.assigned_driver was not cleared: '{v2_check.assigned_driver}'")
    except Exception as e:
        record_result("4. Clear Driver's Vehicle", False, str(e))

    # TEST 5A: Attempting to assign an inactive/suspended driver (from Vehicle form)
    try:
        v1 = frappe.get_doc("Vehicle", "REG-VEH-01")
        v1.assigned_driver = drv_susp.name
        v1.save()
        record_result("5A. Block Inactive Driver Assignment (Vehicle side)", False, "Failed to block suspended driver assignment from vehicle side!")
    except Exception as e:
        record_result("5A. Block Inactive Driver Assignment (Vehicle side)", True, f"Successfully blocked: {e}")

    # TEST 5B: Attempting to assign a vehicle to an inactive/suspended driver (from Driver form)
    try:
        drv_susp_doc = frappe.get_doc("Driver", drv_susp.name)
        drv_susp_doc.assigned_vehicle = "REG-VEH-01"
        drv_susp_doc.save()
        record_result("5B. Block Vehicle Assignment to Inactive Driver (Driver side)", False, "Failed to block vehicle assignment from inactive driver side!")
    except Exception as e:
        record_result("5B. Block Vehicle Assignment to Inactive Driver (Driver side)", True, f"Successfully blocked: {e}")

    # TEST 6: Attempting to assign a driver already assigned elsewhere
    try:
        # Assign drv_a to veh_1
        v1 = frappe.get_doc("Vehicle", "REG-VEH-01")
        v1.assigned_driver = drv_a.name
        v1.save()

        # Now attempt to assign drv_a to veh_2
        v2 = frappe.get_doc("Vehicle", "REG-VEH-02")
        v2.assigned_driver = drv_a.name
        v2.save()
        record_result("6. Block Driver Already Assigned Elsewhere", False, "Failed to block duplicate assignment of driver to another vehicle!")
    except Exception as e:
        record_result("6. Block Driver Already Assigned Elsewhere", True, f"Successfully blocked: {e}")

    # TEST 7: Attempting to assign a vehicle already assigned elsewhere
    try:
        # drv_a is currently on veh_1. Now drv_b attempts to claim veh_1
        drv_b_doc = frappe.get_doc("Driver", drv_b.name)
        drv_b_doc.assigned_vehicle = "REG-VEH-01"
        drv_b_doc.save()
        record_result("7. Block Vehicle Already Assigned Elsewhere", False, "Failed to block assigning an already occupied vehicle!")
    except Exception as e:
        record_result("7. Block Vehicle Already Assigned Elsewhere", True, f"Successfully blocked: {e}")

    # TEST 8: Changing a driver's status while they are assigned
    try:
        # drv_a is currently assigned to REG-VEH-01. Now suspend drv_a
        drv_a_doc = frappe.get_doc("Driver", drv_a.name)
        drv_a_doc.status = "Suspended"
        drv_a_doc.save()

        # Check both sides
        drv_a_reloaded = frappe.get_doc("Driver", drv_a.name)
        v1_reloaded = frappe.get_doc("Vehicle", "REG-VEH-01")

        if drv_a_reloaded.status == "Suspended" and drv_a_reloaded.assigned_vehicle is None and v1_reloaded.assigned_driver is None:
            record_result("8. Change Driver Status While Assigned", True, f"Suspended Driver {drv_a.name} -> Driver's assigned_vehicle auto-cleared and Vehicle's assigned_driver auto-cleared. Both sides consistent.")
        else:
            record_result("8. Change Driver Status While Assigned", False, f"Status: {drv_a_reloaded.status}, drv_veh: '{drv_a_reloaded.assigned_vehicle}', veh_drv: '{v1_reloaded.assigned_driver}'")
    except Exception as e:
        record_result("8. Change Driver Status While Assigned", False, str(e))

    # TEST 9: Negative Odometer Validation
    try:
        v_neg = frappe.get_doc({
            "doctype": "Vehicle",
            "license_plate": "REG-VEH-NEG",
            "make": "TestMake",
            "model": "TestModel",
            "last_odometer": -100,
            "vehicle_status": "Active"
        })
        v_neg.insert()
        record_result("9. Negative Odometer Validation", False, "Failed to reject negative odometer!")
    except Exception as e:
        record_result("9. Negative Odometer Validation", True, f"Successfully blocked negative odometer: {e}")

    # TEST 10: Verification that GPS field is absent from Vehicle DocType
    v_meta = frappe.get_meta("Vehicle")
    has_gps = any(f.fieldname == "gps_device_id" for f in v_meta.fields)
    if not has_gps:
        record_result("10. GPS Field Absence Verification", True, "'gps_device_id' is completely absent from Vehicle DocType fields.")
    else:
        record_result("10. GPS Field Absence Verification", False, "'gps_device_id' is still present in Vehicle DocType!")

    # TEST 11: Test Record Tagging Verification
    v1_rec = frappe.get_doc("Vehicle", "REG-VEH-01")
    d1_rec = frappe.get_doc("Driver", drv_a.name)
    if v1_rec.is_test_record == 1 and d1_rec.is_test_record == 1:
        record_result("11. Test Record Tagging Verification", True, f"Both Vehicle {v1_rec.name} and Driver {d1_rec.name} have is_test_record = 1.")
    else:
        record_result("11. Test Record Tagging Verification", False, f"Vehicle is_test_record: {v1_rec.is_test_record}, Driver is_test_record: {d1_rec.is_test_record}")

    frappe.db.commit()
    print("\n=== SUMMARY OF REGRESSION TEST RESULTS ===")
    all_pass = all(r["status"] == "PASS" for r in results)
    print(f"Total Tests: {len(results)} | Passed: {sum(1 for r in results if r['status'] == 'PASS')} | Failed: {sum(1 for r in results if r['status'] == 'FAIL')}")
    print(f"OVERALL RESULT: {'ALL PASS' if all_pass else 'SOME FAILED'}")

    return results

run_regression_tests()
