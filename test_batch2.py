import frappe

def run_tests():
    from frappe.model.workflow import apply_workflow

    results = []

    def log_result(test_num, name, passed, detail=""):
        status = "PASS" if passed else "FAIL"
        results.append({
            "test_num": test_num,
            "name": name,
            "status": status,
            "detail": detail
        })
        print(f"[{status}] Test {test_num}: {name} - {detail}")

    print("=== STARTING BATCH 2 COMPREHENSIVE AUTOMATED TEST & VERIFICATION SUITE ===")

    # 0. Setup Test Data (Prerequisites)
    # Ensure Test Customer
    if not frappe.db.exists("Customer", "NMDC Mining Corp (TEST)"):
        cust = frappe.get_doc({
            "doctype": "Customer",
            "customer_name": "NMDC Mining Corp (TEST)",
            "customer_type": "Company",
            "customer_group": "Commercial",
            "territory": "India"
        })
        cust.insert(ignore_permissions=True)

    # Ensure Test Dispatcher User (Role: Fleet Manager, but NOT System Manager)
    test_user_email = "test_dispatcher@uptoware.local"
    if not frappe.db.exists("User", test_user_email):
        usr = frappe.get_doc({
            "doctype": "User",
            "email": test_user_email,
            "first_name": "Test",
            "last_name": "Dispatcher",
            "roles": [{"role": "Fleet Manager"}]
        })
        usr.insert(ignore_permissions=True)

    # Clean previous batch 2 test trips and mine sites if any
    for t in frappe.get_all("Mining Trip", filters={"challan_number": ["like", "CH-TEST-%"]}, pluck="name"):
        frappe.delete_doc("Mining Trip", t, force=1)

    for ms in ["Kudremukh North Pit (TEST)", "Donimalai Inactive Pit (TEST)"]:
        if frappe.db.exists("Mine Site", ms):
            frappe.delete_doc("Mine Site", ms, force=1)

    # Ensure clean test vehicles and drivers
    stat_dates = {
        "start_date": "2026-01-01",
        "end_date": "2027-12-31",
        "fitness_expiry_date": "2027-12-31",
        "puc_expiry_date": "2027-12-31",
        "road_tax_expiry_date": "2027-12-31",
        "permit_expiry_date": "2027-12-31",
    }
    if not frappe.db.exists("Vehicle", "KA-19-MG-9001"):
        doc_v1 = {
            "doctype": "Vehicle",
            "license_plate": "KA-19-MG-9001",
            "make": "Tata",
            "model": "Prima 3530.K",
            "fuel_type": "Diesel",
            "uom": "Nos",
            "last_odometer": 80000,
            "vehicle_status": "Active",
            "payload_capacity_tons": 35.0,
            "policy_no": "POL-KA19MG9001-STD",
            "is_test_record": 1
        }
        doc_v1.update(stat_dates)
        frappe.get_doc(doc_v1).insert(ignore_permissions=True)
    else:
        v1_vals = {"vehicle_status": "Active", "last_odometer": 80000, "policy_no": "POL-KA19MG9001-STD", "is_test_record": 1}
        v1_vals.update(stat_dates)
        frappe.db.set_value("Vehicle", "KA-19-MG-9001", v1_vals)

    if not frappe.db.exists("Vehicle", "KA-19-MG-9002"):
        doc_v2 = {
            "doctype": "Vehicle",
            "license_plate": "KA-19-MG-9002",
            "make": "BharatBenz",
            "model": "3528CM",
            "fuel_type": "Diesel",
            "uom": "Nos",
            "last_odometer": 45000,
            "vehicle_status": "Active",
            "payload_capacity_tons": 35.0,
            "policy_no": "POL-KA19MG9002-STD",
            "is_test_record": 1
        }
        doc_v2.update(stat_dates)
        frappe.get_doc(doc_v2).insert(ignore_permissions=True)
    else:
        v2_vals = {"vehicle_status": "Active", "last_odometer": 45000, "policy_no": "POL-KA19MG9002-STD", "is_test_record": 1}
        v2_vals.update(stat_dates)
        frappe.db.set_value("Vehicle", "KA-19-MG-9002", v2_vals)

    # Test Active Driver 1
    drv_active_id = frappe.db.get_value("Driver", {"full_name": "Test Driver Active"}, "name")
    if not drv_active_id:
        d_act = frappe.get_doc({
            "doctype": "Driver",
            "full_name": "Test Driver Active",
            "status": "Active",
            "license_number": "DL-TEST-ACT-999",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        drv_active_id = d_act.name
    else:
        frappe.db.set_value("Driver", drv_active_id, {"status": "Active", "is_test_record": 1})

    # Test Active Driver 2
    drv_active_2_id = frappe.db.get_value("Driver", {"full_name": "Test Driver Active 2"}, "name")
    if not drv_active_2_id:
        d_act2 = frappe.get_doc({
            "doctype": "Driver",
            "full_name": "Test Driver Active 2",
            "status": "Active",
            "license_number": "DL-TEST-ACT-888",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        drv_active_2_id = d_act2.name
    else:
        frappe.db.set_value("Driver", drv_active_2_id, {"status": "Active", "is_test_record": 1})

    # Test Inactive Driver
    drv_inact_id = frappe.db.get_value("Driver", {"full_name": "Test Driver Suspended"}, "name")
    if not drv_inact_id:
        d_inact = frappe.get_doc({
            "doctype": "Driver",
            "full_name": "Test Driver Suspended",
            "status": "Suspended",
            "license_number": "DL-TEST-SUSP-777",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        drv_inact_id = d_inact.name
    else:
        frappe.db.set_value("Driver", drv_inact_id, {"status": "Suspended", "is_test_record": 1})

    frappe.db.commit()

    # TEST 1: Mine Site Creation
    try:
        ms1 = frappe.get_doc({
            "doctype": "Mine Site",
            "site_name": "Kudremukh North Pit (TEST)",
            "client": "NMDC Mining Corp (TEST)",
            "location": "Chikkamagaluru District, Karnataka",
            "mineral_type": "Iron Ore",
            "daily_target_tonnage": 5000.0,
            "rate_per_ton": 450.0,
            "active_loading_pits": 3,
            "status": "Operational",
            "is_test_record": 1
        })
        ms1.insert()
        log_result(1, "Mine Site Creation", True, f"Created operational Mine Site: '{ms1.site_name}'")
    except Exception as e:
        log_result(1, "Mine Site Creation", False, str(e))

    # TEST 2: Inactive Mine Site Rejection
    try:
        ms_inactive = frappe.get_doc({
            "doctype": "Mine Site",
            "site_name": "Donimalai Inactive Pit (TEST)",
            "client": "NMDC Mining Corp (TEST)",
            "status": "Inactive",
            "mineral_type": "Iron Ore",
            "is_test_record": 1
        })
        ms_inactive.insert()

        trip_inactive = frappe.get_doc({
            "doctype": "Mining Trip",
            "dispatch_date_time": "2026-11-04 08:00:00",
            "vehicle": "KA-19-MG-9001",
            "driver": drv_active_id,
            "mine_site": ms_inactive.name,
            "destination": "Mangalore Port",
            "challan_number": "CH-TEST-INACT-001"
        })
        trip_inactive.insert()
        log_result(2, "Inactive Mine Site Rejection", False, "Failed to reject trip for Inactive Mine Site!")
    except Exception as e:
        log_result(2, "Inactive Mine Site Rejection", True, f"Successfully blocked: {e}")

    # TEST 3: Valid Mining Trip Creation & Draft State
    trip1 = None
    try:
        trip1 = frappe.get_doc({
            "doctype": "Mining Trip",
            "dispatch_date_time": "2026-11-04 08:30:00",
            "vehicle": "KA-19-MG-9001",
            "driver": drv_active_id,
            "mine_site": "Kudremukh North Pit (TEST)",
            "destination": "Mangalore Pellet Plant",
            "material_type": "Iron Ore",
            "challan_number": "CH-TEST-001",
            "opening_odometer": 80050,
            "rate_per_ton": 450.0
        })
        trip1.insert()
        log_result(3, "Valid Mining Trip Creation", True, f"Created trip '{trip1.name}' (Challan: {trip1.challan_number}) in Draft.")
    except Exception as e:
        log_result(3, "Valid Mining Trip Creation", False, str(e))

    # TEST 4: Gross/Tare/Net Weight Auto-Calculation
    try:
        trip1.gross_weight_tons = 38.650
        trip1.tare_weight_tons = 13.200
        trip1.save()

        expected_net = 25.450
        if round(trip1.net_weight_tons, 3) == expected_net:
            log_result(4, "Gross/Tare/Net Calculation", True, f"Gross: 38.650 T, Tare: 13.200 T -> Net Weight calculated correctly as {trip1.net_weight_tons} T.")
        else:
            log_result(4, "Gross/Tare/Net Calculation", False, f"Expected {expected_net}, got {trip1.net_weight_tons}")
    except Exception as e:
        log_result(4, "Gross/Tare/Net Calculation", False, str(e))

    # TEST 5: Gross Weight Lower than Tare Rejection
    try:
        trip_wt_invalid = frappe.get_doc({
            "doctype": "Mining Trip",
            "dispatch_date_time": "2026-11-04 09:00:00",
            "vehicle": "KA-19-MG-9001",
            "driver": drv_active_id,
            "mine_site": "Kudremukh North Pit (TEST)",
            "destination": "Mangalore Pellet Plant",
            "challan_number": "CH-TEST-WT-INV",
            "opening_odometer": 80050,
            "gross_weight_tons": 12.000,
            "tare_weight_tons": 15.500
        })
        trip_wt_invalid.insert()
        log_result(5, "Gross Weight Lower Than Tare Rejection", False, "Failed to reject gross < tare!")
    except Exception as e:
        log_result(5, "Gross Weight Lower Than Tare Rejection", True, f"Successfully blocked: {e}")

    # TEST 6: Negative Net Weight Rejection
    try:
        trip_neg_net = frappe.get_doc({
            "doctype": "Mining Trip",
            "dispatch_date_time": "2026-11-04 09:00:00",
            "vehicle": "KA-19-MG-9001",
            "driver": drv_active_id,
            "mine_site": "Kudremukh North Pit (TEST)",
            "destination": "Mangalore Pellet Plant",
            "challan_number": "CH-TEST-NEG-NET",
            "opening_odometer": 80050,
            "gross_weight_tons": 5.0,
            "tare_weight_tons": 10.0
        })
        trip_neg_net.insert()
        log_result(6, "Negative Net Weight Rejection", False, "Failed to reject negative net weight!")
    except Exception as e:
        log_result(6, "Negative Net Weight Rejection", True, f"Successfully blocked: {e}")

    # TEST 7: Inactive Driver Rejection
    try:
        trip_inact_drv = frappe.get_doc({
            "doctype": "Mining Trip",
            "dispatch_date_time": "2026-11-04 09:15:00",
            "vehicle": "KA-19-MG-9002",
            "driver": drv_inact_id,
            "mine_site": "Kudremukh North Pit (TEST)",
            "destination": "Mangalore Pellet Plant",
            "challan_number": "CH-TEST-INACT-DRV",
            "opening_odometer": 45100
        })
        trip_inact_drv.insert()
        log_result(7, "Inactive Driver Rejection", False, "Failed to reject inactive/suspended driver!")
    except Exception as e:
        log_result(7, "Inactive Driver Rejection", True, f"Successfully blocked: {e}")

    # TEST 8: Vehicle Dispatch & Status Transition to "On Trip"
    try:
        trip1.reload()
        assert frappe.db.get_value("Vehicle", "KA-19-MG-9001", "vehicle_status") == "Active"

        apply_workflow(trip1, "Dispatch")
        assert trip1.trip_status == "Dispatched", f"Expected Dispatched, got {trip1.trip_status}"

        veh_status_after_dispatch = frappe.db.get_value("Vehicle", "KA-19-MG-9001", "vehicle_status")
        if veh_status_after_dispatch == "On Trip":
            log_result(8, "Vehicle Status On Dispatch (Active -> On Trip)", True, f"Dispatched trip -> Vehicle KA-19-MG-9001 status transitioned to '{veh_status_after_dispatch}'.")
        else:
            log_result(8, "Vehicle Status On Dispatch (Active -> On Trip)", False, f"Expected 'On Trip', got '{veh_status_after_dispatch}'")
    except Exception as e:
        log_result(8, "Vehicle Status On Dispatch (Active -> On Trip)", False, str(e))

    # TEST 9: Conflicting Vehicle Trip Rejection
    try:
        # KA-19-MG-9001 is engaged on trip1 (Dispatched). Attempt to dispatch another trip for KA-19-MG-9001
        trip_veh_conflict = frappe.get_doc({
            "doctype": "Mining Trip",
            "dispatch_date_time": "2026-11-04 10:00:00",
            "vehicle": "KA-19-MG-9001", # same vehicle
            "driver": drv_active_2_id, # free driver
            "mine_site": "Kudremukh North Pit (TEST)",
            "destination": "Mangalore Port",
            "challan_number": "CH-TEST-VEH-CONF",
            "opening_odometer": 80100
        })
        trip_veh_conflict.insert()
        apply_workflow(trip_veh_conflict, "Dispatch")
        log_result(9, "Conflicting Vehicle Trip Rejection", False, "Failed to block conflicting trip on same vehicle!")
    except Exception as e:
        if "Multiple active trips for the same vehicle are strictly prohibited" in str(e):
            log_result(9, "Conflicting Vehicle Trip Rejection", True, f"Successfully blocked: {e}")
        else:
            log_result(9, "Conflicting Vehicle Trip Rejection", False, f"Unexpected error: {e}")

    # TEST 10: Conflicting Driver Trip Rejection
    try:
        # drv_active_id is engaged on trip1 (Dispatched). Attempt to dispatch another trip with drv_active_id
        trip_drv_conflict = frappe.get_doc({
            "doctype": "Mining Trip",
            "dispatch_date_time": "2026-11-04 10:30:00",
            "vehicle": "KA-19-MG-9002", # free vehicle
            "driver": drv_active_id, # occupied driver
            "mine_site": "Kudremukh North Pit (TEST)",
            "destination": "Mangalore Port",
            "challan_number": "CH-TEST-DRV-CONF",
            "opening_odometer": 45100
        })
        trip_drv_conflict.insert()
        apply_workflow(trip_drv_conflict, "Dispatch")
        log_result(10, "Conflicting Driver Trip Rejection", False, "Failed to block conflicting trip on same driver!")
    except Exception as e:
        if "Multiple active trips for the same driver are strictly prohibited" in str(e):
            log_result(10, "Conflicting Driver Trip Rejection", True, f"Successfully blocked: {e}")
        else:
            log_result(10, "Conflicting Driver Trip Rejection", False, f"Unexpected error: {e}")

    # TEST 11: Direct Editing of Trip Status Bypass Prevention
    try:
        # Attempt to bypass Workflow by directly updating doc.trip_status
        trip1.reload()
        trip1.trip_status = "Approved" # Direct edit without apply_workflow
        trip1.save()
        log_result(11, "Workflow Bypass Prevention (Direct Edit trip_status)", False, "Failed to block direct editing of trip_status!")
    except Exception as e:
        if "Direct editing of Trip Status is prohibited" in str(e):
            log_result(11, "Workflow Bypass Prevention (Direct Edit trip_status)", True, f"Successfully blocked direct status edit: {e}")
        else:
            log_result(11, "Workflow Bypass Prevention (Direct Edit trip_status)", False, f"Unexpected error: {e}")

    # TEST 12: Trip Cancellation & Status Restoration
    try:
        # Test trip cancellation restores vehicle status to Active
        trip_to_cancel = frappe.get_doc({
            "doctype": "Mining Trip",
            "dispatch_date_time": "2026-11-04 11:00:00",
            "vehicle": "KA-19-MG-9002",
            "driver": drv_active_2_id,
            "mine_site": "Kudremukh North Pit (TEST)",
            "destination": "Mangalore Port",
            "challan_number": "CH-TEST-CANCEL-001",
            "opening_odometer": 45100
        })
        trip_to_cancel.insert()
        apply_workflow(trip_to_cancel, "Dispatch")
        assert frappe.db.get_value("Vehicle", "KA-19-MG-9002", "vehicle_status") == "On Trip"

        # Cancel trip
        apply_workflow(trip_to_cancel, "Cancel")
        assert trip_to_cancel.trip_status == "Cancelled"
        veh_status_after_cancel = frappe.db.get_value("Vehicle", "KA-19-MG-9002", "vehicle_status")
        if veh_status_after_cancel == "Active":
            log_result(12, "Trip Cancellation & Vehicle Status Restoration", True, f"Cancelled trip -> Vehicle KA-19-MG-9002 status cleanly restored to '{veh_status_after_cancel}'.")
        else:
            log_result(12, "Trip Cancellation & Vehicle Status Restoration", False, f"Expected Active, got {veh_status_after_cancel}")
    except Exception as e:
        log_result(12, "Trip Cancellation & Vehicle Status Restoration", False, str(e))

    # TEST 13: Delivery Lifecycle, Audit Stamping & Vehicle Odometer Sync (Trip 1)
    try:
        trip1.reload()
        # Weighbridge Confirmation
        apply_workflow(trip1, "Confirm Weighbridge")
        assert trip1.trip_status == "Weighbridge Confirmed"
        assert trip1.confirmed_by is not None

        # Approval
        apply_workflow(trip1, "Approve")
        assert trip1.trip_status == "Approved"
        assert trip1.approved_by is not None

        # Delivery with Closing Odometer = 80,300 km
        trip1.return_date_time = "2026-11-04 18:00:00"
        trip1.closing_odometer = 80300
        trip1.save()
        apply_workflow(trip1, "Mark Delivered")
        assert trip1.trip_status == "Delivered"

        # Verify Vehicle Odometer and Status
        veh1_odo = frappe.db.get_value("Vehicle", "KA-19-MG-9001", "last_odometer")
        veh1_status = frappe.db.get_value("Vehicle", "KA-19-MG-9001", "vehicle_status")

        if veh1_odo == 80300 and veh1_status == "Active":
            log_result(13, "Delivery Odometer Sync & Vehicle Status (Trip 1)", True, f"Trip 1 Delivered -> Vehicle last_odometer updated to {veh1_odo} km and status restored to '{veh1_status}'.")
        else:
            log_result(13, "Delivery Odometer Sync & Vehicle Status (Trip 1)", False, f"Expected odo 80300, got {veh1_odo}; expected status Active, got {veh1_status}")
    except Exception as e:
        log_result(13, "Delivery Odometer Sync & Vehicle Status (Trip 1)", False, str(e))

    # TEST 14: Sequential Trips on Same Vehicle with Monotonic Odometer Progression (Trip 2)
    try:
        # Vehicle KA-19-MG-9001 is now Active with last_odometer = 80,300 km
        # Attempt Trip 2 with opening odometer lower than 80,300 km -> Must Fail!
        try:
            trip2_invalid_odo = frappe.get_doc({
                "doctype": "Mining Trip",
                "dispatch_date_time": "2026-11-04 19:00:00",
                "vehicle": "KA-19-MG-9001",
                "driver": drv_active_id,
                "mine_site": "Kudremukh North Pit (TEST)",
                "destination": "Mangalore Port",
                "challan_number": "CH-TEST-SEQ-INV",
                "opening_odometer": 80250 # Invalid: lower than vehicle last odometer 80300
            })
            trip2_invalid_odo.insert()
            log_result(14, "Sequential Trip Odometer Progression (Trip 2)", False, "Failed to block opening odo lower than updated vehicle odo!")
        except Exception as odo_err:
            # Valid Sequential Trip 2
            trip2 = frappe.get_doc({
                "doctype": "Mining Trip",
                "dispatch_date_time": "2026-11-04 19:00:00",
                "vehicle": "KA-19-MG-9001",
                "driver": drv_active_id,
                "mine_site": "Kudremukh North Pit (TEST)",
                "destination": "Mangalore Port",
                "challan_number": "CH-TEST-SEQ-002",
                "opening_odometer": 80310, # Valid: > 80300
                "gross_weight_tons": 39.000,
                "tare_weight_tons": 13.200
            })
            trip2.insert()
            apply_workflow(trip2, "Dispatch")
            assert frappe.db.get_value("Vehicle", "KA-19-MG-9001", "vehicle_status") == "On Trip"

            apply_workflow(trip2, "Confirm Weighbridge")
            apply_workflow(trip2, "Approve")

            trip2.return_date_time = "2026-11-04 23:30:00"
            trip2.closing_odometer = 80580 # +270 km
            trip2.save()
            apply_workflow(trip2, "Mark Delivered")

            veh1_odo_final = frappe.db.get_value("Vehicle", "KA-19-MG-9001", "last_odometer")
            veh1_status_final = frappe.db.get_value("Vehicle", "KA-19-MG-9001", "vehicle_status")

            if veh1_odo_final == 80580 and veh1_status_final == "Active":
                log_result(14, "Sequential Trip Odometer Progression (Trip 2)", True, f"Sequential Trip 2 rejected opening < 80300 km ({odo_err}), completed successfully with closing odo {veh1_odo_final} km and restored status to '{veh1_status_final}'.")
            else:
                log_result(14, "Sequential Trip Odometer Progression (Trip 2)", False, f"Expected odo 80580, got {veh1_odo_final}; status {veh1_status_final}")
    except Exception as e:
        log_result(14, "Sequential Trip Odometer Progression (Trip 2)", False, str(e))

    # TEST 15: Never Overwrite Breakdown / Maintenance Status with Active on Delivery
    try:
        # Create Trip 3 on Vehicle KA-19-MG-9002
        trip3 = frappe.get_doc({
            "doctype": "Mining Trip",
            "dispatch_date_time": "2026-11-04 12:00:00",
            "vehicle": "KA-19-MG-9002",
            "driver": drv_active_2_id,
            "mine_site": "Kudremukh North Pit (TEST)",
            "destination": "Mangalore Pellet Plant",
            "challan_number": "CH-TEST-BRK-001",
            "opening_odometer": 45150,
            "gross_weight_tons": 36.000,
            "tare_weight_tons": 12.000
        })
        trip3.insert()
        apply_workflow(trip3, "Dispatch")
        assert frappe.db.get_value("Vehicle", "KA-19-MG-9002", "vehicle_status") == "On Trip"

        # During trip, vehicle experiences Breakdown (e.g. engine breakdown logged)
        frappe.db.set_value("Vehicle", "KA-19-MG-9002", "vehicle_status", "Breakdown")

        # Now trip completes and transitions through weighbridge, approval, delivery
        apply_workflow(trip3, "Confirm Weighbridge")
        apply_workflow(trip3, "Approve")
        trip3.return_date_time = "2026-11-04 18:00:00"
        trip3.closing_odometer = 45380
        trip3.save()
        apply_workflow(trip3, "Mark Delivered")

        # Check vehicle status: MUST REMAIN "Breakdown" and NOT overwritten with "Active"!
        veh2_status = frappe.db.get_value("Vehicle", "KA-19-MG-9002", "vehicle_status")
        veh2_odo = frappe.db.get_value("Vehicle", "KA-19-MG-9002", "last_odometer")

        if veh2_status == "Breakdown" and veh2_odo == 45380:
            log_result(15, "Preserve Vehicle Breakdown Status on Delivery", True, f"Trip Delivered -> Odometer updated to {veh2_odo} km, while 'Breakdown' status was strictly preserved and NOT overwritten.")
        else:
            log_result(15, "Preserve Vehicle Breakdown Status on Delivery", False, f"Vehicle status was overwritten: '{veh2_status}', expected 'Breakdown'!")
    except Exception as e:
        log_result(15, "Preserve Vehicle Breakdown Status on Delivery", False, str(e))

    # TEST 16: Completed Trip Edit Restrictions
    try:
        frappe.set_user(test_user_email)
        try:
            t_edit = frappe.get_doc("Mining Trip", trip1.name)
            t_edit.gross_weight_tons = 50.000
            t_edit.save()
            frappe.set_user("Administrator")
            log_result(16, "Completed Trip Edit Restrictions", False, "Failed to block non-System-Manager from modifying critical fields on Delivered trip!")
        except Exception as edit_err:
            frappe.set_user("Administrator")
            if "Modifying critical field" in str(edit_err) or "restricted to System Managers" in str(edit_err):
                log_result(16, "Completed Trip Edit Restrictions", True, f"Successfully blocked unauthorized edit by non-System-Manager: {edit_err}")
            else:
                log_result(16, "Completed Trip Edit Restrictions", False, f"Unexpected error during edit test: {edit_err}")
    except Exception as e:
        frappe.set_user("Administrator")
        log_result(16, "Completed Trip Edit Restrictions", False, str(e))

    # TEST 17: Test-Record Exclusion & Automatic Tagging
    try:
        trip1.reload()
        assert trip1.is_test_record == 1, "Trip failed to inherit is_test_record = 1 from test records!"

        prod_trips = frappe.get_all("Mining Trip", filters={"is_test_record": 0}, pluck="name")
        assert trip1.name not in prod_trips, "Test trip leaked into operational trips query!"

        log_result(17, "Test-Record Exclusion & Tagging", True, f"Trip '{trip1.name}' is correctly marked is_test_record=1 and completely excluded from operational filter queries.")
    except Exception as e:
        log_result(17, "Test-Record Exclusion & Tagging", False, str(e))

    # TEST 18: Batch 1 Regression Check (Ensure Vehicle & Driver sync remain functional)
    try:
        # Reset KA-19-MG-9002 status back to Active for regression
        frappe.db.set_value("Vehicle", "KA-19-MG-9002", "vehicle_status", "Active")

        v_reg = frappe.get_doc("Vehicle", "KA-19-MG-9002")
        v_reg.assigned_driver = drv_active_2_id
        v_reg.save()

        d_reg = frappe.get_doc("Driver", drv_active_2_id)
        assert d_reg.assigned_vehicle == "KA-19-MG-9002", "Driver failed to sync assigned_vehicle!"

        # Clear
        v_reg.assigned_driver = None
        v_reg.save()
        d_reg.reload()
        assert d_reg.assigned_vehicle is None, "Driver failed to clear assigned_vehicle!"

        log_result(18, "Batch 1 Vehicle-Driver Sync Regression", True, "Bi-directional vehicle-driver sync continues to operate flawlessly alongside Batch 2.")
    except Exception as e:
        log_result(18, "Batch 1 Vehicle-Driver Sync Regression", False, str(e))

    frappe.db.commit()
    print("\n=== SUMMARY OF BATCH 2 TEST RESULTS ===")
    total = len(results)
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    print(f"Total Tests: {total} | Passed: {passed} | Failed: {failed}")
    print(f"OVERALL RESULT: {'ALL PASS' if failed == 0 else 'SOME FAILED'}")

    return results

run_tests()
