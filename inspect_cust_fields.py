import frappe

def run():
    c_meta = frappe.get_meta("Customer")
    print("Customer fields matching 'test':")
    for f in c_meta.fields:
        if "test" in f.fieldname.lower():
            print(f"  {f.fieldname} ({f.fieldtype})")

if __name__ == "__main__":
    run()

