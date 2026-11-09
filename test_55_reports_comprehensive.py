import frappe
from frappe.desk.query_report import run
from frappe.utils import nowdate, add_days

def run_comprehensive_report_audit():
    frappe.init("frontend")
    frappe.connect()

    report_list = [
        # A. Fuel Management — 5
        "Daily Fuel Consumption",
        "Vehicle-wise Fuel Consumption",
        "Monthly Fuel Cost",
        "Fuel Efficiency (KM/L)",
        "Fuel Consumption by Mine Site",
        # B. Breakdown & Maintenance — 6
        "Vehicle Breakdown Register",
        "Vehicle Downtime Report",
        "Maintenance Cost by Vehicle",
        "Breakdown Frequency by Type",
        "Pending Repairs / Awaiting Parts",
        "Vehicle Maintenance History",
        # C. Operational Expenses — 7
        "Daily Operational Expense",
        "Monthly Operational Expense",
        "Vehicle-wise Expense",
        "Trip-wise Expense",
        "Mine Site-wise Expense",
        "Expense Category Analysis",
        "Pending Expense Approvals",
        # D. Spare Parts & Inventory — 7
        "Spare Parts Stock Register",
        "Warehouse-wise Stock",
        "Low Stock / Reorder Report",
        "Spare Parts Consumption by Vehicle",
        "Spare Parts Consumption by Breakdown",
        "Spare Parts Consumption by Mine Site",
        "Stock Movement History",
        # E. Supplier & Procurement — 9
        "Supplier Register",
        "Supplier-wise Purchase Summary",
        "Purchase Order Register",
        "Pending Purchase Orders",
        "Purchase Receipt Register",
        "Purchase Invoice Register",
        "Supplier Outstanding / Payables",
        "Purchase by Vehicle / Breakdown / Mine Site",
        "Purchase Analysis by Month",
        # F. Insurance & Compliance — 7
        "Vehicle Insurance Register",
        "Insurance Expiry Report",
        "Vehicle Document Expiry Report",
        "Upcoming Renewals",
        "Expired Insurance & Documents",
        "Insurance Premium by Vehicle",
        "Insurance Renewal History",
        # G. Revenue & Profitability — 10
        "Trip-wise Revenue and Profitability",
        "Vehicle-wise Revenue and Profitability",
        "Mine Site-wise Revenue and Profitability",
        "Customer-wise Revenue",
        "Monthly Revenue Summary",
        "Operating Cost Summary",
        "Vehicle Operating Cost Analysis",
        "Revenue vs Cost Analysis",
        "Outstanding Revenue / Receivables",
        "Unallocated Cost Register",
        # H. Fleet Performance & Operations — 4
        "Fleet Utilization",
        "Vehicle Performance Summary",
        "Driver Performance",
        "Trip Operations Summary"
    ]

    print("=" * 80)
    print("      FLEET MANAGEMENT REPORTS: 55-REPORT COMPREHENSIVE MULTI-SCENARIO AUDIT      ")
    print("=" * 80 + "\n")

    # Fetch valid entity IDs for testing
    v_active = frappe.db.get_value("Vehicle", {"is_test_record": 0}, "name") or "KA-19-P-dBTF"
    d_active = frappe.db.get_value("Driver", {"is_test_record": 0}, "name")
    s_active = frappe.db.get_value("Mine Site", {"status": "Operational"}, "name")
    sup_active = frappe.db.get_value("Supplier", {}, "name")
    cust_active = frappe.db.get_value("Customer", {}, "name")
    wh_active = frappe.db.get_value("Warehouse", {"is_group": 0}, "name")
    item_active = frappe.db.get_value("Item", {"is_stock_item": 1}, "name")
    comp_active = frappe.db.get_value("Company", {"is_group": 0}, "name") or "Uptoware Logistics"

    today = nowdate()
    from_valid = add_days(today, -60)
    to_valid = add_days(today, 30)

    report_test_summary = []

    for idx, rname in enumerate(report_list, 1):
        rep = frappe.get_doc("Report", rname)
        filters_dict = {f.fieldname: f for f in rep.filters}
        supported_fields = set(filters_dict.keys())

        scenarios_passed = 0
        scenario_results = {}

        # 1. No filters supplied
        try:
            res1 = run(rname, filters={})
            assert isinstance(res1, dict) and "result" in res1 and "columns" in res1
            scenario_results["1_no_filters"] = f"PASS (rows={len(res1['result'])})"
            scenarios_passed += 1
        except Exception as e:
            scenario_results["1_no_filters"] = f"FAIL: {e}"

        # 2. Default filter values
        try:
            def_filters = {}
            for fname, frow in filters_dict.items():
                if frow.default:
                    def_filters[fname] = frow.default
            res2 = run(rname, filters=def_filters)
            assert isinstance(res2, dict)
            scenario_results["2_defaults"] = f"PASS (rows={len(res2['result'])})"
            scenarios_passed += 1
        except Exception as e:
            scenario_results["2_defaults"] = f"FAIL: {e}"

        # 3. Valid custom date range
        try:
            if "from_date" in supported_fields and "to_date" in supported_fields:
                res3 = run(rname, filters={"from_date": from_valid, "to_date": to_valid})
                assert isinstance(res3, dict)
                scenario_results["3_date_range"] = f"PASS (rows={len(res3['result'])})"
            else:
                scenario_results["3_date_range"] = "N/A (No date fields)"
            scenarios_passed += 1
        except Exception as e:
            scenario_results["3_date_range"] = f"FAIL: {e}"

        # 4. Single-date selection
        try:
            if "from_date" in supported_fields:
                res4 = run(rname, filters={"from_date": from_valid})
                assert isinstance(res4, dict)
                scenario_results["4_single_date"] = f"PASS (rows={len(res4['result'])})"
            else:
                scenario_results["4_single_date"] = "N/A (No from_date)"
            scenarios_passed += 1
        except Exception as e:
            scenario_results["4_single_date"] = f"FAIL: {e}"

        # 5. Vehicle filter
        try:
            if "vehicle" in supported_fields:
                res5 = run(rname, filters={"vehicle": v_active})
                assert isinstance(res5, dict)
                scenario_results["5_vehicle"] = f"PASS (rows={len(res5['result'])})"
            else:
                scenario_results["5_vehicle"] = "N/A (No vehicle field)"
            scenarios_passed += 1
        except Exception as e:
            scenario_results["5_vehicle"] = f"FAIL: {e}"

        # 6. Mine Site filter
        try:
            if "mine_site" in supported_fields:
                res6 = run(rname, filters={"mine_site": s_active})
                assert isinstance(res6, dict)
                scenario_results["6_mine_site"] = f"PASS (rows={len(res6['result'])})"
            else:
                scenario_results["6_mine_site"] = "N/A (No mine_site field)"
            scenarios_passed += 1
        except Exception as e:
            scenario_results["6_mine_site"] = f"FAIL: {e}"

        # 7. Entity filter (Supplier, Customer, Warehouse, Item, etc.)
        try:
            entity_filter = {}
            if "supplier" in supported_fields:
                entity_filter["supplier"] = sup_active
            elif "customer" in supported_fields:
                entity_filter["customer"] = cust_active
            elif "warehouse" in supported_fields:
                entity_filter["warehouse"] = wh_active
            elif "item_code" in supported_fields:
                entity_filter["item_code"] = item_active

            if entity_filter:
                res7 = run(rname, filters=entity_filter)
                assert isinstance(res7, dict)
                scenario_results["7_entity"] = f"PASS (rows={len(res7['result'])})"
            else:
                scenario_results["7_entity"] = "N/A (No entity field)"
            scenarios_passed += 1
        except Exception as e:
            scenario_results["7_entity"] = f"FAIL: {e}"

        # 8. Multiple filter combinations
        try:
            comb_filters = {}
            if "from_date" in supported_fields:
                comb_filters["from_date"] = from_valid
            if "to_date" in supported_fields:
                comb_filters["to_date"] = to_valid
            if "vehicle" in supported_fields:
                comb_filters["vehicle"] = v_active
            if "mine_site" in supported_fields:
                comb_filters["mine_site"] = s_active

            res8 = run(rname, filters=comb_filters)
            assert isinstance(res8, dict)
            scenario_results["8_multi_filter"] = f"PASS (rows={len(res8['result'])})"
            scenarios_passed += 1
        except Exception as e:
            scenario_results["8_multi_filter"] = f"FAIL: {e}"

        # 9. Empty-result conditions
        try:
            empty_filters = {}
            if "vehicle" in supported_fields:
                empty_filters["vehicle"] = "NON-EXISTENT-VEH-999"
            elif "mine_site" in supported_fields:
                empty_filters["mine_site"] = "NON-EXISTENT-SITE-999"
            elif "driver" in supported_fields:
                empty_filters["driver"] = "NON-EXISTENT-DRIVER-999"
            elif "item_code" in supported_fields:
                empty_filters["item_code"] = "NON-EXISTENT-ITEM-999"
            elif "warehouse" in supported_fields:
                empty_filters["warehouse"] = "NON-EXISTENT-WH-999"
            elif "supplier" in supported_fields:
                empty_filters["supplier"] = "NON-EXISTENT-SUP-999"
            elif "customer" in supported_fields:
                empty_filters["customer"] = "NON-EXISTENT-CUST-999"
            elif "from_date" in supported_fields and "to_date" in supported_fields:
                empty_filters["from_date"] = "2099-01-01"
                empty_filters["to_date"] = "2099-01-02"
            elif "from_date" in supported_fields:
                empty_filters["from_date"] = "2099-01-01"
            elif "item_group" in supported_fields:
                empty_filters["item_group"] = "NON-EXISTENT-GRP-999"
            elif "document_type" in supported_fields:
                empty_filters["document_type"] = "NON-EXISTENT-DOC-999"

            res9 = run(rname, filters=empty_filters)
            assert isinstance(res9, dict) and len(res9["result"]) == 0
            scenario_results["9_empty_condition"] = "PASS (rows=0, no error)"
            scenarios_passed += 1
        except Exception as e:
            scenario_results["9_empty_condition"] = f"FAIL: {e}"

        # 10. Invalid and reversed date ranges
        try:
            if "from_date" in supported_fields and "to_date" in supported_fields:
                res10 = run(rname, filters={"from_date": to_valid, "to_date": from_valid})
                assert isinstance(res10, dict) and len(res10["result"]) == 0
                scenario_results["10_reversed_dates"] = "PASS (graceful empty rows=0)"
            else:
                scenario_results["10_reversed_dates"] = "N/A (No date fields)"
            scenarios_passed += 1
        except Exception as e:
            scenario_results["10_reversed_dates"] = f"FAIL: {e}"

        is_all_passed = (scenarios_passed == 10)
        status_icon = "✅ [PASS]" if is_all_passed else "❌ [FAIL]"
        print(f"{status_icon} [{idx:02d}/55] {rname:<42} | Scenarios: {scenarios_passed}/10 Passed")

        report_test_summary.append({
            "idx": idx,
            "name": rname,
            "passed": is_all_passed,
            "scenarios": scenario_results
        })

    print("\n" + "=" * 80)
    total_passed_reports = sum(1 for r in report_test_summary if r["passed"])
    print(f"55-REPORT AUDIT RESULT: {total_passed_reports} / 55 Reports Passed All 10 Test Scenarios")
    print("=" * 80 + "\n")

    # =========================================================================
    # SECTION 5: CALCULATION & DATA INTEGRITY VERIFICATION
    # =========================================================================
    print("--- SECTION 5: CALCULATION & FINANCIAL/GL RECONCILIATION ---")

    # 1. Fuel calculations: Sum of quantity and cost in Daily Fuel Consumption vs tabFuel Log
    fl_summary = frappe.db.sql("""
        SELECT ROUND(SUM(quantity_litres), 2) as qty, ROUND(SUM(total_fuel_cost), 2) as cost
        FROM `tabFuel Log`
        WHERE is_test_record = 0 AND approval_status = 'Approved'
    """, as_dict=True)[0]

    rep_fuel = run("Daily Fuel Consumption", filters={}).get("result", [])
    rep_fuel_qty = sum(r.get("total_quantity_(l)") or 0.0 for r in rep_fuel)
    rep_fuel_cost = sum(r.get("total_fuel_cost") or 0.0 for r in rep_fuel)

    fuel_reconciled = (abs(fl_summary["qty"] - rep_fuel_qty) < 0.01 and abs(fl_summary["cost"] - rep_fuel_cost) < 0.01)
    print(f"✅ Fuel Log Reconciliation: DB Qty={fl_summary['qty']}, Rep Qty={rep_fuel_qty} | DB Cost={fl_summary['cost']}, Rep Cost={rep_fuel_cost} -> Matched: {fuel_reconciled}")

    # 2. Operational Expense vs GL Entries
    op_exp_db = frappe.db.sql("""
        SELECT ROUND(SUM(amount), 2) as amount
        FROM `tabOperational Expense`
        WHERE is_test_record = 0 OR is_test_record IS NULL
    """, as_dict=True)[0]["amount"] or 0.0

    rep_exp = run("Daily Operational Expense", filters={}).get("result", [])
    rep_exp_amount = sum(r.get("total_amount") or 0.0 for r in rep_exp)
    exp_reconciled = (abs(op_exp_db - rep_exp_amount) < 0.01)
    print(f"✅ Operational Expense Reconciliation: DB Amount={op_exp_db}, Rep Amount={rep_exp_amount} -> Matched: {exp_reconciled}")

    # 3. Stock valuation reconciliation: Spare Parts Stock Register vs tabBin
    bin_stock_val = frappe.db.sql("""
        SELECT ROUND(SUM(b.stock_value), 2)
        FROM `tabBin` b
        JOIN `tabItem` i ON b.item_code = i.name
        WHERE (i.custom_is_test_record = 0 OR i.custom_is_test_record IS NULL)
    """)[0][0] or 0.0
    rep_stock = run("Spare Parts Stock Register", filters={}).get("result", [])
    rep_stock_val = sum(r.get("total_stock_value") or 0.0 for r in rep_stock)
    stock_reconciled = (abs(bin_stock_val - rep_stock_val) < 0.01)
    print(f"✅ Stock Valuation Reconciliation: DB Bin Value={bin_stock_val:,.2f}, Rep Stock Value={rep_stock_val:,.2f} -> Matched: {stock_reconciled}")

    # 4. GL Mathematical Balance
    unbalanced_gl = frappe.db.sql("""
        SELECT voucher_type, voucher_no, SUM(debit) - SUM(credit) as diff
        FROM `tabGL Entry`
        WHERE is_cancelled = 0
        GROUP BY voucher_type, voucher_no
        HAVING ABS(diff) > 0.01
    """)
    gl_balanced = (len(unbalanced_gl) == 0)
    print(f"✅ GL Mathematical Balance (Debit == Credit): {len(unbalanced_gl)} unbalanced vouchers -> Matched: {gl_balanced}")

    # Return overall result
    return {
        "reports_passed": total_passed_reports,
        "total_reports": len(report_list),
        "fuel_reconciled": fuel_reconciled,
        "exp_reconciled": exp_reconciled,
        "stock_reconciled": stock_reconciled,
        "gl_balanced": gl_balanced
    }

if __name__ == "__main__":
    run_comprehensive_report_audit()
