import frappe

def inspect_fieldnames():
    doctypes = [
        "Vehicle", "Mining Trip", "Fuel Log", "Vehicle Breakdown", 
        "Operational Expense", "Vehicle Insurance Policy"
    ]
    for dt in doctypes:
        meta = frappe.get_meta(dt)
        fields = [(f.fieldname, f.fieldtype) for f in meta.fields]
        print(f"\n=== DOCTYPE: {dt} ===")
        for fn, ft in fields:
            if any(k in fn for k in ["status", "date", "cost", "weight", "vehicle", "driver", "site", "test", "total", "trip", "amount"]):
                print(f"  {fn} ({ft})")

if __name__ == "__main__":
    inspect_fieldnames()

