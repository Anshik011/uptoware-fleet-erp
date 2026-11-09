import frappe
from frappe.utils import flt, today

def run():
    print("=== INSPECTING STOCK LEDGER ENTRY ON SUBMIT AND CANCEL ===")
    
    # Let's inspect an existing cancelled stock transaction or create a temporary one
    cancelled_sles = frappe.db.sql("""
        SELECT name, voucher_type, voucher_no, item_code, warehouse, actual_qty, qty_after_transaction, is_cancelled, creation
        FROM `tabStock Ledger Entry`
        WHERE is_cancelled = 1
        ORDER BY creation DESC
        LIMIT 5
    """, as_dict=True)
    
    print(f"Sample cancelled SLEs (is_cancelled = 1): {len(cancelled_sles)}")
    for s in cancelled_sles:
        print(f"  Voucher: {s.voucher_no}, Item: {s.item_code}, Qty: {s.actual_qty}, is_cancelled: {s.is_cancelled}")

    # Check all SLEs for a voucher that was cancelled
    if cancelled_sles:
        v_no = cancelled_sles[0].voucher_no
        all_v_sles = frappe.db.sql("""
            SELECT name, voucher_type, voucher_no, actual_qty, qty_after_transaction, is_cancelled, docstatus
            FROM `tabStock Ledger Entry`
            WHERE voucher_no = %s
        """, (v_no,), as_dict=True)
        print(f"\nAll SLE rows for cancelled voucher {v_no}:")
        for s in all_v_sles:
            print(f"  Row: {s.name}, Actual Qty: {s.actual_qty}, Qty After: {s.qty_after_transaction}, is_cancelled: {s.is_cancelled}, docstatus: {s.docstatus}")

run()

