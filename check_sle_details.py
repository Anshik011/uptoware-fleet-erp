import frappe

def run():
    sles = frappe.db.sql("""
        SELECT name, voucher_no, actual_qty, qty_after_transaction, is_cancelled, is_adjustment_entry, creation
        FROM `tabStock Ledger Entry`
        WHERE is_cancelled = 1
        ORDER BY voucher_no ASC, creation ASC
        LIMIT 6
    """, as_dict=True)
    for s in sles:
        print(f"Voucher: {s.voucher_no} | Name: {s.name} | Qty: {s.actual_qty} | Balance: {s.qty_after_transaction} | is_cancelled: {s.is_cancelled} | is_adj: {s.is_adjustment_entry} | Created: {s.creation}")

run()

