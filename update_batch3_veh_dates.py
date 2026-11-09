import frappe

def run():
    for v in ["TEST-B3-INTERACT", "TEST-REG-V01"]:
        if not frappe.db.exists("Vehicle", v):
            frappe.get_doc({
                "doctype": "Vehicle",
                "license_plate": v,
                "make": "Tata",
                "model": "Prima 3530.K",
                "fuel_type": "Diesel",
                "uom": "Nos",
                "vehicle_status": "Active",
                "last_odometer": 50000,
                "start_date": "2026-01-01",
                "end_date": "2027-12-31",
                "fitness_expiry_date": "2027-12-31",
                "is_test_record": 1
            }).insert(ignore_permissions=True)
        else:
            frappe.db.set_value("Vehicle", v, {
                "start_date": "2026-01-01",
                "end_date": "2027-12-31",
                "fitness_expiry_date": "2027-12-31",
                "policy_no": f"POL-{v}-STD"
            })
    frappe.db.commit()
    print("Set valid statutory dates on TEST-B3-INTERACT and TEST-REG-V01")

run()

