import frappe

def run():
    print("=== CONFIGURING LIST VIEWS & INDICATORS ===")

    # Update DocType sort orders
    mt = frappe.get_doc("DocType", "Mining Trip")
    mt.sort_field = "dispatch_date_time"
    mt.sort_order = "DESC"
    mt.save(ignore_permissions=True)

    ms = frappe.get_doc("DocType", "Mine Site")
    ms.sort_field = "site_name"
    ms.sort_order = "ASC"
    ms.save(ignore_permissions=True)

    # 1. Mining Trip List View Client Script
    mt_list_script = """frappe.listview_settings['Mining Trip'] = {
    add_fields: ['trip_status', 'vehicle', 'driver', 'mine_site', 'net_weight_tons', 'challan_number', 'is_test_record'],
    get_indicator: function(doc) {
        if (doc.trip_status === 'Draft') {
            return [__('Draft'), 'gray', 'trip_status,=,Draft'];
        } else if (doc.trip_status === 'Dispatched') {
            return [__('Dispatched'), 'blue', 'trip_status,=,Dispatched'];
        } else if (doc.trip_status === 'Weighbridge Confirmed') {
            return [__('Weighbridge Confirmed'), 'orange', 'trip_status,=,Weighbridge Confirmed'];
        } else if (doc.trip_status === 'Approved') {
            return [__('Approved'), 'green', 'trip_status,=,Approved'];
        } else if (doc.trip_status === 'Delivered') {
            return [__('Delivered'), 'darkgreen', 'trip_status,=,Delivered'];
        } else if (doc.trip_status === 'Cancelled') {
            return [__('Cancelled'), 'red', 'trip_status,=,Cancelled'];
        }
    }
};
"""

    # 2. Mine Site List View Client Script
    ms_list_script = """frappe.listview_settings['Mine Site'] = {
    add_fields: ['status', 'mineral_type', 'client', 'is_test_record'],
    get_indicator: function(doc) {
        if (doc.status === 'Operational') {
            return [__('Operational'), 'green', 'status,=,Operational'];
        } else {
            return [__('Inactive'), 'red', 'status,=,Inactive'];
        }
    }
};
"""

    scripts = [
        {
            "name": "Mining Trip - List View Indicators",
            "dt": "Mining Trip",
            "view": "List",
            "script": mt_list_script,
            "enabled": 1
        },
        {
            "name": "Mine Site - List View Indicators",
            "dt": "Mine Site",
            "view": "List",
            "script": ms_list_script,
            "enabled": 1
        }
    ]

    for s in scripts:
        if frappe.db.exists("Client Script", s["name"]):
            doc = frappe.get_doc("Client Script", s["name"])
            doc.update(s)
            doc.save(ignore_permissions=True)
            print(f"Updated Client Script: {s['name']}")
        else:
            doc = frappe.get_doc({"doctype": "Client Script", **s})
            doc.insert(ignore_permissions=True)
            print(f"Created Client Script: {s['name']}")

    frappe.clear_cache()
    frappe.db.commit()
    print("=== LIST VIEWS & INDICATORS CONFIGURED ===")

run()
