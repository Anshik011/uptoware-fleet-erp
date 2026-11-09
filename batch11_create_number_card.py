import frappe, json

def create_alert_number_card():
    frappe.init("frontend")
    frappe.connect()

    label = "Active Fleet Alerts"
    if not frappe.db.exists("Number Card", label):
        nc = frappe.new_doc("Number Card")
        nc.name = label
        nc.label = label
        nc.document_type = "Fleet Alert Log"
        nc.function = "Count"
        nc.is_public = 1
        nc.filters_json = json.dumps([
            ["Fleet Alert Log", "status", "in", ["Unread", "Read", "Acknowledged"]],
            ["Fleet Alert Log", "is_test_record", "=", 0]
        ])
        nc.save(ignore_permissions=True)
        print("Created Number Card: Active Fleet Alerts")
    else:
        print("Number Card Active Fleet Alerts already exists.")

    frappe.db.commit()

if __name__ == "__main__":
    create_alert_number_card()

