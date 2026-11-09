import frappe

def run():
    trip_name = "TRIP-2026-00514"
    vbs = frappe.db.sql("SELECT name, related_trip, parts_cost, labour_cost, total_repair_cost, resolution_type, docstatus FROM `tabVehicle Breakdown` WHERE related_trip = %s", (trip_name,), as_dict=True)
    print("VBs for", trip_name, ":", vbs)
    oes = frappe.db.sql("SELECT name, mining_trip, amount, posted_amount, approval_status, accounting_status, docstatus FROM `tabOperational Expense` WHERE mining_trip = %s", (trip_name,), as_dict=True)
    print("OEs for", trip_name, ":", oes)
    sis = frappe.db.sql("SELECT name, custom_mining_trip, base_grand_total, docstatus, is_return FROM `tabSales Invoice` WHERE custom_mining_trip = %s", (trip_name,), as_dict=True)
    print("SIs for", trip_name, ":", sis)

if __name__ == "__main__":
    run()

