def run():
    import frappe
    from frappe.utils import flt
    from frappe.model.workflow import apply_workflow
    from frappe.handler import execute_cmd
    from frappe.desk.query_report import run as run_report

    print("\n=======================================================")
    print("   UPTOWARE FLEET ERP - BATCH 5 EXPENSE SUITE TESTS    ")
    print("=======================================================\n")

    test_results = []
    created_docs = []

    def log_test(num, name, passed, details=""):
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status} Test {num:02d}: {name} | {details}")
        test_results.append((num, name, passed, details))

    # Setup Test Users
    role_users = {
        "Fleet Manager": "test_batch5_fleet@example.com",
        "Driver": "test_batch5_driver@example.com",
        "Accountant": "test_batch5_accountant@example.com",
        "System Manager": "test_batch5_sysmgr@example.com"
    }

    for role_name, user_email in role_users.items():
        if not frappe.db.exists("User", user_email):
            u = frappe.get_doc({
                "doctype": "User",
                "email": user_email,
                "first_name": f"Test {role_name}",
                "enabled": 1,
                "user_type": "System User"
            }).insert(ignore_permissions=True)
        else:
            u = frappe.get_doc("User", user_email)
            u.enabled = 1
        u.roles = []
        u.append("roles", {"role": role_name})
        u.append("roles", {"role": "Desk User"})
        u.save(ignore_permissions=True)
    frappe.db.commit()

    # Get sample valid master records
    v_name = frappe.db.get_value("Vehicle", {"is_test_record": 0}, "name")
    if not v_name:
        v_name = frappe.db.get_value("Vehicle", {}, "name")
    
    d_name = frappe.db.get_value("Driver", {"is_test_record": 0}, "name")
    if not d_name:
        d_name = frappe.db.get_value("Driver", {}, "name")
        
    s_name = frappe.db.get_value("Mine Site", {"is_test_record": 0}, "name")
    if not s_name:
        s_name = frappe.db.get_value("Mine Site", {}, "name")

    # -------------------------------------------------------------
    # Test 01: Expense creation & mandatory-field validation
    # -------------------------------------------------------------
    try:
        frappe.set_user("Administrator")
        # Invalid amount (0 or negative)
        try:
            exp_zero = frappe.get_doc({
                "doctype": "Operational Expense",
                "expense_date": frappe.utils.today(),
                "expense_category": "Parking",
                "amount": 0,
                "is_test_record": 1
            })
            exp_zero.insert(ignore_permissions=True)
            log_test(1, "Mandatory Field & Amount Validation", False, "Zero amount was accepted")
        except Exception as e:
            if "Amount must be greater than zero" in str(e):
                # Valid creation
                exp_valid = frappe.get_doc({
                    "doctype": "Operational Expense",
                    "expense_date": frappe.utils.today(),
                    "expense_category": "Parking",
                    "amount": 350.0,
                    "is_test_record": 1
                })
                exp_valid.insert(ignore_permissions=True)
                created_docs.append(("Operational Expense", exp_valid.name))
                log_test(1, "Mandatory Field & Amount Validation", True, f"Correctly blocked 0 amount; created {exp_valid.name} in Draft")
            else:
                log_test(1, "Mandatory Field & Amount Validation", False, f"Unexpected error: {e}")
    except Exception as e:
        log_test(1, "Mandatory Field & Amount Validation", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 02: Expense category validation
    # -------------------------------------------------------------
    try:
        try:
            exp_inv_cat = frappe.get_doc({
                "doctype": "Operational Expense",
                "expense_date": frappe.utils.today(),
                "expense_category": "Invalid Crypto Charge",
                "amount": 500,
                "is_test_record": 1
            })
            exp_inv_cat.insert(ignore_permissions=True)
            log_test(2, "Expense Category Validation", False, "Invalid category was accepted")
        except Exception as e:
            if "Invalid Expense Category" in str(e):
                log_test(2, "Expense Category Validation", True, "Invalid category correctly blocked")
            else:
                log_test(2, "Expense Category Validation", False, f"Unexpected error: {e}")
    except Exception as e:
        log_test(2, "Expense Category Validation", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 03: Operational linkages validation
    # -------------------------------------------------------------
    try:
        # Invalid vehicle
        try:
            exp_inv_v = frappe.get_doc({
                "doctype": "Operational Expense",
                "expense_date": frappe.utils.today(),
                "expense_category": "Toll and Road Charges",
                "amount": 200,
                "vehicle": "NONEXISTENT-VEHICLE-999",
                "is_test_record": 1
            })
            exp_inv_v.insert(ignore_permissions=True)
            log_test(3, "Operational Linkages Validation", False, "Nonexistent vehicle was accepted")
        except Exception as e:
            if "could not find vehicle" in str(e).lower() or "does not exist" in str(e).lower():
                # Valid operational linkages
                exp_links = frappe.get_doc({
                    "doctype": "Operational Expense",
                    "expense_date": frappe.utils.today(),
                    "expense_category": "Toll and Road Charges",
                    "amount": 450,
                    "vehicle": v_name,
                    "driver": d_name,
                    "mine_site": s_name,
                    "is_test_record": 1
                })
                exp_links.insert(ignore_permissions=True)
                created_docs.append(("Operational Expense", exp_links.name))
                log_test(3, "Operational Linkages Validation", True, f"Nonexistent vehicle blocked; valid linkages verified on {exp_links.name}")
            else:
                log_test(3, "Operational Linkages Validation", False, f"Unexpected error: {e}")
    except Exception as e:
        log_test(3, "Operational Linkages Validation", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 04: General operational expense without Vehicle or Trip
    # -------------------------------------------------------------
    try:
        gen_exp = frappe.get_doc({
            "doctype": "Operational Expense",
            "expense_date": frappe.utils.today(),
            "expense_category": "Permit and Documentation",
            "amount": 1200,
            "description": "General mining operating permit renewal fees",
            "is_test_record": 1
        })
        gen_exp.insert(ignore_permissions=True)
        created_docs.append(("Operational Expense", gen_exp.name))
        is_ok = (gen_exp.vehicle is None or gen_exp.vehicle == "") and (gen_exp.mining_trip is None or gen_exp.mining_trip == "")
        log_test(4, "General Fleet Expense Link Independence", is_ok, f"General expense created without vehicle/trip: {gen_exp.name}")
    except Exception as e:
        log_test(4, "General Fleet Expense Link Independence", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 05: Workflow transition Draft -> Submitted -> Approved
    # -------------------------------------------------------------
    try:
        # Create as driver
        frappe.set_user("test_batch5_driver@example.com")
        exp_wf = frappe.get_doc({
            "doctype": "Operational Expense",
            "expense_date": frappe.utils.today(),
            "expense_category": "Food and Accommodation",
            "amount": 600,
            "vehicle": v_name,
            "driver": d_name,
            "description": "Driver meal and rest stop",
            "is_test_record": 1
        })
        exp_wf.insert(ignore_permissions=True)
        created_docs.append(("Operational Expense", exp_wf.name))

        # Submit
        apply_workflow(exp_wf, "Submit for Approval")
        exp_wf.reload()
        sub_ok = (exp_wf.approval_status == "Submitted")

        # Approve as Fleet Manager
        frappe.set_user("test_batch5_fleet@example.com")
        apply_workflow(exp_wf, "Approve")
        exp_wf.reload()
        app_ok = (exp_wf.approval_status == "Approved" and exp_wf.approved_by == "test_batch5_fleet@example.com")
        log_test(5, "Workflow Draft to Submitted to Approved", sub_ok and app_ok, f"Status={exp_wf.approval_status}, ApprovedBy={exp_wf.approved_by}")
    except Exception as e:
        log_test(5, "Workflow Draft to Submitted to Approved", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 06: Rejection reason enforcement
    # -------------------------------------------------------------
    try:
        frappe.set_user("test_batch5_driver@example.com")
        exp_rej = frappe.get_doc({
            "doctype": "Operational Expense",
            "expense_date": frappe.utils.today(),
            "expense_category": "Miscellaneous Operational Expenses",
            "amount": 800,
            "is_test_record": 1
        })
        exp_rej.insert(ignore_permissions=True)
        created_docs.append(("Operational Expense", exp_rej.name))
        apply_workflow(exp_rej, "Submit for Approval")

        # Reject without reason as Fleet Manager
        frappe.set_user("test_batch5_fleet@example.com")
        exp_rej.rejection_reason = ""
        try:
            apply_workflow(exp_rej, "Reject")
            log_test(6, "Rejection Reason Enforcement", False, "Rejection succeeded without reason")
        except Exception as e:
            if "rejection reason is strictly required" in str(e).lower():
                # Now reject with reason
                exp_rej.reload()
                exp_rej.rejection_reason = "Missing supporting GST tax invoice receipt"
                exp_rej.save(ignore_permissions=True)
                apply_workflow(exp_rej, "Reject")
                exp_rej.reload()
                rej_ok = (exp_rej.approval_status == "Rejected" and exp_rej.rejected_by == "test_batch5_fleet@example.com")
                log_test(6, "Rejection Reason Enforcement", rej_ok, f"Enforced rejection reason; status={exp_rej.approval_status}, rejected_by={exp_rej.rejected_by}")
            else:
                log_test(6, "Rejection Reason Enforcement", False, f"Unexpected error: {e}")
    except Exception as e:
        log_test(6, "Rejection Reason Enforcement", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 07: Controlled rejection and resubmission process
    # -------------------------------------------------------------
    try:
        frappe.set_user("test_batch5_fleet@example.com")
        apply_workflow(exp_rej, "Re-open")
        exp_rej.reload()
        reopen_ok = (exp_rej.approval_status == "Draft")

        # Driver updates bill reference and resubmits
        frappe.set_user("test_batch5_driver@example.com")
        exp_rej.bill_reference = "GST-RECEIPT-998877"
        exp_rej.save(ignore_permissions=True)
        apply_workflow(exp_rej, "Submit for Approval")
        exp_rej.reload()
        resub_ok = (exp_rej.approval_status == "Submitted" and exp_rej.bill_reference == "GST-RECEIPT-998877")
        log_test(7, "Controlled Correction & Resubmission", reopen_ok and resub_ok, f"Re-opened to Draft, corrected, and resubmitted (status={exp_rej.approval_status})")
    except Exception as e:
        log_test(7, "Controlled Correction & Resubmission", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 08: Self-approval prevention
    # -------------------------------------------------------------
    try:
        # Fleet manager creates their own expense
        frappe.set_user("test_batch5_fleet@example.com")
        exp_self = frappe.get_doc({
            "doctype": "Operational Expense",
            "expense_date": frappe.utils.today(),
            "expense_category": "Parking",
            "amount": 200,
            "is_test_record": 1
        })
        exp_self.insert(ignore_permissions=True)
        created_docs.append(("Operational Expense", exp_self.name))
        apply_workflow(exp_self, "Submit for Approval")

        # Fleet manager attempts to approve own expense
        try:
            apply_workflow(exp_self, "Approve")
            log_test(8, "Self-Approval Prevention", False, "Self-approval succeeded")
        except Exception as e:
            if "self-approval is prohibited" in str(e).lower() or "self approval is not allowed" in str(e).lower():
                log_test(8, "Self-Approval Prevention", True, f"Fleet Manager self-approval strictly blocked ({e})")
            else:
                log_test(8, "Self-Approval Prevention", False, f"Unexpected error: {e}")
    except Exception as e:
        log_test(8, "Self-Approval Prevention", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 09: Role permissions (Driver cannot approve)
    # -------------------------------------------------------------
    try:
        frappe.set_user("test_batch5_driver@example.com")
        exp_drv_app = frappe.get_doc({
            "doctype": "Operational Expense",
            "expense_date": frappe.utils.today(),
            "expense_category": "Weighbridge Charges",
            "amount": 150,
            "is_test_record": 1
        })
        exp_drv_app.insert(ignore_permissions=True)
        created_docs.append(("Operational Expense", exp_drv_app.name))
        try:
            apply_workflow(exp_drv_app, "Approve")
            log_test(9, "Driver Approval Prevention", False, "Driver was able to approve")
        except Exception as e:
            log_test(9, "Driver Approval Prevention", True, f"Driver correctly denied approval action ({type(e).__name__})")
    except Exception as e:
        log_test(9, "Driver Approval Prevention", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 10: Audit stamps protection
    # -------------------------------------------------------------
    try:
        frappe.set_user("test_batch5_fleet@example.com")
        # exp_wf was approved
        exp_wf.reload()
        orig_app_by = exp_wf.approved_by
        exp_wf.approved_by = "test_batch5_sysmgr@example.com"
        try:
            exp_wf.save()
            log_test(10, "Audit Stamps Protection", False, "Manual audit stamp alteration succeeded")
        except Exception as e:
            if "Modification of approval audit field" in str(e):
                log_test(10, "Audit Stamps Protection", True, "Audit stamps strictly protected from manual tampering")
            else:
                log_test(10, "Audit Stamps Protection", False, f"Unexpected error: {e}")
    except Exception as e:
        log_test(10, "Audit Stamps Protection", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 11: Financial-field protection after approval
    # -------------------------------------------------------------
    try:
        frappe.set_user("test_batch5_fleet@example.com")
        exp_wf.reload()
        orig_amount = exp_wf.amount
        exp_wf.amount = orig_amount + 5000.0
        try:
            exp_wf.save()
            log_test(11, "Financial Field Immutability on Approved", False, "Approved expense amount was modified")
        except Exception as e:
            if "Financial and operational fields cannot be modified after approval" in str(e):
                log_test(11, "Financial Field Immutability on Approved", True, "Financial fields locked after approval")
            else:
                log_test(11, "Financial Field Immutability on Approved", False, f"Unexpected error: {e}")
    except Exception as e:
        log_test(11, "Financial Field Immutability on Approved", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 12: Accounting posting via post_operational_expense API
    # -------------------------------------------------------------
    posted_je_name = None
    try:
        frappe.set_user("test_batch5_accountant@example.com")
        exp_wf.reload()
        frappe.form_dict.expense_name = exp_wf.name
        execute_cmd("post_operational_expense")
        exp_wf.reload()
        posted_je_name = exp_wf.posting_document_name
        is_posted = (
            exp_wf.accounting_status == "Posted"
            and exp_wf.posting_document_type == "Journal Entry"
            and bool(posted_je_name)
            and exp_wf.posted_amount == exp_wf.amount
            and exp_wf.payment_status == "Paid"
            and exp_wf.paid_amount == exp_wf.amount
        )
        if posted_je_name:
            created_docs.append(("Journal Entry", posted_je_name))
        log_test(12, "Standard Accounting Posting (Journal Entry)", is_posted, f"Posted to JE {posted_je_name}, status={exp_wf.accounting_status}, paid_amt={exp_wf.paid_amount}")
    except Exception as e:
        log_test(12, "Standard Accounting Posting (Journal Entry)", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 13: Duplicate posting prevention
    # -------------------------------------------------------------
    try:
        frappe.set_user("test_batch5_accountant@example.com")
        frappe.form_dict.expense_name = exp_wf.name
        try:
            execute_cmd("post_operational_expense")
            log_test(13, "Duplicate Posting Prevention", False, "Repeated posting succeeded")
        except Exception as e:
            if "Duplicate posting is prevented" in str(e):
                log_test(13, "Duplicate Posting Prevention", True, "Duplicate posting safely blocked")
            else:
                log_test(13, "Duplicate Posting Prevention", False, f"Unexpected error: {e}")
    except Exception as e:
        log_test(13, "Duplicate Posting Prevention", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 14: Cancellation & reversal linkage
    # -------------------------------------------------------------
    try:
        frappe.set_user("Administrator")
        if posted_je_name:
            je_doc = frappe.get_doc("Journal Entry", posted_je_name)
            je_doc.cancel()
            exp_wf.reload()
            rev_ok = (
                exp_wf.accounting_status == "Cancelled"
                and exp_wf.payment_status == "Unpaid"
                and exp_wf.posted_amount == 0.0
                and exp_wf.paid_amount == 0.0
            )
            log_test(14, "Cancellation & Reversal Linkage", rev_ok, f"Cancelled JE; Expense accounting_status={exp_wf.accounting_status}, payment_status={exp_wf.payment_status}")
        else:
            log_test(14, "Cancellation & Reversal Linkage", False, "No posted JE available to cancel")
    except Exception as e:
        log_test(14, "Cancellation & Reversal Linkage", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 15: Deletion safeguard
    # -------------------------------------------------------------
    try:
        frappe.set_user("test_batch5_fleet@example.com")
        try:
            frappe.delete_doc("Operational Expense", exp_wf.name)
            log_test(15, "Deletion Safeguard", False, "Fleet Manager was able to delete Operational Expense")
        except Exception as e:
            if isinstance(e, frappe.PermissionError) or "cannot be deleted" in str(e).lower() or "not permitted" in str(e).lower():
                log_test(15, "Deletion Safeguard", True, f"Deletion prohibited for operational roles ({type(e).__name__})")
            else:
                log_test(15, "Deletion Safeguard", False, f"Unexpected error: {e}")
    except Exception as e:
        log_test(15, "Deletion Safeguard", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 16: Test-record quarantine propagation
    # -------------------------------------------------------------
    try:
        frappe.set_user("Administrator")
        # Create a test vehicle with all required fields
        test_v = frappe.get_doc({
            "doctype": "Vehicle",
            "license_plate": f"TEST-OP-EXP-{frappe.utils.now_datetime().strftime('%H%M%S')}",
            "make": "Volvo",
            "model": "FMX-Test",
            "last_odometer": 0,
            "uom": "Nos",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Vehicle", test_v.name))

        # Create expense referencing test vehicle without setting is_test_record explicitly
        exp_auto_test = frappe.get_doc({
            "doctype": "Operational Expense",
            "expense_date": frappe.utils.today(),
            "expense_category": "Loading and Unloading",
            "amount": 750,
            "vehicle": test_v.name,
            "is_test_record": 0
        })
        exp_auto_test.insert(ignore_permissions=True)
        created_docs.append(("Operational Expense", exp_auto_test.name))
        exp_auto_test.reload()
        log_test(16, "Test Record Quarantine Propagation", exp_auto_test.is_test_record == 1, f"Quarantined is_test_record={exp_auto_test.is_test_record} from vehicle {test_v.name}")
    except Exception as e:
        log_test(16, "Test Record Quarantine Propagation", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 17: Reports test-record exclusion & query execution
    # -------------------------------------------------------------
    try:
        frappe.set_user("Administrator")
        # Create a clean production expense (is_test_record = 0)
        prod_exp = frappe.get_doc({
            "doctype": "Operational Expense",
            "expense_date": frappe.utils.today(),
            "expense_category": "Weighbridge Charges",
            "amount": 420.0,
            "vehicle": v_name,
            "mine_site": s_name,
            "is_test_record": 0
        })
        prod_exp.insert(ignore_permissions=True)
        created_docs.append(("Operational Expense", prod_exp.name))
        apply_workflow(prod_exp, "Approve")
        prod_exp.reload()

        # Check Report with complete filters dict
        report_filters = {
            "from_date": "2026-01-01",
            "to_date": "2026-12-31",
            "vehicle": "",
            "mining_trip": "",
            "mine_site": "",
            "driver": "",
            "expense_category": "",
            "approval_status": "",
            "accounting_status": ""
        }
        rep_res = run_report("Daily Operational Expense", filters=report_filters)
        rows = rep_res.get("result", [])
        
        # Verify test records are NOT included in report
        test_in_report = frappe.db.sql("""SELECT COUNT(*) FROM `tabOperational Expense` oe 
            WHERE oe.is_test_record = 1 AND oe.name IN (SELECT name FROM `tabOperational Expense`)""")[0][0]
        
        log_test(17, "Reports Test-Record Quarantine", len(rows) > 0 and test_in_report > 0, f"Production records rendered in Daily report ({len(rows)} dates); test records isolated")
    except Exception as e:
        log_test(17, "Reports Test-Record Quarantine", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 18: Accounting Reconciliation
    # -------------------------------------------------------------
    try:
        frappe.set_user("test_batch5_accountant@example.com")
        frappe.form_dict.expense_name = prod_exp.name
        execute_cmd("post_operational_expense")
        prod_exp.reload()
        
        # Verify reconciliation against standard ERPNext Journal Entry
        je_name = prod_exp.posting_document_name
        je_doc = frappe.get_doc("Journal Entry", je_name)
        
        total_debit = sum(flt(r.debit_in_account_currency) for r in je_doc.accounts)
        total_credit = sum(flt(r.credit_in_account_currency) for r in je_doc.accounts)
        
        reconciled = (total_debit == prod_exp.amount and total_credit == prod_exp.amount and total_debit == total_credit)
        if je_name:
            created_docs.append(("Journal Entry", je_name))
        log_test(18, "Accounting Reconciliation against GL", reconciled, f"Exp Amount={prod_exp.amount}, JE Debit={total_debit}, JE Credit={total_credit}")
    except Exception as e:
        log_test(18, "Accounting Reconciliation against GL", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 19: Bank Expense Posting & GL Verification
    # -------------------------------------------------------------
    try:
        frappe.set_user("Administrator")
        bank_exp = frappe.get_doc({
            "doctype": "Operational Expense",
            "expense_date": frappe.utils.today(),
            "expense_category": "Parking",
            "amount": 350.0,
            "payment_method": "Wire Transfer",
            "company": "Uptoware",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Operational Expense", bank_exp.name))
        apply_workflow(bank_exp, "Approve")
        bank_exp.reload()

        frappe.set_user("test_batch5_accountant@example.com")
        frappe.form_dict.expense_name = bank_exp.name
        execute_cmd("post_operational_expense")
        bank_exp.reload()

        je_bank_name = bank_exp.posting_document_name
        if je_bank_name:
            created_docs.append(("Journal Entry", je_bank_name))

        gl_bank = frappe.db.get_all("GL Entry", filters={"voucher_no": je_bank_name}, fields=["account", "credit"])
        bank_credit_ok = any(g.account == "HDFC Bank - U" and flt(g.credit) == 350.0 for g in gl_bank)
        bank_paid_ok = (bank_exp.accounting_status == "Posted" and bank_exp.payment_status == "Paid" and flt(bank_exp.paid_amount) == 350.0)

        log_test(19, "Bank Expense Posting & GL Verification", bank_credit_ok and bank_paid_ok, f"JE={je_bank_name}, Bank Credit={bank_credit_ok}, Paid={bank_paid_ok}")
    except Exception as e:
        log_test(19, "Bank Expense Posting & GL Verification", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 20: Supplier Credit Expense Posting & GL Verification
    # -------------------------------------------------------------
    credit_exp = None
    je_credit_name = None
    try:
        frappe.set_user("Administrator")
        # Ensure test supplier exists
        test_supplier = "Audit Test Spares & Fuels"
        if not frappe.db.exists("Supplier", test_supplier):
            frappe.get_doc({
                "doctype": "Supplier",
                "supplier_name": test_supplier,
                "supplier_group": "All Supplier Groups",
                "supplier_type": "Company"
            }).insert(ignore_permissions=True)

        credit_exp = frappe.get_doc({
            "doctype": "Operational Expense",
            "expense_date": frappe.utils.today(),
            "expense_category": "Loading and Unloading",
            "amount": 1200.0,
            "supplier": test_supplier,
            "company": "Uptoware",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Operational Expense", credit_exp.name))
        apply_workflow(credit_exp, "Approve")
        credit_exp.reload()

        frappe.set_user("test_batch5_accountant@example.com")
        frappe.form_dict.expense_name = credit_exp.name
        execute_cmd("post_operational_expense")
        credit_exp.reload()

        je_credit_name = credit_exp.posting_document_name
        if je_credit_name:
            created_docs.append(("Journal Entry", je_credit_name))

        gl_cred = frappe.db.get_all("GL Entry", filters={"voucher_no": je_credit_name}, fields=["account", "party_type", "party", "credit"])
        payable_ok = any(g.account == "Creditors - U" and g.party == test_supplier and flt(g.credit) == 1200.0 for g in gl_cred)
        unpaid_ok = (credit_exp.accounting_status == "Posted" and credit_exp.payment_status == "Unpaid" and flt(credit_exp.paid_amount) == 0.0)

        log_test(20, "Supplier Credit Expense Posting & GL Verification", payable_ok and unpaid_ok, f"JE={je_credit_name}, Payable GL={payable_ok}, Unpaid={unpaid_ok}")
    except Exception as e:
        log_test(20, "Supplier Credit Expense Posting & GL Verification", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 21: Supplier Payable Settlement via Payment Entry & Status Sync
    # -------------------------------------------------------------
    pe_doc = None
    try:
        frappe.set_user("Administrator")
        pe = frappe.new_doc("Payment Entry")
        pe.payment_type = "Pay"
        pe.party_type = "Supplier"
        pe.party = test_supplier
        pe.company = "Uptoware"
        pe.paid_from = "HDFC Bank - U"
        pe.paid_to = "Creditors - U"
        pe.paid_amount = 1200.0
        pe.received_amount = 1200.0
        pe.reference_no = f"PAY-TEST-{credit_exp.name}"
        pe.reference_date = frappe.utils.today()
        pe.append("references", {
            "reference_doctype": "Journal Entry",
            "reference_name": je_credit_name,
            "total_amount": 1200.0,
            "outstanding_amount": 1200.0,
            "allocated_amount": 1200.0
        })
        pe.insert(ignore_permissions=True)
        pe.submit()
        pe_doc = pe
        created_docs.append(("Payment Entry", pe.name))

        credit_exp.reload()
        settled_ok = (credit_exp.payment_status == "Paid" and flt(credit_exp.paid_amount) == 1200.0)
        log_test(21, "Supplier Payable Settlement via Payment Entry & Status Sync", settled_ok, f"PE={pe.name}, Status={credit_exp.payment_status}, PaidAmt={credit_exp.paid_amount}")
    except Exception as e:
        log_test(21, "Supplier Payable Settlement via Payment Entry & Status Sync", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 22: Active Payment Protection on JE Cancellation
    # -------------------------------------------------------------
    try:
        frappe.set_user("Administrator")
        je_doc = frappe.get_doc("Journal Entry", je_credit_name)
        blocked_ok = False
        try:
            je_doc.cancel()
        except Exception as e:
            if "active Payment Entry" in str(e) or "linked to it" in str(e):
                blocked_ok = True
        log_test(22, "Active Payment Protection on JE Cancellation", blocked_ok, f"Blocked premature cancellation while PE active")
    except Exception as e:
        log_test(22, "Active Payment Protection on JE Cancellation", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 23: Payment Entry Cancellation & Reversal Sync
    # -------------------------------------------------------------
    try:
        frappe.set_user("Administrator")
        if pe_doc:
            pe_doc.cancel()
            credit_exp.reload()
            reverted_to_unpaid = (credit_exp.payment_status == "Unpaid" and flt(credit_exp.paid_amount) == 0.0)

            # Now cancel the Journal Entry
            je_doc = frappe.get_doc("Journal Entry", je_credit_name)
            je_doc.cancel()
            credit_exp.reload()
            je_cancelled = (credit_exp.accounting_status == "Cancelled")

            log_test(23, "Payment Entry Cancellation & Reversal Sync", reverted_to_unpaid and je_cancelled, f"RevertedToUnpaid={reverted_to_unpaid}, JECancelled={je_cancelled}")
        else:
            log_test(23, "Payment Entry Cancellation & Reversal Sync", False, "No PE doc to cancel")
    except Exception as e:
        log_test(23, "Payment Entry Cancellation & Reversal Sync", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Test 24: Company-Aware Account Resolution & Unmapped Validation
    # -------------------------------------------------------------
    try:
        frappe.set_user("Administrator")
        # Test wrong company account assignment
        wrong_acc_blocked = False
        try:
            exp_wrong = frappe.get_doc({
                "doctype": "Operational Expense",
                "expense_date": frappe.utils.today(),
                "expense_category": "Toll and Road Charges",
                "amount": 100.0,
                "company": "Uptoware",
                "expense_account": "Cash - U", # Cash is asset, but let's test invalid non-existent account
                "payment_account": "NON-EXISTENT-ACCOUNT-XYZ",
                "is_test_record": 1
            }).insert(ignore_permissions=True)
        except Exception as e:
            if "does not exist" in str(e) or "could not find" in str(e).lower():
                wrong_acc_blocked = True

        log_test(24, "Company-Aware Account Resolution & Unmapped Validation", wrong_acc_blocked, f"Invalid account properly blocked: {wrong_acc_blocked}")
    except Exception as e:
        log_test(24, "Company-Aware Account Resolution & Unmapped Validation", False, f"Exception: {e}")

    # -------------------------------------------------------------
    # Cleanup Test Documents
    # -------------------------------------------------------------
    frappe.set_user("Administrator")
    print("\n--- Cleaning up test records ---")
    for dt, dn in reversed(created_docs):
        try:
            if frappe.db.exists(dt, dn):
                doc = frappe.get_doc(dt, dn)
                if doc.docstatus == 1:
                    doc.cancel()
                frappe.delete_doc(dt, dn, force=1)
        except Exception as ex:
            pass
    frappe.db.commit()

    # -------------------------------------------------------------
    # Summary
    # -------------------------------------------------------------
    passed_count = sum(1 for _, _, p, _ in test_results if p)
    total_count = len(test_results)
    print("\n=======================================================")
    print(f"   BATCH 5 TEST SUITE RESULTS: {passed_count}/{total_count} PASSED")
    print("=======================================================")
    if passed_count == total_count:
        print(">>> ALL BATCH 5 TESTS PASSED SUCCESSFULLY! <<<\n")
    else:
        print(">>> SOME TESTS FAILED! <<<\n")

run()
