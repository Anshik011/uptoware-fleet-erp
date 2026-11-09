import frappe
from frappe.desk.doctype.dashboard_chart.dashboard_chart import get

def test_charts():
    chart_configs = [
        {
            "chart_name": "Fleet Status Distribution",
            "chart_type": "Group By",
            "type": "Donut",
            "document_type": "Vehicle",
            "group_by_type": "Count",
            "group_by_based_on": "vehicle_status",
            "aggregate_function_based_on": "name",
            "filters_json": '[["Vehicle", "is_test_record", "=", 0]]'
        },
        {
            "chart_name": "Trips by Status",
            "chart_type": "Group By",
            "type": "Donut",
            "document_type": "Mining Trip",
            "group_by_type": "Count",
            "group_by_based_on": "trip_status",
            "aggregate_function_based_on": "name",
            "filters_json": '[["Mining Trip", "is_test_record", "=", 0]]'
        },
        {
            "chart_name": "Monthly Tonnage Trend",
            "chart_type": "Sum",
            "type": "Bar",
            "document_type": "Mining Trip",
            "based_on": "creation",
            "value_based_on": "net_weight_tons",
            "time_interval": "Monthly",
            "timespan": "Last Year",
            "timeseries": 1,
            "filters_json": '[["Mining Trip", "docstatus", "=", 1], ["Mining Trip", "is_test_record", "=", 0]]'
        },
        {
            "chart_name": "Monthly Fuel Expenditure",
            "chart_type": "Sum",
            "type": "Line",
            "document_type": "Fuel Log",
            "based_on": "fuel_date",
            "value_based_on": "total_fuel_cost",
            "time_interval": "Monthly",
            "timespan": "Last Year",
            "timeseries": 1,
            "filters_json": '[["Fuel Log", "docstatus", "=", 1], ["Fuel Log", "is_test_record", "=", 0]]'
        },
        {
            "chart_name": "Fuel Consumption by Vehicle",
            "chart_type": "Group By",
            "type": "Bar",
            "document_type": "Fuel Log",
            "group_by_type": "Sum",
            "group_by_based_on": "vehicle",
            "aggregate_function_based_on": "quantity_litres",
            "filters_json": '[["Fuel Log", "docstatus", "=", 1], ["Fuel Log", "is_test_record", "=", 0]]'
        },
        {
            "chart_name": "Maintenance Cost Trend",
            "chart_type": "Sum",
            "type": "Line",
            "document_type": "Vehicle Breakdown",
            "based_on": "creation",
            "value_based_on": "total_repair_cost",
            "time_interval": "Monthly",
            "timespan": "Last Year",
            "timeseries": 1,
            "filters_json": '[["Vehicle Breakdown", "docstatus", "=", 1], ["Vehicle Breakdown", "is_test_record", "=", 0]]'
        },
        {
            "chart_name": "Outstanding Receivables Trend",
            "chart_type": "Sum",
            "type": "Bar",
            "document_type": "Sales Invoice",
            "based_on": "posting_date",
            "value_based_on": "outstanding_amount",
            "time_interval": "Monthly",
            "timespan": "Last Year",
            "timeseries": 1,
            "filters_json": '[["Sales Invoice", "docstatus", "=", 1], ["Sales Invoice", "outstanding_amount", ">", 0], ["Sales Invoice", "custom_is_test_record", "=", 0]]'
        },
        {
            "chart_name": "Mine Site Tonnage Performance",
            "chart_type": "Group By",
            "type": "Bar",
            "document_type": "Mining Trip",
            "group_by_type": "Sum",
            "group_by_based_on": "mine_site",
            "aggregate_function_based_on": "net_weight_tons",
            "filters_json": '[["Mining Trip", "docstatus", "=", 1], ["Mining Trip", "is_test_record", "=", 0]]'
        },
        {
            "chart_name": "Monthly Invoiced Revenue Trend",
            "chart_type": "Sum",
            "type": "Line",
            "document_type": "Sales Invoice",
            "based_on": "posting_date",
            "value_based_on": "base_grand_total",
            "time_interval": "Monthly",
            "timespan": "Last Year",
            "timeseries": 1,
            "filters_json": '[["Sales Invoice", "docstatus", "=", 1], ["Sales Invoice", "is_return", "=", 0], ["Sales Invoice", "custom_is_test_record", "=", 0]]'
        },
        {
            "chart_name": "Monthly Operational Expense Trend",
            "chart_type": "Sum",
            "type": "Line",
            "document_type": "Operational Expense",
            "based_on": "expense_date",
            "value_based_on": "posted_amount",
            "time_interval": "Monthly",
            "timespan": "Last Year",
            "timeseries": 1,
            "filters_json": '[["Operational Expense", "docstatus", "=", 1], ["Operational Expense", "is_test_record", "=", 0]]'
        }
    ]

    print("Testing 10 Dashboard Charts...")
    for cfg in chart_configs:
        c_name = cfg["chart_name"]
        if frappe.db.exists("Dashboard Chart", c_name):
            doc = frappe.get_doc("Dashboard Chart", c_name)
            doc.update(cfg)
            doc.save(ignore_permissions=True)
        else:
            doc = frappe.new_doc("Dashboard Chart")
            doc.update(cfg)
            doc.module = "Fleet Management"
            doc.is_public = 1
            doc.insert(ignore_permissions=True)

        try:
            res = get(chart_name=c_name)
            if res:
                print(f"  [OK] {c_name}: labels={len(res.get('labels', []))}, datasets={len(res.get('datasets', []))}")
            else:
                print(f"  [OK - Empty Data] {c_name}: (no rows matching filter)")
        except Exception as e:
            print(f"  [FAIL] {c_name}: {e}")

if __name__ == "__main__":
    test_charts()
