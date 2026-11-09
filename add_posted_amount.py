import frappe

def run():
    doc = frappe.get_doc("DocType", "Operational Expense")
    has_posted_amount = any(f.fieldname == "posted_amount" for f in doc.fields)
    if not has_posted_amount:
        print("Adding posted_amount field to Operational Expense DocType...")
        idx = 38
        for f in doc.fields:
            if f.fieldname == "paid_amount":
                idx = f.idx
                break
        doc.append("fields", {
            "fieldname": "posted_amount",
            "label": "Posted Amount",
            "fieldtype": "Currency",
            "options": "currency",
            "default": 0,
            "read_only": 1,
            "in_list_view": 1,
            "idx": idx
        })
        doc.save()
        frappe.db.commit()
        frappe.clear_cache(doctype="Operational Expense")
        print("Successfully added posted_amount field.")
    else:
        print("posted_amount field already exists.")

run()
