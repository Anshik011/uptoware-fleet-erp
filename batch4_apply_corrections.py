import frappe

def run():
    print("=== BATCH 4: APPLYING TECHNICAL AUDIT CORRECTIONS ===")

    # -------------------------------------------------------------------------
    # 1. Update Vehicle Breakdown DocType: Add resolution_type & rejection_reason
    # -------------------------------------------------------------------------
    dt_name = "Vehicle Breakdown"
    dt = frappe.get_doc("DocType", dt_name)

    existing_fieldnames = [f.fieldname for f in dt.fields]
    
    # Add resolution_type if missing
    if "resolution_type" not in existing_fieldnames:
        dt.append("fields", {
            "fieldname": "resolution_type",
            "label": "Resolution Type",
            "fieldtype": "Select",
            "options": "\nRepaired\nRejected",
            "read_only": 1,
            "in_list_view": 1,
            "in_standard_filter": 1
        })
        print("Added 'resolution_type' to Vehicle Breakdown")

    # Add rejection_reason if missing
    if "rejection_reason" not in existing_fieldnames:
        dt.append("fields", {
            "fieldname": "rejection_reason",
            "label": "Rejection Reason",
            "fieldtype": "Small Text"
        })
        print("Added 'rejection_reason' to Vehicle Breakdown")

    # Update DocPerm on Vehicle Breakdown to ensure strict role separation
    main_permissions = [
        {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1, "select": 1},
        {"role": "Fleet Manager", "read": 1, "write": 1, "create": 1, "delete": 0, "report": 1, "select": 1},
        {"role": "Workshop Supervisor", "read": 1, "write": 1, "create": 1, "delete": 0, "report": 1, "select": 1},
        {"role": "Accountant", "read": 1, "write": 0, "create": 0, "delete": 0, "report": 1, "select": 1},
        {"role": "Driver", "read": 1, "write": 0, "create": 1, "delete": 0, "report": 0, "select": 1}
    ]
    dt.permissions = []
    for p in main_permissions:
        dt.append("permissions", p)

    dt.save(ignore_permissions=True)
    print("Updated DocType: Vehicle Breakdown with fields and permissions")

    # -------------------------------------------------------------------------
    # 2. Update Vehicle Breakdown Part: Ensure Partially Issued is in options
    # -------------------------------------------------------------------------
    child_dt = frappe.get_doc("DocType", "Vehicle Breakdown Part")
    for f in child_dt.fields:
        if f.fieldname == "status":
            f.options = "Planned\nPartially Issued\nIssued"
    child_dt.save(ignore_permissions=True)
    print("Updated Child DocType: Vehicle Breakdown Part status options")

    # -------------------------------------------------------------------------
    # 3. Add Custom Field custom_vehicle on Asset Maintenance Log
    # -------------------------------------------------------------------------
    cf_aml_name = "Asset Maintenance Log-custom_vehicle"
    if not frappe.db.exists("Custom Field", cf_aml_name):
        frappe.get_doc({
            "doctype": "Custom Field",
            "name": cf_aml_name,
            "dt": "Asset Maintenance Log",
            "fieldname": "custom_vehicle",
            "label": "Vehicle",
            "fieldtype": "Link",
            "options": "Vehicle",
            "insert_after": "task",
            "in_list_view": 1,
            "in_standard_filter": 1
        }).insert(ignore_permissions=True)
        print("Created Custom Field on Asset Maintenance Log: custom_vehicle")

    # -------------------------------------------------------------------------
    # 4. Update Server Script: Vehicle Breakdown - Validations & Lifecycle
    # -------------------------------------------------------------------------
    ss_before_save_code = """# SERVER SCRIPT: Vehicle Breakdown - Validations & Lifecycle (Before Save)

# 1. Vehicle Validation
if not doc.vehicle:
    frappe.throw("Vehicle is mandatory for reporting a breakdown.")

if not frappe.db.exists("Vehicle", doc.vehicle):
    frappe.throw(f"Vehicle '{doc.vehicle}' does not exist.")

# 2. Driver Validation
if doc.driver and not frappe.db.exists("Driver", doc.driver):
    frappe.throw(f"Driver '{doc.driver}' does not exist.")

# 3. Mine Site Validation
if doc.mine_site and not frappe.db.exists("Mine Site", doc.mine_site):
    frappe.throw(f"Mine Site '{doc.mine_site}' does not exist.")

# 4. Related Trip Validation
if doc.related_trip:
    if not frappe.db.exists("Mining Trip", doc.related_trip):
        frappe.throw(f"Related Mining Trip '{doc.related_trip}' does not exist.")
    trip_veh = frappe.db.get_value("Mining Trip", doc.related_trip, "vehicle")
    if trip_veh and trip_veh != doc.vehicle:
        frappe.throw(f"Related Mining Trip '{doc.related_trip}' belongs to Vehicle '{trip_veh}', not '{doc.vehicle}'.")

# 5. Odometer Reading Validation
if doc.odometer_reading:
    if int(doc.odometer_reading) < 0:
        frappe.throw("Odometer reading cannot be negative.")
    curr_veh_odo = frappe.db.get_value("Vehicle", doc.vehicle, "last_odometer") or 0
    if int(doc.odometer_reading) < curr_veh_odo:
        frappe.throw(f"Breakdown odometer ({doc.odometer_reading} KM) cannot be lower than vehicle confirmed odometer ({curr_veh_odo} KM).")

# 6. Test Record Propagation
if not doc.is_test_record:
    veh_test = frappe.db.get_value("Vehicle", doc.vehicle, "is_test_record") or 0
    drv_test = (frappe.db.get_value("Driver", doc.driver, "is_test_record") or 0) if doc.driver else 0
    site_test = (frappe.db.get_value("Mine Site", doc.mine_site, "is_test_record") or 0) if doc.mine_site else 0
    if veh_test or drv_test or site_test:
        doc.is_test_record = 1

# 7. Workflow Security & Status Sync
if doc.workflow_state:
    doc.repair_status = doc.workflow_state
elif not doc.repair_status:
    doc.repair_status = "Reported"

old_status = None
if not doc.is_new() and doc.get_doc_before_save():
    old_status = doc.get_doc_before_save().get("repair_status")

new_status = doc.repair_status

user_roles = [r.role for r in frappe.db.get_all("Has Role", filters={"parent": frappe.session.user}, fields=["role"])]
is_mgr = ("Fleet Manager" in user_roles) or ("System Manager" in user_roles)
is_sup = ("Workshop Supervisor" in user_roles) or is_mgr
is_driver_only = ("Driver" in user_roles) and not is_sup and not is_mgr

# Enforce Driver Permission Boundaries
if is_driver_only:
    if not doc.is_new():
        frappe.throw("Drivers are not authorized to modify existing breakdown records once reported.")
    else:
        # On creation, driver cannot set repair details, workshop, status != Reported, or costs
        if doc.repair_status != "Reported":
            frappe.throw("Drivers can only create breakdowns in 'Reported' status.")
        if doc.assigned_workshop:
            frappe.throw("Drivers cannot assign workshops.")
        if doc.repair_start_datetime or doc.repair_completion_datetime:
            frappe.throw("Drivers cannot set repair start or completion timestamps.")
        if doc.parts_table and len(doc.parts_table) > 0:
            frappe.throw("Drivers cannot plan or issue spare parts.")
        if float(doc.labour_cost or 0.0) > 0 or float(doc.parts_cost or 0.0) > 0:
            frappe.throw("Drivers cannot record repair costs.")

# Enforce Workflow Transition Permissions
if not doc.is_new() and old_status != new_status:
    if new_status in ["Approved", "Closed"] and not is_mgr:
        frappe.throw(f"Transition to '{new_status}' requires 'Fleet Manager' or 'System Manager' role.")
    if new_status in ["In Workshop", "Awaiting Parts", "Repaired"] and not is_sup:
        frappe.throw(f"Transition to '{new_status}' requires 'Workshop Supervisor' role.")

# 8. Handling Rejections vs Genuine Repairs
now_dt = frappe.utils.now_datetime()

# Detect Rejection: Transitioned directly from Reported to Closed
is_rejection = (old_status == "Reported" and new_status == "Closed") or (doc.get("resolution_type") == "Rejected")

if is_rejection:
    doc.resolution_type = "Rejected"
    # Never stamp repair start or completion datetime for rejected breakdowns
    doc.repair_start_datetime = None
    doc.repair_completion_datetime = None
    # Never generate downtime hours for rejected breakdowns
    doc.downtime_hours = 0.0
    # Never generate parts or labour cost for rejected breakdowns
    doc.parts_cost = 0.0
    doc.labour_cost = 0.0
    doc.total_repair_cost = 0.0
    doc.closed_by = frappe.session.user
    doc.closed_on = now_dt
else:
    # Normal lifecycle
    if new_status == "Approved" and old_status != "Approved":
        doc.approved_by = frappe.session.user
        doc.approved_on = now_dt
        if not doc.repair_start_datetime:
            doc.repair_start_datetime = now_dt

    if new_status == "In Workshop" and not doc.repair_start_datetime:
        doc.repair_start_datetime = now_dt

    if new_status in ["Repaired", "Closed"]:
        if not doc.repair_completion_datetime:
            doc.repair_completion_datetime = now_dt
        if new_status == "Closed":
            doc.resolution_type = "Repaired"
            if old_status != "Closed":
                doc.closed_by = frappe.session.user
                doc.closed_on = now_dt

    # 9. Downtime Calculation for Genuine Repairs
    if doc.breakdown_datetime and doc.repair_completion_datetime:
        b_dt = frappe.utils.get_datetime(doc.breakdown_datetime)
        c_dt = frappe.utils.get_datetime(doc.repair_completion_datetime)
        if c_dt < b_dt:
            frappe.throw(f"Repair completion datetime ({c_dt}) cannot be earlier than breakdown datetime ({b_dt}).")
        diff_sec = (c_dt - b_dt).total_seconds()
        doc.downtime_hours = round(diff_sec / 3600.0, 2)

    # 10. Cost Aggregations from Parts Table (only for genuine repairs)
    total_parts = 0.0
    for p in (doc.parts_table or []):
        if p.status in ["Issued", "Partially Issued"] or p.stock_entry:
            total_parts += float(p.amount or 0.0)

    doc.parts_cost = round(total_parts, 2)
    doc.labour_cost = round(float(doc.labour_cost or 0.0), 2)
    doc.total_repair_cost = round(doc.parts_cost + doc.labour_cost, 2)
"""

    ss1 = frappe.get_doc("Server Script", "Vehicle Breakdown - Validations & Lifecycle")
    ss1.script = ss_before_save_code
    ss1.disabled = 0
    ss1.save(ignore_permissions=True)
    print("Updated Server Script: Vehicle Breakdown - Validations & Lifecycle")

    # -------------------------------------------------------------------------
    # 5. Update Server Script: Vehicle Breakdown - Vehicle Status Integration
    # -------------------------------------------------------------------------
    ss_after_save_code = """# SERVER SCRIPT: Vehicle Breakdown - Vehicle Status Integration (After Save)

if not doc.vehicle:
    pass
else:
    curr_veh_status = frappe.db.get_value("Vehicle", doc.vehicle, "vehicle_status")
    
    # RULE 1: NEVER overwrite 'Out of Service' under any circumstance!
    if curr_veh_status != "Out of Service":
        
        # RULE 2: When Breakdown is Approved -> Set Vehicle Status to 'Breakdown'
        if doc.repair_status == "Approved":
            frappe.db.set_value("Vehicle", doc.vehicle, "vehicle_status", "Breakdown")
            
        # RULE 3: When in Workshop or Awaiting Parts -> Set Vehicle Status to 'Under Maintenance'
        elif doc.repair_status in ["In Workshop", "Awaiting Parts", "Repaired"]:
            frappe.db.set_value("Vehicle", doc.vehicle, "vehicle_status", "Under Maintenance")
            
        # RULE 4: When Breakdown is Closed -> Safely Restore Status with Multi-Check Safeguards
        elif doc.repair_status == "Closed":
            # If rejected, it never progressed past Reported, so do not alter vehicle status
            if doc.get("resolution_type") == "Rejected":
                pass
            else:
                # SAFEGUARD A: Check other open breakdowns on this vehicle
                open_bkds = frappe.get_all("Vehicle Breakdown", filters={
                    "vehicle": doc.vehicle,
                    "repair_status": ["in", ["Reported", "Approved", "In Workshop", "Awaiting Parts", "Repaired"]],
                    "name": ["!=", doc.name]
                }, fields=["name", "repair_status", "resolution_type"])
                
                # Filter out any that might have been rejected
                active_open_bkds = [b for b in open_bkds if b.get("resolution_type") != "Rejected"]
                
                if active_open_bkds:
                    has_workshop = any(b.repair_status in ["In Workshop", "Awaiting Parts", "Repaired"] for b in active_open_bkds)
                    has_approved = any(b.repair_status == "Approved" for b in active_open_bkds)
                    
                    if has_workshop:
                        frappe.db.set_value("Vehicle", doc.vehicle, "vehicle_status", "Under Maintenance")
                    elif has_approved:
                        frappe.db.set_value("Vehicle", doc.vehicle, "vehicle_status", "Breakdown")
                    else:
                        pass
                else:
                    # SAFEGUARD B: Check if active scheduled maintenance operation exists (Asset Maintenance Log)
                    active_maint = False
                    if frappe.db.exists("Custom Field", "Asset Maintenance Log-custom_vehicle"):
                        active_maint = frappe.db.get_value("Asset Maintenance Log", {
                            "custom_vehicle": doc.vehicle,
                            "maintenance_status": ["in", ["Planned", "Overdue"]]
                        }, "name")
                        
                    if active_maint:
                        frappe.db.set_value("Vehicle", doc.vehicle, "vehicle_status", "Under Maintenance")
                    else:
                        # SAFEGUARD C: Check if an active Mining Trip exists on this vehicle
                        active_trip = frappe.db.get_value("Mining Trip", {
                            "vehicle": doc.vehicle,
                            "trip_status": ["in", ["Dispatched", "Weighbridge Confirmed"]]
                        }, "name")
                        
                        if active_trip:
                            frappe.db.set_value("Vehicle", doc.vehicle, "vehicle_status", "On Trip")
                        else:
                            # SAFEGUARD D: No conflicting operation exists! Safe to restore Active
                            frappe.db.set_value("Vehicle", doc.vehicle, "vehicle_status", "Active")
"""

    ss2 = frappe.get_doc("Server Script", "Vehicle Breakdown - Vehicle Status Integration")
    ss2.script = ss_after_save_code
    ss2.disabled = 0
    ss2.save(ignore_permissions=True)
    print("Updated Server Script: Vehicle Breakdown - Vehicle Status Integration")

    # -------------------------------------------------------------------------
    # 6. Update Server Script: Stock Entry - Spare Parts Validation (Before Submit)
    # -------------------------------------------------------------------------
    ss_se_before_submit = """# SERVER SCRIPT: Stock Entry - Spare Parts Validation (Before Submit)
if doc.custom_vehicle_breakdown and doc.docstatus == 1:
    if not frappe.db.exists("Vehicle Breakdown", doc.custom_vehicle_breakdown):
        frappe.throw(f"Vehicle Breakdown '{doc.custom_vehicle_breakdown}' does not exist.")
        
    bkd = frappe.get_doc("Vehicle Breakdown", doc.custom_vehicle_breakdown)
    
    # 1. Eligibility Check: Breakdown must be active in workshop
    if bkd.repair_status in ["Reported", "Repaired", "Closed"]:
        frappe.throw(f"Parts cannot be issued against Breakdown '{doc.custom_vehicle_breakdown}' with status '{bkd.repair_status}'. Only breakdowns in 'Approved', 'In Workshop', or 'Awaiting Parts' are eligible for parts issuance.")
        
    if bkd.get("resolution_type") == "Rejected":
        frappe.throw(f"Parts cannot be issued against rejected Breakdown '{doc.custom_vehicle_breakdown}'.")

    # 2. Validate Items, Warehouses, and Quantities
    for item in doc.items:
        if not frappe.db.exists("Item", item.item_code):
            frappe.throw(f"Item '{item.item_code}' does not exist.")
            
        wh = item.s_warehouse or item.t_warehouse
        if not wh or not frappe.db.exists("Warehouse", wh):
            frappe.throw(f"Valid warehouse is required for part '{item.item_code}'. Got '{wh}'.")
            
        # Check planned parts in breakdown
        planned_parts = [p for p in (bkd.parts_table or []) if p.item_code == item.item_code]
        if not planned_parts:
            frappe.throw(f"Spare part '{item.item_code}' is not listed in planned parts for Breakdown '{doc.custom_vehicle_breakdown}'.")
            
        total_planned_qty = sum(float(p.planned_qty or 0.0) for p in planned_parts)
        
        # Calculate cumulative already-issued qty from SUBMITTED Stock Entries
        existing_issues = frappe.db.sql(\"\"\"
            SELECT SUM(sed.qty)
            FROM `tabStock Entry Detail` sed
            JOIN `tabStock Entry` se ON sed.parent = se.name
            WHERE se.custom_vehicle_breakdown = %s
              AND se.docstatus = 1
              AND se.name != %s
              AND sed.item_code = %s
        \"\"\", (doc.custom_vehicle_breakdown, doc.name, item.item_code))[0][0] or 0.0
        
        already_issued = float(existing_issues)
        current_issue = float(item.qty or 0.0)
        
        if (already_issued + current_issue) > total_planned_qty:
            frappe.throw(f"Total issued quantity ({already_issued + current_issue}) for part '{item.item_code}' cannot exceed planned quantity ({total_planned_qty}) on Breakdown '{doc.custom_vehicle_breakdown}'.")
"""

    ss3 = frappe.get_doc("Server Script", "Stock Entry - Spare Parts Validation")
    ss3.script = ss_se_before_submit
    ss3.disabled = 0
    ss3.save(ignore_permissions=True)
    print("Updated Server Script: Stock Entry - Spare Parts Validation")

    # -------------------------------------------------------------------------
    # 7. Update Server Script: Stock Entry - Spare Parts Linkage (After Submit)
    # -------------------------------------------------------------------------
    ss_se_on_submit = """# SERVER SCRIPT: Stock Entry - Spare Parts Linkage (After Submit)
if doc.custom_vehicle_breakdown and doc.docstatus == 1:
    bkd = frappe.get_doc("Vehicle Breakdown", doc.custom_vehicle_breakdown)
    
    # Query all submitted stock entries for this breakdown to compute true cumulative state
    submitted_entries = frappe.db.sql(\"\"\"
        SELECT sed.item_code, sed.qty, sed.basic_rate, sed.amount, se.name as se_name, sed.s_warehouse
        FROM `tabStock Entry Detail` sed
        JOIN `tabStock Entry` se ON sed.parent = se.name
        WHERE se.custom_vehicle_breakdown = %s
          AND se.docstatus = 1
        ORDER BY se.creation ASC
    \"\"\", (doc.custom_vehicle_breakdown,), as_dict=True)
    
    item_issued_data = {}
    for se_row in submitted_entries:
        code = se_row.item_code
        if code not in item_issued_data:
            item_issued_data[code] = {
                "qty": 0.0,
                "amount": 0.0,
                "latest_rate": float(se_row.basic_rate or 0.0),
                "stock_entries": set(),
                "warehouse": se_row.s_warehouse
            }
        curr_d = item_issued_data[code]
        curr_d["qty"] = curr_d["qty"] + float(se_row.qty or 0.0)
        curr_d["amount"] = curr_d["amount"] + float(se_row.amount or 0.0)
        curr_d["latest_rate"] = float(se_row.basic_rate or 0.0)
        curr_d["stock_entries"].add(se_row.se_name)
        
    for p in (bkd.parts_table or []):
        if p.item_code in item_issued_data:
            data = item_issued_data[p.item_code]
            p.issued_qty = data["qty"]
            p.rate = data["latest_rate"]
            p.amount = round(data["amount"], 2)
            p.stock_entry = sorted(list(data["stock_entries"]))[-1]
            if p.issued_qty >= float(p.planned_qty or 0.0):
                p.status = "Issued"
            elif p.issued_qty > 0:
                p.status = "Partially Issued"
                
    total_parts_cost = sum(data["amount"] for data in item_issued_data.values())
    bkd.parts_cost = round(total_parts_cost, 2)
    bkd.total_repair_cost = round(bkd.parts_cost + float(bkd.labour_cost or 0.0), 2)
    bkd.flags.ignore_permissions = True
    bkd.save(ignore_permissions=True)
"""

    ss4 = frappe.get_doc("Server Script", "Stock Entry - Spare Parts Linkage")
    ss4.script = ss_se_on_submit
    ss4.disabled = 0
    ss4.save(ignore_permissions=True)
    print("Updated Server Script: Stock Entry - Spare Parts Linkage")

    # -------------------------------------------------------------------------
    # 8. Server Script: Stock Entry - Spare Parts Linkage Reversal (After Cancel)
    # -------------------------------------------------------------------------
    ss_se_on_cancel = """# SERVER SCRIPT: Stock Entry - Spare Parts Linkage Reversal (After Cancel)
if doc.custom_vehicle_breakdown:
    bkd = frappe.get_doc("Vehicle Breakdown", doc.custom_vehicle_breakdown)
    
    # Query remaining submitted stock entries
    submitted_entries = frappe.db.sql(\"\"\"
        SELECT sed.item_code, sed.qty, sed.basic_rate, sed.amount, se.name as se_name
        FROM `tabStock Entry Detail` sed
        JOIN `tabStock Entry` se ON sed.parent = se.name
        WHERE se.custom_vehicle_breakdown = %s
          AND se.docstatus = 1
        ORDER BY se.creation ASC
    \"\"\", (doc.custom_vehicle_breakdown,), as_dict=True)
    
    item_issued_data = {}
    for se_row in submitted_entries:
        code = se_row.item_code
        if code not in item_issued_data:
            item_issued_data[code] = {
                "qty": 0.0,
                "amount": 0.0,
                "latest_rate": float(se_row.basic_rate or 0.0),
                "stock_entries": set()
            }
        curr_d = item_issued_data[code]
        curr_d["qty"] = curr_d["qty"] + float(se_row.qty or 0.0)
        curr_d["amount"] = curr_d["amount"] + float(se_row.amount or 0.0)
        curr_d["latest_rate"] = float(se_row.basic_rate or 0.0)
        curr_d["stock_entries"].add(se_row.se_name)
        
    for p in (bkd.parts_table or []):
        if p.item_code in item_issued_data:
            data = item_issued_data[p.item_code]
            p.issued_qty = data["qty"]
            p.rate = data["latest_rate"]
            p.amount = round(data["amount"], 2)
            p.stock_entry = sorted(list(data["stock_entries"]))[-1] if data["stock_entries"] else None
            p.status = "Issued" if p.issued_qty >= float(p.planned_qty or 0.0) else "Partially Issued"
        else:
            p.issued_qty = 0.0
            p.amount = 0.0
            p.stock_entry = None
            p.status = "Planned"
            
    total_parts_cost = sum(data["amount"] for data in item_issued_data.values()) if item_issued_data else 0.0
    bkd.parts_cost = round(total_parts_cost, 2)
    bkd.total_repair_cost = round(bkd.parts_cost + float(bkd.labour_cost or 0.0), 2)
    bkd.flags.ignore_permissions = True
    bkd.save(ignore_permissions=True)
"""

    if frappe.db.exists("Server Script", "Stock Entry - Spare Parts Linkage on Cancel"):
        ss5 = frappe.get_doc("Server Script", "Stock Entry - Spare Parts Linkage on Cancel")
        ss5.script = ss_se_on_cancel
        ss5.disabled = 0
        ss5.save(ignore_permissions=True)
        print("Updated Server Script: Stock Entry - Spare Parts Linkage on Cancel")
    else:
        ss5 = frappe.get_doc({
            "doctype": "Server Script",
            "name": "Stock Entry - Spare Parts Linkage on Cancel",
            "script_type": "DocType Event",
            "reference_doctype": "Stock Entry",
            "doctype_event": "After Cancel",
            "script": ss_se_on_cancel,
            "disabled": 0
        })
        ss5.insert(ignore_permissions=True)
        print("Created Server Script: Stock Entry - Spare Parts Linkage on Cancel")

    # -------------------------------------------------------------------------
    # 9. Update Reports to reflect resolution_type
    # -------------------------------------------------------------------------
    rep_reg = frappe.get_doc("Report", "Vehicle Breakdown Register")
    rep_reg.query = """SELECT
    vb.name AS "Breakdown ID:Link/Vehicle Breakdown:140",
    vb.breakdown_datetime AS "Date/Time:Datetime:140",
    vb.vehicle AS "Vehicle:Link/Vehicle:120",
    vb.driver AS "Driver:Link/Driver:130",
    vb.mine_site AS "Mine Site:Link/Mine Site:140",
    vb.breakdown_type AS "Type:Data:110",
    vb.severity AS "Severity:Data:90",
    IF(vb.repair_status = 'Closed' AND vb.resolution_type = 'Rejected', 'Closed (Rejected)', vb.repair_status) AS "Repair Status:Data:140",
    vb.resolution_type AS "Resolution:Data:100",
    vb.assigned_workshop AS "Workshop/Supplier:Link/Supplier:150",
    vb.downtime_hours AS "Downtime (Hrs):Float:120",
    vb.parts_cost AS "Parts Cost:Currency:110",
    vb.labour_cost AS "Labour Cost:Currency:110",
    vb.total_repair_cost AS "Total Cost:Currency:120"
FROM `tabVehicle Breakdown` vb
WHERE vb.is_test_record = 0
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR vb.breakdown_datetime >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR vb.breakdown_datetime <= %(to_date)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR vb.vehicle = %(vehicle)s)
  AND (%(breakdown_type)s IS NULL OR %(breakdown_type)s = '' OR vb.breakdown_type = %(breakdown_type)s)
  AND (%(repair_status)s IS NULL OR %(repair_status)s = '' OR vb.repair_status = %(repair_status)s)
ORDER BY vb.breakdown_datetime DESC"""
    rep_reg.save(ignore_permissions=True)

    rep_hist = frappe.get_doc("Report", "Vehicle Maintenance History")
    rep_hist.query = """SELECT
    vb.breakdown_datetime AS "Breakdown Date:Datetime:140",
    vb.name AS "Breakdown ID:Link/Vehicle Breakdown:140",
    vb.vehicle AS "Vehicle:Link/Vehicle:120",
    vb.breakdown_type AS "Breakdown Type:Data:120",
    vb.severity AS "Severity:Data:90",
    IF(vb.repair_status = 'Closed' AND vb.resolution_type = 'Rejected', 'Rejected', vb.repair_status) AS "Status:Data:110",
    vb.resolution_type AS "Resolution:Data:100",
    vb.downtime_hours AS "Downtime (Hrs):Float:110",
    IFNULL((SELECT GROUP_CONCAT(CONCAT(p.item_code, ' (x', p.issued_qty, ')') SEPARATOR ', ') FROM `tabVehicle Breakdown Part` p WHERE p.parent = vb.name AND p.status IN ('Issued', 'Partially Issued')), 'None') AS "Parts Consumed:Data:200",
    vb.total_repair_cost AS "Repair Cost:Currency:120",
    vb.assigned_workshop AS "Workshop / Supplier:Link/Supplier:150"
FROM `tabVehicle Breakdown` vb
WHERE vb.is_test_record = 0
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR vb.breakdown_datetime >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR vb.breakdown_datetime <= %(to_date)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR vb.vehicle = %(vehicle)s)
  AND (%(breakdown_type)s IS NULL OR %(breakdown_type)s = '' OR vb.breakdown_type = %(breakdown_type)s)
  AND (%(repair_status)s IS NULL OR %(repair_status)s = '' OR vb.repair_status = %(repair_status)s)
ORDER BY vb.breakdown_datetime DESC"""
    rep_hist.save(ignore_permissions=True)
    print("Updated Reports: Vehicle Breakdown Register and Vehicle Maintenance History")

    frappe.clear_cache()
    frappe.db.commit()
    print("=== BATCH 4 CORRECTIONS APPLIED SUCCESSFULLY ===")

run()
