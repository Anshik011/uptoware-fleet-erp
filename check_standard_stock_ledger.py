import frappe

def run():
    print("=== INSPECTING STANDARD ERPNEXT STOCK LEDGER REPORT ===")
    sl_rep = frappe.get_doc("Report", "Stock Ledger")
    print("Stock Ledger report type:", sl_rep.report_type)
    # Check standard filters or query
    import inspect
    from erpnext.stock.report.stock_ledger import stock_ledger
    print("stock_ledger execute signature:", inspect.signature(stock_ledger.execute))
    src = inspect.getsource(stock_ledger.get_stock_ledger_entries)
    for line in src.split("\n"):
        if "cancelled" in line:
            print("  ", line)

run()

