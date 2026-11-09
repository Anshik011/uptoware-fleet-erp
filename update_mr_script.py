import frappe

def update():
    frappe.init("frontend")
    frappe.connect()

    script = """# SERVER SCRIPT: Material Request - Fleet Procurement Validation
# Auto-populate from Vehicle Breakdown if specified
if doc.custom_vehicle_breakdown:
    bkd = frappe.db.get_value("Vehicle Breakdown", doc.custom_vehicle_breakdown, ["vehicle", "mine_site", "is_test_record", "workflow_state"], as_dict=True)
    if bkd:
        if not doc.custom_vehicle:
            doc.custom_vehicle = bkd.vehicle
        if not doc.custom_mine_site:
            doc.custom_mine_site = bkd.mine_site
        if bkd.is_test_record:
            doc.custom_is_test_record = 1

# Propagate test record from vehicle
if doc.custom_vehicle and not doc.custom_is_test_record:
    if frappe.db.get_value("Vehicle", doc.custom_vehicle, "is_test_record"):
        doc.custom_is_test_record = 1

user_roles = frappe.get_roles(frappe.session.user)

# Validation before submission
if doc.docstatus == 1:
    is_allowed = False
    for r in ["Store Manager", "Fleet Manager", "Workshop Supervisor", "System Manager"]:
        if r in user_roles:
            is_allowed = True
            break
            
    if not is_allowed and frappe.session.user != "Administrator":
        frappe.throw("Unauthorized: Material Request submission is restricted to Store Managers, Fleet Managers, and Workshop Supervisors.")

    # Audit stamping
    if not doc.custom_approved_by:
        doc.custom_approved_by = frappe.session.user
    if not doc.custom_approved_on:
        doc.custom_approved_on = frappe.utils.now_datetime()

# Workshop Supervisor guard
if "Workshop Supervisor" in user_roles and "System Manager" not in user_roles and "Fleet Manager" not in user_roles and "Store Manager" not in user_roles:
    if not doc.custom_vehicle_breakdown:
        frappe.throw("Workshop Supervisor can only raise Material Requests linked to an authorized Vehicle Breakdown.")

# Validate linked breakdown status
if doc.custom_vehicle_breakdown:
    b_status = frappe.db.get_value("Vehicle Breakdown", doc.custom_vehicle_breakdown, "workflow_state")
    if b_status in ["Reported", "Rejected", "Closed"]:
        frappe.throw(f"Cannot raise Material Request against Vehicle Breakdown '{doc.custom_vehicle_breakdown}' with status '{b_status}'. Breakdown must be Approved or in Workshop.")

# Validate items and quantities
for it in doc.items:
    if (it.qty or 0) <= 0:
        frappe.throw(f"Item {it.item_code} must have quantity greater than 0.")
    if it.warehouse:
        wh_company = frappe.db.get_value("Warehouse", it.warehouse, "company")
        if wh_company != doc.company:
            frappe.throw(f"Warehouse {it.warehouse} does not belong to company {doc.company}.")
"""

    ss = frappe.get_doc("Server Script", "Material Request - Fleet Procurement Validation")
    ss.script = script
    ss.save()
    frappe.db.commit()
    print("Updated Material Request Server Script successfully.")

if __name__ == "__main__":
    update()
