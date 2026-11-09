import frappe

def inspect_approvals():
    frappe.init("frontend")
    frappe.connect()

    print("======================================================================")
    print("      UPTOWARE FLEET ERP - BATCH 12 APPROVAL PRE-INSPECTION           ")
    print("======================================================================\n")

    # 1. Existing Workflows
    print("--- 1. EXISTING WORKFLOWS ---")
    workflows = frappe.get_all("Workflow", fields=["name", "document_type", "is_active", "workflow_state_field"])
    for wf in workflows:
        print(f"\nWorkflow: {wf.name} (DocType: {wf.document_type}, Active: {wf.is_active}, State Field: {wf.workflow_state_field})")
        doc = frappe.get_doc("Workflow", wf.name)
        print("  States:")
        for s in doc.states:
            print(f"    - {s.state} (doc_status: {s.doc_status}, update_field: {s.update_field}={s.update_value})")
        print("  Transitions:")
        for t in doc.transitions:
            print(f"    - {t.state} -> [{t.action}] -> {t.next_state} (Allowed Role: {t.allowed})")

    # 2. Existing Server Scripts for validations / approvals
    print("\n--- 2. EXISTING SERVER SCRIPTS ON APPROVAL-RELEVANT DOCTYPES ---")
    relevant_doctypes = [
        "Mining Trip", "Fuel Log", "Vehicle Breakdown", "Operational Expense",
        "Material Request", "Stock Entry", "Purchase Order", "Purchase Receipt",
        "Purchase Invoice", "Vehicle Insurance Policy", "Sales Invoice", "Payment Entry"
    ]
    scripts = frappe.get_all("Server Script", filters={"reference_doctype": ["in", relevant_doctypes]}, fields=["name", "reference_doctype", "doctype_event", "disabled"])
    for s in scripts:
        print(f"  - [{s.reference_doctype}] {s.name} ({s.doctype_event}) - Disabled: {s.disabled}")

    # 3. Inspect specific approval fields on DocTypes
    print("\n--- 3. APPROVAL & AUDIT FIELDS ON RELEVANT DOCTYPES ---")
    for dt in relevant_doctypes:
        meta = frappe.get_meta(dt)
        approval_fields = [
            f.fieldname for f in meta.fields 
            if any(term in f.fieldname.lower() for term in ["approv", "reject", "status", "workflow", "reason", "submit", "posted"])
        ]
        print(f"  {dt}: {approval_fields}")

    # 4. Inspect test users & roles
    print("\n--- 4. TEST USERS AND ROLES ---")
    test_users = frappe.db.sql("""
        SELECT u.name, u.email, GROUP_CONCAT(hr.role SEPARATOR ', ') as roles
        FROM `tabUser` u
        LEFT JOIN `tabHas Role` hr ON hr.parent = u.name
        WHERE u.email LIKE '%uptoware.local' OR u.name = 'Administrator'
        GROUP BY u.name
    """, as_dict=True)
    for u in test_users:
        print(f"  User: {u.name} ({u.email}) -> Roles: {u.roles}")

if __name__ == "__main__":
    inspect_approvals()

