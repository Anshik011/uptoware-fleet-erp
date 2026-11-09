import frappe

def setup_custom_fields():
    print("Setting up Custom Fields on Journal Entry and Purchase Invoice...")
    
    fields = [
        {
            "dt": "Journal Entry",
            "fieldname": "custom_operational_expense",
            "label": "Operational Expense",
            "fieldtype": "Link",
            "options": "Operational Expense",
            "insert_after": "user_remark",
            "read_only": 1
        },
        {
            "dt": "Purchase Invoice",
            "fieldname": "custom_operational_expense",
            "label": "Operational Expense",
            "fieldtype": "Link",
            "options": "Operational Expense",
            "insert_after": "remarks",
            "read_only": 1
        }
    ]

    for f in fields:
        cf_name = f"{f['dt']}-{f['fieldname']}"
        if frappe.db.exists("Custom Field", cf_name):
            print(f"Custom Field {cf_name} already exists. Updating...")
            cf = frappe.get_doc("Custom Field", cf_name)
        else:
            print(f"Creating Custom Field {cf_name}...")
            cf = frappe.new_doc("Custom Field")
            cf.name = cf_name

        cf.dt = f["dt"]
        cf.fieldname = f["fieldname"]
        cf.label = f["label"]
        cf.fieldtype = f["fieldtype"]
        cf.options = f["options"]
        cf.insert_after = f["insert_after"]
        cf.read_only = f["read_only"]
        cf.save()

    frappe.db.commit()
    print("Custom Fields created successfully.")

setup_custom_fields()
