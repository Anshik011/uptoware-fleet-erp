import frappe

def test_je():
    print("Testing Journal Entry creation in ERPNext...")
    comp = "Uptoware"
    je = frappe.new_doc("Journal Entry")
    je.voucher_type = "Journal Entry"
    je.company = comp
    je.posting_date = frappe.utils.today()
    je.user_remark = "Test Operational Expense Posting"
    je.append("accounts", {
        "account": "Freight and Forwarding Charges - U",
        "debit_in_account_currency": 500.0,
        "cost_center": "Main - U"
    })
    je.append("accounts", {
        "account": "Cash - U",
        "credit_in_account_currency": 500.0,
        "cost_center": "Main - U"
    })
    je.insert()
    print("Draft Journal Entry created:", je.name)
    je.submit()
    print("Submitted Journal Entry:", je.name, "Docstatus:", je.docstatus)
    
    # Check GL Entry
    gl_entries = frappe.get_all("GL Entry", filters={"voucher_no": je.name}, fields=["account", "debit", "credit"])
    print("GL Entries automatically created by ERPNext:")
    for gl in gl_entries:
        print(f"  {gl.account}: Debit={gl.debit}, Credit={gl.credit}")
        
    # Cancel for clean-up
    je.cancel()
    print("Cancelled Journal Entry cleanly:", je.name, "Docstatus:", je.docstatus)
    frappe.delete_doc("Journal Entry", je.name)
    print("Deleted test Journal Entry.")

test_je()
