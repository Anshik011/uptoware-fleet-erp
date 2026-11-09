import frappe
from frappe.utils import flt, today, now_datetime
from frappe.desk.query_report import run as run_report
from erpnext.stock.report.stock_ledger.stock_ledger import execute as run_standard_stock_ledger

def run():
    import frappe
    from frappe.utils import flt, today, now_datetime
    from frappe.desk.query_report import run as run_report
    from erpnext.stock.report.stock_ledger.stock_ledger import execute as run_standard_stock_ledger

    print("=== TESTING STOCK MOVEMENT HISTORY CANCELLATION VISIBILITY ===")

    company = "Uptoware"
    curr_date = today()
    wh_stores = "Stores - U"
    ts = now_datetime().strftime('%H%M%S')

    # Create a non-test production part to verify reports directly
    item_audit = f"AUD-PART-MOV-{ts}"
    it = frappe.get_doc({
        "doctype": "Item",
        "item_code": item_audit,
        "item_name": "Audit Stock Movement Part",
        "item_group": "Consumables and Hardware",
        "stock_uom": "Nos",
        "is_stock_item": 1,
        "valuation_rate": 200.0,
        "custom_is_test_record": 0
    }).insert(ignore_permissions=True)

    # 1. Active transaction: Receipt 10 units
    se_rec = frappe.get_doc({
        "doctype": "Stock Entry",
        "stock_entry_type": "Material Receipt",
        "company": company,
        "to_warehouse": wh_stores,
        "items": [{
            "item_code": item_audit,
            "qty": 10.0,
            "t_warehouse": wh_stores,
            "basic_rate": 200.0,
            "cost_center": "Main - U"
        }]
    }).insert(ignore_permissions=True)
    se_rec.submit()
    print(f"Submitted active receipt {se_rec.name} for 10 units.")

    # 2. Transaction to be cancelled: Issue 3 units
    se_cancel = frappe.get_doc({
        "doctype": "Stock Entry",
        "stock_entry_type": "Material Issue",
        "company": company,
        "items": [{
            "item_code": item_audit,
            "qty": 3.0,
            "s_warehouse": wh_stores,
            "basic_rate": 200.0,
            "cost_center": "Main - U"
        }]
    }).insert(ignore_permissions=True)
    se_cancel.submit()
    print(f"Submitted issue {se_cancel.name} for 3 units.")

    # Now cancel it
    se_cancel.cancel()
    print(f"Cancelled issue {se_cancel.name}.")

    # Current true physical stock balance
    true_bin_qty = flt(frappe.db.get_value("Bin", {"item_code": item_audit, "warehouse": wh_stores}, "actual_qty") or 0.0)
    print(f"Current true Bin actual_qty: {true_bin_qty}")

    # Standard ERPNext Stock Ledger balance verification via Bin and SLE
    sle_active_sum = flt(frappe.db.sql("""
        SELECT SUM(actual_qty) FROM `tabStock Ledger Entry`
        WHERE item_code = %s AND warehouse = %s AND is_cancelled = 0
    """, (item_audit, wh_stores))[0][0] or 0.0)
    print(f"Active Stock Ledger Entry sum: {sle_active_sum}")

    # Standard ERPNext Stock Ledger report execution via run_report (passing list for item_code in v16)
    sl_final_balance = sle_active_sum
    try:
        sl_res = run_report("Stock Ledger", filters={
            "company": company,
            "from_date": "2026-01-01",
            "to_date": "2026-12-31",
            "item_code": [item_audit],
            "warehouse": wh_stores
        })
        sl_data = [r for r in sl_res.get("result", []) if r.get("item_code") == item_audit]
        if sl_data:
            sl_final_balance = sl_data[-1].get("qty_after_transaction", sl_final_balance)
        print(f"Standard ERPNext Stock Ledger report rows: {len(sl_data)}, final balance: {sl_final_balance}")
    except Exception as e:
        print(f"Standard Stock Ledger report error: {e}, using SLE active sum: {sl_final_balance}")

    # Test Mode 1: Active-Only Mode (include_cancelled = '0' / default)
    f_active = {
        "from_date": "2026-01-01",
        "to_date": "2026-12-31",
        "warehouse": wh_stores,
        "item_code": item_audit,
        "company": company,
        "include_cancelled": "0",
        "item_group": "", "brand": "", "preferred_supplier": "", "show_all": "1",
        "vehicle": "", "breakdown_type": "", "mine_site": "", "voucher_type": ""
    }
    rep_active = run_report("Stock Movement History", filters=f_active)
    rows_active = rep_active.get("result", [])
    print(f"\n[Mode 1: Active-Only] Rows returned: {len(rows_active)}")
    for r in rows_active:
        print(f"  Voucher: {r.get('voucher_no')} | Status: {r.get('status')} | In: {r.get('in_qty')} | Out: {r.get('out_qty')} | Balance: {r.get('balance_qty')}")

    # Test Mode 2: Include-Cancelled Mode (include_cancelled = '1')
    f_cancelled = dict(f_active)
    f_cancelled["include_cancelled"] = "1"
    rep_cancelled = run_report("Stock Movement History", filters=f_cancelled)
    rows_cancelled = rep_cancelled.get("result", [])
    print(f"\n[Mode 2: Include-Cancelled] Rows returned: {len(rows_cancelled)}")
    for r in rows_cancelled:
        print(f"  Voucher: {r.get('voucher_no')} | Status: {r.get('status')} | In: {r.get('in_qty')} | Out: {r.get('out_qty')} | Balance: {r.get('balance_qty')}")

    # Validation Checks
    # 1. In Active-only mode, exactly 1 row (the active receipt)
    c1 = (len(rows_active) == 1 and rows_active[0].get("voucher_no") == se_rec.name and rows_active[0].get("status") == "Active")

    # 2. In Include-cancelled mode, 3 rows (active receipt + cancelled original issue + cancelled reversal receipt)
    vouchers_in_c = [r.get("voucher_no") for r in rows_cancelled]
    statuses_in_c = [r.get("status") for r in rows_cancelled]
    c2 = (len(rows_cancelled) == 3 and se_cancel.name in vouchers_in_c and "Cancelled (Original)" in statuses_in_c and "Cancelled (Reversal)" in statuses_in_c)

    # 3. Sum of Net movement:
    # In Active mode: Net sum of in_qty - out_qty = 10.0
    net_active = sum(flt(r.get("in_qty", 0)) - flt(r.get("out_qty", 0)) for r in rows_active)
    # In Cancelled mode: Net sum of in_qty - out_qty = 10.0 + (-3.0 + 3.0) = 10.0
    net_cancelled = sum(flt(r.get("in_qty", 0)) - flt(r.get("out_qty", 0)) for r in rows_cancelled)
    c3 = (net_active == true_bin_qty and net_cancelled == true_bin_qty and net_active == sl_final_balance)

    print(f"\n--- VERIFICATION CHECKS ---")
    print(f"Check 1: Active-only mode displays ONLY active entries: {c1}")
    print(f"Check 2: Include-cancelled mode displays original & reversal entries with status: {c2}")
    print(f"Check 3: Net movement matches true Bin qty ({true_bin_qty}) and standard Stock Ledger balance ({sl_final_balance}) in BOTH modes: {c3}")

    all_passed = c1 and c2 and c3
    if all_passed:
        print("\n>>> ALL STOCK MOVEMENT AUDIT CHECKS PASSED PERFECTLY! <<<")
    else:
        print("\n>>> CHECKS FAILED! <<<")

    # Cleanup
    try:
        se_rec.cancel()
        frappe.delete_doc("Stock Entry", se_rec.name, force=1)
        frappe.delete_doc("Stock Entry", se_cancel.name, force=1)
        frappe.delete_doc("Item", it.name, force=1)
        frappe.db.commit()
    except Exception:
        pass

    assert all_passed, "Stock movement visibility checks failed"

run()
