import frappe

def setup_custom_fields():
    print("=== CONFIGURING BATCH 7 CUSTOM FIELDS ===")

    # Check if pan exists on Supplier
    supplier_fields = [f.fieldname for f in frappe.get_meta("Supplier").fields]
    pan_field_needed = "pan" not in supplier_fields

    custom_fields = {
        "Supplier": [
            {
                "fieldname": "custom_is_preferred_supplier",
                "label": "Is Preferred Supplier",
                "fieldtype": "Check",
                "default": "0",
                "insert_after": "supplier_type"
            },
            {
                "fieldname": "custom_is_test_record",
                "label": "Is Test Record",
                "fieldtype": "Check",
                "default": "0",
                "insert_after": "custom_is_preferred_supplier"
            }
        ],
        "Material Request": [
            {
                "fieldname": "fleet_procurement_section",
                "label": "Fleet Procurement Details",
                "fieldtype": "Section Break",
                "insert_after": "material_request_type"
            },
            {
                "fieldname": "custom_procurement_type",
                "label": "Procurement Type",
                "fieldtype": "Select",
                "options": "\nSpare Parts Replenishment\nVehicle Breakdown\nVehicle Maintenance\nMine Site Requirement\nGeneral Fleet Operations",
                "default": "Spare Parts Replenishment",
                "insert_after": "fleet_procurement_section"
            },
            {
                "fieldname": "custom_vehicle_breakdown",
                "label": "Vehicle Breakdown",
                "fieldtype": "Link",
                "options": "Vehicle Breakdown",
                "insert_after": "custom_procurement_type"
            },
            {
                "fieldname": "custom_vehicle",
                "label": "Vehicle",
                "fieldtype": "Link",
                "options": "Vehicle",
                "insert_after": "custom_vehicle_breakdown"
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
        "Request for Quotation": [
            {
                "fieldname": "custom_procurement_type",
                "label": "Procurement Type",
                "fieldtype": "Select",
                "options": "\nSpare Parts Replenishment\nVehicle Breakdown\nVehicle Maintenance\nMine Site Requirement\nGeneral Fleet Operations",
                "default": "Spare Parts Replenishment",
                "insert_after": "company"
            },
            {
                "fieldname": "custom_vehicle_breakdown",
                "label": "Vehicle Breakdown",
                "fieldtype": "Link",
                "options": "Vehicle Breakdown",
                "insert_after": "custom_procurement_type"
            },
            {
                "fieldname": "custom_vehicle",
                "label": "Vehicle",
                "fieldtype": "Link",
                "options": "Vehicle",
                "insert_after": "custom_vehicle_breakdown"
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
        "Supplier Quotation": [
            {
                "fieldname": "custom_procurement_type",
                "label": "Procurement Type",
                "fieldtype": "Select",
                "options": "\nSpare Parts Replenishment\nVehicle Breakdown\nVehicle Maintenance\nMine Site Requirement\nGeneral Fleet Operations",
                "default": "Spare Parts Replenishment",
                "insert_after": "company"
            },
            {
                "fieldname": "custom_vehicle_breakdown",
                "label": "Vehicle Breakdown",
                "fieldtype": "Link",
                "options": "Vehicle Breakdown",
                "insert_after": "custom_procurement_type"
            },
            {
                "fieldname": "custom_vehicle",
                "label": "Vehicle",
                "fieldtype": "Link",
                "options": "Vehicle",
                "insert_after": "custom_vehicle_breakdown"
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
        "Purchase Order": [
            {
                "fieldname": "fleet_procurement_section",
                "label": "Fleet Procurement Details",
                "fieldtype": "Section Break",
                "insert_after": "supplier"
            },
            {
                "fieldname": "custom_procurement_type",
                "label": "Procurement Type",
                "fieldtype": "Select",
                "options": "\nSpare Parts Replenishment\nVehicle Breakdown\nVehicle Maintenance\nMine Site Requirement\nGeneral Fleet Operations",
                "default": "Spare Parts Replenishment",
                "insert_after": "fleet_procurement_section"
            },
            {
                "fieldname": "custom_vehicle_breakdown",
                "label": "Vehicle Breakdown",
                "fieldtype": "Link",
                "options": "Vehicle Breakdown",
                "insert_after": "custom_procurement_type"
            },
            {
                "fieldname": "custom_vehicle",
                "label": "Vehicle",
                "fieldtype": "Link",
                "options": "Vehicle",
                "insert_after": "custom_vehicle_breakdown"
            },
            {
                "fieldname": "custom_mine_site",
                "label": "Mine Site",
                "fieldtype": "Link",
                "options": "Mine Site",
                "insert_after": "custom_vehicle"
            },
            {
                "fieldname": "custom_approved_by",
                "label": "Approved By",
                "fieldtype": "Data",
                "read_only": 1,
                "insert_after": "custom_mine_site"
            },
            {
                "fieldname": "custom_approved_on",
                "label": "Approved On",
                "fieldtype": "Datetime",
                "read_only": 1,
                "insert_after": "custom_approved_by"
            },
            {
                "fieldname": "custom_is_test_record",
                "label": "Is Test Record",
                "fieldtype": "Check",
                "default": "0",
                "insert_after": "custom_approved_on"
            }
        ],
        "Purchase Receipt": [
            {
                "fieldname": "fleet_procurement_section",
                "label": "Fleet Procurement Details",
                "fieldtype": "Section Break",
                "insert_after": "supplier"
            },
            {
                "fieldname": "custom_procurement_type",
                "label": "Procurement Type",
                "fieldtype": "Select",
                "options": "\nSpare Parts Replenishment\nVehicle Breakdown\nVehicle Maintenance\nMine Site Requirement\nGeneral Fleet Operations",
                "default": "Spare Parts Replenishment",
                "insert_after": "fleet_procurement_section"
            },
            {
                "fieldname": "custom_vehicle_breakdown",
                "label": "Vehicle Breakdown",
                "fieldtype": "Link",
                "options": "Vehicle Breakdown",
                "insert_after": "custom_procurement_type"
            },
            {
                "fieldname": "custom_vehicle",
                "label": "Vehicle",
                "fieldtype": "Link",
                "options": "Vehicle",
                "insert_after": "custom_vehicle_breakdown"
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
        "Purchase Invoice": [
            {
                "fieldname": "fleet_procurement_section",
                "label": "Fleet Procurement Details",
                "fieldtype": "Section Break",
                "insert_after": "supplier"
            },
            {
                "fieldname": "custom_procurement_type",
                "label": "Procurement Type",
                "fieldtype": "Select",
                "options": "\nSpare Parts Replenishment\nVehicle Breakdown\nVehicle Maintenance\nMine Site Requirement\nGeneral Fleet Operations",
                "default": "Spare Parts Replenishment",
                "insert_after": "fleet_procurement_section"
            },
            {
                "fieldname": "custom_vehicle_breakdown",
                "label": "Vehicle Breakdown",
                "fieldtype": "Link",
                "options": "Vehicle Breakdown",
                "insert_after": "custom_procurement_type"
            },
            {
                "fieldname": "custom_vehicle",
                "label": "Vehicle",
                "fieldtype": "Link",
                "options": "Vehicle",
                "insert_after": "custom_vehicle_breakdown"
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
        "Payment Entry": [
            {
                "fieldname": "custom_is_test_record",
                "label": "Is Test Record",
                "fieldtype": "Check",
                "default": "0",
                "insert_after": "remarks"
            }
        ]
    }

    if pan_field_needed:
        custom_fields["Supplier"].append({
            "fieldname": "custom_pan",
            "label": "PAN",
            "fieldtype": "Data",
            "length": 10,
            "insert_after": "tax_id"
        })

    from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
    create_custom_fields(custom_fields, ignore_validate=True)
    frappe.db.commit()
    print("Successfully created / verified all custom fields for Batch 7.")

if __name__ == '__main__':
    setup_custom_fields()

