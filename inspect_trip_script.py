import frappe

def inspect_trip_script():
    frappe.init("frontend")
    frappe.connect()

    s = frappe.db.get_value("Server Script", "Mining Trip - Business Validations & Audit", "script")
    print("Script length:", len(s))
    for i, line in enumerate(s.split("\n")):
        if "insurance" in line.lower() or "fitness" in line.lower() or "statutory" in line.lower() or "throw" in line.lower():
            print(f"Line {i+1}: {line}")

if __name__ == "__main__":
    inspect_trip_script()

