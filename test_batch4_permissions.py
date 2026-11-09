import frappe

def run():
    from frappe.model.workflow import apply_workflow
    print("\n=======================================================")
    print("   UPTOWARE FLEET ERP - BATCH 4 PERMISSION AUDIT TESTS ")
    print("=======================================================\n")

    test_results = []
    
    def log_test(num, name, passed, details=""):
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status} Test {num:02d}: {name} | {details}")
        test_results.append((num, name, passed, details))

    # 1. Setup Test Users with Exact Roles
    role_users = {
        "Fleet Manager": "test_perm_fleet@example.com",
        "Workshop Supervisor": "test_perm_workshop@example.com",
        "Driver": "test_perm_driver@example.com",
        "Accountant": "test_perm_accountant@example.com",
        "System Manager": "test_perm_sysmgr@example.com"
    }

    for role_name, user_email in role_users.items():
        if not frappe.db.exists("User", user_email):
            u = frappe.get_doc({
                "doctype": "User",
                "email": user_email,
                "first_name": f"Test {role_name}",
                "enabled": 1,
                "user_type": "System User"
            }).insert(ignore_permissions=True)
        else:
            u = frappe.get_doc("User", user_email)
            u.enabled = 1
        u.roles = []
        u.append("roles", {"role": role_name})
        u.append("roles", {"role": "Desk User"})
        u.save(ignore_permissions=True)
    frappe.db.commit()

    # Setup base operational breakdown for testing
    veh_plate = "KA-19-MG-9001"
    driver_name = frappe.db.get_value("Driver", {"full_name": "Rajesh Kumar"}, "name")
    mine_site = "Kudremukh North Pit"
    workshop = "AutoMech Central Workshop"
    last_odo = frappe.db.get_value("Vehicle", veh_plate, "last_odometer") or 80000

    # Reset to Administrator before starting tests
    frappe.set_user("Administrator")

    # ----------------------------------------------------
    # TEST P1: Fleet Manager Delete Prohibition
    # ----------------------------------------------------
    try:
        bkd_p1 = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "breakdown_datetime": "2026-11-04 10:00:00",
            "vehicle": veh_plate,
            "driver": driver_name,
            "mine_site": mine_site,
            "odometer_reading": last_odo + 100,
            "breakdown_type": "Engine",
            "severity": "Low",
            "description": "Test delete prohibition",
            "is_test_record": 1
        }).insert(ignore_permissions=True)

        frappe.set_user(role_users["Fleet Manager"])
        fm_delete_blocked = False
        try:
            frappe.delete_doc("Vehicle Breakdown", bkd_p1.name)
        except (frappe.PermissionError, frappe.ValidationError):
            fm_delete_blocked = True

        frappe.set_user("Administrator")
        doc_exists = bool(frappe.db.exists("Vehicle Breakdown", bkd_p1.name))

        p1_ok = fm_delete_blocked and doc_exists
        log_test(1, "Fleet Manager Delete Prohibition", p1_ok,
                 f"Blocked: {fm_delete_blocked}, ExistsInDB: {doc_exists}")
    except Exception as e:
        frappe.set_user("Administrator")
        log_test(1, "Fleet Manager Delete Prohibition", False, str(e))

    # ----------------------------------------------------
    # TEST P2: Workshop Supervisor Approval Stamps Protection
    # ----------------------------------------------------
    try:
        frappe.set_user("Administrator")
        bkd_p2 = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "breakdown_datetime": "2026-11-04 10:00:00",
            "vehicle": veh_plate,
            "driver": driver_name,
            "mine_site": mine_site,
            "odometer_reading": last_odo + 100,
            "breakdown_type": "Hydraulic",
            "severity": "Medium",
            "description": "Test approval stamps protection",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        apply_workflow(bkd_p2, "Approve")
        apply_workflow(bkd_p2, "Send to Workshop")
        bkd_p2.reload()
        orig_approved_by = bkd_p2.approved_by

        frappe.set_user(role_users["Workshop Supervisor"])
        # Attempt to tamper with approved_by in In Workshop state
        tamp_approved_by = False
        try:
            doc_ws = frappe.get_doc("Vehicle Breakdown", bkd_p2.name)
            doc_ws.approved_by = role_users["Fleet Manager"]
            doc_ws.save()
        except (frappe.ValidationError, frappe.PermissionError):
            tamp_approved_by = True

        # Attempt to tamper with approved_on
        tamp_approved_on = False
        try:
            doc_ws = frappe.get_doc("Vehicle Breakdown", bkd_p2.name)
            doc_ws.approved_on = "2020-01-01 00:00:00"
            doc_ws.save()
        except (frappe.ValidationError, frappe.PermissionError):
            tamp_approved_on = True

        frappe.set_user("Administrator")
        bkd_p2.reload()
        stamp_intact = (bkd_p2.approved_by == orig_approved_by)

        p2_ok = tamp_approved_by and tamp_approved_on and stamp_intact
        log_test(2, "Workshop Supervisor Approval Stamps Protection", p2_ok,
                 f"TamperApprovedByBlocked: {tamp_approved_by}, TamperApprovedOnBlocked: {tamp_approved_on}, StampIntact: {stamp_intact}")
    except Exception as e:
        frappe.set_user("Administrator")
        log_test(2, "Workshop Supervisor Approval Stamps Protection", False, str(e))

    # ----------------------------------------------------
    # TEST P3: Workshop Supervisor Closure Audit Fields Protection
    # ----------------------------------------------------
    try:
        frappe.set_user("Administrator")
        bkd_p3 = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "breakdown_datetime": "2026-11-04 10:00:00",
            "vehicle": veh_plate,
            "driver": driver_name,
            "mine_site": mine_site,
            "odometer_reading": last_odo + 100,
            "breakdown_type": "Electrical",
            "severity": "Low",
            "description": "Test closure audit protection",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        apply_workflow(bkd_p3, "Approve")
        apply_workflow(bkd_p3, "Send to Workshop")
        bkd_p3.reload()

        frappe.set_user(role_users["Workshop Supervisor"])
        # In Workshop state, Workshop Supervisor attempts to modify closure fields
        tamp_closed_by = False
        try:
            doc_ws = frappe.get_doc("Vehicle Breakdown", bkd_p3.name)
            doc_ws.closed_by = role_users["Fleet Manager"]
            doc_ws.save()
        except (frappe.ValidationError, frappe.PermissionError):
            tamp_closed_by = True

        tamp_res_type = False
        try:
            doc_ws = frappe.get_doc("Vehicle Breakdown", bkd_p3.name)
            doc_ws.resolution_type = "Rejected"
            doc_ws.save()
        except (frappe.ValidationError, frappe.PermissionError):
            tamp_res_type = True

        tamp_rej_reason = False
        try:
            doc_ws = frappe.get_doc("Vehicle Breakdown", bkd_p3.name)
            doc_ws.rejection_reason = "Malicious injection"
            doc_ws.save()
        except (frappe.ValidationError, frappe.PermissionError):
            tamp_rej_reason = True

        frappe.set_user("Administrator")
        bkd_p3.reload()
        closure_intact = (not bkd_p3.closed_by and not bkd_p3.resolution_type)

        p3_ok = tamp_closed_by and tamp_res_type and tamp_rej_reason and closure_intact
        log_test(3, "Workshop Supervisor Closure Audit Fields Protection", p3_ok,
                 f"ClosedByBlocked: {tamp_closed_by}, ResTypeBlocked: {tamp_res_type}, RejReasonBlocked: {tamp_rej_reason}, ClosureIntact: {closure_intact}")
    except Exception as e:
        frappe.set_user("Administrator")
        log_test(3, "Workshop Supervisor Closure Audit Fields Protection", False, str(e))

    # ----------------------------------------------------
    # TEST P4: Workshop Supervisor Parts Valuation & Financial Integrity
    # ----------------------------------------------------
    try:
        frappe.set_user("Administrator")
        bkd_p4 = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "breakdown_datetime": "2026-11-04 10:00:00",
            "vehicle": veh_plate,
            "driver": driver_name,
            "mine_site": mine_site,
            "odometer_reading": last_odo + 100,
            "breakdown_type": "Tyre",
            "severity": "Low",
            "description": "Test financial integrity",
            "is_test_record": 1,
            "parts_table": [
                {
                    "item_code": "SP-HYD-SEAL-01",
                    "planned_qty": 2,
                    "warehouse": "Stores - U"
                }
            ]
        }).insert(ignore_permissions=True)
        apply_workflow(bkd_p4, "Approve")
        apply_workflow(bkd_p4, "Send to Workshop")
        bkd_p4.reload()

        frappe.set_user(role_users["Workshop Supervisor"])
        # Attempt to manually set issued_qty on child row without Stock Entry
        tamp_qty = False
        try:
            doc_ws = frappe.get_doc("Vehicle Breakdown", bkd_p4.name)
            doc_ws.parts_table[0].issued_qty = 2
            doc_ws.save()
        except (frappe.ValidationError, frappe.PermissionError):
            tamp_qty = True

        # Attempt to manually set valuation rate on child row
        tamp_rate = False
        try:
            doc_ws = frappe.get_doc("Vehicle Breakdown", bkd_p4.name)
            doc_ws.parts_table[0].rate = 5000.0
            doc_ws.save()
        except (frappe.ValidationError, frappe.PermissionError):
            tamp_rate = True

        frappe.set_user("Administrator")
        bkd_p4.reload()
        parts_intact = (float(bkd_p4.parts_table[0].issued_qty or 0.0) == 0.0)

        p4_ok = tamp_qty and tamp_rate and parts_intact
        log_test(4, "Workshop Supervisor Parts Valuation & Financial Tamper Protection", p4_ok,
                 f"QtyTamperBlocked: {tamp_qty}, RateTamperBlocked: {tamp_rate}, PartsIntact: {parts_intact}")
    except Exception as e:
        frappe.set_user("Administrator")
        log_test(4, "Workshop Supervisor Financial Protection", False, str(e))

    # ----------------------------------------------------
    # TEST P5: Workshop Supervisor Permitted Modifications (Repair Details)
    # ----------------------------------------------------
    try:
        frappe.set_user(role_users["Workshop Supervisor"])
        doc_ws = frappe.get_doc("Vehicle Breakdown", bkd_p4.name)
        doc_ws.repair_description = "Workshop inspection underway: hoses checked."
        doc_ws.labour_cost = 750.0
        doc_ws.assigned_workshop = workshop
        doc_ws.save()

        frappe.set_user("Administrator")
        bkd_p4.reload()
        p5_ok = (
            bkd_p4.repair_description == "Workshop inspection underway: hoses checked."
            and float(bkd_p4.labour_cost) == 750.0
            and bkd_p4.assigned_workshop == workshop
        )
        log_test(5, "Workshop Supervisor Permitted Modifications (Repair Details & Labour)", p5_ok,
                 f"Desc: '{bkd_p4.repair_description}', Labour: ₹{bkd_p4.labour_cost}, Workshop: {bkd_p4.assigned_workshop}")
    except Exception as e:
        frappe.set_user("Administrator")
        log_test(5, "Workshop Supervisor Permitted Modifications", False, str(e))

    # ----------------------------------------------------
    # TEST P6: Role Responsibilities Matrix Verification (Accountant, Driver, SysMgr)
    # ----------------------------------------------------
    try:
        # Accountant: Can Read, but Write is Blocked
        frappe.set_user(role_users["Accountant"])
        acc_read_ok = bool(frappe.get_doc("Vehicle Breakdown", bkd_p4.name))
        acc_write_blocked = False
        try:
            doc_acc = frappe.get_doc("Vehicle Breakdown", bkd_p4.name)
            doc_acc.repair_description = "Accountant tamper"
            doc_acc.save()
        except (frappe.PermissionError, frappe.ValidationError):
            acc_write_blocked = True

        # Driver: Can Create in Reported status, cannot modify once reported
        frappe.set_user(role_users["Driver"])
        drv_bkd = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "breakdown_datetime": "2026-11-04 11:00:00",
            "vehicle": veh_plate,
            "driver": driver_name,
            "mine_site": mine_site,
            "odometer_reading": last_odo + 100,
            "breakdown_type": "Other",
            "severity": "Low",
            "description": "Driver flat tyre report",
            "is_test_record": 1
        }).insert()
        drv_create_ok = bool(drv_bkd.name)

        drv_edit_blocked = False
        try:
            drv_bkd.description = "Driver unauthorized update"
            drv_bkd.save()
        except (frappe.PermissionError, frappe.ValidationError):
            drv_edit_blocked = True

        # System Manager: Can perform all administrative actions
        frappe.set_user(role_users["System Manager"])
        sm_doc = frappe.get_doc("Vehicle Breakdown", drv_bkd.name)
        sm_doc.repair_description = "System Manager administrative note"
        sm_doc.save()
        sm_ok = (sm_doc.repair_description == "System Manager administrative note")

        frappe.set_user("Administrator")
        p6_ok = acc_read_ok and acc_write_blocked and drv_create_ok and drv_edit_blocked and sm_ok
        log_test(6, "Full Role Responsibilities Matrix Verification (Fleet, Workshop, Accountant, Driver, SysMgr)", p6_ok,
                 f"AccRead: {acc_read_ok}, AccWriteBlocked: {acc_write_blocked}, DrvCreate: {drv_create_ok}, DrvEditBlocked: {drv_edit_blocked}, SysMgrOk: {sm_ok}")
    except Exception as e:
        frappe.set_user("Administrator")
        log_test(6, "Role Responsibilities Matrix", False, str(e))

    # Reset user to Administrator
    frappe.set_user("Administrator")

    # Summary
    passed_cnt = sum(1 for _, _, p, _ in test_results if p)
    total_cnt = len(test_results)
    print("\n=======================================================")
    print(f"   PERMISSION TESTS SUMMARY: {passed_cnt} PASSED / {total_cnt - passed_cnt} FAILED (TOTAL {total_cnt})")
    print("=======================================================")
    assert passed_cnt == total_cnt, f"Failed permission tests: {[n for n, _, p, _ in test_results if not p]}"

run()
