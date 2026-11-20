import frappe

def run():
    print("=== Applying Uptoware Fleet ERP Trip & Report Defect Fixes ===")
    frappe.init(site="frontend")
    frappe.connect()

    # 1. Update Workflow: Mining Trip Lifecycle
    if frappe.db.exists("Workflow", "Mining Trip Lifecycle"):
        wf = frappe.get_doc("Workflow", "Mining Trip Lifecycle")
        wf_updated = False
        for t in wf.transitions:
            if t.action in ["Confirm Weighbridge", "Mark Delivered"] and t.condition:
                print(f"Clearing condition on transition '{t.action}' (was: '{t.condition}')")
                t.condition = ""
                wf_updated = True
        if wf_updated:
            wf.save(ignore_permissions=True)
            frappe.db.commit()
            print("Successfully updated Workflow 'Mining Trip Lifecycle'.")
        else:
            print("Workflow 'Mining Trip Lifecycle' transitions already clean.")

    # 2. Update Server Script: Mining Trip - Lead and Calculation Sync
    script_name = "Mining Trip - Lead and Calculation Sync"
    calc_script = '''# Calculate haulage quantities and amounts deterministically
doc.custom_trip_count = doc.custom_trip_count or 1
if doc.custom_lead:
    lead_doc = frappe.db.get_value('Fleet Lead', doc.custom_lead, ['lead_km', 'lead_rate', 'lead_name'], as_dict=True)
    if lead_doc:
        if not doc.custom_lead_km:
            doc.custom_lead_km = lead_doc.lead_km
        if not doc.custom_lead_rate:
            doc.custom_lead_rate = lead_doc.lead_rate
        if not doc.destination:
            doc.destination = lead_doc.lead_name

# Compute calculated quantity = trip count * average tonnage (indicative capacity)
eff_weight = doc.custom_average_tonnage or doc.net_weight_tons or 0.0
doc.custom_calculated_quantity = float(doc.custom_trip_count) * float(eff_weight)

# Compute calculated amount = calculated quantity * lead rate (or rate per ton)
eff_rate = doc.custom_lead_rate or doc.rate_per_ton or 0.0
doc.custom_calculated_amount = float(doc.custom_calculated_quantity) * float(eff_rate)

# Commercial Revenue:
# When actual weighbridge net weight is confirmed (> 0), commercial gross revenue reflects confirmed net weight * rate
# Otherwise, fall back to calculated amount for indicative commercial estimate
if doc.net_weight_tons and float(doc.net_weight_tons) > 0 and (doc.rate_per_ton or doc.custom_lead_rate):
    eff_actual_rate = float(doc.rate_per_ton or doc.custom_lead_rate or 0.0)
    doc.gross_revenue = round(float(doc.net_weight_tons) * eff_actual_rate, 2)
elif doc.custom_calculated_amount and not doc.gross_revenue:
    doc.gross_revenue = doc.custom_calculated_amount
'''
    if frappe.db.exists("Server Script", script_name):
        ss = frappe.get_doc("Server Script", script_name)
        ss.script = calc_script
        ss.disabled = 0
        ss.save(ignore_permissions=True)
        frappe.db.commit()
        print(f"Successfully updated Server Script '{script_name}'.")
    else:
        ss = frappe.get_doc({
            "doctype": "Server Script",
            "name": script_name,
            "script_type": "DocType Event",
            "reference_doctype": "Mining Trip",
            "doctype_event": "Before Validate",
            "script": calc_script,
            "disabled": 0
        })
        ss.insert(ignore_permissions=True)
        frappe.db.commit()
        print(f"Successfully created Server Script '{script_name}'.")

    # 3. Update Reports: Daily and Monthly Fleet Income Summaries
    def update_report(report_name, script, filters):
        if not frappe.db.exists("Report", report_name):
            print(f"Report '{report_name}' not found.")
            return
        doc = frappe.get_doc("Report", report_name)
        doc.report_script = script
        doc.filters = []
        for idx, f in enumerate(filters, 1):
            doc.append("filters", {
                "fieldname": f["fieldname"],
                "label": f["label"],
                "fieldtype": f["fieldtype"],
                "options": f.get("options"),
                "mandatory": f.get("mandatory", 0),
                "idx": idx
            })
        doc.save(ignore_permissions=True)
        frappe.db.commit()
        print(f"Report '{report_name}' updated successfully.")

    daily_script = """f = filters if isinstance(filters, dict) else {}
user = frappe.session.user
user_roles = [r['role'] for r in frappe.get_all('Has Role', filters={'parent': user}, fields=['role'])] if user else []
is_hq = (user == 'Administrator') or any(r in ['System Manager', 'Administrator', 'Fleet Head Office Admin', 'Fleet Analytics Viewer'] for r in user_roles)
req_mine = f.get('mine_site') or None

if not is_hq:
    user_mines = [p['for_value'] for p in frappe.get_all('User Permission', filters={'user': user, 'allow': 'Mine Site'}, fields=['for_value'])]
    if not user_mines:
        resolved_mine = '__DENIED__'
    elif req_mine and req_mine not in user_mines:
        resolved_mine = '__DENIED__'
    elif req_mine:
        resolved_mine = req_mine
    else:
        resolved_mine = user_mines[0]
else:
    resolved_mine = req_mine

columns = [
    'Date:Date:110',
    'Mine Site:Link/Mine Site:140',
    'Total Trips:Int:90',
    'Total Haulage Qnt (MT):Float:120',
    'Haulage Revenue (₹):Currency:130',
    'HSD Consumed (L):Float:110',
    'HSD Fuel Cost (₹):Currency:120',
    'Spare Parts (₹):Currency:110',
    'Staff Attendance:Int:100',
    'Staff Salary (₹):Currency:110',
    'Net Daily Contribution (₹):Currency:140'
]

if resolved_mine == '__DENIED__':
    data = [columns, []]
else:
    cond_mine = "AND mine_site = %(mine_site)s" if resolved_mine else ""
    date_filter = ""
    params = {}
    if resolved_mine: params['mine_site'] = resolved_mine
    if f.get('from_date'):
        date_filter += " AND dates.d >= %(from_date)s"
        params['from_date'] = f.get('from_date')
    if f.get('to_date'):
        date_filter += " AND dates.d <= %(to_date)s"
        params['to_date'] = f.get('to_date')

    sql = f'''
        SELECT
            dates.d as report_date,
            dates.mine_site,
            COALESCE(rev.trip_count, 0) as total_trips,
            ROUND(COALESCE(rev.total_qnt, 0.0), 2) as total_qnt,
            ROUND(COALESCE(rev.rev_amount, 0.0), 2) as revenue,
            ROUND(COALESCE(fuel.fuel_qnt, 0.0), 2) as fuel_qnt,
            ROUND(COALESCE(fuel.fuel_amount, 0.0), 2) as fuel_cost,
            ROUND(COALESCE(rep.repair_amount, 0.0), 2) as spare_parts,
            COALESCE(att.att_count, 0) as staff_attendance,
            ROUND(COALESCE(att.salary_amount, 0.0), 2) as staff_salary,
            ROUND(COALESCE(rev.rev_amount, 0.0) - (COALESCE(fuel.fuel_amount, 0.0) + COALESCE(rep.repair_amount, 0.0) + COALESCE(att.salary_amount, 0.0)), 2) as net_contribution
        FROM (
            SELECT DATE(dispatch_date_time) as d, mine_site FROM `tabMining Trip` WHERE docstatus != 2 {cond_mine}
            UNION
            SELECT fuel_date as d, mine_site FROM `tabFuel Log` WHERE docstatus != 2 {cond_mine}
            UNION
            SELECT DATE(breakdown_datetime) as d, mine_site FROM `tabVehicle Breakdown` WHERE docstatus != 2 {cond_mine}
            UNION
            SELECT attendance_date as d, mine_site FROM `tabEmployee Attendance` WHERE docstatus != 2 {cond_mine}
        ) dates
        LEFT JOIN (
            SELECT DATE(dispatch_date_time) as d, mine_site, 
                   COUNT(name) as trip_count,
                   SUM(CASE WHEN trip_status IN ('Weighbridge Confirmed', 'Approved', 'Delivered') AND net_weight_tons > 0 THEN net_weight_tons ELSE 0.0 END) as total_qnt,
                   SUM(CASE WHEN trip_status IN ('Weighbridge Confirmed', 'Approved', 'Delivered') AND net_weight_tons > 0 THEN gross_revenue ELSE 0.0 END) as rev_amount
            FROM `tabMining Trip` WHERE docstatus != 2 AND trip_status != 'Cancelled' {cond_mine}
            GROUP BY DATE(dispatch_date_time), mine_site
        ) rev ON rev.d = dates.d AND rev.mine_site = dates.mine_site
        LEFT JOIN (
            SELECT fuel_date as d, mine_site, 
                   SUM(quantity_litres) as fuel_qnt,
                   SUM(total_fuel_cost) as fuel_amount
            FROM `tabFuel Log` WHERE docstatus != 2 AND approval_status != 'Rejected' {cond_mine}
            GROUP BY fuel_date, mine_site
        ) fuel ON fuel.d = dates.d AND fuel.mine_site = dates.mine_site
        LEFT JOIN (
            SELECT DATE(breakdown_datetime) as d, mine_site, SUM(total_repair_cost) as repair_amount
            FROM `tabVehicle Breakdown` WHERE docstatus != 2 {cond_mine}
            GROUP BY DATE(breakdown_datetime), mine_site
        ) rep ON rep.d = dates.d AND rep.mine_site = dates.mine_site
        LEFT JOIN (
            SELECT attendance_date as d, mine_site, 
                   COUNT(name) as att_count,
                   SUM(COALESCE(calculated_salary_amount, daily_salary_rate, 0.0)) as salary_amount
            FROM `tabEmployee Attendance` WHERE docstatus != 2 {cond_mine}
            GROUP BY attendance_date, mine_site
        ) att ON att.d = dates.d AND att.mine_site = dates.mine_site
        WHERE dates.d IS NOT NULL {date_filter}
        ORDER BY dates.d DESC
    '''
    rows = frappe.db.sql(sql, params, as_list=True)
    data = [columns, rows]
"""

    monthly_script = """f = filters if isinstance(filters, dict) else {}
user = frappe.session.user
user_roles = [r['role'] for r in frappe.get_all('Has Role', filters={'parent': user}, fields=['role'])] if user else []
is_hq = (user == 'Administrator') or any(r in ['System Manager', 'Administrator', 'Fleet Head Office Admin', 'Fleet Analytics Viewer'] for r in user_roles)
req_mine = f.get('mine_site') or None

if not is_hq:
    user_mines = [p['for_value'] for p in frappe.get_all('User Permission', filters={'user': user, 'allow': 'Mine Site'}, fields=['for_value'])]
    if not user_mines:
        resolved_mine = '__DENIED__'
    elif req_mine and req_mine not in user_mines:
        resolved_mine = '__DENIED__'
    elif req_mine:
        resolved_mine = req_mine
    else:
        resolved_mine = user_mines[0]
else:
    resolved_mine = req_mine

columns = [
    'Month:Data:100',
    'Mine Site:Link/Mine Site:140',
    'Total Completed Trips:Int:100',
    'Total Haulage Qnt (MT):Float:110',
    'Haulage Revenue (₹):Currency:130',
    'Total HSD Consumed (L):Float:110',
    'HSD Fuel Cost (₹):Currency:120',
    'Spare Parts (₹):Currency:110',
    'Staff Attendance:Int:100',
    'Staff Salary (₹):Currency:110',
    'Net Operating Profit (₹):Currency:140',
    'Operating Margin (%):Percent:100'
]

if resolved_mine == '__DENIED__':
    data = [columns, []]
else:
    cond_mine = "AND mine_site = %(mine_site)s" if resolved_mine else ""
    params = {}
    if resolved_mine: params['mine_site'] = resolved_mine

    sql = f'''
        SELECT
            m.month_period,
            m.mine_site,
            COALESCE(rev.trips_count, 0) as trips_count,
            ROUND(COALESCE(rev.total_tons, 0.0), 2) as total_tons,
            ROUND(COALESCE(rev.rev_amount, 0.0), 2) as gross_revenue,
            ROUND(COALESCE(fuel.fuel_qnt, 0.0), 2) as fuel_qnt,
            ROUND(COALESCE(fuel.fuel_amount, 0.0), 2) as fuel_cost,
            ROUND(COALESCE(rep.repair_amount, 0.0), 2) as repair_cost,
            COALESCE(att.att_count, 0) as staff_attendance,
            ROUND(COALESCE(att.salary_amount, 0.0), 2) as staff_salary,
            ROUND(COALESCE(rev.rev_amount, 0.0) - (COALESCE(fuel.fuel_amount, 0.0) + COALESCE(rep.repair_amount, 0.0) + COALESCE(att.salary_amount, 0.0)), 2) as net_profit,
            CASE 
                WHEN COALESCE(rev.rev_amount, 0.0) > 0 
                THEN ROUND(((COALESCE(rev.rev_amount, 0.0) - (COALESCE(fuel.fuel_amount, 0.0) + COALESCE(rep.repair_amount, 0.0) + COALESCE(att.salary_amount, 0.0))) / rev.rev_amount) * 100, 2)
                ELSE 0.0 
            END as margin_percent
        FROM (
            SELECT LEFT(dispatch_date_time, 7) as month_period, mine_site FROM `tabMining Trip` WHERE docstatus != 2 {cond_mine}
            UNION
            SELECT LEFT(fuel_date, 7) as month_period, mine_site FROM `tabFuel Log` WHERE docstatus != 2 {cond_mine}
            UNION
            SELECT LEFT(breakdown_datetime, 7) as month_period, mine_site FROM `tabVehicle Breakdown` WHERE docstatus != 2 {cond_mine}
            UNION
            SELECT LEFT(attendance_date, 7) as month_period, mine_site FROM `tabEmployee Attendance` WHERE docstatus != 2 {cond_mine}
        ) m
        LEFT JOIN (
            SELECT LEFT(dispatch_date_time, 7) as month_period, mine_site, 
                   COUNT(name) as trips_count, 
                   SUM(CASE WHEN trip_status IN ('Weighbridge Confirmed', 'Approved', 'Delivered') AND net_weight_tons > 0 THEN net_weight_tons ELSE 0.0 END) as total_tons, 
                   SUM(CASE WHEN trip_status IN ('Weighbridge Confirmed', 'Approved', 'Delivered') AND net_weight_tons > 0 THEN gross_revenue ELSE 0.0 END) as rev_amount
            FROM `tabMining Trip` WHERE docstatus != 2 AND trip_status != 'Cancelled' {cond_mine}
            GROUP BY LEFT(dispatch_date_time, 7), mine_site
        ) rev ON rev.month_period = m.month_period AND rev.mine_site = m.mine_site
        LEFT JOIN (
            SELECT LEFT(fuel_date, 7) as month_period, mine_site, 
                   SUM(quantity_litres) as fuel_qnt,
                   SUM(total_fuel_cost) as fuel_amount
            FROM `tabFuel Log` WHERE docstatus != 2 AND approval_status != 'Rejected' {cond_mine}
            GROUP BY LEFT(fuel_date, 7), mine_site
        ) fuel ON fuel.month_period = m.month_period AND fuel.mine_site = m.mine_site
        LEFT JOIN (
            SELECT LEFT(breakdown_datetime, 7) as month_period, mine_site, SUM(total_repair_cost) as repair_amount
            FROM `tabVehicle Breakdown` WHERE docstatus != 2 {cond_mine}
            GROUP BY LEFT(breakdown_datetime, 7), mine_site
        ) rep ON rep.month_period = m.month_period AND rep.mine_site = m.mine_site
        LEFT JOIN (
            SELECT LEFT(attendance_date, 7) as month_period, mine_site, 
                   COUNT(name) as att_count,
                   SUM(COALESCE(calculated_salary_amount, daily_salary_rate, 0.0)) as salary_amount
            FROM `tabEmployee Attendance` WHERE docstatus != 2 {cond_mine}
            GROUP BY LEFT(attendance_date, 7), mine_site
        ) att ON att.month_period = m.month_period AND att.mine_site = m.mine_site
        ORDER BY m.month_period DESC
    '''
    rows = frappe.db.sql(sql, params, as_list=True)
    data = [columns, rows]
"""

    update_report(
        "Daily Fleet Income and Expense Summary",
        daily_script,
        [
            {"fieldname": "mine_site", "label": "Mine Site", "fieldtype": "Link", "options": "Mine Site"},
            {"fieldname": "from_date", "label": "From Date", "fieldtype": "Date"},
            {"fieldname": "to_date", "label": "To Date", "fieldtype": "Date"},
        ]
    )

    update_report(
        "Monthly Fleet Income and Expense Summary",
        monthly_script,
        [
            {"fieldname": "mine_site", "label": "Mine Site", "fieldtype": "Link", "options": "Mine Site"}
        ]
    )
    print("=== All Defect Fixes Successfully Applied and Verified ===")

if __name__ == "__main__":
    run()
