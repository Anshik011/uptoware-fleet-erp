import frappe

def run():
    print("=== 1. CREATING ROLES ===")
    roles_to_ensure = [
        {"role_name": "Fleet Manager", "desk_access": 1},
        {"role_name": "Weighbridge Operator", "desk_access": 1},
        {"role_name": "Driver", "desk_access": 1},
        {"role_name": "Accountant", "desk_access": 1}
    ]

    for r in roles_to_ensure:
        if not frappe.db.exists("Role", r["role_name"]):
            doc = frappe.get_doc({
                "doctype": "Role",
                "role_name": r["role_name"],
                "desk_access": r["desk_access"]
            })
            doc.insert(ignore_permissions=True)
            print(f"Created Role: {r['role_name']}")
        else:
            print(f"Role '{r['role_name']}' already exists.")

    print("\n=== 2. CREATING WORKFLOW STATES ===")
    workflow_states = [
        {"workflow_state_name": "Draft", "style": "Inverse"},
        {"workflow_state_name": "Dispatched", "style": "Primary"},
        {"workflow_state_name": "Weighbridge Confirmed", "style": "Info"},
        {"workflow_state_name": "Approved", "style": "Success"},
        {"workflow_state_name": "Delivered", "style": "Success"},
        {"workflow_state_name": "Cancelled", "style": "Danger"}
    ]

    for ws in workflow_states:
        if not frappe.db.exists("Workflow State", ws["workflow_state_name"]):
            doc = frappe.get_doc({
                "doctype": "Workflow State",
                "workflow_state_name": ws["workflow_state_name"],
                "style": ws["style"]
            })
            doc.insert(ignore_permissions=True)
            print(f"Created Workflow State: {ws['workflow_state_name']}")
        else:
            print(f"Workflow State '{ws['workflow_state_name']}' already exists.")

    print("\n=== 3. CREATING WORKFLOW ACTIONS ===")
    workflow_actions = [
        "Dispatch",
        "Confirm Weighbridge",
        "Approve",
        "Mark Delivered",
        "Cancel"
    ]

    for wa in workflow_actions:
        if not frappe.db.exists("Workflow Action Master", wa):
            doc = frappe.get_doc({
                "doctype": "Workflow Action Master",
                "workflow_action_name": wa
            })
            doc.insert(ignore_permissions=True)
            print(f"Created Workflow Action: {wa}")
        else:
            print(f"Workflow Action '{wa}' already exists.")

    frappe.db.commit()
    print("=== PREREQUISITES COMPLETED ===")

run()
