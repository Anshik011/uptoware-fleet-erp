import frappe

def run():
    for v in ["KA-19-MG-9001", "KA-19-MG-9002"]:
        print(v, ":", frappe.db.get_value("Vehicle", v, ["name", "start_date", "end_date", "fitness_expiry_date"], as_dict=True))

run()

