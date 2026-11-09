import frappe

perms = frappe.db.sql("SELECT name, role, `read`, `write`, `create`, `delete`, `report` FROM `tabDocPerm` WHERE parent = 'Vehicle Breakdown'", as_dict=True)
print("=== TABDOCPERM IN DATABASE ===")
for p in perms:
    print(p)
