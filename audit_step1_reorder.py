import frappe

def run():
    print("=== INSPECTING STANDARD ITEM REORDER DOCTYPE ===")
    dt = frappe.get_doc("DocType", "Item Reorder")
    for f in dt.fields:
        print(f"  Field: {f.fieldname} ({f.fieldtype}) - Label: {f.label}")

    item_dt = frappe.get_doc("DocType", "Item")
    print("\n=== REORDER RELATED FIELDS ON ITEM ===")
    for f in item_dt.fields:
        if any(w in f.fieldname.lower() for w in ["reorder", "safety", "min_order"]):
            print(f"  Field: {f.fieldname} ({f.fieldtype}) - Label: {f.label}")

    # Check child table link on Item
    child_tables = [f.options for f in item_dt.fields if f.fieldtype == "Table"]
    print(f"\nChild tables on Item: {child_tables}")
    reorder_table_field = [f.fieldname for f in item_dt.fields if f.options == "Item Reorder"]
    print(f"Item Reorder fieldname on Item: {reorder_table_field}")

    # Check how standard ERPNext creates Material Request from reorder
    print("\n=== CHECKING STANDARD REORDER LOGIC ===")
    has_mr_reorder = hasattr(frappe.get_module("erpnext.stock.reorder_item"), "reorder_item") if frappe.db.exists("DocType", "Material Request") else False
    print(f"Has erpnext.stock.reorder_item: {has_mr_reorder}")

run()

