import frappe

def inspect_scripts():
    frappe.init("frontend")
    frappe.connect()

    scripts = [
        "Fuel Log - Validations & Efficiency",
        "Operational Expense - Validations & Lifecycle",
        "Vehicle Breakdown - Validations & Lifecycle",
        "Mining Trip - Business Validations & Audit",
        "Vehicle Insurance Policy - Validations & Lifecycle",
        "Purchase Order - Fleet Procurement Validation"
    ]

    for s_name in scripts:
        print(f"\n=======================================================")
        print(f"SCRIPT: {s_name}")
        print("=======================================================")
        s = frappe.db.get_value("Server Script", s_name, "script")
        if s:
            print(s[:1500])
            if len(s) > 1500:
                print(f"\n... [TRUNCATED - Total {len(s)} chars] ...\n")
                print(s[-800:])
        else:
            print("NOT FOUND")

if __name__ == "__main__":
    inspect_scripts()

