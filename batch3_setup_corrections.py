import frappe

def run():
    print("=== CONFIGURING BATCH 3 REFINED WORKFLOW & SERVER SCRIPTS ===")

    # Ensure Workflow State "Rejected" exists
    if not frappe.db.exists("Workflow State", "Rejected"):
        frappe.get_doc({
            "doctype": "Workflow State",
            "workflow_state_name": "Rejected",
            "style": "Danger"
        }).insert(ignore_permissions=True)

    # Ensure Workflow Actions exist
    for wa in ["Approve", "Reject", "Re-open"]:
        if not frappe.db.exists("Workflow Action Master", wa):
            frappe.get_doc({
                "doctype": "Workflow Action Master",
                "workflow_action_name": wa
            }).insert(ignore_permissions=True)

    # 1. Native Workflow for Fuel Log
    workflow_name = "Fuel Log Approval Lifecycle"
    workflow_doc = {
        "doctype": "Workflow",
        "workflow_name": workflow_name,
        "document_type": "Fuel Log",
        "workflow_state_field": "workflow_state",
        "is_active": 1,
        "states": [
            {
                "state": "Draft",
                "doc_status": 0,
                "allow_edit": "Fleet Manager",
                "update_field": "approval_status",
                "update_value": "Draft"
            },
            {
                "state": "Approved",
                "doc_status": 0,
                "allow_edit": "System Manager",
                "update_field": "approval_status",
                "update_value": "Approved"
            },
            {
                "state": "Rejected",
                "doc_status": 0,
                "allow_edit": "System Manager",
                "update_field": "approval_status",
                "update_value": "Rejected"
            }
        ],
        "transitions": [
            {
                "state": "Draft",
                "action": "Approve",
                "next_state": "Approved",
                "allowed": "Fleet Manager",
                "allow_self_approval": 0
            },
            {
                "state": "Draft",
                "action": "Reject",
                "next_state": "Rejected",
                "allowed": "Fleet Manager",
                "allow_self_approval": 0
            },
            {
                "state": "Rejected",
                "action": "Re-open",
                "next_state": "Draft",
                "allowed": "Fleet Manager",
                "allow_self_approval": 0
            }
        ]
    }

    if frappe.db.exists("Workflow", workflow_name):
        wf = frappe.get_doc("Workflow", workflow_name)
        wf.update(workflow_doc)
        wf.save(ignore_permissions=True)
        print(f"Updated Workflow: {workflow_name}")
    else:
        wf = frappe.get_doc(workflow_doc)
        wf.insert(ignore_permissions=True)
        print(f"Created Workflow: {workflow_name}")

    # 2. Server Script: Fuel Log - Validations & Efficiency (Before Save)
    fuel_log_before_save_code = """# 1. Basic field presence and value validations
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

if doc.get_doc_before_save():
    old_status = doc.get_doc_before_save().get("approval_status")
    if doc.approval_status != old_status:
        # Prevent direct editing of approval_status bypassing workflow transitions
        if doc.workflow_state != doc.approval_status:
            frappe.throw(f"Direct editing of Approval Status is prohibited. Status changes must be performed through authorized Workflow transitions. (Attempted: '{doc.approval_status}', Current Workflow: '{doc.workflow_state}')")

# 4. Approval Transition Security (Role Check, Self-Approval Prevention, Audit Stamping)
if doc.approval_status == "Approved":
    is_transition_to_approved = (not doc.get_doc_before_save()) or (doc.get_doc_before_save().get("approval_status") != "Approved")
    
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
# Exclude Draft, Rejected, and cross-isolated test records
prev_filters = {
    "vehicle": doc.vehicle,
    "approval_status": "Approved", # Strictly Approved records only!
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
    
    # Reading must not be lower than the latest valid recorded odometer benchmark
    benchmark_odo = max(latest_approved_fuel_odo, vehicle_confirmed_odo)
    if odo < benchmark_odo:
        frappe.throw(
            f"Fuel odometer reading ({odo} KM) cannot be lower than the latest approved odometer benchmark ({benchmark_odo} KM) for Vehicle '{doc.vehicle}'."
        )
    
    # Store previous approved odometer
    doc.previous_odometer_km = latest_approved_fuel_odo
    doc.distance_travelled_km = odo - latest_approved_fuel_odo
    
    # Fuel Efficiency Calculation & Interval Indicator Logic
    if doc.distance_travelled_km > 0 and qty > 0:
        interval_kml = round(doc.distance_travelled_km / qty, 2)
        doc.km_per_litre = interval_kml
        if doc.is_full_tank:
            doc.efficiency_note = f"Full-tank refill recorded. Estimated interval efficiency: {interval_kml} KM/L."
        else:
            doc.efficiency_note = f"Partial refill recorded. Interval indicator: {interval_kml} KM/L (indicative only; unconfirmed actual mileage pending full-tank benchmark)."
    else:
        # Duplicate or zero distance travelled
        doc.km_per_litre = 0.0
        doc.efficiency_note = "Duplicate or non-increasing odometer reading (Distance = 0 KM). Mileage calculation disabled to prevent division by zero or corrupted data."

else:
    # First approved fuel entry for this vehicle: establish benchmark
    if vehicle_confirmed_odo > 0 and odo < vehicle_confirmed_odo:
        frappe.throw(
            f"Fuel odometer reading ({odo} KM) cannot be lower than the vehicle's confirmed odometer ({vehicle_confirmed_odo} KM) for Vehicle '{doc.vehicle}'."
        )
    
    # First entry produces clean benchmark without misleading figures
    doc.previous_odometer_km = None
    doc.distance_travelled_km = 0
    doc.km_per_litre = 0.0
    doc.efficiency_note = "First Fuel Log for vehicle — initial odometer baseline established. Actual mileage requires subsequent refuels."
"""

    ss_fl_before_save = {
        "doctype": "Server Script",
        "name": "Fuel Log - Validations & Efficiency",
        "script_type": "DocType Event",
        "reference_doctype": "Fuel Log",
        "doctype_event": "Before Save",
        "script": fuel_log_before_save_code,
        "disabled": 0
    }

    if frappe.db.exists("Server Script", ss_fl_before_save["name"]):
        ss = frappe.get_doc("Server Script", ss_fl_before_save["name"])
        ss.update(ss_fl_before_save)
        ss.save(ignore_permissions=True)
        print("Updated Server Script: Fuel Log - Validations & Efficiency")
    else:
        ss = frappe.get_doc(ss_fl_before_save)
        ss.insert(ignore_permissions=True)
        print("Created Server Script: Fuel Log - Validations & Efficiency")

    # 3. Server Script: Fuel Log - Vehicle Odometer Sync & Approval (After Save)
    fuel_log_after_save_code = """# Update Vehicle last_odometer ONLY from an Approved Fuel Log
if doc.approval_status == "Approved":
    fuel_odo = int(doc.odometer_reading_km or 0)
    curr_veh_odo = int(frappe.db.get_value("Vehicle", doc.vehicle, "last_odometer") or 0)
    
    # Only update if the approved fuel log odometer is strictly greater than the vehicle's confirmed odometer
    if fuel_odo > curr_veh_odo:
        frappe.db.set_value("Vehicle", doc.vehicle, "last_odometer", fuel_odo)
"""

    ss_fl_after_save = {
        "doctype": "Server Script",
        "name": "Fuel Log - Vehicle Odometer Sync & Approval",
        "script_type": "DocType Event",
        "reference_doctype": "Fuel Log",
        "doctype_event": "After Save",
        "script": fuel_log_after_save_code,
        "disabled": 0
    }

    if frappe.db.exists("Server Script", ss_fl_after_save["name"]):
        ss = frappe.get_doc("Server Script", ss_fl_after_save["name"])
        ss.update(ss_fl_after_save)
        ss.save(ignore_permissions=True)
        print("Updated Server Script: Fuel Log - Vehicle Odometer Sync & Approval")
    else:
        ss = frappe.get_doc(ss_fl_after_save)
        ss.insert(ignore_permissions=True)
        print("Created Server Script: Fuel Log - Vehicle Odometer Sync & Approval")

    # 4. Client Script: Live Efficiency and Benchmarks
    client_script_code = """frappe.ui.form.on('Fuel Log', {
    vehicle: function(frm) {
        if (frm.doc.vehicle) {
            frappe.db.get_list('Fuel Log', {
                filters: {
                    vehicle: frm.doc.vehicle,
                    approval_status: 'Approved',
                    name: ['!=', frm.doc.name || '']
                },
                fields: ['odometer_reading_km'],
                order_by: 'odometer_reading_km desc, creation desc',
                limit: 1
            }).then(records => {
                if (records && records.length > 0) {
                    frm.set_value('previous_odometer_km', records[0].odometer_reading_km);
                } else {
                    frm.set_value('previous_odometer_km', null);
                }
                calculate_efficiency(frm);
            });
        }
    },
    odometer_reading_km: function(frm) {
        calculate_efficiency(frm);
    },
    quantity_litres: function(frm) {
        calculate_efficiency(frm);
    },
    is_full_tank: function(frm) {
        calculate_efficiency(frm);
    }
});

function calculate_efficiency(frm) {
    const odo = flt(frm.doc.odometer_reading_km);
    const prev = flt(frm.doc.previous_odometer_km);
    const qty = flt(frm.doc.quantity_litres);

    if (frm.doc.previous_odometer_km !== null && frm.doc.previous_odometer_km !== undefined && odo > prev) {
        const dist = odo - prev;
        frm.set_value('distance_travelled_km', dist);
        if (qty > 0) {
            const kml = flt((dist / qty).toFixed(2));
            frm.set_value('km_per_litre', kml);
            if (frm.doc.is_full_tank) {
                frm.set_value('efficiency_note', 'Full-tank refill. Estimated interval efficiency: ' + kml + ' KM/L.');
            } else {
                frm.set_value('efficiency_note', 'Partial refill. Indicative interval indicator: ' + kml + ' KM/L (unconfirmed mileage).');
            }
        } else {
            frm.set_value('km_per_litre', 0);
            frm.set_value('efficiency_note', 'Quantity must be greater than zero.');
        }
    } else {
        frm.set_value('distance_travelled_km', 0);
        frm.set_value('km_per_litre', 0);
        if (!frm.doc.previous_odometer_km) {
            frm.set_value('efficiency_note', 'First Fuel Log for vehicle — initial odometer baseline established.');
        } else {
            frm.set_value('efficiency_note', 'Duplicate or non-increasing odometer reading (Distance = 0 KM).');
        }
    }
}
"""

    cs_dict = {
        "doctype": "Client Script",
        "name": "Fuel Log - Live Efficiency & Benchmarks",
        "dt": "Fuel Log",
        "script_type": "DocType Event",
        "script": client_script_code,
        "enabled": 1
    }

    if frappe.db.exists("Client Script", cs_dict["name"]):
        cs = frappe.get_doc("Client Script", cs_dict["name"])
        cs.update(cs_dict)
        cs.save(ignore_permissions=True)
        print("Updated Client Script: Fuel Log - Live Efficiency & Benchmarks")
    else:
        cs = frappe.get_doc(cs_dict)
        cs.insert(ignore_permissions=True)
        print("Created Client Script: Fuel Log - Live Efficiency & Benchmarks")

    frappe.clear_cache(doctype="Fuel Log")
    frappe.clear_cache()
    frappe.db.commit()
    print("SUCCESS: Fuel Log Workflow, Server Scripts, and Client Script applied successfully.")

run()
