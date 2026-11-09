import frappe

def run():
    print("=== TESTING CANCELLATION STATUS LABELLING IN SQL ===")
    
    rows = frappe.db.sql("""
        SELECT
            sle.name,
            sle.voucher_no,
            se.stock_entry_type,
            sle.actual_qty,
            sle.qty_after_transaction,
            sle.is_cancelled,
            CASE
                WHEN sle.is_cancelled = 0 THEN 'Active'
                WHEN sle.is_cancelled = 1 AND (
                    (se.stock_entry_type = 'Material Issue' AND sle.actual_qty > 0)
                    OR (se.stock_entry_type IN ('Material Receipt', 'Receive at Site') AND sle.actual_qty < 0)
                    OR (se.stock_entry_type = 'Material Transfer' AND sle.creation > (SELECT MIN(s2.creation) FROM `tabStock Ledger Entry` s2 WHERE s2.voucher_no = sle.voucher_no AND s2.warehouse = sle.warehouse))
                    OR (sle.creation > (SELECT MIN(s2.creation) FROM `tabStock Ledger Entry` s2 WHERE s2.voucher_no = sle.voucher_no AND s2.warehouse = sle.warehouse))
                ) THEN 'Cancelled (Reversal)'
                WHEN sle.is_cancelled = 1 THEN 'Cancelled (Original)'
                ELSE 'Active'
            END AS cancel_status
        FROM `tabStock Ledger Entry` sle
        LEFT JOIN `tabStock Entry` se ON sle.voucher_type = 'Stock Entry' AND sle.voucher_no = se.name
        WHERE sle.voucher_no IN ('MAT-STE-2026-00071', 'MAT-STE-2026-00074', 'MAT-STE-2026-00080')
        ORDER BY sle.voucher_no ASC, sle.creation ASC
    """, as_dict=True)
    
    for r in rows:
        print(f"Voucher: {r.voucher_no} | Type: {r.stock_entry_type} | Qty: {r.actual_qty} | Cancel Status: {r.cancel_status}")

run()

