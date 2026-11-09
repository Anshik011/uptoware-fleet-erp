def setup_workflow():
    import frappe

    print("Setting up Workflow 'Operational Expense Lifecycle'...")
    
    # 1. Ensure Workflow States exist
    states = ["Draft", "Submitted", "Approved", "Rejected"]
    for s in states:
        if not frappe.db.exists("Workflow State", s):
            ws = frappe.new_doc("Workflow State")
            ws.workflow_state_name = s
            ws.save()

    # 2. Ensure Workflow Actions exist in Workflow Action Master
    actions = ["Submit for Approval", "Approve", "Reject", "Re-open"]
    for a in actions:
        if not frappe.db.exists("Workflow Action Master", a):
            wam = frappe.new_doc("Workflow Action Master")
            wam.workflow_action_name = a
            wam.save()

    # 3. Setup Workflow
    wf_name = "Operational Expense Lifecycle"
    if frappe.db.exists("Workflow", wf_name):
        wf = frappe.get_doc("Workflow", wf_name)
    else:
        wf = frappe.new_doc("Workflow")
        wf.workflow_name = wf_name

    wf.document_type = "Operational Expense"
    wf.workflow_state_field = "approval_status"
    wf.is_active = 1
    wf.send_email_alert = 0

    wf.states = []
    wf.append("states", {"state": "Draft", "doc_status": "0", "allow_edit": "Driver"})
    wf.append("states", {"state": "Submitted", "doc_status": "0", "allow_edit": "Fleet Manager"})
    wf.append("states", {"state": "Approved", "doc_status": "0", "allow_edit": "Accountant"})
    wf.append("states", {"state": "Rejected", "doc_status": "0", "allow_edit": "Fleet Manager"})

    wf.transitions = []
    # Submit for Approval from Draft (allowed for Driver & Fleet Manager, allow_self_approval=1)
    wf.append("transitions", {
        "state": "Draft",
        "action": "Submit for Approval",
        "next_state": "Submitted",
        "allowed": "Driver",
        "allow_self_approval": 1
    })
    wf.append("transitions", {
        "state": "Draft",
        "action": "Submit for Approval",
        "next_state": "Submitted",
        "allowed": "Fleet Manager",
        "allow_self_approval": 1
    })
    # Approve from Submitted (Fleet Manager, allow_self_approval=0)
    wf.append("transitions", {
        "state": "Submitted",
        "action": "Approve",
        "next_state": "Approved",
        "allowed": "Fleet Manager",
        "allow_self_approval": 0
    })
    # Approve directly from Draft (Fleet Manager, allow_self_approval=0)
    wf.append("transitions", {
        "state": "Draft",
        "action": "Approve",
        "next_state": "Approved",
        "allowed": "Fleet Manager",
        "allow_self_approval": 0
    })
    # Reject from Submitted
    wf.append("transitions", {
        "state": "Submitted",
        "action": "Reject",
        "next_state": "Rejected",
        "allowed": "Fleet Manager",
        "allow_self_approval": 1
    })
    # Reject from Draft
    wf.append("transitions", {
        "state": "Draft",
        "action": "Reject",
        "next_state": "Rejected",
        "allowed": "Fleet Manager",
        "allow_self_approval": 1
    })
    # Re-open from Rejected to Draft
    wf.append("transitions", {
        "state": "Rejected",
        "action": "Re-open",
        "next_state": "Draft",
        "allowed": "Fleet Manager",
        "allow_self_approval": 1
    })
    wf.append("transitions", {
        "state": "Rejected",
        "action": "Re-open",
        "next_state": "Draft",
        "allowed": "Driver",
        "allow_self_approval": 1
    })

    wf.save()
    frappe.db.commit()
    print("Workflow 'Operational Expense Lifecycle' saved and committed successfully.")

setup_workflow()
