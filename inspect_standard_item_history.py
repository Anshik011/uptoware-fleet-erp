import frappe
from frappe.desk.query_report import run as run_report

def inspect():
    import frappe
    from frappe.desk.query_report import run as run_report
    rep = frappe.get_doc("Report", "Item-wise Purchase History")
    print(f"Name: {rep.name}, Type: {rep.report_type}, Module: {rep.module}")
    try:
        res = run_report("Item-wise Purchase History", filters={"company": "Uptoware", "from_date": "2026-01-01", "to_date": "2026-12-31"})
        print(f"Columns: {[c.get('fieldname') or c.get('label') for c in res.get('columns', [])]}")
        print(f"Rows: {len(res.get('result', []))}")
    except Exception as e:
        print(f"Error running standard Item-wise Purchase History: {e}")

if __name__ == '__main__':
    inspect()
