import frappe

def run():
    print("=== APPLYING BATCH 5 AUDIT FIXES & ENHANCEMENTS ===")

    # 1. Update Operational Expense DocType: clean up posting_document_type options
    doc_oe = frappe.get_doc("DocType", "Operational Expense")
    for f in doc_oe.fields:
        if f.fieldname == "posting_document_type":
            f.options = "Journal Entry"
    doc_oe.save(ignore_permissions=True)
    print("Updated Operational Expense: posting_document_type set to 'Journal Entry'.")

    # 2. Remove redundant Purchase Invoice custom field if present
    cf_pi = "Purchase Invoice-custom_operational_expense"
    if frappe.db.exists("Custom Field", cf_pi):
        frappe.delete_doc("Custom Field", cf_pi, force=1)
        print(f"Removed unused Custom Field: {cf_pi}")

    # Ensure HDFC Bank - U exists as a standard bank account for Uptoware
    if not frappe.db.exists("Account", "HDFC Bank - U"):
        frappe.get_doc({
            "doctype": "Account",
            "account_name": "HDFC Bank",
            "company": "Uptoware",
            "parent_account": "Bank Accounts - U",
            "account_type": "Bank",
            "is_group": 0,
            "currency": "INR"
        }).insert(ignore_permissions=True)
        print("Ensured Bank Account 'HDFC Bank - U' exists.")

    # Set default_bank_account on Company Uptoware
    comp = frappe.get_doc("Company", "Uptoware")
    if not comp.default_bank_account:
        comp.default_bank_account = "HDFC Bank - U"
        comp.save(ignore_permissions=True)
        print("Configured default_bank_account on Company Uptoware to 'HDFC Bank - U'.")

    # 3. Server Script: Operational Expense - Validations & Lifecycle (Before Save)
    ss_before_save_name = "Operational Expense - Validations & Lifecycle"
    ss_before_save_code = """# SERVER SCRIPT: Operational Expense - Validations & Lifecycle (Before Save)

# 1. Amount Validation
amt = float(doc.amount or 0.0)
if amt <= 0.0:
    frappe.throw("Amount must be greater than zero. Operational expense amount cannot be zero or negative.")

# 2. Date Validation
if not doc.expense_date:
    frappe.throw("Expense Date is mandatory.")

# 3. Category Validation
valid_categories = [
    "Toll and Road Charges",
    "Parking",
    "Loading and Unloading",
    "Food and Accommodation",
    "Weighbridge Charges",
    "Permit and Documentation",
    "Miscellaneous Operational Expenses"
]
if doc.expense_category not in valid_categories:
    frappe.throw(f"Invalid Expense Category '{doc.expense_category}'. Must be one of: {', '.join(valid_categories)}")

# 4. Operational Linkages Validation
if doc.vehicle and not frappe.db.exists("Vehicle", doc.vehicle):
    frappe.throw(f"Vehicle '{doc.vehicle}' does not exist.")

if doc.driver and not frappe.db.exists("Driver", doc.driver):
    frappe.throw(f"Driver '{doc.driver}' does not exist.")

if doc.mine_site and not frappe.db.exists("Mine Site", doc.mine_site):
    frappe.throw(f"Mine Site '{doc.mine_site}' does not exist.")

if doc.mining_trip:
    if not frappe.db.exists("Mining Trip", doc.mining_trip):
        frappe.throw(f"Mining Trip '{doc.mining_trip}' does not exist.")
    trip_v = frappe.db.get_value("Mining Trip", doc.mining_trip, "vehicle")
    if trip_v and doc.vehicle and trip_v != doc.vehicle:
        frappe.throw(f"Mining Trip '{doc.mining_trip}' belongs to Vehicle '{trip_v}', but '{doc.vehicle}' was selected.")

if doc.supplier and not frappe.db.exists("Supplier", doc.supplier):
    frappe.throw(f"Supplier '{doc.supplier}' does not exist.")

# 5. Company-Aware Default Accounts & Cost Center Resolution
if not doc.company:
    doc.company = frappe.defaults.get_user_default("Company") or frappe.db.get_single_value("Global Defaults", "default_company") or "Uptoware"

if not frappe.db.exists("Company", doc.company):
    frappe.throw(f"Company '{doc.company}' does not exist.")

company_abbr = frappe.db.get_value("Company", doc.company, "abbr")

if not doc.cost_center:
    doc.cost_center = frappe.db.get_value("Company", doc.company, "cost_center") or f"Main - {company_abbr}"

# Category to Base Account Mapping
cat_base_account_map = {
    "Toll and Road Charges": "Freight and Forwarding Charges",
    "Parking": "Travel Expenses",
    "Loading and Unloading": "Freight and Forwarding Charges",
    "Food and Accommodation": "Travel Expenses",
    "Weighbridge Charges": "Freight and Forwarding Charges",
    "Permit and Documentation": "Miscellaneous Expenses",
    "Miscellaneous Operational Expenses": "Miscellaneous Expenses"
}

if not doc.expense_account:
    base_acc_name = cat_base_account_map.get(doc.expense_category)
    if not base_acc_name:
        frappe.throw(f"No expense account mapping configured for category '{doc.expense_category}'. Please specify Expense Account.")
    candidate_acc = f"{base_acc_name} - {company_abbr}"
    if frappe.db.exists("Account", {"name": candidate_acc, "company": doc.company}):
        doc.expense_account = candidate_acc
    else:
        acc_match = frappe.db.get_value("Account", {"account_name": base_acc_name, "company": doc.company}, "name")
        if acc_match:
            doc.expense_account = acc_match
        else:
            frappe.throw(f"Expense Account '{candidate_acc}' for category '{doc.expense_category}' is not configured for Company '{doc.company}'. Please select a valid Expense Account.")

# Validate expense_account company
exp_acc_company = frappe.db.get_value("Account", doc.expense_account, "company")
if exp_acc_company and exp_acc_company != doc.company:
    frappe.throw(f"Expense Account '{doc.expense_account}' belongs to Company '{exp_acc_company}', but '{doc.company}' is selected.")

# Company-Aware Payment Account Resolution
if not doc.payment_account:
    # Check if supplier credit
    if doc.supplier:
        cand_payable = frappe.db.get_value("Company", doc.company, "default_payable_account") or f"Creditors - {company_abbr}"
        if frappe.db.exists("Account", {"name": cand_payable, "company": doc.company}):
            doc.payment_account = cand_payable
        else:
            frappe.throw(f"Default Payable Account '{cand_payable}' does not exist for Company '{doc.company}'. Please select Payment Account.")
    elif doc.payment_method:
        pm_type = frappe.db.get_value("Mode of Payment", doc.payment_method, "type")
        if pm_type == "Bank":
            cand_bank = frappe.db.get_value("Company", doc.company, "default_bank_account")
            if cand_bank and frappe.db.exists("Account", {"name": cand_bank, "company": doc.company}):
                doc.payment_account = cand_bank
            else:
                frappe.throw(f"Default Bank Account is not configured for Company '{doc.company}'. Please select a Bank Payment Account.")
        else:
            cand_cash = frappe.db.get_value("Company", doc.company, "default_cash_account") or f"Cash - {company_abbr}"
            if frappe.db.exists("Account", {"name": cand_cash, "company": doc.company}):
                doc.payment_account = cand_cash
            else:
                frappe.throw(f"Default Cash Account '{cand_cash}' does not exist for Company '{doc.company}'. Please select Payment Account.")
    else:
        cand_cash = frappe.db.get_value("Company", doc.company, "default_cash_account") or f"Cash - {company_abbr}"
        if frappe.db.exists("Account", {"name": cand_cash, "company": doc.company}):
            doc.payment_account = cand_cash
        else:
            frappe.throw(f"Default Cash Account '{cand_cash}' does not exist for Company '{doc.company}'. Please select Payment Account.")

# Validate payment_account company
pay_acc_company = frappe.db.get_value("Account", doc.payment_account, "company")
if pay_acc_company and pay_acc_company != doc.company:
    frappe.throw(f"Payment Account '{doc.payment_account}' belongs to Company '{pay_acc_company}', but '{doc.company}' is selected.")

# 6. Test Record Quarantine Propagation
if not doc.is_test_record:
    is_v_test = frappe.db.get_value("Vehicle", doc.vehicle, "is_test_record") if doc.vehicle else 0
    is_d_test = frappe.db.get_value("Driver", doc.driver, "is_test_record") if doc.driver else 0
    is_s_test = frappe.db.get_value("Mine Site", doc.mine_site, "is_test_record") if doc.mine_site else 0
    is_t_test = frappe.db.get_value("Mining Trip", doc.mining_trip, "is_test_record") if doc.mining_trip else 0
    is_series_test = 1 if (doc.naming_series and "TEST" in doc.naming_series) else 0
    if is_v_test or is_d_test or is_s_test or is_t_test or is_series_test:
        doc.is_test_record = 1

# 7. Lifecycle & Permissions Control
user_roles = [r.role for r in frappe.db.get_all("Has Role", filters={"parent": frappe.session.user}, fields=["role"])]
is_sys_mgr = ("System Manager" in user_roles) or (frappe.session.user == "Administrator")
is_fleet_mgr = ("Fleet Manager" in user_roles) or is_sys_mgr
is_accountant = ("Accountant" in user_roles) or is_sys_mgr

old_doc = doc.get_doc_before_save()
old_status = old_doc.get("approval_status") if old_doc else "Draft"
new_status = doc.approval_status or "Draft"

now_dt = frappe.utils.now_datetime()

# Transition to Submitted
if new_status == "Submitted" and old_status != "Submitted":
    if not doc.submitted_by:
        doc.submitted_by = frappe.session.user
    doc.submitted_on = now_dt

# Transition to Approved
if new_status == "Approved" and old_status != "Approved":
    if not is_fleet_mgr:
        frappe.throw("Only Fleet Manager or System Manager can approve Operational Expenses.")
    
    # Anti-self-approval rule
    if not is_sys_mgr:
        creator = doc.owner
        submitter = doc.submitted_by or creator
        if frappe.session.user in [creator, submitter]:
            frappe.throw("Self-approval is prohibited: The creator or submitter cannot approve their own Operational Expense.")

    doc.approved_by = frappe.session.user
    doc.approved_on = now_dt

# Transition to Rejected
if new_status == "Rejected" and old_status != "Rejected":
    if not is_fleet_mgr:
        frappe.throw("Only Fleet Manager or System Manager can reject Operational Expenses.")
    
    # Rejection reason enforcement
    if not (doc.rejection_reason and doc.rejection_reason.strip()):
        frappe.throw("A rejection reason is strictly required when rejecting an Operational Expense.")
    
    doc.rejected_by = frappe.session.user
    doc.rejected_on = now_dt

# 8. Protection of Audit Fields against manual modification
if old_doc and not is_sys_mgr:
    if old_status == new_status:
        audit_fields = [
            "submitted_by", "submitted_on",
            "approved_by", "approved_on",
            "rejected_by", "rejected_on"
        ]
        is_posting_now = (old_doc.get("accounting_status") != "Posted" and doc.accounting_status == "Posted")
        if not is_posting_now:
            audit_fields.extend(["posted_by", "posted_on"])
        for af in audit_fields:
            if doc.get(af) != old_doc.get(af):
                frappe.throw(f"Modification of approval audit field '{af}' is strictly prohibited.")

# 9. Financial Field Immutability After Approval
if old_status == "Approved":
    if not is_sys_mgr:
        locked_fields = [
            "amount", "expense_category", "vehicle", "mining_trip",
            "mine_site", "driver", "supplier", "payee_name",
            "payment_method", "expense_account", "payment_account",
            "cost_center", "company", "currency", "expense_date"
        ]
        for lf in locked_fields:
            if doc.get(lf) != old_doc.get(lf):
                frappe.throw(f"Financial and operational fields cannot be modified after approval. Field '{lf}' is locked.")

    if old_doc.get("accounting_status") == "Posted":
        posted_locked = [
            "amount", "expense_account", "payment_account", "cost_center",
            "company", "posting_document_type", "posting_document_name"
        ]
        for pl in posted_locked:
            if doc.get(pl) != old_doc.get(pl):
                frappe.throw(f"Cannot modify field '{pl}' on a posted Operational Expense. Reverse the linked accounting document first.")
"""
    ss_bs = frappe.get_doc("Server Script", ss_before_save_name)
    ss_bs.script = ss_before_save_code
    ss_bs.save(ignore_permissions=True)
    print(f"Updated Server Script: {ss_before_save_name}")

    # 4. Update Server Script: API post_operational_expense
    ss_api_name = "Operational Expense - Accounting Posting API"
    ss_api_code = """# SERVER SCRIPT API: post_operational_expense
# Posts an Approved Operational Expense to ERPNext General Ledger via standard Journal Entry

user_roles = [r.role for r in frappe.db.get_all("Has Role", filters={"parent": frappe.session.user}, fields=["role"])]
is_authorized = ("Accountant" in user_roles) or ("System Manager" in user_roles) or (frappe.session.user == "Administrator")
if not is_authorized:
    frappe.throw("Only Accountant or System Manager can post Operational Expenses to Accounting.")

exp_name = frappe.form_dict.get("expense_name")
if not exp_name:
    frappe.throw("Parameter 'expense_name' is required.")

if not frappe.db.exists("Operational Expense", exp_name):
    frappe.throw(f"Operational Expense '{exp_name}' does not exist.")

exp = frappe.get_doc("Operational Expense", exp_name)

# 1. State Validation
if exp.approval_status != "Approved":
    frappe.throw(f"Operational Expense '{exp.name}' is in status '{exp.approval_status}'. Only Approved expenses can be posted to accounting.")

# 2. Duplicate Posting Prevention
if exp.accounting_status == "Posted" or exp.posting_document_name:
    frappe.throw(f"Operational Expense '{exp.name}' is already posted to {exp.posting_document_type} '{exp.posting_document_name}'. Duplicate posting is prevented.")

# 3. Financial Integrity Validation
if float(exp.amount or 0.0) <= 0:
    frappe.throw("Expense amount must be greater than zero to post.")

if not exp.expense_account:
    frappe.throw("Expense Account is required for accounting posting.")

if not exp.payment_account:
    frappe.throw("Payment Account is required for accounting posting.")

if not frappe.db.exists("Account", exp.expense_account):
    frappe.throw(f"Expense Account '{exp.expense_account}' does not exist.")

if not frappe.db.exists("Account", exp.payment_account):
    frappe.throw(f"Payment Account '{exp.payment_account}' does not exist.")

# Validate account company
exp_comp = exp.company or "Uptoware"
exp_acc_comp = frappe.db.get_value("Account", exp.expense_account, "company")
pay_acc_comp = frappe.db.get_value("Account", exp.payment_account, "company")
if exp_acc_comp != exp_comp:
    frappe.throw(f"Expense Account '{exp.expense_account}' does not belong to Company '{exp_comp}'.")
if pay_acc_comp != exp_comp:
    frappe.throw(f"Payment Account '{exp.payment_account}' does not belong to Company '{exp_comp}'.")

# Check party requirement if payable
pay_acc_type = frappe.db.get_value("Account", exp.payment_account, "account_type")
if pay_acc_type == "Payable" and not exp.supplier:
    frappe.throw(f"Payment Account '{exp.payment_account}' is Payable. A valid Supplier is mandatory.")

cost_center = exp.cost_center or frappe.db.get_value("Company", exp_comp, "cost_center")

# 4. Construct standard ERPNext Journal Entry
je = frappe.new_doc("Journal Entry")
je.posting_date = exp.expense_date
je.company = exp_comp
je.user_remark = f"Operational Expense {exp.name}: {exp.expense_category} | Vehicle: {exp.vehicle or 'N/A'} | Trip: {exp.mining_trip or 'N/A'}"
je.custom_operational_expense = exp.name

# Debit Row (Expense)
debit_row = {
    "account": exp.expense_account,
    "debit_in_account_currency": exp.amount,
    "credit_in_account_currency": 0.0,
    "cost_center": cost_center
}
je.append("accounts", debit_row)

# Credit Row (Payment / Payable)
credit_row = {
    "account": exp.payment_account,
    "credit_in_account_currency": exp.amount,
    "debit_in_account_currency": 0.0,
    "cost_center": cost_center
}
if pay_acc_type == "Payable":
    credit_row["party_type"] = "Supplier"
    credit_row["party"] = exp.supplier

je.append("accounts", credit_row)

# Insert & Submit Journal Entry (posts to standard ERPNext GL)
je.insert(ignore_permissions=True)
je.submit()

# 5. Link & Update Operational Expense
now_dt = frappe.utils.now_datetime()
is_immediate = (pay_acc_type in ["Cash", "Bank"])

exp.posting_document_type = "Journal Entry"
exp.posting_document_name = je.name
exp.accounting_status = "Posted"
exp.posted_amount = exp.amount
exp.posted_by = frappe.session.user
exp.posted_on = now_dt

if is_immediate:
    exp.payment_status = "Paid"
    exp.paid_amount = exp.amount
else:
    exp.payment_status = "Unpaid"
    exp.paid_amount = 0.0

exp.save(ignore_permissions=True)
frappe.db.commit()

frappe.response["message"] = {
    "status": "success",
    "expense_name": exp.name,
    "posting_document_type": "Journal Entry",
    "posting_document_name": je.name,
    "accounting_status": exp.accounting_status,
    "payment_status": exp.payment_status,
    "posted_amount": exp.posted_amount,
    "paid_amount": exp.paid_amount
}
"""
    ss_api = frappe.get_doc("Server Script", ss_api_name)
    ss_api.script = ss_api_code
    ss_api.save(ignore_permissions=True)
    print(f"Updated Server Script API: {ss_api_name}")

    # 5. Server Script: Journal Entry - Prevent Cancellation If Active Payment Entry Exists (Before Cancel)
    ss_je_bc_name = "Journal Entry - Prevent Cancellation If Active Payment Exists"
    ss_je_bc_code = """# SERVER SCRIPT: Journal Entry - Prevent Cancellation If Active Payment Exists (Before Cancel)
if doc.custom_operational_expense:
    active_pes = frappe.db.sql(\"\"\"
        SELECT DISTINCT parent FROM `tabPayment Entry Reference`
        WHERE reference_doctype = 'Journal Entry' AND reference_name = %s AND docstatus = 1
    \"\"\", (doc.name,))
    if active_pes:
        pe_names = ", ".join([p[0] for p in active_pes])
        frappe.throw(f"Cannot cancel Journal Entry '{doc.name}' because active Payment Entry '{pe_names}' is linked to it. Cancel the linked Payment Entry first.")
"""
    if frappe.db.exists("Server Script", ss_je_bc_name):
        ss_je_bc = frappe.get_doc("Server Script", ss_je_bc_name)
        ss_je_bc.script = ss_je_bc_code
        ss_je_bc.disabled = 0
        ss_je_bc.save(ignore_permissions=True)
    else:
        ss_je_bc = frappe.get_doc({
            "doctype": "Server Script",
            "name": ss_je_bc_name,
            "script_type": "DocType Event",
            "reference_doctype": "Journal Entry",
            "doctype_event": "Before Cancel",
            "script": ss_je_bc_code,
            "disabled": 0
        })
        ss_je_bc.insert(ignore_permissions=True)
    print(f"Configured Server Script: {ss_je_bc_name}")

    # 6. Server Script: Payment Entry - Operational Expense Settlement Linkage (After Submit)
    ss_pe_sub_name = "Payment Entry - Operational Expense Settlement Linkage"
    ss_pe_sub_code = """# SERVER SCRIPT: Payment Entry - Operational Expense Settlement Linkage (After Submit)
for ref in (doc.references or []):
    if ref.reference_doctype == "Journal Entry" and ref.reference_name:
        oe_name = frappe.db.get_value("Journal Entry", ref.reference_name, "custom_operational_expense")
        if oe_name and frappe.db.exists("Operational Expense", oe_name):
            # Calculate cumulative payments across all submitted payment entries for this JE
            total_paid = frappe.db.sql(\"\"\"
                SELECT SUM(allocated_amount) FROM `tabPayment Entry Reference`
                WHERE reference_doctype = 'Journal Entry' AND reference_name = %s AND docstatus = 1
            \"\"\", (ref.reference_name,))[0][0] or 0.0
            
            posted_amt = float(frappe.db.get_value("Operational Expense", oe_name, "posted_amount") or 0.0)
            new_status = "Paid" if total_paid >= posted_amt and posted_amt > 0 else "Unpaid"
            
            frappe.db.set_value("Operational Expense", oe_name, {
                "paid_amount": total_paid,
                "payment_status": new_status
            })
"""
    if frappe.db.exists("Server Script", ss_pe_sub_name):
        ss_pe_sub = frappe.get_doc("Server Script", ss_pe_sub_name)
        ss_pe_sub.script = ss_pe_sub_code
        ss_pe_sub.disabled = 0
        ss_pe_sub.save(ignore_permissions=True)
    else:
        ss_pe_sub = frappe.get_doc({
            "doctype": "Server Script",
            "name": ss_pe_sub_name,
            "script_type": "DocType Event",
            "reference_doctype": "Payment Entry",
            "doctype_event": "After Submit",
            "script": ss_pe_sub_code,
            "disabled": 0
        })
        ss_pe_sub.insert(ignore_permissions=True)
    print(f"Configured Server Script: {ss_pe_sub_name}")

    # 7. Server Script: Payment Entry - Operational Expense Settlement Reversal (After Cancel)
    ss_pe_can_name = "Payment Entry - Operational Expense Settlement Reversal"
    ss_pe_can_code = """# SERVER SCRIPT: Payment Entry - Operational Expense Settlement Reversal (After Cancel)
for ref in (doc.references or []):
    if ref.reference_doctype == "Journal Entry" and ref.reference_name:
        oe_name = frappe.db.get_value("Journal Entry", ref.reference_name, "custom_operational_expense")
        if oe_name and frappe.db.exists("Operational Expense", oe_name):
            total_paid = frappe.db.sql(\"\"\"
                SELECT SUM(allocated_amount) FROM `tabPayment Entry Reference`
                WHERE reference_doctype = 'Journal Entry' AND reference_name = %s AND docstatus = 1
            \"\"\", (ref.reference_name,))[0][0] or 0.0
            
            posted_amt = float(frappe.db.get_value("Operational Expense", oe_name, "posted_amount") or 0.0)
            new_status = "Paid" if total_paid >= posted_amt and posted_amt > 0 else "Unpaid"
            
            frappe.db.set_value("Operational Expense", oe_name, {
                "paid_amount": total_paid,
                "payment_status": new_status
            })
"""
    if frappe.db.exists("Server Script", ss_pe_can_name):
        ss_pe_can = frappe.get_doc("Server Script", ss_pe_can_name)
        ss_pe_can.script = ss_pe_can_code
        ss_pe_can.disabled = 0
        ss_pe_can.save(ignore_permissions=True)
    else:
        ss_pe_can = frappe.get_doc({
            "doctype": "Server Script",
            "name": ss_pe_can_name,
            "script_type": "DocType Event",
            "reference_doctype": "Payment Entry",
            "doctype_event": "After Cancel",
            "script": ss_pe_can_code,
            "disabled": 0
        })
        ss_pe_can.insert(ignore_permissions=True)
    print(f"Configured Server Script: {ss_pe_can_name}")

    # 8. Clean up temporary test server script
    if frappe.db.exists("Server Script", "test_ss_api_posting"):
        frappe.delete_doc("Server Script", "test_ss_api_posting", force=1)
        print("Removed obsolete test Server Script: test_ss_api_posting")

    frappe.clear_cache()
    frappe.db.commit()
    print("=== ALL BATCH 5 AUDIT FIXES APPLIED & COMMITTED SUCCESSFULLY ===")

run()
