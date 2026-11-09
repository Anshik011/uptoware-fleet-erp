import frappe

def inspect_report_roles():
    for name in ["Trip-wise Revenue and Profitability", "Operating Cost Summary", "Vehicle Operating Cost Analysis"]:
        if frappe.db.exists("Report", name):
            r = frappe.get_doc("Report", name)
            print(f"Report: {name}, Roles: {[x.role for x in r.roles]}")

if __name__ == "__main__":
    inspect_report_roles()

