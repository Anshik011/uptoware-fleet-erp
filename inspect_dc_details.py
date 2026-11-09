import frappe
import json

def inspect_dashboard_charts():
    names = ['Purchase Order Analysis', 'Stock Value by Item Group', 'Purchase Receipt Trends', 'Subcontracting Order']
    for n in names:
        try:
            dc = frappe.get_doc("Dashboard Chart", n)
            print(f"=== DASHBOARD CHART: {dc.name} ===")
            print(f"Chart Name: {dc.chart_name}, Chart Type: {dc.chart_type}, Type: {dc.type}")
            print(f"DocType: {dc.document_type}, Based On: {dc.based_on}, Value Based On: {dc.value_based_on}")
            print(f"Group By: {dc.group_by_based_on}, Aggregate: {dc.aggregate_function_based_on}")
            print(f"Time Interval: {dc.time_interval}, Timespan: {dc.timespan}, Timeseries: {dc.timeseries}")
            print(f"Source: {dc.source}, Report: {dc.report_name}")
            print(f"Filters JSON: {dc.filters_json}")
            print(f"Custom Options: {dc.custom_options}")
        except Exception as e:
            print(f"Error {n}: {e}")

if __name__ == "__main__":
    inspect_dashboard_charts()

