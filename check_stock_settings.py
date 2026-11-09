def run():
    import frappe
    
    print("=== INSPECTING STOCK SETTINGS & STOCK ENTRY REQUIREMENTS ===")
    ss = frappe.get_single("Stock Settings")
    print(f"Allow Negative Stock: {ss.allow_negative_stock}")
    
    # Check default company
    companies = frappe.get_all("Company", fields=["name", "default_expense_account", "stock_received_but_not_billed"])
    print(f"Companies: {companies}")
    
    # Check default warehouse
    whs = frappe.get_all("Warehouse", fields=["name", "company"])
    print(f"Warehouses: {[w.name for w in whs]}")

run()
