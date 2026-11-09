import frappe

def run():
    scripts = frappe.db.sql("""
        SELECT name, script_type, reference_doctype, doctype_event, disabled
        FROM `tabServer Script`
        WHERE reference_doctype IN ('Sales Invoice', 'Payment Entry', 'Mining Trip')
    """, as_dict=True)
    print("Existing Server Scripts on Sales Invoice, Payment Entry, Mining Trip:")
    for s in scripts:
        print(" ", s)

if __name__ == "__main__":
    run()

