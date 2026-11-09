import frappe

def check_reports():
    existing = frappe.get_all("Report", filters={"module": "Fleet Management", "disabled": 0}, fields=["name", "ref_doctype", "report_type"])
    print(f"Total Fleet Management Reports: {len(existing)}")
    for r in sorted(existing, key=lambda x: x.name):
        print(f"  - {r.name} (Ref: {r.ref_doctype})")

if __name__ == "__main__":
    check_reports()

