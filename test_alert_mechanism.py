import frappe

def test_alert_creation():
    frappe.init("frontend")
    frappe.connect()

    title = "TEST: Operational Alert Verification"
    category = "Trip Operations"
    severity = "High"
    role = "Fleet Manager"

    # Insert test Fleet Alert Log
    alert = frappe.get_doc({
        "doctype": "Fleet Alert Log",
        "alert_title": title,
        "alert_category": category,
        "severity": severity,
        "status": "Unread",
        "source_doctype": "Mining Trip",
        "source_name": "TRIP-TEST-0001",
        "recipient_role": role,
        "delivery_channel": "In-App and Email",
        "alert_timestamp": frappe.utils.now_datetime(),
        "action_required": "Confirm weighbridge net weight",
        "message": "Trip TRIP-TEST-0001 has been dispatched and is awaiting weighbridge confirmation.",
        "is_test_record": 1
    })
    alert.insert(ignore_permissions=True)
    print(f"Created Fleet Alert Log: {alert.name}")

    # Create native Notification Log for test_fleet_mgr@uptoware.local
    user = "test_fleet_mgr@uptoware.local"
    nl = frappe.get_doc({
        "doctype": "Notification Log",
        "subject": title,
        "for_user": user,
        "type": "Alert",
        "document_type": "Fleet Alert Log",
        "document_name": alert.name,
        "email_content": alert.message
    })
    nl.insert(ignore_permissions=True)
    print(f"Created native Notification Log: {nl.name} for {user}")

    # Test frappe.sendmail queueing
    try:
        frappe.sendmail(
            recipients=[user],
            subject=f"[{severity.upper()}] {title}",
            message=f"<p>{alert.message}</p>",
            reference_doctype="Fleet Alert Log",
            reference_name=alert.name,
            now=False
        )
        print("frappe.sendmail queued email successfully.")
        # Check tabEmail Queue
        eq = frappe.db.get_value("Email Queue", {"reference_doctype": "Fleet Alert Log", "reference_name": alert.name}, ["name", "status"], as_dict=True)
        print("Found in Email Queue:", eq)
    except Exception as e:
        print("sendmail error:", e)

    # Clean up test records
    frappe.delete_doc("Notification Log", nl.name, ignore_permissions=True)
    if eq:
        frappe.delete_doc("Email Queue", eq.name, ignore_permissions=True)
    frappe.delete_doc("Fleet Alert Log", alert.name, ignore_permissions=True)
    frappe.db.commit()
    print("Test records cleaned up cleanly.")

if __name__ == "__main__":
    test_alert_creation()

