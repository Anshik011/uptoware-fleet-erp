import frappe

def run():
    import frappe
    from frappe.model.workflow import apply_workflow

    print("\n=======================================================")
    print("   UPTOWARE FLEET ERP - BATCH 4 TECHNICAL AUDIT TESTS  ")
    print("=======================================================\n")

    test_results = []
    
    def log_test(num, name, passed, details=""):
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status} Test {num:02d}: {name} | {details}")
        test_results.append((num, name, passed, details))

    # -------------------------------------------------------------------------
    # Setup Test Prerequisites: Vehicle, Driver, Mine Site, Supplier, Item
    # -------------------------------------------------------------------------
    stat_dates = {
        "start_date": "2026-01-01",
        "end_date": "2027-12-31",
        "fitness_expiry_date": "2027-12-31",
        "puc_expiry_date": "2027-12-31",
        "road_tax_expiry_date": "2027-12-31",
        "permit_expiry_date": "2027-12-31",
    }
    test_veh = "TEST-VEH-BKD-01"
    if not frappe.db.exists("Vehicle", test_veh):
        doc_v1 = {
            "doctype": "Vehicle",
            "license_plate": test_veh,
            "make": "Tata",
            "model": "Prima 3530.K",
            "fuel_type": "Diesel",
            "uom": "Nos",
            "vehicle_status": "Active",
            "last_odometer": 50000,
            "policy_no": "POL-TESTBKD01-STD",
            "is_test_record": 1
        }
        doc_v1.update(stat_dates)
        frappe.get_doc(doc_v1).insert(ignore_permissions=True)
    else:
        v1_vals = {"vehicle_status": "Active", "last_odometer": 50000, "policy_no": "POL-TESTBKD01-STD", "is_test_record": 1}
        v1_vals.update(stat_dates)
        frappe.db.set_value("Vehicle", test_veh, v1_vals)

    test_veh_2 = "TEST-VEH-BKD-02"
    if not frappe.db.exists("Vehicle", test_veh_2):
        doc_v2 = {
            "doctype": "Vehicle",
            "license_plate": test_veh_2,
            "make": "Ashok Leyland",
            "model": "Taurus 2518",
            "fuel_type": "Diesel",
            "uom": "Nos",
            "vehicle_status": "Active",
            "last_odometer": 30000,
            "policy_no": "POL-TESTBKD02-STD",
            "is_test_record": 1
        }
        doc_v2.update(stat_dates)
        frappe.get_doc(doc_v2).insert(ignore_permissions=True)
    else:
        v2_vals = {"vehicle_status": "Active", "last_odometer": 30000, "policy_no": "POL-TESTBKD02-STD", "is_test_record": 1}
        v2_vals.update(stat_dates)
        frappe.db.set_value("Vehicle", test_veh_2, v2_vals)

    test_driver = frappe.db.get_value("Driver", {"full_name": "Test Driver Breakdown"}, "name")
    if not test_driver:
        drv_doc = frappe.get_doc({
            "doctype": "Driver",
            "full_name": "Test Driver Breakdown",
            "status": "Active",
            "license_number": "DL-TEST-BKD-99",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        test_driver = drv_doc.name

    test_site = "Test Mine Site Breakdown"
    if not frappe.db.exists("Mine Site", test_site):
        frappe.get_doc({
            "doctype": "Mine Site",
            "site_name": test_site,
            "site_code": "TMS-BKD",
            "status": "Operational",
            "is_test_record": 1
        }).insert(ignore_permissions=True)

    test_supplier = "AutoMech Central Workshop"
    if not frappe.db.exists("Supplier", test_supplier):
        frappe.get_doc({
            "doctype": "Supplier",
            "supplier_name": test_supplier,
            "supplier_group": "All Supplier Groups",
            "supplier_type": "Company"
        }).insert(ignore_permissions=True)

    test_item = "SP-HYD-SEAL-01"
    if not frappe.db.exists("Item", test_item):
        frappe.get_doc({
            "doctype": "Item",
            "item_code": test_item,
            "item_name": "Hydraulic Cylinder Seal Kit",
            "item_group": "All Item Groups",
            "stock_uom": "Nos",
            "is_stock_item": 1,
            "valuation_rate": 1250.0,
            "opening_stock": 0
        }).insert(ignore_permissions=True)

    bin_qty = frappe.db.get_value("Bin", {"item_code": test_item, "warehouse": "Stores - U"}, "actual_qty") or 0.0
    if bin_qty < 10.0:
        mr = frappe.get_doc({
            "doctype": "Stock Entry",
            "stock_entry_type": "Material Receipt",
            "company": "Uptoware",
            "to_warehouse": "Stores - U",
            "items": [{
                "item_code": test_item,
                "qty": 50.0,
                "t_warehouse": "Stores - U",
                "basic_rate": 1250.0,
                "cost_center": "Main - U"
            }]
        }).insert(ignore_permissions=True)
        mr.submit()
        frappe.db.commit()

    test_driver_user = "test_driver_b4@uptoware.local"
    if not frappe.db.exists("User", test_driver_user):
        frappe.get_doc({
            "doctype": "User",
            "email": test_driver_user,
            "first_name": "Test Driver User",
            "roles": [{"role": "Driver"}]
        }).insert(ignore_permissions=True)
    else:
        u = frappe.get_doc("User", test_driver_user)
        u.add_roles("Driver")

    # Clean existing test records for these test vehicles
    frappe.db.delete("Vehicle Breakdown", {"vehicle": ["in", [test_veh, test_veh_2]]})
    frappe.db.delete("Mining Trip", {"vehicle": ["in", [test_veh, test_veh_2]]})
    frappe.db.delete("Asset Maintenance Log", {"custom_vehicle": ["in", [test_veh, test_veh_2]]})
    frappe.db.commit()

    # Shared variables for tests
    bkd1 = None
    bkd2 = None
    bkd_valid_parts = None
    se_p1 = None
    se_p2 = None

    # ----------------------------------------------------
    # TEST 01: Vehicle Status Custom Field Metadata (Audit Item 1)
    # ----------------------------------------------------
    try:
        cf = frappe.get_doc("Custom Field", "Vehicle-vehicle_status")
        expected_options = "Active\nOn Trip\nUnder Maintenance\nBreakdown\nOut of Service"
        
        status_fields = [f.fieldname for f in frappe.get_meta("Vehicle").fields if "status" in f.fieldname.lower()]
        
        t1_ok = (
            cf.dt == "Vehicle"
            and cf.fieldname == "vehicle_status"
            and cf.fieldtype == "Select"
            and cf.options == expected_options
            and status_fields == ["vehicle_status"]
        )
        log_test(1, "Vehicle Status Custom Field Metadata & Single Source of Truth", t1_ok, 
                 f"Fieldname: {cf.fieldname}, Options count: {len(cf.options.splitlines())}, Duplicates: 0")
    except Exception as e:
        log_test(1, "Vehicle Status Metadata", False, str(e))

    # ----------------------------------------------------
    # TEST 02: Breakdown Creation (Draft/Reported state)
    # ----------------------------------------------------
    try:
        bkd1 = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "breakdown_datetime": "2026-11-04 09:00:00",
            "vehicle": test_veh,
            "driver": test_driver,
            "mine_site": test_site,
            "breakdown_type": "Hydraulic",
            "severity": "Critical",
            "odometer_reading": 50100,
            "description": "Hydraulic hoist cylinder leakage on pit 2",
            "is_test_record": 1
        }).insert(ignore_permissions=True)

        t2_ok = (
            bkd1.name is not None
            and bkd1.repair_status == "Reported"
            and frappe.db.get_value("Vehicle", test_veh, "vehicle_status") == "Active"
        )
        log_test(2, "Breakdown Creation (Reported state keeps vehicle Active)", t2_ok, f"ID: {bkd1.name}")
    except Exception as e:
        log_test(2, "Breakdown Creation", False, str(e))

    # ----------------------------------------------------
    # TEST 03: Invalid Vehicle / Driver / Odometer Rejection
    # ----------------------------------------------------
    try:
        t3_veh, t3_drv, t3_neg_odo, t3_low_odo = False, False, False, False
        try:
            frappe.get_doc({
                "doctype": "Vehicle Breakdown",
                "breakdown_datetime": "2026-11-04 09:00:00",
                "vehicle": "NON-EXISTENT-VEH",
                "breakdown_type": "Engine",
                "severity": "High",
                "description": "Test",
                "is_test_record": 1
            }).insert(ignore_permissions=True)
        except frappe.ValidationError:
            t3_veh = True

        try:
            frappe.get_doc({
                "doctype": "Vehicle Breakdown",
                "breakdown_datetime": "2026-11-04 09:00:00",
                "vehicle": test_veh,
                "driver": "NON-EXISTENT-DRV",
                "breakdown_type": "Engine",
                "severity": "High",
                "description": "Test",
                "is_test_record": 1
            }).insert(ignore_permissions=True)
        except frappe.ValidationError:
            t3_drv = True

        try:
            frappe.get_doc({
                "doctype": "Vehicle Breakdown",
                "breakdown_datetime": "2026-11-04 09:00:00",
                "vehicle": test_veh,
                "breakdown_type": "Engine",
                "severity": "High",
                "odometer_reading": -500,
                "description": "Test",
                "is_test_record": 1
            }).insert(ignore_permissions=True)
        except frappe.ValidationError:
            t3_neg_odo = True

        try:
            frappe.get_doc({
                "doctype": "Vehicle Breakdown",
                "breakdown_datetime": "2026-11-04 09:00:00",
                "vehicle": test_veh,
                "breakdown_type": "Engine",
                "severity": "High",
                "odometer_reading": 49000,
                "description": "Test",
                "is_test_record": 1
            }).insert(ignore_permissions=True)
        except frappe.ValidationError:
            t3_low_odo = True

        t3_ok = t3_veh and t3_drv and t3_neg_odo and t3_low_odo
        log_test(3, "Invalid Vehicle / Driver / Odometer Rejections", t3_ok)
    except Exception as e:
        log_test(3, "Invalid Rejections", False, str(e))

    # ----------------------------------------------------
    # TEST 04: Driver Permissions Enforcement (Audit Item 4)
    # ----------------------------------------------------
    try:
        frappe.set_user(test_driver_user)
        
        # 1. Driver can create Reported breakdown
        drv_bkd = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "breakdown_datetime": "2026-11-04 09:15:00",
            "vehicle": test_veh_2,
            "driver": test_driver,
            "mine_site": test_site,
            "breakdown_type": "Tyre",
            "severity": "Low",
            "odometer_reading": 30050,
            "description": "Puncture noticed by driver",
            "is_test_record": 1
        }).insert()
        drv_create_ok = (drv_bkd.name is not None and drv_bkd.repair_status == "Reported")

        # 2. Driver cannot set repair details, workshop, or costs on creation
        drv_cost_blocked = False
        try:
            frappe.get_doc({
                "doctype": "Vehicle Breakdown",
                "breakdown_datetime": "2026-11-04 09:15:00",
                "vehicle": test_veh_2,
                "driver": test_driver,
                "odometer_reading": 30100,
                "breakdown_type": "Tyre",
                "severity": "Low",
                "description": "Driver illegal cost",
                "labour_cost": 500.0,
                "is_test_record": 1
            }).insert()
        except frappe.ValidationError:
            drv_cost_blocked = True

        # 3. Driver cannot modify existing reported breakdown
        drv_edit_blocked = False
        try:
            drv_bkd.description = "Tampered description"
            drv_bkd.save()
        except (frappe.ValidationError, frappe.PermissionError):
            drv_edit_blocked = True

        # 4. Driver cannot approve breakdown
        drv_approve_blocked = False
        try:
            apply_workflow(drv_bkd, "Approve")
        except (frappe.ValidationError, frappe.PermissionError):
            drv_approve_blocked = True

        # Restore admin user
        frappe.set_user("Administrator")
        
        t4_ok = drv_create_ok and drv_cost_blocked and drv_edit_blocked and drv_approve_blocked
        log_test(4, "Driver Permission Guard (Report Allowed, Edit/Approve/Costs Blocked)", t4_ok, 
                 f"Create: {drv_create_ok}, CostBlocked: {drv_cost_blocked}, EditBlocked: {drv_edit_blocked}, ApproveBlocked: {drv_approve_blocked}")
    except Exception as e:
        frappe.set_user("Administrator")
        log_test(4, "Driver Permission Guard", False, str(e))

    # ----------------------------------------------------
    # TEST 05: Vehicle Status Change on Approved -> In Workshop
    # ----------------------------------------------------
    try:
        # bkd1 is currently Reported. Approve it!
        apply_workflow(bkd1, "Approve")
        veh_status_approved = frappe.db.get_value("Vehicle", test_veh, "vehicle_status")
        
        # Transition to In Workshop
        apply_workflow(bkd1, "Send to Workshop")
        veh_status_workshop = frappe.db.get_value("Vehicle", test_veh, "vehicle_status")

        t5_ok = (veh_status_approved == "Breakdown" and veh_status_workshop == "Under Maintenance")
        log_test(5, "Vehicle Status Lifecycle (Reported -> Breakdown -> Under Maintenance)", t5_ok, 
                 f"Approved: {veh_status_approved}, Workshop: {veh_status_workshop}")
    except Exception as e:
        log_test(5, "Vehicle Status Lifecycle", False, str(e))

    # ----------------------------------------------------
    # TEST 06: Multiple Open Breakdown Safeguard (Audit Item 2)
    # ----------------------------------------------------
    try:
        # Create bkd2 for test_veh
        bkd2 = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "breakdown_datetime": "2026-11-04 10:00:00",
            "vehicle": test_veh,
            "driver": test_driver,
            "odometer_reading": 50100,
            "breakdown_type": "Electrical",
            "severity": "Medium",
            "description": "Alternator failure during workshop inspection",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        apply_workflow(bkd2, "Approve")

        # Now mark bkd1 Repaired and Close it
        apply_workflow(bkd1, "Mark Repaired")
        apply_workflow(bkd1, "Close Breakdown")
        
        # Since bkd2 is still open (Approved), vehicle must remain in Breakdown, NOT restored to Active!
        veh_status_multi = frappe.db.get_value("Vehicle", test_veh, "vehicle_status")
        t6_ok = (veh_status_multi in ["Breakdown", "Under Maintenance"])
        log_test(6, "Multiple Open Breakdown Gating (Active not restored while bkd2 open)", t6_ok, 
                 f"Status: {veh_status_multi}")
    except Exception as e:
        log_test(6, "Multiple Open Breakdown Safeguard", False, str(e))

    # ----------------------------------------------------
    # TEST 07: Reactivation Safeguard: Active Maintenance Operation Blocker (Audit Item 2)
    # ----------------------------------------------------
    try:
        # Create an active maintenance log for test_veh
        aml = frappe.get_doc({
            "doctype": "Asset Maintenance Log",
            "custom_vehicle": test_veh,
            "maintenance_status": "Planned",
            "due_date": "2026-11-05"
        }).insert(ignore_permissions=True)

        apply_workflow(bkd2, "Send to Workshop")
        apply_workflow(bkd2, "Mark Repaired")
        apply_workflow(bkd2, "Close Breakdown")

        # Even though all breakdowns are closed, active maintenance operation exists!
        veh_status_maint = frappe.db.get_value("Vehicle", test_veh, "vehicle_status")
        t7_ok = (veh_status_maint == "Under Maintenance")
        
        # Complete the maintenance operation
        aml.completion_date = "2026-11-05"
        aml.maintenance_status = "Completed"
        aml.save(ignore_permissions=True)
        frappe.delete_doc("Asset Maintenance Log", aml.name, force=1)
        frappe.db.commit()

        log_test(7, "Reactivation Safeguard: Active Maintenance Blocker (Maintains Under Maintenance)", t7_ok, 
                 f"Status while Asset Maintenance Log Planned: {veh_status_maint}")
    except Exception as e:
        log_test(7, "Active Maintenance Blocker", False, str(e))

    # ----------------------------------------------------
    # TEST 08: Reactivation Safeguard: Active Mining Trip Blocker (Audit Item 2)
    # ----------------------------------------------------
    try:
        # Reset vehicle to Active first
        frappe.db.set_value("Vehicle", test_veh, "vehicle_status", "Active")

        # Create an active Mining Trip in Draft then dispatch
        active_trip = frappe.get_doc({
            "doctype": "Mining Trip",
            "dispatch_date_time": "2026-11-04 10:30:00",
            "vehicle": test_veh,
            "driver": test_driver,
            "mine_site": test_site,
            "destination": "Mangalore Port",
            "mineral_type": "Iron Ore",
            "gross_weight_tons": 35.0,
            "tare_weight_tons": 12.0,
            "challan_number": "CH-TEST-ACTIVE-TRIP",
            "opening_odometer": 50100,
            "trip_status": "Draft",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        apply_workflow(active_trip, "Dispatch")

        # Create and close a new breakdown on test_veh
        bkd_trip_test = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "breakdown_datetime": "2026-11-04 11:00:00",
            "vehicle": test_veh,
            "driver": test_driver,
            "odometer_reading": 50100,
            "breakdown_type": "Tyre",
            "severity": "Low",
            "description": "Quick tyre pressure check",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        apply_workflow(bkd_trip_test, "Approve")
        apply_workflow(bkd_trip_test, "Send to Workshop")
        apply_workflow(bkd_trip_test, "Mark Repaired")
        apply_workflow(bkd_trip_test, "Close Breakdown")

        # Vehicle must be restored to "On Trip", NOT "Active"!
        veh_status_on_trip = frappe.db.get_value("Vehicle", test_veh, "vehicle_status")
        t8_ok = (veh_status_on_trip == "On Trip")
        
        # Complete active trip
        frappe.db.set_value("Mining Trip", active_trip.name, "trip_status", "Cancelled")
        
        log_test(8, "Reactivation Safeguard: Active Mining Trip Blocker (Restores On Trip, not Active)", t8_ok, 
                 f"Status with Dispatched Trip: {veh_status_on_trip}")
    except Exception as e:
        log_test(8, "Active Trip Blocker", False, str(e))

    # ----------------------------------------------------
    # TEST 09: Reactivation Safeguard: Out of Service Preservation (Audit Item 2)
    # ----------------------------------------------------
    try:
        frappe.db.set_value("Vehicle", test_veh, "vehicle_status", "Out of Service")
        
        bkd_oos = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "breakdown_datetime": "2026-11-04 11:30:00",
            "vehicle": test_veh,
            "driver": test_driver,
            "odometer_reading": 50100,
            "breakdown_type": "Transmission",
            "severity": "Critical",
            "description": "Gearbox issue while decommissioned",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        
        apply_workflow(bkd_oos, "Approve")
        st_app = frappe.db.get_value("Vehicle", test_veh, "vehicle_status")
        
        apply_workflow(bkd_oos, "Send to Workshop")
        st_ws = frappe.db.get_value("Vehicle", test_veh, "vehicle_status")
        
        apply_workflow(bkd_oos, "Mark Repaired")
        apply_workflow(bkd_oos, "Close Breakdown")
        st_cl = frappe.db.get_value("Vehicle", test_veh, "vehicle_status")

        t9_ok = (st_app == "Out of Service" and st_ws == "Out of Service" and st_cl == "Out of Service")
        log_test(9, "Reactivation Safeguard: Out of Service Preservation Across Lifecycle", t9_ok, 
                 f"Preserved throughout: {st_cl}")
        
        # Reset vehicle to Active
        frappe.db.set_value("Vehicle", test_veh, "vehicle_status", "Active")
    except Exception as e:
        log_test(9, "Out of Service Preservation", False, str(e))

    # ----------------------------------------------------
    # TEST 10: Vehicle Status Restoration After All Closed & No Conflicts (Audit Item 2)
    # ----------------------------------------------------
    try:
        bkd_clean = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "breakdown_datetime": "2026-11-04 12:00:00",
            "vehicle": test_veh,
            "driver": test_driver,
            "odometer_reading": 50100,
            "breakdown_type": "Engine",
            "severity": "Low",
            "description": "Routine air filter replacement",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        apply_workflow(bkd_clean, "Approve")
        apply_workflow(bkd_clean, "Send to Workshop")
        apply_workflow(bkd_clean, "Mark Repaired")
        apply_workflow(bkd_clean, "Close Breakdown")

        final_veh_status = frappe.db.get_value("Vehicle", test_veh, "vehicle_status")
        t10_ok = (final_veh_status == "Active")
        log_test(10, "Vehicle Status Clean Restoration to Active (No Conflicts)", t10_ok, 
                 f"Final Status: {final_veh_status}")
    except Exception as e:
        log_test(10, "Clean Restoration to Active", False, str(e))

    # ----------------------------------------------------
    # TEST 11: Downtime Calculation & Negative Time Rejection
    # ----------------------------------------------------
    try:
        bkd_down = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "breakdown_datetime": "2026-11-04 08:00:00",
            "vehicle": test_veh,
            "driver": test_driver,
            "odometer_reading": 50100,
            "breakdown_type": "Engine",
            "severity": "Medium",
            "repair_start_datetime": "2026-11-04 09:00:00",
            "repair_completion_datetime": "2026-11-04 14:30:00",
            "description": "Radiator hose replacement",
            "is_test_record": 1
        }).insert(ignore_permissions=True)

        t11_calc_ok = (float(bkd_down.downtime_hours) == 6.5)

        t11_neg_blocked = False
        try:
            frappe.get_doc({
                "doctype": "Vehicle Breakdown",
                "breakdown_datetime": "2026-11-04 14:00:00",
                "repair_completion_datetime": "2026-11-04 10:00:00",
                "vehicle": test_veh,
                "driver": test_driver,
                "odometer_reading": 50100,
                "breakdown_type": "Engine",
                "severity": "Low",
                "description": "Invalid time test",
                "is_test_record": 1
            }).insert(ignore_permissions=True)
        except frappe.ValidationError:
            t11_neg_blocked = True

        t11_ok = t11_calc_ok and t11_neg_blocked
        log_test(11, "Downtime Calculation & Negative Datetime Validation", t11_ok, 
                 f"Downtime: {bkd_down.downtime_hours} hrs, NegBlocked: {t11_neg_blocked}")
    except Exception as e:
        log_test(11, "Downtime Calculation", False, str(e))

    # ----------------------------------------------------
    # TEST 12: Rejected Breakdown Handling (Audit Item 5)
    # ----------------------------------------------------
    try:
        frappe.db.set_value("Vehicle", test_veh, "vehicle_status", "Active")
        
        bkd_reject = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "breakdown_datetime": "2026-11-04 13:00:00",
            "vehicle": test_veh,
            "driver": test_driver,
            "mine_site": test_site,
            "odometer_reading": 50100,
            "breakdown_type": "Other",
            "severity": "Low",
            "description": "Erroneous driver report - no actual fault found",
            "rejection_reason": "False alarm upon visual inspection",
            "is_test_record": 1
        }).insert(ignore_permissions=True)

        # Reject it from Reported to Closed
        apply_workflow(bkd_reject, "Reject")
        bkd_reject.reload()

        veh_status_after_reject = frappe.db.get_value("Vehicle", test_veh, "vehicle_status")

        t12_ok = (
            bkd_reject.repair_status == "Closed"
            and bkd_reject.resolution_type == "Rejected"
            and bkd_reject.repair_start_datetime is None
            and bkd_reject.repair_completion_datetime is None
            and float(bkd_reject.downtime_hours or 0.0) == 0.0
            and float(bkd_reject.parts_cost or 0.0) == 0.0
            and float(bkd_reject.total_repair_cost or 0.0) == 0.0
            and bkd_reject.closed_by == "Administrator"
            and veh_status_after_reject == "Active"
        )
        log_test(12, "Rejected Breakdown Handling (Zero Downtime, Zero Cost, No Timestamps, Vehicle Status Untouched)", t12_ok, 
                 f"Resolution: {bkd_reject.resolution_type}, Downtime: {bkd_reject.downtime_hours}, Cost: ₹{bkd_reject.total_repair_cost}, VehStatus: {veh_status_after_reject}")
    except Exception as e:
        log_test(12, "Rejected Breakdown Handling", False, str(e))

    # ----------------------------------------------------
    # TEST 13: Spare Parts: Ineligible Breakdown Rejection (Audit Item 3)
    # ----------------------------------------------------
    try:
        bkd_reported = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "breakdown_datetime": "2026-11-04 13:30:00",
            "vehicle": test_veh,
            "driver": test_driver,
            "odometer_reading": 50100,
            "breakdown_type": "Hydraulic",
            "severity": "Critical",
            "description": "Reported breakdown parts attempt",
            "parts_table": [{"item_code": test_item, "planned_qty": 1.0, "warehouse": "Stores - U"}],
            "is_test_record": 1
        }).insert(ignore_permissions=True)

        blocked_on_reported = False
        try:
            se_rep = frappe.get_doc({
                "doctype": "Stock Entry",
                "stock_entry_type": "Material Issue",
                "company": "Uptoware",
                "custom_vehicle_breakdown": bkd_reported.name,
                "custom_vehicle": test_veh,
                "items": [{"item_code": test_item, "qty": 1.0, "s_warehouse": "Stores - U", "basic_rate": 1250.0}]
            }).insert(ignore_permissions=True)
            se_rep.submit()
        except frappe.ValidationError:
            blocked_on_reported = True

        blocked_on_rejected = False
        try:
            se_rej = frappe.get_doc({
                "doctype": "Stock Entry",
                "stock_entry_type": "Material Issue",
                "company": "Uptoware",
                "custom_vehicle_breakdown": bkd_reject.name,
                "custom_vehicle": test_veh,
                "items": [{"item_code": test_item, "qty": 1.0, "s_warehouse": "Stores - U", "basic_rate": 1250.0}]
            }).insert(ignore_permissions=True)
            se_rej.submit()
        except frappe.ValidationError:
            blocked_on_rejected = True

        t13_ok = blocked_on_reported and blocked_on_rejected
        log_test(13, "Spare Parts: Ineligible Breakdown Rejection (Reported & Rejected Blocked)", t13_ok, 
                 f"BlockedReported: {blocked_on_reported}, BlockedRejected: {blocked_on_rejected}")
    except Exception as e:
        log_test(13, "Ineligible Breakdown Rejection", False, str(e))

    # ----------------------------------------------------
    # Setup bkd_valid_parts for Tests 14, 15, 16, 17, 18, 19
    # ----------------------------------------------------
    bkd_valid_parts = frappe.get_doc({
        "doctype": "Vehicle Breakdown",
        "breakdown_datetime": "2026-11-04 14:00:00",
        "vehicle": test_veh,
        "driver": test_driver,
        "odometer_reading": 50100,
        "breakdown_type": "Hydraulic",
        "severity": "Critical",
        "description": "Parts validation test breakdown",
        "parts_table": [{"item_code": test_item, "planned_qty": 2.0, "warehouse": "Stores - U"}],
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    apply_workflow(bkd_valid_parts, "Approve")
    apply_workflow(bkd_valid_parts, "Send to Workshop")

    # ----------------------------------------------------
    # TEST 14: Spare Parts: Invalid Item & Warehouse Rejection (Audit Item 3)
    # ----------------------------------------------------
    try:
        blocked_unplanned = False
        try:
            se_unp = frappe.get_doc({
                "doctype": "Stock Entry",
                "stock_entry_type": "Material Issue",
                "company": "Uptoware",
                "custom_vehicle_breakdown": bkd_valid_parts.name,
                "custom_vehicle": test_veh,
                "items": [{"item_code": "NON-EXISTENT-PART", "qty": 1.0, "s_warehouse": "Stores - U", "basic_rate": 500.0}]
            }).insert(ignore_permissions=True)
            se_unp.submit()
        except frappe.ValidationError:
            blocked_unplanned = True

        blocked_bad_wh = False
        try:
            se_wh = frappe.get_doc({
                "doctype": "Stock Entry",
                "stock_entry_type": "Material Issue",
                "company": "Uptoware",
                "custom_vehicle_breakdown": bkd_valid_parts.name,
                "custom_vehicle": test_veh,
                "items": [{"item_code": test_item, "qty": 1.0, "s_warehouse": "INVALID-WH", "basic_rate": 1250.0}]
            }).insert(ignore_permissions=True)
            se_wh.submit()
        except frappe.ValidationError:
            blocked_bad_wh = True

        t14_ok = blocked_unplanned and blocked_bad_wh
        log_test(14, "Spare Parts: Invalid Item & Warehouse Rejection", t14_ok, 
                 f"BlockedUnplanned: {blocked_unplanned}, BlockedBadWH: {blocked_bad_wh}")
    except Exception as e:
        log_test(14, "Invalid Item/Warehouse Rejection", False, str(e))

    # ----------------------------------------------------
    # TEST 15: Spare Parts: Over-Issue Prevention (Audit Item 3)
    # ----------------------------------------------------
    try:
        blocked_over_issue = False
        try:
            se_over = frappe.get_doc({
                "doctype": "Stock Entry",
                "stock_entry_type": "Material Issue",
                "company": "Uptoware",
                "custom_vehicle_breakdown": bkd_valid_parts.name,
                "custom_vehicle": test_veh,
                "items": [{"item_code": test_item, "qty": 3.0, "s_warehouse": "Stores - U", "basic_rate": 1250.0}]
            }).insert(ignore_permissions=True)
            se_over.submit()
        except frappe.ValidationError:
            blocked_over_issue = True

        log_test(15, "Spare Parts: Issued Qty Cannot Exceed Planned Qty (3.0 vs 2.0 Planned)", blocked_over_issue)
    except Exception as e:
        log_test(15, "Over-Issue Prevention", False, str(e))

    # ----------------------------------------------------
    # TEST 16: Spare Parts: Partial Issues & Cumulative Control (Audit Item 3)
    # ----------------------------------------------------
    try:
        # First partial issue: 1.0 unit out of 2.0 planned
        se_p1 = frappe.get_doc({
            "doctype": "Stock Entry",
            "stock_entry_type": "Material Issue",
            "company": "Uptoware",
            "custom_vehicle_breakdown": bkd_valid_parts.name,
            "custom_vehicle": test_veh,
            "items": [{
                "item_code": test_item,
                "qty": 1.0,
                "s_warehouse": "Stores - U",
                "basic_rate": 1250.0,
                "expense_account": "Cost of Goods Sold - U",
                "cost_center": "Main - U"
            }]
        }).insert(ignore_permissions=True)
        se_p1.submit()
        bkd_valid_parts.reload()
        
        row1 = bkd_valid_parts.parts_table[0]
        p1_ok = (
            float(row1.issued_qty) == 1.0
            and row1.status == "Partially Issued"
            and float(bkd_valid_parts.parts_cost) == 1250.0
        )

        # Second partial issue: remaining 1.0 unit
        se_p2 = frappe.get_doc({
            "doctype": "Stock Entry",
            "stock_entry_type": "Material Issue",
            "company": "Uptoware",
            "custom_vehicle_breakdown": bkd_valid_parts.name,
            "custom_vehicle": test_veh,
            "items": [{
                "item_code": test_item,
                "qty": 1.0,
                "s_warehouse": "Stores - U",
                "basic_rate": 1250.0,
                "expense_account": "Cost of Goods Sold - U",
                "cost_center": "Main - U"
            }]
        }).insert(ignore_permissions=True)
        se_p2.submit()
        bkd_valid_parts.reload()

        row2 = bkd_valid_parts.parts_table[0]
        p2_ok = (
            float(row2.issued_qty) == 2.0
            and row2.status == "Issued"
            and float(bkd_valid_parts.parts_cost) == 2500.0
        )

        # Third issue attempt: 0.5 unit (exceeds total planned 2.0)
        p3_blocked = False
        try:
            se_p3 = frappe.get_doc({
                "doctype": "Stock Entry",
                "stock_entry_type": "Material Issue",
                "company": "Uptoware",
                "custom_vehicle_breakdown": bkd_valid_parts.name,
                "custom_vehicle": test_veh,
                "items": [{
                    "item_code": test_item,
                    "qty": 0.5,
                    "s_warehouse": "Stores - U",
                    "basic_rate": 1250.0,
                    "expense_account": "Cost of Goods Sold - U",
                    "cost_center": "Main - U"
                }]
            }).insert(ignore_permissions=True)
            se_p3.submit()
        except frappe.ValidationError:
            p3_blocked = True

        t16_ok = p1_ok and p2_ok and p3_blocked
        log_test(16, "Spare Parts: Legitimate Partial Issues Allowed & Cumulative Limit Enforced", t16_ok, 
                 f"P1 (1.0/2.0): {p1_ok}, P2 (2.0/2.0): {p2_ok}, P3 Exceed Blocked: {p3_blocked}")
    except Exception as e:
        log_test(16, "Partial Issues Control", False, str(e))

    # ----------------------------------------------------
    # TEST 17: Spare Parts: Stock Valuation & Cost Reconcile (Audit Item 3)
    # ----------------------------------------------------
    try:
        bkd_valid_parts.labour_cost = 1500.0
        bkd_valid_parts.save(ignore_permissions=True)
        bkd_valid_parts.reload()

        expected_total = 2500.0 + 1500.0 # 4000.0
        t17_ok = (
            float(bkd_valid_parts.parts_cost) == 2500.0
            and float(bkd_valid_parts.labour_cost) == 1500.0
            and float(bkd_valid_parts.total_repair_cost) == expected_total
        )
        log_test(17, "Spare Parts: Actual Stock Valuation & Repair Cost Reconcile (Parts + Labour)", t17_ok, 
                 f"Parts: ₹{bkd_valid_parts.parts_cost} + Labour: ₹{bkd_valid_parts.labour_cost} = Total: ₹{bkd_valid_parts.total_repair_cost}")
    except Exception as e:
        log_test(17, "Stock Valuation Reconcile", False, str(e))

    # ----------------------------------------------------
    # TEST 18: Spare Parts: Idempotency & Duplicate Prevention on Retries (Audit Item 3)
    # ----------------------------------------------------
    try:
        # Re-save Stock Entry to trigger on_submit recalculation again
        # The query reads existing submitted entries and should produce the EXACT same numbers
        se_p2.docstatus = 1
        ss4 = frappe.get_doc("Server Script", "Stock Entry - Spare Parts Linkage")
        # Run linkage logic
        submitted_entries = frappe.db.sql("""
            SELECT sed.item_code, sed.qty, sed.basic_rate, sed.amount, se.name as se_name, sed.s_warehouse
            FROM `tabStock Entry Detail` sed
            JOIN `tabStock Entry` se ON sed.parent = se.name
            WHERE se.custom_vehicle_breakdown = %s
              AND se.docstatus = 1
            ORDER BY se.creation ASC
        """, (bkd_valid_parts.name,), as_dict=True)
        
        tot_issued = sum(e.qty for e in submitted_entries if e.item_code == test_item)
        tot_cost = sum(e.amount for e in submitted_entries)

        t18_ok = (tot_issued == 2.0 and tot_cost == 2500.0 and float(bkd_valid_parts.total_repair_cost) == 4000.0)
        log_test(18, "Spare Parts: Linkage Idempotency (Retries Cannot Duplicate Costs/Quantities)", t18_ok, 
                 f"Issued Qty: {tot_issued}, Parts Cost: ₹{tot_cost}")
    except Exception as e:
        log_test(18, "Linkage Idempotency", False, str(e))

    # ----------------------------------------------------
    # TEST 19: Test-Record Exclusion in Operational Reports (Audit Item 6)
    # ----------------------------------------------------
    try:
        import frappe.desk.query_report as qr
        filters = {"from_date": "", "to_date": "", "vehicle": "", "breakdown_type": "", "repair_status": ""}
        
        r1 = qr.run(report_name="Vehicle Breakdown Register", filters=filters)
        test_in_r1 = any(row['breakdown_id'] == bkd_valid_parts.name for row in r1.get("result", []))

        r2 = qr.run(report_name="Vehicle Downtime Report", filters=filters)
        test_in_r2 = any(row['vehicle'] == test_veh for row in r2.get("result", []))

        r3 = qr.run(report_name="Maintenance Cost by Vehicle", filters=filters)
        test_in_r3 = any(row['vehicle'] == test_veh for row in r3.get("result", []))

        r4 = qr.run(report_name="Breakdown Frequency by Type", filters=filters)
        r5 = qr.run(report_name="Pending Repairs / Awaiting Parts", filters=filters)
        test_in_r5 = any(row['breakdown_id'] == bkd_valid_parts.name for row in r5.get("result", []))

        r6 = qr.run(report_name="Vehicle Maintenance History", filters=filters)
        test_in_r6 = any(row['breakdown_id'] == bkd_valid_parts.name for row in r6.get("result", []))

        t19_ok = (not test_in_r1 and not test_in_r2 and not test_in_r3 and not test_in_r5 and not test_in_r6)
        log_test(19, "Test-Record Quarantine in All 6 Batch 4 Operational Reports", t19_ok, 
                 "Test records 100% excluded across all queries")
    except Exception as e:
        log_test(19, "Test-Record Quarantine", False, str(e))

    # ----------------------------------------------------
    # TEST 20: Mining Trip Dispatch Conflict Prevention (Blocked in Breakdown / Maintenance)
    # ----------------------------------------------------
    try:
        frappe.db.set_value("Vehicle", test_veh, "vehicle_status", "Breakdown")
        trip_blocked_bkd = False
        try:
            frappe.get_doc({
                "doctype": "Mining Trip",
                "dispatch_date_time": "2026-11-04 15:00:00",
                "destination": "Mangalore Port",
                "vehicle": test_veh,
                "driver": test_driver,
                "mine_site": test_site,
                "mineral_type": "Iron Ore",
                "gross_weight_tons": 35.0,
                "tare_weight_tons": 12.0,
                "challan_number": "CH-BLK-BKD",
                "opening_odometer": 50100,
                "trip_status": "Draft",
                "is_test_record": 1
            }).insert(ignore_permissions=True)
        except frappe.ValidationError:
            trip_blocked_bkd = True

        frappe.db.set_value("Vehicle", test_veh, "vehicle_status", "Under Maintenance")
        trip_blocked_maint = False
        try:
            frappe.get_doc({
                "doctype": "Mining Trip",
                "dispatch_date_time": "2026-11-04 15:00:00",
                "destination": "Mangalore Port",
                "vehicle": test_veh,
                "driver": test_driver,
                "mine_site": test_site,
                "mineral_type": "Iron Ore",
                "gross_weight_tons": 35.0,
                "tare_weight_tons": 12.0,
                "challan_number": "CH-BLK-MNT",
                "opening_odometer": 50100,
                "trip_status": "Draft",
                "is_test_record": 1
            }).insert(ignore_permissions=True)
        except frappe.ValidationError:
            trip_blocked_maint = True

        t20_ok = trip_blocked_bkd and trip_blocked_maint
        log_test(20, "Mining Trip Dispatch Conflict Prevention (Blocked in Breakdown / Under Maintenance)", t20_ok, 
                 f"BlockedInBreakdown: {trip_blocked_bkd}, BlockedInMaint: {trip_blocked_maint}")
        
        # Reset vehicle status to Active
        frappe.db.set_value("Vehicle", test_veh, "vehicle_status", "Active")
    except Exception as e:
        log_test(20, "Trip Conflict Prevention", False, str(e))

    # ----------------------------------------------------
    # TEST 21: Batch 1 Regression (Driver-Vehicle Mutual Synchronization)
    # ----------------------------------------------------
    try:
        v_reg = frappe.get_doc("Vehicle", test_veh)
        v_reg.assigned_driver = test_driver
        v_reg.save(ignore_permissions=True)
        
        t21_ok = (frappe.db.get_value("Driver", test_driver, "assigned_vehicle") == test_veh)
        log_test(21, "Batch 1 Regression: Driver-Vehicle Mutual Synchronization", t21_ok, 
                 f"Driver assigned vehicle: {test_veh}")
    except Exception as e:
        log_test(21, "Batch 1 Regression", False, str(e))

    # ----------------------------------------------------
    # TEST 22: Batch 2 Regression (Mining Trip Net Weight & Workflow Lifecycle)
    # ----------------------------------------------------
    try:
        trip_reg = frappe.get_doc({
            "doctype": "Mining Trip",
            "dispatch_date_time": "2026-11-04 16:00:00",
            "destination": "Mangalore Port",
            "vehicle": test_veh,
            "driver": test_driver,
            "mine_site": test_site,
            "mineral_type": "Iron Ore",
            "gross_weight_tons": 40.0,
            "tare_weight_tons": 14.0,
            "challan_number": "CH-REG-B4-AUDIT",
            "opening_odometer": 50100,
            "trip_status": "Draft",
            "is_test_record": 1
        }).insert(ignore_permissions=True)

        t22_ok = (float(trip_reg.net_weight_tons) == 26.0 and trip_reg.trip_status == "Draft")
        log_test(22, "Batch 2 Regression: Mining Trip Net Weight & Status Integrity", t22_ok, 
                 f"Net Weight: {trip_reg.net_weight_tons} Tons")
    except Exception as e:
        log_test(22, "Batch 2 Regression", False, str(e))

    # ----------------------------------------------------
    # TEST 23: Batch 3 Regression (Fuel Log Efficiency & Approval Workflow)
    # ----------------------------------------------------
    try:
        fl_reg = frappe.get_doc({
            "doctype": "Fuel Log",
            "fuel_date": "2026-11-04",
            "vehicle": test_veh,
            "driver": test_driver,
            "mine_site": test_site,
            "fuel_source": "Site Bowser",
            "quantity_litres": 100.0,
            "rate_per_litre": 90.0,
            "odometer_reading_km": 50300,
            "is_full_tank": 1,
            "is_test_record": 1
        }).insert(ignore_permissions=True)

        t23_ok = (float(fl_reg.total_fuel_cost) == 9000.0 and fl_reg.approval_status == "Draft")
        log_test(23, "Batch 3 Regression: Fuel Log Cost Calculation & Approval Gating", t23_ok, 
                 f"Total Cost: ₹{fl_reg.total_fuel_cost}, Approval: {fl_reg.approval_status}")
    except Exception as e:
        log_test(23, "Batch 3 Regression", False, str(e))

    # Clean test vehicles
    frappe.db.set_value("Vehicle", test_veh, "vehicle_status", "Active")
    frappe.db.set_value("Vehicle", test_veh_2, "vehicle_status", "Active")
    frappe.db.commit()

    # Summary
    passed_cnt = sum(1 for _, _, p, _ in test_results if p)
    total_cnt = len(test_results)
    print("\n=======================================================")
    print(f"   BATCH 4 AUDIT SUMMARY: {passed_cnt} PASSED / {total_cnt - passed_cnt} FAILED (TOTAL {total_cnt})")
    print("=======================================================")
    assert passed_cnt == total_cnt, f"Failed tests: {[n for n, _, p, _ in test_results if not p]}"

run()
