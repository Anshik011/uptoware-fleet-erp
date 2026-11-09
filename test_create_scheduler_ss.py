import frappe

def run():
    ss_name = "Fleet Management - Daily Expiry Monitoring Scheduler"
    if frappe.db.exists("Server Script", ss_name):
        frappe.delete_doc("Server Script", ss_name)

    doc = frappe.new_doc("Server Script")
    doc.name = ss_name
    doc.script_type = "Scheduler Event"
    doc.event_frequency = "Daily"
    doc.disabled = 0
    doc.script = """# Test scheduler script
print("Executing scheduled task via Server Script")
"""
    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    # Check Scheduled Job Type
    sjt = frappe.get_all("Scheduled Job Type", filters={"server_script": ss_name}, fields=["name", "method", "frequency", "server_script", "stopped"])
    print("Found Scheduled Job Type:", sjt)

    # Clean up test
    frappe.delete_doc("Server Script", ss_name)
    frappe.db.commit()

run()

