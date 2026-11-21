"""
fix_item_groups.py
Creates all required Item Groups in ERPNext / Frappe database natively:
- Spare Parts
- Consumables
- Lubricants
- Tyres
- Mechanical
- Electrical
- Batteries
- Brake System
- Engine Parts
All under parent "All Item Groups".
"""

import frappe

def create_item_groups():
    frappe.init(site="frontend")
    frappe.connect()

    item_groups = [
        "Spare Parts",
        "Consumables",
        "Lubricants",
        "Tyres",
        "Mechanical",
        "Electrical",
        "Batteries",
        "Brake System",
        "Engine Parts",
        "Suspension and Steering",
        "Transmission and Drivetrain",
        "Filters and Lubricants",
        "Electrical and Battery",
        "Tyres and Wheels",
        "Hydraulic Parts",
        "Fleet Spare Parts"
    ]

    print("=== CHECKING AND CREATING ITEM GROUPS IN ERPNEXT ===")
    for group_name in item_groups:
        if not frappe.db.exists("Item Group", group_name):
            doc = frappe.get_doc({
                "doctype": "Item Group",
                "item_group_name": group_name,
                "parent_item_group": "All Item Groups",
                "is_group": 0
            })
            doc.insert(ignore_permissions=True)
            print(f"Created Item Group: {group_name}")
        else:
            print(f"Item Group already exists: {group_name}")

    frappe.db.commit()
    print("All item groups committed successfully!")

if __name__ == "__main__":
    create_item_groups()
