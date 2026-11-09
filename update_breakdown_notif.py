import frappe

def update_breakdown_notif_script():
    frappe.init("frontend")
    frappe.connect()

    name = "Vehicle Breakdown - Notification Events"
    script = """fs = frappe.get_single("Fleet Settings")
if not fs or not fs.enable_fleet_notifications or not fs.enable_maintenance_alerts:
    pass
else:
    role = fs.maintenance_alert_role or "Workshop Supervisor"
    vd_role = fs.vehicle_driver_alert_role or "Fleet Manager"
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
    elif st == "Approved":
        title = f"Breakdown Approved: {doc.vehicle}"
        severity = "High"
        action = f"Vehicle {doc.vehicle} is approved for workshop admission. Do not dispatch."
        msg = f"Vehicle Breakdown {doc.name} for {doc.vehicle} has been approved."
        
        # Also create Vehicle Unavailable for Dispatch alert under Vehicle & Driver
        unavail_title = f"Vehicle Unavailable for Dispatch: {doc.vehicle}"
        if not frappe.db.exists("Fleet Alert Log", {"source_doctype": "Vehicle", "source_name": doc.vehicle, "alert_title": unavail_title, "status": ["!=", "Resolved"]}):
            unavail_alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": unavail_title,
                "alert_category": "Vehicle & Driver",
                "severity": "High",
                "status": "Unread",
                "source_doctype": "Vehicle",
                "source_name": doc.vehicle,
                "vehicle": doc.vehicle,
                "driver": doc.driver,
                "recipient_role": vd_role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": "Vehicle has entered breakdown state. Do not assign to new mining trips.",
                "message": f"Vehicle {doc.vehicle} status changed to 'Breakdown' under Breakdown {doc.name}.",
                "is_test_record": doc.is_test_record or 0
            })
            unavail_alt.insert(ignore_permissions=True)
            if fs.enable_in_app_notifications:
                users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (vd_role,))
                for u in users:
                    try:
                        frappe.get_doc({"doctype": "Notification Log", "subject": unavail_title, "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": unavail_alt.name, "email_content": unavail_alt.message}).insert(ignore_permissions=True)
                    except Exception:
                        pass
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
        # Also auto-resolve vehicle unavailable alert
        v_alts = frappe.get_all("Fleet Alert Log", filters={"source_doctype": "Vehicle", "source_name": doc.vehicle, "alert_title": f"Vehicle Unavailable for Dispatch: {doc.vehicle}", "status": ["!=", "Resolved"]}, fields=["name"])
        for va in v_alts:
            frappe.db.set_value("Fleet Alert Log", va.name, {"status": "Resolved", "resolved_on": now_dt, "resolved_by": frappe.session.user or "Administrator", "resolution_note": "Vehicle repaired and returned to active service."}, update_modified=False)

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
    ss = frappe.get_doc("Server Script", name)
    ss.script = script
    ss.save(ignore_permissions=True)
    frappe.db.commit()
    print("Updated Vehicle Breakdown - Notification Events with Approved & Vehicle Unavailable integration.")

if __name__ == "__main__":
    update_breakdown_notif_script()

