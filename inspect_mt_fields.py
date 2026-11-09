import frappe

def run():
    for dt_name in ["Mining Trip", "Mine Site"]:
        dt = frappe.get_doc("DocType", dt_name)
        print(f"\n=== Fields of {dt_name} ===")
        for f in dt.fields:
            print(f"  {f.fieldname} ({f.fieldtype}): label='{f.label}', reqd={f.reqd}, options='{f.options or ''}', default='{f.default or ''}'")

if __name__ == "__main__":
    run()

