import frappe

def update():
    frappe.init("frontend")
    frappe.connect()

    script = """# SERVER SCRIPT: Vehicle Insurance Policy - Validations & Lifecycle
# 1. Mandatory Validations
if not doc.vehicle:
    frappe.throw("Vehicle is mandatory for insurance policy.")
if not doc.insurance_company or not doc.insurance_company.strip():
    frappe.throw("Insurance Company is mandatory.")
if not doc.policy_no or not doc.policy_no.strip():
    frappe.throw("Policy Number is mandatory.")
if not doc.start_date:
    frappe.throw("Policy Start Date is mandatory.")
if not doc.end_date:
    frappe.throw("Policy Expiry Date is mandatory.")
if doc.premium_amount is None or float(doc.premium_amount) < 0:
    frappe.throw("Premium Amount must be a positive number or zero.")

# 2. Date Sequence Validation
if frappe.utils.getdate(doc.end_date) < frappe.utils.getdate(doc.start_date):
    frappe.throw(f"Policy Expiry Date ({doc.end_date}) cannot precede Start Date ({doc.start_date}).")

# 3. Test Record Inheritance
if not doc.is_test_record and doc.vehicle:
    v_test = frappe.db.get_value("Vehicle", doc.vehicle, "is_test_record")
    if v_test:
        doc.is_test_record = 1

# 4. Role Authorization Helper
user = frappe.session.user
user_roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (user,))]
can_manage = ("Fleet Manager" in user_roles) or ("System Manager" in user_roles) or (user == "Administrator")

# 5. Protect Audit Fields from manual client edit
if doc.get_doc_before_save():
    old = doc.get_doc_before_save()
    if not ("System Manager" in user_roles or user == "Administrator"):
        if doc.approved_by != old.approved_by or doc.approved_on != old.approved_on:
            frappe.throw("Manual modification of approval audit fields is strictly prohibited.")
        if doc.cancelled_by != old.cancelled_by or doc.cancelled_on != old.cancelled_on:
            frappe.throw("Manual modification of cancellation audit fields is strictly prohibited.")

# 6. Policy Status Transitions & Controls
old_status = doc.get_doc_before_save().get("policy_status") if doc.get_doc_before_save() else None
new_status = doc.policy_status

# A. Activation Control
if new_status == "Active":
    if not can_manage:
        frappe.throw("Only Fleet Managers or System Managers are authorized to activate an insurance policy.")
    
    is_admin_or_sm = ("System Manager" in user_roles) or (user == "Administrator")
    if not is_admin_or_sm and doc.owner == user and old_status != "Active":
        frappe.throw("Self-approval prohibited: Users are not permitted to activate insurance policies they created. Activation must be performed by an independent authorized Fleet Manager.")

    # Overlapping Active Policy Prevention on same vehicle
    overlaps = frappe.db.sql(\"\"\"
        SELECT name, policy_no, start_date, end_date
        FROM `tabVehicle Insurance Policy`
        WHERE vehicle = %s
          AND policy_status = 'Active'
          AND name != %s
          AND start_date <= %s
          AND end_date >= %s
    \"\"\", (doc.vehicle, doc.name or "NEW", doc.end_date, doc.start_date), as_dict=True)
    
    if overlaps:
        frappe.throw(f"Vehicle '{doc.vehicle}' already has an active insurance policy '{overlaps[0].name}' (Policy No: {overlaps[0].policy_no}) covering period {overlaps[0].start_date} to {overlaps[0].end_date}. Overlapping active policy periods are strictly prohibited.")
    
    # Stamp Approval
    if not doc.approved_by:
        doc.approved_by = user
        doc.approved_on = frappe.utils.now_datetime()

# B. Cancellation Control
elif new_status == "Cancelled":
    if not can_manage:
        frappe.throw("Only Fleet Managers or System Managers are authorized to cancel an insurance policy.")
    if not doc.cancellation_reason or not doc.cancellation_reason.strip():
        frappe.throw("Cancellation reason is mandatory when cancelling an insurance policy.")
    if not doc.cancelled_by:
        doc.cancelled_by = user
        doc.cancelled_on = frappe.utils.now_datetime()

# C. Expired transition validation
elif new_status == "Expired":
    if frappe.utils.getdate(doc.end_date) >= frappe.utils.getdate():
        if not ("System Manager" in user_roles or user == "Administrator"):
            frappe.throw(f"Policy '{doc.policy_no}' cannot be marked Expired because its end date ({doc.end_date}) is in the future.")
"""

    ss = frappe.get_doc("Server Script", "Vehicle Insurance Policy - Validations & Lifecycle")
    ss.script = script
    ss.save()
    frappe.db.commit()
    print("Updated Vehicle Insurance Policy Server Script successfully.")

if __name__ == "__main__":
    update()

