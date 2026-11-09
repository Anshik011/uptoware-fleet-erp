import frappe

def run():
    print("=== BATCH 4: SETTING UP PREREQUISITES & DOCTYPES ===")

    # 0. Roles
    for r in ["Fleet Manager", "Workshop Supervisor"]:
        if not frappe.db.exists("Role", r):
            frappe.get_doc({
                "doctype": "Role",
                "role_name": r
            }).insert(ignore_permissions=True)
            print(f"Created Role: {r}")

    # 1. Workflow States
    wf_states = [
        {"state": "Reported", "doc_status": 0},
        {"state": "Approved", "doc_status": 0},
        {"state": "In Workshop", "doc_status": 0},
        {"state": "Awaiting Parts", "doc_status": 0},
        {"state": "Repaired", "doc_status": 0},
        {"state": "Closed", "doc_status": 0}
    ]
    for s in wf_states:
        if not frappe.db.exists("Workflow State", s["state"]):
            frappe.get_doc({
                "doctype": "Workflow State",
                "workflow_state_name": s["state"]
            }).insert(ignore_permissions=True)
            print(f"Created Workflow State: {s['state']}")

    # 2. Workflow Action Masters
    wf_actions = [
        "Approve",
        "Reject",
        "Send to Workshop",
        "Request Parts",
        "Parts Received",
        "Mark Repaired",
        "Close Breakdown"
    ]
    for act in wf_actions:
        if not frappe.db.exists("Workflow Action Master", act):
            frappe.get_doc({
                "doctype": "Workflow Action Master",
                "workflow_action_name": act
            }).insert(ignore_permissions=True)
            print(f"Created Workflow Action Master: {act}")

    # 3. Create Child DocType: Vehicle Breakdown Part
    child_dt_name = "Vehicle Breakdown Part"
    child_fields = [
        {
            "fieldname": "item_code",
            "label": "Item Code",
            "fieldtype": "Link",
            "options": "Item",
            "reqd": 1,
            "in_list_view": 1,
            "columns": 2
        },
        {
            "fieldname": "item_name",
            "label": "Item Name",
            "fieldtype": "Data",
            "read_only": 1,
            "in_list_view": 1,
            "columns": 2
        },
        {
            "fieldname": "stock_uom",
            "label": "UOM",
            "fieldtype": "Link",
            "options": "UOM",
            "read_only": 1,
            "columns": 1
        },
        {
            "fieldname": "planned_qty",
            "label": "Planned Qty",
            "fieldtype": "Float",
            "default": "1.0",
            "reqd": 1,
            "in_list_view": 1,
            "columns": 1
        },
        {
            "fieldname": "issued_qty",
            "label": "Issued Qty",
            "fieldtype": "Float",
            "default": "0.0",
            "read_only": 1,
            "in_list_view": 1,
            "columns": 1
        },
        {
            "fieldname": "warehouse",
            "label": "Warehouse",
            "fieldtype": "Link",
            "options": "Warehouse",
            "reqd": 1,
            "in_list_view": 1,
            "columns": 2
        },
        {
            "fieldname": "rate",
            "label": "Unit Valuation Rate",
            "fieldtype": "Currency",
            "default": "0.0",
            "read_only": 1,
            "columns": 1
        },
        {
            "fieldname": "amount",
            "label": "Issued Amount",
            "fieldtype": "Currency",
            "default": "0.0",
            "read_only": 1,
            "in_list_view": 1,
            "columns": 1
        },
        {
            "fieldname": "stock_entry",
            "label": "Stock Entry",
            "fieldtype": "Link",
            "options": "Stock Entry",
            "read_only": 1,
            "columns": 1
        },
        {
            "fieldname": "status",
            "label": "Part Status",
            "fieldtype": "Select",
            "options": "Planned\nIssued",
            "default": "Planned",
            "read_only": 1,
            "in_list_view": 1,
            "columns": 1
        }
    ]

    if not frappe.db.exists("DocType", child_dt_name):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": child_dt_name,
            "module": "Fleet Management",
            "custom": 1,
            "istable": 1,
            "editable_grid": 1,
            "fields": child_fields,
            "permissions": [{"role": "System Manager", "read": 1, "write": 1}]
        })
        doc.insert(ignore_permissions=True)
        print(f"Created Child DocType: {child_dt_name}")
    else:
        doc = frappe.get_doc("DocType", child_dt_name)
        doc.fields = []
        for f in child_fields:
            doc.append("fields", f)
        doc.save(ignore_permissions=True)
        print(f"Updated Child DocType: {child_dt_name}")

    # 5. Create Main DocType: Vehicle Breakdown
    main_dt_name = "Vehicle Breakdown"
    main_fields = [
        # Section 1: Breakdown Details
        {
            "fieldname": "section_breakdown",
            "label": "Breakdown Details",
            "fieldtype": "Section Break"
        },
        {
            "fieldname": "naming_series",
            "label": "Series",
            "fieldtype": "Select",
            "options": "BKD-.YYYY.-.#####",
            "default": "BKD-.YYYY.-.#####",
            "hidden": 1
        },
        {
            "fieldname": "breakdown_datetime",
            "label": "Breakdown Date/Time",
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
            "in_list_view": 1,
            "in_standard_filter": 1
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
            "fieldname": "related_trip",
            "label": "Related Mining Trip",
            "fieldtype": "Link",
            "options": "Mining Trip"
        },
        {
            "fieldname": "column_break_1",
            "fieldtype": "Column Break"
        },
        {
            "fieldname": "breakdown_type",
            "label": "Breakdown Type",
            "fieldtype": "Select",
            "options": "Engine\nHydraulic\nTyre\nElectrical\nTransmission\nBrake\nOther",
            "reqd": 1,
            "in_list_view": 1,
            "in_standard_filter": 1
        },
        {
            "fieldname": "severity",
            "label": "Severity",
            "fieldtype": "Select",
            "options": "Low\nMedium\nCritical",
            "default": "Medium",
            "reqd": 1,
            "in_list_view": 1,
            "in_standard_filter": 1
        },
        {
            "fieldname": "odometer_reading",
            "label": "Odometer Reading (KM)",
            "fieldtype": "Int"
        },
        {
            "fieldname": "reported_by",
            "label": "Reported By",
            "fieldtype": "Link",
            "options": "User",
            "default": "__user"
        },
        {
            "fieldname": "description",
            "label": "Breakdown Description",
            "fieldtype": "Small Text",
            "reqd": 1
        },
        
        # Section 2: Repair & Workshop Details
        {
            "fieldname": "section_repair",
            "label": "Repair & Workshop Details",
            "fieldtype": "Section Break"
        },
        {
            "fieldname": "repair_status",
            "label": "Repair Status",
            "fieldtype": "Select",
            "options": "Reported\nApproved\nIn Workshop\nAwaiting Parts\nRepaired\nClosed",
            "default": "Reported",
            "reqd": 1,
            "read_only": 1,
            "in_list_view": 1,
            "in_standard_filter": 1
        },
        {
            "fieldname": "assigned_workshop",
            "label": "Assigned Workshop / Supplier",
            "fieldtype": "Link",
            "options": "Supplier"
        },
        {
            "fieldname": "workflow_state",
            "label": "Workflow State",
            "fieldtype": "Link",
            "options": "Workflow State",
            "hidden": 1,
            "read_only": 1
        },
        {
            "fieldname": "column_break_repair",
            "fieldtype": "Column Break"
        },
        {
            "fieldname": "repair_start_datetime",
            "label": "Repair Start Date/Time",
            "fieldtype": "Datetime"
        },
        {
            "fieldname": "repair_completion_datetime",
            "label": "Repair Completion Date/Time",
            "fieldtype": "Datetime"
        },
        {
            "fieldname": "downtime_hours",
            "label": "Downtime (Hours)",
            "fieldtype": "Float",
            "read_only": 1,
            "in_list_view": 1
        },
        {
            "fieldname": "repair_description",
            "label": "Repair Description / Actions Taken",
            "fieldtype": "Small Text"
        },

        # Section 3: Parts & Costs
        {
            "fieldname": "section_costs",
            "label": "Parts & Costs",
            "fieldtype": "Section Break"
        },
        {
            "fieldname": "parts_cost",
            "label": "Parts Cost (₹)",
            "fieldtype": "Currency",
            "default": "0.0",
            "read_only": 1
        },
        {
            "fieldname": "labour_cost",
            "label": "Labour / Service Cost (₹)",
            "fieldtype": "Currency",
            "default": "0.0"
        },
        {
            "fieldname": "total_repair_cost",
            "label": "Total Repair Cost (₹)",
            "fieldtype": "Currency",
            "default": "0.0",
            "read_only": 1,
            "in_list_view": 1
        },
        {
            "fieldname": "parts_table",
            "label": "Spare Parts Planning & Consumption",
            "fieldtype": "Table",
            "options": "Vehicle Breakdown Part"
        },

        # Section 4: Audit & Tracking
        {
            "fieldname": "section_audit",
            "label": "Audit & Compliance",
            "fieldtype": "Section Break",
            "collapsible": 1
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
            "fieldname": "closed_by",
            "label": "Closed By",
            "fieldtype": "Link",
            "options": "User",
            "read_only": 1
        },
        {
            "fieldname": "closed_on",
            "label": "Closed On",
            "fieldtype": "Datetime",
            "read_only": 1
        },
        {
            "fieldname": "is_test_record",
            "label": "Is Test Record",
            "fieldtype": "Check",
            "default": "0",
            "in_list_view": 1,
            "in_standard_filter": 1
        }
    ]

    main_permissions = [
        {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1},
        {"role": "Fleet Manager", "read": 1, "write": 1, "create": 1, "delete": 0, "report": 1},
        {"role": "Workshop Supervisor", "read": 1, "write": 1, "create": 1, "delete": 0, "report": 1},
        {"role": "Accountant", "read": 1, "write": 0, "create": 0, "delete": 0, "report": 1},
        {"role": "Driver", "read": 1, "write": 0, "create": 1, "delete": 0, "report": 0}
    ]

    if not frappe.db.exists("DocType", main_dt_name):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": main_dt_name,
            "module": "Fleet Management",
            "custom": 1,
            "autoname": "naming_series:",
            "fields": main_fields,
            "permissions": main_permissions,
            "search_fields": "vehicle,driver,mine_site,breakdown_type,repair_status",
            "title_field": "vehicle",
            "track_changes": 1
        })
        doc.insert(ignore_permissions=True)
        print(f"Created DocType: {main_dt_name}")
    else:
        doc = frappe.get_doc("DocType", main_dt_name)
        doc.fields = []
        for f in main_fields:
            doc.append("fields", f)
        doc.permissions = []
        for p in main_permissions:
            doc.append("permissions", p)
        doc.search_fields = "vehicle,driver,mine_site,breakdown_type,repair_status"
        doc.title_field = "vehicle"
        doc.save(ignore_permissions=True)
        print(f"Updated DocType: {main_dt_name}")

    # 4. Custom Fields on Stock Entry
    se_fields = [
        {
            "dt": "Stock Entry",
            "fieldname": "custom_vehicle_breakdown",
            "label": "Vehicle Breakdown",
            "fieldtype": "Link",
            "options": "Vehicle Breakdown",
            "insert_after": "stock_entry_type"
        },
        {
            "dt": "Stock Entry",
            "fieldname": "custom_vehicle",
            "label": "Vehicle",
            "fieldtype": "Link",
            "options": "Vehicle",
            "insert_after": "custom_vehicle_breakdown"
        }
    ]
    for cf in se_fields:
        cf_name = f"{cf['dt']}-{cf['fieldname']}"
        if not frappe.db.exists("Custom Field", cf_name):
            frappe.get_doc({
                "doctype": "Custom Field",
                **cf
            }).insert(ignore_permissions=True)
            print(f"Created Custom Field on Stock Entry: {cf['fieldname']}")

    frappe.clear_cache()
    frappe.db.commit()
    print("SUCCESS: Batch 4 DocTypes and Prerequisites established.")

run()
