import frappe

def test():
    # check safe_exec globals for sendmail
    from frappe.utils.safe_exec import get_safe_globals
    safe_globals = get_safe_globals()
    frappe_obj = safe_globals.get("frappe")
    print("frappe attributes in safe_globals:")
    for attr in ["sendmail", "enqueue", "publish_realtime", "msgprint"]:
        print(f"frappe.{attr}:", hasattr(frappe_obj, attr))

test()

