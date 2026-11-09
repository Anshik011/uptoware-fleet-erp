import frappe

def run():
    print("=== 1. CONFIGURING MINING TRIP WORKFLOW ===")

    workflow_doc = {
        "doctype": "Workflow",
        "workflow_name": "Mining Trip Lifecycle",
        "document_type": "Mining Trip",
        "workflow_state_field": "workflow_state",
        "is_active": 1,
        "override_status": 0,
        "send_email_alert": 0,
        "states": [
            {
                "state": "Draft",
                "doc_status": 0,
                "allow_edit": "Fleet Manager",
                "update_field": "trip_status",
                "update_value": "Draft"
            },
            {
                "state": "Dispatched",
                "doc_status": 0,
                "allow_edit": "Weighbridge Operator",
                "update_field": "trip_status",
                "update_value": "Dispatched"
            },
            {
                "state": "Weighbridge Confirmed",
                "doc_status": 0,
                "allow_edit": "Fleet Manager",
                "update_field": "trip_status",
                "update_value": "Weighbridge Confirmed"
            },
            {
                "state": "Approved",
                "doc_status": 0,
                "allow_edit": "Fleet Manager",
                "update_field": "trip_status",
                "update_value": "Approved"
            },
            {
                "state": "Delivered",
                "doc_status": 0,
                "allow_edit": "System Manager",
                "update_field": "trip_status",
                "update_value": "Delivered"
            },
            {
                "state": "Cancelled",
                "doc_status": 0,
                "allow_edit": "System Manager",
                "update_field": "trip_status",
                "update_value": "Cancelled"
            }
        ],
        "transitions": [
            # Draft -> Dispatched
            {
                "state": "Draft",
                "action": "Dispatch",
                "next_state": "Dispatched",
                "allowed": "Fleet Manager",
                "allow_self_approval": 1
            },
            # Dispatched -> Weighbridge Confirmed
            {
                "state": "Dispatched",
                "action": "Confirm Weighbridge",
                "next_state": "Weighbridge Confirmed",
                "allowed": "Weighbridge Operator",
                "allow_self_approval": 1,
                "condition": "doc.gross_weight_tons > 0 and doc.tare_weight_tons > 0"
            },
            # Weighbridge Confirmed -> Approved
            {
                "state": "Weighbridge Confirmed",
                "action": "Approve",
                "next_state": "Approved",
                "allowed": "Fleet Manager",
                "allow_self_approval": 1
            },
            # Approved -> Delivered
            {
                "state": "Approved",
                "action": "Mark Delivered",
                "next_state": "Delivered",
                "allowed": "Fleet Manager",
                "allow_self_approval": 1,
                "condition": "doc.closing_odometer and doc.return_date_time"
            },
            # Cancellations
            {
                "state": "Draft",
                "action": "Cancel",
                "next_state": "Cancelled",
                "allowed": "Fleet Manager",
                "allow_self_approval": 1
            },
            {
                "state": "Dispatched",
                "action": "Cancel",
                "next_state": "Cancelled",
                "allowed": "Fleet Manager",
                "allow_self_approval": 1
            },
            {
                "state": "Weighbridge Confirmed",
                "action": "Cancel",
                "next_state": "Cancelled",
                "allowed": "Fleet Manager",
                "allow_self_approval": 1
            }
        ]
    }

    if frappe.db.exists("Workflow", "Mining Trip Lifecycle"):
        wf = frappe.get_doc("Workflow", "Mining Trip Lifecycle")
        wf.update(workflow_doc)
        wf.save(ignore_permissions=True)
        print("Updated Workflow: Mining Trip Lifecycle")
    else:
        wf = frappe.get_doc(workflow_doc)
        wf.insert(ignore_permissions=True)
        print("Created Workflow: Mining Trip Lifecycle")

    print("\n=== 2. CONFIGURING MINING TRIP SERVER SCRIPT ===")
    mining_trip_server_script = """# 1. Net Weight Calculation & Validation
if doc.gross_weight_tons or doc.tare_weight_tons:
    gross = float(doc.gross_weight_tons or 0.0)
    tare = float(doc.tare_weight_tons or 0.0)

    if gross < tare:
        frappe.throw(f"Gross weight ({gross:.3f} Tons) cannot be less than tare weight ({tare:.3f} Tons).")

    doc.net_weight_tons = round(gross - tare, 3)

    if doc.net_weight_tons < 0:
        frappe.throw(f"Net weight ({doc.net_weight_tons:.3f} Tons) cannot be negative.")

# 2. Mine Site Operational Status Validation
if doc.mine_site:
    site_status = frappe.db.get_value("Mine Site", doc.mine_site, "status")
    if site_status != "Operational":
        frappe.throw(f"Cannot create trip for Mine Site '{doc.mine_site}' because its status is '{site_status}'. Only Operational mine sites can be selected.")

# 3. Vehicle Operational Status Validation
if doc.vehicle:
    veh_status = frappe.db.get_value("Vehicle", doc.vehicle, "vehicle_status")
    if veh_status in ["Under Maintenance", "Breakdown", "Out of Service"]:
        frappe.throw(f"Vehicle '{doc.vehicle}' has status '{veh_status}' and is not operationally available for trips.")

# 4. Driver Status Validation
if doc.driver:
    driver_status = frappe.db.get_value("Driver", doc.driver, "status")
    if driver_status != "Active":
        driver_name = frappe.db.get_value("Driver", doc.driver, "full_name") or doc.driver
        frappe.throw(f"Driver '{driver_name}' has status '{driver_status}'. Only Active drivers can be assigned to trips.")

# 5. Conflicting Active Trips Check (Vehicle & Driver)
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

# 6. Odometer Progression Validations
if doc.opening_odometer is not None and doc.opening_odometer > 0:
    veh_last_odo = frappe.db.get_value("Vehicle", doc.vehicle, "last_odometer")
    if veh_last_odo is not None and doc.opening_odometer < veh_last_odo:
        frappe.throw(f"Opening odometer ({doc.opening_odometer} km) cannot be less than vehicle's last recorded odometer ({veh_last_odo} km).")

if doc.closing_odometer is not None and doc.closing_odometer > 0:
    if doc.opening_odometer is not None and doc.closing_odometer < doc.opening_odometer:
        frappe.throw(f"Closing odometer ({doc.closing_odometer} km) cannot be lower than opening odometer ({doc.opening_odometer} km).")

# 7. Audit stamping on confirmation and approval
if doc.trip_status == "Weighbridge Confirmed" and not doc.confirmed_by:
    doc.confirmed_by = frappe.session.user
    doc.confirmed_on = frappe.utils.now_datetime()

if doc.trip_status == "Approved" and not doc.approved_by:
    doc.approved_by = frappe.session.user
    doc.approved_on = frappe.utils.now_datetime()

# 8. Prevent unauthorized editing of Approved, Delivered, or Cancelled trips
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

# 9. Test Record Exclusion & Propagation
if not doc.is_test_record:
    is_v_test = frappe.db.get_value("Vehicle", doc.vehicle, "is_test_record") if doc.vehicle else 0
    is_d_test = frappe.db.get_value("Driver", doc.driver, "is_test_record") if doc.driver else 0
    is_s_test = frappe.db.get_value("Mine Site", doc.mine_site, "is_test_record") if doc.mine_site else 0
    if is_v_test or is_d_test or is_s_test:
        doc.is_test_record = 1
"""

    server_script_doc = {
        "doctype": "Server Script",
        "name": "Mining Trip - Business Validations & Audit",
        "script_type": "DocType Event",
        "reference_doctype": "Mining Trip",
        "doctype_event": "Before Save",
        "script": mining_trip_server_script,
        "disabled": 0
    }

    if frappe.db.exists("Server Script", server_script_doc["name"]):
        ss = frappe.get_doc("Server Script", server_script_doc["name"])
        ss.update(server_script_doc)
        ss.save(ignore_permissions=True)
        print("Updated Server Script: Mining Trip - Business Validations & Audit")
    else:
        ss = frappe.get_doc(server_script_doc)
        ss.insert(ignore_permissions=True)
        print("Created Server Script: Mining Trip - Business Validations & Audit")

    print("\n=== 3. CONFIGURING CLIENT SCRIPTS ===")
    mining_trip_client_script = """frappe.ui.form.on('Mining Trip', {
    setup: function(frm) {
        // Filter Vehicle: Only Operational / Active / On Trip
        frm.set_query('vehicle', function() {
            return {
                filters: {
                    vehicle_status: ['in', ['Active', 'On Trip']]
                }
            };
        });

        // Filter Driver: Only Active
        frm.set_query('driver', function() {
            return {
                filters: {
                    status: 'Active'
                }
            };
        });

        // Filter Mine Site: Only Operational
        frm.set_query('mine_site', function() {
            return {
                filters: {
                    status: 'Operational'
                }
            };
        });
    },

    gross_weight_tons: function(frm) {
        frm.trigger('calculate_net_weight');
    },

    tare_weight_tons: function(frm) {
        frm.trigger('calculate_net_weight');
    },

    calculate_net_weight: function(frm) {
        let gross = flt(frm.doc.gross_weight_tons);
        let tare = flt(frm.doc.tare_weight_tons);

        if (gross > 0 && tare > 0) {
            if (gross < tare) {
                frappe.msgprint(__('Gross Weight cannot be less than Tare Weight.'));
                frm.set_value('net_weight_tons', 0);
            } else {
                frm.set_value('net_weight_tons', flt(gross - tare, 3));
            }
        }
    },

    vehicle: function(frm) {
        if (frm.doc.vehicle) {
            frappe.db.get_value('Vehicle', frm.doc.vehicle, ['assigned_driver', 'last_odometer'], function(r) {
                if (r) {
                    if (r.assigned_driver && !frm.doc.driver) {
                        frm.set_value('driver', r.assigned_driver);
                    }
                    if (r.last_odometer && !frm.doc.opening_odometer) {
                        frm.set_value('opening_odometer', r.last_odometer);
                    }
                }
            });
        }
    },

    refresh: function(frm) {
        // Visual indicator styling on form
        if (frm.doc.trip_status === 'Dispatched') {
            frm.dashboard.set_headline_alert(__('Trip is Dispatched and awaiting Weighbridge Confirmation.'), 'blue');
        } else if (frm.doc.trip_status === 'Weighbridge Confirmed') {
            frm.dashboard.set_headline_alert(__('Weighbridge Confirmed. Awaiting Fleet Manager Approval.'), 'orange');
        } else if (frm.doc.trip_status === 'Approved') {
            frm.dashboard.set_headline_alert(__('Trip Approved. In Transit to Destination.'), 'green');
        } else if (frm.doc.trip_status === 'Delivered') {
            frm.dashboard.set_headline_alert(__('Trip Delivered and Completed.'), 'green');
        } else if (frm.doc.trip_status === 'Cancelled') {
            frm.dashboard.set_headline_alert(__('Trip has been Cancelled.'), 'red');
        }
    }
});
"""

    client_script_doc = {
        "doctype": "Client Script",
        "name": "Mining Trip - Fleet Form UI & Calculations",
        "dt": "Mining Trip",
        "view": "Form",
        "script": mining_trip_client_script,
        "enabled": 1
    }

    if frappe.db.exists("Client Script", client_script_doc["name"]):
        cs = frappe.get_doc("Client Script", client_script_doc["name"])
        cs.update(client_script_doc)
        cs.save(ignore_permissions=True)
        print("Updated Client Script: Mining Trip - Fleet Form UI & Calculations")
    else:
        cs = frappe.get_doc(client_script_doc)
        cs.insert(ignore_permissions=True)
        print("Created Client Script: Mining Trip - Fleet Form UI & Calculations")

    frappe.clear_cache()
    frappe.db.commit()
    print("=== WORKFLOW & SCRIPTS CONFIGURED SUCCESSFULLY ===")

run()
