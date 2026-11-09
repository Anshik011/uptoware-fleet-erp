import frappe

def apply_hardening():
    frappe.init("frontend")
    frappe.connect()

    print("======================================================================")
    print("      UPTOWARE FLEET ERP - APPLYING BATCH 12 APPROVAL HARDENING       ")
    print("======================================================================\n")

    # -------------------------------------------------------------------------
    # 1. Update Fuel Log - Validations & Efficiency
    # -------------------------------------------------------------------------
    fl_ss = frappe.get_doc("Server Script", "Fuel Log - Validations & Efficiency")
    fl_code = """# 1. Basic field presence and value validations
if not doc.vehicle:
    frappe.throw("Vehicle is required for Fuel Log.")

qty = float(doc.quantity_litres or 0.0)
if qty <= 0:
    frappe.throw("Fuel Quantity must be greater than zero. Invalid or zero quantity cannot be logged.")

rate = float(doc.rate_per_litre or 0.0)
if rate < 0:
    frappe.throw("Rate per Litre cannot be negative.")

# Ensure total fuel cost matches quantity * rate
doc.total_fuel_cost = round(qty * rate, 2)

if doc.odometer_reading_km is None or doc.odometer_reading_km == "":
    frappe.throw("Odometer Reading (KM) is required.")

odo = int(doc.odometer_reading_km)
if odo < 0:
    frappe.throw("Fuel odometer reading cannot be negative.")

# 2. Test Record Tagging & Isolation Propagation
if not doc.is_test_record:
    is_v_test = frappe.db.get_value("Vehicle", doc.vehicle, "is_test_record") if doc.vehicle else 0
    is_d_test = frappe.db.get_value("Driver", doc.driver, "is_test_record") if doc.driver else 0
    is_s_test = frappe.db.get_value("Mine Site", doc.mine_site, "is_test_record") if doc.mine_site else 0
    if is_v_test or is_d_test or is_s_test:
        doc.is_test_record = 1

# 3. Workflow & Approval Status Synchronization Guard
is_admin_or_sm = (frappe.session.user == "Administrator" or bool(frappe.db.exists("Has Role", {"parent": frappe.session.user, "role": "System Manager"})))
has_fleet_mgr_role = bool(frappe.db.exists("Has Role", {"parent": frappe.session.user, "role": "Fleet Manager"}))

old_status = None
if doc.get_doc_before_save():
    old_status = doc.get_doc_before_save().get("approval_status")
    if doc.approval_status != old_status:
        # Prevent direct editing of approval_status bypassing workflow transitions
        if doc.workflow_state != doc.approval_status:
            frappe.throw(f"Direct editing of Approval Status is prohibited. Status changes must be performed through authorized Workflow transitions. (Attempted: '{doc.approval_status}', Current Workflow: '{doc.workflow_state}')")

# 4. Approval Transition Security (Role Check, Self-Approval Prevention, Audit Stamping)
if doc.approval_status == "Approved":
    is_transition_to_approved = (not doc.get_doc_before_save()) or (old_status != "Approved")
    
    if is_transition_to_approved:
        # Check role permission
        if not is_admin_or_sm and not has_fleet_mgr_role:
            frappe.throw("Unauthorized: Only Fleet Managers and System Managers are authorized to approve Fuel Logs.")

        # Self-approval check: Creators cannot approve their own fuel entries
        if not is_admin_or_sm and doc.owner == frappe.session.user:
            frappe.throw("Self-approval prohibited: Users are not permitted to approve Fuel Logs they created. Approval must be performed by an independent authorized Fleet Manager.")

        # Populate audit fields strictly on authorized approval transition
        doc.approved_by = frappe.session.user
        doc.approved_on = frappe.utils.now_datetime()

# 4B. Rejection Transition Security (Mandatory Reason, Role Check, Audit Stamping)
if doc.approval_status == "Rejected":
    is_transition_to_rejected = (not doc.get_doc_before_save()) or (old_status != "Rejected")
    
    if is_transition_to_rejected:
        if not is_admin_or_sm and not has_fleet_mgr_role:
            frappe.throw("Unauthorized: Only Fleet Managers and System Managers are authorized to reject Fuel Logs.")

        if not (doc.rejection_reason and doc.rejection_reason.strip()):
            frappe.throw("A rejection reason is strictly required when rejecting a Fuel Log.")

        doc.rejected_by = frappe.session.user
        doc.rejected_on = frappe.utils.now_datetime()

# 4C. Protect Approval and Rejection Audit Fields against manual tampering
if doc.get_doc_before_save() and not is_admin_or_sm:
    old_doc = doc.get_doc_before_save()
    if old_status == doc.approval_status:
        for af in ["approved_by", "approved_on", "rejected_by", "rejected_on"]:
            if str(doc.get(af) or "") != str(old_doc.get(af) or ""):
                frappe.throw(f"Modification of approval audit field '{af}' is strictly prohibited.")

# 5. Approved Entry Immutability (Silent Edit Prevention)
if doc.get_doc_before_save() and doc.get_doc_before_save().get("approval_status") == "Approved":
    if doc.approval_status == "Approved" and not is_admin_or_sm:
        old_doc = doc.get_doc_before_save()
        critical_fields = ["vehicle", "odometer_reading_km", "quantity_litres", "rate_per_litre", "total_fuel_cost", "fuel_source", "mine_site"]
        for cf in critical_fields:
            if str(old_doc.get(cf)) != str(doc.get(cf)):
                frappe.throw(f"Approved Fuel Log cannot be silently edited. Modifying critical field '{cf}' requires reopening/reverting to Draft for re-approval.")

# 6. Retrieve Vehicle Confirmed Odometer Reference
vehicle_confirmed_odo = int(frappe.db.get_value("Vehicle", doc.vehicle, "last_odometer") or 0)

# 7. Find previous VALID, APPROVED Fuel Log strictly for the SAME vehicle
prev_filters = {
    "vehicle": doc.vehicle,
    "approval_status": "Approved",
    "is_test_record": doc.is_test_record or 0
}
if doc.name:
    prev_filters["name"] = ["!=", doc.name]

prev_approved_logs = frappe.get_all(
    "Fuel Log",
    filters=prev_filters,
    fields=["name", "odometer_reading_km", "fuel_date", "creation"],
    order_by="odometer_reading_km desc, creation desc",
    limit=1
)

if prev_approved_logs:
    latest_approved_fuel_odo = int(prev_approved_logs[0].odometer_reading_km or 0)
    benchmark_odo = max(latest_approved_fuel_odo, vehicle_confirmed_odo)
    if odo < benchmark_odo:
        frappe.throw(
            f"Fuel odometer reading ({odo} KM) cannot be lower than the latest approved odometer benchmark ({benchmark_odo} KM) for Vehicle '{doc.vehicle}'."
        )
    
    doc.previous_odometer_km = latest_approved_fuel_odo
    doc.distance_travelled_km = odo - latest_approved_fuel_odo
    
    if doc.distance_travelled_km > 0 and qty > 0:
        interval_kml = round(doc.distance_travelled_km / qty, 2)
        doc.km_per_litre = interval_kml
        if doc.is_full_tank:
            doc.efficiency_note = f"Full-tank refill recorded. Estimated interval efficiency: {interval_kml} KM/L."
        else:
            doc.efficiency_note = f"Partial refill recorded. Interval indicator: {interval_kml} KM/L (indicative only; unconfirmed actual mileage pending full-tank benchmark)."
    else:
        doc.km_per_litre = 0.0
        doc.efficiency_note = "Duplicate or non-increasing odometer reading (Distance = 0 KM). Mileage calculation disabled to prevent division by zero or corrupted data."

else:
    if vehicle_confirmed_odo > 0 and odo < vehicle_confirmed_odo:
        frappe.throw(
            f"Fuel odometer reading ({odo} KM) cannot be lower than the vehicle's confirmed odometer ({vehicle_confirmed_odo} KM) for Vehicle '{doc.vehicle}'."
        )
    
    doc.previous_odometer_km = None
    doc.distance_travelled_km = 0
    doc.km_per_litre = 0.0
    doc.efficiency_note = "First Fuel Log for vehicle — initial odometer baseline established. Actual mileage requires subsequent refuels."
"""
    fl_ss.script = fl_code
    fl_ss.save(ignore_permissions=True)
    print("Updated Fuel Log - Validations & Efficiency.")

    # -------------------------------------------------------------------------
    # 2. Update Vehicle Breakdown - Validations & Lifecycle
    # -------------------------------------------------------------------------
    vb_ss = frappe.get_doc("Server Script", "Vehicle Breakdown - Validations & Lifecycle")
    vb_code = """# SERVER SCRIPT: Vehicle Breakdown - Validations & Lifecycle (Before Save)

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
            if doc.approved_by != old_doc.get("approved_by"):
                frappe.throw("Workshop Supervisors are not authorized to modify 'approved_by'.")
            if str(doc.approved_on or "") != str(old_doc.get("approved_on") or ""):
                frappe.throw("Workshop Supervisors are not authorized to modify 'approved_on'.")

            if doc.closed_by != old_doc.get("closed_by"):
                frappe.throw("Workshop Supervisors are not authorized to modify 'closed_by'.")
            if str(doc.closed_on or "") != str(old_doc.get("closed_on") or ""):
                frappe.throw("Workshop Supervisors are not authorized to modify 'closed_on'.")
            if doc.get("resolution_type") != old_doc.get("resolution_type"):
                frappe.throw("Workshop Supervisors are not authorized to modify 'resolution_type'.")
            if doc.get("rejection_reason") != old_doc.get("rejection_reason"):
                frappe.throw("Workshop Supervisors are not authorized to modify 'rejection_reason'.")

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

            for restricted_f in ["vehicle", "driver", "mine_site", "reported_by", "breakdown_datetime", "odometer_reading"]:
                if str(doc.get(restricted_f) or "") != str(old_doc.get(restricted_f) or ""):
                    frappe.throw(f"Workshop Supervisors are not authorized to modify '{restricted_f}' on existing breakdowns.")

# Enforce Workflow Transition Permissions
if not doc.is_new() and old_status != new_status:
    if new_status in ["Approved", "Closed"] and not is_mgr:
        frappe.throw(f"Transition to '{new_status}' requires 'Fleet Manager' or 'System Manager' role.")
    if new_status in ["In Workshop", "Awaiting Parts", "Repaired"] and not is_sup:
        frappe.throw(f"Transition to '{new_status}' requires 'Workshop Supervisor' role.")

# 8. Handling Rejections vs Genuine Repairs & Self-Approval Prevention
now_dt = frappe.utils.now_datetime()
is_rejection = (old_status == "Reported" and new_status == "Closed") or (doc.get("resolution_type") == "Rejected")

if is_rejection:
    if not (doc.rejection_reason and doc.rejection_reason.strip()):
        frappe.throw("A rejection reason is strictly required when rejecting a Vehicle Breakdown.")
    doc.resolution_type = "Rejected"
    doc.repair_start_datetime = None
    doc.repair_completion_datetime = None
    doc.downtime_hours = 0.0
    doc.parts_cost = 0.0
    doc.labour_cost = 0.0
    doc.total_repair_cost = 0.0
    doc.closed_by = frappe.session.user
    doc.closed_on = now_dt
else:
    # Normal lifecycle
    if new_status == "Approved" and old_status != "Approved":
        # Anti-self-approval rule
        if not is_sys_mgr:
            creator = doc.owner
            reporter = doc.reported_by or creator
            if frappe.session.user in [creator, reporter]:
                frappe.throw("Self-approval prohibited: Users are not permitted to approve Vehicle Breakdowns they reported. Approval must be performed by an independent authorized Fleet Manager.")
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

# 11. Immutability of Closed Breakdowns
if old_status == "Closed" and not is_sys_mgr:
    old_doc = doc.get_doc_before_save()
    locked_fields = ["vehicle", "breakdown_datetime", "total_repair_cost", "parts_cost", "labour_cost", "resolution_type"]
    for lf in locked_fields:
        if str(doc.get(lf) or "") != str(old_doc.get(lf) or ""):
            frappe.throw(f"Closed Vehicle Breakdown records cannot be modified. Field '{lf}' is locked.")
"""
    vb_ss.script = vb_code
    vb_ss.save(ignore_permissions=True)
    print("Updated Vehicle Breakdown - Validations & Lifecycle.")

    # -------------------------------------------------------------------------
    # 3. Update Mining Trip - Business Validations & Audit
    # -------------------------------------------------------------------------
    mt_ss = frappe.get_doc("Server Script", "Mining Trip - Business Validations & Audit")
    
    # We update section 8, 9, and add cancellation / self-approval guards
    old_script = mt_ss.script
    # Add cancellation reason & self-approval check
    cancellation_guard = """
# 8B. Cancellation Authorization & Mandatory Reason
if doc.trip_status == "Cancelled":
    is_cancelling = (not doc.get_doc_before_save()) or (doc.get_doc_before_save().get("trip_status") != "Cancelled")
    if is_cancelling:
        u_roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (frappe.session.user,))]
        if "Fleet Manager" not in u_roles and "System Manager" not in u_roles and frappe.session.user != "Administrator":
            frappe.throw("Unauthorized: Only Fleet Managers and System Managers are authorized to cancel a Mining Trip.")
        if not (doc.cancellation_reason and doc.cancellation_reason.strip()):
            frappe.throw("A cancellation reason is strictly required when cancelling a Mining Trip.")
        doc.cancelled_by = frappe.session.user
        doc.cancelled_on = frappe.utils.now_datetime()

# 8C. Trip Approval Authorization & Self-Approval Prevention
if doc.trip_status == "Approved":
    is_approving = (not doc.get_doc_before_save()) or (doc.get_doc_before_save().get("trip_status") != "Approved")
    if is_approving:
        u_roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (frappe.session.user,))]
        is_admin_or_sm = ("System Manager" in u_roles) or (frappe.session.user == "Administrator")
        if not is_admin_or_sm and "Fleet Manager" not in u_roles:
            frappe.throw("Unauthorized: Only Fleet Managers and System Managers are authorized to approve a Mining Trip.")
        if not is_admin_or_sm and doc.owner == frappe.session.user:
            frappe.throw("Self-approval prohibited: Users are not permitted to approve trips they created. Approval must be performed by an independent authorized Fleet Manager.")
"""
    if "# 8B. Cancellation Authorization" not in old_script:
        # insert before section 9
        mt_ss.script = old_script.replace("# 9. Audit stamping on confirmation and approval", cancellation_guard + "\n# 9. Audit stamping on confirmation and approval")
        mt_ss.save(ignore_permissions=True)
        print("Updated Mining Trip - Business Validations & Audit with cancellation and self-approval guards.")

    # -------------------------------------------------------------------------
    # 4. Update Vehicle Insurance Policy - Validations & Lifecycle
    # -------------------------------------------------------------------------
    vip_ss = frappe.get_doc("Server Script", "Vehicle Insurance Policy - Validations & Lifecycle")
    vip_script = vip_ss.script
    self_app_vip = """# A. Active activation control
if new_status == "Active":
    if not can_manage:
        frappe.throw("Only Fleet Managers or System Managers are authorized to activate an insurance policy.")
    
    # Anti-self-approval rule
    if not ("System Manager" in user_roles or user == "Administrator"):
        if doc.owner == user:
            frappe.throw("Self-approval prohibited: Users cannot activate insurance policies they created. Activation must be authorized by an independent Fleet Manager.")

    if not doc.approved_by:
        doc.approved_by = user
        doc.approved_on = frappe.utils.now_datetime()"""
    if "Self-approval prohibited" not in vip_script:
        vip_ss.script = vip_script.replace(
            """# A. Active activation control
if new_status == "Active":
    if not can_manage:
        frappe.throw("Only Fleet Managers or System Managers are authorized to activate an insurance policy.")
    if not doc.approved_by:
        doc.approved_by = user
        doc.approved_on = frappe.utils.now_datetime()""",
            self_app_vip
        )
        vip_ss.save(ignore_permissions=True)
        print("Updated Vehicle Insurance Policy - Validations & Lifecycle with self-approval check.")

    # -------------------------------------------------------------------------
    # 5. Update Material Request - Fleet Procurement Validation
    # -------------------------------------------------------------------------
    mr_ss = frappe.get_doc("Server Script", "Material Request - Fleet Procurement Validation")
    mr_script = mr_ss.script
    mr_auth = """# Validation before submission
if doc.docstatus == 1:
    roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (frappe.session.user,))]
    allowed_roles = ["Store Manager", "Fleet Manager", "Workshop Supervisor", "System Manager"]
    if not any(r in roles for r in allowed_roles) and frappe.session.user != "Administrator":
        frappe.throw("Unauthorized: Material Request submission is restricted to Store Managers, Fleet Managers, and Workshop Supervisors.")

    # Audit stamping
    if not doc.custom_approved_by:
        doc.custom_approved_by = frappe.session.user
    if not doc.custom_approved_on:
        doc.custom_approved_on = frappe.utils.now_datetime()
"""
    if "custom_approved_by" not in mr_script:
        mr_ss.script = mr_script.replace("# Validation before submission\nif doc.docstatus == 1:\n    roles = [r[0] for r in frappe.db.sql(\"SELECT role FROM `tabHas Role` WHERE parent = %s\", (frappe.session.user,))]", mr_auth)
        mr_ss.save(ignore_permissions=True)
        print("Updated Material Request - Fleet Procurement Validation.")

    # -------------------------------------------------------------------------
    # 6. Update Stock Entry - Spare Parts Validation
    # -------------------------------------------------------------------------
    se_ss = frappe.get_doc("Server Script", "Stock Entry - Spare Parts Validation")
    se_script = se_ss.script
    se_guard = """# SERVER SCRIPT: Stock Entry - Spare Parts Validation (Before Submit)
# 1. Role-based workflow guard for submission
user_roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (frappe.session.user,))]
if doc.docstatus == 1:
    if "Store Manager" not in user_roles and "Workshop Supervisor" not in user_roles and "System Manager" not in user_roles and frappe.session.user != "Administrator":
        frappe.throw("Unauthorized: You do not have permission to submit Stock Entries. Only Store Managers and Workshop Supervisors are authorized.")
"""
    if "Unauthorized: You do not have permission to submit Stock Entries" not in se_script:
        se_ss.script = se_script.replace("# SERVER SCRIPT: Stock Entry - Spare Parts Validation (Before Submit)\n# 1. Role-based workflow guard for Workshop Supervisor\nuser_roles = [r[0] for r in frappe.db.sql(\"SELECT role FROM `tabHas Role` WHERE parent = %s\", (frappe.session.user,))]", se_guard)
        se_ss.save(ignore_permissions=True)
        print("Updated Stock Entry - Spare Parts Validation.")

    # -------------------------------------------------------------------------
    # 7. Update Purchase Receipt - Fleet Procurement Linkage
    # -------------------------------------------------------------------------
    pr_ss = frappe.get_doc("Server Script", "Purchase Receipt - Fleet Procurement Linkage")
    pr_script = pr_ss.script
    pr_guard = """if doc.docstatus == 1:
    roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (frappe.session.user,))]
    allowed_pr_roles = ["Store Manager", "Fleet Manager", "System Manager"]
    if not any(r in roles for r in allowed_pr_roles) and frappe.session.user != "Administrator":
        frappe.throw("Unauthorized: Purchase Receipt verification and receipt is restricted to Store Managers, Fleet Managers, and System Managers.")
    
    if not doc.custom_verified_by:
        doc.custom_verified_by = frappe.session.user
    if not doc.custom_verified_on:
        doc.custom_verified_on = frappe.utils.now_datetime()
"""
    if "custom_verified_by" not in pr_script:
        pr_ss.script = pr_script.replace("""if doc.docstatus == 1:
    roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (frappe.session.user,))]
    if "Workshop Supervisor" in roles and "Store Manager" not in roles and "System Manager" not in roles and "Fleet Manager" not in roles:
        frappe.throw("Workshop Supervisors are not authorized to submit Purchase Receipts.")""", pr_guard)
        pr_ss.save(ignore_permissions=True)
        print("Updated Purchase Receipt - Fleet Procurement Linkage.")

    # -------------------------------------------------------------------------
    # 8. Update Purchase Invoice - Fleet Procurement Linkage
    # -------------------------------------------------------------------------
    pi_ss = frappe.get_doc("Server Script", "Purchase Invoice - Fleet Procurement Linkage")
    pi_script = pi_ss.script
    pi_guard = """if doc.docstatus == 1:
    roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (frappe.session.user,))]
    if "Accountant" not in roles and "System Manager" not in roles and frappe.session.user != "Administrator":
        frappe.throw("Unauthorized: Financial purchase invoice approval and posting is strictly restricted to Accountants and System Managers.")
    
    if not doc.custom_approved_by:
        doc.custom_approved_by = frappe.session.user
    if not doc.custom_approved_on:
        doc.custom_approved_on = frappe.utils.now_datetime()
"""
    if "custom_approved_by" not in pi_script:
        pi_ss.script = pi_script.replace("""if doc.docstatus == 1:
    roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (frappe.session.user,))]
    if "Store Manager" in roles and "Accountant" not in roles and "System Manager" not in roles:
        frappe.throw("Store Managers cannot create or submit Purchase Invoices. Financial invoicing is restricted to Accountants.")
    if "Workshop Supervisor" in roles and "Accountant" not in roles and "System Manager" not in roles:
        frappe.throw("Workshop Supervisors cannot create or submit Purchase Invoices. Financial invoicing is restricted to Accountants.")""", pi_guard)
        pi_ss.save(ignore_permissions=True)
        print("Updated Purchase Invoice - Fleet Procurement Linkage.")

    # -------------------------------------------------------------------------
    # 9. Update Sales Invoice - Fleet Operations & Revenue Sync
    # -------------------------------------------------------------------------
    si_ss = frappe.get_doc("Server Script", "Sales Invoice - Fleet Operations & Revenue Sync")
    si_script = si_ss.script
    si_guard = """
# 4. Role Authorization on Submission
if doc.docstatus == 1:
    roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (frappe.session.user,))]
    if "Accountant" not in roles and "System Manager" not in roles and frappe.session.user != "Administrator":
        frappe.throw("Unauthorized: Sales Invoice submission is strictly restricted to Accountants and System Managers.")
    
    if not doc.custom_approved_by:
        doc.custom_approved_by = frappe.session.user
    if not doc.custom_approved_on:
        doc.custom_approved_on = frappe.utils.now_datetime()
"""
    if "# 4. Role Authorization on Submission" not in si_script:
        si_ss.script = si_script + si_guard
        si_ss.save(ignore_permissions=True)
        print("Updated Sales Invoice - Fleet Operations & Revenue Sync.")

    # -------------------------------------------------------------------------
    # 10. Update Payment Entry - Procurement Test Record Propagation / Submit Guard
    # -------------------------------------------------------------------------
    pe_ss = frappe.get_doc("Server Script", "Payment Entry - Procurement Test Record Propagation")
    pe_script = pe_ss.script
    pe_guard = """
# Role Authorization on Submission
if doc.docstatus == 1:
    roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (frappe.session.user,))]
    if "Accountant" not in roles and "System Manager" not in roles and frappe.session.user != "Administrator":
        frappe.throw("Unauthorized: Payment Entry authorization and submission is strictly restricted to Accountants and System Managers.")
"""
    if "# Role Authorization on Submission" not in pe_script:
        pe_ss.script = pe_script + pe_guard
        pe_ss.save(ignore_permissions=True)
        print("Updated Payment Entry - Procurement Test Record Propagation with submission guard.")

    frappe.db.commit()
    print("\nAll Batch 12 approval hardening updates applied successfully!")

if __name__ == "__main__":
    apply_hardening()

