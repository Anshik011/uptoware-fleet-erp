import frappe

def run():
    import inspect
    from frappe.core.doctype.server_script.server_script import ServerScript
    print("--- sync_scheduled_job_type ---")
    print(inspect.getsource(ServerScript.sync_scheduled_job_type))
    print("--- execute_scheduled_method ---")
    print(inspect.getsource(ServerScript.execute_scheduled_method))

run()

