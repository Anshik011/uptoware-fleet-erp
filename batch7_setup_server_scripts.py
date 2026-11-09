import frappe

def setup_server_scripts():
    print("=== CONFIGURING BATCH 7 SERVER SCRIPTS ===")

    scripts = [
        # 1. Material Request Validations & Linkages
        {
            "name": "Material Request - Fleet Procurement Validation",
            "script_type": "DocType Event",
            "reference_doctype": "Material Request",
            "doctype_event": "Before Save",
            "script": """
# Auto-populate from Vehicle Breakdown if specified
if doc.custom_vehicle_breakdown:
    bkd = frappe.db.get_value("Vehicle Breakdown", doc.custom_vehicle_breakdown, ["vehicle", "mine_site", "is_test_record", "workflow_state"], as_dict=True)
    if bkd:
        if not doc.custom_vehicle:
            doc.custom_vehicle = bkd.vehicle
        if not doc.custom_mine_site:
            doc.custom_mine_site = bkd.mine_site
        if bkd.is_test_record:
            doc.custom_is_test_record = 1

# Propagate test record from vehicle
if doc.custom_vehicle and not doc.custom_is_test_record:
    if frappe.db.get_value("Vehicle", doc.custom_vehicle, "is_test_record"):
        doc.custom_is_test_record = 1

# Validation before submission
if doc.docstatus == 1:
    roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (frappe.session.user,))]
    
    # Workshop Supervisor guard
    if "Workshop Supervisor" in roles and "System Manager" not in roles and "Fleet Manager" not in roles and "Store Manager" not in roles:
        if not doc.custom_vehicle_breakdown:
            frappe.throw("Workshop Supervisor can only raise Material Requests linked to an authorized Vehicle Breakdown.")
    
    # Validate linked breakdown status
    if doc.custom_vehicle_breakdown:
        b_status = frappe.db.get_value("Vehicle Breakdown", doc.custom_vehicle_breakdown, "workflow_state")
        if b_status in ["Reported", "Rejected", "Closed"]:
            frappe.throw(f"Cannot raise Material Request against Vehicle Breakdown '{doc.custom_vehicle_breakdown}' with status '{b_status}'. Breakdown must be Approved or in Workshop.")

    # Validate items and quantities
    for it in doc.items:
        if (it.qty or 0) <= 0:
            frappe.throw(f"Item {it.item_code} must have quantity greater than 0.")
        if it.warehouse:
            wh_company = frappe.db.get_value("Warehouse", it.warehouse, "company")
            if wh_company != doc.company:
                frappe.throw(f"Warehouse {it.warehouse} does not belong to company {doc.company}.")
"""
        },

        # 2. Purchase Order Validations, Approval & Lifecycle
        {
            "name": "Purchase Order - Fleet Procurement Validation",
            "script_type": "DocType Event",
            "reference_doctype": "Purchase Order",
            "doctype_event": "Before Save",
            "script": """
# Auto-populate from linked Material Request if present
if doc.items:
    for row in doc.items:
        if row.material_request:
            mr = frappe.db.get_value("Material Request", row.material_request, 
                ["custom_vehicle_breakdown", "custom_vehicle", "custom_mine_site", "custom_procurement_type", "custom_is_test_record"], 
                as_dict=True)
            if mr:
                if not doc.custom_vehicle_breakdown and mr.custom_vehicle_breakdown:
                    doc.custom_vehicle_breakdown = mr.custom_vehicle_breakdown
                if not doc.custom_vehicle and mr.custom_vehicle:
                    doc.custom_vehicle = mr.custom_vehicle
                if not doc.custom_mine_site and mr.custom_mine_site:
                    doc.custom_mine_site = mr.custom_mine_site
                if mr.custom_procurement_type:
                    doc.custom_procurement_type = mr.custom_procurement_type
                if mr.custom_is_test_record:
                    doc.custom_is_test_record = 1
            break

# Propagate test record from supplier or vehicle
if doc.supplier and not doc.custom_is_test_record:
    if frappe.db.get_value("Supplier", doc.supplier, "custom_is_test_record"):
        doc.custom_is_test_record = 1
if doc.custom_vehicle and not doc.custom_is_test_record:
    if frappe.db.get_value("Vehicle", doc.custom_vehicle, "is_test_record"):
        doc.custom_is_test_record = 1

# Submission / Approval controls
if doc.docstatus == 1:
    roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (frappe.session.user,))]
    
    # Store Manager & Workshop Supervisor cannot submit Purchase Orders
    if ("Store Manager" in roles or "Workshop Supervisor" in roles) and "System Manager" not in roles and "Fleet Manager" not in roles:
        frappe.throw("Store Managers and Workshop Supervisors cannot approve or submit Purchase Orders. Approval is restricted to Fleet Managers.")
    
    # Supplier validation
    if not doc.supplier:
        frappe.throw("Supplier is mandatory.")
    supp_disabled = frappe.db.get_value("Supplier", doc.supplier, "disabled")
    if supp_disabled:
        frappe.throw(f"Supplier '{doc.supplier}' is disabled.")
    
    # Items and warehouse validation
    if not doc.items:
        frappe.throw("Purchase Order must contain at least one item.")
    for row in doc.items:
        if (row.qty or 0) <= 0:
            frappe.throw(f"Quantity for item '{row.item_code}' must be greater than zero.")
        if row.warehouse:
            wh_comp = frappe.db.get_value("Warehouse", row.warehouse, "company")
            if wh_comp != doc.company:
                frappe.throw(f"Warehouse '{row.warehouse}' does not belong to company '{doc.company}'.")

    # Stamp approval audit
    if not doc.custom_approved_by:
        doc.custom_approved_by = frappe.session.user
    if not doc.custom_approved_on:
        doc.custom_approved_on = frappe.utils.now_datetime()
"""
        },

        # 3. Purchase Order Cancellation Guard
        {
            "name": "Purchase Order - Fleet Cancellation Guard",
            "script_type": "DocType Event",
            "reference_doctype": "Purchase Order",
            "doctype_event": "Before Cancel",
            "script": """
roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (frappe.session.user,))]
if "System Manager" not in roles and "Fleet Manager" not in roles:
    frappe.throw("Unauthorized cancellation: Only Fleet Manager or System Manager can cancel a submitted Purchase Order.")

# Check for linked submitted Purchase Receipts
submitted_prs = frappe.db.sql(\"\"\"
    SELECT pri.parent FROM `tabPurchase Receipt Item` pri
    JOIN `tabPurchase Receipt` pr ON pri.parent = pr.name
    WHERE pri.purchase_order = %s AND pr.docstatus = 1
\"\"\", (doc.name,))
if submitted_prs:
    frappe.throw(f"Cannot cancel Purchase Order '{doc.name}' because active Purchase Receipt '{submitted_prs[0][0]}' exists. Cancel the receipt first.")

# Check for linked submitted Purchase Invoices
submitted_pis = frappe.db.sql(\"\"\"
    SELECT pii.parent FROM `tabPurchase Invoice Item` pii
    JOIN `tabPurchase Invoice` pi ON pii.parent = pi.name
    WHERE pii.purchase_order = %s AND pi.docstatus = 1
\"\"\", (doc.name,))
if submitted_pis:
    frappe.throw(f"Cannot cancel Purchase Order '{doc.name}' because active Purchase Invoice '{submitted_pis[0][0]}' exists. Cancel the invoice first.")
"""
        },

        # 4. Purchase Receipt Linkage & Role Guard
        {
            "name": "Purchase Receipt - Fleet Procurement Linkage",
            "script_type": "DocType Event",
            "reference_doctype": "Purchase Receipt",
            "doctype_event": "Before Save",
            "script": """
# Propagate from linked Purchase Order
if doc.items:
    for row in doc.items:
        if row.purchase_order:
            po = frappe.db.get_value("Purchase Order", row.purchase_order,
                ["custom_vehicle_breakdown", "custom_vehicle", "custom_mine_site", "custom_procurement_type", "custom_is_test_record"],
                as_dict=True)
            if po:
                if not doc.custom_vehicle_breakdown and po.custom_vehicle_breakdown:
                    doc.custom_vehicle_breakdown = po.custom_vehicle_breakdown
                if not doc.custom_vehicle and po.custom_vehicle:
                    doc.custom_vehicle = po.custom_vehicle
                if not doc.custom_mine_site and po.custom_mine_site:
                    doc.custom_mine_site = po.custom_mine_site
                if po.custom_procurement_type:
                    doc.custom_procurement_type = po.custom_procurement_type
                if po.custom_is_test_record:
                    doc.custom_is_test_record = 1
            break

# Propagate test record from supplier
if doc.supplier and not doc.custom_is_test_record:
    if frappe.db.get_value("Supplier", doc.supplier, "custom_is_test_record"):
        doc.custom_is_test_record = 1

if doc.docstatus == 1:
    roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (frappe.session.user,))]
    if "Workshop Supervisor" in roles and "Store Manager" not in roles and "System Manager" not in roles and "Fleet Manager" not in roles:
        frappe.throw("Workshop Supervisors are not authorized to submit Purchase Receipts.")
"""
        },

        # 5. Purchase Invoice Linkage & Role Guard
        {
            "name": "Purchase Invoice - Fleet Procurement Linkage",
            "script_type": "DocType Event",
            "reference_doctype": "Purchase Invoice",
            "doctype_event": "Before Save",
            "script": """
# Propagate from linked Purchase Order or Receipt
if doc.items:
    for row in doc.items:
        ref_po = row.purchase_order
        ref_pr = row.purchase_receipt
        po = None
        if ref_po:
            po = frappe.db.get_value("Purchase Order", ref_po,
                ["custom_vehicle_breakdown", "custom_vehicle", "custom_mine_site", "custom_procurement_type", "custom_is_test_record"],
                as_dict=True)
        elif ref_pr:
            po = frappe.db.get_value("Purchase Receipt", ref_pr,
                ["custom_vehicle_breakdown", "custom_vehicle", "custom_mine_site", "custom_procurement_type", "custom_is_test_record"],
                as_dict=True)
        if po:
            if not doc.custom_vehicle_breakdown and po.custom_vehicle_breakdown:
                doc.custom_vehicle_breakdown = po.custom_vehicle_breakdown
            if not doc.custom_vehicle and po.custom_vehicle:
                doc.custom_vehicle = po.custom_vehicle
            if not doc.custom_mine_site and po.custom_mine_site:
                doc.custom_mine_site = po.custom_mine_site
            if po.custom_procurement_type:
                doc.custom_procurement_type = po.custom_procurement_type
            if po.custom_is_test_record:
                doc.custom_is_test_record = 1
            break

# Propagate test record from supplier
if doc.supplier and not doc.custom_is_test_record:
    if frappe.db.get_value("Supplier", doc.supplier, "custom_is_test_record"):
        doc.custom_is_test_record = 1

if doc.docstatus == 1:
    roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (frappe.session.user,))]
    if "Store Manager" in roles and "Accountant" not in roles and "System Manager" not in roles:
        frappe.throw("Store Managers cannot create or submit Purchase Invoices. Financial invoicing is restricted to Accountants.")
    if "Workshop Supervisor" in roles and "Accountant" not in roles and "System Manager" not in roles:
        frappe.throw("Workshop Supervisors cannot create or submit Purchase Invoices. Financial invoicing is restricted to Accountants.")
"""
        },

        # 6. Payment Entry Test Record Propagation
        {
            "name": "Payment Entry - Procurement Test Record Propagation",
            "script_type": "DocType Event",
            "reference_doctype": "Payment Entry",
            "doctype_event": "Before Save",
            "script": """
if doc.references:
    for ref in doc.references:
        if ref.reference_doctype == "Purchase Invoice":
            is_test = frappe.db.get_value("Purchase Invoice", ref.reference_name, "custom_is_test_record")
            if is_test:
                doc.custom_is_test_record = 1
                break
"""
        },

        # 7. Reorder Integration API
        {
            "name": "Procurement - Create Material Request for Reorder",
            "script_type": "API",
            "reference_doctype": None,
            "doctype_event": "Before Insert",
            "api_method": "create_reorder_material_request",
            "script": """
item_code = frappe.form_dict.get("item_code")
warehouse = frappe.form_dict.get("warehouse")
requested_qty = frappe.form_dict.get("qty")

if not item_code or not warehouse:
    frappe.response["status"] = "error"
    frappe.response["message"] = "item_code and warehouse are mandatory"
else:
    # Check item exists
    if not frappe.db.exists("Item", item_code):
        frappe.response["status"] = "error"
        frappe.response["message"] = f"Item {item_code} does not exist"
    else:
        # Check reorder settings from standard Item Reorder
        reorder_info = frappe.db.sql(\"\"\"
            SELECT warehouse_reorder_level, warehouse_reorder_qty 
            FROM `tabItem Reorder` 
            WHERE parent = %s AND warehouse = %s
        \"\"\", (item_code, warehouse), as_dict=True)

        qty_to_order = float(requested_qty) if requested_qty else 0.0
        if not qty_to_order:
            if reorder_info and reorder_info[0].warehouse_reorder_qty:
                qty_to_order = float(reorder_info[0].warehouse_reorder_qty)
            else:
                qty_to_order = 10.0

        item_doc = frappe.get_doc("Item", item_code)
        company = frappe.db.get_value("Warehouse", warehouse, "company") or "Uptoware"

        mr = frappe.get_doc({
            "doctype": "Material Request",
            "material_request_type": "Purchase",
            "company": company,
            "schedule_date": frappe.utils.today(),
            "custom_procurement_type": "Spare Parts Replenishment",
            "custom_is_test_record": item_doc.custom_is_test_record or 0,
            "items": [{
                "item_code": item_code,
                "qty": qty_to_order,
                "warehouse": warehouse,
                "schedule_date": frappe.utils.today(),
                "uom": item_doc.stock_uom
            }]
        }).insert(ignore_permissions=True)

        frappe.response["status"] = "success"
        frappe.response["material_request"] = mr.name
        frappe.response["qty"] = qty_to_order
"""
        }
    ]

    for s_data in scripts:
        name = s_data["name"]
        if frappe.db.exists("Server Script", name):
            sc = frappe.get_doc("Server Script", name)
            sc.script = s_data["script"]
            sc.disabled = 0
            sc.script_type = s_data.get("script_type")
            sc.reference_doctype = s_data.get("reference_doctype")
            sc.doctype_event = s_data.get("doctype_event")
            if s_data.get("api_method"):
                sc.api_method = s_data.get("api_method")
            sc.save(ignore_permissions=True)
            print(f"Updated Server Script: {name}")
        else:
            doc_data = {
                "doctype": "Server Script",
                "name": name,
                "script_type": s_data["script_type"],
                "reference_doctype": s_data["reference_doctype"],
                "doctype_event": s_data["doctype_event"],
                "script": s_data["script"],
                "disabled": 0
            }
            if s_data.get("api_method"):
                doc_data["api_method"] = s_data.get("api_method")
            sc = frappe.get_doc(doc_data).insert(ignore_permissions=True)
            print(f"Created Server Script: {name}")

    frappe.db.commit()
    print("All Batch 7 Server Scripts configured successfully.")

if __name__ == '__main__':
    setup_server_scripts()
