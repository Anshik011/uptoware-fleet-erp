import frappe

def remediate_scripts():
    frappe.init("frontend")
    frappe.connect()

    # 1. Update Permission Query Server Script
    pq_name = "Fleet Alert Log - Role Permission Query"
    pq_script = """roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (user,))]
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
    doc = frappe.get_doc("Server Script", pq_name)
    doc.script = pq_script
    doc.save(ignore_permissions=True)
    print("Remediated Permission Query script.")

    # 2. Update Deletion Safeguard Server Script
    bd_name = "Fleet Alert Log - Deletion Safeguard"
    bd_script = """user = frappe.session.user or "Administrator"
roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (user,))]
if "System Manager" not in roles and user != "Administrator" and not doc.is_test_record:
    frappe.throw("Physical deletion of Fleet Alert Log records is strictly prohibited. Resolve the alert instead.")
"""
    doc = frappe.get_doc("Server Script", bd_name)
    doc.script = bd_script
    doc.save(ignore_permissions=True)
    print("Remediated Deletion Safeguard script.")

    # 3. Update Scheduler Server Scripts with tabVehicle joins
    sched_names = [
        "Fleet Management - Daily Expiry Monitoring Scheduler",
        "Fleet Management - Expiry Monitoring & Notifications"
    ]

    for s_name in sched_names:
        s_doc = frappe.get_doc("Server Script", s_name)
        # Update the open breakdowns query to join tabVehicle
        s_doc.script = s_doc.script.replace(
            "FROM `tabVehicle Breakdown`\n        WHERE repair_status NOT IN ('Repaired', 'Closed')",
            "FROM `tabVehicle Breakdown` vb\n        JOIN `tabVehicle` v ON v.name = vb.vehicle\n        WHERE vb.repair_status NOT IN ('Repaired', 'Closed')"
        )
        s_doc.script = s_doc.script.replace("ob.vehicle", "ob.vehicle")
        s_doc.script = s_doc.script.replace(
            "FROM `tabVehicle Breakdown`\n        WHERE breakdown_datetime >=",
            "FROM `tabVehicle Breakdown` vb\n        JOIN `tabVehicle` v ON v.name = vb.vehicle\n        WHERE vb.breakdown_datetime >="
        )
        s_doc.save(ignore_permissions=True)
        print(f"Remediated {s_name} with vehicle joins.")

    frappe.db.commit()
    print("Script remediations applied successfully.")

if __name__ == "__main__":
    remediate_scripts()

