import frappe

def run():
    fl_meta = frappe.get_meta("Fuel Log")
    print("Fuel Log fields:")
    for f in fl_meta.fields:
        print(f"  {f.fieldname} ({f.fieldtype})")

if __name__ == "__main__":
    run()

