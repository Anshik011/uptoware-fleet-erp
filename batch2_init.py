import frappe

def run():
    print("=== INSPECTING EXISTING DOCTYPES & MODULES ===")
    fuel_log = frappe.db.get_value("DocType", "Fuel Log", ["name", "module", "custom"], as_dict=True)
    print(f"Fuel Log: {fuel_log}")

    roles = frappe.get_all("Role", pluck="name")
    target_roles = ["Fleet Manager", "Weighbridge Operator", "Driver", "Accountant", "System Manager"]
    print("Role existence:")
    for r in target_roles:
        print(f"  {r}: {'EXISTS' if r in roles else 'MISSING'}")

    # Check Workflow States
    wf_states = frappe.get_all("Workflow State", pluck="name")
    print(f"Workflow States in system: {wf_states}")

    # Check Workflow Actions
    wf_actions = frappe.get_all("Workflow Action Master", pluck="name")
    print(f"Workflow Actions in system: {wf_actions}")

run()
