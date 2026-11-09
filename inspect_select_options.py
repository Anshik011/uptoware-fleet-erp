import frappe

def inspect_options():
    for dt, fns in [
        ("Vehicle", ["vehicle_status"]),
        ("Mining Trip", ["trip_status", "billing_status"]),
        ("Fuel Log", ["approval_status"]),
        ("Vehicle Breakdown", ["repair_status"]),
        ("Vehicle Insurance Policy", ["policy_status"])
    ]:
        meta = frappe.get_meta(dt)
        for fn in fns:
            f = meta.get_field(fn)
            print(f"{dt}.{fn} options: {f.options.splitlines() if f and f.options else None}")
            
    print("\nAll Fuel Log fields:")
    fl_meta = frappe.get_meta("Fuel Log")
    for f in fl_meta.fields:
        print(f"  {f.fieldname} ({f.fieldtype})")

if __name__ == "__main__":
    inspect_options()

