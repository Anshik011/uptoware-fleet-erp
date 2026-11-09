import frappe
from frappe.permissions import setup_custom_perms

def setup():
    import frappe
    from frappe.permissions import setup_custom_perms
    setup_custom_perms("Account")
    for r in ["Accountant", "Fleet Manager", "Store Manager"]:
        perm = frappe.db.get_value("Custom DocPerm", {"parent": "Account", "role": r}, "name")
        if perm:
            dp = frappe.get_doc("Custom DocPerm", perm)
            dp.read = 1
            dp.select = 1
            dp.report = 1
            dp.save(ignore_permissions=True)
        else:
            frappe.get_doc({
                "doctype": "Custom DocPerm",
                "parent": "Account",
                "parenttype": "DocType",
                "parentfield": "permissions",
                "role": r,
                "read": 1,
                "select": 1,
                "report": 1
            }).insert(ignore_permissions=True)
        print(f"Configured Custom DocPerm for {r} on Account.")

    # Also check Cost Center
    setup_custom_perms("Cost Center")
    for r in ["Accountant", "Fleet Manager", "Store Manager"]:
        perm_cc = frappe.db.get_value("Custom DocPerm", {"parent": "Cost Center", "role": r}, "name")
        if perm_cc:
            dp = frappe.get_doc("Custom DocPerm", perm_cc)
            dp.read = 1
            dp.select = 1
            dp.report = 1
            dp.save(ignore_permissions=True)
        else:
            frappe.get_doc({
                "doctype": "Custom DocPerm",
                "parent": "Cost Center",
                "parenttype": "DocType",
                "parentfield": "permissions",
                "role": r,
                "read": 1,
                "select": 1,
                "report": 1
            }).insert(ignore_permissions=True)
        print(f"Configured Custom DocPerm for {r} on Cost Center.")

    frappe.db.commit()

if __name__ == '__main__':
    setup()
