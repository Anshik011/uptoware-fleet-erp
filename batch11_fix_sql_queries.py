import frappe

def fix_sql_like_queries():
    frappe.init("frontend")
    frappe.connect()

    # 1. Fix Vehicle - Notification Events
    v_ss = frappe.get_doc("Server Script", "Vehicle - Notification Events")
    v_ss.script = """fs = frappe.get_doc("Fleet Settings")
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
        open_alts = frappe.get_all("Fleet Alert Log", filters={"source_doctype": "Vehicle", "source_name": doc.name, "status": ["!=", "Resolved"]}, fields=["name", "alert_title"])
        for oa in open_alts:
            if "Vehicle Unavailable for Dispatch" in oa.alert_title:
                frappe.db.set_value("Fleet Alert Log", oa.name, {"status": "Resolved", "resolved_on": now_dt, "resolved_by": frappe.session.user or "Administrator", "resolution_note": "Vehicle returned to Active service."}, update_modified=False)
"""
    v_ss.save(ignore_permissions=True)
    print("Fixed Vehicle - Notification Events.")

    # 2. Fix Vehicle Insurance Policy - Vehicle Sync
    vip_ss = frappe.get_doc("Server Script", "Vehicle Insurance Policy - Vehicle Sync")
    # Replace the SQL query in section C with frappe.get_all
    idx = vip_ss.script.find("# C. Batch 11:")
    if idx != -1:
        prefix = vip_ss.script[:idx]
        new_c = """# C. Batch 11: Alert & auto-resolution on Active policy
if doc.policy_status == "Active":
    fs = frappe.get_doc("Fleet Settings")
    if fs and fs.enable_fleet_notifications and (fs.enable_insurance_compliance_alerts if fs.enable_insurance_compliance_alerts is not None else 1):
        role = fs.insurance_compliance_alert_role or "Fleet Manager"
        now_dt = frappe.utils.now_datetime()
        pol_title = f"Policy Renewal Completed: {doc.name}"
        exists = frappe.db.exists("Fleet Alert Log", {"source_doctype": "Vehicle Insurance Policy", "source_name": doc.name, "alert_title": pol_title, "status": ["!=", "Resolved"]})
        if not exists:
            alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": pol_title,
                "alert_category": "Insurance & Compliance",
                "severity": "Low",
                "status": "Unread",
                "source_doctype": "Vehicle Insurance Policy",
                "source_name": doc.name,
                "vehicle": doc.vehicle,
                "recipient_role": role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": "Insurance coverage active. Verify vehicle statutory summary.",
                "message": f"Insurance policy {doc.policy_no} for vehicle {doc.vehicle} is Active (Valid {doc.start_date} to {doc.end_date}).",
                "is_test_record": doc.is_test_record or 0
            })
            alt.insert(ignore_permissions=True)

        # Auto-resolve existing insurance expiry alerts for this vehicle
        open_alts = frappe.get_all("Fleet Alert Log", filters={"vehicle": doc.vehicle, "alert_category": "Insurance & Compliance", "status": ["!=", "Resolved"]}, fields=["name", "alert_title"])
        for oa in open_alts:
            if "Insurance" in oa.alert_title:
                frappe.db.set_value("Fleet Alert Log", oa.name, {"status": "Resolved", "resolved_on": now_dt, "resolved_by": frappe.session.user or "Administrator", "resolution_note": f"Policy renewed ({doc.name})."}, update_modified=False)
"""
        vip_ss.script = prefix + new_c
        vip_ss.save(ignore_permissions=True)
        print("Fixed Vehicle Insurance Policy - Vehicle Sync.")

    frappe.db.commit()

if __name__ == "__main__":
    fix_sql_like_queries()

