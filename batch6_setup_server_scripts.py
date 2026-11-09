import frappe

def run():
    print("=== BATCH 6: CONFIGURING SERVER SCRIPTS FOR SPARE PARTS & STOCK RETURNS ===")

    # 1. Update Server Script: Stock Entry - Spare Parts Validation (Before Submit)
    ss_se_bs_name = "Stock Entry - Spare Parts Validation"
    ss_se_bs_code = """# SERVER SCRIPT: Stock Entry - Spare Parts Validation (Before Submit)
# 1. Role-based workflow guard for Workshop Supervisor
user_roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (frappe.session.user,))]
if "Workshop Supervisor" in user_roles and "Store Manager" not in user_roles and "System Manager" not in user_roles:
    if not doc.custom_vehicle_breakdown:
        frappe.throw("Workshop Supervisors are only authorized to create and submit Stock Entries linked to an active Vehicle Breakdown.")
    is_valid_type = (doc.stock_entry_type == "Material Issue") or (doc.stock_entry_type == "Material Receipt" and doc.custom_is_return == 1)
    if not is_valid_type:
        frappe.throw(f"Workshop Supervisors are not authorized to execute Stock Entries of type '{doc.stock_entry_type}'. Authorized workflows are Material Issue for repairs or Parts Return.")

# 2. Breakdown parts validation
if doc.custom_vehicle_breakdown and doc.docstatus == 1:
    if not frappe.db.exists("Vehicle Breakdown", doc.custom_vehicle_breakdown):
        frappe.throw(f"Vehicle Breakdown '{doc.custom_vehicle_breakdown}' does not exist.")
        
    bkd = frappe.get_doc("Vehicle Breakdown", doc.custom_vehicle_breakdown)
    is_return = (doc.custom_is_return == 1) or (doc.stock_entry_type == "Material Receipt")

    if not is_return:
        # ----------------------------------------------------
        # MATERIAL ISSUE VALIDATION
        # ----------------------------------------------------
        if bkd.repair_status in ["Reported", "Repaired", "Closed"]:
            frappe.throw(f"Parts cannot be issued against Breakdown '{doc.custom_vehicle_breakdown}' with status '{bkd.repair_status}'. Only breakdowns in 'Approved', 'In Workshop', or 'Awaiting Parts' are eligible for parts issuance.")
            
        if bkd.get("resolution_type") == "Rejected":
            frappe.throw(f"Parts cannot be issued against rejected Breakdown '{doc.custom_vehicle_breakdown}'.")

        for item in doc.items:
            if not frappe.db.exists("Item", item.item_code):
                frappe.throw(f"Item '{item.item_code}' does not exist.")
                
            wh = item.s_warehouse or item.t_warehouse
            if not wh or not frappe.db.exists("Warehouse", wh):
                frappe.throw(f"Valid warehouse is required for part '{item.item_code}'. Got '{wh}'.")
                
            planned_parts = [p for p in (bkd.parts_table or []) if p.item_code == item.item_code]
            if not planned_parts:
                frappe.throw(f"Spare part '{item.item_code}' is not listed in planned parts for Breakdown '{doc.custom_vehicle_breakdown}'.")
                
            total_planned_qty = sum(float(p.planned_qty or 0.0) for p in planned_parts)
            
            # Cumulative issues from SUBMITTED Material Issue Stock Entries
            issued_so_far = frappe.db.sql(\"\"\"
                SELECT SUM(sed.qty)
                FROM `tabStock Entry Detail` sed
                JOIN `tabStock Entry` se ON sed.parent = se.name
                WHERE se.custom_vehicle_breakdown = %s
                  AND se.docstatus = 1
                  AND se.name != %s
                  AND (se.custom_is_return = 0 OR se.custom_is_return IS NULL)
                  AND se.stock_entry_type = 'Material Issue'
                  AND sed.item_code = %s
            \"\"\", (doc.custom_vehicle_breakdown, doc.name, item.item_code))[0][0] or 0.0
            
            already_issued = float(issued_so_far)
            current_issue = float(item.qty or 0.0)
            
            if (already_issued + current_issue) > total_planned_qty:
                frappe.throw(f"Total issued quantity ({already_issued + current_issue}) for part '{item.item_code}' cannot exceed planned quantity ({total_planned_qty}) on Breakdown '{doc.custom_vehicle_breakdown}'.")

            # Check stock availability
            available_qty = frappe.db.get_value("Bin", {"item_code": item.item_code, "warehouse": wh}, "actual_qty") or 0.0
            if float(available_qty) < current_issue:
                frappe.throw(f"Insufficient stock for part '{item.item_code}' in warehouse '{wh}'. Available: {available_qty}, Requested: {current_issue}.")

    else:
        # ----------------------------------------------------
        # STOCK RETURN VALIDATION (Material Receipt / Return)
        # ----------------------------------------------------
        for item in doc.items:
            # Check cumulative issued qty vs cumulative returned qty
            issued_qty = frappe.db.sql(\"\"\"
                SELECT SUM(sed.qty)
                FROM `tabStock Entry Detail` sed
                JOIN `tabStock Entry` se ON sed.parent = se.name
                WHERE se.custom_vehicle_breakdown = %s
                  AND se.docstatus = 1
                  AND se.name != %s
                  AND (se.custom_is_return = 0 OR se.custom_is_return IS NULL)
                  AND se.stock_entry_type = 'Material Issue'
                  AND sed.item_code = %s
            \"\"\", (doc.custom_vehicle_breakdown, doc.name, item.item_code))[0][0] or 0.0

            returned_so_far = frappe.db.sql(\"\"\"
                SELECT SUM(sed.qty)
                FROM `tabStock Entry Detail` sed
                JOIN `tabStock Entry` se ON sed.parent = se.name
                WHERE se.custom_vehicle_breakdown = %s
                  AND se.docstatus = 1
                  AND se.name != %s
                  AND (se.custom_is_return = 1 OR se.stock_entry_type = 'Material Receipt')
                  AND sed.item_code = %s
            \"\"\", (doc.custom_vehicle_breakdown, doc.name, item.item_code))[0][0] or 0.0

            net_issued = float(issued_qty) - float(returned_so_far)
            current_return = float(item.qty or 0.0)

            if current_return > net_issued:
                frappe.throw(f"Cannot return {current_return} units of part '{item.item_code}'. Only {net_issued} units are currently net-issued to Breakdown '{doc.custom_vehicle_breakdown}'.")
"""
    ss_bs = frappe.get_doc("Server Script", ss_se_bs_name)
    ss_bs.script = ss_se_bs_code
    ss_bs.save(ignore_permissions=True)
    print(f"Updated Server Script: {ss_se_bs_name}")

    # 2. Update Server Script: Stock Entry - Spare Parts Linkage (After Submit)
    ss_se_as_name = "Stock Entry - Spare Parts Linkage"
    ss_se_as_code = """# SERVER SCRIPT: Stock Entry - Spare Parts Linkage (After Submit)
if doc.custom_vehicle_breakdown and doc.docstatus == 1:
    bkd = frappe.get_doc("Vehicle Breakdown", doc.custom_vehicle_breakdown)
    
    # 1. Query all submitted Material Issues for this breakdown
    issues = frappe.db.sql(\"\"\"
        SELECT sed.item_code, sed.qty, sed.basic_rate, sed.amount, se.name as se_name, sed.s_warehouse
        FROM `tabStock Entry Detail` sed
        JOIN `tabStock Entry` se ON sed.parent = se.name
        WHERE se.custom_vehicle_breakdown = %s
          AND se.docstatus = 1
          AND (se.custom_is_return = 0 OR se.custom_is_return IS NULL)
          AND se.stock_entry_type = 'Material Issue'
        ORDER BY se.creation ASC
    \"\"\", (doc.custom_vehicle_breakdown,), as_dict=True)

    # 2. Query all submitted Material Receipts / Returns for this breakdown
    returns = frappe.db.sql(\"\"\"
        SELECT sed.item_code, sed.qty, sed.basic_rate, sed.amount, se.name as se_name
        FROM `tabStock Entry Detail` sed
        JOIN `tabStock Entry` se ON sed.parent = se.name
        WHERE se.custom_vehicle_breakdown = %s
          AND se.docstatus = 1
          AND (se.custom_is_return = 1 OR se.stock_entry_type = 'Material Receipt')
        ORDER BY se.creation ASC
    \"\"\", (doc.custom_vehicle_breakdown,), as_dict=True)

    item_stats = {}
    for r in issues:
        code = r.item_code
        if code not in item_stats:
            item_stats[code] = {
                "issued_qty": 0.0,
                "issued_amount": 0.0,
                "returned_qty": 0.0,
                "returned_amount": 0.0,
                "latest_rate": float(r.basic_rate or 0.0),
                "stock_entry": r.se_name,
                "warehouse": r.s_warehouse
            }
        item_stats[code]["issued_qty"] = item_stats[code]["issued_qty"] + float(r.qty or 0.0)
        item_stats[code]["issued_amount"] = item_stats[code]["issued_amount"] + float(r.amount or 0.0)
        item_stats[code]["latest_rate"] = float(r.basic_rate or 0.0)
        item_stats[code]["stock_entry"] = r.se_name

    for r in returns:
        code = r.item_code
        if code not in item_stats:
            item_stats[code] = {
                "issued_qty": 0.0,
                "issued_amount": 0.0,
                "returned_qty": 0.0,
                "returned_amount": 0.0,
                "latest_rate": float(r.basic_rate or 0.0),
                "stock_entry": r.se_name,
                "warehouse": None
            }
        item_stats[code]["returned_qty"] = item_stats[code]["returned_qty"] + float(r.qty or 0.0)
        item_stats[code]["returned_amount"] = item_stats[code]["returned_amount"] + float(r.amount or 0.0)

    # Update parts table on Vehicle Breakdown
    for p in (bkd.parts_table or []):
        if p.item_code in item_stats:
            st = item_stats[p.item_code]
            p.issued_qty = st["issued_qty"]
            p.returned_qty = st["returned_qty"]
            p.net_issued_qty = max(0.0, st["issued_qty"] - st["returned_qty"])
            p.rate = st["latest_rate"]
            p.amount = max(0.0, round(st["issued_amount"] - st["returned_amount"], 2))
            p.stock_entry = st["stock_entry"]
            
            planned = float(p.planned_qty or 0.0)
            if p.net_issued_qty >= planned and planned > 0:
                p.status = "Issued"
            elif p.net_issued_qty > 0:
                p.status = "Partially Issued"
            else:
                p.status = "Planned"

    # Recalculate total parts cost on Breakdown
    total_parts_cost = sum(float(p.amount or 0.0) for p in (bkd.parts_table or []))
    bkd.parts_cost = round(total_parts_cost, 2)
    bkd.total_repair_cost = round(bkd.parts_cost + float(bkd.labour_cost or 0.0), 2)
    bkd.flags.ignore_permissions = True
    bkd.save(ignore_permissions=True)
"""
    ss_as = frappe.get_doc("Server Script", ss_se_as_name)
    ss_as.script = ss_se_as_code
    ss_as.save(ignore_permissions=True)
    print(f"Updated Server Script: {ss_se_as_name}")

    # 3. Update Server Script: Stock Entry - Spare Parts Linkage on Cancel (After Cancel)
    ss_se_ac_name = "Stock Entry - Spare Parts Linkage on Cancel"
    ss_se_ac_code = """# SERVER SCRIPT: Stock Entry - Spare Parts Linkage on Cancel (After Cancel)
if doc.custom_vehicle_breakdown:
    bkd = frappe.get_doc("Vehicle Breakdown", doc.custom_vehicle_breakdown)
    
    # Query remaining submitted Material Issues
    issues = frappe.db.sql(\"\"\"
        SELECT sed.item_code, sed.qty, sed.basic_rate, sed.amount, se.name as se_name, sed.s_warehouse
        FROM `tabStock Entry Detail` sed
        JOIN `tabStock Entry` se ON sed.parent = se.name
        WHERE se.custom_vehicle_breakdown = %s
          AND se.docstatus = 1
          AND (se.custom_is_return = 0 OR se.custom_is_return IS NULL)
          AND se.stock_entry_type = 'Material Issue'
        ORDER BY se.creation ASC
    \"\"\", (doc.custom_vehicle_breakdown,), as_dict=True)

    # Query remaining submitted Returns
    returns = frappe.db.sql(\"\"\"
        SELECT sed.item_code, sed.qty, sed.basic_rate, sed.amount, se.name as se_name
        FROM `tabStock Entry Detail` sed
        JOIN `tabStock Entry` se ON sed.parent = se.name
        WHERE se.custom_vehicle_breakdown = %s
          AND se.docstatus = 1
          AND (se.custom_is_return = 1 OR se.stock_entry_type = 'Material Receipt')
        ORDER BY se.creation ASC
    \"\"\", (doc.custom_vehicle_breakdown,), as_dict=True)

    item_stats = {}
    for r in issues:
        code = r.item_code
        if code not in item_stats:
            item_stats[code] = {
                "issued_qty": 0.0,
                "issued_amount": 0.0,
                "returned_qty": 0.0,
                "returned_amount": 0.0,
                "latest_rate": float(r.basic_rate or 0.0),
                "stock_entry": r.se_name
            }
        item_stats[code]["issued_qty"] = item_stats[code]["issued_qty"] + float(r.qty or 0.0)
        item_stats[code]["issued_amount"] = item_stats[code]["issued_amount"] + float(r.amount or 0.0)
        item_stats[code]["latest_rate"] = float(r.basic_rate or 0.0)
        item_stats[code]["stock_entry"] = r.se_name

    for r in returns:
        code = r.item_code
        if code not in item_stats:
            item_stats[code] = {
                "issued_qty": 0.0,
                "issued_amount": 0.0,
                "returned_qty": 0.0,
                "returned_amount": 0.0,
                "latest_rate": float(r.basic_rate or 0.0),
                "stock_entry": r.se_name
            }
        item_stats[code]["returned_qty"] = item_stats[code]["returned_qty"] + float(r.qty or 0.0)
        item_stats[code]["returned_amount"] = item_stats[code]["returned_amount"] + float(r.amount or 0.0)

    for p in (bkd.parts_table or []):
        if p.item_code in item_stats:
            st = item_stats[p.item_code]
            p.issued_qty = st["issued_qty"]
            p.returned_qty = st["returned_qty"]
            p.net_issued_qty = max(0.0, st["issued_qty"] - st["returned_qty"])
            p.rate = st["latest_rate"]
            p.amount = max(0.0, round(st["issued_amount"] - st["returned_amount"], 2))
            p.stock_entry = st["stock_entry"]
            
            planned = float(p.planned_qty or 0.0)
            if p.net_issued_qty >= planned and planned > 0:
                p.status = "Issued"
            elif p.net_issued_qty > 0:
                p.status = "Partially Issued"
            else:
                p.status = "Planned"
        else:
            p.issued_qty = 0.0
            p.returned_qty = 0.0
            p.net_issued_qty = 0.0
            p.amount = 0.0
            p.stock_entry = None
            p.status = "Planned"

    total_parts_cost = sum(float(p.amount or 0.0) for p in (bkd.parts_table or []))
    bkd.parts_cost = round(total_parts_cost, 2)
    bkd.total_repair_cost = round(bkd.parts_cost + float(bkd.labour_cost or 0.0), 2)
    bkd.flags.ignore_permissions = True
    bkd.save(ignore_permissions=True)
"""
    ss_ac = frappe.get_doc("Server Script", ss_se_ac_name)
    ss_ac.script = ss_se_ac_code
    ss_ac.save(ignore_permissions=True)
    print(f"Updated Server Script: {ss_se_ac_name}")

    frappe.clear_cache()
    frappe.db.commit()
    print("=== BATCH 6 SERVER SCRIPTS CONFIGURED SUCCESSFULLY ===")

run()
