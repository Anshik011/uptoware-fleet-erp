import frappe

def run():
    from frappe.desk.query_report import run as run_report
    print("=== VERIFYING ALL 7 BATCH 8 REPORTS ===")
    
    report_filters = {
        "Vehicle Insurance Register": {"vehicle": "", "insurance_company": "", "status": ""},
        "Insurance Expiry Report": {"vehicle": "", "insurance_company": "", "from_date": "", "to_date": ""},
        "Vehicle Document Expiry Report": {"vehicle": ""},
        "Upcoming Renewals": {"vehicle": "", "document_type": ""},
        "Expired Insurance & Documents": {"vehicle": "", "document_type": ""},
        "Insurance Premium by Vehicle": {"vehicle": ""},
        "Insurance Renewal History": {"vehicle": "", "policy_status": "", "is_renewal": ""}
    }

    for r, f in report_filters.items():
        try:
            res = run_report(r, filters=f)
            print(f"[OK] {r}: Columns={len(res.get('columns', []))}, Rows={len(res.get('result', []))}")
        except Exception as e:
            print(f"[FAIL] {r}: {e}")

if __name__ == "__main__":
    run()
