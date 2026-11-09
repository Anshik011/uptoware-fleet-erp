import frappe
import json
import uuid

def setup_batch10():
    print("=== CONFIGURING BATCH 10 NUMBER CARDS, CHARTS, DASHBOARD, AND WORKSPACE ===")

    # ---------------------------------------------------------
    # 1. CONFIGURE 36 NUMBER CARDS
    # ---------------------------------------------------------
    cards = [
        # A. Fleet Overview
        {
            "label": "Total Vehicles",
            "document_type": "Vehicle",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Vehicle", "is_test_record", "=", 0]],
            "color": "#2490ef"
        },
        {
            "label": "Active Vehicles",
            "document_type": "Vehicle",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Vehicle", "is_test_record", "=", 0], ["Vehicle", "vehicle_status", "=", "Active"]],
            "color": "#29cc39"
        },
        {
            "label": "Vehicles on Trip",
            "document_type": "Vehicle",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Vehicle", "is_test_record", "=", 0], ["Vehicle", "vehicle_status", "=", "On Trip"]],
            "color": "#3b82f6"
        },
        {
            "label": "Vehicles in Maintenance",
            "document_type": "Vehicle",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Vehicle", "is_test_record", "=", 0], ["Vehicle", "vehicle_status", "=", "Under Maintenance"]],
            "color": "#ecad4b"
        },
        {
            "label": "Vehicles in Breakdown",
            "document_type": "Vehicle",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Vehicle", "is_test_record", "=", 0], ["Vehicle", "vehicle_status", "=", "Breakdown"]],
            "color": "#e24c4c"
        },
        {
            "label": "Vehicles Out of Service",
            "document_type": "Vehicle",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Vehicle", "is_test_record", "=", 0], ["Vehicle", "vehicle_status", "=", "Out of Service"]],
            "color": "#8c8c8c"
        },
        {
            "label": "Active Drivers",
            "document_type": "Driver",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Driver", "status", "=", "Active"]],
            "color": "#29cc39"
        },
        {
            "label": "Inactive Drivers",
            "document_type": "Driver",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Driver", "status", "in", ["Inactive", "Suspended", "On Leave"]]],
            "color": "#8c8c8c"
        },

        # B. Trip Operations
        {
            "label": "Trips in Progress",
            "document_type": "Mining Trip",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Mining Trip", "is_test_record", "=", 0], ["Mining Trip", "trip_status", "in", ["Dispatched", "En Route", "Loaded"]]],
            "color": "#3b82f6"
        },
        {
            "label": "Trips Awaiting Weighbridge",
            "document_type": "Mining Trip",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Mining Trip", "is_test_record", "=", 0], ["Mining Trip", "trip_status", "=", "Dispatched"], ["Mining Trip", "net_weight_tons", "=", 0]],
            "color": "#ecad4b"
        },
        {
            "label": "Trips Awaiting Approval",
            "document_type": "Mining Trip",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Mining Trip", "is_test_record", "=", 0], ["Mining Trip", "trip_status", "=", "Weighbridge Confirmed"]],
            "color": "#ecad4b"
        },
        {
            "label": "Delivered Trips",
            "document_type": "Mining Trip",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Mining Trip", "is_test_record", "=", 0], ["Mining Trip", "trip_status", "in", ["Approved", "Delivered"]]],
            "color": "#29cc39"
        },
        {
            "label": "Cancelled Trips",
            "document_type": "Mining Trip",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Mining Trip", "is_test_record", "=", 0], ["Mining Trip", "trip_status", "=", "Cancelled"]],
            "color": "#e24c4c"
        },
        {
            "label": "Total Tonnage Hauled",
            "document_type": "Mining Trip",
            "function": "Sum",
            "aggregate_function_based_on": "net_weight_tons",
            "filters": [["Mining Trip", "is_test_record", "=", 0], ["Mining Trip", "docstatus", "=", 1]],
            "color": "#7b68ee"
        },

        # C. Fuel Management
        {
            "label": "Total Fuel Consumed (L)",
            "document_type": "Fuel Log",
            "function": "Sum",
            "aggregate_function_based_on": "quantity_litres",
            "filters": [["Fuel Log", "is_test_record", "=", 0], ["Fuel Log", "docstatus", "=", 1]],
            "color": "#2490ef"
        },
        {
            "label": "Total Fuel Expenditure",
            "document_type": "Fuel Log",
            "function": "Sum",
            "aggregate_function_based_on": "total_fuel_cost",
            "filters": [["Fuel Log", "is_test_record", "=", 0], ["Fuel Log", "docstatus", "=", 1]],
            "currency": "INR",
            "color": "#ecad4b"
        },
        {
            "label": "Average Fuel Efficiency (KM/L)",
            "document_type": "Fuel Log",
            "function": "Average",
            "aggregate_function_based_on": "km_per_litre",
            "filters": [["Fuel Log", "is_test_record", "=", 0], ["Fuel Log", "docstatus", "=", 1], ["Fuel Log", "is_full_tank", "=", 1], ["Fuel Log", "km_per_litre", ">", 0]],
            "color": "#29cc39"
        },

        # D. Maintenance & Breakdown
        {
            "label": "Active Breakdowns",
            "document_type": "Vehicle Breakdown",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Vehicle Breakdown", "is_test_record", "=", 0], ["Vehicle Breakdown", "repair_status", "in", ["Reported", "Approved", "In Workshop", "Awaiting Parts"]]],
            "color": "#e24c4c"
        },
        {
            "label": "Vehicles in Workshop",
            "document_type": "Vehicle Breakdown",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Vehicle Breakdown", "is_test_record", "=", 0], ["Vehicle Breakdown", "repair_status", "=", "In Workshop"]],
            "color": "#ecad4b"
        },
        {
            "label": "Vehicles Awaiting Parts",
            "document_type": "Vehicle Breakdown",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Vehicle Breakdown", "is_test_record", "=", 0], ["Vehicle Breakdown", "repair_status", "=", "Awaiting Parts"]],
            "color": "#e24c4c"
        },
        {
            "label": "Repaired Breakdowns",
            "document_type": "Vehicle Breakdown",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Vehicle Breakdown", "is_test_record", "=", 0], ["Vehicle Breakdown", "repair_status", "in", ["Repaired", "Closed"]]],
            "color": "#29cc39"
        },
        {
            "label": "Total Maintenance Cost",
            "document_type": "Vehicle Breakdown",
            "function": "Sum",
            "aggregate_function_based_on": "total_repair_cost",
            "filters": [["Vehicle Breakdown", "is_test_record", "=", 0], ["Vehicle Breakdown", "docstatus", "=", 1]],
            "currency": "INR",
            "color": "#ecad4b"
        },
        {
            "label": "Total Parts Cost",
            "document_type": "Vehicle Breakdown",
            "function": "Sum",
            "aggregate_function_based_on": "parts_cost",
            "filters": [["Vehicle Breakdown", "is_test_record", "=", 0], ["Vehicle Breakdown", "docstatus", "=", 1]],
            "currency": "INR",
            "color": "#3b82f6"
        },
        {
            "label": "Total Labour Cost",
            "document_type": "Vehicle Breakdown",
            "function": "Sum",
            "aggregate_function_based_on": "labour_cost",
            "filters": [["Vehicle Breakdown", "is_test_record", "=", 0], ["Vehicle Breakdown", "docstatus", "=", 1]],
            "currency": "INR",
            "color": "#7b68ee"
        },

        # E. Procurement & Inventory
        {
            "label": "Pending Material Requests",
            "document_type": "Material Request",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Material Request", "docstatus", "=", 1], ["Material Request", "status", "not in", ["Stopped", "Transferred", "Issued", "Cancelled"]]],
            "color": "#ecad4b"
        },
        {
            "label": "Pending Purchase Orders",
            "document_type": "Purchase Order",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Purchase Order", "docstatus", "=", 1], ["Purchase Order", "status", "in", ["To Receive and Bill", "To Receive", "To Bill"]]],
            "color": "#3b82f6"
        },
        {
            "label": "Pending Purchase Receipts",
            "document_type": "Purchase Receipt",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Purchase Receipt", "docstatus", "=", 1], ["Purchase Receipt", "status", "=", "To Bill"]],
            "color": "#7b68ee"
        },
        {
            "label": "Pending Purchase Invoices",
            "document_type": "Purchase Invoice",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Purchase Invoice", "docstatus", "=", 1], ["Purchase Invoice", "outstanding_amount", ">", 0]],
            "color": "#e24c4c"
        },
        {
            "label": "Total Spare Stock Value",
            "document_type": "Bin",
            "function": "Sum",
            "aggregate_function_based_on": "stock_value",
            "filters": [],
            "currency": "INR",
            "color": "#29cc39"
        },

        # F. Insurance & Statutory Compliance
        {
            "label": "Valid Insurance Policies",
            "document_type": "Vehicle Insurance Policy",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Vehicle Insurance Policy", "is_test_record", "=", 0], ["Vehicle Insurance Policy", "policy_status", "=", "Active"]],
            "color": "#29cc39"
        },
        {
            "label": "Expired Insurance Policies",
            "document_type": "Vehicle Insurance Policy",
            "function": "Count",
            "aggregate_function_based_on": None,
            "filters": [["Vehicle Insurance Policy", "is_test_record", "=", 0], ["Vehicle Insurance Policy", "policy_status", "=", "Expired"]],
            "color": "#e24c4c"
        },
        {
            "label": "Total Insurance Premium",
            "document_type": "Vehicle Insurance Policy",
            "function": "Sum",
            "aggregate_function_based_on": "premium_amount",
            "filters": [["Vehicle Insurance Policy", "is_test_record", "=", 0], ["Vehicle Insurance Policy", "docstatus", "=", 1]],
            "currency": "INR",
            "color": "#3b82f6"
        },

        # G. Revenue & Financial Performance
        {
            "label": "Total Invoiced Revenue",
            "document_type": "Sales Invoice",
            "function": "Sum",
            "aggregate_function_based_on": "base_grand_total",
            "filters": [["Sales Invoice", "custom_is_test_record", "=", 0], ["Sales Invoice", "docstatus", "=", 1], ["Sales Invoice", "is_return", "=", 0]],
            "currency": "INR",
            "color": "#29cc39"
        },
        {
            "label": "Total Collected Revenue",
            "document_type": "Sales Invoice",
            "function": "Sum",
            "aggregate_function_based_on": "base_paid_amount",
            "filters": [["Sales Invoice", "custom_is_test_record", "=", 0], ["Sales Invoice", "docstatus", "=", 1], ["Sales Invoice", "is_return", "=", 0]],
            "currency": "INR",
            "color": "#3b82f6"
        },
        {
            "label": "Total Outstanding Receivables",
            "document_type": "Sales Invoice",
            "function": "Sum",
            "aggregate_function_based_on": "outstanding_amount",
            "filters": [["Sales Invoice", "custom_is_test_record", "=", 0], ["Sales Invoice", "docstatus", "=", 1], ["Sales Invoice", "is_return", "=", 0]],
            "currency": "INR",
            "color": "#e24c4c"
        },
        {
            "label": "Total Operational Expenses",
            "document_type": "Operational Expense",
            "function": "Sum",
            "aggregate_function_based_on": "posted_amount",
            "filters": [["Operational Expense", "is_test_record", "=", 0], ["Operational Expense", "docstatus", "=", 1], ["Operational Expense", "accounting_status", "=", "Posted"]],
            "currency": "INR",
            "color": "#ecad4b"
        }
    ]

    saved_cards = {}
    for c_cfg in cards:
        c_label = c_cfg["label"]
        data = {
            "doctype": "Number Card",
            "label": c_label,
            "module": "Fleet Management",
            "type": "Document Type",
            "document_type": c_cfg["document_type"],
            "function": c_cfg["function"],
            "aggregate_function_based_on": c_cfg["aggregate_function_based_on"],
            "is_public": 1,
            "show_full_number": 1,
            "currency": c_cfg.get("currency"),
            "color": c_cfg.get("color"),
            "filters_json": frappe.as_json(c_cfg["filters"])
        }
        if frappe.db.exists("Number Card", c_label):
            doc = frappe.get_doc("Number Card", c_label)
            doc.update(data)
            doc.save(ignore_permissions=True)
        else:
            doc = frappe.get_doc(data).insert(ignore_permissions=True)
        
        saved_cards[c_label] = doc.name
        print(f"Configured Number Card: {doc.name}")

    # ---------------------------------------------------------
    # 2. CONFIGURE 10 DASHBOARD CHARTS
    # ---------------------------------------------------------
    charts = [
        {
            "chart_name": "Fleet Status Distribution",
            "chart_type": "Group By",
            "type": "Donut",
            "document_type": "Vehicle",
            "group_by_type": "Count",
            "group_by_based_on": "vehicle_status",
            "aggregate_function_based_on": "name",
            "filters_json": '[["Vehicle", "is_test_record", "=", 0]]',
            "roles": ["System Manager", "Fleet Manager", "Workshop Supervisor", "Store Manager", "Accountant"]
        },
        {
            "chart_name": "Trips by Status",
            "chart_type": "Group By",
            "type": "Donut",
            "document_type": "Mining Trip",
            "group_by_type": "Count",
            "group_by_based_on": "trip_status",
            "aggregate_function_based_on": "name",
            "filters_json": '[["Mining Trip", "is_test_record", "=", 0]]',
            "roles": ["System Manager", "Fleet Manager", "Accountant"]
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
            "filters_json": '[["Mining Trip", "docstatus", "=", 1], ["Mining Trip", "is_test_record", "=", 0]]',
            "roles": ["System Manager", "Fleet Manager", "Accountant"]
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
            "filters_json": '[["Fuel Log", "docstatus", "=", 1], ["Fuel Log", "is_test_record", "=", 0]]',
            "roles": ["System Manager", "Fleet Manager", "Accountant"]
        },
        {
            "chart_name": "Fuel Consumption by Vehicle",
            "chart_type": "Group By",
            "type": "Bar",
            "document_type": "Fuel Log",
            "group_by_type": "Sum",
            "group_by_based_on": "vehicle",
            "aggregate_function_based_on": "quantity_litres",
            "filters_json": '[["Fuel Log", "docstatus", "=", 1], ["Fuel Log", "is_test_record", "=", 0]]',
            "roles": ["System Manager", "Fleet Manager"]
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
            "filters_json": '[["Vehicle Breakdown", "docstatus", "=", 1], ["Vehicle Breakdown", "is_test_record", "=", 0]]',
            "roles": ["System Manager", "Fleet Manager", "Workshop Supervisor", "Accountant"]
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
            "filters_json": '[["Sales Invoice", "docstatus", "=", 1], ["Sales Invoice", "outstanding_amount", ">", 0], ["Sales Invoice", "custom_is_test_record", "=", 0]]',
            "roles": ["System Manager", "Fleet Manager", "Accountant"]
        },
        {
            "chart_name": "Mine Site Tonnage Performance",
            "chart_type": "Group By",
            "type": "Bar",
            "document_type": "Mining Trip",
            "group_by_type": "Sum",
            "group_by_based_on": "mine_site",
            "aggregate_function_based_on": "net_weight_tons",
            "filters_json": '[["Mining Trip", "docstatus", "=", 1], ["Mining Trip", "is_test_record", "=", 0]]',
            "roles": ["System Manager", "Fleet Manager", "Accountant"]
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
            "filters_json": '[["Sales Invoice", "docstatus", "=", 1], ["Sales Invoice", "is_return", "=", 0], ["Sales Invoice", "custom_is_test_record", "=", 0]]',
            "roles": ["System Manager", "Fleet Manager", "Accountant"]
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
            "filters_json": '[["Operational Expense", "docstatus", "=", 1], ["Operational Expense", "is_test_record", "=", 0]]',
            "roles": ["System Manager", "Fleet Manager", "Accountant"]
        }
    ]

    saved_charts = {}
    for ch_cfg in charts:
        c_name = ch_cfg["chart_name"]
        data = {
            "doctype": "Dashboard Chart",
            "chart_name": c_name,
            "module": "Fleet Management",
            "chart_type": ch_cfg["chart_type"],
            "type": ch_cfg["type"],
            "document_type": ch_cfg["document_type"],
            "is_public": 1,
            "filters_json": ch_cfg["filters_json"]
        }
        for k in ["group_by_type", "group_by_based_on", "aggregate_function_based_on", "based_on", "value_based_on", "time_interval", "timespan", "timeseries"]:
            if k in ch_cfg:
                data[k] = ch_cfg[k]

        if frappe.db.exists("Dashboard Chart", c_name):
            doc = frappe.get_doc("Dashboard Chart", c_name)
            doc.update(data)
            doc.roles = []
            for r in ch_cfg.get("roles", []):
                doc.append("roles", {"role": r})
            doc.save(ignore_permissions=True)
        else:
            doc = frappe.get_doc(data)
            for r in ch_cfg.get("roles", []):
                doc.append("roles", {"role": r})
            doc.insert(ignore_permissions=True)
        
        saved_charts[c_name] = doc.name
        print(f"Configured Dashboard Chart: {doc.name}")

    # ---------------------------------------------------------
    # 3. CONFIGURE CENTRAL DASHBOARD
    # ---------------------------------------------------------
    d_name = "Fleet Operations & MIS Dashboard"
    if frappe.db.exists("Dashboard", d_name):
        dash = frappe.get_doc("Dashboard", d_name)
    else:
        dash = frappe.new_doc("Dashboard")
        dash.dashboard_name = d_name

    dash.module = "Fleet Management"
    dash.is_default = 1
    dash.is_standard = 0
    dash.charts = []
    dash.cards = []

    # Link all 10 charts
    for ch_cfg in charts:
        dash.append("charts", {"chart": saved_charts[ch_cfg["chart_name"]]})

    # Link primary KPI cards across functional areas
    primary_cards = [
        "Total Vehicles",
        "Active Vehicles",
        "Vehicles on Trip",
        "Active Breakdowns",
        "Trips in Progress",
        "Trips Awaiting Approval",
        "Delivered Trips",
        "Total Tonnage Hauled",
        "Total Fuel Consumed (L)",
        "Total Fuel Expenditure",
        "Average Fuel Efficiency (KM/L)",
        "Total Maintenance Cost",
        "Pending Material Requests",
        "Pending Purchase Orders",
        "Total Spare Stock Value",
        "Valid Insurance Policies",
        "Expired Insurance Policies",
        "Total Invoiced Revenue",
        "Total Collected Revenue",
        "Total Outstanding Receivables",
        "Total Operational Expenses"
    ]
    for card_label in primary_cards:
        if card_label in saved_cards:
            dash.append("cards", {"card": saved_cards[card_label]})

    dash.save(ignore_permissions=True)
    print(f"Configured Central Dashboard: {d_name}")

    # ---------------------------------------------------------
    # 4. CONFIGURE FLEET MANAGEMENT WORKSPACE
    # ---------------------------------------------------------
    ws_name = "Fleet Management"
    if frappe.db.exists("Workspace", ws_name):
        ws = frappe.get_doc("Workspace", ws_name)
    else:
        ws = frappe.new_doc("Workspace")
        ws.name = ws_name

    ws.title = "Fleet Management"
    ws.module = "Fleet Management"
    ws.public = 1
    ws.is_hidden = 0

    # Assign roles
    ws.roles = []
    for r in ["System Manager", "Fleet Manager", "Accountant", "Workshop Supervisor", "Store Manager"]:
        ws.append("roles", {"role": r})

    # Configure Shortcuts with actionable indicator badge filters
    ws.shortcuts = []
    shortcuts_data = [
        {
            "label": "Active Breakdowns",
            "type": "DocType",
            "link_to": "Vehicle Breakdown",
            "color": "Red",
            "stats_filter": '[["Vehicle Breakdown", "repair_status", "in", ["Reported", "Approved", "In Workshop", "Awaiting Parts"]], ["Vehicle Breakdown", "is_test_record", "=", 0]]'
        },
        {
            "label": "Pending Trip Approvals",
            "type": "DocType",
            "link_to": "Mining Trip",
            "color": "Orange",
            "stats_filter": '[["Mining Trip", "trip_status", "=", "Weighbridge Confirmed"], ["Mining Trip", "is_test_record", "=", 0]]'
        },
        {
            "label": "Vehicles Unavailable / Down",
            "type": "DocType",
            "link_to": "Vehicle",
            "color": "Red",
            "stats_filter": '[["Vehicle", "vehicle_status", "in", ["Under Maintenance", "Breakdown", "Out of Service"]], ["Vehicle", "is_test_record", "=", 0]]'
        },
        {
            "label": "Pending Purchase Orders",
            "type": "DocType",
            "link_to": "Purchase Order",
            "color": "Blue",
            "stats_filter": '[["Purchase Order", "status", "in", ["To Receive and Bill", "To Receive"]], ["Purchase Order", "docstatus", "=", 1]]'
        },
        {
            "label": "Unpaid Invoices",
            "type": "DocType",
            "link_to": "Sales Invoice",
            "color": "Orange",
            "stats_filter": '[["Sales Invoice", "outstanding_amount", ">", 0], ["Sales Invoice", "docstatus", "=", 1], ["Sales Invoice", "custom_is_test_record", "=", 0]]'
        },
        {
            "label": "Expiring Insurance / Documents",
            "type": "Report",
            "link_to": "Vehicle Document Expiry Report",
            "color": "Grey"
        },
        {
            "label": "Executive MIS Dashboard",
            "type": "Dashboard",
            "link_to": "Fleet Operations & MIS Dashboard",
            "color": "Green"
        }
    ]
    for s in shortcuts_data:
        ws.append("shortcuts", s)

    # Configure structured Card Links organizing all Batches 1-9 DocTypes & MIS Reports
    ws.links = []
    link_sections = [
        # Section 1: Fleet & Driver Master
        ("Fleet & Driver Registry", [
            ("Vehicle", "DocType", "Vehicle", 0),
            ("Driver", "DocType", "Driver", 0),
            ("Vehicle Insurance Policy", "DocType", "Vehicle Insurance Policy", 0),
            ("Mine Site", "DocType", "Mine Site", 0),
            ("Customer", "DocType", "Customer", 0)
        ]),
        # Section 2: Trip & Logistics
        ("Trip Operations & Haulage", [
            ("Mining Trip", "DocType", "Mining Trip", 0),
            ("Trip Operations Summary", "Report", "Trip Operations Summary", 1),
            ("Fleet Utilization", "Report", "Fleet Utilization", 1),
            ("Driver Performance", "Report", "Driver Performance", 1)
        ]),
        # Section 3: Fuel Management
        ("Fuel Operations & Efficiency", [
            ("Fuel Log", "DocType", "Fuel Log", 0),
            ("Fuel Efficiency (KM/L)", "Report", "Fuel Efficiency (KM/L)", 1),
            ("Daily Fuel Consumption", "Report", "Daily Fuel Consumption", 1),
            ("Monthly Fuel Cost", "Report", "Monthly Fuel Cost", 1),
            ("Fuel Consumption by Mine Site", "Report", "Fuel Consumption by Mine Site", 1)
        ]),
        # Section 4: Maintenance & Workshop
        ("Maintenance & Breakdowns", [
            ("Vehicle Breakdown", "DocType", "Vehicle Breakdown", 0),
            ("Vehicle Breakdown Part", "DocType", "Vehicle Breakdown Part", 0),
            ("Vehicle Maintenance History", "Report", "Vehicle Maintenance History", 1),
            ("Vehicle Downtime Report", "Report", "Vehicle Downtime Report", 1),
            ("Maintenance Cost by Vehicle", "Report", "Maintenance Cost by Vehicle", 1),
            ("Breakdown Frequency by Type", "Report", "Breakdown Frequency by Type", 1)
        ]),
        # Section 5: Procurement & Spares
        ("Procurement & Inventory", [
            ("Material Request", "DocType", "Material Request", 0),
            ("Purchase Order", "DocType", "Purchase Order", 0),
            ("Purchase Receipt", "DocType", "Purchase Receipt", 0),
            ("Stock Entry", "DocType", "Stock Entry", 0),
            ("Item", "DocType", "Item", 0),
            ("Low Stock / Reorder Report", "Report", "Low Stock / Reorder Report", 1),
            ("Pending Purchase Orders", "Report", "Pending Purchase Orders", 1),
            ("Spare Parts Stock Register", "Report", "Spare Parts Stock Register", 1)
        ]),
        # Section 6: Finance & Revenue
        ("Revenue, Billing & Expenses", [
            ("Sales Invoice", "DocType", "Sales Invoice", 0),
            ("Payment Entry", "DocType", "Payment Entry", 0),
            ("Operational Expense", "DocType", "Operational Expense", 0),
            ("Purchase Invoice", "DocType", "Purchase Invoice", 0),
            ("Journal Entry", "DocType", "Journal Entry", 0),
            ("Outstanding Revenue / Receivables", "Report", "Outstanding Revenue / Receivables", 1),
            ("Monthly Revenue Summary", "Report", "Monthly Revenue Summary", 1),
            ("Customer-wise Revenue", "Report", "Customer-wise Revenue", 1)
        ]),
        # Section 7: Management MIS & Analytics
        ("Executive MIS & Profitability", [
            ("Vehicle Performance Summary", "Report", "Vehicle Performance Summary", 1),
            ("Vehicle-wise Revenue and Profitability", "Report", "Vehicle-wise Revenue and Profitability", 1),
            ("Mine Site-wise Revenue and Profitability", "Report", "Mine Site-wise Revenue and Profitability", 1),
            ("Trip-wise Revenue and Profitability", "Report", "Trip-wise Revenue and Profitability", 1),
            ("Revenue vs Cost Analysis", "Report", "Revenue vs Cost Analysis", 1),
            ("Operating Cost Summary", "Report", "Operating Cost Summary", 1),
            ("Vehicle Operating Cost Analysis", "Report", "Vehicle Operating Cost Analysis", 1),
            ("Expired Insurance & Documents", "Report", "Expired Insurance & Documents", 1)
        ])
    ]

    for section_title, items in link_sections:
        ws.append("links", {
            "type": "Card Break",
            "label": section_title,
            "link_count": len(items)
        })
        for label, l_type, l_to, is_qr in items:
            ws.append("links", {
                "type": "Link",
                "label": label,
                "link_type": l_type,
                "link_to": l_to,
                "is_query_report": is_qr
            })

    # Build Content Blocks (EditorJS format)
    content_blocks = [
        {"id": uuid.uuid4().hex[:10], "type": "header", "data": {"text": "Fleet Management & MIS Command Center", "level": 2}},
        {"id": uuid.uuid4().hex[:10], "type": "paragraph", "data": {"text": "Operational intelligence, real-time fleet health, trip monitoring, procurement status, and executive profitability analytics."}},
        
        # Operational Number Cards (Row 1: Fleet & Operations)
        {"id": uuid.uuid4().hex[:10], "type": "number_card", "data": {"number_card_name": saved_cards["Active Vehicles"], "col": 3}},
        {"id": uuid.uuid4().hex[:10], "type": "number_card", "data": {"number_card_name": saved_cards["Vehicles on Trip"], "col": 3}},
        {"id": uuid.uuid4().hex[:10], "type": "number_card", "data": {"number_card_name": saved_cards["Active Breakdowns"], "col": 3}},
        {"id": uuid.uuid4().hex[:10], "type": "number_card", "data": {"number_card_name": saved_cards["Trips Awaiting Approval"], "col": 3}},

        # Financial & Performance Number Cards (Row 2: Financials & Volume)
        {"id": uuid.uuid4().hex[:10], "type": "number_card", "data": {"number_card_name": saved_cards["Total Tonnage Hauled"], "col": 3}},
        {"id": uuid.uuid4().hex[:10], "type": "number_card", "data": {"number_card_name": saved_cards["Total Invoiced Revenue"], "col": 3}},
        {"id": uuid.uuid4().hex[:10], "type": "number_card", "data": {"number_card_name": saved_cards["Total Outstanding Receivables"], "col": 3}},
        {"id": uuid.uuid4().hex[:10], "type": "number_card", "data": {"number_card_name": saved_cards["Total Fuel Expenditure"], "col": 3}},

        # Dashboard Charts Row 1: Fleet Distribution & Monthly Tonnage
        {"id": uuid.uuid4().hex[:10], "type": "chart", "data": {"chart_name": "Fleet Status Distribution", "col": 6}},
        {"id": uuid.uuid4().hex[:10], "type": "chart", "data": {"chart_name": "Monthly Tonnage Trend", "col": 6}},

        # Dashboard Charts Row 2: Fuel Expenditure & Maintenance Cost
        {"id": uuid.uuid4().hex[:10], "type": "chart", "data": {"chart_name": "Monthly Fuel Expenditure", "col": 6}},
        {"id": uuid.uuid4().hex[:10], "type": "chart", "data": {"chart_name": "Maintenance Cost Trend", "col": 6}},

        # Dashboard Charts Row 3: Revenue & Receivables
        {"id": uuid.uuid4().hex[:10], "type": "chart", "data": {"chart_name": "Monthly Invoiced Revenue Trend", "col": 6}},
        {"id": uuid.uuid4().hex[:10], "type": "chart", "data": {"chart_name": "Outstanding Receivables Trend", "col": 6}},

        # Actionable Shortcuts
        {"id": uuid.uuid4().hex[:10], "type": "header", "data": {"text": "Operational Alerts & Quick Actions", "level": 3}},
        {"id": uuid.uuid4().hex[:10], "type": "shortcut", "data": {"shortcut_name": "Active Breakdowns", "col": 3}},
        {"id": uuid.uuid4().hex[:10], "type": "shortcut", "data": {"shortcut_name": "Pending Trip Approvals", "col": 3}},
        {"id": uuid.uuid4().hex[:10], "type": "shortcut", "data": {"shortcut_name": "Vehicles Unavailable / Down", "col": 3}},
        {"id": uuid.uuid4().hex[:10], "type": "shortcut", "data": {"shortcut_name": "Pending Purchase Orders", "col": 3}},
        {"id": uuid.uuid4().hex[:10], "type": "shortcut", "data": {"shortcut_name": "Unpaid Invoices", "col": 3}},
        {"id": uuid.uuid4().hex[:10], "type": "shortcut", "data": {"shortcut_name": "Executive MIS Dashboard", "col": 3}},

        # Structured Modules & Report Cards
        {"id": uuid.uuid4().hex[:10], "type": "header", "data": {"text": "Fleet Management Modules & Management Reports", "level": 3}},
        {"id": uuid.uuid4().hex[:10], "type": "card", "data": {"card_name": "Fleet & Driver Registry", "col": 4}},
        {"id": uuid.uuid4().hex[:10], "type": "card", "data": {"card_name": "Trip Operations & Haulage", "col": 4}},
        {"id": uuid.uuid4().hex[:10], "type": "card", "data": {"card_name": "Fuel Operations & Efficiency", "col": 4}},
        {"id": uuid.uuid4().hex[:10], "type": "card", "data": {"card_name": "Maintenance & Breakdowns", "col": 4}},
        {"id": uuid.uuid4().hex[:10], "type": "card", "data": {"card_name": "Procurement & Inventory", "col": 4}},
        {"id": uuid.uuid4().hex[:10], "type": "card", "data": {"card_name": "Revenue, Billing & Expenses", "col": 4}},
        {"id": uuid.uuid4().hex[:10], "type": "card", "data": {"card_name": "Executive MIS & Profitability", "col": 4}}
    ]

    ws.content = frappe.as_json(content_blocks)
    ws.save(ignore_permissions=True)
    print("Configured Fleet Management Workspace with full cards, charts, shortcuts, and module links.")

    frappe.clear_cache()
    frappe.db.commit()
    print("=== BATCH 10 DASHBOARD & WORKSPACE SETUP COMPLETED SUCCESSFULLY ===")

if __name__ == "__main__":
    setup_batch10()
