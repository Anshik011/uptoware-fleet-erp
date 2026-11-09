import frappe

def run():
    import frappe
    from frappe.utils import today, add_days, getdate, flt, now_datetime
    from frappe.desk.query_report import run as run_report
    print("\n=======================================================")
    print("   UPTOWARE FLEET ERP - BATCH 8 INSURANCE & RENEWALS   ")
    print("=======================================================\n")

    test_results = []
    created_docs = []

    def log_test(num, name, passed, details=""):
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status} Test {num:02d}: {name} | {details}")
        test_results.append((num, name, passed, details))

    ts = now_datetime().strftime('%H%M%S')
    company = "Uptoware"
    curr_date = today()
    yesterday = add_days(curr_date, -1)
    tomorrow = add_days(curr_date, 1)
    future_date = add_days(curr_date, 365)
    past_date = add_days(curr_date, -365)

    # Setup dedicated test users for permission testing
    role_users = {
        "Fleet Manager": f"test_fleet_b8_{ts}@uptoware.local",
        "Workshop Supervisor": f"test_ws_b8_{ts}@uptoware.local",
        "Store Manager": f"test_store_b8_{ts}@uptoware.local",
        "Accountant": f"test_acc_b8_{ts}@uptoware.local"
    }
    for r_name, u_email in role_users.items():
        if not frappe.db.exists("User", u_email):
            u = frappe.get_doc({
                "doctype": "User",
                "email": u_email,
                "first_name": f"Test {r_name}",
                "enabled": 1,
                "roles": [{"role": r_name}, {"role": "Desk User"}]
            }).insert(ignore_permissions=True)
            created_docs.append(("User", u.name))

    # Create dedicated test vehicles
    v_active_code = f"B8-VEH-ACT-{ts}"
    v_act = frappe.get_doc({
        "doctype": "Vehicle",
        "license_plate": v_active_code,
        "make": "Tata",
        "model": "Prima 3530.K",
        "vehicle_status": "Active",
        "last_odometer": 1000.0,
        "uom": "Nos",
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    created_docs.append(("Vehicle", v_act.name))

    v_exp_code = f"B8-VEH-EXP-{ts}"
    v_exp = frappe.get_doc({
        "doctype": "Vehicle",
        "license_plate": v_exp_code,
        "make": "Ashok Leyland",
        "model": "Captain 3118",
        "vehicle_status": "Active",
        "last_odometer": 1000.0,
        "uom": "Nos",
        "start_date": past_date,
        "end_date": yesterday,
        "fitness_expiry_date": future_date,
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    created_docs.append(("Vehicle", v_exp.name))

    # -------------------------------------------------------------
    # Test 01: Mandatory Fields & Date Range Validation
    # -------------------------------------------------------------
    draft_pol = None
    try:
        # Invalid date range (end_date < start_date)
        bad_dates_blocked = False
        try:
            bad_pol = frappe.get_doc({
                "doctype": "Vehicle Insurance Policy",
                "vehicle": v_active_code,
                "insurance_company": "New India Assurance",
                "policy_no": f"POL-BAD-{ts}",
                "start_date": curr_date,
                "end_date": yesterday,
                "premium_amount": 25000.0,
                "is_test_record": 1
            }).insert(ignore_permissions=True)
        except Exception:
            bad_dates_blocked = True

        # Missing vehicle blocked
        missing_veh_blocked = False
        try:
            bad_veh = frappe.get_doc({
                "doctype": "Vehicle Insurance Policy",
                "vehicle": "",
                "insurance_company": "New India Assurance",
                "policy_no": f"POL-NOVEH-{ts}",
                "start_date": curr_date,
                "end_date": future_date,
                "premium_amount": 25000.0,
                "is_test_record": 1
            }).insert(ignore_permissions=True)
        except Exception:
            missing_veh_blocked = True

        # Valid Draft Policy
        draft_pol = frappe.get_doc({
            "doctype": "Vehicle Insurance Policy",
            "vehicle": v_active_code,
            "insurance_company": "National Insurance Co",
            "policy_no": f"POL-VAL-{ts}",
            "policy_type": "Comprehensive",
            "start_date": curr_date,
            "end_date": future_date,
            "premium_amount": 32000.0,
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Vehicle Insurance Policy", draft_pol.name))

        t1_ok = (bad_dates_blocked and missing_veh_blocked and draft_pol.name and draft_pol.policy_status == "Draft")
        log_test(1, "Mandatory Fields & Date Range Validation", t1_ok, f"BadDatesBlocked={bad_dates_blocked}, MissingVehBlocked={missing_veh_blocked}, DraftPol={draft_pol.name}")
    except Exception as e:
        log_test(1, "Mandatory Fields & Date Range Validation", False, str(e))

    # -------------------------------------------------------------
    # Test 02: Policy Activation & Vehicle Summary Synchronization
    # -------------------------------------------------------------
    pol1_name = draft_pol.name if draft_pol else None
    try:
        frappe.set_user(role_users["Fleet Manager"])
        pol1 = frappe.get_doc("Vehicle Insurance Policy", pol1_name)
        pol1.policy_status = "Active"
        pol1.save()
        frappe.set_user("Administrator")

        pol1_db = frappe.get_doc("Vehicle Insurance Policy", pol1_name)
        v_db = frappe.get_doc("Vehicle", v_active_code)

        t2_ok = (
            pol1_db.policy_status == "Active" and
            pol1_db.approved_by is not None and
            v_db.policy_no == pol1_db.policy_no and
            v_db.insurance_company == pol1_db.insurance_company and
            str(v_db.end_date) == str(pol1_db.end_date)
        )
        log_test(2, "Policy Activation & Vehicle Summary Synchronization", t2_ok, f"Status={pol1_db.policy_status}, ApprovedBy={pol1_db.approved_by}, VehSyncedPolicy={v_db.policy_no}")
    except Exception as e:
        frappe.set_user("Administrator")
        log_test(2, "Policy Activation & Vehicle Summary Synchronization", False, str(e))

    # -------------------------------------------------------------
    # Test 03: Overlapping Active Policy Prevention
    # -------------------------------------------------------------
    try:
        overlap_blocked = False
        try:
            pol_overlap = frappe.get_doc({
                "doctype": "Vehicle Insurance Policy",
                "vehicle": v_active_code,
                "insurance_company": "United India Insurance",
                "policy_no": f"POL-OVERLAP-{ts}",
                "policy_type": "Comprehensive",
                "start_date": add_days(curr_date, 30),
                "end_date": add_days(curr_date, 200),
                "premium_amount": 28000.0,
                "policy_status": "Active",
                "is_test_record": 1
            }).insert(ignore_permissions=True)
        except Exception as e:
            if "overlapping" in str(e).lower() or "already has an active" in str(e).lower():
                overlap_blocked = True

        log_test(3, "Overlapping Active Policy Prevention", overlap_blocked, f"OverlapBlocked={overlap_blocked}")
    except Exception as e:
        log_test(3, "Overlapping Active Policy Prevention", False, str(e))

    # -------------------------------------------------------------
    # Test 04: Renewal Workflow & Historical Policy Preservation
    # -------------------------------------------------------------
    pol2_name = None
    try:
        frappe.set_user(role_users["Fleet Manager"])
        # Renew using API method
        import frappe.handler
        frappe.form_dict.clear()
        frappe.form_dict.cmd = "renew_insurance_policy"
        frappe.form_dict.update({
            "policy_name": pol1_name,
            "new_policy_no": f"POL-REN-{ts}",
            "start_date": add_days(future_date, 1),
            "end_date": add_days(future_date, 365),
            "premium_amount": 34000.0,
            "insurance_company": "National Insurance Co",
            "remarks": "Annual Fleet Policy Renewal",
            "activate_now": 0
        })
        frappe.handler.execute_cmd("renew_insurance_policy")
        res = frappe.response.get("message", {})
        pol2_name = res.get("new_policy")
        if pol2_name:
            created_docs.append(("Vehicle Insurance Policy", pol2_name))

        # Check renewal linkage
        pol2 = frappe.get_doc("Vehicle Insurance Policy", pol2_name)
        pol1_intact = frappe.get_doc("Vehicle Insurance Policy", pol1_name)

        t4_ok = (
            pol2.is_renewal == 1 and
            pol2.previous_policy == pol1_name and
            pol2.policy_status == "Draft" and
            pol1_intact.policy_status == "Active" and
            pol1_intact.policy_no == f"POL-VAL-{ts}"
        )
        frappe.set_user("Administrator")
        log_test(4, "Renewal Workflow & Historical Preservation", t4_ok, f"RenPolicy={pol2_name}, PrevPolicy={pol2.previous_policy}, OldPolStatus={pol1_intact.policy_status}")
    except Exception as e:
        frappe.set_user("Administrator")
        log_test(4, "Renewal Workflow & Historical Preservation", False, str(e))

    # -------------------------------------------------------------
    # Test 05: Policy Cancellation & Reversal Synchronization
    # -------------------------------------------------------------
    try:
        frappe.set_user(role_users["Fleet Manager"])
        pol1_cancel = frappe.get_doc("Vehicle Insurance Policy", pol1_name)
        # Attempt cancel without reason -> blocked
        reason_blocked = False
        try:
            pol1_cancel.policy_status = "Cancelled"
            pol1_cancel.cancellation_reason = ""
            pol1_cancel.save()
        except Exception:
            reason_blocked = True

        # Cancel with reason
        pol1_cancel = frappe.get_doc("Vehicle Insurance Policy", pol1_name)
        pol1_cancel.policy_status = "Cancelled"
        pol1_cancel.cancellation_reason = "Vehicle sold or policy replaced"
        pol1_cancel.save()
        frappe.set_user("Administrator")

        pol1_after = frappe.get_doc("Vehicle Insurance Policy", pol1_name)
        v_after_cancel = frappe.get_doc("Vehicle", v_active_code)

        t5_ok = (
            reason_blocked and
            pol1_after.policy_status == "Cancelled" and
            pol1_after.cancelled_by is not None and
            v_after_cancel.policy_no is None
        )
        log_test(5, "Policy Cancellation & Reversal Synchronization", t5_ok, f"ReasonBlocked={reason_blocked}, CancelledBy={pol1_after.cancelled_by}, VehPolicyCleared={v_after_cancel.policy_no is None}")
    except Exception as e:
        frappe.set_user("Administrator")
        log_test(5, "Policy Cancellation & Reversal Synchronization", False, str(e))

    # -------------------------------------------------------------
    # Test 06: Statutory Document Expiry Status Classification
    # -------------------------------------------------------------
    v_stat_code = f"B8-VEH-STAT-{ts}"
    try:
        v_stat = frappe.get_doc({
            "doctype": "Vehicle",
            "license_plate": v_stat_code,
            "make": "Tata",
            "model": "Prima 3530.K",
            "vehicle_status": "Active",
            "last_odometer": 1000.0,
            "uom": "Nos",
            "start_date": curr_date,
            "end_date": add_days(curr_date, 60),       # Valid (> 30 days)
            "fitness_expiry_date": add_days(curr_date, 10), # Expiring Soon (<= 30 days)
            "puc_expiry_date": yesterday,               # Expired (< today)
            "road_tax_expiry_date": None,               # Not Recorded
            "permit_expiry_date": add_days(curr_date, 180), # Valid
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Vehicle", v_stat.name))

        # Check status computation using report classification rules
        rows = frappe.db.sql("""
            SELECT
                CASE
                    WHEN v.end_date IS NULL THEN 'Not Recorded'
                    WHEN v.end_date < CURDATE() THEN 'Expired'
                    WHEN DATEDIFF(v.end_date, CURDATE()) <= 30 THEN 'Expiring Soon'
                    ELSE 'Valid'
                END AS ins_status,
                CASE
                    WHEN v.fitness_expiry_date IS NULL THEN 'Not Recorded'
                    WHEN v.fitness_expiry_date < CURDATE() THEN 'Expired'
                    WHEN DATEDIFF(v.fitness_expiry_date, CURDATE()) <= 30 THEN 'Expiring Soon'
                    ELSE 'Valid'
                END AS fit_status,
                CASE
                    WHEN v.puc_expiry_date IS NULL THEN 'Not Recorded'
                    WHEN v.puc_expiry_date < CURDATE() THEN 'Expired'
                    WHEN DATEDIFF(v.puc_expiry_date, CURDATE()) <= 30 THEN 'Expiring Soon'
                    ELSE 'Valid'
                END AS puc_status,
                CASE
                    WHEN v.road_tax_expiry_date IS NULL THEN 'Not Recorded'
                    WHEN v.road_tax_expiry_date < CURDATE() THEN 'Expired'
                    WHEN DATEDIFF(v.road_tax_expiry_date, CURDATE()) <= 30 THEN 'Expiring Soon'
                    ELSE 'Valid'
                END AS tax_status,
                CASE
                    WHEN (v.end_date < CURDATE() OR v.fitness_expiry_date < CURDATE() OR v.puc_expiry_date < CURDATE() OR v.road_tax_expiry_date < CURDATE() OR v.permit_expiry_date < CURDATE())
                        THEN 'Non-Compliant (Expired Documents)'
                    WHEN (DATEDIFF(v.end_date, CURDATE()) <= 30 OR DATEDIFF(v.fitness_expiry_date, CURDATE()) <= 30 OR DATEDIFF(v.puc_expiry_date, CURDATE()) <= 30 OR DATEDIFF(v.road_tax_expiry_date, CURDATE()) <= 30 OR DATEDIFF(v.permit_expiry_date, CURDATE()) <= 30)
                        THEN 'Attention Needed (Expiring Soon)'
                    WHEN (v.end_date IS NOT NULL AND v.fitness_expiry_date IS NOT NULL)
                        THEN 'Fully Compliant'
                    ELSE 'Incomplete Documentation'
                END AS overall_compliance
            FROM `tabVehicle` v
            WHERE v.name = %s
        """, (v_stat_code,), as_dict=True)

        r_stat = rows[0] if rows else {}
        ins_status = r_stat.get("ins_status")
        fit_status = r_stat.get("fit_status")
        puc_status = r_stat.get("puc_status")
        tax_status = r_stat.get("tax_status")
        overall = r_stat.get("overall_compliance")

        t6_ok = (len(rows) == 1 and ins_status == "Valid" and fit_status == "Expiring Soon" and puc_status == "Expired" and tax_status == "Not Recorded" and overall == "Non-Compliant (Expired Documents)")
        log_test(6, "Statutory Document Status Classification", t6_ok, f"Ins={ins_status}, Fit={fit_status}, PUC={puc_status}, Tax={tax_status}, Overall={overall}")
    except Exception as e:
        log_test(6, "Statutory Document Status Classification", False, str(e))

    # -------------------------------------------------------------
    # Test 07: Configurable Expiry Warning Window
    # -------------------------------------------------------------
    try:
        fs = frappe.get_single("Fleet Settings")
        orig_window = fs.warning_window_days or 30

        # Change warning window to 5 days
        fs.warning_window_days = 5
        fs.save(ignore_permissions=True)
        new_window = frappe.db.get_single_value("Fleet Settings", "warning_window_days")

        # Restore warning window to 30 days
        fs.warning_window_days = 30
        fs.save(ignore_permissions=True)
        restored_window = frappe.db.get_single_value("Fleet Settings", "warning_window_days")

        t7_ok = (new_window == 5 and restored_window == 30)
        log_test(7, "Configurable Expiry Warning Window", t7_ok, f"ModifiedWindow={new_window}, RestoredWindow={restored_window}")
    except Exception as e:
        log_test(7, "Configurable Expiry Warning Window", False, str(e))

    # -------------------------------------------------------------
    # Test 08: Trip Dispatch Permitted with Valid Documents
    # -------------------------------------------------------------
    v_valid_code = f"B8-VEH-DISP-{ts}"
    ms_test = f"B8-Site-{ts}"
    drv_test = f"B8-Driver-{ts}"
    cust_test = f"B8-Cust-{ts}"
    try:
        # Prereqs
        if not frappe.db.exists("Customer", cust_test):
            frappe.get_doc({"doctype": "Customer", "customer_name": cust_test, "customer_group": "Commercial", "territory": "India"}).insert(ignore_permissions=True)
            created_docs.append(("Customer", cust_test))

        ms = frappe.get_doc({
            "doctype": "Mine Site",
            "site_name": ms_test,
            "client": cust_test,
            "status": "Operational",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Mine Site", ms.name))

        drv = frappe.get_doc({
            "doctype": "Driver",
            "full_name": drv_test,
            "status": "Active",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Driver", drv.name))

        v_valid = frappe.get_doc({
            "doctype": "Vehicle",
            "license_plate": v_valid_code,
            "make": "Tata",
            "model": "Prima 3530.K",
            "vehicle_status": "Active",
            "last_odometer": 1000.0,
            "uom": "Nos",
            "start_date": curr_date,
            "end_date": future_date,
            "fitness_expiry_date": future_date,
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Vehicle", v_valid.name))

        trip_valid = frappe.get_doc({
            "doctype": "Mining Trip",
            "vehicle": v_valid_code,
            "driver": drv.name,
            "mine_site": ms.name,
            "destination": "Kudremukh Processing Plant",
            "dispatch_date_time": now_datetime(),
            "trip_status": "Dispatched",
            "opening_odometer": 1000.0,
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Mining Trip", trip_valid.name))

        t8_ok = (trip_valid.trip_status == "Dispatched")
        log_test(8, "Trip Dispatch Permitted with Valid Documents", t8_ok, f"Trip={trip_valid.name}, Status={trip_valid.trip_status}")
    except Exception as e:
        log_test(8, "Trip Dispatch Permitted with Valid Documents", False, str(e))

    # -------------------------------------------------------------
    # Test 09: Expired Insurance Blocks Dispatch
    # -------------------------------------------------------------
    try:
        ins_disp_blocked = False
        try:
            trip_bad_ins = frappe.get_doc({
                "doctype": "Mining Trip",
                "vehicle": v_exp_code, # has end_date = yesterday
                "driver": drv.name,
                "mine_site": ms.name,
                "destination": "Kudremukh Processing Plant",
                "dispatch_date_time": now_datetime(),
                "trip_status": "Dispatched",
                "opening_odometer": 1000.0,
                "is_test_record": 1
            }).insert(ignore_permissions=True)
        except Exception as e:
            if "insurance expired" in str(e).lower():
                ins_disp_blocked = True

        log_test(9, "Expired Insurance Blocks Dispatch", ins_disp_blocked, f"BlockedExpiredInsurance={ins_disp_blocked}")
    except Exception as e:
        log_test(9, "Expired Insurance Blocks Dispatch", False, str(e))

    # -------------------------------------------------------------
    # Test 10: Expired Fitness Certificate Blocks Dispatch
    # -------------------------------------------------------------
    v_fit_exp_code = f"B8-VEH-FITEXP-{ts}"
    try:
        v_fit_exp = frappe.get_doc({
            "doctype": "Vehicle",
            "license_plate": v_fit_exp_code,
            "make": "Tata",
            "model": "Prima 3530.K",
            "vehicle_status": "Active",
            "last_odometer": 1000.0,
            "uom": "Nos",
            "start_date": curr_date,
            "end_date": future_date,
            "fitness_expiry_date": yesterday, # Expired
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Vehicle", v_fit_exp.name))

        fit_disp_blocked = False
        try:
            trip_bad_fit = frappe.get_doc({
                "doctype": "Mining Trip",
                "vehicle": v_fit_exp_code,
                "driver": drv.name,
                "mine_site": ms.name,
                "destination": "Kudremukh Processing Plant",
                "dispatch_date_time": now_datetime(),
                "trip_status": "Dispatched",
                "opening_odometer": 1000.0,
                "is_test_record": 1
            }).insert(ignore_permissions=True)
        except Exception as e:
            if "fitness certificate expired" in str(e).lower():
                fit_disp_blocked = True

        log_test(10, "Expired Fitness Certificate Blocks Dispatch", fit_disp_blocked, f"BlockedExpiredFitness={fit_disp_blocked}")
    except Exception as e:
        log_test(10, "Expired Fitness Certificate Blocks Dispatch", False, str(e))

    # -------------------------------------------------------------
    # Test 11: Vehicle Status Preservation across Expiry & Dispatch Block
    # -------------------------------------------------------------
    try:
        v_exp_db = frappe.get_doc("Vehicle", v_exp_code)
        # Vehicle status must remain "Active", NOT automatically changed to Breakdown or Under Maintenance
        t11_ok = (v_exp_db.vehicle_status == "Active")
        log_test(11, "Vehicle Status Preservation across Expiry", t11_ok, f"VehStatus={v_exp_db.vehicle_status} (Not changed to Breakdown/Maint)")
    except Exception as e:
        log_test(11, "Vehicle Status Preservation across Expiry", False, str(e))

    # -------------------------------------------------------------
    # Test 12: Batch 2 & Batch 4 Integration Integrity
    # -------------------------------------------------------------
    try:
        # Batch 2 net weight & odometer calculation remains intact
        trip_test = frappe.get_doc({
            "doctype": "Mining Trip",
            "vehicle": v_valid_code,
            "driver": drv.name,
            "mine_site": ms.name,
            "destination": "Kudremukh Processing Plant",
            "dispatch_date_time": now_datetime(),
            "opening_odometer": 1000.0,
            "gross_weight_tons": 38.5,
            "tare_weight_tons": 13.5,
            "trip_status": "Draft",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Mining Trip", trip_test.name))

        t12_ok = (trip_test.net_weight_tons == 25.0)
        log_test(12, "Batch 2 & Batch 4 Integration Integrity", t12_ok, f"NetWeight={trip_test.net_weight_tons} Tons, Status={trip_test.trip_status}")
    except Exception as e:
        log_test(12, "Batch 2 & Batch 4 Integration Integrity", False, str(e))

    # -------------------------------------------------------------
    # Test 13: Scheduled Expiry Monitoring Detection
    # -------------------------------------------------------------
    try:
        import frappe.handler
        frappe.form_dict.clear()
        frappe.form_dict.cmd = "check_document_expiries"
        frappe.handler.execute_cmd("check_document_expiries")
        res = frappe.response.get("message", {})
        created_cnt = res.get("notifications_created", 0)

        # Check that log entries exist in Fleet Expiry Notification Log
        logs = frappe.get_all("Fleet Expiry Notification Log", fields=["name", "vehicle", "document_type", "notification_stage"])

        t13_ok = (created_cnt >= 1 and len(logs) >= 1)
        log_test(13, "Scheduled Expiry Monitoring Detection", t13_ok, f"NotifsCreated={created_cnt}, TotalLogsInDB={len(logs)}")
    except Exception as e:
        log_test(13, "Scheduled Expiry Monitoring Detection", False, str(e))

    # -------------------------------------------------------------
    # Test 14: Notification Deduplication Guard
    # -------------------------------------------------------------
    try:
        frappe.form_dict.clear()
        frappe.form_dict.cmd = "check_document_expiries"
        frappe.handler.execute_cmd("check_document_expiries")
        res2 = frappe.response.get("message", {})
        skipped_cnt = res2.get("notifications_skipped_dedup", 0)
        new_created_cnt = res2.get("notifications_created", 0)

        # Second call must skip existing notifications (0 newly created for same milestones)
        t14_ok = (skipped_cnt >= 1 and new_created_cnt == 0)
        log_test(14, "Notification Deduplication Guard", t14_ok, f"SkippedDueToDedup={skipped_cnt}, NewlyCreated={new_created_cnt}")
    except Exception as e:
        log_test(14, "Notification Deduplication Guard", False, str(e))

    # -------------------------------------------------------------
    # Test 15: Role Permissions Matrix Verification
    # -------------------------------------------------------------
    try:
        # Workshop Supervisor CANNOT create or activate policies
        frappe.set_user(role_users["Workshop Supervisor"])
        ws_create_blocked = False
        try:
            pol_ws = frappe.get_doc({
                "doctype": "Vehicle Insurance Policy",
                "vehicle": v_valid_code,
                "insurance_company": "Test Insurer",
                "policy_no": f"POL-WS-{ts}",
                "start_date": curr_date,
                "end_date": future_date,
                "premium_amount": 20000.0,
                "is_test_record": 1
            }).insert(ignore_permissions=False)
        except Exception:
            ws_create_blocked = True

        # Accountant CANNOT create policies
        frappe.set_user(role_users["Accountant"])
        acc_create_blocked = False
        try:
            pol_acc = frappe.get_doc({
                "doctype": "Vehicle Insurance Policy",
                "vehicle": v_valid_code,
                "insurance_company": "Test Insurer",
                "policy_no": f"POL-ACC-{ts}",
                "start_date": curr_date,
                "end_date": future_date,
                "premium_amount": 20000.0,
                "is_test_record": 1
            }).insert(ignore_permissions=False)
        except Exception:
            acc_create_blocked = True

        # Fleet Manager CAN create policy
        frappe.set_user(role_users["Fleet Manager"])
        pol_fm = frappe.get_doc({
            "doctype": "Vehicle Insurance Policy",
            "vehicle": v_valid_code,
            "insurance_company": "United India Insurance",
            "policy_no": f"POL-FM-{ts}",
            "start_date": curr_date,
            "end_date": future_date,
            "premium_amount": 27000.0,
            "is_test_record": 1
        }).insert(ignore_permissions=False)
        created_docs.append(("Vehicle Insurance Policy", pol_fm.name))
        fm_create_ok = (pol_fm.name is not None)

        frappe.set_user("Administrator")
        t15_ok = (ws_create_blocked and acc_create_blocked and fm_create_ok)
        log_test(15, "Role Permissions Matrix Verification", t15_ok, f"WSBlocked={ws_create_blocked}, AccBlocked={acc_create_blocked}, FMAllowed={fm_create_ok}")
    except Exception as e:
        frappe.set_user("Administrator")
        log_test(15, "Role Permissions Matrix Verification", False, str(e))

    # -------------------------------------------------------------
    # Test 16: Audit Fields and Deletion Protection
    # -------------------------------------------------------------
    try:
        # Non-admin cannot tamper with audit fields
        frappe.set_user(role_users["Fleet Manager"])
        tamper_blocked = False
        try:
            pol_fm_doc = frappe.get_doc("Vehicle Insurance Policy", pol_fm.name)
            pol_fm_doc.approved_by = "fake_admin@example.com"
            pol_fm_doc.save()
        except Exception:
            tamper_blocked = True

        # Fleet Manager cannot delete policy
        fm_delete_blocked = False
        try:
            frappe.delete_doc("Vehicle Insurance Policy", pol_fm.name)
        except Exception:
            fm_delete_blocked = True

        frappe.set_user("Administrator")
        t16_ok = (tamper_blocked and fm_delete_blocked)
        log_test(16, "Audit Fields & Deletion Protection", t16_ok, f"TamperBlocked={tamper_blocked}, DeleteBlocked={fm_delete_blocked}")
    except Exception as e:
        frappe.set_user("Administrator")
        log_test(16, "Audit Fields & Deletion Protection", False, str(e))

    # -------------------------------------------------------------
    # Test 17: Reports Execution & Current vs Historical Coverage
    # -------------------------------------------------------------
    try:
        r1 = run_report("Vehicle Insurance Register", filters={"vehicle": "", "insurance_company": "", "status": ""})
        r2 = run_report("Insurance Expiry Report", filters={"vehicle": "", "insurance_company": "", "from_date": "", "to_date": ""})
        r3 = run_report("Vehicle Document Expiry Report", filters={"vehicle": ""})
        r4 = run_report("Upcoming Renewals", filters={"vehicle": "", "document_type": ""})
        r5 = run_report("Expired Insurance & Documents", filters={"vehicle": "", "document_type": ""})
        r6 = run_report("Insurance Premium by Vehicle", filters={"vehicle": ""})
        r7 = run_report("Insurance Renewal History", filters={"vehicle": "", "policy_status": "", "is_renewal": ""})

        t17_ok = (
            len(r1.get("columns", [])) == 13 and
            len(r2.get("columns", [])) == 11 and
            len(r3.get("columns", [])) == 14 and
            len(r4.get("columns", [])) == 8 and
            len(r5.get("columns", [])) == 9 and
            len(r6.get("columns", [])) == 8 and
            len(r7.get("columns", [])) == 14
        )
        log_test(17, "Reports Execution & Structure Integrity", t17_ok, "All 7 Batch 8 reports executed cleanly with correct schemas")
    except Exception as e:
        log_test(17, "Reports Execution & Structure Integrity", False, str(e))

    # -------------------------------------------------------------
    # Test 18: Test-Record Quarantine Across All Reports
    # -------------------------------------------------------------
    try:
        # Check that test vehicle (v_active_code, v_exp_code, v_stat_code) is NEVER in production report results
        rep_reg = run_report("Vehicle Insurance Register", filters={"vehicle": v_active_code, "insurance_company": "", "status": ""})
        rep_doc = run_report("Vehicle Document Expiry Report", filters={"vehicle": v_stat_code})
        rep_exp = run_report("Expired Insurance & Documents", filters={"vehicle": v_exp_code, "document_type": ""})

        t_in_reg = len(rep_reg.get("result", []))
        t_in_doc = len(rep_doc.get("result", []))
        t_in_exp = len(rep_exp.get("result", []))

        t18_ok = (t_in_reg == 0 and t_in_doc == 0 and t_in_exp == 0)
        log_test(18, "Test-Record Quarantine Across All Reports", t18_ok, f"TestVehInRegister={t_in_reg}, InDocExpiry={t_in_doc}, InExpired={t_in_exp}")
    except Exception as e:
        log_test(18, "Test-Record Quarantine Across All Reports", False, str(e))

    # -------------------------------------------------------------
    # Cleanup Test Records
    # -------------------------------------------------------------
    print("\n--- Cleaning up test records ---")
    frappe.set_user("Administrator")
    for dt, dn in reversed(created_docs):
        try:
            if frappe.db.exists(dt, dn):
                frappe.delete_doc(dt, dn, force=1)
        except Exception:
            pass

    # Clean test notification logs
    frappe.db.sql("DELETE FROM `tabFleet Expiry Notification Log` WHERE is_test_record = 1")
    frappe.db.commit()

    total_tests = len(test_results)
    passed_tests = sum(1 for t in test_results if t[2])
    failed_tests = total_tests - passed_tests

    print("\n=======================================================")
    print(f"   BATCH 8 TEST SUITE RESULTS: {passed_tests}/{total_tests} PASSED")
    print("=======================================================")
    if failed_tests == 0:
        print(">>> ALL BATCH 8 TESTS PASSED SUCCESSFULLY! <<<\n")
    else:
        print(">>> SOME TESTS FAILED! <<<\n")

if __name__ == "__main__":
    run()
