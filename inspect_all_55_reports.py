import frappe
import json

def inspect_all_55():
    frappe.init("frontend")
    frappe.connect()

    report_list = [
        # A. Fuel Management — 5
        "Daily Fuel Consumption",
        "Vehicle-wise Fuel Consumption",
        "Monthly Fuel Cost",
        "Fuel Efficiency (KM/L)",
        "Fuel Consumption by Mine Site",
        # B. Breakdown & Maintenance — 6
        "Vehicle Breakdown Register",
        "Vehicle Downtime Report",
        "Maintenance Cost by Vehicle",
        "Breakdown Frequency by Type",
        "Pending Repairs / Awaiting Parts",
        "Vehicle Maintenance History",
        # C. Operational Expenses — 7
        "Daily Operational Expense",
        "Monthly Operational Expense",
        "Vehicle-wise Expense",
        "Trip-wise Expense",
        "Mine Site-wise Expense",
        "Expense Category Analysis",
        "Pending Expense Approvals",
        # D. Spare Parts & Inventory — 7
        "Spare Parts Stock Register",
        "Warehouse-wise Stock",
        "Low Stock / Reorder Report",
        "Spare Parts Consumption by Vehicle",
        "Spare Parts Consumption by Breakdown",
        "Spare Parts Consumption by Mine Site",
        "Stock Movement History",
        # E. Supplier & Procurement — 9
        "Supplier Register",
        "Supplier-wise Purchase Summary",
        "Purchase Order Register",
        "Pending Purchase Orders",
        "Purchase Receipt Register",
        "Purchase Invoice Register",
        "Supplier Outstanding / Payables",
        "Purchase by Vehicle / Breakdown / Mine Site",
        "Purchase Analysis by Month",
        # F. Insurance & Compliance — 7
        "Vehicle Insurance Register",
        "Insurance Expiry Report",
        "Vehicle Document Expiry Report",
        "Upcoming Renewals",
        "Expired Insurance & Documents",
        "Insurance Premium by Vehicle",
        "Insurance Renewal History",
        # G. Revenue & Profitability — 10
        "Trip-wise Revenue and Profitability",
        "Vehicle-wise Revenue and Profitability",
        "Mine Site-wise Revenue and Profitability",
        "Customer-wise Revenue",
        "Monthly Revenue Summary",
        "Operating Cost Summary",
        "Vehicle Operating Cost Analysis",
        "Revenue vs Cost Analysis",
        "Outstanding Revenue / Receivables",
        "Unallocated Cost Register",
        # H. Fleet Performance & Operations — 4
        "Fleet Utilization",
        "Vehicle Performance Summary",
        "Driver Performance",
        "Trip Operations Summary"
    ]

    all_data = []
    for rname in report_list:
        if not frappe.db.exists("Report", rname):
            all_data.append({"name": rname, "exists": False})
            continue

        rep = frappe.get_doc("Report", rname)
        filters_list = [{"fieldname": f.fieldname, "label": f.label, "fieldtype": f.fieldtype, "options": f.options} for f in rep.filters]
        all_data.append({
            "name": rname,
            "exists": True,
            "report_type": rep.report_type,
            "ref_doctype": rep.ref_doctype,
            "query": rep.query,
            "filters": filters_list,
            "javascript": rep.javascript
        })

    with open("/home/frappe/frappe-bench/reports_55_inventory.json", "w") as f:
        json.dump(all_data, f, indent=2)

    print(f"Exported all 55 reports metadata to reports_55_inventory.json")

if __name__ == "__main__":
    inspect_all_55()

