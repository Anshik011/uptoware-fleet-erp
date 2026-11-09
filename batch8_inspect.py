def run():
    from frappe.desk.query_report import run as run_report
    r = "Vehicle Insurance Register"
    res = run_report(r, filters={"vehicle": ""})
    print("Success! Columns:", len(res.get("columns", [])), "Rows:", len(res.get("result", [])))

if __name__ == "__main__":
    run()
