import frappe

def run():
    print("=== BATCH 6: SETTING UP ITEM GROUPS & WAREHOUSES ===")

    # 1. Ensure Item Group hierarchy
    parent_group = "Fleet Spare Parts"
    if not frappe.db.exists("Item Group", parent_group):
        ig = frappe.get_doc({
            "doctype": "Item Group",
            "item_group_name": parent_group,
            "parent_item_group": "All Item Groups",
            "is_group": 1
        }).insert(ignore_permissions=True)
        print(f"Created Item Group: {parent_group}")
    else:
        print(f"Item Group {parent_group} already exists.")

    sub_groups = [
        "Hydraulic Parts",
        "Engine Parts",
        "Brake System",
        "Tyres and Wheels",
        "Electrical and Battery",
        "Filters and Lubricants",
        "Transmission and Drivetrain",
        "Suspension and Steering",
        "Consumables and Hardware"
    ]

    for sg in sub_groups:
        if not frappe.db.exists("Item Group", sg):
            frappe.get_doc({
                "doctype": "Item Group",
                "item_group_name": sg,
                "parent_item_group": parent_group,
                "is_group": 0
            }).insert(ignore_permissions=True)
            print(f"Created Sub Item Group: {sg}")
        else:
            print(f"Sub Item Group {sg} already exists.")

    # 2. Ensure Warehouses for Uptoware
    company = "Uptoware"
    site_warehouses = [
        {"name": "Kudremukh Spares - U", "warehouse_name": "Kudremukh Spares"},
        {"name": "Donimalai Spares - U", "warehouse_name": "Donimalai Spares"}
    ]

    for wh in site_warehouses:
        if not frappe.db.exists("Warehouse", wh["name"]):
            frappe.get_doc({
                "doctype": "Warehouse",
                "warehouse_name": wh["warehouse_name"],
                "company": company,
                "parent_warehouse": "All Warehouses - U",
                "is_group": 0
            }).insert(ignore_permissions=True)
            print(f"Created Warehouse: {wh['name']}")
        else:
            print(f"Warehouse {wh['name']} already exists.")

    # 3. Ensure Store Manager role
    if not frappe.db.exists("Role", "Store Manager"):
        frappe.get_doc({
            "doctype": "Role",
            "role_name": "Store Manager"
        }).insert(ignore_permissions=True)
        print("Created Role: Store Manager")
    else:
        print("Role Store Manager already exists.")

    frappe.clear_cache()
    frappe.db.commit()
    print("=== ITEM GROUPS, WAREHOUSES & ROLES CONFIGURED SUCCESSFULLY ===")

run()

