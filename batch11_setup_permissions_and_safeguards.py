import frappe

def setup_alert_permissions_and_safeguards():
    frappe.init("frontend")
    frappe.connect()

    # 1. Permission Query Server Script
    pq_name = "Fleet Alert Log - Role Permission Query"
    pq_script = """roles = frappe.get_roles(user)
if "System Manager" in roles or "Fleet Manager" in roles or user == "Administrator":
    conditions = ""
elif "Accountant" in roles:
    conditions = "`tabFleet Alert Log`.alert_category IN ('Revenue & Financial', 'Insurance & Compliance', 'Vehicle & Driver')"
elif "Workshop Supervisor" in roles:
    conditions = "`tabFleet Alert Log`.alert_category IN ('Maintenance & Workshop', 'Inventory', 'Vehicle & Driver')"
elif "Store Manager" in roles:
    conditions = "`tabFleet Alert Log`.alert_category IN ('Inventory', 'Procurement')"
else:
    conditions = "1=0"
"""
    if frappe.db.exists("Server Script", pq_name):
        doc = frappe.get_doc("Server Script", pq_name)
        doc.script = pq_script
        doc.script_type = "Permission Query"
        doc.reference_doctype = "Fleet Alert Log"
        doc.disabled = 0
        doc.save(ignore_permissions=True)
        print(f"Updated Server Script: {pq_name}")
    else:
        doc = frappe.get_doc({
            "doctype": "Server Script",
            "name": pq_name,
            "script_type": "Permission Query",
            "reference_doctype": "Fleet Alert Log",
            "disabled": 0,
            "script": pq_script
        })
        doc.insert(ignore_permissions=True)
        print(f"Created Server Script: {pq_name}")

    # 2. Audit Trail & Auto-stamps (Before Save)
    bs_name = "Fleet Alert Log - Audit Validations"
    bs_script = """if not doc.is_new():
    now_dt = frappe.utils.now_datetime()
    curr_user = frappe.session.user or "Administrator"
    
    if doc.status == "Acknowledged" and not doc.acknowledged_by:
        doc.acknowledged_by = curr_user
        doc.acknowledged_on = now_dt
    elif doc.status == "Resolved" and not doc.resolved_by:
        doc.resolved_by = curr_user
        doc.resolved_on = now_dt
"""
    if frappe.db.exists("Server Script", bs_name):
        doc = frappe.get_doc("Server Script", bs_name)
        doc.script = bs_script
        doc.script_type = "DocType Event"
        doc.reference_doctype = "Fleet Alert Log"
        doc.doctype_event = "Before Save"
        doc.disabled = 0
        doc.save(ignore_permissions=True)
        print(f"Updated Server Script: {bs_name}")
    else:
        doc = frappe.get_doc({
            "doctype": "Server Script",
            "name": bs_name,
            "script_type": "DocType Event",
            "reference_doctype": "Fleet Alert Log",
            "doctype_event": "Before Save",
            "disabled": 0,
            "script": bs_script
        })
        doc.insert(ignore_permissions=True)
        print(f"Created Server Script: {bs_name}")

    # 3. Deletion Safeguard (Before Delete)
    bd_name = "Fleet Alert Log - Deletion Safeguard"
    bd_script = """roles = frappe.get_roles(frappe.session.user)
if "System Manager" not in roles and not doc.is_test_record:
    frappe.throw("Physical deletion of Fleet Alert Log records is strictly prohibited. Resolve the alert instead.")
"""
    if frappe.db.exists("Server Script", bd_name):
        doc = frappe.get_doc("Server Script", bd_name)
        doc.script = bd_script
        doc.script_type = "DocType Event"
        doc.reference_doctype = "Fleet Alert Log"
        doc.doctype_event = "Before Delete"
        doc.disabled = 0
        doc.save(ignore_permissions=True)
        print(f"Updated Server Script: {bd_name}")
    else:
        doc = frappe.get_doc({
            "doctype": "Server Script",
            "name": bd_name,
            "script_type": "DocType Event",
            "reference_doctype": "Fleet Alert Log",
            "doctype_event": "Before Delete",
            "disabled": 0,
            "script": bd_script
        })
        doc.insert(ignore_permissions=True)
        print(f"Created Server Script: {bd_name}")

    frappe.db.commit()
    print("Security and safeguards successfully installed.")

if __name__ == "__main__":
    setup_alert_permissions_and_safeguards()

