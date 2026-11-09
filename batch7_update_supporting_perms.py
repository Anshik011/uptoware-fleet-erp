import frappe
from frappe.permissions import setup_custom_perms

def update_perms():
    import frappe
    from frappe.permissions import setup_custom_perms
    print("=== CONFIGURING SUPPORTING ROLE PERMISSIONS ===")

    # 1. Item permissions for Fleet Manager and Accountant
    for role in ["Fleet Manager", "Accountant"]:
        perm = frappe.db.get_value("Custom DocPerm", {"parent": "Item", "role": role}, "name")
        if perm:
            dp = frappe.get_doc("Custom DocPerm", perm)
            dp.read = 1
            dp.report = 1
            dp.save(ignore_permissions=True)
        else:
            frappe.get_doc({
                "doctype": "Custom DocPerm",
                "parent": "Item",
                "parenttype": "DocType",
                "parentfield": "permissions",
                "role": role,
                "read": 1,
                "report": 1
            }).insert(ignore_permissions=True)
        print(f"Added Item read/report for {role}")

    # 2. Warehouse permissions for Fleet Manager, Accountant, Workshop Supervisor, Store Manager
    setup_custom_perms("Warehouse")
    for role in ["Fleet Manager", "Accountant", "Workshop Supervisor", "Store Manager"]:
        perm = frappe.db.get_value("Custom DocPerm", {"parent": "Warehouse", "role": role}, "name")
        if perm:
            dp = frappe.get_doc("Custom DocPerm", perm)
            dp.read = 1
            dp.report = 1
            dp.save(ignore_permissions=True)
        else:
            frappe.get_doc({
                "doctype": "Custom DocPerm",
                "parent": "Warehouse",
                "parenttype": "DocType",
                "parentfield": "permissions",
                "role": role,
                "read": 1,
                "report": 1
            }).insert(ignore_permissions=True)
        print(f"Added Warehouse read/report for {role}")

    # 3. Cost Center permissions for Fleet Manager and Store Manager
    for role in ["Fleet Manager", "Store Manager"]:
        perm = frappe.db.get_value("Custom DocPerm", {"parent": "Cost Center", "role": role}, "name")
        if perm:
            dp = frappe.get_doc("Custom DocPerm", perm)
            dp.read = 1
            dp.report = 1
            dp.save(ignore_permissions=True)
        else:
            frappe.get_doc({
                "doctype": "Custom DocPerm",
                "parent": "Cost Center",
                "parenttype": "DocType",
                "parentfield": "permissions",
                "role": role,
                "read": 1,
                "report": 1
            }).insert(ignore_permissions=True)
        print(f"Added Cost Center read/report for {role}")

    frappe.db.commit()
    print("Supporting permissions updated successfully.")

if __name__ == '__main__':
    update_perms()
