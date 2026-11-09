import frappe
from frappe.permissions import setup_custom_perms

def run():
    print("=== BATCH 8: CONFIGURING ROLE PERMISSIONS ===")

    doctypes = ["Vehicle Insurance Policy", "Fleet Settings", "Fleet Expiry Notification Log"]

    perm_matrix = {
        "Vehicle Insurance Policy": [
            {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1, "select": 1},
            {"role": "Fleet Manager", "read": 1, "write": 1, "create": 1, "delete": 0, "report": 1, "select": 1},
            {"role": "Workshop Supervisor", "read": 1, "write": 0, "create": 0, "delete": 0, "report": 1, "select": 1},
            {"role": "Store Manager", "read": 1, "write": 0, "create": 0, "delete": 0, "report": 1, "select": 1},
            {"role": "Accountant", "read": 1, "write": 0, "create": 0, "delete": 0, "report": 1, "select": 1}
        ],
        "Fleet Settings": [
            {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1, "select": 1},
            {"role": "Fleet Manager", "read": 1, "write": 1, "create": 1, "delete": 0, "report": 1, "select": 1},
            {"role": "Workshop Supervisor", "read": 1, "write": 0, "create": 0, "delete": 0, "report": 1, "select": 1},
            {"role": "Store Manager", "read": 1, "write": 0, "create": 0, "delete": 0, "report": 1, "select": 1},
            {"role": "Accountant", "read": 1, "write": 0, "create": 0, "delete": 0, "report": 1, "select": 1}
        ],
        "Fleet Expiry Notification Log": [
            {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1, "select": 1},
            {"role": "Fleet Manager", "read": 1, "write": 0, "create": 0, "delete": 0, "report": 1, "select": 1},
            {"role": "Workshop Supervisor", "read": 1, "write": 0, "create": 0, "delete": 0, "report": 1, "select": 1},
            {"role": "Store Manager", "read": 1, "write": 0, "create": 0, "delete": 0, "report": 1, "select": 1},
            {"role": "Accountant", "read": 1, "write": 0, "create": 0, "delete": 0, "report": 1, "select": 1}
        ]
    }

    for dt, perms in perm_matrix.items():
        # Clean existing Custom DocPerms for this doctype
        frappe.db.delete("Custom DocPerm", {"parent": dt})
        for idx, p in enumerate(perms, start=1):
            cdp = frappe.get_doc({
                "doctype": "Custom DocPerm",
                "parent": dt,
                "parenttype": "DocType",
                "parentfield": "permissions",
                "idx": idx,
                "role": p["role"],
                "read": p.get("read", 0),
                "write": p.get("write", 0),
                "create": p.get("create", 0),
                "delete": p.get("delete", 0),
                "report": p.get("report", 0),
                "select": p.get("select", 0),
                "permlevel": 0
            })
            cdp.insert(ignore_permissions=True)
        print(f"Configured Custom DocPerm for: {dt}")

    frappe.clear_cache()
    frappe.db.commit()
    print("=== PERMISSIONS CONFIGURATION COMPLETED ===")

if __name__ == "__main__":
    run()

