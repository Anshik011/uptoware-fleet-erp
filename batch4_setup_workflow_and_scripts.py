import frappe

def run():
    print("=== BATCH 4: CONFIGURING WORKFLOW & SERVER SCRIPTS ===")

    # 1. Setup Native Workflow: Vehicle Breakdown Lifecycle
    wf_name = "Vehicle Breakdown Lifecycle"
    
    states = [
        {"state": "Reported", "doc_status": 0, "update_field": "repair_status", "update_value": "Reported", "allow_edit": "Fleet Manager"},
        {"state": "Approved", "doc_status": 0, "update_field": "repair_status", "update_value": "Approved", "allow_edit": "Fleet Manager"},
        {"state": "In Workshop", "doc_status": 0, "update_field": "repair_status", "update_value": "In Workshop", "allow_edit": "Workshop Supervisor"},
        {"state": "Awaiting Parts", "doc_status": 0, "update_field": "repair_status", "update_value": "Awaiting Parts", "allow_edit": "Workshop Supervisor"},
        {"state": "Repaired", "doc_status": 0, "update_field": "repair_status", "update_value": "Repaired", "allow_edit": "Workshop Supervisor"},
        {"state": "Closed", "doc_status": 0, "update_field": "repair_status", "update_value": "Closed", "allow_edit": "Fleet Manager"}
    ]

    transitions = [
        # From Reported
        {"state": "Reported", "action": "Approve", "next_state": "Approved", "allowed": "Fleet Manager", "allow_self_approval": 0},
        {"state": "Reported", "action": "Reject", "next_state": "Closed", "allowed": "Fleet Manager", "allow_self_approval": 0},
        # From Approved
        {"state": "Approved", "action": "Send to Workshop", "next_state": "In Workshop", "allowed": "Workshop Supervisor", "allow_self_approval": 0},
        # From In Workshop
        {"state": "In Workshop", "action": "Request Parts", "next_state": "Awaiting Parts", "allowed": "Workshop Supervisor", "allow_self_approval": 0},
        {"state": "In Workshop", "action": "Mark Repaired", "next_state": "Repaired", "allowed": "Workshop Supervisor", "allow_self_approval": 0},
        # From Awaiting Parts
        {"state": "Awaiting Parts", "action": "Parts Received", "next_state": "In Workshop", "allowed": "Workshop Supervisor", "allow_self_approval": 0},
        {"state": "Awaiting Parts", "action": "Mark Repaired", "next_state": "Repaired", "allowed": "Workshop Supervisor", "allow_self_approval": 0},
        # From Repaired
        {"state": "Repaired", "action": "Close Breakdown", "next_state": "Closed", "allowed": "Fleet Manager", "allow_self_approval": 0}
    ]

    if frappe.db.exists("Workflow", wf_name):
        frappe.delete_doc("Workflow", wf_name, force=1)
        frappe.db.commit()

    wf_doc = frappe.get_doc({
        "doctype": "Workflow",
        "workflow_name": wf_name,
        "document_type": "Vehicle Breakdown",
        "workflow_state_field": "workflow_state",
        "is_active": 1,
        "override_status": 0,
        "states": states,
        "transitions": transitions
    })
    wf_doc.insert(ignore_permissions=True)
    print(f"Created Workflow: {wf_name}")

    # 2. Server Script: Vehicle Breakdown - Validations & Lifecycle (Before Save)
    ss_before_save_code = """
# SERVER SCRIPT: Vehicle Breakdown - Validations & Lifecycle (Before Save)

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
# Synchronize repair_status with workflow_state
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

# Prevent Driver from Approving, Transitioning, or Closing Breakdowns
if not doc.is_new() and old_status != new_status:
    if "Driver" in user_roles and not is_sup:
        frappe.throw(f"Drivers are not authorized to transition Breakdown repair status from '{old_status}' to '{new_status}'.")
    
    # Require Fleet Manager or System Manager for Approval & Closure
    if new_status in ["Approved", "Closed"] and not is_mgr:
        frappe.throw(f"Transition to '{new_status}' requires 'Fleet Manager' or 'System Manager' role.")

    # Require Workshop Supervisor, Fleet Manager or System Manager for Workshop states
    if new_status in ["In Workshop", "Awaiting Parts", "Repaired"] and not is_sup:
        frappe.throw(f"Transition to '{new_status}' requires 'Workshop Supervisor' role.")

# 8. Audit Stamping & Timestamps
now_dt = frappe.utils.now_datetime()
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
    if new_status == "Closed" and old_status != "Closed":
        doc.closed_by = frappe.session.user
        doc.closed_on = now_dt

# 9. Downtime Calculation
if doc.breakdown_datetime and doc.repair_completion_datetime:
    b_dt = frappe.utils.get_datetime(doc.breakdown_datetime)
    c_dt = frappe.utils.get_datetime(doc.repair_completion_datetime)
    if c_dt < b_dt:
        frappe.throw(f"Repair completion datetime ({c_dt}) cannot be earlier than breakdown datetime ({b_dt}).")
    diff_sec = (c_dt - b_dt).total_seconds()
    doc.downtime_hours = round(diff_sec / 3600.0, 2)
elif doc.breakdown_datetime and new_status == "Closed" and doc.closed_on:
    b_dt = frappe.utils.get_datetime(doc.breakdown_datetime)
    cl_dt = frappe.utils.get_datetime(doc.closed_on)
    if cl_dt >= b_dt:
        doc.downtime_hours = round((cl_dt - b_dt).total_seconds() / 3600.0, 2)

# 10. Cost Aggregations from Parts Table
total_parts = 0.0
for p in (doc.parts_table or []):
    if p.status == "Issued" or p.stock_entry:
        total_parts += float(p.amount or 0.0)

doc.parts_cost = round(total_parts, 2)
doc.labour_cost = round(float(doc.labour_cost or 0.0), 2)
doc.total_repair_cost = round(doc.parts_cost + doc.labour_cost, 2)
"""

    if frappe.db.exists("Server Script", "Vehicle Breakdown - Validations & Lifecycle"):
        ss1 = frappe.get_doc("Server Script", "Vehicle Breakdown - Validations & Lifecycle")
        ss1.script = ss_before_save_code
        ss1.disabled = 0
        ss1.save(ignore_permissions=True)
        print("Updated Server Script: Vehicle Breakdown - Validations & Lifecycle")
    else:
        ss1 = frappe.get_doc({
            "doctype": "Server Script",
            "name": "Vehicle Breakdown - Validations & Lifecycle",
            "script_type": "DocType Event",
            "reference_doctype": "Vehicle Breakdown",
            "doctype_event": "Before Save",
            "script": ss_before_save_code,
            "disabled": 0
        })
        ss1.insert(ignore_permissions=True)
        print("Created Server Script: Vehicle Breakdown - Validations & Lifecycle")

    # 3. Server Script: Vehicle Breakdown - Vehicle Status Integration (After Save)
    ss_after_save_code = """
# SERVER SCRIPT: Vehicle Breakdown - Vehicle Status Integration (After Save)

if not doc.vehicle:
    # Nothing to update
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
            
        # RULE 4: When Breakdown is Closed -> Safely Restore Status
        elif doc.repair_status == "Closed":
            # Check if ANY other open breakdown records exist for this vehicle
            open_bkds = frappe.get_all("Vehicle Breakdown", filters={
                "vehicle": doc.vehicle,
                "repair_status": ["in", ["Reported", "Approved", "In Workshop", "Awaiting Parts", "Repaired"]],
                "name": ["!=", doc.name]
            }, fields=["name", "repair_status"])
            
            if open_bkds:
                # Other breakdowns exist! Do NOT restore Active!
                has_workshop = any(b.repair_status in ["In Workshop", "Awaiting Parts", "Repaired"] for b in open_bkds)
                has_approved = any(b.repair_status == "Approved" for b in open_bkds)
                
                if has_workshop:
                    frappe.db.set_value("Vehicle", doc.vehicle, "vehicle_status", "Under Maintenance")
                elif has_approved:
                    frappe.db.set_value("Vehicle", doc.vehicle, "vehicle_status", "Breakdown")
                else:
                    # Only Reported breakdowns remain
                    pass
            else:
                # No other open breakdowns! Check if there is an active Mining Trip
                active_trip = frappe.db.get_value("Mining Trip", {
                    "vehicle": doc.vehicle,
                    "trip_status": ["in", ["Dispatched", "Weighbridge Confirmed"]]
                }, "name")
                
                if active_trip:
                    frappe.db.set_value("Vehicle", doc.vehicle, "vehicle_status", "On Trip")
                else:
                    frappe.db.set_value("Vehicle", doc.vehicle, "vehicle_status", "Active")
"""

    if frappe.db.exists("Server Script", "Vehicle Breakdown - Vehicle Status Integration"):
        ss2 = frappe.get_doc("Server Script", "Vehicle Breakdown - Vehicle Status Integration")
        ss2.script = ss_after_save_code
        ss2.disabled = 0
        ss2.save(ignore_permissions=True)
        print("Updated Server Script: Vehicle Breakdown - Vehicle Status Integration")
    else:
        ss2 = frappe.get_doc({
            "doctype": "Server Script",
            "name": "Vehicle Breakdown - Vehicle Status Integration",
            "script_type": "DocType Event",
            "reference_doctype": "Vehicle Breakdown",
            "doctype_event": "After Save",
            "script": ss_after_save_code,
            "disabled": 0
        })
        ss2.insert(ignore_permissions=True)
        print("Created Server Script: Vehicle Breakdown - Vehicle Status Integration")

    # 4. Server Script: Stock Entry - Spare Parts Linkage & Validation (Before Submit & On Submit)
    ss_se_before_submit = """
# SERVER SCRIPT: Stock Entry - Spare Parts Validation (Before Submit)
if doc.custom_vehicle_breakdown and doc.docstatus == 1:
    bkd_doc = frappe.get_doc("Vehicle Breakdown", doc.custom_vehicle_breakdown)
    
    # Check if duplicate stock issue is being submitted for the same breakdown
    for item in doc.items:
        for p in (bkd_doc.parts_table or []):
            if p.item_code == item.item_code and p.status == "Issued" and p.stock_entry and p.stock_entry != doc.name:
                frappe.throw(f"Spare part '{item.item_code}' has already been issued for Breakdown '{doc.custom_vehicle_breakdown}' in Stock Entry '{p.stock_entry}'. Duplicate parts issue is prohibited.")
"""

    if frappe.db.exists("Server Script", "Stock Entry - Spare Parts Validation"):
        ss3 = frappe.get_doc("Server Script", "Stock Entry - Spare Parts Validation")
        ss3.script = ss_se_before_submit
        ss3.disabled = 0
        ss3.save(ignore_permissions=True)
        print("Updated Server Script: Stock Entry - Spare Parts Validation")
    else:
        ss3 = frappe.get_doc({
            "doctype": "Server Script",
            "name": "Stock Entry - Spare Parts Validation",
            "script_type": "DocType Event",
            "reference_doctype": "Stock Entry",
            "doctype_event": "Before Submit",
            "script": ss_se_before_submit,
            "disabled": 0
        })
        ss3.insert(ignore_permissions=True)
        print("Created Server Script: Stock Entry - Spare Parts Validation")

    ss_se_on_submit = """
# SERVER SCRIPT: Stock Entry - Spare Parts Linkage (On Submit)
if doc.custom_vehicle_breakdown:
    bkd = frappe.get_doc("Vehicle Breakdown", doc.custom_vehicle_breakdown)
    
    # Update parts table on Vehicle Breakdown
    updated_items = set()
    for item in doc.items:
        matched = False
        for p in (bkd.parts_table or []):
            if p.item_code == item.item_code and p.status == "Planned" and item.item_code not in updated_items:
                p.issued_qty = float(item.qty or 0.0)
                p.rate = float(item.basic_rate or 0.0)
                p.amount = float(item.amount or (p.issued_qty * p.rate))
                p.stock_entry = doc.name
                p.status = "Issued"
                updated_items.add(item.item_code)
                matched = True
                break
        
        if not matched and item.item_code not in updated_items:
            # Append as newly issued part
            bkd.append("parts_table", {
                "item_code": item.item_code,
                "item_name": item.item_name or item.item_code,
                "stock_uom": item.uom or item.stock_uom,
                "planned_qty": float(item.qty or 0.0),
                "issued_qty": float(item.qty or 0.0),
                "warehouse": item.s_warehouse or item.t_warehouse,
                "rate": float(item.basic_rate or 0.0),
                "amount": float(item.amount or 0.0),
                "stock_entry": doc.name,
                "status": "Issued"
            })
            updated_items.add(item.item_code)

    # Recalculate costs
    total_parts = sum(float(p.amount or 0.0) for p in bkd.parts_table if p.status == "Issued")
    bkd.parts_cost = round(total_parts, 2)
    bkd.total_repair_cost = round(bkd.parts_cost + float(bkd.labour_cost or 0.0), 2)
    bkd.save(ignore_permissions=True)
"""

    if frappe.db.exists("Server Script", "Stock Entry - Spare Parts Linkage"):
        ss4 = frappe.get_doc("Server Script", "Stock Entry - Spare Parts Linkage")
        ss4.script = ss_se_on_submit
        ss4.disabled = 0
        ss4.save(ignore_permissions=True)
        print("Updated Server Script: Stock Entry - Spare Parts Linkage")
    else:
        ss4 = frappe.get_doc({
            "doctype": "Server Script",
            "name": "Stock Entry - Spare Parts Linkage",
            "script_type": "DocType Event",
            "reference_doctype": "Stock Entry",
            "doctype_event": "After Submit",
            "script": ss_se_on_submit,
            "disabled": 0
        })
        ss4.insert(ignore_permissions=True)
        print("Created Server Script: Stock Entry - Spare Parts Linkage")

    frappe.clear_cache()
    frappe.db.commit()
    print("SUCCESS: Batch 4 Workflows and Server Scripts configured.")

run()
