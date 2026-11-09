import frappe

def run():
    print("=== UPDATING FUEL LOG DOCTYPE WITH ENHANCED APPROVAL & EFFICIENCY FIELDS ===")

    fuel_log_fields = [
        # Section 1: Fuel Entry Details
        {
            "fieldname": "sec_fuel_details",
            "label": "Fuel Entry Details",
            "fieldtype": "Section Break"
        },
        {
            "fieldname": "fuel_date",
            "label": "Fuel Date",
            "fieldtype": "Date",
            "reqd": 1,
            "in_list_view": 1,
            "in_standard_filter": 1,
            "default": "Today"
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
            "in_list_view": 1,
            "in_standard_filter": 1
        },
        {
            "fieldname": "col_break_entry_1",
            "fieldtype": "Column Break"
        },
        {
            "fieldname": "mine_site",
            "label": "Mine Site",
            "fieldtype": "Link",
            "options": "Mine Site",
            "in_list_view": 1,
            "in_standard_filter": 1
        },
        {
            "fieldname": "fuel_source",
            "label": "Fuel Source",
            "fieldtype": "Select",
            "options": "Site Bowser\nExternal Pump",
            "default": "Site Bowser",
            "in_list_view": 1,
            "in_standard_filter": 1
        },
        {
            "fieldname": "approval_status",
            "label": "Approval Status",
            "fieldtype": "Select",
            "options": "Draft\nApproved\nRejected",
            "default": "Draft",
            "read_only": 1,
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

        # Section 2: Odometer & Fuel Efficiency
        {
            "fieldname": "sec_break_odo",
            "label": "Odometer & Fuel Efficiency",
            "fieldtype": "Section Break"
        },
        {
            "fieldname": "odometer_reading_km",
            "label": "Odometer Reading (KM)",
            "fieldtype": "Int",
            "reqd": 1,
            "in_list_view": 1
        },
        {
            "fieldname": "previous_odometer_km",
            "label": "Previous Approved Odometer (KM)",
            "fieldtype": "Int",
            "read_only": 1
        },
        {
            "fieldname": "distance_travelled_km",
            "label": "Distance Travelled (KM)",
            "fieldtype": "Int",
            "read_only": 1
        },
        {
            "fieldname": "col_break_eff",
            "fieldtype": "Column Break"
        },
        {
            "fieldname": "is_full_tank",
            "label": "Full Tank Refill?",
            "fieldtype": "Check",
            "default": "1",
            "in_list_view": 1,
            "description": "Check if tank was filled to 100% capacity. Required for confirmed vehicle mileage calculation."
        },
        {
            "fieldname": "km_per_litre",
            "label": "Estimated Interval KM/L",
            "fieldtype": "Float",
            "read_only": 1,
            "in_list_view": 1,
            "description": "Interval indicator = Distance / Fuel Quantity. For partial refills, this is an indicative interval consumption metric."
        },
        {
            "fieldname": "efficiency_note",
            "label": "Efficiency Calculation Basis",
            "fieldtype": "Small Text",
            "read_only": 1
        },

        # Section 3: Quantity & Costing
        {
            "fieldname": "sec_break_cost",
            "label": "Fuel Quantity & Cost",
            "fieldtype": "Section Break"
        },
        {
            "fieldname": "quantity_litres",
            "label": "Quantity (Litres)",
            "fieldtype": "Float",
            "reqd": 1,
            "in_list_view": 1
        },
        {
            "fieldname": "rate_per_litre",
            "label": "Rate per Litre",
            "fieldtype": "Currency",
            "reqd": 1
        },
        {
            "fieldname": "col_break_cost",
            "fieldtype": "Column Break"
        },
        {
            "fieldname": "total_fuel_cost",
            "label": "Total Fuel Cost",
            "fieldtype": "Currency",
            "read_only": 1,
            "reqd": 1,
            "in_list_view": 1
        },
        {
            "fieldname": "payment_method",
            "label": "Payment Method",
            "fieldtype": "Select",
            "options": "Company Card\nBank Transfer\nUPI\nCash",
            "default": "Company Card"
        },

        # Section 4: Station & Verification Documents
        {
            "fieldname": "sec_break_station",
            "label": "Station & Verification",
            "fieldtype": "Section Break"
        },
        {
            "fieldname": "fuel_station",
            "label": "Fuel Station / Bowser ID",
            "fieldtype": "Data"
        },
        {
            "fieldname": "fuel_slip_doc",
            "label": "Fuel Slip / Receipt Document",
            "fieldtype": "Attach"
        },
        {
            "fieldname": "col_break_station",
            "fieldtype": "Column Break"
        },
        {
            "fieldname": "remarks",
            "label": "Remarks",
            "fieldtype": "Small Text"
        },
        {
            "fieldname": "approved_by",
            "label": "Approved By",
            "fieldtype": "Link",
            "options": "User",
            "read_only": 1
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

    fuel_log_perms = [
        {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1},
        {"role": "Fleet Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1},
        {"role": "Weighbridge Operator", "read": 1, "write": 1, "create": 1, "report": 1},
        {"role": "Accountant", "read": 1, "write": 1, "report": 1},
        {"role": "Driver", "read": 1}
    ]

    fl_doc = frappe.get_doc("DocType", "Fuel Log")
    fl_doc.module = "Fleet Management"
    fl_doc.fields = []
    for f in fuel_log_fields:
        fl_doc.append("fields", f)
    fl_doc.permissions = []
    for p in fuel_log_perms:
        fl_doc.append("permissions", p)
    
    fl_doc.sort_field = "fuel_date"
    fl_doc.sort_order = "DESC"
    fl_doc.search_fields = "vehicle, driver, mine_site, fuel_source, approval_status"
    fl_doc.save(ignore_permissions=True)

    frappe.clear_cache(doctype="Fuel Log")
    frappe.clear_cache()
    frappe.db.commit()
    print("SUCCESS: Fuel Log DocType updated cleanly with enhanced approval & efficiency fields.")

run()
