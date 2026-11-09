import frappe
from frappe.utils import today, add_days, now_datetime
from frappe.desk.doctype.number_card.number_card import get_result
from frappe.desk.doctype.dashboard_chart.dashboard_chart import get as get_chart

def run():
    print("=====================================================================")
    print("         UPTOWARE FLEET ERP - BATCH 10 AUTOMATED TEST SUITE          ")
    print("                   DASHBOARD & MIS MANAGEMENT                        ")
    print("=====================================================================\n")

    passed = 0
    total = 0

    def assert_true(condition, test_name, details=""):
        nonlocal passed, total
        total += 1
        if condition:
            passed += 1
            print(f"  [PASS] Test {total:02d}: {test_name} {details}")
        else:
            print(f"  [FAIL] Test {total:02d}: {test_name} {details}")
            raise AssertionError(f"Test failed: {test_name} - {details}")

    # -------------------------------------------------------------
    # 1. VERIFY ALL 4 NEW MIS QUERY REPORTS
    # -------------------------------------------------------------
    new_reports = [
        "Fleet Utilization",
        "Vehicle Performance Summary",
        "Driver Performance",
        "Trip Operations Summary"
    ]
    for rep_name in new_reports:
        rep = frappe.get_doc("Report", rep_name)
        assert_true(rep.report_type in ["Query Report", "Script Report"], f"Report '{rep_name}' is Query or Script Report", f"(Module: {rep.module})")
        assert_true(rep.disabled == 0, f"Report '{rep_name}' is enabled")
        assert_true(bool(rep.javascript), f"Report '{rep_name}' has JS filters defined")

    # -------------------------------------------------------------
    # 2. EXECUTE QUERY REPORTS WITH FILTERS & VERIFY ZERO DEFECTS
    # -------------------------------------------------------------
    filters_base = {
        "from_date": None,
        "to_date": None,
        "vehicle": None,
        "driver": None,
        "mine_site": None,
        "customer": None,
        "trip_status": None,
        "vehicle_status": None,
        "status": None,
        "billing_status": None
    }
    for rep_name in new_reports:
        rep = frappe.get_doc("Report", rep_name)
        res = frappe.db.sql(rep.query, filters_base, as_dict=True)
        assert_true(isinstance(res, list), f"Query execution for '{rep_name}'", f"(Rows: {len(res)})")

    # -------------------------------------------------------------
    # 3. VERIFY TEST-RECORD QUARANTINE IN NEW REPORTS
    # -------------------------------------------------------------
    # Create test vehicle with test tag
    plate1 = f"OD02B10{frappe.generate_hash(length=4).upper()}"
    test_veh = frappe.get_doc({
        "doctype": "Vehicle",
        "license_plate": plate1,
        "make": "TestMake",
        "model": "TestModel",
        "vehicle_status": "Active",
        "is_test_record": 1,
        "uom": "Nos",
        "last_odometer": 1000,
        "start_date": "2026-01-01",
        "end_date": "2027-12-31",
        "fitness_expiry_date": "2027-12-31",
        "puc_expiry_date": "2027-12-31",
        "road_tax_expiry_date": "2027-12-31",
        "permit_expiry_date": "2027-12-31"
    }).insert(ignore_permissions=True)

    # Check Fleet Utilization & Vehicle Performance
    rep_fu = frappe.get_doc("Report", "Fleet Utilization")
    fu_rows = frappe.db.sql(rep_fu.query, filters_base, as_dict=True)
    assert_true(not any(r.get("Vehicle") == test_veh.name for r in fu_rows), "Fleet Utilization strictly excludes test vehicles")

    rep_vps = frappe.get_doc("Report", "Vehicle Performance Summary")
    vps_rows = frappe.db.sql(rep_vps.query, filters_base, as_dict=True)
    assert_true(not any(r.get("Vehicle") == test_veh.name for r in vps_rows), "Vehicle Performance Summary strictly excludes test vehicles")

    # Clean up test vehicle
    test_veh.delete(ignore_permissions=True)

    # -------------------------------------------------------------
    # 4. VERIFY ALL 36 NUMBER CARDS
    # -------------------------------------------------------------
    expected_cards = [
        "Total Vehicles", "Active Vehicles", "Vehicles on Trip", "Vehicles in Maintenance",
        "Vehicles in Breakdown", "Vehicles Out of Service", "Active Drivers", "Inactive Drivers",
        "Trips in Progress", "Trips Awaiting Weighbridge", "Trips Awaiting Approval",
        "Delivered Trips", "Cancelled Trips", "Total Tonnage Hauled",
        "Total Fuel Consumed (L)", "Total Fuel Expenditure", "Average Fuel Efficiency (KM/L)",
        "Active Breakdowns", "Vehicles in Workshop", "Vehicles Awaiting Parts",
        "Repaired Breakdowns", "Total Maintenance Cost", "Total Parts Cost", "Total Labour Cost",
        "Pending Material Requests", "Pending Purchase Orders", "Pending Purchase Receipts",
        "Pending Purchase Invoices", "Total Spare Stock Value",
        "Valid Insurance Policies", "Expired Insurance Policies", "Total Insurance Premium",
        "Total Invoiced Revenue", "Total Collected Revenue", "Total Outstanding Receivables",
        "Total Operational Expenses"
    ]
    print("\n--- Verifying Evaluation of all 36 Number Cards ---")
    cards_evaluated = 0
    for c_label in expected_cards:
        assert_true(frappe.db.exists("Number Card", c_label), f"Number Card '{c_label}' exists")
        c_doc = frappe.get_doc("Number Card", c_label)
        val = get_result(c_doc, filters=c_doc.filters_json)
        assert_true(val is not None and isinstance(val, (int, float)), f"Number Card '{c_label}' evaluates numerically", f"(Value: {val})")
        cards_evaluated += 1

    assert_true(cards_evaluated == 36, "All 36 required Number Cards evaluated successfully")

    # -------------------------------------------------------------
    # 5. NUMBER CARD TEST-RECORD QUARANTINE VERIFICATION
    # -------------------------------------------------------------
    card_tot_veh = frappe.get_doc("Number Card", "Total Vehicles")
    val_before = get_result(card_tot_veh, filters=card_tot_veh.filters_json)

    # Insert test vehicle with is_test_record = 1
    plate2 = f"OD02Q{frappe.generate_hash(length=4).upper()}"
    t_veh = frappe.get_doc({
        "doctype": "Vehicle",
        "license_plate": plate2,
        "make": "QuarMake",
        "model": "QuarModel",
        "vehicle_status": "Active",
        "is_test_record": 1,
        "uom": "Nos",
        "last_odometer": 1000,
        "start_date": "2026-01-01",
        "end_date": "2027-12-31"
    }).insert(ignore_permissions=True)

    val_after = get_result(card_tot_veh, filters=card_tot_veh.filters_json)
    assert_true(val_before == val_after, "Number Card excludes test records", f"(Before: {val_before}, After: {val_after})")
    t_veh.delete(ignore_permissions=True)

    # -------------------------------------------------------------
    # 6. VERIFY ALL 10 DASHBOARD CHARTS
    # -------------------------------------------------------------
    expected_charts = [
        "Fleet Status Distribution",
        "Trips by Status",
        "Monthly Tonnage Trend",
        "Monthly Fuel Expenditure",
        "Fuel Consumption by Vehicle",
        "Maintenance Cost Trend",
        "Outstanding Receivables Trend",
        "Mine Site Tonnage Performance",
        "Monthly Invoiced Revenue Trend",
        "Monthly Operational Expense Trend"
    ]
    print("\n--- Verifying Evaluation of all 10 Dashboard Charts ---")
    for ch_name in expected_charts:
        assert_true(frappe.db.exists("Dashboard Chart", ch_name), f"Dashboard Chart '{ch_name}' exists")
        ch_res = get_chart(chart_name=ch_name)
        # Result is either a dict with labels/datasets or None (when underlying filter has 0 records)
        assert_true(ch_res is None or isinstance(ch_res, dict), f"Dashboard Chart '{ch_name}' evaluates safely", f"(Configured properly)")

    # -------------------------------------------------------------
    # 7. VERIFY CENTRAL DASHBOARD DOCUMENT
    # -------------------------------------------------------------
    dash_name = "Fleet Operations & MIS Dashboard"
    assert_true(frappe.db.exists("Dashboard", dash_name), f"Central Dashboard '{dash_name}' exists")
    dash = frappe.get_doc("Dashboard", dash_name)
    assert_true(dash.is_default == 1, "Central Dashboard is default")
    assert_true(len(dash.charts) == 10, "Central Dashboard links all 10 Dashboard Charts", f"({len(dash.charts)} charts)")
    assert_true(len(dash.cards) >= 20, "Central Dashboard links primary Number Cards", f"({len(dash.cards)} cards)")

    # -------------------------------------------------------------
    # 8. VERIFY FLEET MANAGEMENT WORKSPACE
    # -------------------------------------------------------------
    ws = frappe.get_doc("Workspace", "Fleet Management")
    assert_true(ws.public == 1, "Fleet Management Workspace is public")
    assert_true(ws.is_hidden == 0, "Fleet Management Workspace is visible")
    assert_true(len(ws.shortcuts) >= 7, "Fleet Management Workspace has actionable shortcuts", f"({len(ws.shortcuts)} shortcuts)")
    assert_true(len(ws.links) >= 30, "Fleet Management Workspace has organized module links", f"({len(ws.links)} links)")
    assert_true(bool(ws.content), "Fleet Management Workspace has rich EditorJS content")

    # Verify role assignment on workspace
    ws_roles = [r.role for r in ws.roles]
    for req_role in ["System Manager", "Fleet Manager", "Accountant", "Workshop Supervisor", "Store Manager"]:
        assert_true(req_role in ws_roles, f"Workspace accessible to role '{req_role}'")

    # -------------------------------------------------------------
    # 9. VERIFY ROLE-BASED ACCESS & PERMISSION SEGREGATION
    # -------------------------------------------------------------
    # Workshop Supervisor should NOT have access to financial reports or revenue charts
    rep_vps = frappe.get_doc("Report", "Vehicle Performance Summary")
    vps_roles = [r.role for r in rep_vps.roles]
    assert_true("Workshop Supervisor" not in vps_roles, "Workshop Supervisor blocked from Vehicle Performance Summary")
    assert_true("Accountant" in vps_roles, "Accountant has access to Vehicle Performance Summary")
    assert_true("Fleet Manager" in vps_roles, "Fleet Manager has access to Vehicle Performance Summary")

    ch_rev = frappe.get_doc("Dashboard Chart", "Monthly Invoiced Revenue Trend")
    ch_rev_roles = [r.role for r in ch_rev.roles]
    assert_true("Workshop Supervisor" not in ch_rev_roles, "Workshop Supervisor blocked from Invoiced Revenue Chart")
    assert_true("Accountant" in ch_rev_roles, "Accountant has access to Invoiced Revenue Chart")

    # -------------------------------------------------------------
    # 10. VERIFY CANCELLED DOCUMENT EXCLUSION IN CHARTS & REPORTS
    # -------------------------------------------------------------
    rep_tos = frappe.get_doc("Report", "Trip Operations Summary")
    # Verify that query filters mt.docstatus != 2
    assert_true("mt.docstatus != 2" in rep_tos.query, "Trip Operations Summary excludes cancelled trips")

    rep_fu = frappe.get_doc("Report", "Fleet Utilization")
    assert_true("mt.docstatus != 2" in rep_fu.query, "Fleet Utilization excludes cancelled trips")
    assert_true("vb_sub.docstatus != 2" in rep_fu.query, "Fleet Utilization excludes cancelled breakdowns")

    print(f"\n=====================================================================")
    print(f"      BATCH 10 TEST RESULT: {passed} / {total} TESTS PASSED (100%)       ")
    print(f"=====================================================================\n")

if __name__ == "__main__":
    run()
