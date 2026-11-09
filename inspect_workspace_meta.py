import frappe
import json

def inspect_details():
    ws = frappe.get_doc("Workspace", "Fleet Management")
    print("=== WORKSPACE: Fleet Management ===")
    print("Title:", ws.title)
    print("Module:", ws.module)
    print("Roles:", [r.role for r in ws.roles])
    print("Content preview (first 500 chars):")
    print((ws.content or "")[:500])
    
    print("\n=== DASHBOARD DOCTYPE META ===")
    d_meta = frappe.get_meta("Dashboard")
    print("Dashboard fields:", [f.fieldname for f in d_meta.fields])
    
    print("\n=== DASHBOARD CHART DOCTYPE META ===")
    dc_meta = frappe.get_meta("Dashboard Chart")
    print("Dashboard Chart fields:", [f.fieldname for f in dc_meta.fields])
    
    print("\n=== NUMBER CARD DOCTYPE META ===")
    nc_meta = frappe.get_meta("Number Card")
    print("Number Card fields:", [f.fieldname for f in nc_meta.fields])

    print("\n=== EXISTING DASHBOARD CHARTS DETAIL ===")
    charts = frappe.get_all("Dashboard Chart", fields=["name", "chart_name", "chart_type", "type", "document_type", "based_on", "value_based_on", "time_interval", "timespan"])
    for c in charts[:5]:
        print(c)

    print("\n=== EXISTING NUMBER CARDS DETAIL ===")
    cards = frappe.get_all("Number Card", fields=["name", "label", "document_type", "function", "aggregate_function_based_on", "is_public", "filters_json"])
    for c in cards[:5]:
        print(c)

if __name__ == "__main__":
    inspect_details()

