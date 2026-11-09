import frappe

def test_api_script():
    script_name = "test_ping_api"
    if frappe.db.exists("Server Script", script_name):
        frappe.delete_doc("Server Script", script_name)
        
    ss = frappe.new_doc("Server Script")
    ss.name = script_name
    ss.script_type = "API"
    ss.api_method = "test_ping_api"
    ss.allow_guest = 0
    ss.script = """
frappe.response['message'] = {'status': 'pong', 'user': frappe.session.user}
"""
    ss.insert()
    frappe.db.commit()
    print("Created test API script")
    
    # Test executing via call
    import frappe.handler
    res = frappe.get_doc("Server Script", script_name).execute_method()
    print("Execution result:", frappe.response.get("message"))
    
    frappe.delete_doc("Server Script", script_name)
    frappe.db.commit()
    print("Cleaned up test API script")

test_api_script()
