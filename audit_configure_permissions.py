import frappe

def run():
    print("=== CONFIGURING CUSTOM DOCPERM FOR WORKSHOP SUPERVISOR ===")
    
    # 1. Stock Entry permission for Workshop Supervisor
    perm_se = frappe.db.get_value("Custom DocPerm", {"parent": "Stock Entry", "role": "Workshop Supervisor"}, "name")
    if perm_se:
        dp = frappe.get_doc("Custom DocPerm", perm_se)
        dp.read = 1
        dp.write = 1
        dp.create = 1
        dp.submit = 1
        dp.cancel = 0
        dp.delete = 0
        dp.report = 1
        dp.save(ignore_permissions=True)
        print("Updated Custom DocPerm on Stock Entry for Workshop Supervisor: read=1, write=1, create=1, submit=1, cancel=0, delete=0")
    else:
        frappe.get_doc({
            "doctype": "Custom DocPerm",
            "parent": "Stock Entry",
            "parenttype": "DocType",
            "parentfield": "permissions",
            "role": "Workshop Supervisor",
            "read": 1, "write": 1, "create": 1, "submit": 1, "cancel": 0, "delete": 0, "report": 1
        }).insert(ignore_permissions=True)
        print("Created Custom DocPerm on Stock Entry for Workshop Supervisor.")

    # 2. Item permission for Workshop Supervisor
    perm_item = frappe.db.get_value("Custom DocPerm", {"parent": "Item", "role": "Workshop Supervisor"}, "name")
    if perm_item:
        dp = frappe.get_doc("Custom DocPerm", perm_item)
        dp.read = 1
        dp.write = 0
        dp.create = 0
        dp.delete = 0
        dp.report = 1
        dp.save(ignore_permissions=True)
        print("Updated Custom DocPerm on Item for Workshop Supervisor: read=1, write=0, create=0, delete=0")

    # 3. Store Manager permissions
    perm_se_sm = frappe.db.get_value("Custom DocPerm", {"parent": "Stock Entry", "role": "Store Manager"}, "name")
    if perm_se_sm:
        dp = frappe.get_doc("Custom DocPerm", perm_se_sm)
        dp.read = 1
        dp.write = 1
        dp.create = 1
        dp.submit = 1
        dp.cancel = 1
        dp.delete = 0
        dp.report = 1
        dp.save(ignore_permissions=True)
        print("Updated Custom DocPerm on Stock Entry for Store Manager: read=1, write=1, create=1, submit=1, cancel=1, delete=0")

    perm_item_sm = frappe.db.get_value("Custom DocPerm", {"parent": "Item", "role": "Store Manager"}, "name")
    if perm_item_sm:
        dp = frappe.get_doc("Custom DocPerm", perm_item_sm)
        dp.read = 1
        dp.write = 1
        dp.create = 1
        dp.delete = 0
        dp.report = 1
        dp.save(ignore_permissions=True)
        print("Updated Custom DocPerm on Item for Store Manager: read=1, write=1, create=1, delete=0")

    frappe.clear_cache()
    frappe.db.commit()
    print("Permissions configured successfully.")

run()

