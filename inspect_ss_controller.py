import frappe
import inspect

def run():
    meta = frappe.get_meta("Scheduled Job Type")
    fields = [df.fieldname for df in meta.fields]
    print("Scheduled Job Type fields:", fields)

    from frappe.core.doctype.server_script.server_script import ServerScript
    print("ServerScript methods:", [m for m in dir(ServerScript) if not m.startswith("__")])
    for m in ["on_update", "after_insert", "on_trash", "sync_scheduled_jobs", "create_scheduled_job"]:
        if hasattr(ServerScript, m):
            print(f"--- {m} ---")
            print(inspect.getsource(getattr(ServerScript, m)))

run()

