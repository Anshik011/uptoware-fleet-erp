import frappe

def inspect_prereqs():
    print("=== 1. FLEET SETTINGS DOCTYPE META & VALUES ===")
    if frappe.db.exists("DocType", "Fleet Settings"):
        meta = frappe.get_meta("Fleet Settings")
        print("Fleet Settings fields:", [(f.fieldname, f.fieldtype, f.options) for f in meta.fields])
        try:
            doc = frappe.get_single("Fleet Settings")
            print("Fleet Settings values:", doc.as_dict())
        except Exception as e:
            print("Error getting Fleet Settings:", e)
    else:
        print("Fleet Settings does not exist.")

    print("\n=== 2. FLEET EXPIRY NOTIFICATION LOG ===")
    if frappe.db.exists("DocType", "Fleet Expiry Notification Log"):
        meta = frappe.get_meta("Fleet Expiry Notification Log")
        print("Fleet Expiry Notification Log fields:", [(f.fieldname, f.fieldtype) for f in meta.fields])
        count = frappe.db.count("Fleet Expiry Notification Log")
        print(f"Total existing records: {count}")
    else:
        print("Fleet Expiry Notification Log does not exist.")

    print("\n=== 3. SCHEDULED JOB TYPES (Fleet related) ===")
    schedules = frappe.get_all("Scheduled Job Type", fields=["name", "method", "frequency", "cron_format", "stopped"])
    for s in schedules:
        if any(k in s.name.lower() or k in (s.method or "").lower() for k in ["fleet", "expiry", "insurance", "vehicle"]):
            print(s)

    print("\n=== 4. EXISTING SERVER SCRIPTS (Scheduler or Notification) ===")
    scripts = frappe.get_all("Server Script", fields=["name", "script_type", "reference_doctype", "event_frequency"])
    for sc in scripts:
        if sc.script_type in ["Scheduler Event", "DocType Event"] and any(k in sc.name.lower() for k in ["notify", "alert", "expiry", "reminder", "scheduler"]):
            print(sc)

    print("\n=== 5. NATIVE FRAPPE NOTIFICATION DOCTYPE ===")
    n_meta = frappe.get_meta("Notification")
    print("Notification fields:", [(f.fieldname, f.fieldtype) for f in n_meta.fields[:15]])
    existing_n = frappe.get_all("Notification", fields=["name", "subject", "document_type", "event", "enabled"])
    print("Existing Notification records:", existing_n)

    print("\n=== 6. NATIVE FRAPPE NOTIFICATION LOG DOCTYPE ===")
    nl_meta = frappe.get_meta("Notification Log")
    print("Notification Log fields:", [(f.fieldname, f.fieldtype) for f in nl_meta.fields])

    print("\n=== 7. EMAIL ACCOUNTS & QUEUE ===")
    emails = frappe.get_all("Email Account", fields=["name", "email_id", "default_outgoing", "enable_outgoing"])
    print("Email Accounts:", emails)
    queue_count = frappe.db.count("Email Queue")
    print("Email Queue count:", queue_count)

if __name__ == "__main__":
    inspect_prereqs()

