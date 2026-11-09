import frappe

def run():
    print("=== BATCH 9 PRE-IMPLEMENTATION INSPECTION ===")
    
    # 1. Inspect Mining Trip fields
    mt_meta = frappe.get_meta("Mining Trip")
    print("\nMining Trip fields:")
    for f in mt_meta.fields:
        if any(term in f.fieldname.lower() for term in ["rate", "rev", "amount", "cost", "bill", "inv", "price", "status"]):
            print(f"  - {f.fieldname} ({f.fieldtype}): {f.label}")
    
    # 2. Inspect Mine Site fields
    ms_meta = frappe.get_meta("Mine Site")
    print("\nMine Site fields:")
    for f in ms_meta.fields:
        if any(term in f.fieldname.lower() for term in ["rate", "rev", "price", "amount", "cost", "bill", "status"]):
            print(f"  - {f.fieldname} ({f.fieldtype}): {f.label}")

    # 3. Inspect Sales Invoice custom fields
    si_custom_fields = frappe.get_all("Custom Field", filters={"dt": "Sales Invoice"}, fields=["fieldname", "label", "fieldtype", "options"])
    print("\nSales Invoice Custom Fields:")
    for cf in si_custom_fields:
        print(f"  - {cf.fieldname} ({cf.fieldtype}): {cf.label} [options: {cf.options}]")

    # 4. Inspect Sales Invoice Item custom fields
    sii_custom_fields = frappe.get_all("Custom Field", filters={"dt": "Sales Invoice Item"}, fields=["fieldname", "label", "fieldtype", "options"])
    print("\nSales Invoice Item Custom Fields:")
    for cf in sii_custom_fields:
        print(f"  - {cf.fieldname} ({cf.fieldtype}): {cf.label} [options: {cf.options}]")

    # 5. Check if any Sales Invoices exist
    si_count = frappe.db.count("Sales Invoice")
    print(f"\nTotal Sales Invoices in DB: {si_count}")
    if si_count > 0:
        sample_si = frappe.db.sql("SELECT name, customer, grand_total, outstanding_amount, status, docstatus FROM `tabSales Invoice` LIMIT 5", as_dict=True)
        for s in sample_si:
            print("  Sample SI:", s)

    # 6. Check existing Fuel Log cost fields
    fl_meta = frappe.get_meta("Fuel Log")
    print("\nFuel Log cost fields:")
    for f in fl_meta.fields:
        if any(term in f.fieldname.lower() for term in ["cost", "qty", "rate", "amount", "price", "odometer"]):
            print(f"  - {f.fieldname} ({f.fieldtype}): {f.label}")

    # 7. Check Vehicle Breakdown cost fields
    vb_meta = frappe.get_meta("Vehicle Breakdown")
    print("\nVehicle Breakdown cost fields:")
    for f in vb_meta.fields:
        if any(term in f.fieldname.lower() for term in ["cost", "labour", "part", "total"]):
            print(f"  - {f.fieldname} ({f.fieldtype}): {f.label}")

    # 8. Check Operational Expense fields
    oe_meta = frappe.get_meta("Operational Expense")
    print("\nOperational Expense cost fields:")
    for f in oe_meta.fields:
        if any(term in f.fieldname.lower() for term in ["amount", "cost", "vehicle", "trip", "journal", "invoice", "payment", "status"]):
            print(f"  - {f.fieldname} ({f.fieldtype}): {f.label}")

if __name__ == "__main__":
    run()

