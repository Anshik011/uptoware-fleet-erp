import frappe

def run():
    oes = frappe.db.sql("""
        SELECT name, expense_date, vehicle, mining_trip, posted_amount, is_test_record
        FROM `tabOperational Expense`
        WHERE is_test_record = 1
    """, as_dict=True)
    print("Test Operational Expenses in DB:")
    for oe in oes:
        print(" ", oe)

if __name__ == "__main__":
    run()

