import frappe

def inspect_report_queries():
    for name in ["Mine Site-wise Revenue and Profitability", "Vehicle-wise Revenue and Profitability", "Fuel Efficiency (KM/L)", "Vehicle Downtime Report"]:
        r = frappe.get_doc("Report", name)
        print(f"=== {name} ===")
        print(r.query[:300] if r.query else "NO QUERY")

if __name__ == "__main__":
    inspect_report_queries()

