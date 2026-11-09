import frappe

def run():
    print("=== WORKFLOW METADATA INSPECTION ===")
    wf_meta = frappe.get_meta("Workflow")
    print("Workflow fields:", [f.fieldname for f in wf_meta.fields])
    state_meta = frappe.get_meta("Workflow Document State")
    print("Workflow Document State fields:", [f.fieldname for f in state_meta.fields])
    trans_meta = frappe.get_meta("Workflow Transition")
    print("Workflow Transition fields:", [f.fieldname for f in trans_meta.fields])

run()
