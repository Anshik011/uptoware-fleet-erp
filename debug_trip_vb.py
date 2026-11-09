import frappe

def run():
    vbs = frappe.db.sql("SELECT name, related_trip, parts_cost, labour_cost, total_repair_cost, resolution_type, docstatus FROM `tabVehicle Breakdown` WHERE related_trip = 'TRIP-2026-00512'", as_dict=True)
    for v in vbs:
        print(v)
    oes = frappe.db.sql("SELECT name, mining_trip, amount, posted_amount, approval_status, accounting_status, docstatus FROM `tabOperational Expense` WHERE mining_trip = 'TRIP-2026-00512'", as_dict=True)
    for o in oes:
        print(o)

if __name__ == "__main__":
    run()

