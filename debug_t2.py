import frappe
from frappe.model.workflow import apply_workflow

frappe.set_user("Administrator")
veh_plate = "KA-19-MG-9001"
driver_name = frappe.db.get_value("Driver", {"full_name": "Rajesh Kumar"}, "name")
mine_site = "Kudremukh North Pit"
last_odo = frappe.db.get_value("Vehicle", veh_plate, "last_odometer") or 80000

bkd = frappe.get_doc({
    "doctype": "Vehicle Breakdown",
    "breakdown_datetime": "2026-11-04 10:00:00",
    "vehicle": veh_plate,
    "driver": driver_name,
    "mine_site": mine_site,
    "odometer_reading": last_odo + 100,
    "breakdown_type": "Hydraulic",
    "severity": "Medium",
    "description": "Test approval stamps protection",
    "is_test_record": 1
}).insert(ignore_permissions=True)

apply_workflow(bkd, "Approve")
apply_workflow(bkd, "Send to Workshop")
print("STATUS IN WORKSHOP:", bkd.repair_status)

frappe.set_user("test_perm_workshop@example.com")
doc_ws = frappe.get_doc("Vehicle Breakdown", bkd.name)
print("LOADED AS WORKSHOP SUPERVISOR:", frappe.session.user)

blocked = False
try:
    doc_ws.approved_by = "test_perm_fleet@example.com"
    doc_ws.save()
except frappe.ValidationError as e:
    blocked = True
    print("SUCCESSFULLY BLOCKED BY SERVER SCRIPT:", e)
except frappe.PermissionError as e:
    blocked = True
    print("BLOCKED BY PERMISSION ERROR:", e)

print("Tamper blocked:", blocked)
