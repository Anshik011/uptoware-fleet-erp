import frappe

def run():
    print("=== EXISTING WORKSPACES ===")
    workspaces = frappe.get_all("Workspace", fields=["name", "label", "module", "for_user", "public", "is_hidden"])
    for w in workspaces:
        if any(k in (w.label or "").lower() or k in (w.module or "").lower() for k in ["fleet", "uptoware", "mining", "transport"]):
            print(w)

    print("\n=== EXISTING DASHBOARDS ===")
    dashboards = frappe.get_all("Dashboard", fields=["name", "dashboard_name", "module"])
    for d in dashboards:
        print(d)

    print("\n=== EXISTING NUMBER CARDS (Custom / Fleet related) ===")
    nc = frappe.get_all("Number Card", fields=["name", "label", "module", "document_type", "function", "aggregate_function_based_on"])
    for c in nc:
        if c.module in ["Fleet Management", "Uptoware Fleet", "Custom"] or any(k in (c.label or "").lower() for k in ["fleet", "trip", "fuel", "vehicle", "breakdown", "expense"]):
            print(c)

    print("\n=== EXISTING DASHBOARD CHARTS ===")
    dc = frappe.get_all("Dashboard Chart", fields=["name", "chart_name", "chart_type", "document_type", "based_on", "source"])
    for c in dc:
        if any(k in (c.chart_name or "").lower() for k in ["fleet", "trip", "vehicle", "fuel", "breakdown", "mining", "expense", "revenue"]):
            print(c)

    print("\n=== EXISTING REPORTS (Batches 1-9) ===")
    reports = frappe.get_all("Report", filters={"disabled": 0}, fields=["name", "report_name", "ref_doctype", "report_type", "module"])
    fleet_reports = [r for r in reports if any(k in (r.name or "").lower() or k in (r.module or "").lower() for k in ["fleet", "vehicle", "trip", "fuel", "breakdown", "mining", "revenue", "profitability", "expense", "stock", "insurance", "purchase"])]
    for r in sorted(fleet_reports, key=lambda x: x.name):
        print(f"{r.name} | {r.ref_doctype} | {r.report_type} | {r.module}")

if __name__ == "__main__":
    run()

