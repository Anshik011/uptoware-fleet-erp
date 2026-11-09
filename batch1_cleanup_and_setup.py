import frappe

def run():
    print("=== STARTING BATCH 1 CLEANUP & SETUP ===")

    # 1. REMOVE GPS CUSTOM FIELD
    if frappe.db.exists("Custom Field", "Vehicle-gps_device_id"):
        frappe.delete_doc("Custom Field", "Vehicle-gps_device_id")
        print("Removed Custom Field 'Vehicle-gps_device_id'.")
    else:
        print("Custom Field 'Vehicle-gps_device_id' does not exist or already removed.")

    # Ensure assigned_driver insert_after points to payload_capacity_tons
    if frappe.db.exists("Custom Field", "Vehicle-assigned_driver"):
        drv_field = frappe.get_doc("Custom Field", "Vehicle-assigned_driver")
        drv_field.insert_after = "payload_capacity_tons"
        drv_field.save()
        print("Updated 'Vehicle-assigned_driver' insert_after to 'payload_capacity_tons'.")

    # 2. ADD 'is_test_record' CUSTOM FIELD TO VEHICLE AND DRIVER
    if not frappe.db.exists("Custom Field", "Vehicle-is_test_record"):
        cf_v = frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Vehicle",
            "fieldname": "is_test_record",
            "label": "Is Test Record",
            "fieldtype": "Check",
            "default": "0",
            "in_list_view": 1,
            "in_standard_filter": 1,
            "insert_after": "vehicle_status"
        })
        cf_v.insert()
        print("Created Custom Field 'Vehicle-is_test_record'.")

    if not frappe.db.exists("Custom Field", "Driver-is_test_record"):
        cf_d = frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Driver",
            "fieldname": "is_test_record",
            "label": "Is Test Record",
            "fieldtype": "Check",
            "default": "0",
            "in_list_view": 1,
            "in_standard_filter": 1,
            "insert_after": "status"
        })
        cf_d.insert()
        print("Created Custom Field 'Driver-is_test_record'.")

    # 3. TAG EXISTING BATCH 1 TEST RECORDS
    test_vehicles = ["KA-19-MG-8801", "KA-19-MG-8802"]
    for v in test_vehicles:
        if frappe.db.exists("Vehicle", v):
            frappe.db.set_value("Vehicle", v, "is_test_record", 1)
            print(f"Tagged Vehicle '{v}' as test record (is_test_record = 1).")

    test_driver_names = ["Rajesh Kumar", "Vikram Singh", "Suresh Inactive"]
    for d_name in test_driver_names:
        drv_ids = frappe.get_all("Driver", filters={"full_name": d_name}, pluck="name")
        for d_id in drv_ids:
            frappe.db.set_value("Driver", d_id, "is_test_record", 1)
            print(f"Tagged Driver '{d_id}' ({d_name}) as test record (is_test_record = 1).")

    # 4. UPDATE SERVER SCRIPTS WITH ENHANCED LOGIC
    vehicle_script_before_save = """# Validate Odometer
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

    vehicle_script_after_save = """# Synchronize assigned driver
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

    driver_script_before_save = """# Check status change while assigned
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

    driver_script_after_save = """# Synchronize assigned vehicle
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
            "script": vehicle_script_before_save,
            "disabled": 0
        },
        {
            "name": "Vehicle - Sync Driver After Save",
            "script_type": "DocType Event",
            "reference_doctype": "Vehicle",
            "doctype_event": "After Save",
            "script": vehicle_script_after_save,
            "disabled": 0
        },
        {
            "name": "Driver - Validate Vehicle Assignment",
            "script_type": "DocType Event",
            "reference_doctype": "Driver",
            "doctype_event": "Before Save",
            "script": driver_script_before_save,
            "disabled": 0
        },
        {
            "name": "Driver - Sync Vehicle After Save",
            "script_type": "DocType Event",
            "reference_doctype": "Driver",
            "doctype_event": "After Save",
            "script": driver_after_save if False else driver_script_after_save,
            "disabled": 0
        }
    ]

    for s in server_scripts:
        if frappe.db.exists("Server Script", s["name"]):
            doc = frappe.get_doc("Server Script", s["name"])
            doc.update(s)
            doc.save()
            print(f"Updated Server Script '{s['name']}'.")
        else:
            doc = frappe.get_doc({"doctype": "Server Script", **s})
            doc.insert()
            print(f"Created Server Script '{s['name']}'.")

    # Clear caches
    frappe.clear_cache(doctype="Vehicle")
    frappe.clear_cache(doctype="Driver")
    frappe.clear_cache()
    frappe.db.commit()
    print("=== CLEANUP & SETUP COMPLETED SUCCESSFULLY ===")

run()
