def run():
    import frappe
    # Delete test records created during testing
    frappe.db.delete("Fuel Log", {"vehicle": ["like", "%TEST%"]})
    frappe.db.delete("Mining Trip", {"is_test_record": 1})
    frappe.db.delete("Vehicle", {"license_plate": ["like", "TEST%"]})
    frappe.db.delete("Driver", {"full_name": ["like", "%Test%"]})
    frappe.db.delete("Vehicle Breakdown", {"vehicle": ["like", "%TEST%"]})
    frappe.db.delete("Vehicle Breakdown", {"is_test_record": 1})
    frappe.db.commit()
    print("Test records cleaned up successfully.")

run()
