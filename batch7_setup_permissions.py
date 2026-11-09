import frappe
from frappe.permissions import setup_custom_perms

def setup_permissions():
    import frappe
    from frappe.permissions import setup_custom_perms
    print("=== CONFIGURING BATCH 7 ROLE PERMISSIONS ===")

    doctypes = [
        "Supplier",
        "Material Request",
        "Request for Quotation",
        "Supplier Quotation",
        "Purchase Order",
        "Purchase Receipt",
        "Purchase Invoice",
        "Payment Entry"
    ]

    for dt in doctypes:
        setup_custom_perms(dt)

    perms_matrix = {
        "Fleet Manager": {
            "Supplier": {"read": 1, "write": 1, "create": 1, "delete": 0, "report": 1},
            "Material Request": {"read": 1, "write": 1, "create": 1, "submit": 1, "cancel": 1, "delete": 0, "report": 1},
            "Request for Quotation": {"read": 1, "write": 1, "create": 1, "submit": 1, "cancel": 1, "delete": 0, "report": 1},
            "Supplier Quotation": {"read": 1, "write": 1, "create": 1, "submit": 1, "cancel": 1, "delete": 0, "report": 1},
            "Purchase Order": {"read": 1, "write": 1, "create": 1, "submit": 1, "cancel": 1, "delete": 0, "report": 1},
            "Purchase Receipt": {"read": 1, "write": 0, "create": 0, "submit": 0, "cancel": 1, "delete": 0, "report": 1},
            "Purchase Invoice": {"read": 1, "write": 0, "create": 0, "submit": 0, "cancel": 0, "delete": 0, "report": 1},
            "Payment Entry": {"read": 1, "write": 0, "create": 0, "submit": 0, "cancel": 0, "delete": 0, "report": 1}
        },
        "Store Manager": {
            "Supplier": {"read": 1, "write": 1, "create": 1, "delete": 0, "report": 1},
            "Material Request": {"read": 1, "write": 1, "create": 1, "submit": 1, "cancel": 1, "delete": 0, "report": 1},
            "Request for Quotation": {"read": 1, "write": 1, "create": 1, "submit": 1, "cancel": 1, "delete": 0, "report": 1},
            "Supplier Quotation": {"read": 1, "write": 1, "create": 1, "submit": 1, "cancel": 1, "delete": 0, "report": 1},
            "Purchase Order": {"read": 1, "write": 1, "create": 1, "submit": 0, "cancel": 0, "delete": 0, "report": 1},
            "Purchase Receipt": {"read": 1, "write": 1, "create": 1, "submit": 1, "cancel": 0, "delete": 0, "report": 1},
            "Purchase Invoice": {"read": 1, "write": 0, "create": 0, "submit": 0, "cancel": 0, "delete": 0, "report": 1},
            "Payment Entry": {"read": 0, "write": 0, "create": 0, "submit": 0, "cancel": 0, "delete": 0, "report": 0}
        },
        "Workshop Supervisor": {
            "Supplier": {"read": 1, "write": 0, "create": 0, "delete": 0, "report": 1},
            "Material Request": {"read": 1, "write": 1, "create": 1, "submit": 1, "cancel": 0, "delete": 0, "report": 1},
            "Request for Quotation": {"read": 1, "write": 0, "create": 0, "submit": 0, "cancel": 0, "delete": 0, "report": 1},
            "Supplier Quotation": {"read": 1, "write": 0, "create": 0, "submit": 0, "cancel": 0, "delete": 0, "report": 1},
            "Purchase Order": {"read": 1, "write": 0, "create": 0, "submit": 0, "cancel": 0, "delete": 0, "report": 1},
            "Purchase Receipt": {"read": 1, "write": 0, "create": 0, "submit": 0, "cancel": 0, "delete": 0, "report": 1},
            "Purchase Invoice": {"read": 0, "write": 0, "create": 0, "submit": 0, "cancel": 0, "delete": 0, "report": 0},
            "Payment Entry": {"read": 0, "write": 0, "create": 0, "submit": 0, "cancel": 0, "delete": 0, "report": 0}
        },
        "Accountant": {
            "Supplier": {"read": 1, "write": 1, "create": 1, "delete": 0, "report": 1},
            "Material Request": {"read": 1, "write": 0, "create": 0, "submit": 0, "cancel": 0, "delete": 0, "report": 1},
            "Request for Quotation": {"read": 1, "write": 0, "create": 0, "submit": 0, "cancel": 0, "delete": 0, "report": 1},
            "Supplier Quotation": {"read": 1, "write": 0, "create": 0, "submit": 0, "cancel": 0, "delete": 0, "report": 1},
            "Purchase Order": {"read": 1, "write": 0, "create": 0, "submit": 0, "cancel": 0, "delete": 0, "report": 1},
            "Purchase Receipt": {"read": 1, "write": 0, "create": 0, "submit": 0, "cancel": 0, "delete": 0, "report": 1},
            "Purchase Invoice": {"read": 1, "write": 1, "create": 1, "submit": 1, "cancel": 1, "delete": 0, "report": 1},
            "Payment Entry": {"read": 1, "write": 1, "create": 1, "submit": 1, "cancel": 1, "delete": 0, "report": 1}
        },
        "System Manager": {
            "Supplier": {"read": 1, "write": 1, "create": 1, "submit": 0, "cancel": 0, "delete": 1, "report": 1},
            "Material Request": {"read": 1, "write": 1, "create": 1, "submit": 1, "cancel": 1, "delete": 1, "report": 1},
            "Request for Quotation": {"read": 1, "write": 1, "create": 1, "submit": 1, "cancel": 1, "delete": 1, "report": 1},
            "Supplier Quotation": {"read": 1, "write": 1, "create": 1, "submit": 1, "cancel": 1, "delete": 1, "report": 1},
            "Purchase Order": {"read": 1, "write": 1, "create": 1, "submit": 1, "cancel": 1, "delete": 1, "report": 1},
            "Purchase Receipt": {"read": 1, "write": 1, "create": 1, "submit": 1, "cancel": 1, "delete": 1, "report": 1},
            "Purchase Invoice": {"read": 1, "write": 1, "create": 1, "submit": 1, "cancel": 1, "delete": 1, "report": 1},
            "Payment Entry": {"read": 1, "write": 1, "create": 1, "submit": 1, "cancel": 1, "delete": 1, "report": 1}
        }
    }

    for role, dt_map in perms_matrix.items():
        for dt, p_dict in dt_map.items():
            perm_name = frappe.db.get_value("Custom DocPerm", {"parent": dt, "role": role}, "name")
            if perm_name:
                dp = frappe.get_doc("Custom DocPerm", perm_name)
                dp.update(p_dict)
                dp.save(ignore_permissions=True)
            else:
                doc_p = {
                    "doctype": "Custom DocPerm",
                    "parent": dt,
                    "parenttype": "DocType",
                    "parentfield": "permissions",
                    "role": role
                }
                doc_p.update(p_dict)
                frappe.get_doc(doc_p).insert(ignore_permissions=True)
            print(f"Set Custom DocPerm: {dt} for {role}")

    frappe.db.commit()
    print("Permissions configured successfully.")

if __name__ == '__main__':
    setup_permissions()
