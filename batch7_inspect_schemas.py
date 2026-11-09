import frappe

def inspect_schemas():
    doctypes = ['Supplier', 'Material Request', 'Purchase Order', 'Purchase Receipt', 'Purchase Invoice', 'Payment Entry']
    for dt in doctypes:
        meta = frappe.get_meta(dt)
        print(f"\n==================== {dt} ====================")
        fieldnames = [df.fieldname for df in meta.fields]
        print(f"Total fields: {len(fieldnames)}")
        # Print relevant fieldnames
        keywords = ['supplier', 'vendor', 'tax', 'pan', 'gst', 'status', 'approval', 'vehicle', 'breakdown', 'workflow', 'test']
        matching = [f for f in fieldnames if any(k in f.lower() for k in keywords)]
        print(f"Matching fields: {matching}")

if __name__ == '__main__':
    inspect_schemas()

