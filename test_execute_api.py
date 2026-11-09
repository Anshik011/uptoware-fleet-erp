import frappe

def test():
    import frappe.handler
    frappe.form_dict.clear()
    frappe.form_dict.cmd = "check_document_expiries"
    frappe.handler.execute_cmd("check_document_expiries")
    print("execute_cmd result:", frappe.response.get("message"))

test()
