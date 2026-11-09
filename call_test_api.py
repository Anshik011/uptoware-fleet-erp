import frappe
from frappe.core.doctype.server_script.server_script_utils import run_server_script_api

def run():
    # create a dummy draft operational expense
    exp = frappe.get_doc({
        "doctype": "Operational Expense",
        "expense_date": frappe.utils.today(),
        "expense_category": "Parking",
        "amount": 250,
        "company": "Uptoware",
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    frappe.db.commit()

    frappe.form_dict.expense_name = exp.name
    res = run_server_script_api("test_ss_api_posting")
    print("API Response via run_server_script_api:", res)
    print("frappe.response message:", frappe.response.get("message"))

    # cleanup
    frappe.delete_doc("Operational Expense", exp.name, force=1)
    frappe.delete_doc("Server Script", "test_ss_api_posting", force=1)
    frappe.db.commit()

run()
