import frappe

def inspect_reports():
    names = [
        "Supplier Register",
        "Supplier-wise Purchase Summary",
        "Purchase Order Register",
        "Pending Purchase Orders",
        "Purchase Receipt Register",
        "Purchase Invoice Register",
        "Supplier Outstanding / Payables",
        "Item-wise Purchase History",
        "Purchase by Vehicle / Breakdown / Mine Site",
        "Purchase Analysis by Month"
    ]
    for n in names:
        r = frappe.db.get_value("Report", n, ["name", "report_type", "is_standard", "module"], as_dict=True)
        print(f"Report '{n}': {r}")

if __name__ == '__main__':
    inspect_reports()

