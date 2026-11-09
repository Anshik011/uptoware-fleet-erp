import frappe

def inspect():
    frappe.init("frontend")
    frappe.connect()

    print("=" * 70)
    print("1. VEHICLE STATUS FIELD INSPECTION")
    print("=" * 70)
    meta = frappe.get_meta("Vehicle")
    status_df = meta.get_field("vehicle_status")
    print("Fieldname:", status_df.fieldname if status_df else "None")
    print("Fieldtype:", status_df.fieldtype if status_df else "None")
    print("Options:\n", repr(status_df.options) if status_df else "None")

    statuses = frappe.db.sql("SELECT DISTINCT vehicle_status FROM `tabVehicle`")
    print("Distinct vehicle_status values in tabVehicle:", [s[0] for s in statuses])

    print("\n" + "=" * 70)
    print("2. MINING TRIP SERVER SCRIPTS - VEHICLE STATUS UPDATES")
    print("=" * 70)
    scripts = frappe.db.sql("""
        SELECT name, script_type, reference_doctype, doctype_event, script
        FROM `tabServer Script`
        WHERE reference_doctype = 'Mining Trip' OR script LIKE '%tabVehicle%' OR script LIKE '%vehicle_status%'
    """, as_dict=True)

    for s in scripts:
        print(f"\n========================================================")
        print(f"SCRIPT: {s['name']} | Event: {s.get('doctype_event')} | Ref: {s.get('reference_doctype')}")
        print(f"========================================================")
        lines = s['script'].split("\n")
        for i, line in enumerate(lines):
            print(f"{i+1:3d}: {line}")

    print("\n" + "=" * 70)
    print("3. FLEET SETTINGS RECORD INSPECTION")
    print("=" * 70)
    try:
        settings = frappe.get_single("Fleet Settings")
        print("Fleet Settings fields and values:")
        for k, v in settings.as_dict().items():
            print(f"  {k}: {v}")
    except Exception as e:
        print("Error reading Fleet Settings:", e)

    print("\n" + "=" * 70)
    print("4. EXPIRY SCHEDULERS (BATCH 8 & BATCH 11)")
    print("=" * 70)
    sched_scripts = frappe.db.sql("""
        SELECT name, script_type, reference_doctype, doctype_event, script
        FROM `tabServer Script`
        WHERE script_type = 'Scheduler Event' OR script LIKE '%expiry%' OR script LIKE '%Fleet Expiry%' OR script LIKE '%milestone%'
    """, as_dict=True)

    for s in sched_scripts:
        print(f"\n========================================================")
        print(f"SCHEDULER / EXPIRY SCRIPT: {s['name']}")
        print(f"========================================================")
        lines = s['script'].split("\n")
        for i, line in enumerate(lines):
            print(f"{i+1:3d}: {line}")

if __name__ == "__main__":
    inspect()
