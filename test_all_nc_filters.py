import frappe
from frappe.desk.doctype.number_card.number_card import get_result

def test_card_filters():
    test_specs = [
        # Fleet Overview
        ("Total Vehicles", "Vehicle", "Count", None, [["Vehicle", "is_test_record", "=", 0]]),
        ("Active Vehicles", "Vehicle", "Count", None, [["Vehicle", "is_test_record", "=", 0], ["Vehicle", "vehicle_status", "=", "Active"]]),
        ("Vehicles On Trip", "Vehicle", "Count", None, [["Vehicle", "is_test_record", "=", 0], ["Vehicle", "vehicle_status", "=", "On Trip"]]),
        ("Vehicles In Maintenance", "Vehicle", "Count", None, [["Vehicle", "is_test_record", "=", 0], ["Vehicle", "vehicle_status", "=", "Under Maintenance"]]),
        ("Vehicles In Breakdown", "Vehicle", "Count", None, [["Vehicle", "is_test_record", "=", 0], ["Vehicle", "vehicle_status", "=", "Breakdown"]]),
        ("Vehicles Out of Service", "Vehicle", "Count", None, [["Vehicle", "is_test_record", "=", 0], ["Vehicle", "vehicle_status", "=", "Out of Service"]]),
        ("Active Drivers", "Driver", "Count", None, [["Driver", "status", "=", "Active"]]),
        ("Inactive Drivers", "Driver", "Count", None, [["Driver", "status", "in", ["Inactive", "Suspended", "On Leave"]]]),
        
        # Trip Operations
        ("Trips In Progress", "Mining Trip", "Count", None, [["Mining Trip", "is_test_record", "=", 0], ["Mining Trip", "trip_status", "in", ["Dispatched", "En Route", "Loaded"]]]),
        ("Trips Awaiting Weighbridge", "Mining Trip", "Count", None, [["Mining Trip", "is_test_record", "=", 0], ["Mining Trip", "trip_status", "=", "Dispatched"], ["Mining Trip", "net_weight_tons", "=", 0]]),
        ("Trips Awaiting Approval", "Mining Trip", "Count", None, [["Mining Trip", "is_test_record", "=", 0], ["Mining Trip", "trip_status", "=", "Weighbridge Confirmed"]]),
        ("Completed Trips", "Mining Trip", "Count", None, [["Mining Trip", "is_test_record", "=", 0], ["Mining Trip", "trip_status", "in", ["Approved", "Delivered"]]]),
        ("Cancelled Trips", "Mining Trip", "Count", None, [["Mining Trip", "is_test_record", "=", 0], ["Mining Trip", "trip_status", "=", "Cancelled"]]),
        ("Total Tonnage Transported", "Mining Trip", "Sum", "net_weight_tons", [["Mining Trip", "is_test_record", "=", 0], ["Mining Trip", "docstatus", "=", 1]]),
        
        # Fuel Management
        ("Total Fuel Consumed (L)", "Fuel Log", "Sum", "quantity_litres", [["Fuel Log", "is_test_record", "=", 0], ["Fuel Log", "docstatus", "=", 1]]),
        ("Total Fuel Expenditure", "Fuel Log", "Sum", "total_fuel_cost", [["Fuel Log", "is_test_record", "=", 0], ["Fuel Log", "docstatus", "=", 1]]),
        ("Avg Fuel Efficiency (KM/L)", "Fuel Log", "Average", "km_per_litre", [["Fuel Log", "is_test_record", "=", 0], ["Fuel Log", "docstatus", "=", 1], ["Fuel Log", "is_full_tank", "=", 1], ["Fuel Log", "km_per_litre", ">", 0]]),
        
        # Maintenance & Breakdown
        ("Active Breakdowns", "Vehicle Breakdown", "Count", None, [["Vehicle Breakdown", "is_test_record", "=", 0], ["Vehicle Breakdown", "repair_status", "in", ["Reported", "Approved", "In Workshop", "Awaiting Parts"]]]),
        ("Vehicles in Workshop", "Vehicle Breakdown", "Count", None, [["Vehicle Breakdown", "is_test_record", "=", 0], ["Vehicle Breakdown", "repair_status", "=", "In Workshop"]]),
        ("Vehicles Awaiting Parts", "Vehicle Breakdown", "Count", None, [["Vehicle Breakdown", "is_test_record", "=", 0], ["Vehicle Breakdown", "repair_status", "=", "Awaiting Parts"]]),
        ("Repaired Breakdowns", "Vehicle Breakdown", "Count", None, [["Vehicle Breakdown", "is_test_record", "=", 0], ["Vehicle Breakdown", "repair_status", "in", ["Repaired", "Closed"]]]),
        ("Total Maintenance Cost", "Vehicle Breakdown", "Sum", "total_repair_cost", [["Vehicle Breakdown", "is_test_record", "=", 0], ["Vehicle Breakdown", "docstatus", "=", 1]]),
        ("Total Parts Cost", "Vehicle Breakdown", "Sum", "parts_cost", [["Vehicle Breakdown", "is_test_record", "=", 0], ["Vehicle Breakdown", "docstatus", "=", 1]]),
        ("Total Labour Cost", "Vehicle Breakdown", "Sum", "labour_cost", [["Vehicle Breakdown", "is_test_record", "=", 0], ["Vehicle Breakdown", "docstatus", "=", 1]]),
        
        # Procurement & Inventory
        ("Pending Material Requests", "Material Request", "Count", None, [["Material Request", "docstatus", "=", 1], ["Material Request", "status", "not in", ["Stopped", "Transferred", "Issued", "Cancelled"]]]),
        ("Pending Purchase Orders", "Purchase Order", "Count", None, [["Purchase Order", "docstatus", "=", 1], ["Purchase Order", "status", "in", ["To Receive and Bill", "To Receive", "To Bill"]]]),
        ("Pending Purchase Receipts", "Purchase Receipt", "Count", None, [["Purchase Receipt", "docstatus", "=", 1], ["Purchase Receipt", "status", "=", "To Bill"]]),
        ("Pending Purchase Invoices", "Purchase Invoice", "Count", None, [["Purchase Invoice", "docstatus", "=", 1], ["Purchase Invoice", "outstanding_amount", ">", 0]]),
        ("Total Spare Stock Value", "Bin", "Sum", "stock_value", []),
        
        # Insurance & Compliance
        ("Valid Insurance Policies", "Vehicle Insurance Policy", "Count", None, [["Vehicle Insurance Policy", "is_test_record", "=", 0], ["Vehicle Insurance Policy", "policy_status", "=", "Active"]]),
        ("Expired Insurance Policies", "Vehicle Insurance Policy", "Count", None, [["Vehicle Insurance Policy", "is_test_record", "=", 0], ["Vehicle Insurance Policy", "policy_status", "=", "Expired"]]),
        ("Total Insurance Premium", "Vehicle Insurance Policy", "Sum", "premium_amount", [["Vehicle Insurance Policy", "is_test_record", "=", 0], ["Vehicle Insurance Policy", "docstatus", "=", 1]]),
        
        # Revenue & Financial Performance
        ("Invoiced Revenue", "Sales Invoice", "Sum", "base_grand_total", [["Sales Invoice", "custom_is_test_record", "=", 0], ["Sales Invoice", "docstatus", "=", 1], ["Sales Invoice", "is_return", "=", 0]]),
        ("Collected Revenue", "Sales Invoice", "Sum", "base_paid_amount", [["Sales Invoice", "custom_is_test_record", "=", 0], ["Sales Invoice", "docstatus", "=", 1], ["Sales Invoice", "is_return", "=", 0]]),
        ("Outstanding Receivables", "Sales Invoice", "Sum", "outstanding_amount", [["Sales Invoice", "custom_is_test_record", "=", 0], ["Sales Invoice", "docstatus", "=", 1], ["Sales Invoice", "is_return", "=", 0]]),
        ("Total Operational Expenses", "Operational Expense", "Sum", "posted_amount", [["Operational Expense", "is_test_record", "=", 0], ["Operational Expense", "docstatus", "=", 1], ["Operational Expense", "accounting_status", "=", "Posted"]])
    ]

    print(f"Testing {len(test_specs)} Number Card configurations...")
    for label, dt, fn, agg, flts in test_specs:
        c = frappe.new_doc("Number Card")
        c.update({
            "name": f"NC Test {label}",
            "label": label,
            "document_type": dt,
            "function": fn,
            "aggregate_function_based_on": agg,
            "filters_json": frappe.as_json(flts)
        })
        try:
            val = get_result(c, filters=flts)
            print(f"  [OK] {label} ({dt}): {val}")
        except Exception as e:
            print(f"  [FAIL] {label} ({dt}): {e}")

if __name__ == "__main__":
    test_card_filters()
