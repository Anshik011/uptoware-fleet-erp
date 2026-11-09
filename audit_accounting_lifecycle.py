def run():
    import frappe
    from frappe.utils import flt, now_datetime
    from frappe.model.workflow import apply_workflow
    from frappe.handler import execute_cmd

    print("\n=======================================================")
    print("   BATCH 5 ACCOUNTING LIFECYCLE VERIFICATION AUDIT     ")
    print("=======================================================\n")
    
    frappe.set_user("Administrator")
    company = "Uptoware"
    today = frappe.utils.today()
    bank_acc_name = "HDFC Bank - U"
    supplier_name = "Audit Test Spares & Fuels"

    # 1. Cash expense: approve, post, and verify GL
    print("\n--- 1. Testing Cash Expense ---")
    cash_exp = frappe.get_doc({
        "doctype": "Operational Expense",
        "expense_date": today,
        "expense_category": "Toll and Road Charges",
        "amount": 250.0,
        "payment_method": "Cash",
        "company": company,
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    apply_workflow(cash_exp, "Approve")
    cash_exp.reload()
    
    frappe.form_dict.expense_name = cash_exp.name
    execute_cmd("post_operational_expense")
    cash_exp.reload()
    print(f"Cash Expense {cash_exp.name}: Status={cash_exp.approval_status}, Accounting={cash_exp.accounting_status}, Payment={cash_exp.payment_status}, JE={cash_exp.posting_document_name}")
    
    gl_entries_cash = frappe.db.get_all("GL Entry", filters={"voucher_no": cash_exp.posting_document_name}, fields=["account", "debit", "credit"])
    print(f"GL Entries for Cash JE ({cash_exp.posting_document_name}):")
    for gle in gl_entries_cash:
        print(f"  Account: {gle.account} | Debit: {gle.debit} | Credit: {gle.credit}")

    # 2. Bank expense: approve, post, and verify GL
    print("\n--- 2. Testing Bank Expense ---")
    bank_exp = frappe.get_doc({
        "doctype": "Operational Expense",
        "expense_date": today,
        "expense_category": "Parking",
        "amount": 400.0,
        "payment_method": "Wire Transfer",
        "company": company,
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    apply_workflow(bank_exp, "Approve")
    bank_exp.reload()
    
    frappe.form_dict.expense_name = bank_exp.name
    execute_cmd("post_operational_expense")
    bank_exp.reload()
    print(f"Bank Expense {bank_exp.name}: Status={bank_exp.approval_status}, Accounting={bank_exp.accounting_status}, Payment={bank_exp.payment_status}, JE={bank_exp.posting_document_name}")
    
    gl_entries_bank = frappe.db.get_all("GL Entry", filters={"voucher_no": bank_exp.posting_document_name}, fields=["account", "debit", "credit"])
    print(f"GL Entries for Bank JE ({bank_exp.posting_document_name}):")
    for gle in gl_entries_bank:
        print(f"  Account: {gle.account} | Debit: {gle.debit} | Credit: {gle.credit}")

    # 3. Supplier-credit expense: approve, post, and verify payable
    print("\n--- 3. Testing Supplier-Credit Expense ---")
    credit_exp = frappe.get_doc({
        "doctype": "Operational Expense",
        "expense_date": today,
        "expense_category": "Loading and Unloading",
        "amount": 1500.0,
        "supplier": supplier_name,
        "company": company,
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    apply_workflow(credit_exp, "Approve")
    credit_exp.reload()
    
    frappe.form_dict.expense_name = credit_exp.name
    execute_cmd("post_operational_expense")
    credit_exp.reload()
    print(f"Credit Expense {credit_exp.name}: Status={credit_exp.approval_status}, Accounting={credit_exp.accounting_status}, Payment={credit_exp.payment_status}, PostedAmt={credit_exp.posted_amount}, PaidAmt={credit_exp.paid_amount}, JE={credit_exp.posting_document_name}")
    
    gl_entries_credit = frappe.db.get_all("GL Entry", filters={"voucher_no": credit_exp.posting_document_name}, fields=["account", "party_type", "party", "debit", "credit"])
    print(f"GL Entries for Credit JE ({credit_exp.posting_document_name}):")
    for gle in gl_entries_credit:
        print(f"  Account: {gle.account} | Party: {gle.party_type} / {gle.party} | Debit: {gle.debit} | Credit: {gle.credit}")

    # 4. Settle supplier payable using standard ERPNext Payment Entry
    print("\n--- 4. Settling Supplier Payable via Standard Payment Entry ---")
    pe = frappe.new_doc("Payment Entry")
    pe.payment_type = "Pay"
    pe.party_type = "Supplier"
    pe.party = supplier_name
    pe.company = company
    pe.paid_from = bank_acc_name
    pe.paid_to = "Creditors - U"
    pe.paid_amount = 1500.0
    pe.received_amount = 1500.0
    pe.reference_no = f"PAY-{credit_exp.name}"
    pe.reference_date = today
    
    pe.append("references", {
        "reference_doctype": "Journal Entry",
        "reference_name": credit_exp.posting_document_name,
        "total_amount": 1500.0,
        "outstanding_amount": 1500.0,
        "allocated_amount": 1500.0
    })
    pe.insert(ignore_permissions=True)
    pe.submit()
    print(f"Submitted Payment Entry: {pe.name}")
    
    # Reload Operational Expense to verify settlement linkage
    credit_exp.reload()
    print(f"Credit Expense after Payment Entry: Payment Status={credit_exp.payment_status}, Paid Amount={credit_exp.paid_amount}")
    assert credit_exp.payment_status == "Paid", f"Expected Paid, got {credit_exp.payment_status}"
    assert flt(credit_exp.paid_amount) == 1500.0, f"Expected 1500.0, got {credit_exp.paid_amount}"

    # 5. Cancel cash Journal Entry
    print("\n--- 5. Testing Cash JE Cancellation ---")
    je_cash = frappe.get_doc("Journal Entry", cash_exp.posting_document_name)
    je_cash.cancel()
    cash_exp.reload()
    print(f"Cash Expense after JE Cancel: Accounting={cash_exp.accounting_status}, Payment={cash_exp.payment_status}, PostedAmt={cash_exp.posted_amount}, PaidAmt={cash_exp.paid_amount}")

    # 6. Attempt to cancel supplier-credit JE while Payment Entry is active
    print("\n--- 6. Attempting to Cancel Supplier-Credit JE with Active Payment Entry ---")
    je_credit = frappe.get_doc("Journal Entry", credit_exp.posting_document_name)
    try:
        je_credit.cancel()
        print("FAIL: Journal Entry cancellation was NOT blocked while Payment Entry was active!")
    except Exception as e:
        print(f"SUCCESS: Cancellation safely blocked by guard: {e}")

    # 7. Cancel Payment Entry first, then cancel supplier-credit JE
    print("\n--- 7. Cancelling Payment Entry then Supplier-Credit JE ---")
    pe.cancel()
    credit_exp.reload()
    print(f"Credit Expense after Payment Entry Cancel: Payment Status={credit_exp.payment_status}, Paid Amount={credit_exp.paid_amount}")
    assert credit_exp.payment_status == "Unpaid", f"Expected Unpaid, got {credit_exp.payment_status}"
    assert flt(credit_exp.paid_amount) == 0.0, f"Expected 0.0, got {credit_exp.paid_amount}"

    # Now cancel the supplier-credit JE
    je_credit.reload()
    je_credit.cancel()
    credit_exp.reload()
    print(f"Credit Expense after JE Cancel: Accounting={credit_exp.accounting_status}, Payment={credit_exp.payment_status}, PostedAmt={credit_exp.posted_amount}, PaidAmt={credit_exp.paid_amount}")
    assert credit_exp.accounting_status == "Cancelled", f"Expected Cancelled, got {credit_exp.accounting_status}"

    # 8. Duplicate posting prevention check
    print("\n--- 8. Testing Duplicate Posting Block ---")
    try:
        frappe.form_dict.expense_name = bank_exp.name
        execute_cmd("post_operational_expense")
        print("FAIL: Duplicate posting was NOT blocked!")
    except Exception as e:
        print(f"SUCCESS: Duplicate posting blocked: {e}")

    frappe.db.rollback()
    print("\nAll audit transactions rolled back cleanly. No residual test data left in GL.")

run()
