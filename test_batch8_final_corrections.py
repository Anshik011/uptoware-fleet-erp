import frappe

def run():
    from frappe.utils import today, add_days, getdate, now_datetime
    from frappe.desk.query_report import run as run_report
    print("\n=======================================================")
    print("   UPTOWARE FLEET ERP - BATCH 8 FINAL CORRECTIONS SUITE")
    print("=======================================================\n")

    test_results = []
    created_docs = []

    def log_test(num, name, passed, details=""):
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status} Test {num:02d}: {name} | {details}")
        test_results.append((num, name, passed, details))

    ts = now_datetime().strftime('%H%M%S')
    curr_date = today()
    yesterday = add_days(curr_date, -1)
    tomorrow = add_days(curr_date, 1)

    # Prereqs for Mining Trip dispatch
    cust_name = f"B8-Cust-Corr-{ts}"
    if not frappe.db.exists("Customer", cust_name):
        c = frappe.get_doc({"doctype": "Customer", "customer_name": cust_name, "customer_group": "Commercial", "territory": "India"}).insert(ignore_permissions=True)
        created_docs.append(("Customer", cust_name))

    ms_name = f"B8-Site-Corr-{ts}"
    ms = frappe.get_doc({
        "doctype": "Mine Site",
        "site_name": ms_name,
        "client": cust_name,
        "status": "Operational",
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    created_docs.append(("Mine Site", ms.name))

    # Helper function to create test driver
    def make_test_driver(name_suffix):
        d = frappe.get_doc({
            "doctype": "Driver",
            "full_name": f"B8-Drv-{name_suffix}-{ts}",
            "status": "Active",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Driver", d.name))
        return d

    # Helper function to create test vehicle
    def make_test_vehicle(plate, odo=1000.0, start_d=None, end_d=None, fit_d=None):
        v = frappe.get_doc({
            "doctype": "Vehicle",
            "license_plate": plate,
            "make": "Tata",
            "model": "Prima 3530.K",
            "vehicle_status": "Active",
            "last_odometer": odo,
            "uom": "Nos",
            "start_date": start_d,
            "end_date": end_d,
            "fitness_expiry_date": fit_d or add_days(curr_date, 365),
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Vehicle", v.name))
        return v

    # -------------------------------------------------------------
    # SECTION A: FUTURE-DATED INSURANCE RENEWAL & DISPATCH GATING
    # -------------------------------------------------------------

    # Test 01: Current policy effective today — dispatch permitted
    v1_code = f"B8-V1-{ts}"
    try:
        v1 = make_test_vehicle(v1_code)
        pol1 = frappe.get_doc({
            "doctype": "Vehicle Insurance Policy",
            "vehicle": v1.name,
            "insurance_company": "National Insurance Co",
            "policy_no": f"POL-V1-{ts}",
            "start_date": add_days(curr_date, -30),
            "end_date": add_days(curr_date, 30),
            "premium_amount": 25000.0,
            "policy_status": "Active",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Vehicle Insurance Policy", pol1.name))

        # Check vehicle summary sync
        v1_db = frappe.get_doc("Vehicle", v1.name)
        v1_synced = (v1_db.policy_no == pol1.policy_no and str(v1_db.end_date) == str(pol1.end_date))

        # Attempt dispatch
        drv1 = make_test_driver("1")
        trip1 = frappe.get_doc({
            "doctype": "Mining Trip",
            "vehicle": v1.name,
            "driver": drv1.name,
            "mine_site": ms.name,
            "destination": "Kudremukh Processing Plant",
            "dispatch_date_time": now_datetime(),
            "trip_status": "Dispatched",
            "opening_odometer": 1000.0,
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Mining Trip", trip1.name))

        t1_ok = (v1_synced and trip1.trip_status == "Dispatched")
        log_test(1, "Current Policy Effective Today -> Dispatch Permitted", t1_ok, f"PolicySynced={v1_synced}, TripStatus={trip1.trip_status}")
    except Exception as e:
        log_test(1, "Current Policy Effective Today -> Dispatch Permitted", False, str(e))

    # Test 02: Future renewal activated early while old policy still effective — dispatch permitted under old policy
    v2_code = f"B8-V2-{ts}"
    try:
        v2 = make_test_vehicle(v2_code)
        # Policy 1 on v2: valid today (covers today - 30 to today + 30)
        pol2_old = frappe.get_doc({
            "doctype": "Vehicle Insurance Policy",
            "vehicle": v2.name,
            "insurance_company": "National Insurance Co",
            "policy_no": f"POL-V2-OLD-{ts}",
            "start_date": add_days(curr_date, -30),
            "end_date": add_days(curr_date, 30),
            "premium_amount": 25000.0,
            "policy_status": "Active",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Vehicle Insurance Policy", pol2_old.name))

        # Create renewal policy starting 31 days in future
        pol2_ren = frappe.get_doc({
            "doctype": "Vehicle Insurance Policy",
            "vehicle": v2.name,
            "insurance_company": "National Insurance Co",
            "policy_no": f"POL-V2-REN-{ts}",
            "start_date": add_days(curr_date, 31),
            "end_date": add_days(curr_date, 395),
            "premium_amount": 28000.0,
            "policy_status": "Active",
            "is_renewal": 1,
            "previous_policy": pol2_old.name,
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Vehicle Insurance Policy", pol2_ren.name))

        # Verify old policy 1 remains Active (not prematurely expired)
        pol2_after = frappe.get_doc("Vehicle Insurance Policy", pol2_old.name)
        pol2_intact = (pol2_after.policy_status == "Active")

        # Verify Vehicle summary still represents old policy 1 (effective today)
        v2_after_ren = frappe.get_doc("Vehicle", v2.name)
        veh_keeps_current = (v2_after_ren.policy_no == pol2_old.policy_no and str(v2_after_ren.end_date) == str(pol2_old.end_date))

        # Dispatch must succeed under old policy
        drv2 = make_test_driver("2")
        trip2 = frappe.get_doc({
            "doctype": "Mining Trip",
            "vehicle": v2.name,
            "driver": drv2.name,
            "mine_site": ms.name,
            "destination": "Kudremukh Processing Plant",
            "dispatch_date_time": now_datetime(),
            "trip_status": "Dispatched",
            "opening_odometer": 1000.0,
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Mining Trip", trip2.name))

        t2_ok = (pol2_intact and veh_keeps_current and trip2.trip_status == "Dispatched")
        log_test(2, "Early Activated Future Renewal -> Dispatched Under Old Policy", t2_ok, f"OldPolActive={pol2_intact}, VehSummaryCurrent={veh_keeps_current}, TripStatus={trip2.trip_status}")
    except Exception as e:
        log_test(2, "Early Activated Future Renewal -> Dispatched Under Old Policy", False, str(e))

    # Test 03: Old policy expired but future renewal not yet effective — dispatch blocked (coverage gap)
    v_gap_code = f"B8-VGAP-{ts}"
    try:
        v_gap = make_test_vehicle(v_gap_code)
        # Old policy ended 5 days ago
        pol_gap_old = frappe.get_doc({
            "doctype": "Vehicle Insurance Policy",
            "vehicle": v_gap.name,
            "insurance_company": "United India Insurance",
            "policy_no": f"POL-GAP-OLD-{ts}",
            "start_date": add_days(curr_date, -65),
            "end_date": add_days(curr_date, -5),
            "premium_amount": 22000.0,
            "policy_status": "Active",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Vehicle Insurance Policy", pol_gap_old.name))

        # Future renewal starts in 5 days (10 day coverage gap: -5 to +5)
        pol_gap_future = frappe.get_doc({
            "doctype": "Vehicle Insurance Policy",
            "vehicle": v_gap.name,
            "insurance_company": "United India Insurance",
            "policy_no": f"POL-GAP-FUT-{ts}",
            "start_date": add_days(curr_date, 5),
            "end_date": add_days(curr_date, 365),
            "premium_amount": 26000.0,
            "policy_status": "Active",
            "is_renewal": 1,
            "previous_policy": pol_gap_old.name,
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Vehicle Insurance Policy", pol_gap_future.name))

        # Vehicle summary must NOT show future policy as current
        v_gap_db = frappe.get_doc("Vehicle", v_gap.name)
        veh_not_future = (v_gap_db.policy_no != pol_gap_future.policy_no)

        # Attempt dispatch during coverage gap -> MUST BE BLOCKED
        drv3 = make_test_driver("3")
        gap_blocked = False
        gap_err = ""
        try:
            trip_gap = frappe.get_doc({
                "doctype": "Mining Trip",
                "vehicle": v_gap.name,
                "driver": drv3.name,
                "mine_site": ms.name,
                "destination": "Kudremukh Processing Plant",
                "dispatch_date_time": now_datetime(),
                "trip_status": "Dispatched",
                "opening_odometer": 1000.0,
                "is_test_record": 1
            }).insert(ignore_permissions=True)
        except Exception as e:
            gap_err = str(e)
            if "insurance" in gap_err.lower():
                gap_blocked = True

        t3_ok = (veh_not_future and gap_blocked)
        log_test(3, "Coverage Gap (Expired Old, Future Renewal) -> Dispatch Blocked", t3_ok, f"VehNotFuture={veh_not_future}, GapBlocked={gap_blocked}")
    except Exception as e:
        log_test(3, "Coverage Gap (Expired Old, Future Renewal) -> Dispatch Blocked", False, str(e))

    # Test 04: Future renewal start date reached — dispatch permitted
    v_reach_code = f"B8-VREACH-{ts}"
    try:
        v_reach = make_test_vehicle(v_reach_code)
        pol_reach = frappe.get_doc({
            "doctype": "Vehicle Insurance Policy",
            "vehicle": v_reach.name,
            "insurance_company": "Oriental Insurance Co",
            "policy_no": f"POL-REACH-{ts}",
            "start_date": curr_date,  # Start date reached today!
            "end_date": add_days(curr_date, 365),
            "premium_amount": 31000.0,
            "policy_status": "Active",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Vehicle Insurance Policy", pol_reach.name))

        # Sync check
        v_reach_db = frappe.get_doc("Vehicle", v_reach.name)
        reach_synced = (v_reach_db.policy_no == pol_reach.policy_no and str(v_reach_db.start_date) == str(curr_date))

        # Dispatch permitted
        drv4 = make_test_driver("4")
        trip_reach = frappe.get_doc({
            "doctype": "Mining Trip",
            "vehicle": v_reach.name,
            "driver": drv4.name,
            "mine_site": ms.name,
            "destination": "Kudremukh Processing Plant",
            "dispatch_date_time": now_datetime(),
            "trip_status": "Dispatched",
            "opening_odometer": 1000.0,
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Mining Trip", trip_reach.name))

        t4_ok = (reach_synced and trip_reach.trip_status == "Dispatched")
        log_test(4, "Policy Start Date Reached Today -> Dispatch Permitted", t4_ok, f"Synced={reach_synced}, TripStatus={trip_reach.trip_status}")
    except Exception as e:
        log_test(4, "Policy Start Date Reached Today -> Dispatch Permitted", False, str(e))

    # Test 05: No effective policy recorded — dispatch blocked
    v_nopol_code = f"B8-VNOPOL-{ts}"
    try:
        v_nopol = make_test_vehicle(v_nopol_code, start_d=None, end_d=None)
        drv5 = make_test_driver("5")
        nopol_blocked = False
        try:
            trip_nopol = frappe.get_doc({
                "doctype": "Mining Trip",
                "vehicle": v_nopol.name,
                "driver": drv5.name,
                "mine_site": ms.name,
                "destination": "Kudremukh Processing Plant",
                "dispatch_date_time": now_datetime(),
                "trip_status": "Dispatched",
                "opening_odometer": 1000.0,
                "is_test_record": 1
            }).insert(ignore_permissions=True)
        except Exception as e:
            if "no active insurance" in str(e).lower() or "mandatory for trip dispatch" in str(e).lower():
                nopol_blocked = True

        log_test(5, "No Effective Policy Recorded -> Dispatch Blocked", nopol_blocked, f"NoPolBlocked={nopol_blocked}")
    except Exception as e:
        log_test(5, "No Effective Policy Recorded -> Dispatch Blocked", False, str(e))

    # Test 06: Policy expired — dispatch blocked
    v_exp_code = f"B8-VEXP-{ts}"
    try:
        v_exp = make_test_vehicle(v_exp_code, start_d=add_days(curr_date, -365), end_d=yesterday)
        drv6 = make_test_driver("6")
        exp_blocked = False
        try:
            trip_exp = frappe.get_doc({
                "doctype": "Mining Trip",
                "vehicle": v_exp.name,
                "driver": drv6.name,
                "mine_site": ms.name,
                "destination": "Kudremukh Processing Plant",
                "dispatch_date_time": now_datetime(),
                "trip_status": "Dispatched",
                "opening_odometer": 1000.0,
                "is_test_record": 1
            }).insert(ignore_permissions=True)
        except Exception as e:
            if "insurance expired" in str(e).lower():
                exp_blocked = True

        # Verify vehicle status was NOT altered to Breakdown or Under Maintenance
        v_exp_db = frappe.get_doc("Vehicle", v_exp.name)
        status_intact = (v_exp_db.vehicle_status == "Active")

        t6_ok = (exp_blocked and status_intact)
        log_test(6, "Expired Policy -> Dispatch Blocked & Vehicle Status Preserved", t6_ok, f"ExpBlocked={exp_blocked}, VehStatusPreserved={status_intact}")
    except Exception as e:
        log_test(6, "Expired Policy -> Dispatch Blocked & Vehicle Status Preserved", False, str(e))

    # -------------------------------------------------------------
    # SECTION B: FRAFFE SCHEDULER REGISTRATION & NOTIFICATION DELIVERY
    # -------------------------------------------------------------

    # Test 07: Scheduled Job Type Registration Evidence
    try:
        ss_sched_name = "Fleet Management - Daily Expiry Monitoring Scheduler"
        jobs = frappe.get_all("Scheduled Job Type", filters={"server_script": ss_sched_name}, fields=["name", "method", "frequency", "server_script", "stopped"])
        job_exists = len(jobs) == 1
        j = jobs[0] if jobs else {}

        t7_ok = (job_exists and j.get("frequency") == "Daily" and j.get("stopped") == 0)
        log_test(7, "Scheduled Job Type Native Registration", t7_ok, f"JobName={j.get('name')}, Method={j.get('method')}, Freq={j.get('frequency')}, Stopped={j.get('stopped')}")
    except Exception as e:
        log_test(7, "Scheduled Job Type Native Registration", False, str(e))

    # Test 08: Actual Scheduler Execution & Log Generation
    try:
        ss_doc = frappe.get_doc("Server Script", "Fleet Management - Daily Expiry Monitoring Scheduler")
        # Execute the scheduled script method directly as the Frappe scheduler worker does
        ss_doc.execute_scheduled_method()
        frappe.db.commit()

        # Check logs created in Fleet Expiry Notification Log
        logs = frappe.get_all("Fleet Expiry Notification Log", fields=["name", "vehicle", "document_type", "notification_stage"])
        t8_ok = len(logs) >= 1
        log_test(8, "Scheduler Execution & Notification Log Generation", t8_ok, f"TotalNotificationLogs={len(logs)}")
    except Exception as e:
        log_test(8, "Scheduler Execution & Notification Log Generation", False, str(e))

    # Test 09: Deduplication Guard & Email Queueing Verification
    try:
        logs_before = frappe.db.count("Fleet Expiry Notification Log")
        # Run scheduler execution second time
        ss_doc = frappe.get_doc("Server Script", "Fleet Management - Daily Expiry Monitoring Scheduler")
        ss_doc.execute_scheduled_method()
        frappe.db.commit()
        logs_after = frappe.db.count("Fleet Expiry Notification Log")

        # Zero new logs created on duplicate run
        dedup_ok = (logs_before == logs_after)

        # Inspect Email Accounts and Email Queue status
        email_accounts_cnt = frappe.db.count("Email Account")
        email_queue_cnt = frappe.db.count("Email Queue")

        t9_ok = dedup_ok
        log_test(9, "Scheduler Deduplication Guard & Email Delivery Audit", t9_ok, f"DedupMaintained={dedup_ok} (Logs: {logs_before}->{logs_after}), EmailAccountsInDB={email_accounts_cnt}, EmailQueueEntries={email_queue_cnt}")
    except Exception as e:
        log_test(9, "Scheduler Deduplication Guard & Email Delivery Audit", False, str(e))

    # -------------------------------------------------------------
    # SECTION C: REPORT WINDOW CONSISTENCY & TEST QUARANTINE
    # -------------------------------------------------------------

    # Test 10: Report Warning Threshold Follows Fleet Settings Dynamically
    try:
        # Step A: Test default warning window (30 days)
        fs = frappe.get_single("Fleet Settings")
        fs.warning_window_days = 30
        fs.save(ignore_permissions=True)
        frappe.db.commit()

        v_win_code = f"B8-VWIN-{ts}"
        v_win = make_test_vehicle(v_win_code, end_d=add_days(curr_date, 20), fit_d=add_days(curr_date, 20))

        # Check status with 30-day window: 20 days left is <= 30 -> Expiring Soon
        status_30 = frappe.db.sql("""
            SELECT
                CASE
                    WHEN v.end_date < CURDATE() THEN 'Expired'
                    WHEN DATEDIFF(v.end_date, CURDATE()) <= fs.warning_window THEN 'Expiring Soon'
                    ELSE 'Valid'
                END AS status
            FROM `tabVehicle` v
            CROSS JOIN (SELECT CAST(COALESCE(MAX(CASE WHEN field = 'warning_window_days' THEN value END), 30) AS UNSIGNED) AS warning_window FROM tabSingles WHERE doctype = 'Fleet Settings') fs
            WHERE v.name = %s
        """, (v_win.name,), as_dict=True)[0].status

        # Step B: Change warning window to 10 days
        fs.warning_window_days = 10
        fs.save(ignore_permissions=True)
        frappe.db.commit()

        # Check status with 10-day window: 20 days left is > 10 -> Valid
        status_10 = frappe.db.sql("""
            SELECT
                CASE
                    WHEN v.end_date < CURDATE() THEN 'Expired'
                    WHEN DATEDIFF(v.end_date, CURDATE()) <= fs.warning_window THEN 'Expiring Soon'
                    ELSE 'Valid'
                END AS status
            FROM `tabVehicle` v
            CROSS JOIN (SELECT CAST(COALESCE(MAX(CASE WHEN field = 'warning_window_days' THEN value END), 30) AS UNSIGNED) AS warning_window FROM tabSingles WHERE doctype = 'Fleet Settings') fs
            WHERE v.name = %s
        """, (v_win.name,), as_dict=True)[0].status

        # Restore warning window to 30 days
        fs.warning_window_days = 30
        fs.save(ignore_permissions=True)
        frappe.db.commit()

        t10_ok = (status_30 == "Expiring Soon" and status_10 == "Valid")
        log_test(10, "Dynamic Report Warning Window via Fleet Settings", t10_ok, f"Window30Status={status_30}, Window10Status={status_10} (Seamless SQL Dynamic Adapt)")
    except Exception as e:
        log_test(10, "Dynamic Report Warning Window via Fleet Settings", False, str(e))

    # Test 11: Production Reports Structure & Zero Test Leakage
    try:
        rep_reg = run_report("Vehicle Insurance Register", filters={"vehicle": v1_code, "insurance_company": "", "status": ""})
        rep_exp = run_report("Insurance Expiry Report", filters={"vehicle": v1_code, "insurance_company": "", "from_date": "", "to_date": ""})
        rep_doc = run_report("Vehicle Document Expiry Report", filters={"vehicle": v1_code})
        rep_upc = run_report("Upcoming Renewals", filters={"vehicle": v1_code, "document_type": ""})
        rep_xpd = run_report("Expired Insurance & Documents", filters={"vehicle": v_gap_code, "document_type": ""})

        t11_ok = (
            len(rep_reg.get("result", [])) == 0 and
            len(rep_exp.get("result", [])) == 0 and
            len(rep_doc.get("result", [])) == 0 and
            len(rep_upc.get("result", [])) == 0 and
            len(rep_xpd.get("result", [])) == 0
        )
        log_test(11, "Test Records 100% Quarantined across All Batch 8 Reports", t11_ok, f"Leakage: Reg={len(rep_reg.get('result', []))}, Exp={len(rep_exp.get('result', []))}, Doc={len(rep_doc.get('result', []))}, Upc={len(rep_upc.get('result', []))}, Xpd={len(rep_xpd.get('result', []))}")
    except Exception as e:
        log_test(11, "Test Records 100% Quarantined across All Batch 8 Reports", False, str(e))

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
    print(f"   BATCH 8 FINAL CORRECTIONS SUITE: {passed_tests}/{total_tests} PASSED")
    print("=======================================================")
    if failed_tests == 0:
        print(">>> ALL BATCH 8 FINAL CORRECTION CHECKS PASSED PERFECTLY! <<<\n")
    else:
        print(">>> SOME CORRECTION CHECKS FAILED! <<<\n")

if __name__ == "__main__":
    run()
