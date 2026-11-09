import frappe

def run():
    print("=== CREATING CUSTOM DOCTYPES ===")

    # 1. MINE SITE DOCTYPE
    mine_site_fields = [
        {
            "fieldname": "site_name",
            "label": "Site Name",
            "fieldtype": "Data",
            "reqd": 1,
            "unique": 1,
            "in_list_view": 1,
            "in_standard_filter": 1
        },
        {
            "fieldname": "client",
            "label": "Client",
            "fieldtype": "Link",
            "options": "Customer",
            "in_list_view": 1,
            "in_standard_filter": 1
        },
        {
            "fieldname": "status",
            "label": "Status",
            "fieldtype": "Select",
            "options": "Operational\nInactive",
            "default": "Operational",
            "reqd": 1,
            "in_list_view": 1,
            "in_standard_filter": 1
        },
        {
            "fieldname": "col_break_1",
            "fieldtype": "Column Break"
        },
        {
            "fieldname": "mineral_type",
            "label": "Mineral Type",
            "fieldtype": "Select",
            "options": "Iron Ore\nCoal\nBauxite\nLimestone\nManganese\nOverburden\nOther",
            "default": "Iron Ore",
            "in_list_view": 1,
            "in_standard_filter": 1
        },
        {
            "fieldname": "daily_target_tonnage",
            "label": "Daily Target Tonnage",
            "fieldtype": "Float"
        },
        {
            "fieldname": "active_loading_pits",
            "label": "Active Loading Pits",
            "fieldtype": "Int",
            "default": "1"
        },
        {
            "fieldname": "is_test_record",
            "label": "Is Test Record",
            "fieldtype": "Check",
            "default": "0",
            "in_list_view": 1,
            "in_standard_filter": 1
        },
        {
            "fieldname": "sec_break_loc",
            "label": "Location & Commercial Details",
            "fieldtype": "Section Break"
        },
        {
            "fieldname": "location",
            "label": "Location",
            "fieldtype": "Small Text"
        },
        {
            "fieldname": "col_break_2",
            "fieldtype": "Column Break"
        },
        {
            "fieldname": "rate_per_ton",
            "label": "Rate per Ton (Indicative)",
            "fieldtype": "Currency",
            "description": "Indicative base rate. Billing model subject to final commercial confirmation."
        }
    ]

    mine_site_perms = [
        {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1},
        {"role": "Fleet Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1},
        {"role": "Weighbridge Operator", "read": 1, "report": 1},
        {"role": "Accountant", "read": 1, "write": 1, "report": 1},
        {"role": "Driver", "read": 1}
    ]

    if not frappe.db.exists("DocType", "Mine Site"):
        ms_doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "Mine Site",
            "module": "Fleet Management",
            "custom": 1,
            "autoname": "field:site_name",
            "title_field": "site_name",
            "search_fields": "site_name, client, status, mineral_type",
            "track_changes": 1,
            "fields": mine_site_fields,
            "permissions": mine_site_perms
        })
        ms_doc.insert(ignore_permissions=True)
        print("Created DocType: Mine Site")
    else:
        print("DocType 'Mine Site' already exists, updating...")
        ms_doc = frappe.get_doc("DocType", "Mine Site")
        ms_doc.fields = []
        for f in mine_site_fields:
            ms_doc.append("fields", f)
        ms_doc.permissions = []
        for p in mine_site_perms:
            ms_doc.append("permissions", p)
        ms_doc.save(ignore_permissions=True)
        print("Updated DocType: Mine Site")

    # 2. MINING TRIP DOCTYPE
    mining_trip_fields = [
        # Trip Details Section
        {
            "fieldname": "naming_series",
            "label": "Series",
            "fieldtype": "Select",
            "options": "TRIP-.YYYY.-.#####",
            "default": "TRIP-.YYYY.-.#####",
            "reqd": 1
        },
        {
            "fieldname": "dispatch_date_time",
            "label": "Dispatch Date/Time",
            "fieldtype": "Datetime",
            "reqd": 1,
            "in_list_view": 1,
            "in_standard_filter": 1
        },
        {
            "fieldname": "vehicle",
            "label": "Vehicle",
            "fieldtype": "Link",
            "options": "Vehicle",
            "reqd": 1,
            "in_list_view": 1,
            "in_standard_filter": 1
        },
        {
            "fieldname": "driver",
            "label": "Driver",
            "fieldtype": "Link",
            "options": "Driver",
            "reqd": 1,
            "in_list_view": 1,
            "in_standard_filter": 1
        },
        {
            "fieldname": "col_break_trip_1",
            "fieldtype": "Column Break"
        },
        {
            "fieldname": "mine_site",
            "label": "Mine Site",
            "fieldtype": "Link",
            "options": "Mine Site",
            "reqd": 1,
            "in_list_view": 1,
            "in_standard_filter": 1
        },
        {
            "fieldname": "destination",
            "label": "Destination",
            "fieldtype": "Data",
            "reqd": 1,
            "in_list_view": 1
        },
        {
            "fieldname": "material_type",
            "label": "Material Type",
            "fieldtype": "Select",
            "options": "Iron Ore\nCoal\nBauxite\nLimestone\nManganese\nOverburden\nOther",
            "default": "Iron Ore",
            "in_list_view": 1,
            "in_standard_filter": 1
        },
        {
            "fieldname": "challan_number",
            "label": "Challan Number",
            "fieldtype": "Data",
            "in_list_view": 1
        },
        {
            "fieldname": "trip_status",
            "label": "Trip Status",
            "fieldtype": "Select",
            "options": "Draft\nDispatched\nWeighbridge Confirmed\nApproved\nDelivered\nCancelled",
            "default": "Draft",
            "read_only": 1,
            "reqd": 1,
            "in_list_view": 1,
            "in_standard_filter": 1
        },
        {
            "fieldname": "is_test_record",
            "label": "Is Test Record",
            "fieldtype": "Check",
            "default": "0",
            "in_list_view": 1,
            "in_standard_filter": 1
        },

        # Weighbridge Details Section
        {
            "fieldname": "sec_weighbridge",
            "label": "Weighbridge Details",
            "fieldtype": "Section Break"
        },
        {
            "fieldname": "gross_weight_tons",
            "label": "Gross Weight (Tons)",
            "fieldtype": "Float"
        },
        {
            "fieldname": "tare_weight_tons",
            "label": "Tare Weight (Tons)",
            "fieldtype": "Float"
        },
        {
            "fieldname": "col_break_weighbridge",
            "fieldtype": "Column Break"
        },
        {
            "fieldname": "net_weight_tons",
            "label": "Net Weight (Tons)",
            "fieldtype": "Float",
            "read_only": 1,
            "in_list_view": 1
        },
        {
            "fieldname": "confirmed_by",
            "label": "Weighbridge Confirmed By",
            "fieldtype": "Link",
            "options": "User",
            "read_only": 1
        },
        {
            "fieldname": "confirmed_on",
            "label": "Weighbridge Confirmed On",
            "fieldtype": "Datetime",
            "read_only": 1
        },

        # Financial Details Section
        {
            "fieldname": "sec_financial",
            "label": "Financial Details",
            "fieldtype": "Section Break"
        },
        {
            "fieldname": "rate_per_ton",
            "label": "Rate per Ton (Indicative)",
            "fieldtype": "Currency",
            "description": "Indicative commercial rate. Revenue calculation held pending client commercial confirmation. Unused for automated billing."
        },
        {
            "fieldname": "col_break_fin",
            "fieldtype": "Column Break"
        },
        {
            "fieldname": "gross_revenue",
            "label": "Gross Revenue",
            "fieldtype": "Currency",
            "read_only": 1
        },
        {
            "fieldname": "billing_note",
            "label": "Billing & Revenue Notes",
            "fieldtype": "Small Text",
            "read_only": 1,
            "default": "Revenue calculation pending client commercial confirmation. Automatic calculation held per MVP rules."
        },

        # Trip Operations Section
        {
            "fieldname": "sec_operations",
            "label": "Trip Operations & Odometers",
            "fieldtype": "Section Break"
        },
        {
            "fieldname": "departure_date_time",
            "label": "Departure Date/Time",
            "fieldtype": "Datetime"
        },
        {
            "fieldname": "opening_odometer",
            "label": "Opening Odometer",
            "fieldtype": "Int"
        },
        {
            "fieldname": "col_break_ops",
            "fieldtype": "Column Break"
        },
        {
            "fieldname": "return_date_time",
            "label": "Return Date/Time",
            "fieldtype": "Datetime"
        },
        {
            "fieldname": "closing_odometer",
            "label": "Closing Odometer",
            "fieldtype": "Int"
        },

        # Audit & Approval Section
        {
            "fieldname": "sec_audit",
            "label": "Approval & Audit Trail",
            "fieldtype": "Section Break"
        },
        {
            "fieldname": "approved_by",
            "label": "Approved By",
            "fieldtype": "Link",
            "options": "User",
            "read_only": 1
        },
        {
            "fieldname": "col_break_audit",
            "fieldtype": "Column Break"
        },
        {
            "fieldname": "approved_on",
            "label": "Approved On",
            "fieldtype": "Datetime",
            "read_only": 1
        },
        {
            "fieldname": "workflow_state",
            "label": "Workflow State",
            "fieldtype": "Link",
            "options": "Workflow State",
            "read_only": 1,
            "hidden": 1
        }
    ]

    mining_trip_perms = [
        {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1},
        {"role": "Fleet Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1},
        {"role": "Weighbridge Operator", "read": 1, "write": 1, "report": 1},
        {"role": "Accountant", "read": 1, "write": 1, "report": 1},
        {"role": "Driver", "read": 1}
    ]

    if not frappe.db.exists("DocType", "Mining Trip"):
        mt_doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "Mining Trip",
            "module": "Fleet Management",
            "custom": 1,
            "autoname": "naming_series:",
            "title_field": "challan_number",
            "search_fields": "challan_number, vehicle, driver, mine_site, trip_status",
            "track_changes": 1,
            "fields": mining_trip_fields,
            "permissions": mining_trip_perms
        })
        mt_doc.insert(ignore_permissions=True)
        print("Created DocType: Mining Trip")
    else:
        print("DocType 'Mining Trip' already exists, updating...")
        mt_doc = frappe.get_doc("DocType", "Mining Trip")
        mt_doc.fields = []
        for f in mining_trip_fields:
            mt_doc.append("fields", f)
        mt_doc.permissions = []
        for p in mining_trip_perms:
            mt_doc.append("permissions", p)
        mt_doc.save(ignore_permissions=True)
        print("Updated DocType: Mining Trip")

    frappe.clear_cache(doctype="Mine Site")
    frappe.clear_cache(doctype="Mining Trip")
    frappe.clear_cache()
    frappe.db.commit()
    print("=== DOCTYPES CREATED & COMMITTED ===")

run()
