import frappe

frappe.init(site="frontend")
frappe.connect()

print("=== DRIVER META ===")
meta = frappe.get_meta("Driver")
for f in meta.fields:
    print(f"  {f.fieldname} ({f.fieldtype}) - {f.label} [reqd={f.reqd}]")

print("\n=== EMPLOYEE MINE FIELDS ===")
emp_meta = frappe.get_meta("Employee")
for f in emp_meta.fields:
    if "mine" in f.fieldname.lower() or "site" in f.fieldname.lower():
        print(f"  {f.fieldname} ({f.fieldtype}) - {f.label} [reqd={f.reqd}]")

print("\n=== DRIVER SERVER SCRIPTS ===")
scripts = frappe.get_all("Server Script", filters={"reference_doctype": ["in", ["Employee", "Driver"]]}, fields=["name", "script_type", "reference_doctype", "doctype_event"])
for s in scripts:
    print(f"  {s.name} on {s.reference_doctype} ({s.doctype_event})")
