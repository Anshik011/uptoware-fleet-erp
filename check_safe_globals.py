def run():
    import frappe
    meta = frappe.get_meta("Vehicle")
    print("Vehicle driver fields:", [f.fieldname for f in meta.fields if "driv" in f.fieldname or "custom" in f.fieldname])

run()
