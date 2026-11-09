def run():
    import frappe
    from frappe.utils.safe_exec import get_safe_globals
    sg = get_safe_globals()
    fr = sg.get("frappe")
    print("Does frappe in safe_globals have get_roles?:", hasattr(fr, "get_roles"))
    print("Does frappe in safe_globals have get_roles_for?:", hasattr(fr, "get_roles_for"))
    
    # Check if frappe.db.get_all('Has Role') works
    user = frappe.session.user
    roles = [r.role for r in frappe.db.get_all("Has Role", filters={"parent": user}, fields=["role"])]
    print(f"Roles for {user} via db.get_all:", roles)

run()
