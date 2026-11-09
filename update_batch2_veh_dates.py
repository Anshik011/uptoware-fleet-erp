import frappe

def run():
    for v in ["KA-19-MG-9001", "KA-19-MG-9002"]:
        if frappe.db.exists("Vehicle", v):
            frappe.db.set_value("Vehicle", v, {
                "start_date": "2026-01-01",
                "end_date": "2027-12-31",
                "fitness_expiry_date": "2027-12-31",
                "policy_no": f"POL-{v}-STD"
            })
    frappe.db.commit()
    print("Updated KA-19-MG-9001 and KA-19-MG-9002 with valid statutory dates.")

run()

