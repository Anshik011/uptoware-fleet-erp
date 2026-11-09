import frappe

def run():
    # 1. Server Script: Vehicle - Validate & Sync Driver
    vehicle_script = """# Validate Odometer
if doc.last_odometer is not None and doc.last_odometer < 0:
    frappe.throw("Odometer reading cannot be negative.")

# Validate Driver Assignment
if doc.assigned_driver:
    driver = frappe.db.get_value("Driver", doc.assigned_driver, ["status", "full_name"], as_dict=True)
    if not driver:
        frappe.throw(f"Driver '{doc.assigned_driver}' does not exist.")
    if driver.status != "Active":
        frappe.throw(f"Cannot assign Driver '{driver.full_name or doc.assigned_driver}' because driver status is '{driver.status}'. Only Active drivers can be assigned to vehicles.")

    # Check if this driver is already assigned to another vehicle
    existing_veh = frappe.db.get_value("Vehicle", {"assigned_driver": doc.assigned_driver, "name": ["!=", doc.name]}, "name")
    if existing_veh:
        frappe.throw(f"Driver '{driver.full_name or doc.assigned_driver}' is already assigned to Vehicle '{existing_veh}'. Duplicate active driver assignments are strictly prohibited.")
"""

    vehicle_after_save = """# Synchronize assigned driver
if doc.assigned_driver:
    current_drv_veh = frappe.db.get_value("Driver", doc.assigned_driver, "assigned_vehicle")
    if current_drv_veh != doc.name:
        frappe.db.set_value("Driver", doc.assigned_driver, "assigned_vehicle", doc.name)

# If driver assignment was cleared or changed, unassign from old driver
if doc.get_doc_before_save():
    old_driver = doc.get_doc_before_save().get("assigned_driver")
    if old_driver and old_driver != doc.assigned_driver:
        current_old_veh = frappe.db.get_value("Driver", old_driver, "assigned_vehicle")
        if current_old_veh == doc.name:
            frappe.db.set_value("Driver", old_driver, "assigned_vehicle", None)
"""

    # 2. Server Script: Driver - Validate & Sync Vehicle
    driver_script = """# Check status change while assigned
if doc.get_doc_before_save():
    old_status = doc.get_doc_before_save().get("status")
    old_vehicle = doc.get_doc_before_save().get("assigned_vehicle")
    # If driver was active and assigned, but status is now changed to Suspended or Left
    if old_status == "Active" and doc.status != "Active" and old_vehicle:
        doc.assigned_vehicle = None
        frappe.msgprint(f"Driver status set to '{doc.status}'. Assigned vehicle '{old_vehicle}' has been automatically unassigned.")

# If driver has an assigned vehicle (and wasn't auto-cleared above)
if doc.assigned_vehicle:
    if doc.status != "Active":
        frappe.throw(f"Cannot assign Vehicle '{doc.assigned_vehicle}' to Driver '{doc.full_name or doc.name}' because driver status is '{doc.status}'. Only Active drivers can be assigned.")

    # Check if vehicle is already assigned to another active driver in Driver records
    existing_drv = frappe.db.get_value("Driver", {"assigned_vehicle": doc.assigned_vehicle, "name": ["!=", doc.name], "status": "Active"}, "name")
    if existing_drv:
        frappe.throw(f"Vehicle '{doc.assigned_vehicle}' is already assigned to Driver '{existing_drv}'. Duplicate active driver assignments are strictly prohibited.")

    # Also check if vehicle itself already has another assigned driver
    veh_assigned = frappe.db.get_value("Vehicle", doc.assigned_vehicle, "assigned_driver")
    if veh_assigned and veh_assigned != doc.name:
        frappe.throw(f"Vehicle '{doc.assigned_vehicle}' is already assigned to Driver '{veh_assigned}'. Duplicate active driver assignments are strictly prohibited.")
"""

    driver_after_save = """# Synchronize assigned vehicle
if doc.assigned_vehicle:
    current_veh_drv = frappe.db.get_value("Vehicle", doc.assigned_vehicle, "assigned_driver")
    if current_veh_drv != doc.name:
        frappe.db.set_value("Vehicle", doc.assigned_vehicle, "assigned_driver", doc.name)

# If vehicle was cleared, changed, or auto-unassigned due to status change, unassign from old vehicle
if doc.get_doc_before_save():
    old_vehicle = doc.get_doc_before_save().get("assigned_vehicle")
    if old_vehicle and old_vehicle != doc.assigned_vehicle:
        current_veh_drv = frappe.db.get_value("Vehicle", old_vehicle, "assigned_driver")
        if current_veh_drv == doc.name:
            frappe.db.set_value("Vehicle", old_vehicle, "assigned_driver", None)
"""

    server_scripts = [
        {
            "name": "Vehicle - Validate Driver Assignment & Odometer",
            "script_type": "DocType Event",
            "reference_doctype": "Vehicle",
            "doctype_event": "Before Save",
            "script": vehicle_script,
            "disabled": 0
        },
        {
            "name": "Vehicle - Sync Driver After Save",
            "script_type": "DocType Event",
            "reference_doctype": "Vehicle",
            "doctype_event": "After Save",
            "script": vehicle_after_save,
            "disabled": 0
        },
        {
            "name": "Driver - Validate Vehicle Assignment",
            "script_type": "DocType Event",
            "reference_doctype": "Driver",
            "doctype_event": "Before Save",
            "script": driver_script,
            "disabled": 0
        },
        {
            "name": "Driver - Sync Vehicle After Save",
            "script_type": "DocType Event",
            "reference_doctype": "Driver",
            "doctype_event": "After Save",
            "script": driver_after_save,
            "disabled": 0
        }
    ]

    for s in server_scripts:
        if frappe.db.exists("Server Script", s["name"]):
            doc = frappe.get_doc("Server Script", s["name"])
            doc.update(s)
            doc.save()
        else:
            doc = frappe.get_doc({"doctype": "Server Script", **s})
            doc.insert()

    # 3. Client Scripts
    vehicle_client_script = """
frappe.ui.form.on('Vehicle', {
    setup: function(frm) {
        // Filter assigned_driver link to only show Active drivers
        frm.set_query('assigned_driver', function() {
            return {
                filters: {
                    status: 'Active'
                }
            };
        });
    },
    refresh: function(frm) {
        frm.trigger('check_statutory_compliance');
    },
    check_statutory_compliance: function(frm) {
        if (frm.is_new()) return;
        const today = frappe.datetime.get_today();
        let warnings = [];

        if (frm.doc.end_date && frm.doc.end_date < today) {
            warnings.push("Insurance Policy EXPIRED on " + frm.doc.end_date);
        }
        if (frm.doc.fitness_expiry_date && frm.doc.fitness_expiry_date < today) {
            warnings.push("Fitness Certificate EXPIRED on " + frm.doc.fitness_expiry_date);
        }
        if (frm.doc.puc_expiry_date && frm.doc.puc_expiry_date < today) {
            warnings.push("PUC Certificate EXPIRED on " + frm.doc.puc_expiry_date);
        }
        if (frm.doc.road_tax_expiry_date && frm.doc.road_tax_expiry_date < today) {
            warnings.push("Road Tax EXPIRED on " + frm.doc.road_tax_expiry_date);
        }
        if (frm.doc.permit_expiry_date && frm.doc.permit_expiry_date < today) {
            warnings.push("Permit EXPIRED on " + frm.doc.permit_expiry_date);
        }

        if (warnings.length > 0) {
            frm.dashboard.set_headline_alert(
                '<div class="text-danger font-weight-bold">Compliance Alert: ' + warnings.join(' | ') + '</div>',
                'red'
            );
        }
    },
    last_odometer: function(frm) {
        if (frm.doc.last_odometer < 0) {
            frappe.msgprint(__('Odometer reading cannot be negative.'));
            frm.set_value('last_odometer', 0);
        }
    }
});
"""

    driver_client_script = """
frappe.ui.form.on('Driver', {
    setup: function(frm) {
        // Filter assigned_vehicle link to show Active or On Trip vehicles
        frm.set_query('assigned_vehicle', function() {
            return {
                filters: {
                    vehicle_status: ['in', ['Active', 'On Trip']]
                }
            };
        });
    },
    refresh: function(frm) {
        frm.trigger('check_driver_compliance');
    },
    check_driver_compliance: function(frm) {
        if (frm.is_new()) return;
        const today = frappe.datetime.get_today();
        let warnings = [];

        if (frm.doc.expiry_date && frm.doc.expiry_date < today) {
            warnings.push("Driving License EXPIRED on " + frm.doc.expiry_date);
        }
        if (frm.doc.medical_fitness_expiry && frm.doc.medical_fitness_expiry < today) {
            warnings.push("Medical Fitness EXPIRED on " + frm.doc.medical_fitness_expiry);
        }

        if (warnings.length > 0) {
            frm.dashboard.set_headline_alert(
                '<div class="text-danger font-weight-bold">Driver Alert: ' + warnings.join(' | ') + '</div>',
                'red'
            );
        }
    }
});
"""

    client_scripts = [
        {
            "name": "Vehicle - Fleet UI & Driver Filter",
            "dt": "Vehicle",
            "view": "Form",
            "script": vehicle_client_script,
            "enabled": 1
        },
        {
            "name": "Driver - Fleet UI & Vehicle Filter",
            "dt": "Driver",
            "view": "Form",
            "script": driver_client_script,
            "enabled": 1
        }
    ]

    for cs in client_scripts:
        if frappe.db.exists("Client Script", cs["name"]):
            doc = frappe.get_doc("Client Script", cs["name"])
            doc.update(cs)
            doc.save()
        else:
            doc = frappe.get_doc({"doctype": "Client Script", **cs})
            doc.insert()

    frappe.clear_cache(doctype="Vehicle")
    frappe.clear_cache(doctype="Driver")
    frappe.clear_cache()
    frappe.db.commit()
    print("SUCCESS_CONFIGURED_SCRIPTS")

run()
