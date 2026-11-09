def run():
    import frappe
    
    print("=== INSPECTING VEHICLE, STOCK ENTRY, SUPPLIER, AND MAINTENANCE DOCTYPES ===")
    
    # 1. Vehicle vehicle_status options
    veh_meta = frappe.get_meta("Vehicle")
    for f in veh_meta.fields:
        if f.fieldname in ["vehicle_status", "last_odometer"]:
            print(f"Vehicle Field: {f.fieldname} ({f.fieldtype}) -> options: {f.options}")
            
    # 2. Stock Entry
    se_meta = frappe.get_meta("Stock Entry")
    print(f"Stock Entry has fields: {len(se_meta.fields)}")
    se_types = frappe.get_all("Stock Entry Type", fields=["name"])
    print(f"Stock Entry Types: {[t.name for t in se_types]}")
    
    # Check if custom_vehicle or vehicle exists on Stock Entry
    veh_f_in_se = [f.fieldname for f in se_meta.fields if "vehicle" in f.fieldname or "breakdown" in f.fieldname]
    print(f"Vehicle/Breakdown fields in Stock Entry: {veh_f_in_se}")
    
    # 3. Suppliers & Warehouses
    whs = frappe.get_all("Warehouse", fields=["name", "company"], limit=5)
    print(f"Sample Warehouses: {[w.name for w in whs]}")
    
    # 4. Items
    items = frappe.get_all("Item", fields=["name", "item_name", "stock_uom"], limit=5)
    print(f"Sample Items: {[i.name for i in items]}")
    
    # 5. Maintenance Visit
    if frappe.db.exists("DocType", "Maintenance Visit"):
        mv_meta = frappe.get_meta("Maintenance Visit")
        print(f"Maintenance Visit exists with {len(mv_meta.fields)} fields.")
    else:
        print("Maintenance Visit DocType does not exist.")

run()
