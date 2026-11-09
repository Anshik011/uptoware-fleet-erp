def run():
    import frappe

    print("=== CONFIGURING BATCH 5 SERVER & CLIENT SCRIPTS ===")

    # 1. Server Script: Operational Expense - Validations & Lifecycle (Before Save)
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

# 5. Default Accounts Mapping (if not set)
if not doc.company:
    doc.company = "Uptoware"
if not doc.cost_center:
    doc.cost_center = "Main - U"

cat_account_map = {
    "Toll and Road Charges": "Freight and Forwarding Charges - U",
    "Parking": "Travel Expenses - U",
    "Loading and Unloading": "Freight and Forwarding Charges - U",
    "Food and Accommodation": "Travel Expenses - U",
    "Weighbridge Charges": "Freight and Forwarding Charges - U",
    "Permit and Documentation": "Miscellaneous Expenses - U",
    "Miscellaneous Operational Expenses": "Miscellaneous Expenses - U"
}

if not doc.expense_account:
    doc.expense_account = cat_account_map.get(doc.expense_category, "Miscellaneous Expenses - U")

if not doc.payment_account:
    if doc.payment_method in ["Credit", "Payable"] and doc.supplier:
        doc.payment_account = "Creditors - U"
    else:
        doc.payment_account = "Cash - U"

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

# Setting up timestamps and user stamps
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

# Controlled re-opening from Rejected to Draft
if old_status == "Rejected" and new_status == "Draft":
    # Allowed for corrections
    pass

# 8. Protection of Audit Fields against manual modification
if old_doc and not is_sys_mgr:
    # If not transitioning states, audit fields cannot be altered manually
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
    # Lock operational and financial fields
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

    # If posted to GL, strictly block accounting alterations even for System Manager
    if old_doc.get("accounting_status") == "Posted":
        posted_locked = [
            "amount", "expense_account", "payment_account", "cost_center",
            "company", "posting_document_type", "posting_document_name"
        ]
        for pl in posted_locked:
            if doc.get(pl) != old_doc.get(pl):
                frappe.throw(f"Cannot modify field '{pl}' on a posted Operational Expense. Reverse the linked accounting document first.")
"""

    if frappe.db.exists("Server Script", ss_before_save_name):
        ss = frappe.get_doc("Server Script", ss_before_save_name)
        ss.script = ss_before_save_code
        ss.disabled = 0
        ss.save(ignore_permissions=True)
    else:
        ss = frappe.get_doc({
            "doctype": "Server Script",
            "name": ss_before_save_name,
            "script_type": "DocType Event",
            "reference_doctype": "Operational Expense",
            "doctype_event": "Before Save",
            "script": ss_before_save_code,
            "disabled": 0
        })
        ss.insert(ignore_permissions=True)
    print(f"Configured Server Script: {ss_before_save_name}")

    # 2. Server Script: Operational Expense - Deletion Safeguard (Before Delete)
    ss_del_name = "Operational Expense - Deletion Safeguard"
    ss_del_code = """# SERVER SCRIPT: Operational Expense - Deletion Safeguard (Before Delete)
user_roles = [r.role for r in frappe.db.get_all("Has Role", filters={"parent": frappe.session.user}, fields=["role"])]
if "System Manager" not in user_roles and frappe.session.user != "Administrator":
    frappe.throw("Operational expense records cannot be deleted. Deletion of Operational Expense records is prohibited.")

if doc.accounting_status == "Posted" or doc.posting_document_name:
    frappe.throw(f"Cannot delete Operational Expense linked to posted accounting document '{doc.posting_document_name}'. Reverse or cancel the accounting document first.")
"""

    if frappe.db.exists("Server Script", ss_del_name):
        ss = frappe.get_doc("Server Script", ss_del_name)
        ss.script = ss_del_code
        ss.disabled = 0
        ss.save(ignore_permissions=True)
    else:
        ss = frappe.get_doc({
            "doctype": "Server Script",
            "name": ss_del_name,
            "script_type": "DocType Event",
            "reference_doctype": "Operational Expense",
            "doctype_event": "Before Delete",
            "script": ss_del_code,
            "disabled": 0
        })
        ss.insert(ignore_permissions=True)
    print(f"Configured Server Script: {ss_del_name}")

    # 3. Server Script: Journal Entry - Operational Expense Linkage on Cancel (After Cancel)
    ss_cancel_name = "Journal Entry - Operational Expense Linkage on Cancel"
    ss_cancel_code = """# SERVER SCRIPT: Journal Entry - Operational Expense Linkage on Cancel (After Cancel)
if doc.custom_operational_expense:
    if frappe.db.exists("Operational Expense", doc.custom_operational_expense):
        frappe.db.set_value("Operational Expense", doc.custom_operational_expense, {
            "accounting_status": "Cancelled",
            "payment_status": "Unpaid",
            "paid_amount": 0.0,
            "posted_amount": 0.0
        })
"""

    if frappe.db.exists("Server Script", ss_cancel_name):
        ss = frappe.get_doc("Server Script", ss_cancel_name)
        ss.script = ss_cancel_code
        ss.disabled = 0
        ss.save(ignore_permissions=True)
    else:
        ss = frappe.get_doc({
            "doctype": "Server Script",
            "name": ss_cancel_name,
            "script_type": "DocType Event",
            "reference_doctype": "Journal Entry",
            "doctype_event": "After Cancel",
            "script": ss_cancel_code,
            "disabled": 0
        })
        ss.insert(ignore_permissions=True)
    print(f"Configured Server Script: {ss_cancel_name}")

    # 4. Server Script: API - post_operational_expense
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
    frappe.throw(f"Expense amount must be greater than zero to post.")

if not exp.expense_account:
    frappe.throw("Expense Account is required for accounting posting.")

if not exp.payment_account:
    frappe.throw("Payment Account is required for accounting posting.")

if not frappe.db.exists("Account", exp.expense_account):
    frappe.throw(f"Expense Account '{exp.expense_account}' does not exist.")

if not frappe.db.exists("Account", exp.payment_account):
    frappe.throw(f"Payment Account '{exp.payment_account}' does not exist.")

# Check party requirement if payable
pay_acc_type = frappe.db.get_value("Account", exp.payment_account, "account_type")
if pay_acc_type == "Payable" and not exp.supplier:
    frappe.throw(f"Payment Account '{exp.payment_account}' is Payable. A valid Supplier is mandatory.")

# 4. Construct standard ERPNext Journal Entry
je = frappe.new_doc("Journal Entry")
je.posting_date = exp.expense_date
je.company = exp.company or "Uptoware"
je.user_remark = f"Operational Expense {exp.name}: {exp.expense_category} | Vehicle: {exp.vehicle or 'N/A'} | Trip: {exp.mining_trip or 'N/A'}"
je.custom_operational_expense = exp.name

# Debit Row (Expense)
debit_row = {
    "account": exp.expense_account,
    "debit_in_account_currency": exp.amount,
    "credit_in_account_currency": 0.0,
    "cost_center": exp.cost_center or "Main - U"
}
je.append("accounts", debit_row)

# Credit Row (Payment / Payable)
credit_row = {
    "account": exp.payment_account,
    "credit_in_account_currency": exp.amount,
    "debit_in_account_currency": 0.0,
    "cost_center": exp.cost_center or "Main - U"
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
is_immediate_cash = (pay_acc_type in ["Cash", "Bank"])

exp.posting_document_type = "Journal Entry"
exp.posting_document_name = je.name
exp.accounting_status = "Posted"
exp.posted_amount = exp.amount
exp.posted_by = frappe.session.user
exp.posted_on = now_dt

if is_immediate_cash:
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

    if frappe.db.exists("Server Script", ss_api_name):
        ss = frappe.get_doc("Server Script", ss_api_name)
        ss.script = ss_api_code
        ss.disabled = 0
        ss.save(ignore_permissions=True)
    else:
        ss = frappe.get_doc({
            "doctype": "Server Script",
            "name": ss_api_name,
            "script_type": "API",
            "api_method": "post_operational_expense",
            "script": ss_api_code,
            "disabled": 0
        })
        ss.insert(ignore_permissions=True)
    print(f"Configured Server Script API: {ss_api_name} (api_method: post_operational_expense)")

    # 5. Client Script: Operational Expense Form Enhancements
    cs_name = "Operational Expense - UI Actions & Controls"
    cs_code = """frappe.ui.form.on('Operational Expense', {
    refresh: function(frm) {
        // Accounting Posting Button for Accountant / System Manager
        if (frm.doc.approval_status === 'Approved' && frm.doc.accounting_status === 'Unposted') {
            if (frappe.user.has_role('Accountant') || frappe.user.has_role('System Manager')) {
                frm.add_custom_button(__('Post to Accounting'), function() {
                    frappe.confirm(
                        __('Are you sure you want to post this operational expense of {0} {1} to General Ledger?', 
                            [frm.doc.currency || 'INR', frm.doc.amount]),
                        function() {
                            frappe.call({
                                method: 'post_operational_expense',
                                args: {
                                    expense_name: frm.doc.name
                                },
                                freeze: true,
                                freeze_message: __('Posting to Accounting...'),
                                callback: function(r) {
                                    if (r.message && r.message.status === 'success') {
                                        frappe.msgprint(__('Successfully posted to Journal Entry {0}', [r.message.posting_document_name]));
                                        frm.reload_doc();
                                    }
                                }
                            });
                        }
                    );
                }, __('Accounting')).addClass('btn-primary');
            }
        }

        // View Linked Journal Entry Button
        if (frm.doc.posting_document_name) {
            frm.add_custom_button(__('View {0}', [frm.doc.posting_document_type || 'Journal Entry']), function() {
                frappe.set_route('Form', frm.doc.posting_document_type || 'Journal Entry', frm.doc.posting_document_name);
            }, __('Accounting'));
        }
    },

    expense_category: function(frm) {
        // Category to Expense Account Auto-suggestion
        const catMap = {
            'Toll and Road Charges': 'Freight and Forwarding Charges - U',
            'Parking': 'Travel Expenses - U',
            'Loading and Unloading': 'Freight and Forwarding Charges - U',
            'Food and Accommodation': 'Travel Expenses - U',
            'Weighbridge Charges': 'Freight and Forwarding Charges - U',
            'Permit and Documentation': 'Miscellaneous Expenses - U',
            'Miscellaneous Operational Expenses': 'Miscellaneous Expenses - U'
        };
        if (frm.doc.expense_category && catMap[frm.doc.expense_category] && !frm.doc.expense_account) {
            frm.set_value('expense_account', catMap[frm.doc.expense_category]);
        }
    },

    payment_method: function(frm) {
        if (frm.doc.payment_method === 'Cash') {
            frm.set_value('payment_account', 'Cash - U');
        } else if (frm.doc.payment_method === 'Credit' && frm.doc.supplier) {
            frm.set_value('payment_account', 'Creditors - U');
        }
    }
});
"""

    if frappe.db.exists("Client Script", cs_name):
        cs = frappe.get_doc("Client Script", cs_name)
        cs.script = cs_code
        cs.enabled = 1
        cs.save(ignore_permissions=True)
    else:
        cs = frappe.get_doc({
            "doctype": "Client Script",
            "name": cs_name,
            "dt": "Operational Expense",
            "script_type": "DocType Event",
            "script": cs_code,
            "enabled": 1
        })
        cs.insert(ignore_permissions=True)
    print(f"Configured Client Script: {cs_name}")

    frappe.clear_cache()
    frappe.db.commit()
    print("=== BATCH 5 SCRIPTS APPLIED SUCCESSFULLY ===")

run()
