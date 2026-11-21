import frappe

frappe.init(site="frontend")
frappe.connect()

print("Checking Item Group 'Spare Parts':", frappe.db.exists("Item Group", "Spare Parts"))

# Try creating test item
item_code = "SP-BRAKE-TEST-99"
if frappe.db.exists("Item", item_code):
    frappe.delete_doc("Item", item_code, force=1)

item = frappe.get_doc({
    "doctype": "Item",
    "item_code": item_code,
    "item_name": "Heavy duty Brake part",
    "item_group": "Spare Parts",
    "stock_uom": "Nos",
    "valuation_rate": 1000,
    "is_stock_item": 1
})
item.insert(ignore_permissions=True)
frappe.db.commit()
print("Successfully created test Item in Spare Parts Item Group:", item.name)

# Cleanup test item
frappe.delete_doc("Item", item_code, force=1)
frappe.db.commit()
print("Cleaned up test item. Ready for user!")
