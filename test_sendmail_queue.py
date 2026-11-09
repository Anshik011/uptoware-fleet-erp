import frappe

def run():
    before_cnt = frappe.db.count("Email Queue")
    frappe.sendmail(
        recipients=["test_fleet_mgr@uptoware.local"],
        subject="Test Expiry Alert Subject",
        message="<p>Test Expiry Alert Body</p>",
        now=False
    )
    frappe.db.commit()
    after_cnt = frappe.db.count("Email Queue")
    print(f"Email Queue before={before_cnt}, after={after_cnt}")
    latest = frappe.get_all("Email Queue", order_by="creation desc", limit=1, fields=["name", "status", "message"])
    print("Latest Email Queue entry:", latest)

    # Clean up test email queue
    if latest:
        frappe.delete_doc("Email Queue", latest[0].name, force=1)
        frappe.db.commit()

run()

