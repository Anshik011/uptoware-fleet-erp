import frappe
meta = frappe.get_meta("Server Script")
print("DOCTYPE EVENTS:", meta.get_field("doctype_event").options)
