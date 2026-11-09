import frappe

def create_operational_expense_doctype():
    print("Creating Operational Expense DocType...")
    
    if frappe.db.exists("DocType", "Operational Expense"):
        print("DocType 'Operational Expense' already exists. Updating...")
        doc = frappe.get_doc("DocType", "Operational Expense")
    else:
        doc = frappe.new_doc("DocType")
        doc.name = "Operational Expense"
        doc.module = "Fleet Management"
        doc.custom = 1
        doc.is_submittable = 0
        doc.track_changes = 1
        doc.autoname = "naming_series:"

    doc.naming_rule = "By \"Naming Series\" field"
    doc.allow_import = 1
    doc.quick_entry = 0

    fields = [
        # Basic Details
        {"fieldname": "naming_series", "label": "Series", "fieldtype": "Select", "options": "EXP-.YYYY.-.#####\nEXP-TEST-.YYYY.-.#####", "default": "EXP-.YYYY.-.#####", "reqd": 1, "in_list_view": 0},
        {"fieldname": "expense_date", "label": "Expense Date", "fieldtype": "Date", "reqd": 1, "default": "Today", "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "expense_category", "label": "Expense Category", "fieldtype": "Select", "reqd": 1, 
         "options": "Toll and Road Charges\nParking\nLoading and Unloading\nFood and Accommodation\nWeighbridge Charges\nPermit and Documentation\nMiscellaneous Operational Expenses", 
         "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "amount", "label": "Amount", "fieldtype": "Currency", "options": "currency", "reqd": 1, "in_list_view": 1},
        {"fieldname": "currency", "label": "Currency", "fieldtype": "Link", "options": "Currency", "default": "INR"},
        {"fieldname": "company", "label": "Company", "fieldtype": "Link", "options": "Company", "default": "Uptoware", "reqd": 1},
        
        {"fieldname": "col_break_1", "fieldtype": "Column Break"},
        {"fieldname": "approval_status", "label": "Approval Status", "fieldtype": "Select", "options": "Draft\nSubmitted\nApproved\nRejected", "default": "Draft", "read_only": 1, "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "accounting_status", "label": "Accounting Status", "fieldtype": "Select", "options": "Unposted\nPosted\nCancelled", "default": "Unposted", "read_only": 1, "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "payment_status", "label": "Payment Status", "fieldtype": "Select", "options": "Unpaid\nPaid", "default": "Unpaid", "read_only": 1, "in_list_view": 1},
        {"fieldname": "paid_amount", "label": "Paid Amount", "fieldtype": "Currency", "options": "currency", "default": 0, "read_only": 1},

        # Operational Linkages
        {"fieldname": "section_operational_links", "label": "Operational Linkages", "fieldtype": "Section Break"},
        {"fieldname": "vehicle", "label": "Vehicle", "fieldtype": "Link", "options": "Vehicle", "in_list_view": 1, "in_standard_filter": 1},
        {"fieldname": "mining_trip", "label": "Mining Trip", "fieldtype": "Link", "options": "Mining Trip", "in_standard_filter": 1},
        {"fieldname": "mine_site", "label": "Mine Site", "fieldtype": "Link", "options": "Mine Site", "in_standard_filter": 1},
        {"fieldname": "driver", "label": "Driver", "fieldtype": "Link", "options": "Driver", "in_standard_filter": 1},
        
        {"fieldname": "col_break_2", "fieldtype": "Column Break"},
        {"fieldname": "supplier", "label": "Supplier / Vendor", "fieldtype": "Link", "options": "Supplier"},
        {"fieldname": "payee_name", "label": "Payee Name (if non-supplier)", "fieldtype": "Data"},
        {"fieldname": "payment_method", "label": "Payment Method", "fieldtype": "Link", "options": "Mode of Payment", "default": "Cash"},
        {"fieldname": "bill_reference", "label": "Bill / Receipt Ref No", "fieldtype": "Data"},
        {"fieldname": "receipt_attachment", "label": "Bill / Receipt Attachment", "fieldtype": "Attach"},

        # Description
        {"fieldname": "section_description", "label": "Description & Remarks", "fieldtype": "Section Break"},
        {"fieldname": "description", "label": "Description / Purpose", "fieldtype": "Small Text"},
        {"fieldname": "rejection_reason", "label": "Rejection Reason", "fieldtype": "Small Text"},

        # Accounting Linkage & Accounts
        {"fieldname": "section_accounting", "label": "Accounting & Posting Details", "fieldtype": "Section Break"},
        {"fieldname": "expense_account", "label": "Expense Account", "fieldtype": "Link", "options": "Account"},
        {"fieldname": "payment_account", "label": "Payment Account (Cash/Bank/Payable)", "fieldtype": "Link", "options": "Account"},
        {"fieldname": "cost_center", "label": "Cost Center", "fieldtype": "Link", "options": "Cost Center", "default": "Main - U"},
        
        {"fieldname": "col_break_3", "fieldtype": "Column Break"},
        {"fieldname": "posting_document_type", "label": "Posting Document Type", "fieldtype": "Select", "options": "\nJournal Entry\nPurchase Invoice", "read_only": 1},
        {"fieldname": "posting_document_name", "label": "Posting Document Name", "fieldtype": "Data", "read_only": 1},
        {"fieldname": "posted_by", "label": "Posted By", "fieldtype": "Link", "options": "User", "read_only": 1},
        {"fieldname": "posted_on", "label": "Posted On", "fieldtype": "Datetime", "read_only": 1},

        # Audit & Compliance
        {"fieldname": "section_audit", "label": "Audit & Compliance", "fieldtype": "Section Break", "collapsible": 1},
        {"fieldname": "submitted_by", "label": "Submitted By", "fieldtype": "Link", "options": "User", "read_only": 1},
        {"fieldname": "submitted_on", "label": "Submitted On", "fieldtype": "Datetime", "read_only": 1},
        {"fieldname": "approved_by", "label": "Approved By", "fieldtype": "Link", "options": "User", "read_only": 1},
        {"fieldname": "approved_on", "label": "Approved On", "fieldtype": "Datetime", "read_only": 1},
        {"fieldname": "rejected_by", "label": "Rejected By", "fieldtype": "Link", "options": "User", "read_only": 1},
        {"fieldname": "rejected_on", "label": "Rejected On", "fieldtype": "Datetime", "read_only": 1},
        {"fieldname": "is_test_record", "label": "Is Test Record", "fieldtype": "Check", "default": 0, "in_standard_filter": 1}
    ]

    doc.fields = []
    for idx, f in enumerate(fields, 1):
        doc.append("fields", {**f, "idx": idx})

    # Permissions
    # Fleet Manager: read, write, create, delete=0
    # Accountant: read, write, create, delete=0
    # Driver: read, create, write=1 (draft only, server script blocks on approved), delete=0
    # System Manager: read, write, create, delete=1
    doc.permissions = []
    doc.append("permissions", {
        "role": "System Manager",
        "read": 1, "write": 1, "create": 1, "delete": 1, "print": 1, "export": 1, "report": 1
    })
    doc.append("permissions", {
        "role": "Fleet Manager",
        "read": 1, "write": 1, "create": 1, "delete": 0, "print": 1, "export": 1, "report": 1
    })
    doc.append("permissions", {
        "role": "Accountant",
        "read": 1, "write": 1, "create": 1, "delete": 0, "print": 1, "export": 1, "report": 1
    })
    doc.append("permissions", {
        "role": "Driver",
        "read": 1, "write": 1, "create": 1, "delete": 0, "print": 1, "export": 0, "report": 0
    })

    doc.save()
    frappe.db.commit()
    print("DocType 'Operational Expense' created and committed successfully.")

create_operational_expense_doctype()
