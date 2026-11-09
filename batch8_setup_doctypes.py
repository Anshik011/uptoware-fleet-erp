import frappe

def run():
    print("=== BATCH 8: CREATING CUSTOM DOCTYPES ===")

    # -------------------------------------------------------------
    # 1. Fleet Settings (Single DocType)
    # -------------------------------------------------------------
    fs_name = "Fleet Settings"
    if not frappe.db.exists("DocType", fs_name):
        doc = frappe.new_doc("DocType")
        doc.name = fs_name
        doc.module = "Fleet Management"
        doc.custom = 1
        doc.issingle = 1
        doc.track_changes = 1
        fs_fields = [
            {"fieldname": "sec_expiry", "label": "Expiry & Warning Rules", "fieldtype": "Section Break"},
            {"fieldname": "warning_window_days", "label": "Expiry Warning Window (Days)", "fieldtype": "Int", "default": "30"},
            {"fieldname": "reminder_intervals", "label": "Reminder Milestones (Days before expiry, comma-separated)", "fieldtype": "Data", "default": "30, 15, 7, 0"},
            {"fieldname": "notification_recipient_role", "label": "Notification Recipient Role", "fieldtype": "Link", "options": "Role", "default": "Fleet Manager"},

            {"fieldname": "sec_dispatch_enforce", "label": "Mining Trip Dispatch Document Enforcement", "fieldtype": "Section Break"},
            {"fieldname": "enforce_insurance_on_dispatch", "label": "Enforce Valid Insurance on Dispatch", "fieldtype": "Check", "default": "1"},
            {"fieldname": "enforce_fitness_on_dispatch", "label": "Enforce Valid Fitness Certificate on Dispatch", "fieldtype": "Check", "default": "1"},
            {"fieldname": "enforce_puc_on_dispatch", "label": "Enforce Valid PUC on Dispatch", "fieldtype": "Check", "default": "0"},
            {"fieldname": "enforce_road_tax_on_dispatch", "label": "Enforce Valid Road Tax on Dispatch", "fieldtype": "Check", "default": "0"},
            {"fieldname": "enforce_permit_on_dispatch", "label": "Enforce Valid Goods Permit on Dispatch", "fieldtype": "Check", "default": "0"}
        ]
        for f in fs_fields:
            doc.append("fields", f)

        fs_permissions = [
            {"role": "System Manager", "read": 1, "write": 1, "select": 1},
            {"role": "Fleet Manager", "read": 1, "write": 1, "select": 1},
            {"role": "Workshop Supervisor", "read": 1, "write": 0, "select": 1},
            {"role": "Store Manager", "read": 1, "write": 0, "select": 1},
            {"role": "Accountant", "read": 1, "write": 0, "select": 1}
        ]
        for p in fs_permissions:
            doc.append("permissions", p)
        doc.insert(ignore_permissions=True)
        print(f"Created Single DocType: {fs_name}")
    else:
        print(f"DocType '{fs_name}' already exists.")

    # Initialize Fleet Settings default values
    fs_doc = frappe.get_single("Fleet Settings")
    if not fs_doc.warning_window_days:
        fs_doc.warning_window_days = 30
    if fs_doc.enforce_insurance_on_dispatch is None:
        fs_doc.enforce_insurance_on_dispatch = 1
    if fs_doc.enforce_fitness_on_dispatch is None:
        fs_doc.enforce_fitness_on_dispatch = 1
    if fs_doc.enforce_puc_on_dispatch is None:
        fs_doc.enforce_puc_on_dispatch = 0
    if fs_doc.enforce_road_tax_on_dispatch is None:
        fs_doc.enforce_road_tax_on_dispatch = 0
    if fs_doc.enforce_permit_on_dispatch is None:
        fs_doc.enforce_permit_on_dispatch = 0
    if not fs_doc.reminder_intervals:
        fs_doc.reminder_intervals = "30, 15, 7, 0"
    if not fs_doc.notification_recipient_role:
        fs_doc.notification_recipient_role = "Fleet Manager"
    fs_doc.save(ignore_permissions=True)
    print("Initialized Fleet Settings values.")

    # -------------------------------------------------------------
    # 2. Vehicle Insurance Policy (Custom DocType)
    # -------------------------------------------------------------
    vip_name = "Vehicle Insurance Policy"
    if not frappe.db.exists("DocType", vip_name):
        doc = frappe.new_doc("DocType")
        doc.name = vip_name
        doc.module = "Fleet Management"
        doc.custom = 1
        doc.is_submittable = 0
        doc.track_changes = 1
        doc.autoname = "naming_series:"
        doc.naming_rule = "By \"Naming Series\" field"
        vip_fields = [
            # Naming Series
            {"fieldname": "naming_series", "label": "Series", "fieldtype": "Select", 
             "options": "POL-.YYYY.-.#####\nPOL-TEST-.YYYY.-.#####", "default": "POL-.YYYY.-.#####", "reqd": 1, "in_list_view": 0},

            # Primary Details
            {"fieldname": "sec_policy_info", "label": "Policy Information", "fieldtype": "Section Break"},
            {"fieldname": "policy_no", "label": "Policy Number", "fieldtype": "Data", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
            {"fieldname": "vehicle", "label": "Vehicle", "fieldtype": "Link", "options": "Vehicle", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
            {"fieldname": "insurance_company", "label": "Insurance Company", "fieldtype": "Data", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
            {"fieldname": "policy_type", "label": "Policy Type", "fieldtype": "Select", 
             "options": "Comprehensive\nThird Party Liability\nZero Depreciation\nCommercial Fleet Standard", "default": "Comprehensive", "reqd": 1, "in_list_view": 1},
            
            {"fieldname": "col_policy_status", "fieldtype": "Column Break"},
            {"fieldname": "policy_status", "label": "Policy Status", "fieldtype": "Select", 
             "options": "Draft\nActive\nExpired\nCancelled", "default": "Draft", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
            {"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "default": "Uptoware", "reqd": 1},
            {"fieldname": "is_test_record", "label": "Is Test Record", "fieldtype": "Check", "default": "0", "in_standard_filter": 1},

            # Policy Period & Financials
            {"fieldname": "sec_period_premium", "label": "Coverage Period & Premium", "fieldtype": "Section Break"},
            {"fieldname": "start_date", "label": "Policy Start Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
            {"fieldname": "end_date", "label": "Policy Expiry Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
            
            {"fieldname": "col_premium", "fieldtype": "Column Break"},
            {"fieldname": "premium_amount", "label": "Premium Amount (INR)", "fieldtype": "Currency", "options": "currency", "reqd": 1, "in_list_view": 1},
            {"fieldname": "policy_doc", "label": "Policy Document Attachment", "fieldtype": "Attach"},

            # Renewal History Linkage
            {"fieldname": "sec_renewal", "label": "Renewal History", "fieldtype": "Section Break"},
            {"fieldname": "is_renewal", "label": "Is Renewal Policy", "fieldtype": "Check", "default": "0"},
            {"fieldname": "previous_policy", "label": "Previous Policy Reference", "fieldtype": "Link", "options": "Vehicle Insurance Policy"},
            
            # Audit & Cancellation
            {"fieldname": "sec_audit", "label": "Audit & Cancellation", "fieldtype": "Section Break"},
            {"fieldname": "approved_by", "label": "Approved By", "fieldtype": "Link", "options": "User", "read_only": 1},
            {"fieldname": "approved_on", "label": "Approved On", "fieldtype": "Datetime", "read_only": 1},
            {"fieldname": "cancelled_by", "label": "Cancelled By", "fieldtype": "Link", "options": "User", "read_only": 1},
            {"fieldname": "cancelled_on", "label": "Cancelled On", "fieldtype": "Datetime", "read_only": 1},
            {"fieldname": "cancellation_reason", "label": "Cancellation Reason", "fieldtype": "Small Text"},
            {"fieldname": "remarks", "label": "Remarks / Notes", "fieldtype": "Small Text"}
        ]
        for f in vip_fields:
            doc.append("fields", f)

        vip_permissions = [
            {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1, "select": 1},
            {"role": "Fleet Manager", "read": 1, "write": 1, "create": 1, "delete": 0, "report": 1, "select": 1},
            {"role": "Workshop Supervisor", "read": 1, "write": 0, "create": 0, "delete": 0, "report": 1, "select": 1},
            {"role": "Store Manager", "read": 1, "write": 0, "create": 0, "delete": 0, "report": 1, "select": 1},
            {"role": "Accountant", "read": 1, "write": 0, "create": 0, "delete": 0, "report": 1, "select": 1}
        ]
        for p in vip_permissions:
            doc.append("permissions", p)

        doc.insert(ignore_permissions=True)
        print(f"Created DocType: {vip_name}")
    else:
        print(f"DocType '{vip_name}' already exists.")

    # -------------------------------------------------------------
    # 3. Fleet Expiry Notification Log (Custom DocType)
    # -------------------------------------------------------------
    fen_name = "Fleet Expiry Notification Log"
    if not frappe.db.exists("DocType", fen_name):
        doc = frappe.new_doc("DocType")
        doc.name = fen_name
        doc.module = "Fleet Management"
        doc.custom = 1
        doc.is_submittable = 0
        doc.track_changes = 1
        doc.autoname = "naming_series:"
        doc.naming_rule = "By \"Naming Series\" field"
        fen_fields = [
            {"fieldname": "naming_series", "label": "Series", "fieldtype": "Select", 
             "options": "NOTIF-EXP-.YYYY.-.#####\nNOTIF-TEST-.YYYY.-.#####", "default": "NOTIF-EXP-.YYYY.-.#####", "reqd": 1, "in_list_view": 0},
            {"fieldname": "vehicle", "label": "Vehicle", "fieldtype": "Link", "options": "Vehicle", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
            {"fieldname": "document_type", "label": "Document Type", "fieldtype": "Select", 
             "options": "Insurance\nFitness Certificate\nPUC Certificate\nRoad Tax\nGoods Permit", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
            {"fieldname": "expiry_date", "label": "Expiry Date", "fieldtype": "Date", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
            {"fieldname": "notification_stage", "label": "Notification Stage", "fieldtype": "Select", 
             "options": "30 Days Prior\n15 Days Prior\n7 Days Prior\nExpired", "reqd": 1, "in_list_view": 1, "in_standard_filter": 1},
            {"fieldname": "recipient", "label": "Recipient", "fieldtype": "Data", "in_list_view": 1},
            {"fieldname": "sent_datetime", "label": "Sent On", "fieldtype": "Datetime", "in_list_view": 1},
            {"fieldname": "status", "label": "Delivery Status", "fieldtype": "Select", 
             "options": "Logged\nSent\nFailed", "default": "Logged", "in_list_view": 1},
            {"fieldname": "action_required", "label": "Action Required", "fieldtype": "Small Text"},
            {"fieldname": "message", "label": "Notification Message", "fieldtype": "Text"},
            {"fieldname": "is_test_record", "label": "Is Test Record", "fieldtype": "Check", "default": "0", "in_standard_filter": 1}
        ]
        for f in fen_fields:
            doc.append("fields", f)

        fen_permissions = [
            {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1, "select": 1},
            {"role": "Fleet Manager", "read": 1, "write": 0, "create": 0, "delete": 0, "report": 1, "select": 1},
            {"role": "Workshop Supervisor", "read": 1, "write": 0, "create": 0, "delete": 0, "report": 1, "select": 1},
            {"role": "Store Manager", "read": 1, "write": 0, "create": 0, "delete": 0, "report": 1, "select": 1},
            {"role": "Accountant", "read": 1, "write": 0, "create": 0, "delete": 0, "report": 1, "select": 1}
        ]
        for p in fen_permissions:
            doc.append("permissions", p)

        doc.insert(ignore_permissions=True)
        print(f"Created DocType: {fen_name}")
    else:
        print(f"DocType '{fen_name}' already exists.")

    frappe.clear_cache()
    frappe.db.commit()
    print("=== BATCH 8 DOCTYPES SETUP COMPLETED ===")

if __name__ == "__main__":
    run()
