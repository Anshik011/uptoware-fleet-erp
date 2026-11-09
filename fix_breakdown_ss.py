import frappe

def fix_breakdown_server_script():
    frappe.init("frontend")
    frappe.connect()

    ss = frappe.get_doc("Server Script", "Vehicle Breakdown - Notification Events")
    ss.script = ss.script.replace('frappe.get_single("Fleet Settings")', 'frappe.get_doc("Fleet Settings")')
    ss.save(ignore_permissions=True)
    frappe.db.commit()
    print("Fixed Vehicle Breakdown - Notification Events Server Script.")

if __name__ == "__main__":
    fix_breakdown_server_script()

