import frappe

def inspect():
    frappe.init("frontend")
    frappe.connect()

    print("=== SERVER SCRIPTS INSPECTION ===")
    scripts = frappe.get_all("Server Script", fields=["name", "script_type", "reference_doctype", "doctype_event", "disabled"])
    for s in scripts:
        print(f"[{'ENABLED' if not s.disabled else 'DISABLED'}] {s.name} ({s.script_type}) Doc: {s.reference_doctype} Event: {s.doctype_event}")

    print("\n=== FLEET SETTINGS FIELDS ===")
    meta = frappe.get_meta("Fleet Settings")
    for f in meta.fields:
        if "notif" in f.fieldname or "alert" in f.fieldname or "reminder" in f.fieldname or "threshold" in f.fieldname or "window" in f.fieldname or "hours" in f.fieldname or "kml" in f.fieldname:
            val = frappe.db.get_single_value("Fleet Settings", f.fieldname)
            print(f"{f.fieldname} ({f.fieldtype}): {val}")

    print("\n=== FLEET ALERT LOG RECENT COUNTS ===")
    categories = frappe.db.sql("SELECT alert_category, COUNT(*) FROM `tabFleet Alert Log` GROUP BY alert_category")
    for cat, cnt in categories:
        print(f"  {cat}: {cnt}")

    print("\n=== SCHEDULER EVENTS ===")
    sched_events = frappe.get_all("Scheduled Job Type", filters={"method": ["like", "%Fleet%"]}, fields=["name", "method", "frequency", "stopped"])
    for se in sched_events:
        print(f"  {se.name}: {se.method} ({se.frequency}, stopped={se.stopped})")

if __name__ == "__main__":
    inspect()

