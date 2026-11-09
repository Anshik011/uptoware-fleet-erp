import frappe
from frappe.utils import now_datetime, getdate, nowdate

def get_fleet_settings():
    try:
        return frappe.get_doc("Fleet Settings")
    except Exception:
        return None

def create_fleet_alert(alert_title, alert_category, severity="Medium", source_doctype=None, source_name=None, vehicle=None, driver=None, action_required=None, message=None, is_test_record=0):
    fs = get_fleet_settings()
    if fs and not fs.get("enable_fleet_notifications", 1):
        return None

    # Category toggle mapping
    cat_toggles = {
        "Vehicle & Driver": "enable_vehicle_driver_alerts",
        "Trip Operations": "enable_trip_alerts",
        "Fuel": "enable_fuel_alerts",
        "Maintenance & Workshop": "enable_maintenance_alerts",
        "Inventory": "enable_inventory_alerts",
        "Procurement": "enable_procurement_alerts",
        "Insurance & Compliance": "enable_insurance_compliance_alerts",
        "Revenue & Financial": "enable_financial_alerts"
    }

    if fs:
        toggle_field = cat_toggles.get(alert_category)
        if toggle_field and not fs.get(toggle_field, 1):
            return None

    # Role routing mapping
    cat_roles = {
        "Vehicle & Driver": ("vehicle_driver_alert_role", "Fleet Manager"),
        "Trip Operations": ("trip_alert_role", "Fleet Manager"),
        "Fuel": ("fuel_alert_role", "Fleet Manager"),
        "Maintenance & Workshop": ("maintenance_alert_role", "Workshop Supervisor"),
        "Inventory": ("inventory_alert_role", "Store Manager"),
        "Procurement": ("procurement_alert_role", "Store Manager"),
        "Insurance & Compliance": ("insurance_compliance_alert_role", "Fleet Manager"),
        "Revenue & Financial": ("financial_alert_role", "Accountant")
    }

    role_field, default_role = cat_roles.get(alert_category, (None, "Fleet Manager"))
    recipient_role = (fs.get(role_field) if (fs and role_field) else None) or default_role

    # Duplicate Prevention
    if source_doctype and source_name and alert_title:
        existing = frappe.db.get_value("Fleet Alert Log", {
            "source_doctype": source_doctype,
            "source_name": source_name,
            "alert_title": alert_title,
            "status": ["!=", "Resolved"]
        }, "name")
        if existing:
            return existing

    # Create Fleet Alert Log
    alert = frappe.get_doc({
        "doctype": "Fleet Alert Log",
        "alert_title": alert_title,
        "alert_category": alert_category,
        "severity": severity or "Medium",
        "status": "Unread",
        "source_doctype": source_doctype,
        "source_name": source_name,
        "vehicle": vehicle,
        "driver": driver,
        "recipient_role": recipient_role,
        "delivery_channel": "In-App and Email",
        "alert_timestamp": now_datetime(),
        "action_required": action_required or "Please review this alert and take appropriate action.",
        "message": message or alert_title,
        "is_test_record": 1 if is_test_record else 0
    })
    alert.insert(ignore_permissions=True)

    # In-App Notifications (Notification Log)
    enable_in_app = fs.get("enable_in_app_notifications", 1) if fs else 1
    if enable_in_app:
        users = [r[0] for r in frappe.db.sql("""
            SELECT u.name FROM `tabUser` u
            JOIN `tabHas Role` hr ON hr.parent = u.name
            WHERE hr.role = %s AND u.enabled = 1
        """, (recipient_role,))]
        for u in users:
            try:
                nl = frappe.get_doc({
                    "doctype": "Notification Log",
                    "subject": alert_title,
                    "for_user": u,
                    "type": "Alert",
                    "document_type": "Fleet Alert Log",
                    "document_name": alert.name,
                    "email_content": alert.message
                })
                nl.insert(ignore_permissions=True)
            except Exception:
                pass

    # Background Email Notification (Email Queue)
    enable_email = fs.get("enable_email_notifications", 1) if fs else 1
    if enable_email and not is_test_record:
        emails = [r[0] for r in frappe.db.sql("""
            SELECT u.email FROM `tabUser` u
            JOIN `tabHas Role` hr ON hr.parent = u.name
            WHERE hr.role = %s AND u.enabled = 1 AND u.email != ''
        """, (recipient_role,))]
        if emails:
            try:
                frappe.sendmail(
                    recipients=emails,
                    subject=f"[{severity.upper()}] {alert_title}",
                    message=f"<p><strong>{alert_title}</strong></p><p><strong>Category:</strong> {alert_category} | <strong>Severity:</strong> {severity}</p><p>{alert.message}</p><p><strong>Action Required:</strong> {alert.action_required}</p>",
                    reference_doctype="Fleet Alert Log",
                    reference_name=alert.name,
                    now=False
                )
                frappe.db.set_value("Fleet Alert Log", alert.name, "email_queued", 1, update_modified=False)
            except Exception:
                pass

    frappe.db.commit()
    return alert.name

def resolve_fleet_alert(source_doctype, source_name, resolution_note="Resolved on condition clearance.", alert_title=None):
    filters = {
        "source_doctype": source_doctype,
        "source_name": source_name,
        "status": ["!=", "Resolved"]
    }
    if alert_title:
        filters["alert_title"] = alert_title

    open_alerts = frappe.get_all("Fleet Alert Log", filters=filters, fields=["name"])
    resolved_count = 0
    now_dt = now_datetime()
    user = frappe.session.user if (hasattr(frappe, "session") and frappe.session and frappe.session.user) else "Administrator"

    for alt in open_alerts:
        frappe.db.set_value("Fleet Alert Log", alt.name, {
            "status": "Resolved",
            "resolved_on": now_dt,
            "resolved_by": user,
            "resolution_note": resolution_note
        }, update_modified=False)
        resolved_count += 1

    if resolved_count > 0:
        frappe.db.commit()
    return resolved_count

def send_alert_reminders():
    fs = get_fleet_settings()
    rem_freq_hours = fs.get("reminder_frequency_hours", 24) if fs else 24
    max_reminders = fs.get("max_reminder_count", 5) if fs else 5

    open_alerts = frappe.get_all("Fleet Alert Log", filters={
        "status": ["in", ["Unread", "Read", "Acknowledged"]],
        "reminder_count": ["<", max_reminders]
    }, fields=["name", "alert_title", "alert_category", "severity", "recipient_role", "alert_timestamp", "last_reminder_on", "reminder_count", "message", "action_required", "is_test_record"])

    now_dt = now_datetime()
    reminders_sent = 0

    for alt in open_alerts:
        last_dt = alt.last_reminder_on or alt.alert_timestamp
        if not last_dt:
            continue
        elapsed_hours = (now_dt - last_dt).total_seconds() / 3600.0

        if elapsed_hours >= rem_freq_hours:
            new_count = alt.reminder_count + 1
            frappe.db.set_value("Fleet Alert Log", alt.name, {
                "reminder_count": new_count,
                "last_reminder_on": now_dt
            }, update_modified=False)

            # In-App Reminder
            reminder_title = f"[REMINDER #{new_count}] {alt.alert_title}"
            users = [r[0] for r in frappe.db.sql("""
                SELECT u.name FROM `tabUser` u
                JOIN `tabHas Role` hr ON hr.parent = u.name
                WHERE hr.role = %s AND u.enabled = 1
            """, (alt.recipient_role,))]
            for u in users:
                try:
                    nl = frappe.get_doc({
                        "doctype": "Notification Log",
                        "subject": reminder_title,
                        "for_user": u,
                        "type": "Alert",
                        "document_type": "Fleet Alert Log",
                        "document_name": alt.name,
                        "email_content": f"<p>Reminder #{new_count}: {alt.message}</p>"
                    })
                    nl.insert(ignore_permissions=True)
                except Exception:
                    pass

            # Email Reminder
            if not alt.is_test_record:
                emails = [r[0] for r in frappe.db.sql("""
                    SELECT u.email FROM `tabUser` u
                    JOIN `tabHas Role` hr ON hr.parent = u.name
                    WHERE hr.role = %s AND u.enabled = 1 AND u.email != ''
                """, (alt.recipient_role,))]
                if emails:
                    try:
                        frappe.sendmail(
                            recipients=emails,
                            subject=reminder_title,
                            message=f"<p><strong>{reminder_title}</strong></p><p>{alt.message}</p><p><strong>Action Required:</strong> {alt.action_required}</p>",
                            reference_doctype="Fleet Alert Log",
                            reference_name=alt.name,
                            now=False
                        )
                    except Exception:
                        pass
            reminders_sent += 1

    if reminders_sent > 0:
        frappe.db.commit()
    return reminders_sent
