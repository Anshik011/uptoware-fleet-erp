import frappe
wf = frappe.get_doc("Workflow", "Vehicle Breakdown Lifecycle")
print("=== WORKFLOW STATES & ALLOW_EDIT ===")
for s in wf.states:
    print(f"State: {s.state:15} | allow_edit: {s.allow_edit}")
