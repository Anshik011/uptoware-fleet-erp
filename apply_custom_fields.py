import frappe

def run():
    vehicle_fields = [
        {
            "dt": "Vehicle",
            "fieldname": "vehicle_status",
            "label": "Vehicle Status",
            "fieldtype": "Select",
            "options": "Active\nOn Trip\nUnder Maintenance\nBreakdown\nOut of Service",
            "default": "Active",
            "insert_after": "company",
            "in_list_view": 1,
            "in_standard_filter": 1,
            "reqd": 1
        },
        {
            "dt": "Vehicle",
            "fieldname": "is_test_record",
            "label": "Is Test Record",
            "fieldtype": "Check",
            "default": "0",
            "insert_after": "vehicle_status",
            "in_list_view": 1,
            "in_standard_filter": 1
        },
        {
            "dt": "Vehicle",
            "fieldname": "payload_capacity_tons",
            "label": "Payload Capacity (Tons)",
            "fieldtype": "Float",
            "insert_after": "is_test_record"
        },
        {
            "dt": "Vehicle",
            "fieldname": "assigned_driver",
            "label": "Assigned Driver",
            "fieldtype": "Link",
            "options": "Driver",
            "insert_after": "payload_capacity_tons",
            "in_list_view": 1
        },
        {
            "dt": "Vehicle",
            "fieldname": "insurance_policy_doc",
            "label": "Insurance Policy Document",
            "fieldtype": "Attach",
            "insert_after": "end_date"
        },
        {
            "dt": "Vehicle",
            "fieldname": "statutory_compliance_section",
            "label": "Statutory Compliance & Permits",
            "fieldtype": "Section Break",
            "insert_after": "insurance_policy_doc"
        },
        {
            "dt": "Vehicle",
            "fieldname": "fitness_expiry_date",
            "label": "Fitness Expiry Date",
            "fieldtype": "Date",
            "insert_after": "statutory_compliance_section"
        },
        {
            "dt": "Vehicle",
            "fieldname": "fitness_doc",
            "label": "Fitness Certificate",
            "fieldtype": "Attach",
            "insert_after": "fitness_expiry_date"
        },
        {
            "dt": "Vehicle",
            "fieldname": "puc_expiry_date",
            "label": "PUC Expiry Date",
            "fieldtype": "Date",
            "insert_after": "fitness_doc"
        },
        {
            "dt": "Vehicle",
            "fieldname": "puc_doc",
            "label": "PUC Certificate",
            "fieldtype": "Attach",
            "insert_after": "puc_expiry_date"
        },
        {
            "dt": "Vehicle",
            "fieldname": "col_break_statutory",
            "label": "",
            "fieldtype": "Column Break",
            "insert_after": "puc_doc"
        },
        {
            "dt": "Vehicle",
            "fieldname": "road_tax_expiry_date",
            "label": "Road Tax Expiry Date",
            "fieldtype": "Date",
            "insert_after": "col_break_statutory"
        },
        {
            "dt": "Vehicle",
            "fieldname": "road_tax_doc",
            "label": "Road Tax Receipt",
            "fieldtype": "Attach",
            "insert_after": "road_tax_expiry_date"
        },
        {
            "dt": "Vehicle",
            "fieldname": "permit_expiry_date",
            "label": "Permit Expiry Date",
            "fieldtype": "Date",
            "insert_after": "road_tax_doc"
        },
        {
            "dt": "Vehicle",
            "fieldname": "permit_doc",
            "label": "Goods Permit Document",
            "fieldtype": "Attach",
            "insert_after": "permit_expiry_date"
        }
    ]

    driver_fields = [
        {
            "dt": "Driver",
            "fieldname": "is_test_record",
            "label": "Is Test Record",
            "fieldtype": "Check",
            "default": "0",
            "insert_after": "status",
            "in_list_view": 1,
            "in_standard_filter": 1
        },
        {
            "dt": "Driver",
            "fieldname": "assigned_vehicle",
            "label": "Assigned Vehicle",
            "fieldtype": "Link",
            "options": "Vehicle",
            "insert_after": "is_test_record",
            "in_list_view": 1
        },
        {
            "dt": "Driver",
            "fieldname": "safety_score",
            "label": "Safety Score (%)",
            "fieldtype": "Float",
            "default": "100.0",
            "insert_after": "assigned_vehicle"
        },
        {
            "dt": "Driver",
            "fieldname": "emergency_contact_section",
            "label": "Emergency & Medical Details",
            "fieldtype": "Section Break",
            "insert_after": "user"
        },
        {
            "dt": "Driver",
            "fieldname": "emergency_contact_name",
            "label": "Emergency Contact Name",
            "fieldtype": "Data",
            "insert_after": "emergency_contact_section"
        },
        {
            "dt": "Driver",
            "fieldname": "emergency_contact_phone",
            "label": "Emergency Contact Phone",
            "fieldtype": "Data",
            "insert_after": "emergency_contact_name"
        },
        {
            "dt": "Driver",
            "fieldname": "column_break_med",
            "label": "",
            "fieldtype": "Column Break",
            "insert_after": "emergency_contact_phone"
        },
        {
            "dt": "Driver",
            "fieldname": "medical_fitness_expiry",
            "label": "Medical Fitness Expiry",
            "fieldtype": "Date",
            "insert_after": "column_break_med"
        },
        {
            "dt": "Driver",
            "fieldname": "license_doc",
            "label": "Driving License Document",
            "fieldtype": "Attach",
            "insert_after": "expiry_date"
        }
    ]

    created = []
    for f in vehicle_fields + driver_fields:
        existing = frappe.db.get_value("Custom Field", {"dt": f["dt"], "fieldname": f["fieldname"]})
        if not existing:
            doc = frappe.get_doc({"doctype": "Custom Field", **f})
            doc.insert()
            created.append(f"{f['dt']}-{f['fieldname']}")

    frappe.clear_cache(doctype="Vehicle")
    frappe.clear_cache(doctype="Driver")
    frappe.db.commit()
    print("SUCCESS_CREATED:", created)

run()
