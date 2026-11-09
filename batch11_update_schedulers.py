import frappe

def update_scheduler_scripts():
    frappe.init("frontend")
    frappe.connect()

    scheduler_code = """today = frappe.utils.getdate(frappe.utils.nowdate())
now_dt = frappe.utils.now_datetime()

# 1. Fetch settings
fs = frappe.get_doc("Fleet Settings")
warning_days = fs.warning_window_days or 30
recipient_role = fs.insurance_compliance_alert_role or fs.notification_recipient_role or "Fleet Manager"
intervals_str = fs.reminder_intervals or "30, 15, 7, 0"
configured_intervals = sorted([int(x.strip()) for x in intervals_str.split(",") if x.strip().isdigit()], reverse=True)

enable_notifs = fs.enable_fleet_notifications if fs.enable_fleet_notifications is not None else 1
enable_in_app = fs.enable_in_app_notifications if fs.enable_in_app_notifications is not None else 1
enable_email = fs.enable_email_notifications if fs.enable_email_notifications is not None else 1

esc_hours = fs.breakdown_escalation_hours or 48
rep_threshold = fs.repeated_breakdown_threshold or 3
rep_window_days = fs.repeated_breakdown_window_days or 30
rem_freq_hours = fs.reminder_frequency_hours or 24
max_reminders = fs.max_reminder_count or 5

# 2. Synchronize Vehicles and Statutory Expiries
doc_types = [
    ("Insurance", "end_date"),
    ("Fitness Certificate", "fitness_expiry_date"),
    ("PUC Certificate", "puc_expiry_date"),
    ("Road Tax", "road_tax_expiry_date"),
    ("Goods Permit", "permit_expiry_date")
]

vehicles = frappe.get_all("Vehicle", fields=["name", "end_date", "fitness_expiry_date", "puc_expiry_date", "road_tax_expiry_date", "permit_expiry_date", "policy_no", "is_test_record"])

recipient_emails = [r[0] for r in frappe.db.sql(\"\"\"
    SELECT u.email FROM `tabUser` u
    JOIN `tabHas Role` hr ON hr.parent = u.name
    WHERE hr.role = %s AND u.enabled = 1 AND u.email != ''
\"\"\", (recipient_role,))]

for v in vehicles:
    effective_pol = frappe.db.sql(\"\"\"
        SELECT insurance_company, policy_no, start_date, end_date, policy_doc
        FROM `tabVehicle Insurance Policy`
        WHERE vehicle = %s
          AND policy_status = 'Active'
          AND start_date <= %s
          AND end_date >= %s
        ORDER BY end_date DESC
        LIMIT 1
    \"\"\", (v.name, today, today), as_dict=True)

    if effective_pol:
        frappe.db.set_value("Vehicle", v.name, {
            "insurance_company": effective_pol[0].insurance_company,
            "policy_no": effective_pol[0].policy_no,
            "start_date": effective_pol[0].start_date,
            "end_date": effective_pol[0].end_date,
            "insurance_policy_doc": effective_pol[0].policy_doc
        }, update_modified=False)
        v.end_date = effective_pol[0].end_date

    for dtype, fieldname in doc_types:
        exp_date_val = v.get(fieldname)
        if not exp_date_val:
            continue
        
        exp_date = frappe.utils.getdate(exp_date_val)
        days_left = (exp_date - today).days

        stage = None
        if days_left <= 0:
            stage = "Expired"
        elif days_left <= 7:
            stage = "7 Days Prior"
        elif days_left <= 15:
            stage = "15 Days Prior"
        elif days_left <= warning_days:
            stage = "30 Days Prior"

        if not stage:
            continue

        # Maintain Fleet Expiry Notification Log (Batch 8 compatibility)
        fenl_exists = frappe.db.exists("Fleet Expiry Notification Log", {
            "vehicle": v.name,
            "document_type": dtype,
            "expiry_date": exp_date,
            "notification_stage": stage
        })

        action_msg = f"CRITICAL: {dtype} for vehicle {v.name} expired on {exp_date}. Immediate renewal required." if stage == "Expired" else f"ACTION REQUIRED: {dtype} for vehicle {v.name} expires in {days_left} days on {exp_date}. Please initiate renewal."

        if not fenl_exists:
            notif = frappe.get_doc({
                "doctype": "Fleet Expiry Notification Log",
                "vehicle": v.name,
                "document_type": dtype,
                "expiry_date": exp_date,
                "notification_stage": stage,
                "recipient": recipient_role,
                "sent_datetime": now_dt,
                "status": "Logged",
                "action_required": action_msg,
                "message": f"Expiry Alert: Vehicle {v.name} - {dtype} expires on {exp_date} (Days left: {days_left}). Stage: {stage}.",
                "is_test_record": v.is_test_record or 0
            })
            notif.insert(ignore_permissions=True)

            if recipient_emails and not (v.is_test_record):
                try:
                    frappe.sendmail(
                        recipients=recipient_emails,
                        subject=f"Fleet Expiry Alert: {v.name} - {dtype} ({stage})",
                        message=f"<p><strong>Fleet Expiry Alert</strong></p><p>Vehicle: {v.name}</p><p>Document: {dtype}</p><p>Expiry Date: {exp_date}</p><p>Stage: {stage}</p><p>{action_msg}</p>",
                        reference_doctype="Fleet Expiry Notification Log",
                        reference_name=notif.name,
                        now=False
                    )
                    frappe.db.set_value("Fleet Expiry Notification Log", notif.name, "status", "Queued", update_modified=False)
                except Exception:
                    pass

        # Also create Fleet Alert Log (Batch 11 Central Architecture)
        if enable_notifs and (fs.enable_insurance_compliance_alerts if fs.enable_insurance_compliance_alerts is not None else 1):
            alt_title = f"{dtype} Expired: {v.name}" if stage == "Expired" else f"{dtype} Expiry Due: {v.name} ({stage})"
            alt_exists = frappe.db.exists("Fleet Alert Log", {
                "source_doctype": "Vehicle",
                "source_name": v.name,
                "alert_title": alt_title,
                "status": ["!=", "Resolved"]
            })
            if not alt_exists:
                alt_sev = "Critical" if stage == "Expired" else ("High" if stage in ["7 Days Prior", "15 Days Prior"] else "Medium")
                alt_doc = frappe.get_doc({
                    "doctype": "Fleet Alert Log",
                    "alert_title": alt_title,
                    "alert_category": "Insurance & Compliance",
                    "severity": alt_sev,
                    "status": "Unread",
                    "source_doctype": "Vehicle",
                    "source_name": v.name,
                    "vehicle": v.name,
                    "recipient_role": recipient_role,
                    "delivery_channel": "In-App and Email",
                    "alert_timestamp": now_dt,
                    "action_required": action_msg,
                    "message": f"{dtype} for vehicle {v.name} expires on {exp_date} ({days_left} days remaining). Stage: {stage}.",
                    "is_test_record": v.is_test_record or 0
                })
                alt_doc.insert(ignore_permissions=True)

                if enable_in_app:
                    users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (recipient_role,))
                    for u in users:
                        try:
                            frappe.get_doc({"doctype": "Notification Log", "subject": alt_title, "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": alt_doc.name, "email_content": alt_doc.message}).insert(ignore_permissions=True)
                        except Exception:
                            pass

# 3. Driver License and Medical Expiries
if enable_notifs and (fs.enable_vehicle_driver_alerts if fs.enable_vehicle_driver_alerts is not None else 1):
    d_role = fs.vehicle_driver_alert_role or "Fleet Manager"
    drivers = frappe.get_all("Driver", fields=["name", "expiry_date", "medical_fitness_expiry", "status", "is_test_record"])
    for d in drivers:
        d_checks = [
            ("Driver License", d.expiry_date),
            ("Driver Medical Fitness", d.medical_fitness_expiry)
        ]
        for d_lbl, d_exp in d_checks:
            if not d_exp:
                continue
            d_exp_dt = frappe.utils.getdate(d_exp)
            d_days = (d_exp_dt - today).days
            if d_days <= warning_days:
                d_stage = "Expired" if d_days <= 0 else (f"{d_days} Days Remaining")
                d_title = f"{d_lbl} Expired: {d.name}" if d_days <= 0 else f"{d_lbl} Expiry Due: {d.name}"
                d_exists = frappe.db.exists("Fleet Alert Log", {
                    "source_doctype": "Driver",
                    "source_name": d.name,
                    "alert_title": d_title,
                    "status": ["!=", "Resolved"]
                })
                if not d_exists:
                    d_sev = "Critical" if d_days <= 0 else "High"
                    d_alt = frappe.get_doc({
                        "doctype": "Fleet Alert Log",
                        "alert_title": d_title,
                        "alert_category": "Vehicle & Driver",
                        "severity": d_sev,
                        "status": "Unread",
                        "source_doctype": "Driver",
                        "source_name": d.name,
                        "driver": d.name,
                        "recipient_role": d_role,
                        "delivery_channel": "In-App and Email",
                        "alert_timestamp": now_dt,
                        "action_required": f"Initiate immediate {d_lbl} renewal for driver {d.name} before dispatching trips.",
                        "message": f"{d_lbl} for driver {d.name} expires on {d_exp_dt} ({d_days} days left).",
                        "is_test_record": d.is_test_record or 0
                    })
                    d_alt.insert(ignore_permissions=True)
                    if enable_in_app:
                        users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (d_role,))
                        for u in users:
                            try:
                                frappe.get_doc({"doctype": "Notification Log", "subject": d_title, "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": d_alt.name, "email_content": d_alt.message}).insert(ignore_permissions=True)
                            except Exception:
                                pass

# 4. Breakdown Escalation (> 48h) & Repeated Breakdowns (>= 3 in 30d)
if enable_notifs and (fs.enable_maintenance_alerts if fs.enable_maintenance_alerts is not None else 1):
    m_role = fs.maintenance_alert_role or "Workshop Supervisor"
    open_breakdowns = frappe.db.sql(\"\"\"
        SELECT vb.name, vb.vehicle, vb.breakdown_datetime, vb.severity, vb.repair_status, vb.is_test_record,
               TIMESTAMPDIFF(HOUR, vb.breakdown_datetime, %s) as open_hours
        FROM `tabVehicle Breakdown` vb
        JOIN `tabVehicle` v ON v.name = vb.vehicle
        WHERE vb.repair_status NOT IN ('Repaired', 'Closed')
          AND vb.resolution_type != 'Rejected'
          AND vb.docstatus != 2
          AND TIMESTAMPDIFF(HOUR, vb.breakdown_datetime, %s) >= %s
    \"\"\", (now_dt, now_dt, esc_hours), as_dict=True)

    for ob in open_breakdowns:
        esc_title = f"Breakdown Escalation: {ob.vehicle} (Open {ob.open_hours}h)"
        esc_exists = frappe.db.exists("Fleet Alert Log", {
            "source_doctype": "Vehicle Breakdown",
            "source_name": ob.name,
            "alert_title": esc_title,
            "status": ["!=", "Resolved"]
        })
        if not esc_exists:
            esc_alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": esc_title,
                "alert_category": "Maintenance & Workshop",
                "severity": "Critical",
                "status": "Unread",
                "source_doctype": "Vehicle Breakdown",
                "source_name": ob.name,
                "vehicle": ob.vehicle,
                "recipient_role": m_role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": f"Urgent workshop escalation: breakdown {ob.name} unresolved for {ob.open_hours} hours.",
                "message": f"Vehicle {ob.vehicle} breakdown {ob.name} has been open for {ob.open_hours} hours without repair completion.",
                "is_test_record": ob.is_test_record or 0
            })
            esc_alt.insert(ignore_permissions=True)
            if enable_in_app:
                users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (m_role,))
                for u in users:
                    try:
                        frappe.get_doc({"doctype": "Notification Log", "subject": esc_title, "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": esc_alt.name, "email_content": esc_alt.message}).insert(ignore_permissions=True)
                    except Exception:
                        pass

    # Repeated breakdowns check
    rep_vehs = frappe.db.sql(\"\"\"
        SELECT vb.vehicle, COUNT(vb.name) as bd_count
        FROM `tabVehicle Breakdown` vb
        JOIN `tabVehicle` v ON v.name = vb.vehicle
        WHERE vb.breakdown_datetime >= DATE_SUB(%s, INTERVAL %s DAY)
          AND vb.docstatus != 2
          AND vb.is_test_record = 0
        GROUP BY vb.vehicle
        HAVING bd_count >= %s
    \"\"\", (now_dt, rep_window_days, rep_threshold), as_dict=True)

    for rv in rep_vehs:
        rep_title = f"Repeated Breakdown Alert: {rv.vehicle} ({rv.bd_count} in {rep_window_days}d)"
        rep_exists = frappe.db.exists("Fleet Alert Log", {
            "source_doctype": "Vehicle",
            "source_name": rv.vehicle,
            "alert_title": rep_title,
            "status": ["!=", "Resolved"]
        })
        if not rep_exists:
            rep_alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": rep_title,
                "alert_category": "Maintenance & Workshop",
                "severity": "High",
                "status": "Unread",
                "source_doctype": "Vehicle",
                "source_name": rv.vehicle,
                "vehicle": rv.vehicle,
                "recipient_role": m_role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": "Initiate comprehensive technical overhaul and Root Cause Analysis.",
                "message": f"Vehicle {rv.vehicle} has suffered {rv.bd_count} breakdowns in the past {rep_window_days} days.",
                "is_test_record": 0
            })
            rep_alt.insert(ignore_permissions=True)
            if enable_in_app:
                users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (m_role,))
                for u in users:
                    try:
                        frappe.get_doc({"doctype": "Notification Log", "subject": rep_title, "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": rep_alt.name, "email_content": rep_alt.message}).insert(ignore_permissions=True)
                    except Exception:
                        pass

# 5. Overdue Customer Invoices
if enable_notifs and (fs.enable_financial_alerts if fs.enable_financial_alerts is not None else 1):
    f_role = fs.financial_alert_role or "Accountant"
    overdue_invoices = frappe.db.sql(\"\"\"
        SELECT name, customer, due_date, outstanding_amount, custom_vehicle, custom_mining_trip, custom_is_test_record
        FROM `tabSales Invoice`
        WHERE docstatus = 1
          AND outstanding_amount > 0
          AND due_date < %s
    \"\"\", (today,), as_dict=True)

    for inv in overdue_invoices:
        inv_title = f"Overdue Invoice Alert: {inv.name} ({inv.customer})"
        inv_exists = frappe.db.exists("Fleet Alert Log", {
            "source_doctype": "Sales Invoice",
            "source_name": inv.name,
            "alert_title": inv_title,
            "status": ["!=", "Resolved"]
        })
        if not inv_exists:
            inv_alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": inv_title,
                "alert_category": "Revenue & Financial",
                "severity": "High",
                "status": "Unread",
                "source_doctype": "Sales Invoice",
                "source_name": inv.name,
                "vehicle": inv.custom_vehicle,
                "recipient_role": f_role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": f"Follow up with customer {inv.customer} for overdue payment of ₹{inv.outstanding_amount}.",
                "message": f"Sales Invoice {inv.name} due on {inv.due_date} is overdue with outstanding ₹{inv.outstanding_amount}.",
                "is_test_record": inv.custom_is_test_record or 0
            })
            inv_alt.insert(ignore_permissions=True)
            if enable_in_app:
                users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (f_role,))
                for u in users:
                    try:
                        frappe.get_doc({"doctype": "Notification Log", "subject": inv_title, "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": inv_alt.name, "email_content": inv_alt.message}).insert(ignore_permissions=True)
                    except Exception:
                        pass

# 6. Unresolved Alert Reminders & Escalations
open_alerts = frappe.get_all("Fleet Alert Log", filters={
    "status": ["in", ["Unread", "Read", "Acknowledged"]],
    "reminder_count": ["<", max_reminders]
}, fields=["name", "alert_title", "alert_category", "severity", "recipient_role", "alert_timestamp", "last_reminder_on", "reminder_count", "message", "action_required", "is_test_record"])

for alt in open_alerts:
    last_dt = alt.last_reminder_on or alt.alert_timestamp
    if not last_dt:
        continue
    elapsed_hours = (now_dt - frappe.utils.get_datetime(last_dt)).total_seconds() / 3600.0

    if elapsed_hours >= rem_freq_hours:
        new_count = alt.reminder_count + 1
        frappe.db.set_value("Fleet Alert Log", alt.name, {
            "reminder_count": new_count,
            "last_reminder_on": now_dt
        }, update_modified=False)

        rem_title = f"[REMINDER #{new_count}] {alt.alert_title}"
        if enable_in_app:
            users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (alt.recipient_role,))
            for u in users:
                try:
                    frappe.get_doc({
                        "doctype": "Notification Log",
                        "subject": rem_title,
                        "for_user": u[0],
                        "type": "Alert",
                        "document_type": "Fleet Alert Log",
                        "document_name": alt.name,
                        "email_content": f"<p>Reminder #{new_count}: {alt.message}</p>"
                    }).insert(ignore_permissions=True)
                except Exception:
                    pass

        if enable_email and not alt.is_test_record:
            emails = [r[0] for r in frappe.db.sql("SELECT u.email FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1 AND u.email != ''", (alt.recipient_role,))]
            if emails:
                try:
                    frappe.sendmail(
                        recipients=emails,
                        subject=rem_title,
                        message=f"<p><strong>{rem_title}</strong></p><p>{alt.message}</p><p><strong>Action Required:</strong> {alt.action_required}</p>",
                        reference_doctype="Fleet Alert Log",
                        reference_name=alt.name,
                        now=False
                    )
                except Exception:
                    pass

frappe.db.commit()
"""

    ss_sched = frappe.get_doc("Server Script", "Fleet Management - Daily Expiry Monitoring Scheduler")
    ss_sched.script = scheduler_code
    ss_sched.save(ignore_permissions=True)

    ss_api = frappe.get_doc("Server Script", "Fleet Management - Expiry Monitoring & Notifications")
    api_code = scheduler_code + """
response = {
    "status": "success",
    "vehicles_scanned": len(vehicles),
    "message": "Daily Fleet Expiry, Escalation & Reminder Scheduler executed successfully."
}
frappe.response["message"] = response
"""
    ss_api.script = api_code
    ss_api.save(ignore_permissions=True)

    frappe.db.commit()
    print("Scheduler server scripts successfully updated with unambiguous column aliases.")

if __name__ == "__main__":
    update_scheduler_scripts()
