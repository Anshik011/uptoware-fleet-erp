import frappe

def run():
    meta = frappe.get_meta("Server Script")
    for df in meta.fields:
        if df.fieldname in ["script_type", "event_frequency", "doctype_event"]:
            print(df.fieldname, "->", df.options)

    # Also check Scheduled Job Type doctype
    print("Scheduled Job Types count:", frappe.db.count("Scheduled Job Type"))
    jobs = frappe.get_all("Scheduled Job Type", fields=["name", "method", "frequency"])
    print("Some jobs:", jobs[:5])

run()

