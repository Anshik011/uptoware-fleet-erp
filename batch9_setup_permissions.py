import frappe

def run():
    print("=== CONFIGURING BATCH 9 REPORT ROLES & PERMISSIONS ===")

    rep_configs = {
        # Financial / Commercial Reports
        "Customer-wise Revenue": ["System Manager", "Accountant", "Fleet Manager"],
        "Monthly Revenue Summary": ["System Manager", "Accountant", "Fleet Manager"],
        "Outstanding Revenue / Receivables": ["System Manager", "Accountant", "Fleet Manager"],
        "Operating Cost Summary": ["System Manager", "Accountant", "Fleet Manager"],
        "Unallocated Cost Register": ["System Manager", "Accountant", "Fleet Manager"],
        
        # Operational & Fleet Profitability Reports
        "Trip-wise Revenue and Profitability": ["System Manager", "Accountant", "Fleet Manager", "Workshop Supervisor", "Store Manager"],
        "Vehicle-wise Revenue and Profitability": ["System Manager", "Accountant", "Fleet Manager", "Workshop Supervisor", "Store Manager"],
        "Mine Site-wise Revenue and Profitability": ["System Manager", "Accountant", "Fleet Manager", "Workshop Supervisor", "Store Manager"],
        "Vehicle Operating Cost Analysis": ["System Manager", "Accountant", "Fleet Manager", "Workshop Supervisor", "Store Manager"],
        "Revenue vs Cost Analysis": ["System Manager", "Accountant", "Fleet Manager", "Workshop Supervisor", "Store Manager"]
    }

    for r_name, roles in rep_configs.items():
        if frappe.db.exists("Report", r_name):
            doc = frappe.get_doc("Report", r_name)
            doc.roles = []
            for r in roles:
                doc.append("roles", {"role": r})
            doc.save(ignore_permissions=True)
            print(f"Configured roles for '{r_name}': {roles}")

    # Ensure Accountant has create, write, submit on Sales Invoice
    has_acc_si = frappe.db.exists("Custom DocPerm", {"parent": "Sales Invoice", "role": "Accountant"})
    if not has_acc_si:
        frappe.get_doc({
            "doctype": "Custom DocPerm",
            "parent": "Sales Invoice",
            "parenttype": "DocType",
            "parentfield": "permissions",
            "role": "Accountant",
            "permlevel": 0,
            "read": 1,
            "write": 1,
            "create": 1,
            "delete": 0,
            "submit": 1,
            "cancel": 0,
            "report": 1
        }).insert(ignore_permissions=True)
        print("Granted Accountant create/write/submit on Sales Invoice.")

    # Ensure Fleet Manager has Read permission on Sales Invoice if not already present
    has_fm_si = frappe.db.exists("Custom DocPerm", {"parent": "Sales Invoice", "role": "Fleet Manager"})
    if not has_fm_si:
        frappe.get_doc({
            "doctype": "Custom DocPerm",
            "parent": "Sales Invoice",
            "parenttype": "DocType",
            "parentfield": "permissions",
            "role": "Fleet Manager",
            "permlevel": 0,
            "read": 1,
            "write": 0,
            "create": 0,
            "delete": 0,
            "submit": 0,
            "cancel": 0,
            "report": 1
        }).insert(ignore_permissions=True)
        print("Granted read-only access on Sales Invoice to Fleet Manager.")

    frappe.clear_cache()
    frappe.db.commit()
    print("=== BATCH 9 REPORT ROLES & PERMISSIONS CONFIGURED ===")

if __name__ == "__main__":
    run()

