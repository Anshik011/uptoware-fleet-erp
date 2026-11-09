import frappe
from frappe.utils import now_datetime, getdate, add_days, nowdate
import fleet_alert_dispatcher

def run_tests():
    frappe.init("frontend")
    frappe.connect()

    print("======================================================================")
    print("      UPTOWARE FLEET MANAGEMENT ERP — BATCH 11 TEST SUITE             ")
    print("      Alerts & Notifications Management Comprehensive Verification    ")
    print("======================================================================")

    results = []

    def log_result(test_num, name, passed, details=""):
        status = "PASS" if passed else "FAIL"
        symbol = "✅" if passed else "❌"
        results.append({"test_num": test_num, "name": name, "passed": passed, "details": details})
        print(f"[{status}] Test {test_num:02d}: {name} - {details} {symbol}")

    test_vehicle = "KA-19-EQ-1101"
    if not frappe.db.exists("Vehicle", test_vehicle):
        veh = frappe.new_doc("Vehicle")
        veh.license_plate = test_vehicle
        veh.vehicle_name = "Batch 11 Test Tipper"
        veh.make = "BharatBenz"
        veh.model = "3528CM"
        veh.vehicle_status = "Active"
        veh.is_test_record = 1
        veh.last_odometer = 50000
        veh.uom = "Nos"
        veh.fitness_expiry_date = add_days(today_val(), 180)
        veh.puc_expiry_date = add_days(today_val(), 10) # 10 days for scheduler milestone
        veh.road_tax_expiry_date = add_days(today_val(), 180)
        veh.permit_expiry_date = add_days(today_val(), 180)
        veh.save(ignore_permissions=True)
        frappe.db.commit()
    else:
        frappe.db.set_value("Vehicle", test_vehicle, {
            "vehicle_status": "Active",
            "fitness_expiry_date": add_days(today_val(), 180),
            "puc_expiry_date": add_days(today_val(), 10),
            "road_tax_expiry_date": add_days(today_val(), 180),
            "permit_expiry_date": add_days(today_val(), 180)
        }, update_modified=False)
        frappe.db.commit()

    test_driver = "HR-DRI-2026-00065"
    test_site = "Kudremukh North Pit"
    test_company = "Uptoware"
    test_customer = "NMDC Mining Corp (TEST)"
    test_supplier = "AutoMech Central Workshop"
    test_spare_item = "SP-HYD-SEAL-01"

    # Ensure test vehicle has active insurance covering today so dispatch validations pass
    if not frappe.db.exists("Vehicle Insurance Policy", {"vehicle": test_vehicle, "policy_status": "Active"}):
        init_pol = frappe.new_doc("Vehicle Insurance Policy")
        init_pol.vehicle = test_vehicle
        init_pol.insurance_company = "ICICI Lombard General Insurance"
        init_pol.policy_no = f"POL-INIT-B11-{frappe.utils.random_string(4)}"
        init_pol.start_date = today_val()
        init_pol.end_date = add_days(today_val(), 365)
        init_pol.policy_status = "Active"
        init_pol.premium_amount = 25000.0
        init_pol.is_test_record = 1
        init_pol.save(ignore_permissions=True)
        frappe.db.commit()

    # -------------------------------------------------------------------------
    # TEST 01: Fleet Settings Configuration & Defaults
    # -------------------------------------------------------------------------
    try:
        fs = frappe.get_doc("Fleet Settings")
        p1 = bool(fs.enable_fleet_notifications == 1 and fs.enable_in_app_notifications == 1 and fs.enable_email_notifications == 1)
        p2 = bool(fs.vehicle_driver_alert_role == "Fleet Manager" and fs.financial_alert_role == "Accountant")
        p3 = bool(float(fs.min_fuel_efficiency_kml) > 0 and int(fs.breakdown_escalation_hours) > 0)
        log_result(1, "Fleet Settings Configuration & Defaults", p1 and p2 and p3,
                   f"Enabled: {p1}, Roles: {p2}, Thresholds: {p3}")
    except Exception as e:
        log_result(1, "Fleet Settings Configuration & Defaults", False, str(e))

    # -------------------------------------------------------------------------
    # TEST 02: Central Fleet Alert Log Creation & Field Integrity
    # -------------------------------------------------------------------------
    created_alert_name = None
    try:
        alt_name = fleet_alert_dispatcher.create_fleet_alert(
            alert_title="TEST: Initial Verification Alert",
            alert_category="Vehicle & Driver",
            severity="High",
            source_doctype="Vehicle",
            source_name=test_vehicle,
            vehicle=test_vehicle,
            driver=test_driver,
            action_required="Inspect test vehicle",
            message="Initial automated test alert for Batch 11.",
            is_test_record=1
        )
        created_alert_name = alt_name
        doc = frappe.get_doc("Fleet Alert Log", alt_name)
        p1 = bool(doc.name.startswith("FLT-ALT-"))
        p2 = bool(doc.status == "Unread" and doc.severity == "High" and doc.recipient_role == "Fleet Manager")
        p3 = bool(doc.vehicle == test_vehicle and doc.driver == test_driver and doc.is_test_record == 1)
        log_result(2, "Fleet Alert Log Creation & Field Integrity", p1 and p2 and p3,
                   f"ID: {doc.name}, Status: {doc.status}, Role: {doc.recipient_role}")
    except Exception as e:
        log_result(2, "Fleet Alert Log Creation & Field Integrity", False, str(e))

    # -------------------------------------------------------------------------
    # TEST 03: Native In-App Notification Log Generation
    # -------------------------------------------------------------------------
    try:
        nl_exists = frappe.db.exists("Notification Log", {
            "document_type": "Fleet Alert Log",
            "document_name": created_alert_name
        })
        log_result(3, "Native In-App Notification Log Generation", bool(nl_exists),
                   f"Notification Log created: {nl_exists}")
    except Exception as e:
        log_result(3, "Native In-App Notification Log Generation", False, str(e))

    # -------------------------------------------------------------------------
    # TEST 04: Background Email Queue Generation & Missing SMTP Safety
    # -------------------------------------------------------------------------
    try:
        fresh_email_title = f"TEST: Email Queue Verification {frappe.utils.random_string(6)}"
        temp_alert_name = fleet_alert_dispatcher.create_fleet_alert(
            alert_title=fresh_email_title,
            alert_category="Vehicle & Driver",
            severity="Medium",
            source_doctype="Vehicle",
            source_name=test_vehicle,
            vehicle=test_vehicle,
            action_required="Check email queue",
            message="Testing email queue creation.",
            is_test_record=0
        )
        eq_record = frappe.db.get_value("Email Queue", {
            "reference_doctype": "Fleet Alert Log",
            "reference_name": temp_alert_name
        }, ["name", "status"], as_dict=True)
        
        passed = bool(eq_record and eq_record.status in ["Not Sent", "Sending", "Sent"])
        log_result(4, "Background Email Queue Generation & Safe Local SMTP", passed,
                   f"Email Queue Entry: {eq_record.get('name') if eq_record else 'None'} (Status: {eq_record.get('status') if eq_record else 'N/A'})")
        if eq_record:
            frappe.delete_doc("Email Queue", eq_record.name, ignore_permissions=True)
        frappe.delete_doc("Fleet Alert Log", temp_alert_name, ignore_permissions=True)
        frappe.db.commit()
    except Exception as e:
        log_result(4, "Background Email Queue Generation & Safe Local SMTP", False, str(e))

    # -------------------------------------------------------------------------
    # TEST 05: Duplicate Alert Prevention
    # -------------------------------------------------------------------------
    try:
        dup_attempt = fleet_alert_dispatcher.create_fleet_alert(
            alert_title="TEST: Initial Verification Alert",
            alert_category="Vehicle & Driver",
            severity="High",
            source_doctype="Vehicle",
            source_name=test_vehicle,
            vehicle=test_vehicle,
            is_test_record=1
        )
        count = frappe.db.count("Fleet Alert Log", {
            "source_doctype": "Vehicle",
            "source_name": test_vehicle,
            "alert_title": "TEST: Initial Verification Alert",
            "status": ["!=", "Resolved"]
        })
        passed = bool(dup_attempt == created_alert_name and count == 1)
        log_result(5, "Duplicate Alert Prevention", passed,
                   f"Returned existing: {dup_attempt == created_alert_name}, Record Count: {count}")
    except Exception as e:
        log_result(5, "Duplicate Alert Prevention", False, str(e))

    # -------------------------------------------------------------------------
    # TEST 06: Alert Acknowledgement & Auto-Audit Trail
    # -------------------------------------------------------------------------
    try:
        doc = frappe.get_doc("Fleet Alert Log", created_alert_name)
        doc.status = "Acknowledged"
        doc.save(ignore_permissions=True)
        frappe.db.commit()

        doc.reload()
        passed = bool(doc.status == "Acknowledged" and doc.acknowledged_by and doc.acknowledged_on)
        log_result(6, "Alert Acknowledgement & Auto-Audit Trail", passed,
                   f"Status: {doc.status}, Acknowledged By: {doc.acknowledged_by}, On: {doc.acknowledged_on}")
    except Exception as e:
        log_result(6, "Alert Acknowledgement & Auto-Audit Trail", False, str(e))

    # -------------------------------------------------------------------------
    # TEST 07: Alert Resolution & Historical Record Preservation
    # -------------------------------------------------------------------------
    try:
        resolved_count = fleet_alert_dispatcher.resolve_fleet_alert(
            source_doctype="Vehicle",
            source_name=test_vehicle,
            resolution_note="Test condition verified and resolved.",
            alert_title="TEST: Initial Verification Alert"
        )
        doc = frappe.get_doc("Fleet Alert Log", created_alert_name)
        passed = bool(resolved_count >= 1 and doc.status == "Resolved" and doc.resolved_by and doc.resolved_on)
        log_result(7, "Alert Resolution & History Preservation", passed,
                   f"Resolved count: {resolved_count}, Status: {doc.status}, Resolved By: {doc.resolved_by}")
    except Exception as e:
        log_result(7, "Alert Resolution & History Preservation", False, str(e))

    # -------------------------------------------------------------------------
    # TEST 08: Trip Operations Real-Time Alerts (Category B)
    # -------------------------------------------------------------------------
    try:
        trip_veh = f"KA-19-T-{frappe.utils.random_string(4)}"
        tv = frappe.new_doc("Vehicle")
        tv.license_plate = trip_veh
        tv.vehicle_name = "Trip Test Vehicle"
        tv.make = "BharatBenz"
        tv.model = "3528CM"
        tv.vehicle_status = "Active"
        tv.is_test_record = 1
        tv.last_odometer = 50000
        tv.uom = "Nos"
        tv.fitness_expiry_date = add_days(today_val(), 180)
        tv.puc_expiry_date = add_days(today_val(), 180)
        tv.road_tax_expiry_date = add_days(today_val(), 180)
        tv.permit_expiry_date = add_days(today_val(), 180)
        tv.save(ignore_permissions=True)

        t_pol = frappe.new_doc("Vehicle Insurance Policy")
        t_pol.vehicle = trip_veh
        t_pol.insurance_company = "ICICI Lombard General Insurance"
        t_pol.policy_no = f"POL-TRIP-{frappe.utils.random_string(4)}"
        t_pol.start_date = today_val()
        t_pol.end_date = add_days(today_val(), 365)
        t_pol.policy_status = "Active"
        t_pol.premium_amount = 25000.0
        t_pol.is_test_record = 1
        t_pol.save(ignore_permissions=True)

        td = frappe.new_doc("Driver")
        td.full_name = f"Trip Test Driver {frappe.utils.random_string(4)}"
        td.status = "Active"
        td.is_test_record = 1
        td.expiry_date = add_days(today_val(), 180)
        td.medical_fitness_expiry = add_days(today_val(), 180)
        td.insert(ignore_permissions=True)
        frappe.db.commit()
        trip_drv = td.name

        trip = frappe.get_doc({
            "doctype": "Mining Trip",
            "vehicle": trip_veh,
            "driver": trip_drv,
            "mine_site": test_site,
            "destination": "Jindal Steel Works",
            "material_type": "Iron Ore",
            "dispatch_date_time": now_datetime(),
            "opening_odometer": 50000,
            "is_test_record": 1
        })
        trip.insert(ignore_permissions=True)
        frappe.db.commit()

        from frappe.model.workflow import apply_workflow
        apply_workflow(trip, "Dispatch")
        frappe.db.commit()

        alt1 = frappe.db.exists("Fleet Alert Log", {
            "source_doctype": "Mining Trip",
            "source_name": trip.name,
            "alert_title": f"Trip Dispatched: {trip.name}"
        })

        # Transition to Weighbridge Confirmed
        trip.reload()
        trip.gross_weight_tons = 45.0
        trip.tare_weight_tons = 15.0
        trip.save(ignore_permissions=True)
        apply_workflow(trip, "Confirm Weighbridge")
        frappe.db.commit()

        alt2 = frappe.db.exists("Fleet Alert Log", {
            "source_doctype": "Mining Trip",
            "source_name": trip.name,
            "alert_title": f"Trip Awaiting Approval: {trip.name}"
        })

        # Transition to Approved & Delivered
        trip.reload()
        trip.closing_odometer = 50060
        trip.save(ignore_permissions=True)
        apply_workflow(trip, "Approve")
        frappe.db.commit()

        alt3 = frappe.db.exists("Fleet Alert Log", {
            "source_doctype": "Mining Trip",
            "source_name": trip.name,
            "alert_title": f"Trip Delivered: {trip.name}"
        })

        awaiting_resolved = frappe.db.get_value("Fleet Alert Log", {
            "source_doctype": "Mining Trip",
            "source_name": trip.name,
            "alert_title": f"Trip Awaiting Approval: {trip.name}"
        }, "status")

        passed = bool(alt1 and alt2 and alt3 and awaiting_resolved == "Resolved")
        log_result(8, "Trip Operations Real-Time Alerts (Category B)", passed,
                   f"Dispatched: {bool(alt1)}, Awaiting Approval: {bool(alt2)}, Delivered: {bool(alt3)}, Auto-resolved: {awaiting_resolved == 'Resolved'}")
    except Exception as e:
        log_result(8, "Trip Operations Real-Time Alerts (Category B)", False, str(e))

    # -------------------------------------------------------------------------
    # TEST 09: Maintenance & Workshop Real-Time Alerts (Category D)
    # -------------------------------------------------------------------------
    try:
        vb = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "vehicle": test_vehicle,
            "driver": test_driver,
            "mine_site": test_site,
            "breakdown_datetime": now_datetime(),
            "breakdown_type": "Engine",
            "severity": "Critical",
            "repair_status": "Reported",
            "workflow_state": "Reported",
            "description": "Engine overheating during hauling",
            "is_test_record": 1
        })
        vb.insert(ignore_permissions=True)
        frappe.db.commit()

        alt_rep = frappe.db.exists("Fleet Alert Log", {
            "source_doctype": "Vehicle Breakdown",
            "source_name": vb.name,
            "alert_title": f"Breakdown Reported: {test_vehicle}"
        })

        # Approve Breakdown (Fleet Manager)
        vb.workflow_state = "Approved"
        vb.repair_status = "Approved"
        vb.approved_by = "Administrator"
        vb.approved_on = now_datetime()
        vb.save(ignore_permissions=True)
        frappe.db.commit()

        # Move to In Workshop (Workshop Supervisor)
        vb.workflow_state = "In Workshop"
        vb.repair_status = "In Workshop"
        vb.assigned_workshop = test_supplier
        vb.save(ignore_permissions=True)
        frappe.db.commit()

        alt_ws = frappe.db.exists("Fleet Alert Log", {
            "source_doctype": "Vehicle Breakdown",
            "source_name": vb.name,
            "alert_title": f"Vehicle Sent to Workshop: {test_vehicle}"
        })

        # Move to Repaired
        vb.workflow_state = "Repaired"
        vb.repair_status = "Repaired"
        vb.downtime_hours = 6.5
        vb.total_repair_cost = 4500.0
        vb.save(ignore_permissions=True)
        frappe.db.commit()

        alt_comp = frappe.db.exists("Fleet Alert Log", {
            "source_doctype": "Vehicle Breakdown",
            "source_name": vb.name,
            "alert_title": f"Repair Completed: {test_vehicle}"
        })

        open_bds = frappe.db.count("Fleet Alert Log", {
            "source_doctype": "Vehicle Breakdown",
            "source_name": vb.name,
            "alert_title": f"Breakdown Reported: {test_vehicle}",
            "status": ["!=", "Resolved"]
        })

        passed = bool(alt_rep and alt_ws and alt_comp and open_bds == 0)
        log_result(9, "Maintenance Real-Time Alerts & Auto-Resolution (Category D)", passed,
                   f"Reported: {bool(alt_rep)}, In Workshop: {bool(alt_ws)}, Repaired: {bool(alt_comp)}, Auto-resolved: {open_bds == 0}")
    except Exception as e:
        log_result(9, "Maintenance Real-Time Alerts & Auto-Resolution (Category D)", False, str(e))

    # -------------------------------------------------------------------------
    # TEST 10: Fuel Alerts: Low Efficiency & Pending Approval (Category C)
    # -------------------------------------------------------------------------
    try:
        fl_base = frappe.get_doc({
            "doctype": "Fuel Log",
            "vehicle": test_vehicle,
            "fuel_date": add_days(today_val(), -1),
            "odometer_reading_km": 50000,
            "quantity_litres": 100.0,
            "rate_per_litre": 90.0,
            "total_fuel_cost": 9000.0,
            "is_full_tank": 1,
            "approval_status": "Approved",
            "is_test_record": 1
        })
        fl_base.insert(ignore_permissions=True)
        frappe.db.commit()

        # Second fuel log: 50150 km, 100 litres -> 150 km / 100 L = 1.5 KM/L (< 2.5 min threshold)
        fl = frappe.get_doc({
            "doctype": "Fuel Log",
            "vehicle": test_vehicle,
            "fuel_date": today_val(),
            "odometer_reading_km": 50150,
            "quantity_litres": 100.0,
            "rate_per_litre": 90.0,
            "total_fuel_cost": 9000.0,
            "is_full_tank": 1,
            "approval_status": "Draft",
            "is_test_record": 1
        })
        fl.insert(ignore_permissions=True)
        frappe.db.commit()

        alt_low_eff = frappe.db.exists("Fleet Alert Log", {
            "source_doctype": "Fuel Log",
            "source_name": fl.name,
            "alert_title": f"Low Fuel Efficiency Alert: {test_vehicle}"
        })

        alt_pend_app = frappe.db.exists("Fleet Alert Log", {
            "source_doctype": "Fuel Log",
            "source_name": fl.name,
            "alert_title": f"Fuel Approval Pending: {fl.name}"
        })

        passed = bool(alt_low_eff and alt_pend_app)
        log_result(10, "Fuel Alerts: Low Efficiency & Pending Approval (Category C)", passed,
                   f"Low Eff: {bool(alt_low_eff)}, Pending: {bool(alt_pend_app)}")
    except Exception as e:
        log_result(10, "Fuel Alerts: Low Efficiency & Pending Approval (Category C)", False, str(e))

    # -------------------------------------------------------------------------
    # TEST 11: Revenue & Financial Alerts: Invoice & Payment (Category H)
    # -------------------------------------------------------------------------
    try:
        item_code = "B9-HAUL-103726"
        si = frappe.new_doc("Sales Invoice")
        si.customer = test_customer
        si.company = test_company
        si.due_date = add_days(today_val(), 15)
        si.custom_is_test_record = 1
        si.custom_vehicle = test_vehicle
        si.append("items", {
            "item_code": item_code,
            "qty": 30,
            "rate": 500,
            "income_account": "Sales - U",
            "cost_center": "Main - U"
        })
        si.insert(ignore_permissions=True)
        si.submit()
        frappe.db.commit()

        alt_si = frappe.db.exists("Fleet Alert Log", {
            "source_doctype": "Sales Invoice",
            "source_name": si.name,
            "alert_title": f"Sales Invoice Submitted: {si.name}"
        })

        pe = frappe.new_doc("Payment Entry")
        pe.payment_type = "Receive"
        pe.party_type = "Customer"
        pe.party = test_customer
        pe.company = test_company
        pe.paid_amount = 15000.0
        pe.received_amount = 15000.0
        pe.paid_to = "Cash - U"
        pe.custom_is_test_record = 1
        pe.append("references", {
            "reference_doctype": "Sales Invoice",
            "reference_name": si.name,
            "allocated_amount": 15000.0
        })
        pe.insert(ignore_permissions=True)
        pe.submit()
        frappe.db.commit()

        alt_pe = frappe.db.exists("Fleet Alert Log", {
            "source_doctype": "Payment Entry",
            "source_name": pe.name,
            "alert_title": f"Customer Payment Received: {pe.name}"
        })

        passed = bool(alt_si and alt_pe)
        log_result(11, "Revenue & Financial Alerts: SI & PE (Category H)", passed,
                   f"Invoice Alert: {bool(alt_si)}, Payment Alert: {bool(alt_pe)}")
    except Exception as e:
        log_result(11, "Revenue & Financial Alerts: SI & PE (Category H)", False, str(e))

    # -------------------------------------------------------------------------
    # TEST 12: Inventory & Procurement Alerts (Category E & F)
    # -------------------------------------------------------------------------
    try:
        se = frappe.new_doc("Stock Entry")
        se.purpose = "Material Issue"
        se.stock_entry_type = "Material Issue"
        se.company = test_company
        se.custom_vehicle = test_vehicle
        se.append("items", {
            "item_code": test_spare_item,
            "s_warehouse": "Stores - U",
            "qty": 1,
            "expense_account": "Cost of Goods Sold - U",
            "cost_center": "Main - U"
        })
        se.insert(ignore_permissions=True)
        se.submit()
        frappe.db.commit()

        alt_se = frappe.db.exists("Fleet Alert Log", {
            "source_doctype": "Stock Entry",
            "source_name": se.name,
            "alert_title": f"Material Issue Completed: {se.name}"
        })

        po = frappe.new_doc("Purchase Order")
        po.supplier = test_supplier
        po.company = test_company
        po.schedule_date = add_days(today_val(), 7)
        po.custom_vehicle = test_vehicle
        po.custom_is_test_record = 1
        po.append("items", {
            "item_code": test_spare_item,
            "qty": 5,
            "rate": 450.0,
            "warehouse": "Stores - U",
            "schedule_date": add_days(today_val(), 7)
        })
        po.insert(ignore_permissions=True)
        po.submit()
        frappe.db.commit()

        alt_po = frappe.db.exists("Fleet Alert Log", {
            "source_doctype": "Purchase Order",
            "source_name": po.name,
            "alert_title": f"Purchase Order Submitted: {po.name}"
        })

        passed = bool(alt_se and alt_po)
        log_result(12, "Inventory & Procurement Alerts (Category E & F)", passed,
                   f"Material Issue Alert: {bool(alt_se)}, PO Alert: {bool(alt_po)}")
    except Exception as e:
        log_result(12, "Inventory & Procurement Alerts (Category E & F)", False, str(e))

    # -------------------------------------------------------------------------
    # TEST 13: Insurance Expiry & Policy Renewal Alerts (Category G)
    # -------------------------------------------------------------------------
    try:
        # Create a dedicated renewal policy vehicle with unique license plate
        pol_veh = f"KA-19-P-{frappe.utils.random_string(4)}"
        pv = frappe.new_doc("Vehicle")
        pv.license_plate = pol_veh
        pv.vehicle_name = "Renewal Policy Vehicle"
        pv.make = "BharatBenz"
        pv.model = "3528CM"
        pv.vehicle_status = "Active"
        pv.is_test_record = 1
        pv.last_odometer = 10000
        pv.uom = "Nos"
        pv.save(ignore_permissions=True)
        frappe.db.commit()

        vip = frappe.new_doc("Vehicle Insurance Policy")
        vip.vehicle = pol_veh
        vip.insurance_company = "ICICI Lombard General Insurance"
        vip.policy_no = f"POL-TEST-B11-{frappe.utils.random_string(4)}"
        vip.start_date = today_val()
        vip.end_date = add_days(today_val(), 365)
        vip.policy_status = "Active"
        vip.premium_amount = 25000.0
        vip.is_test_record = 1
        vip.save(ignore_permissions=True)
        frappe.db.commit()

        alt_pol = frappe.db.exists("Fleet Alert Log", {
            "source_doctype": "Vehicle Insurance Policy",
            "source_name": vip.name,
            "alert_title": f"Policy Renewal Completed: {vip.name}"
        })

        log_result(13, "Insurance & Compliance Alerts (Category G)", bool(alt_pol),
                   f"Policy Renewal Alert: {bool(alt_pol)}")
    except Exception as e:
        log_result(13, "Insurance & Compliance Alerts (Category G)", False, str(e))

    # -------------------------------------------------------------------------
    # TEST 14: Daily Expiry & Maintenance Scheduler Execution (Integrated Single Engine)
    # -------------------------------------------------------------------------
    try:
        from frappe.utils.safe_exec import safe_exec
        ss_script = frappe.db.get_value("Server Script", "Fleet Management - Daily Expiry Monitoring Scheduler", "script")
        safe_exec(ss_script)

        fenl_count = frappe.db.count("Fleet Expiry Notification Log")
        fal_count = frappe.db.count("Fleet Alert Log", {"alert_category": "Insurance & Compliance"})
        passed = bool(fenl_count > 0 and fal_count > 0)
        log_result(14, "Unified Daily Expiry & Maintenance Scheduler Execution", passed,
                   f"FENL logs: {fenl_count}, FAL compliance logs: {fal_count}")
    except Exception as e:
        log_result(14, "Unified Daily Expiry & Maintenance Scheduler Execution", False, str(e))

    # -------------------------------------------------------------------------
    # TEST 15: Unresolved Alert Reminders & Escalation Cycle
    # -------------------------------------------------------------------------
    try:
        past_dt = frappe.utils.add_to_date(now_datetime(), hours=-50)
        rem_alert_name = fleet_alert_dispatcher.create_fleet_alert(
            alert_title="TEST: Unresolved Escalation Alert",
            alert_category="Maintenance & Workshop",
            severity="High",
            source_doctype="Vehicle",
            source_name=test_vehicle,
            vehicle=test_vehicle,
            action_required="Perform urgent maintenance overhaul",
            message="Overdue maintenance alert testing reminder cycle.",
            is_test_record=1
        )
        frappe.db.set_value("Fleet Alert Log", rem_alert_name, {
            "alert_timestamp": past_dt,
            "last_reminder_on": None,
            "reminder_count": 0
        }, update_modified=False)
        frappe.db.commit()

        rem_count = fleet_alert_dispatcher.send_alert_reminders()
        alt_doc = frappe.get_doc("Fleet Alert Log", rem_alert_name)

        passed = bool(rem_count >= 1 and alt_doc.reminder_count == 1 and alt_doc.last_reminder_on is not None)
        log_result(15, "Unresolved Alert Reminders & Escalation Cycle", passed,
                   f"Reminders sent: {rem_count}, New reminder count: {alt_doc.reminder_count}")
    except Exception as e:
        log_result(15, "Unresolved Alert Reminders & Escalation Cycle", False, str(e))

    # -------------------------------------------------------------------------
    # TEST 16: Role-Based Financial Isolation & Permission Query
    # -------------------------------------------------------------------------
    try:
        acc_user = "test_acc@uptoware.local"
        ws_user = "test_ws_supervisor@uptoware.local"

        frappe.set_user(acc_user)
        acc_alerts = frappe.get_list("Fleet Alert Log", filters={"alert_category": "Revenue & Financial"})

        frappe.set_user(ws_user)
        ws_alerts = frappe.get_list("Fleet Alert Log", filters={"alert_category": "Revenue & Financial"})

        frappe.set_user("Administrator")
        passed = bool(len(acc_alerts) > 0 and len(ws_alerts) == 0)
        log_result(16, "Role-Based Financial Isolation & Permission Query", passed,
                   f"Accountant visible: {len(acc_alerts)}, Workshop Supervisor visible: {len(ws_alerts)} (Strict 0)")
    except Exception as e:
        frappe.set_user("Administrator")
        log_result(16, "Role-Based Financial Isolation & Permission Query", False, str(e))

    # -------------------------------------------------------------------------
    # TEST 17: Physical Deletion Safeguard
    # -------------------------------------------------------------------------
    try:
        frappe.set_user("test_fleet_mgr@uptoware.local")
        del_blocked = False
        try:
            non_test_alert = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": "TEST: Protected Audit Alert",
                "alert_category": "Vehicle & Driver",
                "severity": "Low",
                "status": "Unread",
                "recipient_role": "Fleet Manager",
                "is_test_record": 0
            })
            non_test_alert.insert(ignore_permissions=True)
            frappe.db.commit()

            frappe.delete_doc("Fleet Alert Log", non_test_alert.name)
        except Exception:
            del_blocked = True
        finally:
            frappe.set_user("Administrator")
            if frappe.db.exists("Fleet Alert Log", non_test_alert.name):
                frappe.delete_doc("Fleet Alert Log", non_test_alert.name, ignore_permissions=True)
                frappe.db.commit()

        log_result(17, "Physical Deletion Safeguard", del_blocked,
                   f"Non-admin physical deletion prohibited: {del_blocked}")
    except Exception as e:
        frappe.set_user("Administrator")
        log_result(17, "Physical Deletion Safeguard", False, str(e))

    # -------------------------------------------------------------------------
    # TEST 18: Test-Record Quarantine in Workspace Counters & Number Cards
    # -------------------------------------------------------------------------
    try:
        nc = frappe.get_doc("Number Card", "Active Fleet Alerts")
        nc_filters = nc.filters_json
        passed = bool('"is_test_record", "=", 0' in nc_filters or "'is_test_record', '=', 0" in nc_filters)
        log_result(18, "Test-Record Quarantine in Number Cards", passed,
                   f"Filters: {nc_filters}")
    except Exception as e:
        log_result(18, "Test-Record Quarantine in Number Cards", False, str(e))

    print("======================================================================")
    total_tests = len(results)
    passed_tests = sum(1 for r in results if r["passed"])
    failed_tests = total_tests - passed_tests
    print(f"Batch 11 Test Summary: {passed_tests}/{total_tests} Tests Passed ({(passed_tests/total_tests)*100:.1f}%)")
    print("======================================================================")

    if failed_tests > 0:
        print("FAILED TESTS:")
        for r in results:
            if not r["passed"]:
                print(f"  - Test {r['test_num']}: {r['name']} -> {r['details']}")
    else:
        print("ALL BATCH 11 TESTS PASSED WITH 100% SUCCESS RATE!")

    return failed_tests == 0

def today_val():
    return getdate(nowdate())

if __name__ == "__main__":
    run_tests()
