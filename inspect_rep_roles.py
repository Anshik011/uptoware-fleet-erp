import frappe

def run():
    r_names = ["Vehicle Insurance Register", "Vehicle Breakdown History", "Daily Operational Expense Log"]
    for r in r_names:
        if frappe.db.exists("Report", r):
            doc = frappe.get_doc("Report", r)
            print(f"Report: {r}, roles: {[row.role for row in doc.roles]}")

if __name__ == "__main__":
    run()

