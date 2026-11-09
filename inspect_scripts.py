import frappe

def inspect_scripts():
    frappe.init("frontend")
    frappe.connect()

    print("=== ALL SCRIPTS MENTIONING VEHICLE_STATUS ===")
    all_scripts = frappe.db.sql("SELECT name, reference_doctype, doctype_event, script FROM `tabServer Script`", as_dict=True)
    for s in all_scripts:
        if "vehicle_status" in s["script"]:
            print(f"Script: {s['name']} | Ref: {s['reference_doctype']} | Event: {s.get('doctype_event')}")
            # print matching lines
            for i, line in enumerate(s["script"].split("\n")):
                if "vehicle_status" in line or "last_odometer" in line:
                    print(f"   Line {i+1}: {line.strip()}")

    print("\n=== ALL SCRIPTS ON MINING TRIP ===")
    trip_scripts = frappe.db.sql("SELECT name, doctype_event, script FROM `tabServer Script` WHERE reference_doctype = 'Mining Trip'", as_dict=True)
    for s in trip_scripts:
        print(f"Script: {s['name']} | Event: {s.get('doctype_event')}")

    print("\n=== ALL SCRIPTS ON VEHICLE BREAKDOWN ===")
    vb_scripts = frappe.db.sql("SELECT name, doctype_event, script FROM `tabServer Script` WHERE reference_doctype = 'Vehicle Breakdown'", as_dict=True)
    for s in vb_scripts:
        print(f"Script: {s['name']} | Event: {s.get('doctype_event')}")

if __name__ == "__main__":
    inspect_scripts()

