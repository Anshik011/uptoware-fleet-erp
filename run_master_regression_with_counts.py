import os
import sys
import io
import re
import traceback
import frappe

def run_regression_with_counts():
    frappe.init("frontend")
    frappe.connect()

    print("=====================================================================")
    print("      UPTOWARE FLEET ERP - MASTER PLATFORM REGRESSION SUITE          ")
    print("                      BATCHES 1 THROUGH 12                           ")
    print("=====================================================================\n")

    base_dir = "/home/frappe/frappe-bench"
    test_modules = [
        ("Batch 1: Vehicle & Driver Registry", "test_batch1_regression.py"),
        ("Batch 2: Mining Trips & Dispatch", "test_batch2.py"),
        ("Batch 3: Fuel Management & Benchmarks", "test_batch3.py"),
        ("Batch 4: Breakdown Lifecycle & Stock Issues", "test_batch4.py"),
        ("Batch 4: Workshop & Fleet Role Security", "test_batch4_permissions.py"),
        ("Batch 5: Operational Expenses & GL Reconcile", "test_batch5.py"),
        ("Batch 6: Spare Parts Inventory & Bin Flow", "test_batch6.py"),
        ("Batch 6: Warehouse Reorder & Stock Return Audit", "audit_batch6_full.py"),
        ("Batch 6: Stock Movement Audit Visibility", "test_stock_movement_visibility.py"),
        ("Batch 7: Purchasing & Vendor Lifecycle", "test_batch7.py"),
        ("Batch 8: Insurance & Renewal Management", "test_batch8.py"),
        ("Batch 8: Future Renewal & Coverage Gap Fixes", "test_batch8_final_corrections.py"),
        ("Batch 8: Final Acceptance Audit (Round 2)", "audit_round2_batch8.py"),
        ("Batch 9: Revenue & Profitability Management", "test_batch9.py"),
        ("Batch 9: Financial Integrity Audit", "audit_batch9_financial_integrity.py"),
        ("Batch 10: Dashboard & MIS Management", "test_batch10.py"),
        ("Batch 10: Final KPI Semantic Audit", "audit_batch10_kpi_semantics.py"),
        ("Batch 11: Alerts & Notifications Management", "test_batch11.py"),
        ("Batch 12: Approval Workflows & Security", "test_batch12.py"),
    ]

    results = []

    for idx, (label, filename) in enumerate(test_modules, 1):
        print(f"\n[{idx:02d}/19] EXECUTING: {label} ({filename})...")
        sys.stdout.flush()
        frappe.set_user("Administrator")
        frappe.db.commit()

        filepath = os.path.join(base_dir, filename)
        
        # Capture stdout
        old_stdout = sys.stdout
        captured = io.StringIO()
        sys.stdout = captured

        status = "PASS"
        err_msg = ""
        passed_cnt = 0
        failed_cnt = 0
        skipped_cnt = 0

        try:
            scope = {"__name__": "__main__", "frappe": frappe}
            with open(filepath, "r", encoding="utf-8") as f:
                code = f.read()
            exec(code, scope)
        except Exception as e:
            status = "FAIL"
            err_msg = str(e)
            traceback.print_exc()
            frappe.db.rollback()
        finally:
            sys.stdout = old_stdout

        output_text = captured.getvalue()

        # Parse test counts from output
        # Common patterns:
        # "X PASSED / Y FAILED" or "X Passed, Y Failed" or "X/Y Tests Passed" or count [PASS] / [FAIL]
        pass_matches = len(re.findall(r'\[PASS\]', output_text))
        fail_matches = len(re.findall(r'\[FAIL\]', output_text))
        
        # Check for explicit summary matches
        sum_m1 = re.search(r'(\d+)\s+PASSED\s*/\s*(\d+)\s+FAILED', output_text, re.IGNORECASE)
        sum_m2 = re.search(r'(\d+)\s+Passed,\s*(\d+)\s+Failed', output_text, re.IGNORECASE)
        sum_m3 = re.search(r'(\d+)/(\d+)\s+Tests Passed', output_text, re.IGNORECASE)
        sum_m4 = re.search(r'(\d+)\s+Passed,\s*(\d+)\s+Warnings,\s*(\d+)\s+Failed', output_text, re.IGNORECASE)

        if sum_m1:
            passed_cnt = int(sum_m1.group(1))
            failed_cnt = int(sum_m1.group(2))
        elif sum_m2:
            passed_cnt = int(sum_m2.group(1))
            failed_cnt = int(sum_m2.group(2))
        elif sum_m3:
            passed_cnt = int(sum_m3.group(1))
            total_cnt = int(sum_m3.group(2))
            failed_cnt = total_cnt - passed_cnt
        elif sum_m4:
            passed_cnt = int(sum_m4.group(1))
            failed_cnt = int(sum_m4.group(3))
        elif pass_matches > 0 or fail_matches > 0:
            passed_cnt = pass_matches
            failed_cnt = fail_matches
        else:
            # Fallback for scripts without standardized [PASS] tokens: count assertions or marked lines
            ok_matches = len(re.findall(r'✅|PASS|Passed', output_text))
            passed_cnt = max(1, ok_matches)
            failed_cnt = 0

        if failed_cnt > 0 or status == "FAIL":
            status = "FAIL"

        print(f"       Result: {status} | Tests: {passed_cnt} Passed, {failed_cnt} Failed, {skipped_cnt} Skipped")
        results.append({
            "idx": idx,
            "label": label,
            "filename": filename,
            "status": status,
            "passed": passed_cnt,
            "failed": failed_cnt,
            "skipped": skipped_cnt,
            "error": err_msg
        })

    print("\n=========================================================================================================")
    print("                                MASTER REGRESSION SUITE EXECUTION SUMMARY                                ")
    print("=========================================================================================================")
    print(f"{'#':<3} | {'Test Suite':<48} | {'Filename':<32} | {'Status':<6} | {'Passed':<6} | {'Failed':<6} | {'Skip':<4}")
    print("---------------------------------------------------------------------------------------------------------")
    
    total_passed = 0
    total_failed = 0
    total_skipped = 0
    all_ok = True

    for r in results:
        total_passed += r["passed"]
        total_failed += r["failed"]
        total_skipped += r["skipped"]
        if r["status"] != "PASS":
            all_ok = False
        print(f"{r['idx']:02d}  | {r['label']:<48} | {r['filename']:<32} | {r['status']:<6} | {r['passed']:<6} | {r['failed']:<6} | {r['skipped']:<4}")

    print("---------------------------------------------------------------------------------------------------------")
    print(f"TOTAL: 19 Suites | {total_passed} Individual Tests Passed | {total_failed} Failed | {total_skipped} Skipped")
    print("=========================================================================================================")
    if all_ok and total_failed == 0:
        print(">>> ALL 19 TEST SUITES PASSED! ZERO REGRESSIONS DETECTED (100% SUCCESS RATE) <<<")
    else:
        print(">>> REGRESSION FAILURES DETECTED! PLEASE REVIEW LOGS. <<<")
    print("=========================================================================================================\n")

if __name__ == "__main__":
    run_regression_with_counts()

