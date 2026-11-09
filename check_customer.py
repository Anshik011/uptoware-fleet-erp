import frappe

def run():
    print("Default Customer Group:", frappe.db.get_single_value("Selling Settings", "customer_group") or frappe.get_all("Customer Group", pluck="name")[:3])
    print("Default Territory:", frappe.db.get_single_value("Selling Settings", "territory") or frappe.get_all("Territory", pluck="name")[:3])
    customers = frappe.get_all("Customer", pluck="name")[:5]
    print("Existing Customers:", customers)

run()
