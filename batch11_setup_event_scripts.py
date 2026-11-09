import frappe

def setup_event_scripts():
    frappe.init("frontend")
    frappe.connect()

    scripts = [
        {
            "name": "Mining Trip - Notification Events",
            "script_type": "DocType Event",
            "reference_doctype": "Mining Trip",
            "doctype_event": "After Save",
            "script": """fs = frappe.get_single("Fleet Settings")
if not fs or not fs.enable_fleet_notifications or not fs.enable_trip_alerts:
    pass
else:
    role = fs.trip_alert_role or "Fleet Manager"
    now_dt = frappe.utils.now_datetime()
    status = doc.trip_status
    title = None
    severity = "Medium"
    action = ""
    msg = ""

    if status == "Dispatched":
        title = f"Trip Dispatched: {doc.name}"
        severity = "Medium"
        action = "Monitor trip transit and await weighbridge arrival."
        msg = f"Mining Trip {doc.name} for vehicle {doc.vehicle} (Driver: {doc.driver or 'Unassigned'}) has been dispatched from {doc.mine_site} to {doc.destination}."
    elif status == "Weighbridge Confirmed":
        title = f"Trip Awaiting Approval: {doc.name}"
        severity = "High"
        action = f"Review net weight ({doc.net_weight_tons} tons) and approve trip delivery."
        msg = f"Mining Trip {doc.name} has completed weighbridge confirmation (Net: {doc.net_weight_tons} Tons) and is awaiting Fleet Manager approval."
    elif status in ["Approved", "Delivered"]:
        title = f"Trip Delivered: {doc.name}"
        severity = "Low"
        action = "Trip delivery verified. Ready for customer invoicing."
        msg = f"Mining Trip {doc.name} (Vehicle: {doc.vehicle}, Net: {doc.net_weight_tons} Tons) has been successfully delivered and approved."
        # Auto-resolve awaiting approval alerts
        open_alts = frappe.get_all("Fleet Alert Log", filters={"source_doctype": "Mining Trip", "source_name": doc.name, "status": ["!=", "Resolved"]}, fields=["name"])
        for oa in open_alts:
            frappe.db.set_value("Fleet Alert Log", oa.name, {"status": "Resolved", "resolved_on": now_dt, "resolved_by": frappe.session.user or "Administrator", "resolution_note": "Trip approved and delivered."}, update_modified=False)
    elif status == "Cancelled":
        title = f"Trip Cancelled: {doc.name}"
        severity = "High"
        action = "Review cancellation reason and reassign vehicle/driver."
        msg = f"Mining Trip {doc.name} (Vehicle: {doc.vehicle}) has been cancelled."
        open_alts = frappe.get_all("Fleet Alert Log", filters={"source_doctype": "Mining Trip", "source_name": doc.name, "status": ["!=", "Resolved"]}, fields=["name"])
        for oa in open_alts:
            frappe.db.set_value("Fleet Alert Log", oa.name, {"status": "Resolved", "resolved_on": now_dt, "resolved_by": frappe.session.user or "Administrator", "resolution_note": "Trip cancelled."}, update_modified=False)

    if title:
        exists = frappe.db.exists("Fleet Alert Log", {"source_doctype": "Mining Trip", "source_name": doc.name, "alert_title": title, "status": ["!=", "Resolved"]})
        if not exists:
            alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": title,
                "alert_category": "Trip Operations",
                "severity": severity,
                "status": "Unread",
                "source_doctype": "Mining Trip",
                "source_name": doc.name,
                "vehicle": doc.vehicle,
                "driver": doc.driver,
                "recipient_role": role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": action,
                "message": msg,
                "is_test_record": doc.is_test_record or 0
            })
            alt.insert(ignore_permissions=True)

            if fs.enable_in_app_notifications:
                users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (role,))
                for u in users:
                    try:
                        frappe.get_doc({"doctype": "Notification Log", "subject": title, "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": alt.name, "email_content": msg}).insert(ignore_permissions=True)
                    except Exception:
                        pass

            if fs.enable_email_notifications and not doc.is_test_record:
                emails = [r[0] for r in frappe.db.sql("SELECT u.email FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1 AND u.email != ''", (role,))]
                if emails:
                    try:
                        frappe.sendmail(recipients=emails, subject=f"[{severity.upper()}] {title}", message=f"<p><strong>{title}</strong></p><p>{msg}</p><p><strong>Action Required:</strong> {action}</p>", reference_doctype="Fleet Alert Log", reference_name=alt.name, now=False)
                        frappe.db.set_value("Fleet Alert Log", alt.name, "email_queued", 1, update_modified=False)
                    except Exception:
                        pass
"""
        },
        {
            "name": "Vehicle Breakdown - Notification Events",
            "script_type": "DocType Event",
            "reference_doctype": "Vehicle Breakdown",
            "doctype_event": "After Save",
            "script": """fs = frappe.get_single("Fleet Settings")
if not fs or not fs.enable_fleet_notifications or not fs.enable_maintenance_alerts:
    pass
else:
    role = fs.maintenance_alert_role or "Workshop Supervisor"
    now_dt = frappe.utils.now_datetime()
    st = doc.repair_status
    title = None
    severity = doc.severity or "High"
    action = ""
    msg = ""

    if st == "Reported":
        title = f"Breakdown Reported: {doc.vehicle}"
        action = "Inspect vehicle and approve workshop assignment."
        msg = f"Vehicle {doc.vehicle} reported a breakdown ({doc.breakdown_type}) at {doc.mine_site or 'Site'}. Description: {doc.description or 'None'}."
    elif st == "In Workshop":
        title = f"Vehicle Sent to Workshop: {doc.vehicle}"
        severity = "Medium"
        action = "Commence repair diagnostics and parts estimation."
        msg = f"Vehicle {doc.vehicle} has entered workshop ({doc.assigned_workshop or 'Internal Workshop'}) under Breakdown {doc.name}."
    elif st == "Awaiting Parts":
        title = f"Breakdown Awaiting Parts: {doc.vehicle}"
        severity = "High"
        action = "Expedite spare parts issuance or procurement."
        msg = f"Breakdown repair for {doc.vehicle} ({doc.name}) is halted awaiting required spare parts."
    elif st in ["Repaired", "Closed"]:
        title = f"Repair Completed: {doc.vehicle}"
        severity = "Low"
        action = "Verify repair completion and return vehicle to active service."
        msg = f"Breakdown repair for {doc.vehicle} ({doc.name}) completed. Total downtime: {doc.downtime_hours or 0} hours. Cost: ₹{doc.total_repair_cost or 0}."
        open_alts = frappe.get_all("Fleet Alert Log", filters={"source_doctype": "Vehicle Breakdown", "source_name": doc.name, "status": ["!=", "Resolved"]}, fields=["name"])
        for oa in open_alts:
            frappe.db.set_value("Fleet Alert Log", oa.name, {"status": "Resolved", "resolved_on": now_dt, "resolved_by": frappe.session.user or "Administrator", "resolution_note": "Breakdown repair completed."}, update_modified=False)

    if title:
        exists = frappe.db.exists("Fleet Alert Log", {"source_doctype": "Vehicle Breakdown", "source_name": doc.name, "alert_title": title, "status": ["!=", "Resolved"]})
        if not exists:
            alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": title,
                "alert_category": "Maintenance & Workshop",
                "severity": severity,
                "status": "Unread",
                "source_doctype": "Vehicle Breakdown",
                "source_name": doc.name,
                "vehicle": doc.vehicle,
                "driver": doc.driver,
                "recipient_role": role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": action,
                "message": msg,
                "is_test_record": doc.is_test_record or 0
            })
            alt.insert(ignore_permissions=True)

            if fs.enable_in_app_notifications:
                users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (role,))
                for u in users:
                    try:
                        frappe.get_doc({"doctype": "Notification Log", "subject": title, "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": alt.name, "email_content": msg}).insert(ignore_permissions=True)
                    except Exception:
                        pass

            if fs.enable_email_notifications and not doc.is_test_record:
                emails = [r[0] for r in frappe.db.sql("SELECT u.email FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1 AND u.email != ''", (role,))]
                if emails:
                    try:
                        frappe.sendmail(recipients=emails, subject=f"[{severity.upper()}] {title}", message=f"<p><strong>{title}</strong></p><p>{msg}</p><p><strong>Action Required:</strong> {action}</p>", reference_doctype="Fleet Alert Log", reference_name=alt.name, now=False)
                        frappe.db.set_value("Fleet Alert Log", alt.name, "email_queued", 1, update_modified=False)
                    except Exception:
                        pass
"""
        },
        {
            "name": "Fuel Log - Notification Events",
            "script_type": "DocType Event",
            "reference_doctype": "Fuel Log",
            "doctype_event": "After Save",
            "script": """fs = frappe.get_single("Fleet Settings")
if not fs or not fs.enable_fleet_notifications or not fs.enable_fuel_alerts:
    pass
else:
    role = fs.fuel_alert_role or "Fleet Manager"
    now_dt = frappe.utils.now_datetime()
    min_kml = float(fs.min_fuel_efficiency_kml or 2.5)

    alerts_to_create = []

    # 1. Abnormal low efficiency check
    if doc.is_full_tank and doc.km_per_litre and float(doc.km_per_litre) > 0 and float(doc.km_per_litre) < min_kml:
        alerts_to_create.append({
            "title": f"Low Fuel Efficiency Alert: {doc.vehicle}",
            "severity": "High",
            "action": f"Investigate abnormal consumption. Logged: {doc.km_per_litre} KM/L vs Threshold: {min_kml} KM/L.",
            "msg": f"Fuel Log {doc.name} for vehicle {doc.vehicle} recorded low efficiency of {doc.km_per_litre} KM/L (Distance: {doc.distance_travelled_km} KM, Litres: {doc.quantity_litres} L)."
        })

    # 2. Suspicious duplicate fuel entry
    dups = frappe.db.sql(\"\"\"
        SELECT name FROM `tabFuel Log`
        WHERE vehicle = %s AND fuel_date = %s AND name != %s
          AND (odometer_reading_km = %s OR quantity_litres = %s)
        LIMIT 1
    \"\"\", (doc.vehicle, doc.fuel_date, doc.name, doc.odometer_reading_km, doc.quantity_litres))
    if dups:
        alerts_to_create.append({
            "title": f"Suspicious Duplicate Fuel Entry: {doc.vehicle}",
            "severity": "Critical",
            "action": f"Review potential duplicate fuel entry against existing log {dups[0][0]}.",
            "msg": f"Fuel Log {doc.name} on {doc.fuel_date} shares identical odometer ({doc.odometer_reading_km}) or quantity ({doc.quantity_litres} L) with log {dups[0][0]}."
        })

    # 3. Fuel approval pending or rejected
    if doc.approval_status == "Draft":
        alerts_to_create.append({
            "title": f"Fuel Approval Pending: {doc.name}",
            "severity": "Medium",
            "action": "Review fuel slip and approve or reject fuel entry.",
            "msg": f"Fuel Log {doc.name} for vehicle {doc.vehicle} ({doc.quantity_litres} L, ₹{doc.total_fuel_cost}) is awaiting Fleet Manager approval."
        })
    elif doc.approval_status == "Rejected":
        alerts_to_create.append({
            "title": f"Fuel Log Rejected: {doc.name}",
            "severity": "Medium",
            "action": "Investigate rejected fuel log and correct refuel details.",
            "msg": f"Fuel Log {doc.name} for vehicle {doc.vehicle} has been rejected."
        })
        # Auto-resolve pending
        open_alts = frappe.get_all("Fleet Alert Log", filters={"source_doctype": "Fuel Log", "source_name": doc.name, "alert_title": f"Fuel Approval Pending: {doc.name}", "status": ["!=", "Resolved"]}, fields=["name"])
        for oa in open_alts:
            frappe.db.set_value("Fleet Alert Log", oa.name, {"status": "Resolved", "resolved_on": now_dt, "resolved_by": frappe.session.user or "Administrator", "resolution_note": "Fuel log rejected."}, update_modified=False)
    elif doc.approval_status == "Approved":
        open_alts = frappe.get_all("Fleet Alert Log", filters={"source_doctype": "Fuel Log", "source_name": doc.name, "alert_title": f"Fuel Approval Pending: {doc.name}", "status": ["!=", "Resolved"]}, fields=["name"])
        for oa in open_alts:
            frappe.db.set_value("Fleet Alert Log", oa.name, {"status": "Resolved", "resolved_on": now_dt, "resolved_by": frappe.session.user or "Administrator", "resolution_note": "Fuel log approved."}, update_modified=False)

    for item in alerts_to_create:
        exists = frappe.db.exists("Fleet Alert Log", {"source_doctype": "Fuel Log", "source_name": doc.name, "alert_title": item["title"], "status": ["!=", "Resolved"]})
        if not exists:
            alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": item["title"],
                "alert_category": "Fuel",
                "severity": item["severity"],
                "status": "Unread",
                "source_doctype": "Fuel Log",
                "source_name": doc.name,
                "vehicle": doc.vehicle,
                "driver": doc.driver,
                "recipient_role": role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": item["action"],
                "message": item["msg"],
                "is_test_record": doc.is_test_record or 0
            })
            alt.insert(ignore_permissions=True)

            if fs.enable_in_app_notifications:
                users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (role,))
                for u in users:
                    try:
                        frappe.get_doc({"doctype": "Notification Log", "subject": item["title"], "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": alt.name, "email_content": item["msg"]}).insert(ignore_permissions=True)
                    except Exception:
                        pass

            if fs.enable_email_notifications and not doc.is_test_record:
                emails = [r[0] for r in frappe.db.sql("SELECT u.email FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1 AND u.email != ''", (role,))]
                if emails:
                    try:
                        frappe.sendmail(recipients=emails, subject=f"[{item['severity'].upper()}] {item['title']}", message=f"<p><strong>{item['title']}</strong></p><p>{item['msg']}</p><p><strong>Action Required:</strong> {item['action']}</p>", reference_doctype="Fleet Alert Log", reference_name=alt.name, now=False)
                        frappe.db.set_value("Fleet Alert Log", alt.name, "email_queued", 1, update_modified=False)
                    except Exception:
                        pass
"""
        },
        {
            "name": "Operational Expense - Notification Events",
            "script_type": "DocType Event",
            "reference_doctype": "Operational Expense",
            "doctype_event": "After Save",
            "script": """fs = frappe.get_single("Fleet Settings")
if not fs or not fs.enable_fleet_notifications or not fs.enable_financial_alerts:
    pass
else:
    role = fs.financial_alert_role or "Accountant"
    now_dt = frappe.utils.now_datetime()
    wf_st = doc.workflow_state or doc.approval_status
    title = None
    severity = "Medium"
    action = ""
    msg = ""

    if wf_st == "Submitted":
        title = f"Expense Awaiting Approval: {doc.name}"
        severity = "Medium"
        action = f"Review and approve operational expense of ₹{doc.amount} ({doc.expense_category})."
        msg = f"Operational Expense {doc.name} for ₹{doc.amount} ({doc.expense_category}) submitted by {doc.submitted_by or 'User'} is awaiting approval."
    elif wf_st == "Approved":
        title = f"Expense Approved: {doc.name}"
        severity = "Low"
        action = "Post GL Journal Entry or schedule payment settlement."
        msg = f"Operational Expense {doc.name} for ₹{doc.amount} has been approved."
        open_alts = frappe.get_all("Fleet Alert Log", filters={"source_doctype": "Operational Expense", "source_name": doc.name, "alert_title": f"Expense Awaiting Approval: {doc.name}", "status": ["!=", "Resolved"]}, fields=["name"])
        for oa in open_alts:
            frappe.db.set_value("Fleet Alert Log", oa.name, {"status": "Resolved", "resolved_on": now_dt, "resolved_by": frappe.session.user or "Administrator", "resolution_note": "Expense approved."}, update_modified=False)
    elif wf_st == "Rejected":
        title = f"Expense Rejected: {doc.name}"
        severity = "Medium"
        action = f"Review rejection reason: {doc.rejection_reason or 'None'}."
        msg = f"Operational Expense {doc.name} for ₹{doc.amount} was rejected. Reason: {doc.rejection_reason or 'None'}."
        open_alts = frappe.get_all("Fleet Alert Log", filters={"source_doctype": "Operational Expense", "source_name": doc.name, "alert_title": f"Expense Awaiting Approval: {doc.name}", "status": ["!=", "Resolved"]}, fields=["name"])
        for oa in open_alts:
            frappe.db.set_value("Fleet Alert Log", oa.name, {"status": "Resolved", "resolved_on": now_dt, "resolved_by": frappe.session.user or "Administrator", "resolution_note": "Expense rejected."}, update_modified=False)

    if title:
        exists = frappe.db.exists("Fleet Alert Log", {"source_doctype": "Operational Expense", "source_name": doc.name, "alert_title": title, "status": ["!=", "Resolved"]})
        if not exists:
            alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": title,
                "alert_category": "Revenue & Financial",
                "severity": severity,
                "status": "Unread",
                "source_doctype": "Operational Expense",
                "source_name": doc.name,
                "vehicle": doc.vehicle,
                "driver": doc.driver,
                "recipient_role": role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": action,
                "message": msg,
                "is_test_record": doc.is_test_record or 0
            })
            alt.insert(ignore_permissions=True)

            if fs.enable_in_app_notifications:
                users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (role,))
                for u in users:
                    try:
                        frappe.get_doc({"doctype": "Notification Log", "subject": title, "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": alt.name, "email_content": msg}).insert(ignore_permissions=True)
                    except Exception:
                        pass

            if fs.enable_email_notifications and not doc.is_test_record:
                emails = [r[0] for r in frappe.db.sql("SELECT u.email FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1 AND u.email != ''", (role,))]
                if emails:
                    try:
                        frappe.sendmail(recipients=emails, subject=f"[{severity.upper()}] {title}", message=f"<p><strong>{title}</strong></p><p>{msg}</p><p><strong>Action Required:</strong> {action}</p>", reference_doctype="Fleet Alert Log", reference_name=alt.name, now=False)
                        frappe.db.set_value("Fleet Alert Log", alt.name, "email_queued", 1, update_modified=False)
                    except Exception:
                        pass
"""
        },
        {
            "name": "Sales Invoice - Notification Events",
            "script_type": "DocType Event",
            "reference_doctype": "Sales Invoice",
            "doctype_event": "After Submit",
            "script": """fs = frappe.get_single("Fleet Settings")
if not fs or not fs.enable_fleet_notifications or not fs.enable_financial_alerts:
    pass
else:
    role = fs.financial_alert_role or "Accountant"
    now_dt = frappe.utils.now_datetime()
    title = None
    severity = "Low"
    action = ""
    msg = ""

    if doc.is_return:
        title = f"Credit Note Issued: {doc.name}"
        severity = "High"
        action = f"Verify credit note adjustment of ₹{abs(doc.base_grand_total)} for customer {doc.customer}."
        msg = f"Credit Note {doc.name} issued against customer {doc.customer} for amount ₹{abs(doc.base_grand_total)}."
    else:
        title = f"Sales Invoice Submitted: {doc.name}"
        severity = "Low"
        action = f"Track customer receivables payment due on {doc.due_date}."
        msg = f"Sales Invoice {doc.name} submitted for customer {doc.customer} for amount ₹{doc.base_grand_total} (Trip: {doc.custom_mining_trip or 'N/A'}, Vehicle: {doc.custom_vehicle or 'N/A'})."

    if title:
        exists = frappe.db.exists("Fleet Alert Log", {"source_doctype": "Sales Invoice", "source_name": doc.name, "alert_title": title, "status": ["!=", "Resolved"]})
        if not exists:
            alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": title,
                "alert_category": "Revenue & Financial",
                "severity": severity,
                "status": "Unread",
                "source_doctype": "Sales Invoice",
                "source_name": doc.name,
                "vehicle": doc.custom_vehicle,
                "recipient_role": role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": action,
                "message": msg,
                "is_test_record": doc.custom_is_test_record or 0
            })
            alt.insert(ignore_permissions=True)

            if fs.enable_in_app_notifications:
                users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (role,))
                for u in users:
                    try:
                        frappe.get_doc({"doctype": "Notification Log", "subject": title, "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": alt.name, "email_content": msg}).insert(ignore_permissions=True)
                    except Exception:
                        pass

            if fs.enable_email_notifications and not doc.custom_is_test_record:
                emails = [r[0] for r in frappe.db.sql("SELECT u.email FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1 AND u.email != ''", (role,))]
                if emails:
                    try:
                        frappe.sendmail(recipients=emails, subject=f"[{severity.upper()}] {title}", message=f"<p><strong>{title}</strong></p><p>{msg}</p><p><strong>Action Required:</strong> {action}</p>", reference_doctype="Fleet Alert Log", reference_name=alt.name, now=False)
                        frappe.db.set_value("Fleet Alert Log", alt.name, "email_queued", 1, update_modified=False)
                    except Exception:
                        pass
"""
        },
        {
            "name": "Payment Entry - Notification Events",
            "script_type": "DocType Event",
            "reference_doctype": "Payment Entry",
            "doctype_event": "After Submit",
            "script": """fs = frappe.get_single("Fleet Settings")
if not fs or not fs.enable_fleet_notifications or not fs.enable_financial_alerts:
    pass
elif doc.payment_type == "Receive" and doc.party_type == "Customer":
    role = fs.financial_alert_role or "Accountant"
    now_dt = frappe.utils.now_datetime()
    title = f"Customer Payment Received: {doc.name}"
    severity = "Low"
    action = f"Verify payment allocation of ₹{doc.paid_amount} for customer {doc.party}."
    msg = f"Payment Entry {doc.name} submitted for customer {doc.party} with amount ₹{doc.paid_amount}."

    exists = frappe.db.exists("Fleet Alert Log", {"source_doctype": "Payment Entry", "source_name": doc.name, "alert_title": title, "status": ["!=", "Resolved"]})
    if not exists:
        alt = frappe.get_doc({
            "doctype": "Fleet Alert Log",
            "alert_title": title,
            "alert_category": "Revenue & Financial",
            "severity": severity,
            "status": "Unread",
            "source_doctype": "Payment Entry",
            "source_name": doc.name,
            "recipient_role": role,
            "delivery_channel": "In-App and Email",
            "alert_timestamp": now_dt,
            "action_required": action,
            "message": msg,
            "is_test_record": doc.custom_is_test_record or 0
        })
        alt.insert(ignore_permissions=True)

        if fs.enable_in_app_notifications:
            users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (role,))
            for u in users:
                try:
                    frappe.get_doc({"doctype": "Notification Log", "subject": title, "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": alt.name, "email_content": msg}).insert(ignore_permissions=True)
                except Exception:
                    pass

        if fs.enable_email_notifications and not doc.custom_is_test_record:
            emails = [r[0] for r in frappe.db.sql("SELECT u.email FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1 AND u.email != ''", (role,))]
            if emails:
                try:
                    frappe.sendmail(recipients=emails, subject=f"[{severity.upper()}] {title}", message=f"<p><strong>{title}</strong></p><p>{msg}</p><p><strong>Action Required:</strong> {action}</p>", reference_doctype="Fleet Alert Log", reference_name=alt.name, now=False)
                    frappe.db.set_value("Fleet Alert Log", alt.name, "email_queued", 1, update_modified=False)
                except Exception:
                    pass
"""
        },
        {
            "name": "Stock Entry - Notification Events",
            "script_type": "DocType Event",
            "reference_doctype": "Stock Entry",
            "doctype_event": "After Submit",
            "script": """fs = frappe.get_single("Fleet Settings")
if not fs or not fs.enable_fleet_notifications or not fs.enable_inventory_alerts:
    pass
else:
    role = fs.inventory_alert_role or "Store Manager"
    now_dt = frappe.utils.now_datetime()
    title = None
    severity = "Low"
    action = ""
    msg = ""

    if doc.purpose == "Material Issue":
        title = f"Material Issue Completed: {doc.name}"
        action = f"Verify spare parts issue for vehicle {doc.custom_vehicle or 'Fleet'} (Breakdown: {doc.custom_vehicle_breakdown or 'N/A'})."
        msg = f"Stock Entry {doc.name} (Material Issue) completed for vehicle {doc.custom_vehicle or 'Fleet'}."
    elif doc.purpose == "Material Receipt":
        title = f"Material Receipt Completed: {doc.name}"
        action = "Verify received spare parts stock in fleet warehouse."
        msg = f"Stock Entry {doc.name} (Material Receipt) completed. Stock replenished in fleet warehouse."

    if title:
        exists = frappe.db.exists("Fleet Alert Log", {"source_doctype": "Stock Entry", "source_name": doc.name, "alert_title": title, "status": ["!=", "Resolved"]})
        if not exists:
            alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": title,
                "alert_category": "Inventory",
                "severity": severity,
                "status": "Unread",
                "source_doctype": "Stock Entry",
                "source_name": doc.name,
                "vehicle": doc.custom_vehicle,
                "recipient_role": role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": action,
                "message": msg,
                "is_test_record": 0
            })
            alt.insert(ignore_permissions=True)

            if fs.enable_in_app_notifications:
                users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (role,))
                for u in users:
                    try:
                        frappe.get_doc({"doctype": "Notification Log", "subject": title, "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": alt.name, "email_content": msg}).insert(ignore_permissions=True)
                    except Exception:
                        pass
"""
        },
        {
            "name": "Purchase Order - Notification Events",
            "script_type": "DocType Event",
            "reference_doctype": "Purchase Order",
            "doctype_event": "After Submit",
            "script": """fs = frappe.get_single("Fleet Settings")
if not fs or not fs.enable_fleet_notifications or not fs.enable_procurement_alerts:
    pass
else:
    role = fs.procurement_alert_role or "Store Manager"
    now_dt = frappe.utils.now_datetime()
    title = f"Purchase Order Submitted: {doc.name}"
    severity = "Medium"
    action = f"Track supplier order delivery from {doc.supplier}."
    msg = f"Purchase Order {doc.name} submitted for supplier {doc.supplier} for total amount ₹{doc.base_grand_total}."

    exists = frappe.db.exists("Fleet Alert Log", {"source_doctype": "Purchase Order", "source_name": doc.name, "alert_title": title, "status": ["!=", "Resolved"]})
    if not exists:
        alt = frappe.get_doc({
            "doctype": "Fleet Alert Log",
            "alert_title": title,
            "alert_category": "Procurement",
            "severity": severity,
            "status": "Unread",
            "source_doctype": "Purchase Order",
            "source_name": doc.name,
            "vehicle": doc.custom_vehicle,
            "recipient_role": role,
            "delivery_channel": "In-App and Email",
            "alert_timestamp": now_dt,
            "action_required": action,
            "message": msg,
            "is_test_record": doc.custom_is_test_record or 0
        })
        alt.insert(ignore_permissions=True)

        if fs.enable_in_app_notifications:
            users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (role,))
            for u in users:
                try:
                    frappe.get_doc({"doctype": "Notification Log", "subject": title, "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": alt.name, "email_content": msg}).insert(ignore_permissions=True)
                except Exception:
                    pass

        if fs.enable_email_notifications and not doc.custom_is_test_record:
            emails = [r[0] for r in frappe.db.sql("SELECT u.email FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1 AND u.email != ''", (role,))]
            if emails:
                try:
                    frappe.sendmail(recipients=emails, subject=f"[{severity.upper()}] {title}", message=f"<p><strong>{title}</strong></p><p>{msg}</p><p><strong>Action Required:</strong> {action}</p>", reference_doctype="Fleet Alert Log", reference_name=alt.name, now=False)
                    frappe.db.set_value("Fleet Alert Log", alt.name, "email_queued", 1, update_modified=False)
                except Exception:
                    pass
"""
        }
    ]

    for item in scripts:
        name = item["name"]
        if frappe.db.exists("Server Script", name):
            ss = frappe.get_doc("Server Script", name)
            ss.script = item["script"]
            ss.script_type = item["script_type"]
            ss.reference_doctype = item["reference_doctype"]
            ss.doctype_event = item["doctype_event"]
            ss.disabled = 0
            ss.save(ignore_permissions=True)
            print(f"Updated Server Script: {name}")
        else:
            ss = frappe.get_doc({
                "doctype": "Server Script",
                "name": name,
                "script_type": item["script_type"],
                "reference_doctype": item["reference_doctype"],
                "doctype_event": item["doctype_event"],
                "disabled": 0,
                "script": item["script"]
            })
            ss.insert(ignore_permissions=True)
            print(f"Created Server Script: {name}")

    frappe.db.commit()
    print("All Notification Event Server Scripts configured successfully.")

if __name__ == "__main__":
    setup_event_scripts()

