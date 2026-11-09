import frappe
from frappe.utils import nowdate, now_datetime, add_days, flt
from frappe.model.workflow import apply_workflow

def run_tests():
    frappe.init("frontend")
    frappe.connect()

    print("\n" + "=" * 80)
    print("      FINAL TWO-POINT VERIFICATION SUITE — PRE-DEPLOYMENT AUDIT      ")
    print("=" * 80 + "\n")

    results = []

    def log_result(test_num, name, passed, details):
        status = "PASS" if passed else "FAIL"
        icon = "✅" if passed else "❌"
        results.append((test_num, name, status, details))
        print(f"{icon} Test {test_num:02d}: {name:<45} | {status} | {details}")

    # =========================================================================
    # AREA 1: VEHICLE STATUS INTEGRITY
    # =========================================================================
    print("--- AREA 1: VEHICLE STATUS INTEGRITY ---")

    # Test 1: Verify Vehicle DocType status field and permitted options
    meta = frappe.get_meta("Vehicle")
    status_df = meta.get_field("vehicle_status")
    permitted_options = [opt.strip() for opt in (status_df.options or "").split("\n") if opt.strip()]
    expected_options = ['Active', 'On Trip', 'Under Maintenance', 'Breakdown', 'Out of Service']
    options_correct = (status_df.fieldname == "vehicle_status" and
                       set(permitted_options) == set(expected_options) and
                       "Available" not in permitted_options)
    log_result(1, "Vehicle Status Field & Permitted Options", options_correct,
               f"Field: '{status_df.fieldname}', Options: {permitted_options}, 'Available' excluded: {'Available' not in permitted_options}")

    # Test 2: Verify existing Vehicle records in database
    db_statuses = [s[0] for s in frappe.db.sql("SELECT DISTINCT vehicle_status FROM `tabVehicle` WHERE vehicle_status IS NOT NULL AND vehicle_status != ''")]
    invalid_in_db = [s for s in db_statuses if s not in permitted_options]
    avail_in_db = frappe.db.count("Vehicle", {"vehicle_status": "Available"})
    test2_pass = (len(invalid_in_db) == 0 and avail_in_db == 0)
    log_result(2, "Database Vehicle Status Options Conformance", test2_pass,
               f"DB Statuses: {db_statuses}, Invalid: {invalid_in_db}, 'Available' count: {avail_in_db}")

    # Setup test vehicle for lifecycle tests
    test_veh_name = "TEST-STATUS-INTEGRITY-VEH"
    existing_trips = frappe.get_all("Mining Trip", filters={"vehicle": test_veh_name}, pluck="name")
    for t_name in existing_trips:
        frappe.delete_doc("Mining Trip", t_name, force=True)
    if frappe.db.exists("Vehicle", test_veh_name):
        frappe.delete_doc("Vehicle", test_veh_name, force=True)

    today = nowdate()
    test_veh = frappe.get_doc({
        "doctype": "Vehicle",
        "license_plate": test_veh_name,
        "make": "BharatBenz",
        "model": "3528C Mining Tipper",
        "uom": "Nos",
        "fuel_type": "Diesel",
        "vehicle_status": "Active",
        "last_odometer": 10000,
        "is_test_record": 1,
        "start_date": add_days(today, -30),
        "end_date": add_days(today, 180),
        "fitness_expiry_date": add_days(today, 180),
        "puc_expiry_date": add_days(today, 180),
        "road_tax_expiry_date": add_days(today, 180),
        "permit_expiry_date": add_days(today, 180)
    })
    test_veh.flags.ignore_permissions = True
    test_veh.insert()

    # Create dummy Driver
    test_drv_name = "TEST-STATUS-INTEGRITY-DRIVER"
    existing_drv = frappe.db.get_value("Driver", {"full_name": test_drv_name}, "name")
    if existing_drv:
        drv = existing_drv
    else:
        d_doc = frappe.get_doc({
            "doctype": "Driver",
            "full_name": test_drv_name,
            "status": "Active",
            "license_number": "LIC-STATUS-001",
            "is_test_record": 1
        })
        d_doc.flags.ignore_permissions = True
        d_doc.insert()
        drv = d_doc.name

    site = frappe.db.get_value("Mine Site", {"status": "Operational"}, "name")
    frappe.set_user("Administrator")

    # Test 3: Mining Trip Dispatch -> Vehicle status becomes "On Trip"
    trip = frappe.get_doc({
        "doctype": "Mining Trip",
        "vehicle": test_veh_name,
        "driver": drv,
        "mine_site": site,
        "destination": "Processing Plant A",
        "dispatch_date_time": now_datetime(),
        "trip_date": today,
        "opening_odometer": 10000,
        "is_test_record": 1
    })
    trip.flags.ignore_permissions = True
    trip.insert()
    apply_workflow(trip, "Dispatch")
    frappe.db.commit()

    v_st_after_dispatch = frappe.db.get_value("Vehicle", test_veh_name, "vehicle_status")
    test3_pass = (v_st_after_dispatch == "On Trip")
    log_result(3, "Trip Dispatch -> Vehicle Status 'On Trip'", test3_pass,
               f"Expected: 'On Trip', Actual: '{v_st_after_dispatch}'")

    # Test 4: Mining Trip Delivery -> Vehicle status restored to "Active" (NOT "Available") & odometer updated
    trip.gross_weight_tons = 35.0
    trip.tare_weight_tons = 15.0
    trip.save(ignore_permissions=True)
    apply_workflow(trip, "Confirm Weighbridge")
    frappe.db.commit()

    trip.closing_odometer = 10150
    trip.return_date_time = now_datetime()
    trip.save(ignore_permissions=True)
    apply_workflow(trip, "Approve")
    frappe.db.commit()

    trip.reload()
    apply_workflow(trip, "Mark Delivered")
    frappe.db.commit()

    v_st_after_delivery = frappe.db.get_value("Vehicle", test_veh_name, "vehicle_status")
    v_odo_after_delivery = frappe.db.get_value("Vehicle", test_veh_name, "last_odometer")
    test4_pass = (v_st_after_delivery == "Active" and v_odo_after_delivery == 10150)
    log_result(4, "Trip Delivery -> Restores 'Active' & Odometer", test4_pass,
               f"Status: '{v_st_after_delivery}' (Active: {v_st_after_delivery == 'Active'}, Not Available: {v_st_after_delivery != 'Available'}), Odometer: {v_odo_after_delivery}")

    # Test 5: Mining Trip Cancellation -> Vehicle status restored from "On Trip" to "Active"
    trip2 = frappe.get_doc({
        "doctype": "Mining Trip",
        "vehicle": test_veh_name,
        "driver": drv,
        "mine_site": site,
        "destination": "Processing Plant A",
        "dispatch_date_time": now_datetime(),
        "trip_date": today,
        "opening_odometer": 10150,
        "is_test_record": 1
    })
    trip2.flags.ignore_permissions = True
    trip2.insert()
    apply_workflow(trip2, "Dispatch")
    frappe.db.commit()

    # Cancel trip with mandatory reason
    trip2.cancellation_reason = "Customer canceled scheduled dispatch."
    trip2.save(ignore_permissions=True)
    apply_workflow(trip2, "Cancel")
    frappe.db.commit()

    v_st_after_cancel = frappe.db.get_value("Vehicle", test_veh_name, "vehicle_status")
    test5_pass = (v_st_after_cancel == "Active")
    log_result(5, "Trip Cancellation -> Restores 'Active'", test5_pass,
               f"Expected: 'Active', Actual: '{v_st_after_cancel}'")

    # Test 6: Existing state "Under Maintenance" or "Breakdown" is NEVER overwritten on trip delivery
    trip3 = frappe.get_doc({
        "doctype": "Mining Trip",
        "vehicle": test_veh_name,
        "driver": drv,
        "mine_site": site,
        "destination": "Processing Plant A",
        "dispatch_date_time": now_datetime(),
        "trip_date": today,
        "opening_odometer": 10150,
        "is_test_record": 1
    })
    trip3.flags.ignore_permissions = True
    trip3.insert()
    apply_workflow(trip3, "Dispatch")
    frappe.db.commit()

    # Simulate roadside breakdown occurred during trip: workshop updates vehicle status to "Breakdown"
    frappe.db.set_value("Vehicle", test_veh_name, "vehicle_status", "Breakdown")

    # Advance and Deliver trip
    trip3.gross_weight_tons = 35.0
    trip3.tare_weight_tons = 15.0
    trip3.save(ignore_permissions=True)
    apply_workflow(trip3, "Confirm Weighbridge")
    frappe.db.commit()

    trip3.closing_odometer = 10200
    trip3.return_date_time = now_datetime()
    trip3.save(ignore_permissions=True)
    apply_workflow(trip3, "Approve")
    frappe.db.commit()

    trip3.reload()
    apply_workflow(trip3, "Mark Delivered")
    frappe.db.commit()

    v_st_breakdown_preserved = frappe.db.get_value("Vehicle", test_veh_name, "vehicle_status")
    test6_pass = (v_st_breakdown_preserved == "Breakdown")
    log_result(6, "Preserve 'Breakdown' on Delivery (No Overwrite)", test6_pass,
               f"Expected: 'Breakdown', Actual: '{v_st_breakdown_preserved}'")

    # Test 7: Existing state "Out of Service" is NEVER overwritten on trip cancellation
    # Reset vehicle to Active to allow dispatch
    frappe.db.set_value("Vehicle", test_veh_name, "vehicle_status", "Active")

    trip4 = frappe.get_doc({
        "doctype": "Mining Trip",
        "vehicle": test_veh_name,
        "driver": drv,
        "mine_site": site,
        "destination": "Processing Plant A",
        "dispatch_date_time": now_datetime(),
        "trip_date": today,
        "opening_odometer": 10200,
        "is_test_record": 1
    })
    trip4.flags.ignore_permissions = True
    trip4.insert()
    apply_workflow(trip4, "Dispatch")
    frappe.db.commit()

    # Set vehicle to Out of Service
    frappe.db.set_value("Vehicle", test_veh_name, "vehicle_status", "Out of Service")

    # Cancel trip
    trip4.cancellation_reason = "Vehicle decommissioned and retired from fleet."
    trip4.save(ignore_permissions=True)
    apply_workflow(trip4, "Cancel")
    frappe.db.commit()

    v_st_oos_preserved = frappe.db.get_value("Vehicle", test_veh_name, "vehicle_status")
    test7_pass = (v_st_oos_preserved == "Out of Service")
    log_result(7, "Preserve 'Out of Service' on Cancel (No Overwrite)", test7_pass,
               f"Expected: 'Out of Service', Actual: '{v_st_oos_preserved}'")

    # Cleanup test records
    frappe.delete_doc("Mining Trip", trip.name, force=True)
    frappe.delete_doc("Mining Trip", trip2.name, force=True)
    frappe.delete_doc("Mining Trip", trip3.name, force=True)
    frappe.delete_doc("Mining Trip", trip4.name, force=True)
    frappe.delete_doc("Vehicle", test_veh_name, force=True)
    frappe.delete_doc("Driver", drv, force=True)

    # =========================================================================
    # AREA 2: INSURANCE WARNING CONFIGURATION
    # =========================================================================
    print("\n--- AREA 2: INSURANCE WARNING CONFIGURATION ---")

    fs = frappe.get_doc("Fleet Settings")

    # Test 8: Inspect deployed Fleet Settings record configuration
    test8_pass = (fs.warning_window_days == 30 and fs.reminder_intervals == "30, 15, 7, 0")
    log_result(8, "Deployed Fleet Settings Configuration", test8_pass,
               f"warning_window_days: {fs.warning_window_days}, reminder_intervals: '{fs.reminder_intervals}'")

    # Test 9: Reconcile Schedulers (Batch 8 & Batch 11 implementation)
    sched_code = frappe.db.get_value("Server Script", "Fleet Management - Daily Expiry Monitoring Scheduler", "script")
    has_warning_fetch = 'warning_days = fs.warning_window_days or 30' in sched_code
    has_interval_fetch = 'intervals_str = fs.reminder_intervals or "30, 15, 7, 0"' in sched_code
    test9_pass = (has_warning_fetch and has_interval_fetch)
    log_result(9, "Scheduler Code Alignment with 30/15/7/0 Milestones", test9_pass,
               f"Warning window fallback 30: {has_warning_fetch}, Reminder intervals fallback '30, 15, 7, 0': {has_interval_fetch}")

    # Test 10: Fleet Settings Validation Script
    val_code = frappe.db.get_value("Server Script", "Fleet Settings - Validations", "script")
    validates_window = 'Expiry Warning Window must be a positive integer' in val_code
    validates_intervals = 'Reminder Milestones must contain at least one valid milestone integer' in val_code
    test10_pass = (validates_window and validates_intervals)
    log_result(10, "Fleet Settings Validation Script Integrity", test10_pass,
               f"Validates positive window: {validates_window}, Validates milestone list: {validates_intervals}")

    # Test 11: Milestone Matcher Logic Test
    # Verify that milestones [30, 15, 7, 0] are matched accurately
    intervals = sorted([int(x.strip()) for x in fs.reminder_intervals.split(",") if x.strip().isdigit()], reverse=True)
    matched_30 = (30 in intervals)
    matched_15 = (15 in intervals)
    matched_7  = (7 in intervals)
    matched_0  = (0 in intervals)
    test11_pass = (intervals == [30, 15, 7, 0])
    log_result(11, "Reminder Milestone Intervals Parsing", test11_pass,
               f"Parsed intervals: {intervals} (30: {matched_30}, 15: {matched_15}, 7: {matched_7}, 0: {matched_0})")

    # Summary
    print("\n" + "=" * 80)
    passed_cnt = sum(1 for r in results if r[2] == "PASS")
    total_cnt = len(results)
    print(f"TARGETED TESTS COMPLETED: {passed_cnt}/{total_cnt} PASSED ({(passed_cnt/total_cnt)*100:.1f}%)")
    print("=" * 80 + "\n")

    return passed_cnt == total_cnt

if __name__ == "__main__":
    run_tests()
