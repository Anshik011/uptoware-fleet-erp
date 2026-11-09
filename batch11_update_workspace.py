import frappe, json

def update_workspace():
    frappe.init("frontend")
    frappe.connect()

    ws = frappe.get_doc("Workspace", "Fleet Management")

    # Check if Active Fleet Alerts shortcut exists
    shortcut_labels = [s.label for s in ws.shortcuts]
    if "Active Fleet Alerts" not in shortcut_labels:
        ws.append("shortcuts", {
            "type": "DocType",
            "link_to": "Fleet Alert Log",
            "label": "Active Fleet Alerts",
            "color": "Red",
            "stats_filter": json.dumps({"status": ["in", ["Unread", "Read", "Acknowledged"]], "is_test_record": 0})
        })
        print("Added Active Fleet Alerts shortcut.")

    # Check if Alerts & Notifications section exists in links
    has_alert_section = any(l.label == "Alerts, Compliance & Settings" for l in ws.links)
    if not has_alert_section:
        ws.append("links", {
            "type": "Card Break",
            "label": "Alerts, Compliance & Settings"
        })
        ws.append("links", {
            "type": "Link",
            "link_type": "DocType",
            "link_to": "Fleet Alert Log",
            "label": "Fleet Alert Log",
            "dependencies": ""
        })
        ws.append("links", {
            "type": "Link",
            "link_type": "DocType",
            "link_to": "Fleet Expiry Notification Log",
            "label": "Fleet Expiry Notification Log",
            "dependencies": ""
        })
        ws.append("links", {
            "type": "Link",
            "link_type": "DocType",
            "link_to": "Fleet Settings",
            "label": "Fleet Settings",
            "dependencies": ""
        })
        ws.append("links", {
            "type": "Link",
            "link_type": "Report",
            "link_to": "Vehicle Document Expiry Report",
            "label": "Vehicle Document Expiry Report",
            "dependencies": ""
        })
        print("Added Alerts, Compliance & Settings section to links.")

    ws.save(ignore_permissions=True)
    frappe.db.commit()
    print("Fleet Management Workspace successfully updated.")

if __name__ == "__main__":
    update_workspace()

