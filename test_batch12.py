import frappe
from frappe.utils import now_datetime, getdate, add_days, nowdate
from frappe.model.workflow import apply_workflow

def run_tests():
    frappe.init("frontend")
    frappe.connect()

    print("======================================================================")
    print("      UPTOWARE FLEET MANAGEMENT ERP — BATCH 12 TEST SUITE             ")
    print("      Approval Workflows, Authorization & Security Verification       ")
    print("======================================================================\n")

    results = []

    def log_result(test_num, name, passed, details=""):
        status = "PASS" if passed else "FAIL"
        symbol = "✅" if passed else "❌"
        results.append({"test_num": test_num, "name": name, "passed": passed, "details": details})
        print(f"[{status}] Test {test_num:02d}: {name} - {details} {symbol}")

    today_val = getdate(nowdate())

    # 1. Setup dedicated test users with distinct roles
    users_config = [
        ("test_b12_fleet_mgr@uptoware.local", "Test B12 Fleet Manager", ["Fleet Manager", "Desk User"]),
        ("test_b12_fleet_mgr2@uptoware.local", "Test B12 Fleet Manager 2", ["Fleet Manager", "Desk User"]),
        ("test_b12_ws_sup@uptoware.local", "Test B12 Workshop Supervisor", ["Workshop Supervisor", "Desk User"]),
        ("test_b12_store_mgr@uptoware.local", "Test B12 Store Manager", ["Store Manager", "Desk User"]),
        ("test_b12_accountant@uptoware.local", "Test B12 Accountant", ["Accountant", "Desk User", "Accounts User"]),
        ("test_b12_driver@uptoware.local", "Test B12 Driver", ["Driver", "Desk User"]),
        ("test_b12_weighbridge@uptoware.local", "Test B12 Weighbridge", ["Weighbridge Operator", "Desk User"])
    ]

    for email, fname, roles in users_config:
        if not frappe.db.exists("User", email):
            u = frappe.get_doc({
                "doctype": "User",
                "email": email,
                "first_name": fname,
                "enabled": 1,
                "send_welcome_email": 0
            })
            u.insert(ignore_permissions=True)
            for r in roles:
                u.add_roles(r)
        else:
            u = frappe.get_doc("User", email)
            u.enabled = 1
            for r in roles:
                u.add_roles(r)
    frappe.db.commit()

    # 2. Setup Test Vehicles & Driver with valid statutory dates
    test_veh = "KA-19-B12-9901"
    if not frappe.db.exists("Vehicle", test_veh):
        v = frappe.new_doc("Vehicle")
        v.license_plate = test_veh
        v.vehicle_name = "Batch 12 Tipper"
        v.make = "BharatBenz"
        v.model = "3528CM"
        v.vehicle_status = "Active"
        v.last_odometer = 40000
        v.uom = "Nos"
        v.start_date = today_val
        v.end_date = add_days(today_val, 365)
        v.fitness_expiry_date = add_days(today_val, 365)
        v.puc_expiry_date = add_days(today_val, 365)
        v.road_tax_expiry_date = add_days(today_val, 365)
        v.permit_expiry_date = add_days(today_val, 365)
        v.policy_no = "POL-B12-INIT"
        v.is_test_record = 1
        v.save(ignore_permissions=True)
        frappe.db.commit()
    else:
        frappe.db.set_value("Vehicle", test_veh, {
            "vehicle_status": "Active",
            "end_date": add_days(today_val, 365),
            "fitness_expiry_date": add_days(today_val, 365),
            "puc_expiry_date": add_days(today_val, 365),
            "road_tax_expiry_date": add_days(today_val, 365),
            "permit_expiry_date": add_days(today_val, 365),
            "is_test_record": 1
        })
        frappe.db.commit()

    # Active insurance policy for test_veh
    if not frappe.db.exists("Vehicle Insurance Policy", {"vehicle": test_veh, "policy_status": "Active"}):
        vip = frappe.new_doc("Vehicle Insurance Policy")
        vip.vehicle = test_veh
        vip.insurance_company = "ICICI Lombard General Insurance"
        vip.policy_no = f"POL-B12-{frappe.utils.random_string(5)}"
        vip.start_date = today_val
        vip.end_date = add_days(today_val, 365)
        vip.policy_status = "Active"
        vip.premium_amount = 25000.0
        vip.is_test_record = 1
        vip.save(ignore_permissions=True)
        frappe.db.commit()

    # Secondary test vehicle for insurance policy tests (no pre-existing active policy)
    test_veh_ins = "KA-19-B12-9902"
    if not frappe.db.exists("Vehicle", test_veh_ins):
        v2 = frappe.new_doc("Vehicle")
        v2.license_plate = test_veh_ins
        v2.vehicle_name = "Batch 12 Tipper 2"
        v2.make = "BharatBenz"
        v2.model = "3528CM"
        v2.vehicle_status = "Active"
        v2.last_odometer = 10000
        v2.uom = "Nos"
        v2.start_date = today_val
        v2.end_date = add_days(today_val, 365)
        v2.fitness_expiry_date = add_days(today_val, 365)
        v2.puc_expiry_date = add_days(today_val, 365)
        v2.road_tax_expiry_date = add_days(today_val, 365)
        v2.permit_expiry_date = add_days(today_val, 365)
        v2.is_test_record = 1
        v2.save(ignore_permissions=True)
        frappe.db.commit()
    else:
        frappe.db.set_value("Vehicle", test_veh_ins, {
            "vehicle_status": "Active",
            "end_date": add_days(today_val, 365),
            "fitness_expiry_date": add_days(today_val, 365),
            "puc_expiry_date": add_days(today_val, 365),
            "road_tax_expiry_date": add_days(today_val, 365),
            "permit_expiry_date": add_days(today_val, 365),
            "is_test_record": 1
        })
        frappe.db.commit()

    # Remove existing policies on test_veh_ins to ensure clean test state
    frappe.db.sql("delete from `tabVehicle Insurance Policy` where vehicle = %s", (test_veh_ins,))
    frappe.db.commit()

    # Resolve / create test Driver with valid name
    test_driver = None
    existing_drv = frappe.db.get_value("Driver", {"full_name": "Batch 12 Test Driver"}, "name")
    if existing_drv:
        test_driver = existing_drv
        frappe.db.set_value("Driver", test_driver, {
            "status": "Active",
            "expiry_date": add_days(today_val, 365),
            "medical_fitness_expiry": add_days(today_val, 365),
            "is_test_record": 1
        })
        frappe.db.commit()
    else:
        d = frappe.new_doc("Driver")
        d.full_name = "Batch 12 Test Driver"
        d.status = "Active"
        d.expiry_date = add_days(today_val, 365)
        d.medical_fitness_expiry = add_days(today_val, 365)
        d.is_test_record = 1
        d.insert(ignore_permissions=True)
        frappe.db.commit()
        test_driver = d.name

    test_site = "Kudremukh North Pit"
    test_company = "Uptoware"
    test_customer = "NMDC Mining Corp (TEST)"
    test_supplier = "AutoMech Central Workshop"
    test_item = "SP-HYD-SEAL-01"

    # Replenish stock for test item
    bin_qty = frappe.db.get_value("Bin", {"item_code": test_item, "warehouse": "Stores - U"}, "actual_qty") or 0.0
    if float(bin_qty) < 50.0:
        se_init = frappe.new_doc("Stock Entry")
        se_init.stock_entry_type = "Material Receipt"
        se_init.company = test_company
        se_init.append("items", {
            "item_code": test_item,
            "t_warehouse": "Stores - U",
            "qty": 100.0,
            "basic_rate": 450.0,
            "cost_center": "Main - U"
        })
        se_init.insert(ignore_permissions=True)
        se_init.submit()
        frappe.db.commit()

    # Reset any active trips blocking vehicle or driver
    frappe.db.sql("""
        UPDATE `tabMining Trip`
        SET trip_status = 'Delivered', workflow_state = 'Delivered'
        WHERE (vehicle = %s OR driver = %s) AND trip_status IN ('Dispatched', 'Weighbridge Confirmed')
    """, (test_veh, test_driver))
    frappe.db.set_value("Vehicle", test_veh, "vehicle_status", "Active")
    frappe.db.commit()

    cur_veh_odo = int(frappe.db.get_value("Vehicle", test_veh, "last_odometer") or 40000)

    trip1 = None
    fl1 = None
    vb1 = None
    oe1 = None

    # =========================================================================
    # A. MINING TRIP APPROVAL LIFECYCLE
    # =========================================================================

    # TEST 01: Mining Trip: Valid Workflow Approval & Delivery Completion
    try:
        frappe.set_user("Administrator")
        cur_veh_odo = int(frappe.db.get_value("Vehicle", test_veh, "last_odometer") or 40000)
        trip_start_odo = cur_veh_odo + 10
        trip1 = frappe.get_doc({
            "doctype": "Mining Trip",
            "vehicle": test_veh,
            "driver": test_driver,
            "mine_site": test_site,
            "destination": "Jindal Steel Works",
            "material_type": "Iron Ore",
            "dispatch_date_time": now_datetime(),
            "opening_odometer": trip_start_odo,
            "is_test_record": 1
        })
        trip1.insert(ignore_permissions=True)
        frappe.db.commit()

        # Dispatch (Fleet Manager)
        frappe.set_user("test_b12_fleet_mgr@uptoware.local")
        apply_workflow(trip1, "Dispatch")
        frappe.db.commit()

        # Weighbridge (Weighbridge Operator)
        frappe.set_user("test_b12_weighbridge@uptoware.local")
        trip1.reload()
        trip1.gross_weight_tons = 45.0
        trip1.tare_weight_tons = 15.0
        trip1.save(ignore_permissions=True)
        apply_workflow(trip1, "Confirm Weighbridge")
        frappe.db.commit()

        # Approve (Fleet Manager 2 - Independent)
        frappe.set_user("test_b12_fleet_mgr2@uptoware.local")
        trip1.reload()
        trip1.closing_odometer = trip_start_odo + 50
        trip1.return_date_time = now_datetime()
        trip1.save(ignore_permissions=True)
        apply_workflow(trip1, "Approve")
        frappe.db.commit()

        # Mark Delivered
        trip1.reload()
        apply_workflow(trip1, "Mark Delivered")
        frappe.db.commit()

        trip1.reload()
        passed = (trip1.trip_status == "Delivered" and trip1.confirmed_by is not None and trip1.approved_by is not None)
        log_result(1, "Mining Trip: Valid Full Workflow Approval & Delivery", passed,
                   f"Final Status: {trip1.trip_status}, Confirmed By: {trip1.confirmed_by}, Approved By: {trip1.approved_by}")
    except Exception as e:
        log_result(1, "Mining Trip: Valid Full Workflow Approval & Delivery", False, str(e))
    finally:
        frappe.set_user("Administrator")

    # TEST 02: Mining Trip: Mandatory Cancellation Reason & Authorization Guard
    try:
        frappe.set_user("test_b12_fleet_mgr@uptoware.local")
        cur_veh_odo = int(frappe.db.get_value("Vehicle", test_veh, "last_odometer") or 40000)
        trip2 = frappe.get_doc({
            "doctype": "Mining Trip",
            "vehicle": test_veh,
            "driver": test_driver,
            "mine_site": test_site,
            "destination": "Jindal Steel Works",
            "material_type": "Iron Ore",
            "dispatch_date_time": now_datetime(),
            "opening_odometer": cur_veh_odo + 20,
            "is_test_record": 1
        })
        trip2.insert(ignore_permissions=True)
        frappe.db.commit()

        # Attempt to cancel without cancellation reason
        blocked_no_reason = False
        try:
            apply_workflow(trip2, "Cancel")
        except Exception:
            blocked_no_reason = True
            frappe.db.rollback()

        # Now cancel with mandatory cancellation reason
        trip2.reload()
        trip2.cancellation_reason = "Customer cancelled scheduled shipment due to stock overflow."
        trip2.save(ignore_permissions=True)
        apply_workflow(trip2, "Cancel")
        frappe.db.commit()

        trip2.reload()
        passed = (blocked_no_reason and trip2.trip_status == "Cancelled" and trip2.cancelled_by is not None and trip2.cancellation_reason is not None)
        log_result(2, "Mining Trip: Mandatory Cancellation Reason & Audit Stamp", passed,
                   f"Blocked without reason: {blocked_no_reason}, Status: {trip2.trip_status}, Cancelled By: {trip2.cancelled_by}")
    except Exception as e:
        log_result(2, "Mining Trip: Mandatory Cancellation Reason & Audit Stamp", False, str(e))
    finally:
        frappe.set_user("Administrator")

    # TEST 03: Mining Trip: Self-Approval Prevention
    try:
        frappe.set_user("test_b12_fleet_mgr@uptoware.local")
        cur_veh_odo = int(frappe.db.get_value("Vehicle", test_veh, "last_odometer") or 40000)
        trip3 = frappe.get_doc({
            "doctype": "Mining Trip",
            "vehicle": test_veh,
            "driver": test_driver,
            "mine_site": test_site,
            "destination": "Jindal Steel Works",
            "material_type": "Iron Ore",
            "dispatch_date_time": now_datetime(),
            "opening_odometer": cur_veh_odo + 30,
            "is_test_record": 1
        })
        trip3.insert(ignore_permissions=True)
        apply_workflow(trip3, "Dispatch")
        frappe.db.commit()

        frappe.set_user("test_b12_weighbridge@uptoware.local")
        trip3.reload()
        trip3.gross_weight_tons = 45.0
        trip3.tare_weight_tons = 15.0
        trip3.save(ignore_permissions=True)
        apply_workflow(trip3, "Confirm Weighbridge")
        frappe.db.commit()

        # Creator attempts to approve their own trip
        frappe.set_user("test_b12_fleet_mgr@uptoware.local")
        trip3.reload()
        self_approval_blocked = False
        try:
            apply_workflow(trip3, "Approve")
        except Exception as e:
            if "self approval" in str(e).lower() or "self-approval" in str(e).lower():
                self_approval_blocked = True
            frappe.db.rollback()

        log_result(3, "Mining Trip: Self-Approval Prevention Guard", self_approval_blocked,
                   f"Creator blocked from self-approving trip: {self_approval_blocked}")
    except Exception as e:
        log_result(3, "Mining Trip: Self-Approval Prevention Guard", False, str(e))
    finally:
        frappe.set_user("Administrator")

    # TEST 04: Mining Trip: Edit Lock After Approval
    try:
        frappe.set_user("test_b12_fleet_mgr2@uptoware.local")
        edit_blocked = False
        try:
            trip1.reload()
            trip1.gross_weight_tons = 55.0
            trip1.save()
        except Exception as e:
            if "restricted to system managers" in str(e).lower() or "delivered" in str(e).lower() or "trip is in" in str(e).lower():
                edit_blocked = True
            frappe.db.rollback()

        log_result(4, "Mining Trip: Immutability & Edit Lock After Approval", edit_blocked,
                   f"Critical field modification blocked after delivery: {edit_blocked}")
    except Exception as e:
        log_result(4, "Mining Trip: Immutability & Edit Lock After Approval", False, str(e))
    finally:
        frappe.set_user("Administrator")

    # =========================================================================
    # B. FUEL MANAGEMENT APPROVAL LIFECYCLE
    # =========================================================================

    # TEST 05: Fuel Log: Valid Approval & Audit Stamping
    try:
        frappe.set_user("test_b12_driver@uptoware.local")
        cur_veh_odo = int(frappe.db.get_value("Vehicle", test_veh, "last_odometer") or 40000)
        fl1 = frappe.get_doc({
            "doctype": "Fuel Log",
            "vehicle": test_veh,
            "driver": test_driver,
            "fuel_date": today_val,
            "odometer_reading_km": cur_veh_odo + 50,
            "quantity_litres": 80.0,
            "rate_per_litre": 90.0,
            "is_full_tank": 1,
            "is_test_record": 1
        })
        fl1.insert(ignore_permissions=True)
        frappe.db.commit()

        # Approve by Fleet Manager (independent from driver)
        frappe.set_user("test_b12_fleet_mgr@uptoware.local")
        fl1.reload()
        apply_workflow(fl1, "Approve")
        frappe.db.commit()

        fl1.reload()
        passed = (fl1.approval_status == "Approved" and fl1.approved_by == "test_b12_fleet_mgr@uptoware.local" and fl1.approved_on is not None)
        log_result(5, "Fuel Log: Valid Approval & Audit Stamping", passed,
                   f"Status: {fl1.approval_status}, Approved By: {fl1.approved_by}, On: {fl1.approved_on}")
    except Exception as e:
        log_result(5, "Fuel Log: Valid Approval & Audit Stamping", False, str(e))
    finally:
        frappe.set_user("Administrator")

    # TEST 06: Fuel Log: Mandatory Rejection Reason & Rejection Audit
    try:
        frappe.set_user("test_b12_driver@uptoware.local")
        cur_veh_odo = int(frappe.db.get_value("Vehicle", test_veh, "last_odometer") or 40000)
        fl2 = frappe.get_doc({
            "doctype": "Fuel Log",
            "vehicle": test_veh,
            "driver": test_driver,
            "fuel_date": today_val,
            "odometer_reading_km": cur_veh_odo + 100,
            "quantity_litres": 90.0,
            "rate_per_litre": 90.0,
            "is_full_tank": 1,
            "is_test_record": 1
        })
        fl2.insert(ignore_permissions=True)
        frappe.db.commit()

        # Fleet Manager attempts rejection without reason
        frappe.set_user("test_b12_fleet_mgr@uptoware.local")
        fl2.reload()
        rej_blocked_no_reason = False
        try:
            apply_workflow(fl2, "Reject")
        except Exception as e:
            if "rejection reason is strictly required" in str(e).lower():
                rej_blocked_no_reason = True
            frappe.db.rollback()

        # Reject with mandatory reason
        fl2.reload()
        fl2.rejection_reason = "Fuel slip missing stamp and quantity mismatch with tank capacity."
        fl2.save(ignore_permissions=True)
        apply_workflow(fl2, "Reject")
        frappe.db.commit()

        fl2.reload()
        passed = (rej_blocked_no_reason and fl2.approval_status == "Rejected" and fl2.rejected_by is not None and fl2.rejection_reason is not None)
        log_result(6, "Fuel Log: Mandatory Rejection Reason & Audit Stamping", passed,
                   f"Blocked without reason: {rej_blocked_no_reason}, Status: {fl2.approval_status}, Rejected By: {fl2.rejected_by}")
    except Exception as e:
        log_result(6, "Fuel Log: Mandatory Rejection Reason & Audit Stamping", False, str(e))
    finally:
        frappe.set_user("Administrator")

    # TEST 07: Fuel Log: Self-Approval Prevention
    try:
        frappe.set_user("test_b12_fleet_mgr@uptoware.local")
        cur_veh_odo = int(frappe.db.get_value("Vehicle", test_veh, "last_odometer") or 40000)
        fl3 = frappe.get_doc({
            "doctype": "Fuel Log",
            "vehicle": test_veh,
            "fuel_date": today_val,
            "odometer_reading_km": cur_veh_odo + 150,
            "quantity_litres": 85.0,
            "rate_per_litre": 90.0,
            "is_full_tank": 1,
            "is_test_record": 1
        })
        fl3.insert(ignore_permissions=True)
        frappe.db.commit()

        # Fleet Manager attempts to approve their own fuel log
        self_app_fl_blocked = False
        try:
            apply_workflow(fl3, "Approve")
        except Exception as e:
            if "self approval" in str(e).lower() or "self-approval" in str(e).lower():
                self_app_fl_blocked = True
            frappe.db.rollback()

        log_result(7, "Fuel Log: Self-Approval Prevention Guard", self_app_fl_blocked,
                   f"Fleet Manager blocked from self-approving created fuel log: {self_app_fl_blocked}")
    except Exception as e:
        log_result(7, "Fuel Log: Self-Approval Prevention Guard", False, str(e))
    finally:
        frappe.set_user("Administrator")

    # TEST 08: Fuel Log: Immutability of Approved Entries
    try:
        frappe.set_user("test_b12_fleet_mgr2@uptoware.local")
        fl_edit_blocked = False
        try:
            fl1.reload()
            fl1.quantity_litres = 120.0
            fl1.save()
        except Exception as e:
            if "cannot be silently edited" in str(e).lower() or "requires reopening" in str(e).lower():
                fl_edit_blocked = True
            frappe.db.rollback()

        log_result(8, "Fuel Log: Immutability & Edit Lock After Approval", fl_edit_blocked,
                   f"Direct edit on approved fuel log blocked: {fl_edit_blocked}")
    except Exception as e:
        log_result(8, "Fuel Log: Immutability & Edit Lock After Approval", False, str(e))
    finally:
        frappe.set_user("Administrator")

    # =========================================================================
    # C. VEHICLE BREAKDOWN & MAINTENANCE APPROVAL LIFECYCLE
    # =========================================================================

    # TEST 09: Vehicle Breakdown: Valid Approval & Workshop Lifecycle
    try:
        frappe.set_user("test_b12_driver@uptoware.local")
        cur_veh_odo = int(frappe.db.get_value("Vehicle", test_veh, "last_odometer") or 40000)
        vb1 = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "vehicle": test_veh,
            "driver": test_driver,
            "mine_site": test_site,
            "breakdown_datetime": now_datetime(),
            "breakdown_type": "Hydraulic",
            "severity": "Critical",
            "odometer_reading": cur_veh_odo + 20,
            "description": "Hydraulic cylinder pressure drop",
            "is_test_record": 1
        })
        vb1.insert(ignore_permissions=True)
        frappe.db.commit()

        # Approve by Fleet Manager (independent)
        frappe.set_user("test_b12_fleet_mgr@uptoware.local")
        vb1.reload()
        apply_workflow(vb1, "Approve")
        frappe.db.commit()

        # Workshop Supervisor admits vehicle to workshop
        frappe.set_user("test_b12_ws_sup@uptoware.local")
        vb1.reload()
        vb1.assigned_workshop = test_supplier
        vb1.save(ignore_permissions=True)
        apply_workflow(vb1, "Send to Workshop")
        frappe.db.commit()

        # Workshop Supervisor marks repaired
        vb1.reload()
        vb1.repair_completion_datetime = now_datetime()
        vb1.labour_cost = 1500.0
        vb1.save(ignore_permissions=True)
        apply_workflow(vb1, "Mark Repaired")
        frappe.db.commit()

        # Fleet Manager closes breakdown
        frappe.set_user("test_b12_fleet_mgr@uptoware.local")
        vb1.reload()
        apply_workflow(vb1, "Close Breakdown")
        frappe.db.commit()

        vb1.reload()
        passed = (vb1.repair_status == "Closed" and vb1.approved_by == "test_b12_fleet_mgr@uptoware.local" and vb1.closed_by == "test_b12_fleet_mgr@uptoware.local")
        log_result(9, "Vehicle Breakdown: Valid Lifecycle & Independent Approval", passed,
                   f"Final Status: {vb1.repair_status}, Approved By: {vb1.approved_by}, Closed By: {vb1.closed_by}")
    except Exception as e:
        log_result(9, "Vehicle Breakdown: Valid Lifecycle & Independent Approval", False, str(e))
    finally:
        frappe.set_user("Administrator")

    # TEST 10: Vehicle Breakdown: Mandatory Rejection Reason
    try:
        frappe.set_user("test_b12_driver@uptoware.local")
        cur_veh_odo = int(frappe.db.get_value("Vehicle", test_veh, "last_odometer") or 40000)
        vb2 = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "vehicle": test_veh,
            "driver": test_driver,
            "mine_site": test_site,
            "breakdown_datetime": now_datetime(),
            "breakdown_type": "Electrical",
            "severity": "Low",
            "odometer_reading": cur_veh_odo + 30,
            "description": "False dashboard sensor alert",
            "is_test_record": 1
        })
        vb2.insert(ignore_permissions=True)
        frappe.db.commit()

        # Fleet Manager attempts rejection without reason
        frappe.set_user("test_b12_fleet_mgr@uptoware.local")
        vb2.reload()
        vb_rej_blocked = False
        try:
            apply_workflow(vb2, "Reject")
        except Exception as e:
            if "rejection reason is strictly required" in str(e).lower():
                vb_rej_blocked = True
            frappe.db.rollback()

        # Reject with mandatory reason
        vb2.reload()
        vb2.rejection_reason = "Inspection confirmed false alert. Sensor reset without defect."
        vb2.save(ignore_permissions=True)
        apply_workflow(vb2, "Reject")
        frappe.db.commit()

        vb2.reload()
        passed = (vb_rej_blocked and vb2.repair_status == "Closed" and vb2.resolution_type == "Rejected" and vb2.closed_by is not None)
        log_result(10, "Vehicle Breakdown: Mandatory Rejection Reason & Audit Stamping", passed,
                   f"Blocked without reason: {vb_rej_blocked}, Resolution: {vb2.resolution_type}, Closed By: {vb2.closed_by}")
    except Exception as e:
        log_result(10, "Vehicle Breakdown: Mandatory Rejection Reason & Audit Stamping", False, str(e))
    finally:
        frappe.set_user("Administrator")

    # TEST 11: Vehicle Breakdown: Self-Approval Prevention
    try:
        frappe.set_user("test_b12_fleet_mgr@uptoware.local")
        cur_veh_odo = int(frappe.db.get_value("Vehicle", test_veh, "last_odometer") or 40000)
        vb3 = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "vehicle": test_veh,
            "driver": test_driver,
            "mine_site": test_site,
            "breakdown_datetime": now_datetime(),
            "breakdown_type": "Engine",
            "severity": "Medium",
            "odometer_reading": cur_veh_odo + 40,
            "reported_by": "test_b12_fleet_mgr@uptoware.local",
            "description": "Engine hesitation reported by fleet manager during road test",
            "is_test_record": 1
        })
        vb3.insert(ignore_permissions=True)
        frappe.db.commit()

        # Reporter attempts to approve own breakdown
        vb_self_app_blocked = False
        try:
            apply_workflow(vb3, "Approve")
        except Exception as e:
            if "self approval" in str(e).lower() or "self-approval" in str(e).lower():
                vb_self_app_blocked = True
            frappe.db.rollback()

        log_result(11, "Vehicle Breakdown: Self-Approval Prevention Guard", vb_self_app_blocked,
                   f"Reporter blocked from self-approving breakdown: {vb_self_app_blocked}")
    except Exception as e:
        log_result(11, "Vehicle Breakdown: Self-Approval Prevention Guard", False, str(e))
    finally:
        frappe.set_user("Administrator")

    # TEST 12: Vehicle Breakdown: Immutability of Closed Records
    try:
        frappe.set_user("test_b12_ws_sup@uptoware.local")
        vb_edit_blocked = False
        try:
            vb1.reload()
            vb1.labour_cost = 9999.0
            vb1.save()
        except Exception as e:
            if "cannot be modified" in str(e).lower() or "is locked" in str(e).lower() or "closed" in str(e).lower():
                vb_edit_blocked = True
            frappe.db.rollback()

        log_result(12, "Vehicle Breakdown: Immutability of Closed Records", vb_edit_blocked,
                   f"Post-closure modification blocked: {vb_edit_blocked}")
    except Exception as e:
        log_result(12, "Vehicle Breakdown: Immutability of Closed Records", False, str(e))
    finally:
        frappe.set_user("Administrator")

    # =========================================================================
    # D. OPERATIONAL EXPENSES APPROVAL LIFECYCLE
    # =========================================================================

    # TEST 13: Operational Expense: Valid Approval & Audit Stamping
    try:
        frappe.set_user("test_b12_driver@uptoware.local")
        oe1 = frappe.get_doc({
            "doctype": "Operational Expense",
            "expense_date": today_val,
            "expense_category": "Toll and Road Charges",
            "amount": 750.0,
            "vehicle": test_veh,
            "company": test_company,
            "description": "Highway toll receipt",
            "expense_account": "Cost of Goods Sold - U",
            "payment_account": "Cash - U",
            "cost_center": "Main - U",
            "is_test_record": 1
        })
        oe1.insert(ignore_permissions=True)
        apply_workflow(oe1, "Submit for Approval")
        frappe.db.commit()

        # Independent Fleet Manager approves
        frappe.set_user("test_b12_fleet_mgr@uptoware.local")
        oe1.reload()
        apply_workflow(oe1, "Approve")
        frappe.db.commit()

        oe1.reload()
        passed = (oe1.approval_status == "Approved" and oe1.approved_by == "test_b12_fleet_mgr@uptoware.local" and oe1.approved_on is not None)
        log_result(13, "Operational Expense: Valid Approval & Audit Trail", passed,
                   f"Status: {oe1.approval_status}, Approved By: {oe1.approved_by}, On: {oe1.approved_on}")
    except Exception as e:
        log_result(13, "Operational Expense: Valid Approval & Audit Trail", False, str(e))
    finally:
        frappe.set_user("Administrator")

    # TEST 14: Operational Expense: Mandatory Rejection Reason
    try:
        frappe.set_user("test_b12_driver@uptoware.local")
        oe2 = frappe.get_doc({
            "doctype": "Operational Expense",
            "expense_date": today_val,
            "expense_category": "Parking",
            "amount": 250.0,
            "vehicle": test_veh,
            "company": test_company,
            "description": "Unauthorized parking claim",
            "expense_account": "Cost of Goods Sold - U",
            "payment_account": "Cash - U",
            "cost_center": "Main - U",
            "is_test_record": 1
        })
        oe2.insert(ignore_permissions=True)
        apply_workflow(oe2, "Submit for Approval")
        frappe.db.commit()

        # Fleet Manager attempts rejection without reason
        frappe.set_user("test_b12_fleet_mgr@uptoware.local")
        oe2.reload()
        oe_rej_blocked = False
        try:
            apply_workflow(oe2, "Reject")
        except Exception as e:
            if "rejection reason is strictly required" in str(e).lower():
                oe_rej_blocked = True
            frappe.db.rollback()

        # Reject with mandatory reason
        oe2.reload()
        oe2.rejection_reason = "No parking authorization provided for non-designated lot."
        oe2.save(ignore_permissions=True)
        apply_workflow(oe2, "Reject")
        frappe.db.commit()

        oe2.reload()
        passed = (oe_rej_blocked and oe2.approval_status == "Rejected" and oe2.rejected_by is not None and oe2.rejection_reason is not None)
        log_result(14, "Operational Expense: Mandatory Rejection Reason & Stamping", passed,
                   f"Blocked without reason: {oe_rej_blocked}, Status: {oe2.approval_status}, Rejected By: {oe2.rejected_by}")
    except Exception as e:
        log_result(14, "Operational Expense: Mandatory Rejection Reason & Stamping", False, str(e))
    finally:
        frappe.set_user("Administrator")

    # TEST 15: Operational Expense: Self-Approval Prevention
    try:
        frappe.set_user("test_b12_fleet_mgr@uptoware.local")
        oe3 = frappe.get_doc({
            "doctype": "Operational Expense",
            "expense_date": today_val,
            "expense_category": "Weighbridge Charges",
            "amount": 500.0,
            "vehicle": test_veh,
            "company": test_company,
            "description": "Out-of-pocket weighbridge slip logged by fleet manager",
            "expense_account": "Cost of Goods Sold - U",
            "payment_account": "Cash - U",
            "cost_center": "Main - U",
            "is_test_record": 1
        })
        oe3.insert(ignore_permissions=True)
        apply_workflow(oe3, "Submit for Approval")
        frappe.db.commit()

        # Submitter attempts to self-approve
        oe_self_app_blocked = False
        try:
            apply_workflow(oe3, "Approve")
        except Exception as e:
            if "self approval" in str(e).lower() or "self-approval" in str(e).lower():
                oe_self_app_blocked = True
            frappe.db.rollback()

        log_result(15, "Operational Expense: Self-Approval Prevention Guard", oe_self_app_blocked,
                   f"Creator blocked from self-approving expense: {oe_self_app_blocked}")
    except Exception as e:
        log_result(15, "Operational Expense: Self-Approval Prevention Guard", False, str(e))
    finally:
        frappe.set_user("Administrator")

    # TEST 16: Operational Expense: Accountant-Only Posting Authorization
    try:
        # Workshop Supervisor attempts to post Journal Entry for approved expense
        frappe.set_user("test_b12_ws_sup@uptoware.local")
        post_blocked = False
        try:
            je = frappe.new_doc("Journal Entry")
            je.company = test_company
            je.posting_date = today_val
            je.user_remark = f"Operational Expense Settlement: {oe1.name}"
            je.append("accounts", {"account": "Cost of Goods Sold - U", "debit_in_account_currency": oe1.amount, "cost_center": "Main - U"})
            je.append("accounts", {"account": "Cash - U", "credit_in_account_currency": oe1.amount, "cost_center": "Main - U"})
            je.flags.ignore_permissions = True
            je.insert()
            je.flags.ignore_permissions = False
            je.submit()
        except Exception:
            post_blocked = True
            frappe.db.rollback()

        # Authorized Accountant posts settlement
        frappe.set_user("test_b12_accountant@uptoware.local")
        je_acc = frappe.new_doc("Journal Entry")
        je_acc.company = test_company
        je_acc.posting_date = today_val
        je_acc.user_remark = f"Operational Expense Settlement: {oe1.name}"
        je_acc.append("accounts", {"account": "Cost of Goods Sold - U", "debit_in_account_currency": oe1.amount, "cost_center": "Main - U"})
        je_acc.append("accounts", {"account": "Cash - U", "credit_in_account_currency": oe1.amount, "cost_center": "Main - U"})
        je_acc.insert(ignore_permissions=True)
        je_acc.submit()
        frappe.db.commit()

        passed = (post_blocked and je_acc.docstatus == 1)
        log_result(16, "Operational Expense: Accountant-Only Posting Authorization", passed,
                   f"Non-finance posting blocked: {post_blocked}, Accountant JE posted: {je_acc.name}")
    except Exception as e:
        log_result(16, "Operational Expense: Accountant-Only Posting Authorization", False, str(e))
    finally:
        frappe.set_user("Administrator")

    # =========================================================================
    # E. INVENTORY & SPARE PARTS APPROVAL LIFECYCLE
    # =========================================================================

    # TEST 17: Inventory: Material Request & Stock Entry Role Guards
    try:
        # Driver attempts to submit Material Request (should be BLOCKED)
        frappe.set_user("test_b12_driver@uptoware.local")
        mr_driver_blocked = False
        try:
            mr = frappe.new_doc("Material Request")
            mr.material_request_type = "Material Transfer"
            mr.company = test_company
            mr.schedule_date = add_days(today_val, 7)
            mr.custom_is_test_record = 1
            mr.append("items", {"item_code": test_item, "qty": 5, "warehouse": "Stores - U", "schedule_date": add_days(today_val, 7)})
            mr.insert(ignore_permissions=True)
            mr.submit()
        except Exception:
            mr_driver_blocked = True
            frappe.db.rollback()

        # Authorized Store Manager submits Material Request
        frappe.set_user("test_b12_store_mgr@uptoware.local")
        mr_sm = frappe.new_doc("Material Request")
        mr_sm.material_request_type = "Material Transfer"
        mr_sm.company = test_company
        mr_sm.schedule_date = add_days(today_val, 7)
        mr_sm.custom_is_test_record = 1
        mr_sm.append("items", {"item_code": test_item, "qty": 5, "warehouse": "Stores - U", "schedule_date": add_days(today_val, 7)})
        mr_sm.insert(ignore_permissions=True)
        mr_sm.submit()
        frappe.db.commit()

        # Driver attempts to submit Stock Entry (should be BLOCKED)
        frappe.set_user("test_b12_driver@uptoware.local")
        se_driver_blocked = False
        try:
            se = frappe.new_doc("Stock Entry")
            se.stock_entry_type = "Material Issue"
            se.company = test_company
            se.custom_is_test_record = 1
            se.append("items", {"item_code": test_item, "qty": 1, "s_warehouse": "Stores - U", "cost_center": "Main - U"})
            se.insert(ignore_permissions=True)
            se.submit()
        except Exception:
            se_driver_blocked = True
            frappe.db.rollback()

        mr_sm.reload()
        passed = (mr_driver_blocked and mr_sm.docstatus == 1 and mr_sm.custom_approved_by is not None and se_driver_blocked)
        log_result(17, "Inventory: Material Request & Stock Entry Authorization Guards", passed,
                   f"MR Driver blocked: {mr_driver_blocked}, MR Store Manager: {mr_sm.name} (Approved By: {mr_sm.custom_approved_by}), SE Driver blocked: {se_driver_blocked}")
    except Exception as e:
        log_result(17, "Inventory: Material Request & Stock Entry Authorization Guards", False, str(e))
    finally:
        frappe.set_user("Administrator")

    # =========================================================================
    # F. PROCUREMENT & VENDOR APPROVAL LIFECYCLE
    # =========================================================================

    # TEST 18: Procurement: Purchase Order, Receipt & Invoice Role Segregation
    try:
        # Driver attempts to submit Purchase Order (BLOCKED)
        frappe.set_user("test_b12_driver@uptoware.local")
        po_driver_blocked = False
        try:
            po = frappe.new_doc("Purchase Order")
            po.supplier = test_supplier
            po.company = test_company
            po.schedule_date = add_days(today_val, 7)
            po.custom_vehicle = test_veh
            po.custom_is_test_record = 1
            po.append("items", {"item_code": test_item, "qty": 2, "rate": 450.0, "warehouse": "Stores - U", "schedule_date": add_days(today_val, 7)})
            po.insert(ignore_permissions=True)
            po.submit()
        except Exception:
            po_driver_blocked = True
            frappe.db.rollback()

        # Store Manager attempts to submit Purchase Order (BLOCKED - restricted to Fleet Manager)
        frappe.set_user("test_b12_store_mgr@uptoware.local")
        po_sm_blocked = False
        try:
            po_sm_att = frappe.new_doc("Purchase Order")
            po_sm_att.supplier = test_supplier
            po_sm_att.company = test_company
            po_sm_att.schedule_date = add_days(today_val, 7)
            po_sm_att.custom_vehicle = test_veh
            po_sm_att.custom_is_test_record = 1
            po_sm_att.append("items", {"item_code": test_item, "qty": 2, "rate": 450.0, "warehouse": "Stores - U", "schedule_date": add_days(today_val, 7)})
            po_sm_att.insert(ignore_permissions=True)
            po_sm_att.submit()
        except Exception:
            po_sm_blocked = True
            frappe.db.rollback()

        # Fleet Manager submits Purchase Order (AUTHORIZED)
        frappe.set_user("test_b12_fleet_mgr@uptoware.local")
        po_fm = frappe.new_doc("Purchase Order")
        po_fm.supplier = test_supplier
        po_fm.company = test_company
        po_fm.schedule_date = add_days(today_val, 7)
        po_fm.custom_vehicle = test_veh
        po_fm.custom_is_test_record = 1
        po_fm.append("items", {"item_code": test_item, "qty": 2, "rate": 450.0, "warehouse": "Stores - U", "schedule_date": add_days(today_val, 7)})
        po_fm.insert(ignore_permissions=True)
        po_fm.submit()
        frappe.db.commit()

        # Store Manager verifies and submits Purchase Receipt (AUTHORIZED)
        frappe.set_user("test_b12_store_mgr@uptoware.local")
        pr_sm = frappe.new_doc("Purchase Receipt")
        pr_sm.supplier = test_supplier
        pr_sm.company = test_company
        pr_sm.custom_vehicle = test_veh
        pr_sm.custom_is_test_record = 1
        pr_sm.append("items", {"item_code": test_item, "qty": 2, "rate": 450.0, "warehouse": "Stores - U", "purchase_order": po_fm.name})
        pr_sm.insert(ignore_permissions=True)
        pr_sm.submit()
        frappe.db.commit()

        # Store Manager attempts to submit Purchase Invoice (BLOCKED - Accountant only)
        pi_sm_blocked = False
        try:
            pi_sm = frappe.new_doc("Purchase Invoice")
            pi_sm.supplier = test_supplier
            pi_sm.company = test_company
            pi_sm.due_date = add_days(today_val, 30)
            pi_sm.custom_vehicle = test_veh
            pi_sm.custom_is_test_record = 1
            pi_sm.append("items", {"item_code": test_item, "qty": 2, "rate": 450.0, "purchase_receipt": pr_sm.name})
            pi_sm.insert(ignore_permissions=True)
            pi_sm.submit()
        except Exception:
            pi_sm_blocked = True
            frappe.db.rollback()

        # Accountant submits Purchase Invoice (AUTHORIZED)
        frappe.set_user("test_b12_accountant@uptoware.local")
        pi_acc = frappe.new_doc("Purchase Invoice")
        pi_acc.supplier = test_supplier
        pi_acc.company = test_company
        pi_acc.due_date = add_days(today_val, 30)
        pi_acc.custom_vehicle = test_veh
        pi_acc.custom_is_test_record = 1
        pi_acc.append("items", {"item_code": test_item, "qty": 2, "rate": 450.0, "purchase_receipt": pr_sm.name})
        pi_acc.insert(ignore_permissions=True)
        pi_acc.submit()
        frappe.db.commit()

        pr_sm.reload()
        pi_acc.reload()
        passed = (po_driver_blocked and po_sm_blocked and po_fm.docstatus == 1 and pr_sm.docstatus == 1 and pr_sm.custom_verified_by is not None and pi_sm_blocked and pi_acc.docstatus == 1 and pi_acc.custom_approved_by is not None)
        log_result(18, "Procurement: PO, PR & PI Role Segregation & Approval", passed,
                   f"PO Driver blocked: {po_driver_blocked}, PO SM blocked: {po_sm_blocked}, PO FM: {po_fm.name}, PR SM: {pr_sm.name} (Verified By: {pr_sm.custom_verified_by}), PI SM blocked: {pi_sm_blocked}, PI Acc: {pi_acc.name}")
    except Exception as e:
        log_result(18, "Procurement: PO, PR & PI Role Segregation & Approval", False, str(e))
    finally:
        frappe.set_user("Administrator")

    # =========================================================================
    # G. INSURANCE & COMPLIANCE APPROVAL LIFECYCLE
    # =========================================================================

    # TEST 19: Insurance Policy: Self-Activation Prevention & Mandatory Cancellation Reason
    try:
        frappe.set_user("test_b12_fleet_mgr@uptoware.local")
        pol_num = f"POL-B12-SELF-{frappe.utils.random_string(4)}"
        vip_self = frappe.new_doc("Vehicle Insurance Policy")
        vip_self.vehicle = test_veh_ins
        vip_self.insurance_company = "ICICI Lombard General Insurance"
        vip_self.policy_no = pol_num
        vip_self.start_date = today_val
        vip_self.end_date = add_days(today_val, 365)
        vip_self.premium_amount = 22000.0
        vip_self.policy_status = "Draft"
        vip_self.is_test_record = 1
        vip_self.insert(ignore_permissions=True)
        frappe.db.commit()

        # Creator attempts to activate own policy
        self_act_blocked = False
        try:
            vip_self.policy_status = "Active"
            vip_self.save()
        except Exception as e:
            if "self-approval" in str(e).lower() or "self approval" in str(e).lower():
                self_act_blocked = True
            frappe.db.rollback()

        # Independent Fleet Manager activates policy
        frappe.set_user("test_b12_fleet_mgr2@uptoware.local")
        vip_self.reload()
        vip_self.policy_status = "Active"
        vip_self.save()
        frappe.db.commit()

        # Cancellation without reason blocked
        cancel_no_reason_blocked = False
        try:
            vip_self.reload()
            vip_self.policy_status = "Cancelled"
            vip_self.save()
        except Exception as e:
            if "cancellation reason is mandatory" in str(e).lower():
                cancel_no_reason_blocked = True
            frappe.db.rollback()

        vip_self.reload()
        vip_self.policy_status = "Cancelled"
        vip_self.cancellation_reason = "Vehicle sold / replaced under fleet modernization."
        vip_self.save()
        frappe.db.commit()

        vip_self.reload()
        passed = (self_act_blocked and cancel_no_reason_blocked and vip_self.policy_status == "Cancelled" and vip_self.cancelled_by is not None)
        log_result(19, "Insurance Policy: Self-Activation Prevention & Cancellation Guard", passed,
                   f"Self-activation blocked: {self_act_blocked}, Cancel without reason blocked: {cancel_no_reason_blocked}, Cancelled By: {vip_self.cancelled_by}")
    except Exception as e:
        log_result(19, "Insurance Policy: Self-Activation Prevention & Cancellation Guard", False, str(e))
    finally:
        frappe.set_user("Administrator")

    # =========================================================================
    # H. FINANCIAL & REVENUE TRANSACTION APPROVAL LIFECYCLE
    # =========================================================================

    # TEST 20: Financial Transactions: Accountant-Only Submission for SI & PE
    try:
        # Workshop Supervisor attempts to submit Sales Invoice
        frappe.set_user("test_b12_ws_sup@uptoware.local")
        si_ws_blocked = False
        try:
            si_ws = frappe.new_doc("Sales Invoice")
            si_ws.customer = test_customer
            si_ws.company = test_company
            si_ws.due_date = add_days(today_val, 15)
            si_ws.custom_is_test_record = 1
            si_ws.append("items", {"item_code": "B9-HAUL-103726", "qty": 10, "rate": 500, "income_account": "Sales - U", "cost_center": "Main - U"})
            si_ws.insert(ignore_permissions=True)
            si_ws.submit()
        except Exception:
            si_ws_blocked = True
            frappe.db.rollback()

        # Authorized Accountant submits Sales Invoice
        frappe.set_user("test_b12_accountant@uptoware.local")
        si_acc = frappe.new_doc("Sales Invoice")
        si_acc.customer = test_customer
        si_acc.company = test_company
        si_acc.due_date = add_days(today_val, 15)
        si_acc.custom_is_test_record = 1
        si_acc.append("items", {"item_code": "B9-HAUL-103726", "qty": 10, "rate": 500, "income_account": "Sales - U", "cost_center": "Main - U"})
        si_acc.insert(ignore_permissions=True)
        si_acc.submit()
        frappe.db.commit()

        # Store Manager attempts to submit Payment Entry
        frappe.set_user("test_b12_store_mgr@uptoware.local")
        pe_sm_blocked = False
        try:
            pe_sm = frappe.new_doc("Payment Entry")
            pe_sm.payment_type = "Receive"
            pe_sm.party_type = "Customer"
            pe_sm.party = test_customer
            pe_sm.company = test_company
            pe_sm.paid_amount = 5000.0
            pe_sm.received_amount = 5000.0
            pe_sm.paid_to = "Cash - U"
            pe_sm.custom_is_test_record = 1
            pe_sm.append("references", {"reference_doctype": "Sales Invoice", "reference_name": si_acc.name, "allocated_amount": 5000.0})
            pe_sm.insert(ignore_permissions=True)
            pe_sm.submit()
        except Exception:
            pe_sm_blocked = True
            frappe.db.rollback()

        # Authorized Accountant submits Payment Entry
        frappe.set_user("test_b12_accountant@uptoware.local")
        pe_acc = frappe.new_doc("Payment Entry")
        pe_acc.payment_type = "Receive"
        pe_acc.party_type = "Customer"
        pe_acc.party = test_customer
        pe_acc.company = test_company
        pe_acc.paid_amount = 5000.0
        pe_acc.received_amount = 5000.0
        pe_acc.paid_to = "Cash - U"
        pe_acc.custom_is_test_record = 1
        pe_acc.append("references", {"reference_doctype": "Sales Invoice", "reference_name": si_acc.name, "allocated_amount": 5000.0})
        pe_acc.insert(ignore_permissions=True)
        pe_acc.submit()
        frappe.db.commit()

        passed = (si_ws_blocked and si_acc.docstatus == 1 and si_acc.custom_approved_by is not None and pe_sm_blocked and pe_acc.docstatus == 1)
        log_result(20, "Financial Transactions: SI & PE Accountant-Only Authorization", passed,
                   f"SI Non-finance blocked: {si_ws_blocked}, SI Acc: {si_acc.name} (Approved By: {si_acc.custom_approved_by}), PE Non-finance blocked: {pe_sm_blocked}, PE Acc: {pe_acc.name}")
    except Exception as e:
        log_result(20, "Financial Transactions: SI & PE Accountant-Only Authorization", False, str(e))
    finally:
        frappe.set_user("Administrator")

    # =========================================================================
    # SUMMARY
    # =========================================================================
    print("======================================================================")
    total_tests = len(results)
    passed_tests = sum(1 for r in results if r["passed"])
    failed_tests = total_tests - passed_tests
    print(f"Batch 12 Test Summary: {passed_tests}/{total_tests} Tests Passed ({(passed_tests/total_tests)*100:.1f}%)")
    print("======================================================================")

    if failed_tests > 0:
        print("FAILED TESTS:")
        for r in results:
            if not r["passed"]:
                print(f"  - Test {r['test_num']}: {r['name']} -> {r['details']}")
    else:
        print("ALL BATCH 12 TESTS PASSED WITH 100% SUCCESS RATE!")

    return failed_tests == 0

if __name__ == "__main__":
    run_tests()
