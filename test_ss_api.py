import frappe

def test_api():
    script_name = "test_ss_api_posting"
    if frappe.db.exists("Server Script", script_name):
        frappe.delete_doc("Server Script", script_name, force=1)
        frappe.db.commit()

    code = """# Server Script API test
exp_name = frappe.form_dict.get("expense_name")
if not exp_name:
    frappe.throw("expense_name required")

doc = frappe.get_doc("Operational Expense", exp_name)
frappe.response["message"] = {
    "status": "success",
    "expense": doc.name,
    "amount": doc.amount,
    "approval_status": doc.approval_status
}
"""

    ss = frappe.get_doc({
        "doctype": "Server Script",
        "name": script_name,
        "script_type": "API",
        "api_method": "test_ss_api_posting",
        "script": code,
        "disabled": 0
    })
    ss.insert(ignore_permissions=True)
    frappe.db.commit()
    print("Created test API Server Script.")

test_api()
