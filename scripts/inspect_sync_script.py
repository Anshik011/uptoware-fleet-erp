import frappe

frappe.init(site="frontend")
frappe.connect()

script = frappe.get_doc("Server Script", "Employee - Driver Lifecycle Sync")
print("=== SCRIPT: Employee - Driver Lifecycle Sync ===")
print(script.script)
