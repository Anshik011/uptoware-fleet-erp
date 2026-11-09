import frappe

def run():
    oe_meta = frappe.get_meta("Operational Expense")
    print("Operational Expense fields:")
    for f in oe_meta.fields:
        print(f"  {f.fieldname} ({f.fieldtype})")

if __name__ == "__main__":
    run()

