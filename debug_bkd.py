def run():
    import frappe
    import traceback
    try:
        doc = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "breakdown_datetime": "2026-11-04 09:00:00",
            "vehicle": "TEST-VEH-BKD-01",
            "breakdown_type": "Engine",
            "severity": "Medium",
            "description": "Test debug",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        print("Created doc:", doc.name, doc.repair_status)
        from frappe.model.workflow import apply_workflow
        apply_workflow(doc, "Approve")
        print("Approved successfully!")
    except Exception as e:
        traceback.print_exc()

run()
