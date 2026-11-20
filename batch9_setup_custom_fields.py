import frappe

def run():
    from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
    print("=== CONFIGURING BATCH 9 CUSTOM FIELDS ===")

    # 1. Custom fields for standard ERPNext DocTypes: Sales Invoice and Sales Invoice Item
    custom_fields = {
        "Sales Invoice": [
            {
                "fieldname": "custom_fleet_section",
                "label": "Fleet Revenue & Operations",
                "fieldtype": "Section Break",
                "insert_after": "customer"
            },
            {
                "fieldname": "custom_mining_trip",
                "label": "Mining Trip",
                "fieldtype": "Link",
                "options": "Mining Trip",
                "unique": 1,
                "insert_after": "custom_fleet_section"
            },
            {
                "fieldname": "custom_vehicle",
                "label": "Vehicle",
                "fieldtype": "Link",
                "options": "Vehicle",
                "insert_after": "custom_mining_trip"
            },
            {
                "fieldname": "custom_mine_site",
                "label": "Mine Site",
                "fieldtype": "Link",
                "options": "Mine Site",
                "insert_after": "custom_vehicle"
            },
            {
                "fieldname": "custom_is_test_record",
                "label": "Is Test Record",
                "fieldtype": "Check",
                "default": "0",
                "insert_after": "custom_mine_site"
            }
        ],
        "Sales Invoice Item": [
            {
                "fieldname": "custom_mining_trip",
                "label": "Mining Trip",
                "fieldtype": "Link",
                "options": "Mining Trip",
                "insert_after": "description"
            },
            {
                "fieldname": "custom_vehicle",
                "label": "Vehicle",
                "fieldtype": "Link",
                "options": "Vehicle",
                "insert_after": "custom_mining_trip"
            },
            {
                "fieldname": "custom_mine_site",
                "label": "Mine Site",
                "fieldtype": "Link",
                "options": "Mine Site",
                "insert_after": "custom_vehicle"
            }
        ],
        "Contract": [
            {
                "fieldname": "custom_fleet_billing_section",
                "label": "Fleet Billing Authority",
                "fieldtype": "Section Break",
                "insert_after": "end_date"
            },
            {
                "fieldname": "custom_mine_site",
                "label": "Mine Site",
                "fieldtype": "Link",
                "options": "Mine Site",
                "insert_after": "custom_fleet_billing_section"
            },
            {
                "fieldname": "custom_rate_per_ton",
                "label": "Approved Rate per Ton",
                "fieldtype": "Currency",
                "insert_after": "custom_mine_site",
                "description": "No default. Enter only the commercially approved contract rate."
            },
            {
                "fieldname": "custom_service_item",
                "label": "Sales Service Item",
                "fieldtype": "Link",
                "options": "Item",
                "insert_after": "custom_rate_per_ton",
                "description": "Existing enabled ERPNext sales Item authorized for this contract."
            },
            {
                "fieldname": "custom_billing_approved",
                "label": "Approved for Fleet Billing",
                "fieldtype": "Check",
                "default": "0",
                "insert_after": "custom_service_item"
            },
            {
                "fieldname": "custom_billing_approved_by",
                "label": "Billing Approved By",
                "fieldtype": "Link",
                "options": "User",
                "insert_after": "custom_billing_approved"
            },
            {
                "fieldname": "custom_billing_approved_on",
                "label": "Billing Approved On",
                "fieldtype": "Datetime",
                "insert_after": "custom_billing_approved_by"
            }
        ]
    }

    create_custom_fields(custom_fields, ignore_validate=True)
    frappe.db.commit()
    print("Created custom fields on Sales Invoice and Sales Invoice Item.")

    # 2. Add sales_invoice and billing_status to Mining Trip DocType
    mt_dt = frappe.get_doc("DocType", "Mining Trip")
    existing_fields = [f.fieldname for f in mt_dt.fields]

    fields_to_add = []
    if "sales_invoice" not in existing_fields:
        fields_to_add.append({
            "fieldname": "sales_invoice",
            "label": "Sales Invoice Ref",
            "fieldtype": "Link",
            "options": "Sales Invoice",
            "read_only": 1,
            "insert_after": "billing_note"
        })
    if "billing_status" not in existing_fields:
        fields_to_add.append({
            "fieldname": "billing_status",
            "label": "Billing Status",
            "fieldtype": "Select",
            "options": "Unbilled\nInvoiced\nPartially Paid\nPaid\nCancelled",
            "default": "Unbilled",
            "read_only": 0,
            "insert_after": "sales_invoice" if "sales_invoice" not in existing_fields else "sales_invoice"
        })

    if fields_to_add:
        for fld in fields_to_add:
            mt_dt.append("fields", fld)
        mt_dt.save(ignore_permissions=True)
        frappe.db.commit()
        print(f"Added {[f['fieldname'] for f in fields_to_add]} to Mining Trip DocType.")
    else:
        print("Fields already exist on Mining Trip DocType.")

    frappe.clear_cache()
    print("=== BATCH 9 CUSTOM FIELDS CONFIGURED SUCCESSFULLY ===")

if __name__ == "__main__":
    run()
