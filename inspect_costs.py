import frappe

def run():
    print("=== INSPECTING ACTUAL OPERATIONAL RECORDS & COST FIELDS ===")
    
    # Fuel Logs
    fls = frappe.db.sql("""
        SELECT name, vehicle, date, approval_status, workflow_state, total_fuel_cost, is_test_record
        FROM `tabFuel Log`
        LIMIT 5
    """, as_dict=True)
    print("\nFuel Log samples:")
    for fl in fls:
        print(" ", fl)

    # Vehicle Breakdowns
    vbs = frappe.db.sql("""
        SELECT name, vehicle, mine_site, status, workflow_state, resolution_type, parts_cost, labour_cost, total_repair_cost, is_test_record
        FROM `tabVehicle Breakdown`
        WHERE total_repair_cost > 0
        LIMIT 5
    """, as_dict=True)
    print("\nVehicle Breakdown samples (cost > 0):")
    for vb in vbs:
        print(" ", vb)

    # Operational Expenses
    oes = frappe.db.sql("""
        SELECT name, expense_date, expense_category, vehicle, mining_trip, amount, approval_status, accounting_status, journal_entry, is_test_record
        FROM `tabOperational Expense`
        LIMIT 5
    """, as_dict=True)
    print("\nOperational Expense samples:")
    for oe in oes:
        print(" ", oe)

    # Mining Trips
    mts = frappe.db.sql("""
        SELECT name, vehicle, mine_site, trip_status, workflow_state, net_weight_tons, rate_per_ton, gross_revenue, is_test_record
        FROM `tabMining Trip`
        LIMIT 5
    """, as_dict=True)
    print("\nMining Trip samples:")
    for mt in mts:
        print(" ", mt)

if __name__ == "__main__":
    run()

