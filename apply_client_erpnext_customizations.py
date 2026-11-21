"""
apply_client_erpnext_customizations.py
Applies all client-requested DocType customizations natively in ERPNext / Frappe:
1. Vehicle: Add 'custom_transport_type' (Transport / Non Transport), hide 'assigned_driver'
2. Employee: Add statutory mining fields (Father/Spouse Name, Skill Category, PF Type, UAN/CMPF, Social Category, DL No/Validity, VT No/Period, Form O)
3. Fleet Lead: Change 'lead_km' to Data format (accepting '3-4', '4-5')
4. Mining Trip: Update 'custom_shift' options to Shift A / Shift B / Shift C
5. Employee Attendance: Update 'shift' options to Shift A / Shift B / Shift C
6. Vehicle Driver Shift Allocation: Update 'shift_type' options to include Shift A / Shift B / Shift C
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def run_customizations():
    frappe.init(site="frontend")
    frappe.connect()

    print("=== 1. CUSTOMIZING VEHICLE DOCTYPE ===")
    custom_vehicle_fields = {
        "Vehicle": [
            {
                "fieldname": "custom_transport_type",
                "label": "Vehicle Type",
                "fieldtype": "Select",
                "options": "Transport\nNon Transport",
                "default": "Transport",
                "insert_after": "make",
                "in_list_view": 1,
                "in_standard_filter": 1,
            }
        ]
    }
    create_custom_fields(custom_vehicle_fields, ignore_validate=True)
    print("Added 'custom_transport_type' (Transport / Non Transport) to Vehicle.")

    # Property Setter to hide assigned_driver if desired in ERPNext Desk
    if frappe.db.exists("DocField", {"parent": "Vehicle", "fieldname": "assigned_driver"}):
        frappe.make_property_setter({
            "doctype": "Vehicle",
            "fieldname": "assigned_driver",
            "property": "hidden",
            "value": "1",
            "property_type": "Check"
        }, ignore_validate=True)
        print("Set assigned_driver to hidden in Vehicle DocType.")

    print("\n=== 2. CUSTOMIZING EMPLOYEE DOCTYPE ===")
    custom_employee_fields = {
        "Employee": [
            {
                "fieldname": "father_or_spouse_name",
                "label": "Father's/Mother's/Spouse Name",
                "fieldtype": "Data",
                "reqd": 1,
                "insert_after": "employee_name",
                "in_list_view": 1,
            },
            {
                "fieldname": "skill_category",
                "label": "Skill Category",
                "fieldtype": "Select",
                "options": "SKILL\nSEMI SKILL\nUNSKILL",
                "default": "SKILL",
                "insert_after": "designation",
                "in_list_view": 1,
                "in_standard_filter": 1,
            },
            {
                "fieldname": "pf_type",
                "label": "PF Type",
                "fieldtype": "Select",
                "options": "CMPF\nPF",
                "default": "CMPF",
                "insert_after": "skill_category",
            },
            {
                "fieldname": "uan_or_cmpf_no",
                "label": "UAN(EPF)/CMPF No",
                "fieldtype": "Data",
                "insert_after": "pf_type",
            },
            {
                "fieldname": "social_category",
                "label": "Social Category",
                "fieldtype": "Select",
                "options": "OBC\nSC\nST\nGENERAL",
                "default": "GENERAL",
                "insert_after": "uan_or_cmpf_no",
            },
            {
                "fieldname": "driving_license_number",
                "label": "DL No",
                "fieldtype": "Data",
                "insert_after": "social_category",
            },
            {
                "fieldname": "driving_license_validity",
                "label": "DL Validity",
                "fieldtype": "Date",
                "insert_after": "driving_license_number",
            },
            {
                "fieldname": "vt_no",
                "label": "VT No",
                "fieldtype": "Data",
                "insert_after": "driving_license_validity",
            },
            {
                "fieldname": "vt_period",
                "label": "VT Period",
                "fieldtype": "Data",
                "insert_after": "vt_no",
            },
            {
                "fieldname": "form_o_done",
                "label": "O Form",
                "fieldtype": "Select",
                "options": "YES\nNO",
                "default": "YES",
                "insert_after": "vt_period",
            },
        ]
    }
    create_custom_fields(custom_employee_fields, ignore_validate=True)
    print("Added all 10 statutory mining compliance fields to Employee.")

    print("\n=== 3. CUSTOMIZING FLEET LEAD (LEAD NAME ENTRY) ===")
    if frappe.db.exists("DocType", "Fleet Lead"):
        frappe.db.sql("ALTER TABLE `tabFleet Lead` MODIFY COLUMN `lead_km` VARCHAR(140) DEFAULT '0'")
        fl_doc = frappe.get_doc("DocType", "Fleet Lead")
        for df in fl_doc.fields:
            if df.fieldname == "lead_km":
                df.fieldtype = "Data"
                df.label = "Distance (One-Way KM)"
        fl_doc.save(ignore_permissions=True)
        print("Updated Fleet Lead: 'lead_km' converted to Data type (supports '3-4', '4-5').")

    print("\n=== 4. CUSTOMIZING MINING TRIP SHIFTS ===")
    if frappe.db.exists("DocType", "Mining Trip"):
        frappe.make_property_setter({
            "doctype": "Mining Trip",
            "fieldname": "custom_shift",
            "property": "options",
            "value": "Shift A\nShift B\nShift C\nDay\nNight\nGeneral",
            "property_type": "Text"
        }, ignore_validate=True)
        print("Updated Mining Trip: 'custom_shift' options updated to include Shift A, Shift B, Shift C.")

    print("\n=== 5. CUSTOMIZING SHIFTS IN ATTENDANCE & ALLOCATION ===")
    if frappe.db.exists("DocType", "Employee Attendance"):
        frappe.make_property_setter({
            "doctype": "Employee Attendance",
            "fieldname": "shift",
            "property": "options",
            "value": "Shift A\nShift B\nShift C\nDay\nNight\nGeneral",
            "property_type": "Text"
        }, ignore_validate=True)
        print("Updated Employee Attendance: 'shift' options updated to Shift A, Shift B, Shift C.")

    if frappe.db.exists("DocType", "Vehicle Driver Shift Allocation"):
        frappe.make_property_setter({
            "doctype": "Vehicle Driver Shift Allocation",
            "fieldname": "shift_type",
            "property": "options",
            "value": "Shift A\nShift B\nShift C\nMorning (06:00 - 14:00)\nAfternoon (14:00 - 22:00)\nNight (22:00 - 06:00)\nGeneral / Full Day",
            "property_type": "Text"
        }, ignore_validate=True)
        print("Updated Vehicle Driver Shift Allocation: 'shift_type' options updated to Shift A, Shift B, Shift C.")

    frappe.db.commit()
    print("\nAll native ERPNext customizations applied and committed successfully!")

if __name__ == "__main__":
    run_customizations()
