def run():
    import frappe
    
    print("=== TESTING STOCK ITEM & MATERIAL RECEIPT/ISSUE FLOW ===")
    company = "Uptoware"
    wh = "Stores - U"
    item_code = "SP-HYD-SEAL-01"
    
    # 1. Ensure Item exists
    if not frappe.db.exists("Item", item_code):
        item = frappe.get_doc({
            "doctype": "Item",
            "item_code": item_code,
            "item_name": "Hydraulic Cylinder Seal Kit",
            "item_group": "All Item Groups",
            "stock_uom": "Nos",
            "is_stock_item": 1,
            "valuation_rate": 1250.0,
            "opening_stock": 0
        }).insert(ignore_permissions=True)
        print(f"Created Item: {item_code}")
    else:
        print(f"Item {item_code} already exists.")
        
    # 2. Material Receipt to add stock
    mr = frappe.get_doc({
        "doctype": "Stock Entry",
        "stock_entry_type": "Material Receipt",
        "company": company,
        "to_warehouse": wh,
        "items": [{
            "item_code": item_code,
            "qty": 20.0,
            "t_warehouse": wh,
            "basic_rate": 1250.0,
            "cost_center": "Main - U"
        }]
    }).insert(ignore_permissions=True)
    mr.submit()
    print(f"Submitted Material Receipt: {mr.name} (20 units received)")
    
    # Check current stock balance
    qty = frappe.db.get_value("Bin", {"item_code": item_code, "warehouse": wh}, "actual_qty")
    print(f"Current Stock Balance for {item_code} in {wh}: {qty}")

run()
