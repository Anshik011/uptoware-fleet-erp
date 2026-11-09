import frappe

def update_fleet_settings_validations():
    frappe.init("frontend")
    frappe.connect()

    script_content = """# Validate warning_window_days
if doc.warning_window_days is None or int(doc.warning_window_days) <= 0:
    frappe.throw("Expiry Warning Window must be a positive integer greater than zero (e.g. 30).")

# Validate reminder_intervals
if not doc.reminder_intervals or not doc.reminder_intervals.strip():
    frappe.throw("Reminder Milestones cannot be empty. Please specify a comma-separated list of milestone days (e.g. '30, 15, 7, 0').")

raw_parts = doc.reminder_intervals.split(",")
valid_intervals = []
for p in raw_parts:
    p_clean = p.strip()
    if not p_clean:
        continue
    try:
        val = int(p_clean)
        if val < 0:
            frappe.throw(f"Reminder milestone '{p_clean}' cannot be negative. Milestones must be non-negative integers.")
        valid_intervals.append(val)
    except ValueError:
        frappe.throw(f"Invalid reminder milestone '{p_clean}'. Reminder milestones must be a comma-separated list of integers (e.g. '30, 15, 7, 0').")

if not valid_intervals:
    frappe.throw("Reminder Milestones must contain at least one valid milestone integer (e.g. '30, 15, 7, 0').")

# Validate notification thresholds (Batch 11)
if doc.min_fuel_efficiency_kml is not None and float(doc.min_fuel_efficiency_kml) <= 0:
    frappe.throw("Min Fuel Efficiency Threshold must be greater than 0 KM/L.")

if doc.breakdown_escalation_hours is not None and int(doc.breakdown_escalation_hours) <= 0:
    frappe.throw("Breakdown Escalation Window must be a positive integer of hours (e.g. 48).")

if doc.repeated_breakdown_threshold is not None and int(doc.repeated_breakdown_threshold) < 1:
    frappe.throw("Repeated Breakdown Threshold must be at least 1.")

if doc.repeated_breakdown_window_days is not None and int(doc.repeated_breakdown_window_days) < 1:
    frappe.throw("Repeated Breakdown Window must be at least 1 day.")

if doc.receivables_alert_threshold is not None and float(doc.receivables_alert_threshold) < 0:
    frappe.throw("Receivables Alert Threshold cannot be negative.")

if doc.reminder_frequency_hours is not None and int(doc.reminder_frequency_hours) < 1:
    frappe.throw("Reminder Frequency must be at least 1 hour.")

if doc.max_reminder_count is not None and int(doc.max_reminder_count) < 1:
    frappe.throw("Max Reminder Count must be at least 1.")

# Validate role linkages
role_fields = [
    ("vehicle_driver_alert_role", "Vehicle & Driver Recipient Role"),
    ("trip_alert_role", "Trip Operations Recipient Role"),
    ("fuel_alert_role", "Fuel Recipient Role"),
    ("maintenance_alert_role", "Maintenance Recipient Role"),
    ("inventory_alert_role", "Inventory Recipient Role"),
    ("procurement_alert_role", "Procurement Recipient Role"),
    ("insurance_compliance_alert_role", "Insurance & Compliance Recipient Role"),
    ("financial_alert_role", "Financial Recipient Role")
]

for fld, lbl in role_fields:
    role_val = doc.get(fld)
    if role_val and not frappe.db.exists("Role", role_val):
        frappe.throw(f"Specified {lbl} '{role_val}' does not exist.")
"""

    ss = frappe.get_doc("Server Script", "Fleet Settings - Validations")
    ss.script = script_content
    ss.save(ignore_permissions=True)
    frappe.db.commit()
    print("Updated Fleet Settings - Validations Server Script successfully.")

if __name__ == "__main__":
    update_fleet_settings_validations()

