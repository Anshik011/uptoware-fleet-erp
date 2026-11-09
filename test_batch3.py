def run():
    import frappe
    from frappe.utils import nowdate, flt, cint
    from frappe.model.workflow import apply_workflow

    print("\n=======================================================")
    print("   UPTOWARE FLEET ERP - BATCH 3 COMPREHENSIVE TESTS")
    print("=======================================================\n")
    
    passed = 0
    failed = 0
    test_results = []

    def record_result(test_num, test_name, status, details=""):
        nonlocal passed, failed
        if status:
            passed += 1
            test_results.append((test_num, test_name, "PASSED", details))
            print(f"[PASS] Test {test_num:02d}: {test_name}")
        else:
            failed += 1
            test_results.append((test_num, test_name, "FAILED", details))
            print(f"[FAIL] Test {test_num:02d}: {test_name} - {details}")

    today = nowdate()

    # 1. Test Mine Site
    test_site_name = "TEST-B3-SITE-01"
    if not frappe.db.exists("Mine Site", test_site_name):
        site = frappe.get_doc({
            "doctype": "Mine Site",
            "site_name": test_site_name,
            "site_code": "TB3-S01",
            "status": "Operational",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
    else:
        site = frappe.get_doc("Mine Site", test_site_name)
        site.status = "Operational"
        site.is_test_record = 1
        site.save(ignore_permissions=True)

    # 2. Test Driver
    test_driver_full_name = "Test Fuel Driver B3"
    existing_driver = frappe.get_all("Driver", filters={"full_name": test_driver_full_name}, fields=["name", "status"])
    if existing_driver:
        test_driver_name = existing_driver[0]["name"]
        driver = frappe.get_doc("Driver", test_driver_name)
        driver.status = "Active"
        driver.is_test_record = 1
        driver.save(ignore_permissions=True)
    else:
        driver = frappe.get_doc({
            "doctype": "Driver",
            "full_name": test_driver_full_name,
            "status": "Active",
            "license_number": "DL-B3-TEST-001",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        test_driver_name = driver.name

    # 3. Test Vehicle A
    test_veh_a = "TEST-B3-VEH-01"
    if not frappe.db.exists("Vehicle", test_veh_a):
        veh_a = frappe.get_doc({
            "doctype": "Vehicle",
            "license_plate": test_veh_a,
            "make": "Tata",
            "model": "Prima 3530.K",
            "fuel_type": "Diesel",
            "uom": "Nos",
            "vehicle_status": "Active",
            "last_odometer": 10000,
            "is_test_record": 1
        }).insert(ignore_permissions=True)
    else:
        veh_a = frappe.get_doc("Vehicle", test_veh_a)
        veh_a.vehicle_status = "Active"
        veh_a.is_test_record = 1
        veh_a.save(ignore_permissions=True)
        frappe.db.set_value("Vehicle", test_veh_a, "last_odometer", 10000)

    # 4. Test Vehicle B
    test_veh_b = "TEST-B3-VEH-02"
    if not frappe.db.exists("Vehicle", test_veh_b):
        veh_b = frappe.get_doc({
            "doctype": "Vehicle",
            "license_plate": test_veh_b,
            "make": "Tata",
            "model": "Prima 3530.K",
            "fuel_type": "Diesel",
            "uom": "Nos",
            "vehicle_status": "Active",
            "last_odometer": 25000,
            "is_test_record": 1
        }).insert(ignore_permissions=True)
    else:
        veh_b = frappe.get_doc("Vehicle", test_veh_b)
        veh_b.vehicle_status = "Active"
        veh_b.is_test_record = 1
        veh_b.save(ignore_permissions=True)
        frappe.db.set_value("Vehicle", test_veh_b, "last_odometer", 25000)

    # Clean up any existing fuel logs for these test vehicles
    frappe.db.delete("Fuel Log", {"vehicle": ["in", [test_veh_a, test_veh_b]]})
    frappe.db.commit()

    # -------------------------------------------------------------
    # TEST 1: Existing total fuel cost calculation
    # -------------------------------------------------------------
    try:
        qty = 45.5
        rate = 92.50
        expected_total = round(qty * rate, 2)
        
        log1 = frappe.get_doc({
            "doctype": "Fuel Log",
            "fuel_date": today,
            "vehicle": test_veh_a,
            "driver": test_driver_name,
            "mine_site": test_site_name,
            "fuel_source": "Site Bowser",
            "quantity_litres": qty,
            "rate_per_litre": rate,
            "total_fuel_cost": 0.0,
            "odometer_reading_km": 10200,
            "is_full_tank": 1,
            "is_test_record": 1
        })
        log1.insert(ignore_permissions=True)
        
        if log1.total_fuel_cost == expected_total:
            record_result(1, "Existing total fuel cost calculation", True, f"Quantity {qty} * Rate {rate} = {log1.total_fuel_cost}")
        else:
            record_result(1, "Existing total fuel cost calculation", False, f"Expected {expected_total}, got {log1.total_fuel_cost}")
    except Exception as e:
        record_result(1, "Existing total fuel cost calculation", False, str(e))

    # -------------------------------------------------------------
    # TEST 2: Valid fuel entry creation
    # -------------------------------------------------------------
    try:
        if log1 and log1.name and log1.vehicle == test_veh_a and log1.fuel_source == "Site Bowser" and log1.approval_status == "Draft":
            record_result(2, "Valid fuel entry creation (Draft)", True, f"Created Fuel Log '{log1.name}' in Draft with all fields.")
        else:
            record_result(2, "Valid fuel entry creation (Draft)", False, "Failed to create or verify valid fuel entry.")
    except Exception as e:
        record_result(2, "Valid fuel entry creation (Draft)", False, str(e))

    # -------------------------------------------------------------
    # TEST 3: Negative quantity rejection
    # -------------------------------------------------------------
    try:
        bad_log = frappe.get_doc({
            "doctype": "Fuel Log",
            "fuel_date": today,
            "vehicle": test_veh_a,
            "driver": test_driver_name,
            "mine_site": test_site_name,
            "quantity_litres": -15.0,
            "rate_per_litre": 90.0,
            "odometer_reading_km": 10500,
            "is_test_record": 1
        })
        bad_log.insert(ignore_permissions=True)
        record_result(3, "Negative quantity rejection", False, "System allowed negative quantity saving without error.")
    except frappe.ValidationError as ve:
        record_result(3, "Negative quantity rejection", True, f"Correctly caught ValidationError: {ve}")
    except Exception as e:
        record_result(3, "Negative quantity rejection", False, f"Unexpected error: {e}")

    # -------------------------------------------------------------
    # TEST 4: Zero quantity handling
    # -------------------------------------------------------------
    try:
        zero_qty_log = frappe.get_doc({
            "doctype": "Fuel Log",
            "fuel_date": today,
            "vehicle": test_veh_a,
            "driver": test_driver_name,
            "mine_site": test_site_name,
            "quantity_litres": 0.0,
            "rate_per_litre": 90.0,
            "odometer_reading_km": 10500,
            "is_test_record": 1
        })
        zero_qty_log.insert(ignore_permissions=True)
        record_result(4, "Zero quantity handling", False, "System allowed 0.0 quantity saving without error.")
    except frappe.ValidationError as ve:
        record_result(4, "Zero quantity handling", True, f"Correctly rejected zero quantity with ValidationError: {ve}")
    except Exception as e:
        record_result(4, "Zero quantity handling", False, f"Unexpected error: {e}")

    # -------------------------------------------------------------
    # TEST 5: Negative odometer rejection
    # -------------------------------------------------------------
    try:
        neg_odo_log = frappe.get_doc({
            "doctype": "Fuel Log",
            "fuel_date": today,
            "vehicle": test_veh_a,
            "driver": test_driver_name,
            "mine_site": test_site_name,
            "quantity_litres": 30.0,
            "rate_per_litre": 90.0,
            "odometer_reading_km": -250,
            "is_test_record": 1
        })
        neg_odo_log.insert(ignore_permissions=True)
        record_result(5, "Negative odometer rejection", False, "System allowed negative odometer saving without error.")
    except frappe.ValidationError as ve:
        record_result(5, "Negative odometer rejection", True, f"Correctly caught ValidationError: {ve}")
    except Exception as e:
        record_result(5, "Negative odometer rejection", False, f"Unexpected error: {e}")

    # -------------------------------------------------------------
    # TEST 6: Odometer lower than previous reading rejection
    # -------------------------------------------------------------
    try:
        # Initial confirmed odometer of test_veh_a is 10000. Attempting to log 9500 must fail.
        lower_odo_log = frappe.get_doc({
            "doctype": "Fuel Log",
            "fuel_date": today,
            "vehicle": test_veh_a,
            "driver": test_driver_name,
            "mine_site": test_site_name,
            "quantity_litres": 40.0,
            "rate_per_litre": 90.0,
            "odometer_reading_km": 9500,
            "is_test_record": 1
        })
        lower_odo_log.insert(ignore_permissions=True)
        record_result(6, "Odometer lower than vehicle confirmed reading rejection", False, "System allowed odometer lower than confirmed vehicle odometer.")
    except frappe.ValidationError as ve:
        record_result(6, "Odometer lower than vehicle confirmed reading rejection", True, f"Correctly caught ValidationError: {ve}")
    except Exception as e:
        record_result(6, "Odometer lower than vehicle confirmed reading rejection", False, f"Unexpected error: {e}")

    # -------------------------------------------------------------
    # TEST 7: First fuel entry handling
    # -------------------------------------------------------------
    try:
        log1.reload()
        if log1.distance_travelled_km == 0 and log1.km_per_litre == 0.0 and (log1.previous_odometer_km is None or log1.previous_odometer_km == 0):
            record_result(7, "First fuel entry handling", True, f"Initial benchmark established: Prev={log1.previous_odometer_km}, Dist={log1.distance_travelled_km}, KM/L={log1.km_per_litre}, Note={log1.efficiency_note}")
        else:
            record_result(7, "First fuel entry handling", False, f"Unexpected first entry values: Prev={log1.previous_odometer_km}, Dist={log1.distance_travelled_km}, KM/L={log1.km_per_litre}")
    except Exception as e:
        record_result(7, "First fuel entry handling", False, str(e))

    # Approve log1 so it becomes the confirmed previous fuel benchmark
    apply_workflow(log1, "Approve")
    assert log1.approval_status == "Approved"

    # -------------------------------------------------------------
    # TEST 8: KM/L calculation using two valid readings & Full-Tank Logic
    # -------------------------------------------------------------
    try:
        # Log 2 on test_veh_a: Odometer = 10600 (prev approved was 10200). Dist = 400 KM. Qty = 80 L.
        # Expected KM/L = 400 / 80 = 5.0 KM/L. Full tank = 1.
        log2 = frappe.get_doc({
            "doctype": "Fuel Log",
            "fuel_date": today,
            "vehicle": test_veh_a,
            "driver": test_driver_name,
            "mine_site": test_site_name,
            "fuel_source": "Site Bowser",
            "quantity_litres": 80.0,
            "rate_per_litre": 90.0,
            "odometer_reading_km": 10600,
            "is_full_tank": 1,
            "is_test_record": 1
        })
        log2.insert(ignore_permissions=True)
        
        expected_dist = 400
        expected_kml = 5.0
        if log2.previous_odometer_km == 10200 and log2.distance_travelled_km == expected_dist and log2.km_per_litre == expected_kml and "Full-tank" in (log2.efficiency_note or ""):
            record_result(8, "KM/L calculation & Full-tank logic", True, f"Prev Odo: {log2.previous_odometer_km}, Dist: {log2.distance_travelled_km} KM, Qty: {log2.quantity_litres} L -> KM/L: {log2.km_per_litre} ({log2.efficiency_note})")
        else:
            record_result(8, "KM/L calculation & Full-tank logic", False, f"Expected Dist {expected_dist}, KML {expected_kml}. Got Dist {log2.distance_travelled_km}, KML {log2.km_per_litre}, Note: {log2.efficiency_note}")
    except Exception as e:
        record_result(8, "KM/L calculation & Full-tank logic", False, str(e))

    # Approve log2
    apply_workflow(log2, "Approve")
    assert log2.approval_status == "Approved"

    # -------------------------------------------------------------
    # TEST 9: Separate vehicle calculation isolation
    # -------------------------------------------------------------
    try:
        # First entry for Vehicle B: Odometer = 25000 (matches veh_b confirmed odo)
        log_b1 = frappe.get_doc({
            "doctype": "Fuel Log",
            "fuel_date": today,
            "vehicle": test_veh_b,
            "driver": test_driver_name,
            "mine_site": test_site_name,
            "quantity_litres": 60.0,
            "rate_per_litre": 95.0,
            "odometer_reading_km": 25000,
            "is_full_tank": 1,
            "is_test_record": 1
        })
        log_b1.insert(ignore_permissions=True)
        apply_workflow(log_b1, "Approve")

        # Second entry for Vehicle B: Odometer = 25450. Distance = 450 KM. Qty = 90.0 L. KM/L = 5.0
        log_b2 = frappe.get_doc({
            "doctype": "Fuel Log",
            "fuel_date": today,
            "vehicle": test_veh_b,
            "driver": test_driver_name,
            "mine_site": test_site_name,
            "quantity_litres": 90.0,
            "rate_per_litre": 95.0,
            "odometer_reading_km": 25450,
            "is_full_tank": 1,
            "is_test_record": 1
        })
        log_b2.insert(ignore_permissions=True)

        if log_b2.previous_odometer_km == 25000 and log_b2.distance_travelled_km == 450 and log_b2.km_per_litre == 5.0:
            record_result(9, "Separate vehicle calculation isolation", True, f"Vehicle B isolated: Prev Odo={log_b2.previous_odometer_km} (not Veh A 10600), Dist={log_b2.distance_travelled_km}, KM/L={log_b2.km_per_litre}")
        else:
            record_result(9, "Separate vehicle calculation isolation", False, f"Veh B leak: Prev={log_b2.previous_odometer_km}, Dist={log_b2.distance_travelled_km}, KM/L={log_b2.km_per_litre}")
    except Exception as e:
        record_result(9, "Separate vehicle calculation isolation", False, str(e))

    # -------------------------------------------------------------
    # TEST 10: Invalid/duplicate odometer handling
    # -------------------------------------------------------------
    try:
        dup_log = frappe.get_doc({
            "doctype": "Fuel Log",
            "fuel_date": today,
            "vehicle": test_veh_a,
            "driver": test_driver_name,
            "mine_site": test_site_name,
            "quantity_litres": 35.0,
            "rate_per_litre": 90.0,
            "odometer_reading_km": 10600, # Duplicate to latest approved log2
            "is_full_tank": 0,
            "is_test_record": 1
        })
        dup_log.insert(ignore_permissions=True)
        
        if dup_log.distance_travelled_km == 0 and dup_log.km_per_litre == 0.0 and "Duplicate" in (dup_log.efficiency_note or ""):
            record_result(10, "Invalid/duplicate odometer handling", True, f"Duplicate reading handled cleanly: Dist={dup_log.distance_travelled_km}, KM/L={dup_log.km_per_litre}, Note={dup_log.efficiency_note}")
        else:
            record_result(10, "Invalid/duplicate odometer handling", False, f"Corrupted efficiency on duplicate: Dist={dup_log.distance_travelled_km}, KM/L={dup_log.km_per_litre}")
    except Exception as e:
        record_result(10, "Invalid/duplicate odometer handling", False, str(e))

    # -------------------------------------------------------------
    # TEST 11: Fuel Approval Security & Silent Edit Prevention
    # -------------------------------------------------------------
    try:
        # Part A: Direct status edit without workflow is blocked
        dup_log.reload()
        try:
            dup_log.approval_status = "Approved" # Direct edit without apply_workflow
            dup_log.save(ignore_permissions=True)
            direct_edit_blocked = False
        except Exception as e:
            direct_edit_blocked = "Direct editing of Approval Status is prohibited" in str(e)

        # Part B: Creator self-approval blocked (test with non-System Manager user)
        # Create a test driver user
        test_driver_user = "driver_tester@uptoware.local"
        if not frappe.db.exists("User", test_driver_user):
            u = frappe.get_doc({
                "doctype": "User",
                "email": test_driver_user,
                "first_name": "Driver",
                "last_name": "Tester",
                "roles": [{"role": "Driver"}]
            }).insert(ignore_permissions=True)

        user_log = frappe.get_doc({
            "doctype": "Fuel Log",
            "fuel_date": today,
            "vehicle": test_veh_a,
            "driver": test_driver_name,
            "mine_site": test_site_name,
            "quantity_litres": 50.0,
            "rate_per_litre": 90.0,
            "odometer_reading_km": 10900,
            "owner": test_driver_user,
            "is_test_record": 1
        }).insert(ignore_permissions=True)

        # Try to approve with test_driver_user session
        orig_user = frappe.session.user
        frappe.set_user(test_driver_user)
        try:
            apply_workflow(user_log, "Approve")
            self_approval_blocked = False
        except Exception as e:
            self_approval_blocked = True # Blocked as expected!
        finally:
            frappe.set_user(orig_user)

        # Part C: Silent edit of critical fields on Approved log is blocked
        # log2 is currently Approved. Try editing quantity as non-System Manager
        frappe.set_user(test_driver_user)
        try:
            log2.reload()
            log2.quantity_litres = 999.0
            log2.save()
            silent_edit_blocked = False
        except Exception as e:
            silent_edit_blocked = True
        finally:
            frappe.set_user(orig_user)

        if direct_edit_blocked and self_approval_blocked and silent_edit_blocked:
            record_result(11, "Fuel Approval Security & Immutability", True, f"Direct edit blocked: {direct_edit_blocked}, Self-approval blocked: {self_approval_blocked}, Silent edit blocked: {silent_edit_blocked}")
        else:
            record_result(11, "Fuel Approval Security & Immutability", False, f"Direct edit blocked={direct_edit_blocked}, Self-approval blocked={self_approval_blocked}, Silent edit blocked={silent_edit_blocked}")
    except Exception as e:
        record_result(11, "Fuel Approval Security & Immutability", False, str(e))

    # -------------------------------------------------------------
    # TEST 12: Previous Benchmark & Report Approved-Only Isolation
    # -------------------------------------------------------------
    try:
        import frappe.desk.query_report as qr

        # Create an unapproved Draft log on test_veh_a at 11,200 km
        draft_unapproved = frappe.get_doc({
            "doctype": "Fuel Log",
            "fuel_date": today,
            "vehicle": test_veh_a,
            "driver": test_driver_name,
            "mine_site": test_site_name,
            "quantity_litres": 50.0,
            "rate_per_litre": 90.0,
            "odometer_reading_km": 11200,
            "is_test_record": 1
        }).insert(ignore_permissions=True)

        # Create another log at 11,400 km. Its benchmark must be 10,600 km (latest APPROVED log), NOT 11,200 km (unapproved Draft log)!
        subsequent_log = frappe.get_doc({
            "doctype": "Fuel Log",
            "fuel_date": today,
            "vehicle": test_veh_a,
            "driver": test_driver_name,
            "mine_site": test_site_name,
            "quantity_litres": 60.0,
            "rate_per_litre": 90.0,
            "odometer_reading_km": 11400,
            "is_test_record": 1
        })
        subsequent_log.insert(ignore_permissions=True)

        # Previous odometer must be 10600 (from approved log2), ignoring draft_unapproved (11200)!
        benchmark_excludes_draft = (subsequent_log.previous_odometer_km == 10600)

        # Check Report approved-only filtering:
        # Run report and verify draft records are excluded
        report_names = [
            "Daily Fuel Consumption",
            "Vehicle-wise Fuel Consumption",
            "Monthly Fuel Cost",
            "Fuel Efficiency (KM/L)",
            "Fuel Consumption by Mine Site"
        ]
        
        all_excluded = True
        for rname in report_names:
            res = qr.run(report_name=rname, filters={"from_date": "", "to_date": "", "vehicle": "", "driver": "", "mine_site": ""})
            rows = res.get("result", [])
            for row in rows:
                row_str = str(row)
                if test_veh_a in row_str or test_veh_b in row_str or test_site_name in row_str:
                    all_excluded = False
                    break

        if benchmark_excludes_draft and all_excluded:
            record_result(12, "Approved-only Benchmark & Report Filtering", True, f"Benchmark correctly excluded Draft (used approved 10600 km): {benchmark_excludes_draft}, Reports excluded test/drafts: {all_excluded}")
        else:
            record_result(12, "Approved-only Benchmark & Report Filtering", False, f"Benchmark excluded draft={benchmark_excludes_draft}, Reports excluded={all_excluded}")
    except Exception as e:
        record_result(12, "Approved-only Benchmark & Report Filtering", False, str(e))

    # -------------------------------------------------------------
    # TEST 13: Interaction between Mining Trip and Fuel Log (Zero Regression)
    # -------------------------------------------------------------
    try:
        # Create a dedicated vehicle for interaction test
        veh_interact = "TEST-B3-INTERACT"
        if not frappe.db.exists("Vehicle", veh_interact):
            v_int = frappe.get_doc({
                "doctype": "Vehicle",
                "license_plate": veh_interact,
                "make": "Tata",
                "model": "Prima 3530.K",
                "fuel_type": "Diesel",
                "uom": "Nos",
                "vehicle_status": "Active",
                "last_odometer": 50000,
                "start_date": "2026-01-01",
                "end_date": "2027-12-31",
                "fitness_expiry_date": "2027-12-31",
                "puc_expiry_date": "2027-12-31",
                "road_tax_expiry_date": "2027-12-31",
                "permit_expiry_date": "2027-12-31",
                "is_test_record": 1
            }).insert(ignore_permissions=True)
        else:
            v_int = frappe.get_doc("Vehicle", veh_interact)
            v_int.vehicle_status = "Active"
            v_int.start_date = "2026-01-01"
            v_int.end_date = "2027-12-31"
            v_int.fitness_expiry_date = "2027-12-31"
            v_int.puc_expiry_date = "2027-12-31"
            v_int.road_tax_expiry_date = "2027-12-31"
            v_int.permit_expiry_date = "2027-12-31"
            v_int.is_test_record = 1
            v_int.save(ignore_permissions=True)
            frappe.db.set_value("Vehicle", veh_interact, "last_odometer", 50000)

        # 1. Mining Trip delivery updates vehicle odometer to 50,300 KM
        now_dt = frappe.utils.now_datetime()
        trip_int = frappe.get_doc({
            "doctype": "Mining Trip",
            "dispatch_date_time": now_dt,
            "trip_date": today,
            "vehicle": veh_interact,
            "driver": test_driver_name,
            "mine_site": test_site_name,
            "mineral_type": "Iron Ore",
            "destination": "Processing Plant A",
            "challan_number": "CH-TEST-INTERACT-01",
            "opening_odometer": 50000,
            "closing_odometer": 50300,
            "gross_weight_tons": 35.5,
            "tare_weight_tons": 10.0,
            "rate_per_ton": 450.0,
            "trip_status": "Draft",
            "is_test_record": 1
        }).insert(ignore_permissions=True)

        apply_workflow(trip_int, "Dispatch")
        apply_workflow(trip_int, "Confirm Weighbridge")
        apply_workflow(trip_int, "Approve")
        trip_int.return_date_time = frappe.utils.now_datetime()
        trip_int.delivery_date_time = frappe.utils.now_datetime()
        trip_int.closing_odometer = 50300
        trip_int.save(ignore_permissions=True)
        apply_workflow(trip_int, "Mark Delivered")

        v_int.reload()
        trip_advances_odo = (v_int.last_odometer == 50300)

        # 2. Fuel Log approved at 50,600 KM advances vehicle odometer to 50,600 KM
        fuel_int = frappe.get_doc({
            "doctype": "Fuel Log",
            "fuel_date": today,
            "vehicle": veh_interact,
            "driver": test_driver_name,
            "mine_site": test_site_name,
            "fuel_source": "Site Bowser",
            "quantity_litres": 75.0,
            "rate_per_litre": 90.0,
            "odometer_reading_km": 50600,
            "is_full_tank": 1,
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        apply_workflow(fuel_int, "Approve")

        v_int.reload()
        fuel_advances_odo = (v_int.last_odometer == 50600)

        # 3. Subsequent Mining Trip attempting opening odometer < 50,600 KM MUST BE REJECTED!
        try:
            bad_subsequent_trip = frappe.get_doc({
                "doctype": "Mining Trip",
                "dispatch_date_time": now_dt,
                "trip_date": today,
                "vehicle": veh_interact,
                "driver": test_driver_name,
                "mine_site": test_site_name,
                "destination": "Processing Plant A",
                "challan_number": "CH-TEST-INTERACT-BAD",
                "opening_odometer": 50400, # Lower than 50600!
                "gross_weight_tons": 35.0,
                "tare_weight_tons": 10.0,
                "is_test_record": 1
            })
            bad_subsequent_trip.insert(ignore_permissions=True)
            subsequent_trip_blocked = False
        except Exception as e:
            subsequent_trip_blocked = "cannot be less than vehicle's last recorded odometer" in str(e)

        if trip_advances_odo and fuel_advances_odo and subsequent_trip_blocked:
            record_result(13, "Mining Trip & Fuel Log Odometer Interaction", True, f"Trip updated to 50300: {trip_advances_odo}, Fuel advanced to 50600: {fuel_advances_odo}, Regressive trip blocked: {subsequent_trip_blocked}")
        else:
            record_result(13, "Mining Trip & Fuel Log Odometer Interaction", False, f"Trip={trip_advances_odo}, Fuel={fuel_advances_odo}, Blocked={subsequent_trip_blocked}")
    except Exception as e:
        record_result(13, "Mining Trip & Fuel Log Odometer Interaction", False, str(e))

    # -------------------------------------------------------------
    # TEST 14: Batch 1 and Batch 2 Regression
    # -------------------------------------------------------------
    try:
        # Check Batch 1 Driver-Vehicle assignment integrity
        veh_test_reg = "TEST-REG-V01"
        drv_test_reg = "TEST-REG-D01"
        
        if not frappe.db.exists("Vehicle", veh_test_reg):
            v_reg = frappe.get_doc({
                "doctype": "Vehicle",
                "license_plate": veh_test_reg,
                "make": "Tata",
                "model": "Prima 3530.K",
                "fuel_type": "Diesel",
                "uom": "Nos",
                "vehicle_status": "Active",
                "last_odometer": 5000,
                "start_date": "2026-01-01",
                "end_date": "2027-12-31",
                "fitness_expiry_date": "2027-12-31",
                "puc_expiry_date": "2027-12-31",
                "road_tax_expiry_date": "2027-12-31",
                "permit_expiry_date": "2027-12-31",
                "is_test_record": 1
            }).insert(ignore_permissions=True)
        else:
            v_reg = frappe.get_doc("Vehicle", veh_test_reg)
            v_reg.vehicle_status = "Active"
            v_reg.start_date = "2026-01-01"
            v_reg.end_date = "2027-12-31"
            v_reg.fitness_expiry_date = "2027-12-31"
            v_reg.puc_expiry_date = "2027-12-31"
            v_reg.road_tax_expiry_date = "2027-12-31"
            v_reg.permit_expiry_date = "2027-12-31"
            v_reg.assigned_driver = None
            v_reg.save(ignore_permissions=True)
            frappe.db.set_value("Vehicle", veh_test_reg, "last_odometer", 5000)

        reg_driver = frappe.get_all("Driver", filters={"full_name": "Test Reg Driver"}, fields=["name", "status"])
        if reg_driver:
            drv_test_reg = reg_driver[0]["name"]
            d_reg = frappe.get_doc("Driver", drv_test_reg)
            d_reg.status = "Active"
            d_reg.assigned_vehicle = None
            d_reg.save(ignore_permissions=True)
        else:
            d_reg = frappe.get_doc({
                "doctype": "Driver",
                "full_name": "Test Reg Driver",
                "status": "Active",
                "license_number": "DL-B3-REG-001",
                "is_test_record": 1
            }).insert(ignore_permissions=True)
            drv_test_reg = d_reg.name

        # Two-way sync test
        v_reg.reload()
        v_reg.assigned_driver = drv_test_reg
        v_reg.save(ignore_permissions=True)
        d_reg.reload()
        b1_sync_ok = (d_reg.assigned_vehicle == veh_test_reg)

        # Check Batch 2 Mining Trip Lifecycle & Odometer Sync
        now_dt = frappe.utils.now_datetime()
        reg_trip = frappe.get_doc({
            "doctype": "Mining Trip",
            "dispatch_date_time": now_dt,
            "trip_date": today,
            "vehicle": veh_test_reg,
            "driver": drv_test_reg,
            "mine_site": test_site_name,
            "mineral_type": "Iron Ore",
            "destination": "Processing Plant A",
            "challan_number": "CH-TEST-B3-REG",
            "opening_odometer": 5000,
            "closing_odometer": 5150,
            "gross_weight_tons": 35.5,
            "tare_weight_tons": 10.0,
            "rate_per_ton": 450.0,
            "trip_status": "Draft",
            "workflow_state": "Draft",
            "is_test_record": 1
        })
        reg_trip.insert(ignore_permissions=True)
        b2_net_wt_ok = (reg_trip.net_weight_tons == 25.5)

        apply_workflow(reg_trip, "Dispatch")
        v_reg.reload()
        b2_on_trip_ok = (v_reg.vehicle_status == "On Trip")

        apply_workflow(reg_trip, "Confirm Weighbridge")
        apply_workflow(reg_trip, "Approve")

        reg_trip.return_date_time = frappe.utils.now_datetime()
        reg_trip.delivery_date_time = frappe.utils.now_datetime()
        reg_trip.closing_odometer = 5150
        reg_trip.save(ignore_permissions=True)
        apply_workflow(reg_trip, "Mark Delivered")
        v_reg.reload()
        b2_delivered_ok = (v_reg.vehicle_status == "Active" and v_reg.last_odometer == 5150)

        if b1_sync_ok and b2_net_wt_ok and b2_on_trip_ok and b2_delivered_ok:
            record_result(14, "Batch 1 and Batch 2 Regression", True, f"B1 Sync: {b1_sync_ok}, B2 Net Wt: {b2_net_wt_ok}, B2 On Trip: {b2_on_trip_ok}, B2 Delivered & Odo: {b2_delivered_ok}")
        else:
            record_result(14, "Batch 1 and Batch 2 Regression", False, f"B1 Sync: {b1_sync_ok}, B2 Net Wt: {b2_net_wt_ok}, B2 On Trip: {b2_on_trip_ok}, B2 Delivered: {b2_delivered_ok}")
    except Exception as e:
        record_result(14, "Batch 1 and Batch 2 Regression", False, str(e))

    # Clean up test entities created
    frappe.db.delete("Fuel Log", {"vehicle": ["in", [test_veh_a, test_veh_b, veh_interact, veh_test_reg]]})
    frappe.db.delete("Mining Trip", {"vehicle": ["in", [veh_interact, veh_test_reg]]})
    frappe.db.commit()

    print("\n=======================================================")
    print(f"   BATCH 3 TEST SUMMARY: {passed} PASSED / {failed} FAILED (TOTAL {passed + failed})")
    print("=======================================================\n")
    
    return passed, failed

run()
