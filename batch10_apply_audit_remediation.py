import frappe
import json

def apply_remediation():
    print("=== APPLYING BATCH 10 SEMANTIC AUDIT REMEDIATION ===")

    # 1. REMEDIATE NUMBER CARDS
    remediations = [
        # Item 1: Vehicles in Workshop counts DISTINCT vehicles, not breakdown records
        {
            "name": "Vehicles in Workshop",
            "document_type": "Vehicle",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [
                ["Vehicle", "is_test_record", "=", 0],
                ["Vehicle", "vehicle_status", "=", "Under Maintenance"]
            ],
            "color": "#ecad4b"
        },
        # Item 2: Active Breakdowns excludes drafts, rejected and cancelled records
        {
            "name": "Active Breakdowns",
            "document_type": "Vehicle Breakdown",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [
                ["Vehicle Breakdown", "is_test_record", "=", 0],
                ["Vehicle Breakdown", "docstatus", "!=", 2],
                ["Vehicle Breakdown", "repair_status", "in", ["Approved", "In Workshop", "Awaiting Parts"]],
                ["Vehicle Breakdown", "resolution_type", "!=", "Rejected"]
            ],
            "color": "#e24c4c"
        },
        # Item 3: Pending Purchase Receipts represents goods awaiting receipt, not PRs awaiting billing
        {
            "name": "Pending Purchase Receipts",
            "document_type": "Purchase Order",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [
                ["Purchase Order", "custom_is_test_record", "=", 0],
                ["Purchase Order", "docstatus", "=", 1],
                ["Purchase Order", "status", "in", ["To Receive and Bill", "To Receive"]]
            ],
            "color": "#7b68ee"
        },
        # Item 4: Spare Stock Value includes only intended fleet spare-parts inventory and appropriate warehouses
        {
            "name": "Total Spare Stock Value",
            "document_type": "Bin",
            "function": "Sum",
            "aggregate_function_based_on": "stock_value",
            "filters": [
                ["Bin", "warehouse", "in", ["Stores - U", "Sandur Pit Spares - U", "Donimalai Spares - U", "Kudremukh Spares - U"]]
            ],
            "currency": "INR",
            "color": "#29cc39"
        },
        # Item 5: Driver quarantine
        {
            "name": "Active Drivers",
            "document_type": "Driver",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [
                ["Driver", "is_test_record", "=", 0],
                ["Driver", "status", "=", "Active"]
            ],
            "color": "#29cc39"
        },
        {
            "name": "Inactive Drivers",
            "document_type": "Driver",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [
                ["Driver", "is_test_record", "=", 0],
                ["Driver", "status", "in", ["Inactive", "Suspended", "On Leave"]]
            ],
            "color": "#8c8c8c"
        },
        # Item 5: Procurement test record quarantine
        {
            "name": "Pending Material Requests",
            "document_type": "Material Request",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [
                ["Material Request", "custom_is_test_record", "=", 0],
                ["Material Request", "docstatus", "=", 1],
                ["Material Request", "status", "not in", ["Stopped", "Transferred", "Issued", "Cancelled"]]
            ],
            "color": "#ecad4b"
        },
        {
            "name": "Pending Purchase Orders",
            "document_type": "Purchase Order",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [
                ["Purchase Order", "custom_is_test_record", "=", 0],
                ["Purchase Order", "docstatus", "=", 1],
                ["Purchase Order", "status", "in", ["To Receive and Bill", "To Receive", "To Bill"]]
            ],
            "color": "#3b82f6"
        },
        {
            "name": "Pending Purchase Invoices",
            "document_type": "Purchase Invoice",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [
                ["Purchase Invoice", "custom_is_test_record", "=", 0],
                ["Purchase Invoice", "docstatus", "=", 1],
                ["Purchase Invoice", "outstanding_amount", ">", 0]
            ],
            "color": "#e24c4c"
        },
        # Repaired Breakdowns resolution check
        {
            "name": "Repaired Breakdowns",
            "document_type": "Vehicle Breakdown",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [
                ["Vehicle Breakdown", "is_test_record", "=", 0],
                ["Vehicle Breakdown", "docstatus", "!=", 2],
                ["Vehicle Breakdown", "repair_status", "in", ["Repaired", "Closed"]],
                ["Vehicle Breakdown", "resolution_type", "!=", "Rejected"]
            ],
            "color": "#29cc39"
        },
        # Vehicles Awaiting Parts check
        {
            "name": "Vehicles Awaiting Parts",
            "document_type": "Vehicle Breakdown",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [
                ["Vehicle Breakdown", "is_test_record", "=", 0],
                ["Vehicle Breakdown", "docstatus", "!=", 2],
                ["Vehicle Breakdown", "repair_status", "=", "Awaiting Parts"],
                ["Vehicle Breakdown", "resolution_type", "!=", "Rejected"]
            ],
            "color": "#e24c4c"
        }
    ]

    for c in remediations:
        if frappe.db.exists("Number Card", c["name"]):
            doc = frappe.get_doc("Number Card", c["name"])
            doc.document_type = c["document_type"]
            doc.function = c["function"]
            doc.aggregate_function_based_on = c["aggregate_function_based_on"]
            doc.filters_json = frappe.as_json(c["filters"])
            if "currency" in c:
                doc.currency = c["currency"]
            doc.save(ignore_permissions=True)
            print(f"Updated Number Card: {c['name']}")

    # 2. REMEDIATE DASHBOARD CHARTS FOR BATCH 9 POSTED EXPENSE RECONCILIATION
    if frappe.db.exists("Dashboard Chart", "Monthly Operational Expense Trend"):
        ch = frappe.get_doc("Dashboard Chart", "Monthly Operational Expense Trend")
        ch.filters_json = '[["Operational Expense", "docstatus", "=", 1], ["Operational Expense", "is_test_record", "=", 0], ["Operational Expense", "accounting_status", "=", "Posted"]]'
        ch.save(ignore_permissions=True)
        print("Updated Dashboard Chart: Monthly Operational Expense Trend (reconciles with Batch 9 Posted OpEx)")

    # 3. UPDATE WORKSPACE SHORTCUTS WITH CONSISTENT AUDIT FILTERS
    if frappe.db.exists("Workspace", "Fleet Management"):
        ws = frappe.get_doc("Workspace", "Fleet Management")
        for s in ws.shortcuts:
            if s.label == "Active Breakdowns":
                s.stats_filter = '[["Vehicle Breakdown", "repair_status", "in", ["Approved", "In Workshop", "Awaiting Parts"]], ["Vehicle Breakdown", "resolution_type", "!=", "Rejected"], ["Vehicle Breakdown", "is_test_record", "=", 0], ["Vehicle Breakdown", "docstatus", "!=", 2]]'
            elif s.label == "Pending Purchase Orders":
                s.stats_filter = '[["Purchase Order", "status", "in", ["To Receive and Bill", "To Receive"]], ["Purchase Order", "docstatus", "=", 1], ["Purchase Order", "custom_is_test_record", "=", 0]]'
        ws.save(ignore_permissions=True)
        print("Updated Fleet Management Workspace shortcuts with refined audit filters")

    frappe.clear_cache()
    frappe.db.commit()
    print("=== BATCH 10 SEMANTIC AUDIT REMEDIATION APPLIED SUCCESSFULLY ===")

if __name__ == "__main__":
    apply_remediation()

