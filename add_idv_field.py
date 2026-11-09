import frappe

def run():
    dt = frappe.get_doc("DocType", "Vehicle Insurance Policy")
    
    # Check if field already in dt.fields
    existing = [f.fieldname for f in dt.fields]
    if "insured_declared_value" not in existing:
        print("Appending insured_declared_value to fields...")
        dt.append("fields", {
            "fieldname": "insured_declared_value",
            "label": "Insured Declared Value (IDV)",
            "fieldtype": "Currency",
            "options": "currency",
            "reqd": 0,
            "in_list_view": 1,
            "in_standard_filter": 0,
            "default": "0.0",
            "insert_after": "premium_amount"
        })
        dt.save(ignore_permissions=True)
        frappe.db.commit()
        print("dt.save() and commit done.")
    
    frappe.clear_cache(doctype="Vehicle Insurance Policy")
    meta = frappe.get_meta("Vehicle Insurance Policy")
    print("Meta has insured_declared_value:", meta.has_field("insured_declared_value"))
    
    # Verify MariaDB column
    cols = [col[0] for col in frappe.db.sql("DESCRIBE `tabVehicle Insurance Policy`")]
    print("Column in tabVehicle Insurance Policy:", "insured_declared_value" in cols)

if __name__ == "__main__":
    run()

