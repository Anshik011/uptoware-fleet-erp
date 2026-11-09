import frappe
v = frappe.db.get_value("Vehicle", "KA-19-MG-9001", ["name", "is_test_record"], as_dict=True)
print("KA-19-MG-9001:", v)
