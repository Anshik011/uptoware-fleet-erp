import frappe

def run():
    print("=== INSPECTING STOCK ENTRY & STOCK ENTRY DETAIL SCHEMA ===")
    se_dt = frappe.get_doc("DocType", "Stock Entry")
    se_fields = [(f.fieldname, f.fieldtype, f.label, f.options) for f in se_dt.fields if any(w in f.fieldname.lower() for w in ["return", "original", "against", "issue", "outgoing", "custom"])]
    print("\nStock Entry matching fields:")
    for f in se_fields:
        print(f"  {f[0]} ({f[1]}) - Label: '{f[2]}' - Options: '{f[3]}'")

    sed_dt = frappe.get_doc("DocType", "Stock Entry Detail")
    sed_fields = [(f.fieldname, f.fieldtype, f.label, f.options) for f in sed_dt.fields if any(w in f.fieldname.lower() for w in ["return", "original", "against", "issue", "outgoing", "ste"])]
    print("\nStock Entry Detail matching fields:")
    for f in sed_fields:
        print(f"  {f[0]} ({f[1]}) - Label: '{f[2]}' - Options: '{f[3]}'")

    print("\n=== INSPECTING SERVER SCRIPT RETURN LOGIC ===")
    ss_bs = frappe.get_doc("Server Script", "Stock Entry - Spare Parts Validation")
    print("Validation Script snippet (Return portion):")
    for line in ss_bs.script.split("\n"):
        if "return" in line.lower() or "issued" in line.lower() or "custom_" in line.lower():
            print("  ", line)

run()

