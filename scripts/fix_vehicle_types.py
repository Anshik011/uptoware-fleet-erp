"""
fix_vehicle_types.py
Adds missing common vehicle types (Tipper, Dumper, Trailer) to Fleet Vehicle Type DocType
so they are available in dropdowns and pass validation natively in ERPNext.
"""

import frappe

def seed_vehicle_types():
    frappe.init(site="frontend")
    frappe.connect()

    extra_types = [
        {
            "name": "Tipper",
            "vehicle_type_name": "Tipper",
            "category": "Heavy Haulage",
            "default_payload_capacity_tons": 35,
            "description": "Heavy commercial multi-axle tipper / dumper truck for bulk mineral haulage.",
            "is_active": 1
        },
        {
            "name": "Dumper",
            "vehicle_type_name": "Dumper",
            "category": "Heavy Haulage",
            "default_payload_capacity_tons": 40,
            "description": "Off-highway or highway dump truck for pit-head haulage.",
            "is_active": 1
        },
        {
            "name": "Trailer",
            "vehicle_type_name": "Trailer",
            "category": "Heavy Haulage",
            "default_payload_capacity_tons": 45,
            "description": "Heavy tractor trailer for bulk transport.",
            "is_active": 1
        }
    ]

    for vt in extra_types:
        if not frappe.db.exists("Fleet Vehicle Type", vt["name"]):
            doc = frappe.get_doc({
                "doctype": "Fleet Vehicle Type",
                **vt
            })
            doc.insert(ignore_permissions=True)
            print(f"Created Fleet Vehicle Type: {vt['name']}")
        else:
            print(f"Fleet Vehicle Type already exists: {vt['name']}")

    frappe.db.commit()
    print("Fleet Vehicle Types updated successfully!")

if __name__ == "__main__":
    seed_vehicle_types()
