import frappe

def run():
    import inspect
    from frappe.core.doctype.server_script import server_script_utils
    print("server_script_utils methods:", [m for m in dir(server_script_utils) if not m.startswith("_")])
    for m in dir(server_script_utils):
        if "schedul" in m.lower():
            print("Found:", m)
            fn = getattr(server_script_utils, m)
            print(inspect.getsource(fn))

    # Also check if Frappe automatically generates Scheduled Job Type for server scripts
    jobs = frappe.get_all("Scheduled Job Type", filters={"server_script": ["is", "set"]}, fields=["name", "method", "server_script", "frequency"])
    print("Jobs with server_script:", jobs)

run()

