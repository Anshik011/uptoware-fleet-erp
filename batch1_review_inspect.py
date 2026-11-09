import frappe
import json

def run():
    print("=== 1. VEHICLE DOCTYPE METADATA INSPECTION ===")
    veh_meta = frappe.get_meta("Vehicle")
    standard_fields = []
    custom_fields = []
    for f in veh_meta.fields:
        field_info = {
            "fieldname": f.fieldname,
            "label": f.label,
            "fieldtype": f.fieldtype,
            "options": f.options if f.fieldtype == "Select" else None,
            "reqd": f.reqd,
            "is_custom": getattr(f, "is_custom_field", 0)
        }
        if getattr(f, "is_custom_field", 0):
            custom_fields.append(field_info)
        else:
            standard_fields.append(field_info)

    print(f"Total Standard Fields in Vehicle: {len(standard_fields)}")
    print("Standard Fields:")
    for sf in standard_fields:
        print(f"  - {sf['fieldname']} ({sf['fieldtype']}) : '{sf['label']}'")

    print(f"\nTotal Custom Fields in Vehicle: {len(custom_fields)}")
    print("Custom Fields:")
    for cf in custom_fields:
        print(f"  - {cf['fieldname']} ({cf['fieldtype']}) : '{cf['label']}'")

    # Specifically check for any field resembling status
    status_like_std = [f for f in standard_fields if "status" in f["fieldname"].lower() or "status" in (f["label"] or "").lower()]
    print(f"\nStandard status-like fields found: {status_like_std}")

    print("\n=== 2. DRIVER DOCTYPE METADATA INSPECTION ===")
    drv_meta = frappe.get_meta("Driver")
    drv_std = []
    drv_cust = []
    for f in drv_meta.fields:
        info = {
            "fieldname": f.fieldname,
            "label": f.label,
            "fieldtype": f.fieldtype,
            "options": f.options if f.fieldtype == "Select" else None,
            "reqd": f.reqd
        }
        if getattr(f, "is_custom_field", 0):
            drv_cust.append(info)
        else:
            drv_std.append(info)

    print(f"Total Standard Fields in Driver: {len(drv_std)}")
    for sf in drv_std:
        print(f"  - {sf['fieldname']} ({sf['fieldtype']}) : '{sf['label']}' (Options: {sf['options']})")

    print(f"\nTotal Custom Fields in Driver: {len(drv_cust)}")
    for cf in drv_cust:
        print(f"  - {cf['fieldname']} ({cf['fieldtype']}) : '{cf['label']}'")

    print("\n=== 3. EXISTING RECORDS INSPECTION ===")
    vehicles = frappe.get_all("Vehicle", fields=["name", "license_plate", "make", "model", "vehicle_status", "assigned_driver", "creation"])
    print(f"Existing Vehicles in Database ({len(vehicles)}):")
    for v in vehicles:
        print(f"  - {v}")

    drivers = frappe.get_all("Driver", fields=["name", "full_name", "status", "assigned_vehicle", "creation"])
    print(f"Existing Drivers in Database ({len(drivers)}):")
    for d in drivers:
        print(f"  - {d}")

    print("\n=== 4. GPS FIELD CHECK ===")
    gps_cf = frappe.db.get_value("Custom Field", {"dt": "Vehicle", "fieldname": "gps_device_id"}, ["name", "fieldname", "label"], as_dict=True)
    print(f"Custom Field Vehicle-gps_device_id exists: {gps_cf}")

run()
