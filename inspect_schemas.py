import frappe

def inspect_schemas():
    frappe.init("frontend")
    frappe.connect()

    print("=== INSPECTING SCHEMAS ===")

    # 1. Mining Trip fields
    mt_fields = [f.fieldname for f in frappe.get_meta("Mining Trip").fields]
    print("Mining Trip fields:", [f for f in mt_fields if "time" in f or "date" in f or "delay" in f or "status" in f or "sched" in f or "expect" in f])

    # 2. Vehicle fields
    v_fields = [f.fieldname for f in frappe.get_meta("Vehicle").fields]
    print("Vehicle fields:", [f for f in v_fields if "maint" in f or "service" in f or "status" in f])

    # 3. Item Reorder & Bin
    ir_fields = [f.fieldname for f in frappe.get_meta("Item Reorder").fields]
    print("Item Reorder fields:", ir_fields)
    bin_fields = [f.fieldname for f in frappe.get_meta("Bin").fields]
    print("Bin fields:", [f for f in bin_fields if "qty" in f or "item" in f or "warehouse" in f])

    # 4. Purchase Order fields
    po_fields = [f.fieldname for f in frappe.get_meta("Purchase Order").fields]
    print("Purchase Order fields:", [f for f in po_fields if "date" in f or "status" in f or "deliv" in f or "due" in f])

    # 5. Purchase Invoice fields
    pi_fields = [f.fieldname for f in frappe.get_meta("Purchase Invoice").fields]
    print("Purchase Invoice fields:", [f for f in pi_fields if "due" in f or "status" in f or "outstand" in f])

    # 6. Operational Expense fields
    oe_fields = [f.fieldname for f in frappe.get_meta("Operational Expense").fields]
    print("Operational Expense fields:", [f for f in oe_fields if "amount" in f or "threshold" in f or "status" in f or "state" in f])

    # 7. Check if Item Reorder has any records
    reorders = frappe.db.sql("SELECT parent, warehouse, warehouse_reorder_level, warehouse_reorder_qty FROM `tabItem Reorder`", as_dict=True)
    print(f"Item Reorders count: {len(reorders)}")
    for r in reorders[:5]:
        print("  ", r)

    # 8. Check Fleet Settings for threshold fields
    fs_meta = frappe.get_meta("Fleet Settings")
    print("Fleet Settings threshold fields:", [f.fieldname for f in fs_meta.fields if "threshold" in f.fieldname or "receiv" in f.fieldname or "limit" in f.fieldname or "expense" in f.fieldname])

    # 9. Check if any Items have reorder levels configured in tabItem or child table
    items_with_reorder = frappe.db.sql("SELECT name, item_name, item_group FROM `tabItem` WHERE item_group = 'Spare Parts' LIMIT 10", as_dict=True)
    print(f"Spare Parts items count: {len(items_with_reorder)}")
    for itm in items_with_reorder[:5]:
        print("  ", itm)

if __name__ == "__main__":
    inspect_schemas()
