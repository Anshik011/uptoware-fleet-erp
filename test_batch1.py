import frappe

def run_tests():
    results = []

    def log_result(test_name, passed, detail=""):
        results.append({
            "test": test_name,
            "status": "PASS" if passed else "FAIL",
            "detail": detail
        })
        print(f"[{'PASS' if passed else 'FAIL'}] {test_name}: {detail}")

    # Ensure clean slate for test records
    test_v_names = ["KA-19-MG-8801", "KA-19-MG-8802", "TEST-NEG-ODO"]
    test_d_names = ["Rajesh Kumar", "Vikram Singh", "Suresh Inactive"]

    for v in test_v_names:
        if frappe.db.exists("Vehicle", v):
            frappe.delete_doc("Vehicle", v, force=1)
    
    # In Frappe, Driver names are auto-generated from naming_series or full_name
    for d in test_d_names:
        drivers = frappe.get_all("Driver", filters={"full_name": d}, pluck="name")
        for dn in drivers:
            frappe.delete_doc("Driver", dn, force=1)
    
    frappe.db.commit()

    # 1. Test Positive Vehicle Creation
    try:
        v1 = frappe.get_doc({
            "doctype": "Vehicle",
            "license_plate": "KA-19-MG-8801",
            "make": "Tata",
            "model": "Prima 3530.K",
            "fuel_type": "Diesel",
            "uom": "Nos", # checking standard UOM
            "last_odometer": 84520,
            "vehicle_status": "Active",
            "payload_capacity_tons": 35.0,
            "is_test_record": 1,
            "insurance_company": "National Insurance Co",
            "policy_no": "POL-2026-9901",
            "start_date": "2026-01-01",
            "end_date": "2027-01-01",
            "fitness_expiry_date": "2027-03-15",
            "puc_expiry_date": "2026-12-31",
            "road_tax_expiry_date": "2027-06-30",
            "permit_expiry_date": "2028-01-01"
        })
        v1.insert()
        log_result("1. Positive Vehicle Creation", True, f"Vehicle '{v1.name}' inserted with all custom and statutory fields.")
    except Exception as e:
        log_result("1. Positive Vehicle Creation", False, str(e))

    # 2. Test Negative Odometer Validation on Vehicle
    try:
        v_neg = frappe.get_doc({
            "doctype": "Vehicle",
            "license_plate": "TEST-NEG-ODO",
            "make": "Test",
            "model": "TestModel",
            "fuel_type": "Diesel",
            "uom": "Nos",
            "last_odometer": -500,
            "vehicle_status": "Active"
        })
        v_neg.insert()
        log_result("2. Negative Odometer Rejection", False, "Failed to reject negative odometer!")
    except Exception as e:
        log_result("2. Negative Odometer Rejection", True, f"Successfully caught and rejected: {e}")

    # 3. Test Positive Driver Creation
    try:
        d1 = frappe.get_doc({
            "doctype": "Driver",
            "full_name": "Rajesh Kumar",
            "status": "Active",
            "license_number": "DL-042018009124",
            "expiry_date": "2028-04-15",
            "safety_score": 96.5,
            "emergency_contact_name": "Kavita Kumar",
            "emergency_contact_phone": "+91 98451 99881",
            "cell_number": "+91 98451 22341"
        })
        d1.insert()

        d2 = frappe.get_doc({
            "doctype": "Driver",
            "full_name": "Vikram Singh",
            "status": "Active",
            "license_number": "DL-042019004512",
            "expiry_date": "2027-06-10",
            "safety_score": 92.0,
            "cell_number": "+91 98452 33452"
        })
        d2.insert()

        d3_inactive = frappe.get_doc({
            "doctype": "Driver",
            "full_name": "Suresh Inactive",
            "status": "Suspended",
            "license_number": "DL-042015001122",
            "expiry_date": "2027-01-10",
            "cell_number": "+91 98453 00000"
        })
        d3_inactive.insert()

        log_result("3. Driver Master Records Creation", True, f"Created drivers: {d1.name} (Active), {d2.name} (Active), {d3_inactive.name} (Suspended)")
    except Exception as e:
        log_result("3. Driver Master Records Creation", False, str(e))
        return results

    # 4. Test Active Driver Assignment to Vehicle & Bi-directional Sync
    try:
        v1_doc = frappe.get_doc("Vehicle", "KA-19-MG-8801")
        v1_doc.assigned_driver = d1.name
        v1_doc.save()

        # Check if d1 was automatically synced
        d1_updated = frappe.get_doc("Driver", d1.name)
        if d1_updated.assigned_vehicle == "KA-19-MG-8801":
            log_result("4. Driver Assignment & Sync", True, f"Driver {d1.name} assigned to KA-19-MG-8801 and Driver.assigned_vehicle automatically synchronized.")
        else:
            log_result("4. Driver Assignment & Sync", False, f"Driver.assigned_vehicle was '{d1_updated.assigned_vehicle}', expected 'KA-19-MG-8801'")
    except Exception as e:
        log_result("4. Driver Assignment & Sync", False, str(e))

    # 5. Test Prevent Inactive Driver Assignment
    try:
        v2 = frappe.get_doc({
            "doctype": "Vehicle",
            "license_plate": "KA-19-MG-8802",
            "make": "BharatBenz",
            "model": "3528CM",
            "fuel_type": "Diesel",
            "uom": "Nos",
            "last_odometer": 62100,
            "vehicle_status": "Active",
            "payload_capacity_tons": 35.0,
            "assigned_driver": d3_inactive.name
        })
        v2.insert()
        log_result("5. Reject Inactive Driver Assignment", False, "Failed to reject inactive/suspended driver!")
    except Exception as e:
        log_result("5. Reject Inactive Driver Assignment", True, f"Successfully rejected assignment of Suspended driver: {e}")

    # 6. Test Prevent Duplicate Driver Assignment (Driver already assigned to another vehicle)
    try:
        v2_conflict = frappe.get_doc({
            "doctype": "Vehicle",
            "license_plate": "KA-19-MG-8802",
            "make": "BharatBenz",
            "model": "3528CM",
            "fuel_type": "Diesel",
            "uom": "Nos",
            "last_odometer": 62100,
            "vehicle_status": "Active",
            "payload_capacity_tons": 35.0,
            "assigned_driver": d1.name # Already assigned to KA-19-MG-8801
        })
        v2_conflict.insert()
        log_result("6. Prevent Duplicate Driver Assignment (Vehicle side)", False, "Failed to reject duplicate driver assignment!")
    except Exception as e:
        log_result("6. Prevent Duplicate Driver Assignment (Vehicle side)", True, f"Successfully blocked duplicate assignment: {e}")

    # 7. Test Prevent Duplicate Vehicle Assignment from Driver side
    try:
        d2_doc = frappe.get_doc("Driver", d2.name)
        d2_doc.assigned_vehicle = "KA-19-MG-8801" # Already assigned to Rajesh Kumar
        d2_doc.save()
        log_result("7. Prevent Duplicate Vehicle Assignment (Driver side)", False, "Failed to reject assigning already assigned vehicle to another driver!")
    except Exception as e:
        log_result("7. Prevent Duplicate Vehicle Assignment (Driver side)", True, f"Successfully blocked duplicate vehicle assignment: {e}")

    # 8. Test Clean Second Assignment for Free Vehicle and Free Driver
    try:
        v2_clean = frappe.get_doc({
            "doctype": "Vehicle",
            "license_plate": "KA-19-MG-8802",
            "make": "BharatBenz",
            "model": "3528CM",
            "fuel_type": "Diesel",
            "uom": "Nos",
            "last_odometer": 62100,
            "vehicle_status": "Active",
            "payload_capacity_tons": 35.0,
            "assigned_driver": d2.name # Free driver
        })
        v2_clean.insert()

        d2_reloaded = frappe.get_doc("Driver", d2.name)
        log_result("8. Clean Second Vehicle & Driver Assignment", True, f"Vehicle '{v2_clean.name}' successfully assigned to free Driver '{d2.name}'. Driver's assigned_vehicle: '{d2_reloaded.assigned_vehicle}'")
    except Exception as e:
        log_result("8. Clean Second Vehicle & Driver Assignment", False, str(e))

    frappe.db.commit()
    print("\nSUMMARY: Finished all 8 tests.")
    return results

run_tests()
