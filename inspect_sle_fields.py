import frappe

def run():
    dt = frappe.get_doc("DocType", "Stock Ledger Entry")
    print("SLE Fields:")
    for f in dt.fields:
        print(f"  {f.fieldname} ({f.fieldtype}) - {f.label}")

run()

