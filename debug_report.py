import frappe
meta = frappe.get_meta("Vehicle Breakdown")
for f in meta.fields:
    if "cost" in f.fieldname.lower():
        print(f.fieldname, f.fieldtype)
