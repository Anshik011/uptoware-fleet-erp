import frappe
from frappe.utils import flt, today, now_datetime

def run_migration_and_cleanup():
    print("\n--- 1. AUDITING & MIGRATING STANDARD ITEM REORDER ---")
    
    # 1. Inspect Custom Fields: custom_reorder_level and custom_reorder_qty
    cf_lvl = "Item-custom_reorder_level"
    cf_qty = "Item-custom_reorder_qty"
    
    # Migrate any non-test items with custom fields into tabItem Reorder child table
    items_to_migrate = frappe.db.sql("""
        SELECT name, custom_reorder_level, custom_reorder_qty
        FROM `tabItem`
        WHERE (custom_is_test_record = 0 OR custom_is_test_record IS NULL)
          AND (IFNULL(custom_reorder_level, 0) > 0 OR IFNULL(custom_reorder_qty, 0) > 0)
    """, as_dict=True)
    
    for it in items_to_migrate:
        doc = frappe.get_doc("Item", it.name)
        # Check if already has row in reorder_levels for default warehouse
        has_wh = any(r.warehouse == "Stores - U" for r in doc.reorder_levels)
        if not has_wh:
            doc.append("reorder_levels", {
                "warehouse": "Stores - U",
                "warehouse_reorder_level": flt(it.custom_reorder_level),
                "warehouse_reorder_qty": flt(it.custom_reorder_qty),
                "material_request_type": "Purchase"
            })
            doc.save(ignore_permissions=True)
            print(f"Migrated Item {it.name} reorder settings to standard Item Reorder table.")
            
    # Delete redundant Custom Field records
    if frappe.db.exists("Custom Field", cf_lvl):
        frappe.delete_doc("Custom Field", cf_lvl, force=1)
        print(f"Removed redundant Custom Field: {cf_lvl}")
    if frappe.db.exists("Custom Field", cf_qty):
        frappe.delete_doc("Custom Field", cf_qty, force=1)
        print(f"Removed redundant Custom Field: {cf_qty}")
        
    frappe.clear_cache()
    frappe.db.commit()
    print("Standard Item Reorder migration completed successfully.")

if __name__ == "__main__":
    run_migration_and_cleanup()

