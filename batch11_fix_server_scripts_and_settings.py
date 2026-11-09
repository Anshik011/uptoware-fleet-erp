import frappe

def fix_settings_and_scripts():
    frappe.init("frontend")
    frappe.connect()

    # 1. Update Fleet Settings single doc
    fs = frappe.get_doc("Fleet Settings")
    toggles = [
        "enable_fleet_notifications",
        "enable_in_app_notifications",
        "enable_email_notifications",
        "enable_vehicle_driver_alerts",
        "enable_trip_alerts",
        "enable_fuel_alerts",
        "enable_maintenance_alerts",
        "enable_inventory_alerts",
        "enable_procurement_alerts",
        "enable_insurance_compliance_alerts",
        "enable_financial_alerts"
    ]
    for t in toggles:
        fs.set(t, 1)
    fs.save(ignore_permissions=True)
    frappe.db.commit()
    print("Fleet Settings notification toggles set to 1.")

    # 2. Replace frappe.get_single with frappe.get_doc across all Server Scripts
    scripts = frappe.get_all("Server Script", fields=["name", "script"])
    for s in scripts:
        if "get_single(" in s.script:
            new_script = s.script.replace('frappe.get_single("Fleet Settings")', 'frappe.get_doc("Fleet Settings")')
            new_script = new_script.replace("frappe.get_single('Fleet Settings')", "frappe.get_doc('Fleet Settings')")
            doc = frappe.get_doc("Server Script", s.name)
            doc.script = new_script
            doc.save(ignore_permissions=True)
            print(f"Updated Server Script {s.name}: replaced get_single with get_doc.")

    frappe.db.commit()
    print("All Server Scripts successfully updated.")

if __name__ == "__main__":
    fix_settings_and_scripts()

