import frappe
from frappe.desk.query_report import run

def inspect():
    frappe.init("frontend")
    frappe.connect()

    for rname in ['Sales Partners Commission', 'Trial Balance (Simple)']:
        rep = frappe.get_doc('Report', rname)
        print(f"\n=== {rname} QUERY ===")
        print(rep.query)
        try:
            res = run(rname, filters={})
            print(f"SUCCESS {rname}! Rows: {len(res.get('result', []))}")
        except Exception as e:
            print(f"FAILED {rname}: {type(e)} {e}")

if __name__ == "__main__":
    inspect()
