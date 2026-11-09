import frappe

def inspect_permissions():
    frappe.init("frontend")
    frappe.connect()

    doctypes = [
        "Mining Trip", "Fuel Log", "Vehicle Breakdown", "Operational Expense",
        "Vehicle Insurance Policy", "Material Request", "Stock Entry",
        "Purchase Order", "Purchase Receipt", "Purchase Invoice",
        "Sales Invoice", "Payment Entry"
    ]

    print("=== DOCPERM & CUSTOM DOCPERM INSPECTION ===")
    for dt in doctypes:
        print(f"\n--- {dt} ---")
        # Check Custom DocPerm
        cdps = frappe.get_all("Custom DocPerm", filters={"parent": dt}, fields=["role", "permlevel", "read", "write", "create", "submit", "cancel", "amend"])
        if cdps:
            print("  Custom DocPerms:")
            for p in cdps:
                print(f"    Role: {p.role:<22} | R:{p.read} W:{p.write} C:{p.create} S:{p.submit} X:{p.cancel}")
        else:
            dps = frappe.get_all("DocPerm", filters={"parent": dt}, fields=["role", "permlevel", "read", "write", "create", "submit", "cancel", "amend"])
            print("  Standard DocPerms:")
            for p in dps:
                if p.role in ["System Manager", "Fleet Manager", "Workshop Supervisor", "Store Manager", "Accountant", "Driver"]:
                    print(f"    Role: {p.role:<22} | R:{p.read} W:{p.write} C:{p.create} S:{p.submit} X:{p.cancel}")

if __name__ == "__main__":
    inspect_permissions()

