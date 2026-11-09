import frappe

def run():
    perms = frappe.db.sql("""
        SELECT role, `create`, `write`, `submit`, `cancel`
        FROM `tabDocPerm`
        WHERE parent = 'Sales Invoice' AND `create` = 1
    """, as_dict=True)
    print("Roles with create on Sales Invoice in DocPerm:")
    for p in perms:
        print(" ", p)

    cperms = frappe.db.sql("""
        SELECT role, `create`, `write`, `submit`, `cancel`
        FROM `tabCustom DocPerm`
        WHERE parent = 'Sales Invoice' AND `create` = 1
    """, as_dict=True)
    print("Roles with create on Sales Invoice in Custom DocPerm:")
    for p in cperms:
        print(" ", p)

if __name__ == "__main__":
    run()

