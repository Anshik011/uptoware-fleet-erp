import frappe

def inspect():
    frappe.init("frontend")
    frappe.connect()

    for rname in ["Material Requests for which Supplier Quotations are not created", "Work Orders in Progress", "Maintenance Schedules"]:
        rep = frappe.get_doc("Report", rname)
        print(f"\n==========================================")
        print(f"REPORT: {rname}")
        print("==========================================")
        print("Query:\n", rep.query)
        print("Filters child table:\n", [(f.fieldname, f.fieldtype, f.default) for f in rep.filters])

if __name__ == "__main__":
    inspect()

