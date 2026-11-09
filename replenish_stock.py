import frappe

def run():
    mr = frappe.get_doc({
        "doctype": "Stock Entry",
        "stock_entry_type": "Material Receipt",
        "company": "Uptoware",
        "to_warehouse": "Stores - U",
        "items": [{
            "item_code": "SP-HYD-SEAL-01",
            "qty": 50.0,
            "t_warehouse": "Stores - U",
            "basic_rate": 1250.0,
            "cost_center": "Main - U"
        }]
    }).insert(ignore_permissions=True)
    mr.submit()
    frappe.db.commit()
    print(f"Replenished 50 units of SP-HYD-SEAL-01. Stock Entry: {mr.name}")
    bin_qty = frappe.db.get_value("Bin", {"item_code": "SP-HYD-SEAL-01", "warehouse": "Stores - U"}, "actual_qty")
    print(f"New stock balance in Stores - U: {bin_qty}")

