import frappe

def run():
    print("=== APPLYING PERMISSION CORRECTIONS ON VEHICLE BREAKDOWN ===")

    # 1. Update DocPerm on Vehicle Breakdown
    dt = frappe.get_doc("DocType", "Vehicle Breakdown")
    dt.permissions = []
    
    perms = [
        {"role": "System Manager", "read": 1, "write": 1, "create": 1, "delete": 1, "report": 1, "select": 1},
        {"role": "Fleet Manager", "read": 1, "write": 1, "create": 1, "delete": 0, "report": 1, "select": 1},
        {"role": "Workshop Supervisor", "read": 1, "write": 1, "create": 1, "delete": 0, "report": 1, "select": 1},
        {"role": "Accountant", "read": 1, "write": 0, "create": 0, "delete": 0, "report": 1, "select": 1},
        {"role": "Driver", "read": 1, "write": 0, "create": 1, "delete": 0, "report": 0, "select": 1}
    ]
    for p in perms:
        dt.append("permissions", p)
    dt.save(ignore_permissions=True)
    frappe.clear_cache(doctype="Vehicle Breakdown")
    print("Updated DocType permissions on Vehicle Breakdown (Fleet Manager delete = 0).")

    # 2. Setup Before Delete Server Script: Deletion Safeguard
    ss_del_name = "Vehicle Breakdown - Deletion Safeguard"
    ss_del_code = """# SERVER SCRIPT: Vehicle Breakdown - Deletion Safeguard (Before Delete)
user_roles = [r.role for r in frappe.db.get_all("Has Role", filters={"parent": frappe.session.user}, fields=["role"])]
if "System Manager" not in user_roles and frappe.session.user != "Administrator":
    frappe.throw("Operational breakdown records cannot be deleted. Deletion of Vehicle Breakdown records is prohibited.")
"""
    if frappe.db.exists("Server Script", ss_del_name):
        ss_del = frappe.get_doc("Server Script", ss_del_name)
        ss_del.script = ss_del_code
        ss_del.disabled = 0
        ss_del.save(ignore_permissions=True)
    else:
        frappe.get_doc({
            "doctype": "Server Script",
            "name": ss_del_name,
            "script_type": "DocType Event",
            "reference_doctype": "Vehicle Breakdown",
            "doctype_event": "Before Delete",
            "script": ss_del_code,
            "disabled": 0
        }).insert(ignore_permissions=True)
    print("Configured Server Script: Vehicle Breakdown - Deletion Safeguard (Before Delete).")

    # 3. Update Server Script: Vehicle Breakdown - Validations & Lifecycle (Before Save)
    ss_val_name = "Vehicle Breakdown - Validations & Lifecycle"
    ss_val_code = """# SERVER SCRIPT: Vehicle Breakdown - Validations & Lifecycle (Before Save)

# 1. Mandatory Vehicle & Driver Integrity
if not doc.vehicle:
    frappe.throw("Vehicle is mandatory.")
if not frappe.db.exists("Vehicle", doc.vehicle):
    frappe.throw(f"Vehicle '{doc.vehicle}' does not exist.")

if not doc.driver:
    frappe.throw("Driver is mandatory.")
if not frappe.db.exists("Driver", doc.driver):
    frappe.throw(f"Driver '{doc.driver}' does not exist.")

# 2. Mine Site Validation (if provided)
if doc.mine_site and not frappe.db.exists("Mine Site", doc.mine_site):
    frappe.throw(f"Mine Site '{doc.mine_site}' does not exist.")

# 3. Workshop Validation (if assigned)
if doc.assigned_workshop and not frappe.db.exists("Supplier", doc.assigned_workshop):
    frappe.throw(f"Workshop / Supplier '{doc.assigned_workshop}' does not exist.")

# 4. Odometer Reading Validation
last_veh_odo = frappe.db.get_value("Vehicle", doc.vehicle, "last_odometer") or 0.0
if doc.odometer_reading is not None and doc.odometer_reading != "":
    odo = float(doc.odometer_reading)
    if odo < 0:
        frappe.throw(f"Breakdown odometer reading cannot be negative ({odo} km).")
    if odo < last_veh_odo:
        frappe.throw(f"Breakdown odometer ({odo} km) cannot be lower than Vehicle's last recorded odometer ({last_veh_odo} km).")

# 5. Timestamp Validations
if doc.repair_start_datetime and doc.breakdown_datetime:
    if frappe.utils.get_datetime(doc.repair_start_datetime) < frappe.utils.get_datetime(doc.breakdown_datetime):
        frappe.throw("Repair start datetime cannot be earlier than breakdown datetime.")

if doc.repair_completion_datetime and doc.repair_start_datetime:
    if frappe.utils.get_datetime(doc.repair_completion_datetime) < frappe.utils.get_datetime(doc.repair_start_datetime):
        frappe.throw("Repair completion datetime cannot be earlier than repair start datetime.")

# 6. Test Record Quarantine Propagation
if not doc.is_test_record:
    veh_test = frappe.db.get_value("Vehicle", doc.vehicle, "is_test_record") or 0
    drv_test = frappe.db.get_value("Driver", doc.driver, "is_test_record") or 0
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
is_sys_mgr = ("System Manager" in user_roles) or (frappe.session.user == "Administrator")
is_fleet_mgr = "Fleet Manager" in user_roles
is_mgr = is_fleet_mgr or is_sys_mgr
is_sup = ("Workshop Supervisor" in user_roles) or is_mgr
is_driver_only = ("Driver" in user_roles) and not is_sup and not is_mgr
is_workshop_supervisor_only = ("Workshop Supervisor" in user_roles) and not is_mgr

# Enforce Driver Permission Boundaries
if is_driver_only:
    if not doc.is_new():
        frappe.throw("Drivers are not authorized to modify existing breakdown records once reported.")
    else:
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

# Enforce Workshop Supervisor Permission Boundaries
if is_workshop_supervisor_only:
    if doc.is_new():
        if doc.repair_status not in [None, "", "Reported"]:
            frappe.throw("Workshop Supervisors can only create breakdowns in 'Reported' status.")
        if doc.approved_by or doc.approved_on:
            frappe.throw("Workshop Supervisors cannot set approval stamps on new breakdowns.")
        if doc.closed_by or doc.closed_on or doc.get("resolution_type"):
            frappe.throw("Workshop Supervisors cannot set closure audit fields on new breakdowns.")
    else:
        old_doc = doc.get_doc_before_save()
        if old_doc:
            # A. Approval Stamps Protection
            if doc.approved_by != old_doc.get("approved_by"):
                frappe.throw("Workshop Supervisors are not authorized to modify 'approved_by'.")
            if str(doc.approved_on or "") != str(old_doc.get("approved_on") or ""):
                frappe.throw("Workshop Supervisors are not authorized to modify 'approved_on'.")

            # B. Closure Audit Fields Protection
            if doc.closed_by != old_doc.get("closed_by"):
                frappe.throw("Workshop Supervisors are not authorized to modify 'closed_by'.")
            if str(doc.closed_on or "") != str(old_doc.get("closed_on") or ""):
                frappe.throw("Workshop Supervisors are not authorized to modify 'closed_on'.")
            if doc.get("resolution_type") != old_doc.get("resolution_type"):
                frappe.throw("Workshop Supervisors are not authorized to modify 'resolution_type'.")
            if doc.get("rejection_reason") != old_doc.get("rejection_reason"):
                frappe.throw("Workshop Supervisors are not authorized to modify 'rejection_reason'.")

            # C. Parts Table Valuation & Financial Integrity
            old_parts_by_name = {p.get("name"): p for p in (old_doc.get("parts_table") or [])}
            for p in (doc.parts_table or []):
                p_name = p.get("name")
                if p_name and p_name in old_parts_by_name:
                    old_p = old_parts_by_name[p_name]
                    if p.get("stock_entry") == old_p.get("stock_entry"):
                        if float(p.get("issued_qty") or 0.0) != float(old_p.get("issued_qty") or 0.0):
                            frappe.throw(f"Workshop Supervisors cannot manually edit issued quantity for part '{p.item_code}'. Issues must occur via Stock Entry.")
                        if float(p.get("rate") or 0.0) != float(old_p.get("rate") or 0.0):
                            frappe.throw(f"Workshop Supervisors cannot manually modify valuation rate for part '{p.item_code}'.")
                        if float(p.get("amount") or 0.0) != float(old_p.get("amount") or 0.0):
                            frappe.throw(f"Workshop Supervisors cannot manually modify parts amount for part '{p.item_code}'.")

            # D. Restricted Identification Fields
            for restricted_f in ["vehicle", "driver", "mine_site", "reported_by", "breakdown_datetime", "odometer_reading"]:
                if str(doc.get(restricted_f) or "") != str(old_doc.get(restricted_f) or ""):
                    frappe.throw(f"Workshop Supervisors are not authorized to modify '{restricted_f}' on existing breakdowns.")

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
    ss_val = frappe.get_doc("Server Script", ss_val_name)
    ss_val.script = ss_val_code
    ss_val.disabled = 0
    ss_val.save(ignore_permissions=True)
    print("Updated Server Script: Vehicle Breakdown - Validations & Lifecycle with Workshop Supervisor restrictions.")
    
    frappe.clear_cache()
    print("=== PERMISSION CORRECTIONS APPLIED SUCCESSFULLY ===")

run()
