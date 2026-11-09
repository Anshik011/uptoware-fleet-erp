import frappe

def extend_fleet_settings():
    frappe.init("frontend")
    frappe.connect()

    doc = frappe.get_doc("DocType", "Fleet Settings")
    existing_fieldnames = [f.fieldname for f in doc.fields]

    new_fields = [
        {"fieldname": "sec_notifications", "label": "Fleet Alerts & Notifications Configuration", "fieldtype": "Section Break"},
        {"fieldname": "enable_fleet_notifications", "label": "Enable Fleet Alerts & Notifications", "fieldtype": "Check", "default": "1"},
        {"fieldname": "enable_in_app_notifications", "label": "Enable Desk / In-App Notifications", "fieldtype": "Check", "default": "1"},
        {"fieldname": "enable_email_notifications", "label": "Enable Background Email Notifications", "fieldtype": "Check", "default": "1"},

        {"fieldname": "sec_cat_toggles", "label": "Alert Category Toggles", "fieldtype": "Section Break"},
        {"fieldname": "enable_vehicle_driver_alerts", "label": "Enable Vehicle & Driver Alerts", "fieldtype": "Check", "default": "1"},
        {"fieldname": "enable_trip_alerts", "label": "Enable Trip Operations Alerts", "fieldtype": "Check", "default": "1"},
        {"fieldname": "enable_fuel_alerts", "label": "Enable Fuel Alerts", "fieldtype": "Check", "default": "1"},
        {"fieldname": "enable_maintenance_alerts", "label": "Enable Maintenance & Workshop Alerts", "fieldtype": "Check", "default": "1"},
        {"fieldname": "col_break_cat", "label": "", "fieldtype": "Column Break"},
        {"fieldname": "enable_inventory_alerts", "label": "Enable Inventory Alerts", "fieldtype": "Check", "default": "1"},
        {"fieldname": "enable_procurement_alerts", "label": "Enable Procurement Alerts", "fieldtype": "Check", "default": "1"},
        {"fieldname": "enable_insurance_compliance_alerts", "label": "Enable Insurance & Compliance Alerts", "fieldtype": "Check", "default": "1"},
        {"fieldname": "enable_financial_alerts", "label": "Enable Revenue & Financial Alerts", "fieldtype": "Check", "default": "1"},

        {"fieldname": "sec_role_routing", "label": "Alert Category Role Routing", "fieldtype": "Section Break"},
        {"fieldname": "vehicle_driver_alert_role", "label": "Vehicle & Driver Recipient Role", "fieldtype": "Link", "options": "Role", "default": "Fleet Manager"},
        {"fieldname": "trip_alert_role", "label": "Trip Operations Recipient Role", "fieldtype": "Link", "options": "Role", "default": "Fleet Manager"},
        {"fieldname": "fuel_alert_role", "label": "Fuel Recipient Role", "fieldtype": "Link", "options": "Role", "default": "Fleet Manager"},
        {"fieldname": "maintenance_alert_role", "label": "Maintenance Recipient Role", "fieldtype": "Link", "options": "Role", "default": "Workshop Supervisor"},
        {"fieldname": "col_break_roles", "label": "", "fieldtype": "Column Break"},
        {"fieldname": "inventory_alert_role", "label": "Inventory Recipient Role", "fieldtype": "Link", "options": "Role", "default": "Store Manager"},
        {"fieldname": "procurement_alert_role", "label": "Procurement Recipient Role", "fieldtype": "Link", "options": "Role", "default": "Store Manager"},
        {"fieldname": "insurance_compliance_alert_role", "label": "Insurance & Compliance Recipient Role", "fieldtype": "Link", "options": "Role", "default": "Fleet Manager"},
        {"fieldname": "financial_alert_role", "label": "Financial Recipient Role", "fieldtype": "Link", "options": "Role", "default": "Accountant"},

        {"fieldname": "sec_thresholds", "label": "Operational & Escalation Thresholds", "fieldtype": "Section Break"},
        {"fieldname": "min_fuel_efficiency_kml", "label": "Min Fuel Efficiency Threshold (KM/L)", "fieldtype": "Float", "default": "2.5"},
        {"fieldname": "breakdown_escalation_hours", "label": "Breakdown Escalation Window (Hours)", "fieldtype": "Int", "default": "48"},
        {"fieldname": "repeated_breakdown_threshold", "label": "Repeated Breakdown Count Threshold", "fieldtype": "Int", "default": "3"},
        {"fieldname": "repeated_breakdown_window_days", "label": "Repeated Breakdown Window (Days)", "fieldtype": "Int", "default": "30"},
        {"fieldname": "col_break_thresh", "label": "", "fieldtype": "Column Break"},
        {"fieldname": "receivables_alert_threshold", "label": "Receivables Alert Threshold (₹)", "fieldtype": "Currency", "default": "500000.0"},
        {"fieldname": "reminder_frequency_hours", "label": "Unresolved Alert Reminder Interval (Hours)", "fieldtype": "Int", "default": "24"},
        {"fieldname": "max_reminder_count", "label": "Max Reminder Count per Alert", "fieldtype": "Int", "default": "5"}
    ]

    added = 0
    for nf in new_fields:
        if nf["fieldname"] not in existing_fieldnames:
            doc.append("fields", nf)
            added += 1

    if added > 0:
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        print(f"Added {added} fields to Fleet Settings DocType.")
    else:
        print("All notification fields already present in Fleet Settings DocType.")

    # Now ensure defaults are populated in the Fleet Settings single document
    fs = frappe.get_single("Fleet Settings")
    defaults = {
        "enable_fleet_notifications": 1,
        "enable_in_app_notifications": 1,
        "enable_email_notifications": 1,
        "enable_vehicle_driver_alerts": 1,
        "enable_trip_alerts": 1,
        "enable_fuel_alerts": 1,
        "enable_maintenance_alerts": 1,
        "enable_inventory_alerts": 1,
        "enable_procurement_alerts": 1,
        "enable_insurance_compliance_alerts": 1,
        "enable_financial_alerts": 1,
        "vehicle_driver_alert_role": "Fleet Manager",
        "trip_alert_role": "Fleet Manager",
        "fuel_alert_role": "Fleet Manager",
        "maintenance_alert_role": "Workshop Supervisor",
        "inventory_alert_role": "Store Manager",
        "procurement_alert_role": "Store Manager",
        "insurance_compliance_alert_role": "Fleet Manager",
        "financial_alert_role": "Accountant",
        "min_fuel_efficiency_kml": 2.5,
        "breakdown_escalation_hours": 48,
        "repeated_breakdown_threshold": 3,
        "repeated_breakdown_window_days": 30,
        "receivables_alert_threshold": 500000.0,
        "reminder_frequency_hours": 24,
        "max_reminder_count": 5
    }

    changed = False
    for k, v in defaults.items():
        if fs.get(k) is None:
            fs.set(k, v)
            changed = True

    if changed:
        fs.save(ignore_permissions=True)
        frappe.db.commit()
        print("Updated Fleet Settings single document with default values.")
    else:
        print("Fleet Settings single document already has notification values.")

if __name__ == "__main__":
    extend_fleet_settings()

