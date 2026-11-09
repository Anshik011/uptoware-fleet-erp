import frappe
import json

def run():
    print("=== INSPECTING FUEL LOG DOCTYPE ===")
    if not frappe.db.exists("DocType", "Fuel Log"):
        print("ERROR: Fuel Log DocType does NOT exist!")
        return

    fl_meta = frappe.get_meta("Fuel Log")
    print(f"DocType: {fl_meta.name}, Module: {fl_meta.module}, Custom: {fl_meta.custom}")
    print(f"Total Fields: {len(fl_meta.fields)}")
    for f in fl_meta.fields:
        print(f"  - {f.fieldname} ({f.fieldtype}): '{f.label}' (Options: {f.options}, Reqd: {f.reqd}, Read Only: {f.read_only})")

    print("\n=== CLIENT SCRIPTS FOR FUEL LOG ===")
    cs_list = frappe.get_all("Client Script", filters={"dt": "Fuel Log"}, fields=["name", "view", "enabled", "script"])
    for cs in cs_list:
        print(f"Client Script: {cs['name']} (View: {cs['view']}, Enabled: {cs['enabled']})")
        print(cs['script'])

    print("\n=== SERVER SCRIPTS FOR FUEL LOG ===")
    ss_list = frappe.get_all("Server Script", filters={"reference_doctype": "Fuel Log"}, fields=["name", "doctype_event", "disabled", "script"])
    for ss in ss_list:
        print(f"Server Script: {ss['name']} (Event: {ss['doctype_event']}, Disabled: {ss['disabled']})")
        print(ss['script'])

    print("\n=== EXISTING FUEL LOG RECORDS ===")
    records = frappe.get_all("Fuel Log", fields=["*"])
    print(f"Total Records: {len(records)}")
    for r in records[:5]:
        print(r)

run()
