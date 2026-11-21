"""
fix_driver_lifecycle_script.py
Fixes the latent bug in Server Script 'Employee - Driver Lifecycle Sync':
When auto-creating a Driver for an Employee with designation 'Driver',
ensures mandatory 'custom_mine_site' is populated from Employee or fallback active Mine Site,
and copies DL details if present.
"""

import frappe

def fix_driver_lifecycle_script():
    frappe.init(site="frontend")
    frappe.connect()

    script_name = "Employee - Driver Lifecycle Sync"
    if not frappe.db.exists("Server Script", script_name):
        print(f"Server script '{script_name}' not found!")
        return

    doc = frappe.get_doc("Server Script", script_name)
    
    updated_code = """# Server Script: Employee - Driver Lifecycle Sync (DocType: Employee, Event: After Save)
# Hardened for Batch 11A/11B — Strict 1:1 Lifecycle Synchronization & Safety Guards

emp_name = doc.name
emp_status = doc.status or "Active"
emp_designation = (doc.designation or "").strip()
emp_full_name = doc.employee_name or f"{doc.first_name} {doc.last_name or ''}".strip()
emp_cell = (doc.cell_number or "").strip() or None
emp_mine = doc.get("custom_mine_site")
emp_dl = doc.get("driving_license_number")
emp_dl_expiry = doc.get("driving_license_validity")
is_test = doc.get("custom_is_test_record") or doc.get("is_test_record") or 0

# Determine valid fallback mine site if Employee has none assigned
if not emp_mine:
    emp_mine = frappe.db.get_value("Mine Site", {"status": "Operational"}, "name") or frappe.db.get_value("Mine Site", {}, "name")

# 1. Check whether a Driver is already linked to this Employee
linked_driver = frappe.db.get_value(
    "Driver",
    {"employee": emp_name},
    ["name", "status", "expiry_date", "cell_number"],
    as_dict=True
)

if emp_designation.lower() == "driver":
    if linked_driver:
        # Existing linked Driver profile found.
        # Synchronize permitted identity fields only
        update_fields = {}
        if emp_full_name:
            update_fields["full_name"] = emp_full_name
        if emp_cell:
            update_fields["cell_number"] = emp_cell
        if emp_mine:
            update_fields["custom_mine_site"] = emp_mine
        if emp_dl:
            update_fields["license_number"] = emp_dl
        if emp_dl_expiry:
            update_fields["expiry_date"] = emp_dl_expiry
        
        # Status Synchronization with Driver Safety Guard
        if emp_status != "Active":
            # If Employee is Inactive, Suspended, or Left, Driver must be Suspended
            update_fields["status"] = "Suspended"
        else:
            # Employee is Active: Validate independent driver restrictions before activating
            driver_restricted = False
            today_str = str(frappe.utils.today())
            
            # Check licence expiry
            effective_expiry = emp_dl_expiry or linked_driver.expiry_date
            if not effective_expiry or str(effective_expiry) < today_str:
                driver_restricted = True
            
            # Check active rejected driving licence documents
            rejected_doc = frappe.db.get_value(
                "Driver Document",
                {
                    "driver": linked_driver.name,
                    "document_category": ["in", ["Driving License", "Driving Licence"]],
                    "verification_status": "Rejected",
                    "is_active": 1
                },
                "name"
            )
            if rejected_doc:
                driver_restricted = True
                
            if linked_driver.status == "Suspended" and not driver_restricted:
                # Driver was already Suspended (e.g. administrative suspension). Preserve Suspended status.
                pass
            elif not driver_restricted:
                update_fields["status"] = "Active"
            else:
                update_fields["status"] = "Suspended"
                frappe.msgprint(f"Employee '{emp_name}' is Active, but linked Fleet Driver '{linked_driver.name}' remains Suspended due to independent driver compliance restrictions.")

        if update_fields:
            frappe.db.set_value("Driver", linked_driver.name, update_fields, update_modified=False)
    else:
        # No Driver is linked to this Employee.
        # Check if an unlinked candidate Driver exists by name or phone
        candidate_drv = None
        if emp_full_name:
            candidate_drv = frappe.db.get_value(
                "Driver",
                {"full_name": emp_full_name, "employee": ["in", ["", None]]},
                "name"
            )
        if not candidate_drv and emp_cell:
            candidate_drv = frappe.db.get_value(
                "Driver",
                {"cell_number": emp_cell, "employee": ["in", ["", None]]},
                "name"
            )

        if candidate_drv:
            # Deterministically link existing unlinked Driver candidate
            frappe.db.set_value("Driver", candidate_drv, "employee", emp_name, update_modified=False)
            if emp_mine:
                frappe.db.set_value("Driver", candidate_drv, "custom_mine_site", emp_mine, update_modified=False)
            frappe.msgprint(
                f"Fleet Driver profile '{candidate_drv}' successfully linked to Employee '{emp_name}' ({emp_full_name}). Operational status and history preserved."
            )
        else:
            # No existing Driver matches: auto-create a new Driver linked to this Employee
            if emp_full_name:
                drv_doc = frappe.get_doc({
                    "doctype": "Driver",
                    "employee": emp_name,
                    "full_name": emp_full_name,
                    "cell_number": emp_cell,
                    "custom_mine_site": emp_mine,
                    "license_number": emp_dl or None,
                    "expiry_date": emp_dl_expiry or None,
                    "status": "Active" if (emp_dl_expiry and str(emp_dl_expiry) >= str(frappe.utils.today())) else "Suspended",
                    "safety_score": 100.0,
                    "is_test_record": is_test
                })
                drv_doc.insert(ignore_permissions=True)
                frappe.msgprint(
                    f"Fleet Driver profile '{drv_doc.name}' automatically created for Employee '{emp_name}'."
                )
            else:
                frappe.msgprint(f"Employee '{emp_name}' designated as Driver, but full name is missing. Driver profile creation skipped.")

else:
    # Designation is NOT Driver
    if linked_driver:
        frappe.db.set_value("Driver", linked_driver.name, "status", "Suspended", update_modified=False)
        frappe.msgprint(
            f"Employee '{emp_name}' designation is '{emp_designation}'. Linked Driver profile '{linked_driver.name}' status set to Suspended to prevent new allocations."
        )

# Employee Deactivation Safety (status != Active)
if linked_driver and emp_status != "Active":
    frappe.db.set_value("Driver", linked_driver.name, "status", "Suspended", update_modified=False)
"""

    doc.script = updated_code
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    print("Successfully updated 'Employee - Driver Lifecycle Sync' Server Script!")

if __name__ == "__main__":
    fix_driver_lifecycle_script()
