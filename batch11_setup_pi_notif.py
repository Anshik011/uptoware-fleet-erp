import frappe

def setup_pi_notif_script():
    frappe.init("frontend")
    frappe.connect()

    name = "Purchase Invoice - Notification Events"
    script = """fs = frappe.get_single("Fleet Settings")
if not fs or not fs.enable_fleet_notifications or not (fs.enable_procurement_alerts if fs.enable_procurement_alerts is not None else 1):
    pass
else:
    role = fs.procurement_alert_role or "Store Manager"
    now_dt = frappe.utils.now_datetime()
    title = f"Purchase Invoice Submitted: {doc.name}"
    exists = frappe.db.exists("Fleet Alert Log", {"source_doctype": "Purchase Invoice", "source_name": doc.name, "alert_title": title, "status": ["!=", "Resolved"]})
    if not exists:
        alt = frappe.get_doc({
            "doctype": "Fleet Alert Log",
            "alert_title": title,
            "alert_category": "Procurement",
            "severity": "Low",
            "status": "Unread",
            "source_doctype": "Purchase Invoice",
            "source_name": doc.name,
            "recipient_role": role,
            "delivery_channel": "In-App and Email",
            "alert_timestamp": now_dt,
            "action_required": f"Verify supplier invoice for ₹{doc.base_grand_total} due on {doc.due_date}.",
            "message": f"Purchase Invoice {doc.name} submitted for supplier {doc.supplier} for ₹{doc.base_grand_total}.",
            "is_test_record": 0
        })
        alt.insert(ignore_permissions=True)
        if fs.enable_in_app_notifications:
            users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (role,))
            for u in users:
                try:
                    frappe.get_doc({"doctype": "Notification Log", "subject": title, "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": alt.name, "email_content": alt.message}).insert(ignore_permissions=True)
                except Exception:
                    pass
"""
    if frappe.db.exists("Server Script", name):
        ss = frappe.get_doc("Server Script", name)
        ss.script = script
        ss.script_type = "DocType Event"
        ss.reference_doctype = "Purchase Invoice"
        ss.doctype_event = "After Submit"
        ss.disabled = 0
        ss.save(ignore_permissions=True)
        print(f"Updated Server Script: {name}")
    else:
        ss = frappe.get_doc({
            "doctype": "Server Script",
            "name": name,
            "script_type": "DocType Event",
            "reference_doctype": "Purchase Invoice",
            "doctype_event": "After Submit",
            "disabled": 0,
            "script": script
        })
        ss.insert(ignore_permissions=True)
        print(f"Created Server Script: {name}")

    frappe.db.commit()

if __name__ == "__main__":
    setup_pi_notif_script()

