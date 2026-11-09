import frappe

def run():
    print("=== APPLYING BATCH 2 REFINED CORRECTIONS ===")

    # 1. Update Mining Trip Server Script (Before Save)
    mining_trip_server_script = """# 1. Prevent unauthorized editing of Approved, Delivered, or Cancelled trips (Top Guard)
if doc.get_doc_before_save():
    old_status = doc.get_doc_before_save().get("trip_status")
    if old_status in ["Approved", "Delivered", "Cancelled"]:
        is_admin = frappe.session.user == "Administrator" or bool(frappe.db.exists("Has Role", {"parent": frappe.session.user, "role": "System Manager"}))
        if not is_admin and doc.trip_status == old_status:
            old_doc = doc.get_doc_before_save()
            critical_fields = ["gross_weight_tons", "tare_weight_tons", "vehicle", "driver", "rate_per_ton", "mine_site", "destination"]
            for cf in critical_fields:
                if old_doc.get(cf) != doc.get(cf):
                    frappe.throw(f"Trip is in '{old_status}' state. Modifying critical field '{cf}' is restricted to System Managers.")

# 2. Net Weight Calculation & Validation
if doc.gross_weight_tons or doc.tare_weight_tons:
    gross = float(doc.gross_weight_tons or 0.0)
    tare = float(doc.tare_weight_tons or 0.0)

    if gross < tare:
        frappe.throw(f"Gross weight ({gross:.3f} Tons) cannot be less than tare weight ({tare:.3f} Tons).")

    doc.net_weight_tons = round(gross - tare, 3)

    if doc.net_weight_tons < 0:
        frappe.throw(f"Net weight ({doc.net_weight_tons:.3f} Tons) cannot be negative.")

# 3. Mine Site Operational Status Validation
if doc.mine_site:
    site_status = frappe.db.get_value("Mine Site", doc.mine_site, "status")
    if site_status != "Operational":
        frappe.throw(f"Cannot create trip for Mine Site '{doc.mine_site}' because its status is '{site_status}'. Only Operational mine sites can be selected.")

# 4. Vehicle Operational Status Validation (Only for new trips or when dispatching from Draft)
if doc.vehicle and (doc.is_new() or (doc.get_doc_before_save() and doc.get_doc_before_save().get("trip_status") == "Draft")):
    veh_status = frappe.db.get_value("Vehicle", doc.vehicle, "vehicle_status")
    if veh_status in ["Under Maintenance", "Breakdown", "Out of Service"]:
        frappe.throw(f"Vehicle '{doc.vehicle}' has status '{veh_status}' and is not operationally available for new trips.")

# 5. Driver Status Validation
if doc.driver:
    driver_status = frappe.db.get_value("Driver", doc.driver, "status")
    if driver_status != "Active":
        driver_name = frappe.db.get_value("Driver", doc.driver, "full_name") or doc.driver
        frappe.throw(f"Driver '{driver_name}' has status '{driver_status}'. Only Active drivers can be assigned to trips.")

# 6. Conflicting Active Trips Check (Vehicle & Driver)
# Active trips are Dispatched or Weighbridge Confirmed
if doc.trip_status in ["Dispatched", "Weighbridge Confirmed"]:
    # Conflicting trip on same vehicle
    conflicting_veh = frappe.db.get_value(
        "Mining Trip",
        {
            "vehicle": doc.vehicle,
            "trip_status": ["in", ["Dispatched", "Weighbridge Confirmed"]],
            "name": ["!=", doc.name]
        },
        ["name", "challan_number"],
        as_dict=True
    )
    if conflicting_veh:
        frappe.throw(f"Vehicle '{doc.vehicle}' is already engaged on active trip '{conflicting_veh.name}' (Challan: {conflicting_veh.challan_number or 'N/A'}). Multiple active trips for the same vehicle are strictly prohibited.")

    # Conflicting trip on same driver
    conflicting_drv = frappe.db.get_value(
        "Mining Trip",
        {
            "driver": doc.driver,
            "trip_status": ["in", ["Dispatched", "Weighbridge Confirmed"]],
            "name": ["!=", doc.name]
        },
        ["name", "challan_number"],
        as_dict=True
    )
    if conflicting_drv:
        frappe.throw(f"Driver '{doc.driver}' is already engaged on active trip '{conflicting_drv.name}' (Challan: {conflicting_drv.challan_number or 'N/A'}). Multiple active trips for the same driver are strictly prohibited.")

# 7. Odometer Progression Validations
# Check opening odometer against vehicle last odometer only for new trips or when dispatching from Draft
if doc.opening_odometer is not None and doc.opening_odometer > 0:
    if doc.is_new() or (doc.get_doc_before_save() and doc.get_doc_before_save().get("trip_status") == "Draft"):
        veh_last_odo = frappe.db.get_value("Vehicle", doc.vehicle, "last_odometer")
        if veh_last_odo is not None and doc.opening_odometer < veh_last_odo:
            frappe.throw(f"Opening odometer ({doc.opening_odometer} km) cannot be less than vehicle's last recorded odometer ({veh_last_odo} km).")

if doc.closing_odometer is not None and doc.closing_odometer > 0:
    if doc.opening_odometer is not None and doc.closing_odometer < doc.opening_odometer:
        frappe.throw(f"Closing odometer ({doc.closing_odometer} km) cannot be lower than opening odometer ({doc.opening_odometer} km).")

# 8. Workflow & Trip Status Synchronization Guard
# Prevent users or external scripts from bypassing workflow by directly changing trip_status
if doc.get_doc_before_save():
    old_trip_status = doc.get_doc_before_save().get("trip_status")
    if doc.trip_status != old_trip_status:
        # In Frappe workflow transitions, workflow_state changes to match the target trip_status
        if doc.workflow_state != doc.trip_status:
            frappe.throw(f"Direct editing of Trip Status is prohibited. Status changes must be performed through authorized Workflow transitions. (Attempted: '{doc.trip_status}', Current Workflow: '{doc.workflow_state}')")

# 9. Audit stamping on confirmation and approval
if doc.trip_status == "Weighbridge Confirmed" and not doc.confirmed_by:
    doc.confirmed_by = frappe.session.user
    doc.confirmed_on = frappe.utils.now_datetime()

if doc.trip_status == "Approved" and not doc.approved_by:
    doc.approved_by = frappe.session.user
    doc.approved_on = frappe.utils.now_datetime()

# 10. Test Record Exclusion & Propagation
if not doc.is_test_record:
    is_v_test = frappe.db.get_value("Vehicle", doc.vehicle, "is_test_record") if doc.vehicle else 0
    is_d_test = frappe.db.get_value("Driver", doc.driver, "is_test_record") if doc.driver else 0
    is_s_test = frappe.db.get_value("Mine Site", doc.mine_site, "is_test_record") if doc.mine_site else 0
    if is_v_test or is_d_test or is_s_test:
        doc.is_test_record = 1
"""

    ss_before_save = {
        "doctype": "Server Script",
        "name": "Mining Trip - Business Validations & Audit",
        "script_type": "DocType Event",
        "reference_doctype": "Mining Trip",
        "doctype_event": "Before Save",
        "script": mining_trip_server_script,
        "disabled": 0
    }

    if frappe.db.exists("Server Script", ss_before_save["name"]):
        ss = frappe.get_doc("Server Script", ss_before_save["name"])
        ss.update(ss_before_save)
        ss.save(ignore_permissions=True)
        print("Updated Server Script: Mining Trip - Business Validations & Audit")
    else:
        ss = frappe.get_doc(ss_before_save)
        ss.insert(ignore_permissions=True)
        print("Created Server Script: Mining Trip - Business Validations & Audit")

    # 2. Add After Save Server Script for Odometer & Vehicle Operational Status Lifecycle
    mining_trip_after_save = """old_status = doc.get_doc_before_save().get("trip_status") if doc.get_doc_before_save() else None
new_status = doc.trip_status

# A. On Dispatch: Set Vehicle to "On Trip" if currently "Active"
if new_status == "Dispatched" and old_status != "Dispatched":
    curr_veh_status = frappe.db.get_value("Vehicle", doc.vehicle, "vehicle_status")
    if curr_veh_status == "Active":
        frappe.db.set_value("Vehicle", doc.vehicle, "vehicle_status", "On Trip")

# B. On Delivery: Update Vehicle Odometer & Restore Status to "Active" (never overwrite Breakdown/Maintenance)
if new_status == "Delivered" and old_status != "Delivered":
    # Update Vehicle Odometer
    if doc.closing_odometer and doc.closing_odometer > 0:
        curr_veh_odo = frappe.db.get_value("Vehicle", doc.vehicle, "last_odometer") or 0
        if doc.closing_odometer > curr_veh_odo:
            frappe.db.set_value("Vehicle", doc.vehicle, "last_odometer", doc.closing_odometer)

    # Restore vehicle status ONLY if currently On Trip
    curr_veh_status = frappe.db.get_value("Vehicle", doc.vehicle, "vehicle_status")
    if curr_veh_status == "On Trip":
        frappe.db.set_value("Vehicle", doc.vehicle, "vehicle_status", "Active")

# C. On Cancellation: Restore Vehicle Status if it was On Trip
if new_status == "Cancelled" and old_status != "Cancelled":
    curr_veh_status = frappe.db.get_value("Vehicle", doc.vehicle, "vehicle_status")
    if curr_veh_status == "On Trip":
        frappe.db.set_value("Vehicle", doc.vehicle, "vehicle_status", "Active")
"""

    ss_after_save = {
        "doctype": "Server Script",
        "name": "Mining Trip - Odometer & Vehicle Status Sync",
        "script_type": "DocType Event",
        "reference_doctype": "Mining Trip",
        "doctype_event": "After Save",
        "script": mining_trip_after_save,
        "disabled": 0
    }

    if frappe.db.exists("Server Script", ss_after_save["name"]):
        ss = frappe.get_doc("Server Script", ss_after_save["name"])
        ss.update(ss_after_save)
        ss.save(ignore_permissions=True)
        print("Updated Server Script: Mining Trip - Odometer & Vehicle Status Sync")
    else:
        ss = frappe.get_doc(ss_after_save)
        ss.insert(ignore_permissions=True)
        print("Created Server Script: Mining Trip - Odometer & Vehicle Status Sync")

    frappe.clear_cache()
    frappe.db.commit()
    print("=== BATCH 2 REFINED CORRECTIONS APPLIED ===")

run()
