import frappe

def run():
    if not frappe.db.exists("Module Def", "Fleet Management"):
        doc = frappe.get_doc({
            "doctype": "Module Def",
            "module_name": "Fleet Management",
            "app_name": "erpnext",
            "custom": 1
        })
        doc.insert()
        print("Created Module Def: Fleet Management")
    else:
        print("Module Def 'Fleet Management' already exists.")

run()
