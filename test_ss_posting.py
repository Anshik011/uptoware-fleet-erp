def test_posting_in_ss():
    import frappe
    from frappe.handler import execute_cmd
    from frappe.model.workflow import apply_workflow

    ss_name = "test_ss_posting"
    if frappe.db.exists("Server Script", ss_name):
        frappe.delete_doc("Server Script", ss_name, force=1)

    code = """# API to test Journal Entry creation inside Server Script
exp_name = frappe.form_dict.get("expense_name")
exp = frappe.get_doc("Operational Expense", exp_name)

if exp.approval_status != "Approved":
    frappe.throw("Only Approved Operational Expenses can be posted to accounting.")

if exp.accounting_status == "Posted":
    frappe.throw("Operational Expense is already posted.")

# Create Journal Entry
je = frappe.new_doc("Journal Entry")
je.posting_date = exp.expense_date
je.company = exp.company
je.user_remark = f"Operational Expense: {exp.name}"
je.custom_operational_expense = exp.name

# Rows
je.append("accounts", {
    "account": exp.expense_account or "Travel Expenses - U",
    "debit_in_account_currency": exp.amount,
    "credit_in_account_currency": 0,
    "cost_center": exp.cost_center or "Main - U"
})
je.append("accounts", {
    "account": exp.payment_account or "Cash - U",
    "credit_in_account_currency": exp.amount,
    "debit_in_account_currency": 0,
    "cost_center": exp.cost_center or "Main - U"
})

je.insert(ignore_permissions=True)
je.submit()

# Update exp
exp.posting_document_type = "Journal Entry"
exp.posting_document_name = je.name
exp.accounting_status = "Posted"
exp.posted_amount = exp.amount
exp.payment_status = "Paid"
exp.paid_amount = exp.amount
exp.posted_by = frappe.session.user
exp.posted_on = frappe.utils.now_datetime()
exp.save(ignore_permissions=True)

frappe.response["message"] = {"status": "success", "journal_entry": je.name}
"""
    ss = frappe.get_doc({
        "doctype": "Server Script",
        "name": ss_name,
        "script_type": "API",
        "api_method": "test_ss_posting",
        "script": code,
        "disabled": 0
    })
    ss.insert(ignore_permissions=True)
    frappe.clear_cache()
    frappe.db.commit()

    # Create dummy expense in Draft
    exp = frappe.get_doc({
        "doctype": "Operational Expense",
        "expense_date": frappe.utils.today(),
        "expense_category": "Parking",
        "amount": 100,
        "company": "Uptoware",
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    frappe.db.commit()

    # Apply workflow action "Approve"
    apply_workflow(exp, "Approve")
    exp.reload()
    print(f"Expense approval status after workflow: {exp.approval_status}")

    frappe.form_dict.expense_name = exp.name
    try:
        execute_cmd("test_ss_posting")
        print("Response:", frappe.response.get("message"))
        exp.reload()
        print(f"Exp {exp.name} posted: doc={exp.posting_document_name}, status={exp.accounting_status}, paid_amount={exp.paid_amount}")
        
        # Test cancel
        je_doc = frappe.get_doc("Journal Entry", exp.posting_document_name)
        je_doc.cancel()
        print(f"Cancelled JE {je_doc.name}")
    finally:
        # cleanup
        frappe.delete_doc("Operational Expense", exp.name, force=1)
        frappe.delete_doc("Server Script", ss_name, force=1)
        frappe.db.commit()

test_posting_in_ss()
