import frappe

def run():
    vb_meta = frappe.get_meta("Vehicle Breakdown")
    print("Vehicle Breakdown fields:")
    for f in vb_meta.fields:
        print(f"  {f.fieldname} ({f.fieldtype})")

if __name__ == "__main__":
    run()

