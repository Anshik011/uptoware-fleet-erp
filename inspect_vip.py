import frappe

def run():
    dt = frappe.get_doc("DocType", "Vehicle Insurance Policy")
    print("DocType custom:", dt.custom)
    fields = [f.fieldname for f in dt.fields]
    print("Fields in DocType doc:", fields)
    print("has insured_declared_value in DocType doc:", "insured_declared_value" in fields)
    frappe.clear_cache(doctype="Vehicle Insurance Policy")
    meta = frappe.get_meta("Vehicle Insurance Policy")
    print("has_field in meta after clear_cache:", meta.has_field("insured_declared_value"))
    
    # Check tabDocField directly in DB
    db_fields = frappe.db.sql("SELECT fieldname, fieldtype FROM `tabDocField` WHERE parent = 'Vehicle Insurance Policy'", as_dict=True)
    print("DB fields:", [f.fieldname for f in db_fields])
    
    # Check tabCustom Field
    cf = frappe.db.sql("SELECT fieldname, dt FROM `tabCustom Field` WHERE dt = 'Vehicle Insurance Policy'", as_dict=True)
    print("Custom Fields on VIP:", cf)

if __name__ == "__main__":
    run()

