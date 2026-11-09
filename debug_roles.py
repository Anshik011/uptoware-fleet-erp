import frappe
u = frappe.get_doc("User", "test_perm_workshop@example.com")
u.roles = []
u.append("roles", {"role": "Workshop Supervisor"})
u.append("roles", {"role": "Desk User"})
u.save(ignore_permissions=True)
frappe.db.commit()

roles = frappe.get_roles("test_perm_workshop@example.com")
print("ROLES FOR WORKSHOP SUPERVISOR NOW:", roles)
doc = frappe.get_doc("Vehicle Breakdown", {"repair_status": "In Workshop"})
print("DOC EXISTS:", doc.name)
frappe.set_user("test_perm_workshop@example.com")
print("HAS PERM WRITE:", frappe.has_permission("Vehicle Breakdown", "write", doc=doc.name))
print("HAS PERM READ:", frappe.has_permission("Vehicle Breakdown", "read", doc=doc.name))
