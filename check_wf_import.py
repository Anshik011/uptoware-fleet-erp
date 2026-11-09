import frappe

def run():
    import frappe.model.workflow as mw
    print("In frappe.model.workflow:", dir(mw))

run()
