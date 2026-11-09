import frappe

def run():
    print("=== CHECKING EXISTING ITEM REORDER DATA ===")
    items = frappe.db.sql("""
        SELECT name, item_name, custom_reorder_level, custom_reorder_qty, custom_is_test_record
        FROM `tabItem`
        WHERE IFNULL(custom_reorder_level, 0) > 0 OR IFNULL(custom_reorder_qty, 0) > 0
    """, as_dict=True)
    print(f"Items with custom_reorder_level or custom_reorder_qty > 0: {len(items)}")
    for it in items:
        print(f"  {it.name}: Level={it.custom_reorder_level}, Qty={it.custom_reorder_qty}, Test={it.custom_is_test_record}")

    # Check tabItem Reorder rows
    reorders = frappe.db.sql("""
        SELECT name, parent, warehouse, warehouse_reorder_level, warehouse_reorder_qty
        FROM `tabItem Reorder`
    """, as_dict=True)
    print(f"\nExisting rows in tabItem Reorder: {len(reorders)}")
    for r in reorders:
        print(f"  Item {r.parent} for Warehouse {r.warehouse}: Level={r.warehouse_reorder_level}, Qty={r.warehouse_reorder_qty}")

run()

