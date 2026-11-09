import frappe

def run_suite():
    import os
    import sys
    import traceback

    print("=====================================================================")
    print("      UPTOWARE FLEET ERP - MASTER PLATFORM REGRESSION SUITE          ")
    print("                      BATCHES 1 THROUGH 11                           ")
    print("=====================================================================\n")

    base_dir = "/home/frappe/frappe-bench"
    test_modules = [
        ("Batch 1: Vehicle & Driver Registry", "test_batch1_regression.py", "run_regression_tests"),
        ("Batch 2: Mining Trips & Dispatch", "test_batch2.py", "run_tests"),
        ("Batch 3: Fuel Management & Benchmarks", "test_batch3.py", "run"),
        ("Batch 4: Breakdown Lifecycle & Stock Issues", "test_batch4.py", "run"),
        ("Batch 4: Workshop & Fleet Role Security", "test_batch4_permissions.py", "run"),
        ("Batch 5: Operational Expenses & GL Reconcile", "test_batch5.py", "run"),
        ("Batch 6: Spare Parts Inventory & Bin Flow", "test_batch6.py", "run"),
        ("Batch 6: Warehouse Reorder & Stock Return Audit", "audit_batch6_full.py", "run"),
        ("Batch 6: Stock Movement Audit Visibility", "test_stock_movement_visibility.py", "run"),
        ("Batch 7: Purchasing & Vendor Lifecycle", "test_batch7.py", "run"),
        ("Batch 8: Insurance & Renewal Management", "test_batch8.py", "run"),
        ("Batch 8: Future Renewal & Coverage Gap Fixes", "test_batch8_final_corrections.py", "run"),
        ("Batch 8: Final Acceptance Audit (Round 2)", "audit_round2_batch8.py", "run_audit"),
        ("Batch 9: Revenue & Profitability Management", "test_batch9.py", "run"),
        ("Batch 9: Financial Integrity Audit", "audit_batch9_financial_integrity.py", "run_audit"),
        ("Batch 10: Dashboard & MIS Management", "test_batch10.py", "run"),
        ("Batch 10: Final KPI Semantic Audit", "audit_batch10_kpi_semantics.py", "run_semantic_audit"),
        ("Batch 11: Alerts & Notifications Management", "test_batch11.py", "run_tests"),
        ("Batch 12: Approval Workflows & Security", "test_batch12.py", "run_tests"),
    ]

    results = []

    for label, filename, func_name in test_modules:
        print(f"\n>>> EXECUTING: {label} ({filename}) <<<")
        sys.stdout.flush()
        frappe.set_user("Administrator")
        frappe.db.commit()

        filepath = os.path.join(base_dir, filename)
        try:
            scope = {"__name__": "__main__", "frappe": frappe}
            with open(filepath, "r", encoding="utf-8") as f:
                code = f.read()
            exec(code, scope)

            results.append((label, filename, "PASS", "Executed successfully"))
            print(f">>> RESULT: {label} -> PASS <<<\n")
        except Exception as e:
            err_msg = str(e)
            traceback.print_exc()
            results.append((label, filename, "FAIL", err_msg))
            print(f">>> RESULT: {label} -> FAIL: {err_msg} <<<\n")
            frappe.db.rollback()

    print("\n=====================================================================")
    print("              MASTER REGRESSION SUITE EXECUTION SUMMARY               ")
    print("=====================================================================")
    all_passed = True
    for label, filename, status, detail in results:
        badge = "[PASS]" if status == "PASS" else "[FAIL]"
        if status != "PASS":
            all_passed = False
        print(f"{badge} {label:<50} | {filename:<32} | {detail}")

    print("=====================================================================")
    if all_passed:
        print(f">>> ALL {len(test_modules)} TEST SUITES PASSED! ZERO REGRESSIONS DETECTED (100% PASS) <<<")
    else:
        print(">>> SOME TEST SUITES FAILED! PLEASE REVIEW LOGS. <<<")
    print("=====================================================================\n")

if __name__ == "__main__":
    run_suite()
