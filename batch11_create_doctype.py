import frappe

def create_fleet_alert_log_doctype():
    frappe.init("frontend")
    frappe.connect()

    doctype_name = "Fleet Alert Log"
    if frappe.db.exists("DocType", doctype_name):
        print(f"DocType {doctype_name} already exists. Updating schema...")
        doc = frappe.get_doc("DocType", doctype_name)
    else:
        print(f"Creating DocType {doctype_name}...")
        doc = frappe.new_doc("DocType")
        doc.name = doctype_name
        doc.module = "Fleet Management"
        doc.custom = 1
        doc.is_submittable = 0
        doc.track_changes = 1
        doc.autoname = "naming_series:"
        doc.naming_rule = "By \"Naming Series\" field"

    fields = [
        {"fieldname": "naming_series", "label": "Series", "fieldtype": "Select", "options": "FLT-ALT-.YYYY.-.#####", "default": "FLT-ALT-.YYYY.-.#####", "reqd": 1, "in_list_view": 0},
        {"fieldname": "alert_title", "label": "Alert Title", "fieldtype": "Data", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "alert_category", "label": "Alert Category", "fieldtype": "Select", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1,
         "options": "Vehicle & Driver\nTrip Operations\nFuel\nMaintenance & Workshop\nInventory\nProcurement\nInsurance & Compliance\nRevenue & Financial"},
        {"fieldname": "severity", "label": "Severity", "fieldtype": "Select", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1,
         "options": "Low\nMedium\nHigh\nCritical", "default": "Medium"},
        {"fieldname": "status", "label": "Status", "fieldtype": "Select", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1,
         "options": "Unread\nRead\nAcknowledged\nResolved", "default": "Unread"},
        {"fieldname": "col_break_1", "label": "", "fieldtype": "Column Break"},
        {"fieldname": "source_doctype", "label": "Source DocType", "fieldtype": "Link", "options": "DocType", "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "source_name", "label": "Source Document Name", "fieldtype": "Data", "in_list_view": 1},
        {"fieldname": "vehicle", "label": "Vehicle", "fieldtype": "Link", "options": "Vehicle", "in_standard_filter": 1},
        {"fieldname": "driver", "label": "Driver", "fieldtype": "Link", "options": "Driver", "in_standard_filter": 1},
        {"fieldname": "is_test_record", "label": "Is Test Record", "fieldtype": "Check", "default": "0", "in_standard_filter": 1},
        
        {"fieldname": "sec_delivery", "label": "Routing & Delivery Details", "fieldtype": "Section Break"},
        {"fieldname": "recipient_role", "label": "Recipient Role", "fieldtype": "Link", "options": "Role", "reqd": 1, "in_list_view": 1},
        {"fieldname": "for_user", "label": "Target User", "fieldtype": "Link", "options": "User"},
        {"fieldname": "delivery_channel", "label": "Delivery Channel", "fieldtype": "Select", "options": "In-App\nEmail\nIn-App and Email", "default": "In-App and Email"},
        {"fieldname": "email_queued", "label": "Email Queued", "fieldtype": "Check", "default": "0", "read_only": 1},
        {"fieldname": "col_break_2", "label": "", "fieldtype": "Column Break"},
        {"fieldname": "alert_timestamp", "label": "Alert Date/Time", "fieldtype": "Datetime", "in_list_view": 1},
        {"fieldname": "reminder_count", "label": "Reminder Count", "fieldtype": "Int", "default": "0", "read_only": 1},
        {"fieldname": "last_reminder_on", "label": "Last Reminder On", "fieldtype": "Datetime", "read_only": 1},
        
        {"fieldname": "sec_content", "label": "Alert Details & Action Required", "fieldtype": "Section Break"},
        {"fieldname": "action_required", "label": "Action Required", "fieldtype": "Small Text"},
        {"fieldname": "message", "label": "Detailed Message", "fieldtype": "Text"},
        
        {"fieldname": "sec_resolution", "label": "Resolution & Audit Trail", "fieldtype": "Section Break"},
        {"fieldname": "acknowledged_by", "label": "Acknowledged By", "fieldtype": "Link", "options": "User", "read_only": 1},
        {"fieldname": "acknowledged_on", "label": "Acknowledged On", "fieldtype": "Datetime", "read_only": 1},
        {"fieldname": "col_break_3", "label": "", "fieldtype": "Column Break"},
        {"fieldname": "resolved_by", "label": "Resolved By", "fieldtype": "Link", "options": "User", "read_only": 1},
        {"fieldname": "resolved_on", "label": "Resolved On", "fieldtype": "Datetime", "read_only": 1},
        {"fieldname": "resolution_note", "label": "Resolution Note", "fieldtype": "Small Text"}
    ]

    doc.fields = []
    for f in fields:
        doc.append("fields", f)

    permissions = [
        {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "export": 1},
        {"role": "Fleet Manager", "read": 1, "write": 1, "create": 1, "delete": 0, "export": 1},
        {"role": "Accountant", "read": 1, "write": 1, "create": 0, "delete": 0, "export": 1},
        {"role": "Workshop Supervisor", "read": 1, "write": 1, "create": 0, "delete": 0, "export": 1},
        {"role": "Store Manager", "read": 1, "write": 1, "create": 0, "delete": 0, "export": 1}
    ]

    doc.permissions = []
    for p in permissions:
        doc.append("permissions", p)

    doc.save(ignore_permissions=True)
    frappe.db.commit()
    print(f"DocType {doctype_name} successfully configured and saved.")

if __name__ == "__main__":
    create_fleet_alert_log_doctype()

