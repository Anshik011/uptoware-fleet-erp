import frappe

def run():
    print("=== BATCH 6: CONFIGURING CUSTOM FIELDS & DOCTYPE SCHEMA ===")

    # 1. Custom Fields on Item
    item_fields = [
        {
            "dt": "Item",
            "fieldname": "custom_part_number",
            "label": "Part Number / OEM Ref",
            "fieldtype": "Data",
            "insert_after": "item_name",
            "in_list_view": 1,
            "in_standard_filter": 1
        },
        {
            "dt": "Item",
            "fieldname": "custom_compatible_vehicle_model",
            "label": "Compatible Vehicle Model",
            "fieldtype": "Data",
            "insert_after": "custom_part_number",
            "in_list_view": 1,
            "in_standard_filter": 1
        },
        {
            "dt": "Item",
            "fieldname": "custom_preferred_supplier",
            "label": "Preferred Supplier",
            "fieldtype": "Link",
            "options": "Supplier",
            "insert_after": "brand",
            "in_standard_filter": 1
        },
        {
            "dt": "Item",
            "fieldname": "custom_reorder_level",
            "label": "Reorder Level",
            "fieldtype": "Float",
            "default": "0.0",
            "insert_after": "safety_stock"
        },
        {
            "dt": "Item",
            "fieldname": "custom_reorder_qty",
            "label": "Reorder Quantity",
            "fieldtype": "Float",
            "default": "0.0",
            "insert_after": "custom_reorder_level"
        },
        {
            "dt": "Item",
            "fieldname": "custom_is_test_record",
            "label": "Is Test Record",
            "fieldtype": "Check",
            "default": "0",
            "insert_after": "disabled",
            "in_standard_filter": 1
        }
    ]

    for f in item_fields:
        cf_name = f"{f['dt']}-{f['fieldname']}"
        if not frappe.db.exists("Custom Field", cf_name):
            frappe.get_doc({
                "doctype": "Custom Field",
                **f
            }).insert(ignore_permissions=True)
            print(f"Created Custom Field on Item: {f['fieldname']}")
        else:
            print(f"Custom Field on Item {f['fieldname']} already exists.")

    # 2. Custom Fields on Stock Entry
    se_fields = [
        {
            "dt": "Stock Entry",
            "fieldname": "custom_is_return",
            "label": "Is Parts Return",
            "fieldtype": "Check",
            "default": "0",
            "insert_after": "custom_vehicle"
        }
    ]

    for f in se_fields:
        cf_name = f"{f['dt']}-{f['fieldname']}"
        if not frappe.db.exists("Custom Field", cf_name):
            frappe.get_doc({
                "doctype": "Custom Field",
                **f
            }).insert(ignore_permissions=True)
            print(f"Created Custom Field on Stock Entry: {f['fieldname']}")
        else:
            print(f"Custom Field on Stock Entry {f['fieldname']} already exists.")

    # 3. Update Child DocType: Vehicle Breakdown Part to add returned_qty and net_issued_qty
    child_dt = frappe.get_doc("DocType", "Vehicle Breakdown Part")
    existing_child_fnames = [f.fieldname for f in child_dt.fields]

    if "returned_qty" not in existing_child_fnames:
        child_dt.append("fields", {
            "fieldname": "returned_qty",
            "label": "Returned Qty",
            "fieldtype": "Float",
            "default": "0.0",
            "read_only": 1,
            "in_list_view": 1,
            "columns": 1
        })
        print("Added 'returned_qty' to Vehicle Breakdown Part.")

    if "net_issued_qty" not in existing_child_fnames:
        child_dt.append("fields", {
            "fieldname": "net_issued_qty",
            "label": "Net Issued Qty",
            "fieldtype": "Float",
            "default": "0.0",
            "read_only": 1,
            "in_list_view": 1,
            "columns": 1
        })
        print("Added 'net_issued_qty' to Vehicle Breakdown Part.")

    child_dt.save(ignore_permissions=True)
    print("Saved DocType 'Vehicle Breakdown Part'.")

    # 4. DocPerm for Store Manager on Stock Entry and Item using Custom DocPerm
    if not frappe.db.exists("Custom DocPerm", {"parent": "Stock Entry", "role": "Store Manager"}):
        frappe.get_doc({
            "doctype": "Custom DocPerm",
            "parent": "Stock Entry",
            "parenttype": "DocType",
            "parentfield": "permissions",
            "role": "Store Manager",
            "read": 1, "write": 1, "create": 1, "submit": 1, "cancel": 1, "delete": 0, "report": 1
        }).insert(ignore_permissions=True)
        print("Configured Store Manager permissions on Stock Entry via Custom DocPerm.")

    if not frappe.db.exists("Custom DocPerm", {"parent": "Item", "role": "Store Manager"}):
        frappe.get_doc({
            "doctype": "Custom DocPerm",
            "parent": "Item",
            "parenttype": "DocType",
            "parentfield": "permissions",
            "role": "Store Manager",
            "read": 1, "write": 1, "create": 1, "delete": 0, "report": 1
        }).insert(ignore_permissions=True)
        print("Configured Store Manager permissions on Item via Custom DocPerm.")

    if not frappe.db.exists("Custom DocPerm", {"parent": "Item", "role": "Workshop Supervisor"}):
        frappe.get_doc({
            "doctype": "Custom DocPerm",
            "parent": "Item",
            "parenttype": "DocType",
            "parentfield": "permissions",
            "role": "Workshop Supervisor",
            "read": 1, "write": 0, "create": 0, "delete": 0, "report": 1
        }).insert(ignore_permissions=True)
        print("Configured Workshop Supervisor permissions on Item via Custom DocPerm.")

    if not frappe.db.exists("Custom DocPerm", {"parent": "Stock Entry", "role": "Workshop Supervisor"}):
        frappe.get_doc({
            "doctype": "Custom DocPerm",
            "parent": "Stock Entry",
            "parenttype": "DocType",
            "parentfield": "permissions",
            "role": "Workshop Supervisor",
            "read": 1, "write": 0, "create": 0, "submit": 0, "cancel": 0, "delete": 0, "report": 1
        }).insert(ignore_permissions=True)
        print("Configured Workshop Supervisor permissions on Stock Entry via Custom DocPerm.")

    frappe.clear_cache()
    frappe.db.commit()
    print("=== BATCH 6 CUSTOM FIELDS & SCHEMA UPDATED SUCCESSFULLY ===")

run()
