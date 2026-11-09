import frappe

def inspect_all():
    frappe.init("frontend")
    frappe.connect()

    print("========================================================")
    print("1. MINING TRIP SERVER SCRIPTS")
    print("========================================================")
    scripts = frappe.db.sql("""
        SELECT name, script_type, reference_doctype, doctype_event, script
        FROM `tabServer Script`
        WHERE reference_doctype = 'Mining Trip'
    """, as_dict=True)

    for s in scripts:
        print(f"\nSCRIPT NAME: {s['name']} | Event: {s.get('doctype_event')}")
        print("-" * 50)
        print(s['script'])

    print("\n========================================================")
    print("2. FLEET SETTINGS RECORD")
    print("========================================================")
    fs = frappe.get_doc("Fleet Settings")
    for k, v in fs.as_dict().items():
        if any(term in k.lower() for term in ["insur", "expir", "warn", "day", "alert", "statut", "remind", "window"]):
            print(f"  {k}: {repr(v)}")

    print("\n========================================================")
    print("3. ALL SERVER SCRIPTS WITH EXPIRY / SCHEDULER")
    print("========================================================")
    scheds = frappe.db.sql("""
        SELECT name, script_type, doctype_event, script
        FROM `tabServer Script`
        WHERE script LIKE '%warning_window%' OR script LIKE '%reminder_intervals%' OR script LIKE '%Fleet Expiry%' OR script_type = 'Scheduler Event'
    """, as_dict=True)

    for sc in scheds:
        print(f"\nSCRIPT: {sc['name']} (Type: {sc['script_type']})")
        print("-" * 50)
        print(sc['script'])

if __name__ == "__main__":
    inspect_all()

