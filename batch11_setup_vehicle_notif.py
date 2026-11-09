import frappe

def setup_vehicle_notif_script():
    frappe.init("frontend")
    frappe.connect()

    name = "Vehicle - Notification Events"
    script = """fs = frappe.get_single("Fleet Settings")
if not fs or not fs.enable_fleet_notifications or not (fs.enable_vehicle_driver_alerts if fs.enable_vehicle_driver_alerts is not None else 1):
    pass
else:
    role = fs.vehicle_driver_alert_role or "Fleet Manager"
    now_dt = frappe.utils.now_datetime()
    v_st = doc.vehicle_status

    if v_st in ["Breakdown", "Under Maintenance", "Out of Service"]:
        title = f"Vehicle Unavailable for Dispatch: {doc.name}"
        exists = frappe.db.exists("Fleet Alert Log", {"source_doctype": "Vehicle", "source_name": doc.name, "alert_title": title, "status": ["!=", "Resolved"]})
        if not exists:
            alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": title,
                "alert_category": "Vehicle & Driver",
                "severity": "High",
                "status": "Unread",
                "source_doctype": "Vehicle",
                "source_name": doc.name,
                "vehicle": doc.name,
                "recipient_role": role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": f"Vehicle is {v_st}. Do not assign to new mining trips.",
                "message": f"Vehicle {doc.name} status changed to '{v_st}'. Vehicle is removed from active dispatch pool.",
                "is_test_record": doc.is_test_record or 0
            })
            alt.insert(ignore_permissions=True)
            if fs.enable_in_app_notifications:
                users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (role,))
                for u in users:
                    try:
                        frappe.get_doc({"doctype": "Notification Log", "subject": title, "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": alt.name, "email_content": alt.message}).insert(ignore_permissions=True)
                    except Exception:
                        pass
    elif v_st == "Active":
        # Auto-resolve unavailable alerts
        open_alts = frappe.db.sql(\"\"\"
            SELECT name FROM `tabFleet Alert Log`
            WHERE source_doctype = 'Vehicle' AND source_name = %s AND alert_title LIKE 'Vehicle Unavailable for Dispatch%' AND status != 'Resolved'
        \"\"\", (doc.name,))
        for oa in open_alts:
            frappe.db.set_value("Fleet Alert Log", oa[0], {"status": "Resolved", "resolved_on": now_dt, "resolved_by": frappe.session.user or "Administrator", "resolution_note": "Vehicle returned to Active service."}, update_modified=False)
"""
    if frappe.db.exists("Server Script", name):
        ss = frappe.get_doc("Server Script", name)
        ss.script = script
        ss.script_type = "DocType Event"
        ss.reference_doctype = "Vehicle"
        ss.doctype_event = "After Save"
        ss.disabled = 0
        ss.save(ignore_permissions=True)
        print(f"Updated Server Script: {name}")
    else:
        ss = frappe.get_doc({
            "doctype": "Server Script",
            "name": name,
            "script_type": "DocType Event",
            "reference_doctype": "Vehicle",
            "doctype_event": "After Save",
            "disabled": 0,
            "script": script
        })
        ss.insert(ignore_permissions=True)
        print(f"Created Server Script: {name}")

    frappe.db.commit()

if __name__ == "__main__":
    setup_vehicle_notif_script()

