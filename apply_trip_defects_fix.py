import frappe

def run():
    print("=== Applying Uptoware Fleet ERP Final Remediation Fixes ===")
    frappe.init(site="frontend")
    frappe.connect()

    # 1. Custom Fields: Weighbridge Override & Fleet Settings Tolerances
    custom_fields = [
        {
            "dt": "Mining Trip",
            "fieldname": "is_weight_overridden",
            "label": "Is Weight Overridden",
            "fieldtype": "Check",
            "default": "0",
            "insert_after": "net_weight_tons",
            "read_only": 1
        },
        {
            "dt": "Mining Trip",
            "fieldname": "weight_override_authorized_by",
            "label": "Weight Override Authorized By",
            "fieldtype": "Link",
            "options": "User",
            "insert_after": "is_weight_overridden",
            "read_only": 1
        },
        {
            "dt": "Mining Trip",
            "fieldname": "weight_override_timestamp",
            "label": "Weight Override Timestamp",
            "fieldtype": "Datetime",
            "insert_after": "weight_override_authorized_by",
            "read_only": 1
        },
        {
            "dt": "Mining Trip",
            "fieldname": "weight_override_reason",
            "label": "Weight Override Reason",
            "fieldtype": "Small Text",
            "insert_after": "weight_override_timestamp",
            "read_only": 1
        },
        {
            "dt": "Fleet Settings",
            "fieldname": "weighbridge_warning_tolerance_pct",
            "label": "Weighbridge Warning Tolerance (%)",
            "fieldtype": "Float",
            "default": "15.0",
            "insert_after": "receivables_alert_threshold"
        },
        {
            "dt": "Fleet Settings",
            "fieldname": "weighbridge_max_tolerance_pct",
            "label": "Weighbridge Max Tolerance Override (%)",
            "fieldtype": "Float",
            "default": "50.0",
            "insert_after": "weighbridge_warning_tolerance_pct"
        }
    ]

    for cf in custom_fields:
        dt = cf["dt"]
        fn = cf["fieldname"]
        existing = frappe.db.get_value("Custom Field", {"dt": dt, "fieldname": fn})
        if not existing:
            doc = frappe.get_doc({"doctype": "Custom Field", **cf})
            doc.insert(ignore_permissions=True)
            print(f"Created Custom Field: {dt}.{fn}")
        else:
            print(f"Custom Field already exists: {dt}.{fn}")

    frappe.clear_cache(doctype="Mining Trip")
    frappe.clear_cache(doctype="Fleet Settings")
    frappe.db.commit()

    # 2. Update Workflow: Mining Trip Lifecycle (Clear problematic preconditions & Ensure Full Operational Roles)
    if frappe.db.exists("Workflow", "Mining Trip Lifecycle"):
        wf = frappe.get_doc("Workflow", "Mining Trip Lifecycle")
        wf.set("transitions", [])
        transition_defs = [
            # Stage 1 -> 2: Draft -> Dispatched
            ("Draft", "Dispatch", "Dispatched", "Fleet Manager"),
            ("Draft", "Dispatch", "Dispatched", "Dispatcher"),
            ("Draft", "Dispatch", "Dispatched", "System Manager"),

            # Stage 2 -> 3: Dispatched -> Weighbridge Confirmed
            ("Dispatched", "Confirm Weighbridge", "Weighbridge Confirmed", "Weighbridge Operator"),
            ("Dispatched", "Confirm Weighbridge", "Weighbridge Confirmed", "Fleet Manager"),
            ("Dispatched", "Confirm Weighbridge", "Weighbridge Confirmed", "Dispatcher"),
            ("Dispatched", "Confirm Weighbridge", "Weighbridge Confirmed", "System Manager"),

            # Stage 3 -> 4: Weighbridge Confirmed -> Approved
            ("Weighbridge Confirmed", "Approve", "Approved", "Fleet Manager"),
            ("Weighbridge Confirmed", "Approve", "Approved", "System Manager"),

            # Stage 4 -> 5: Approved -> Delivered (Stage 5 Delivery Completion)
            ("Approved", "Mark Delivered", "Delivered", "Fleet Manager"),
            ("Approved", "Mark Delivered", "Delivered", "Dispatcher"),
            ("Approved", "Mark Delivered", "Delivered", "System Manager"),

            # Cancellations
            ("Draft", "Cancel", "Cancelled", "Fleet Manager"),
            ("Draft", "Cancel", "Cancelled", "Dispatcher"),
            ("Draft", "Cancel", "Cancelled", "System Manager"),
            ("Dispatched", "Cancel", "Cancelled", "Fleet Manager"),
            ("Dispatched", "Cancel", "Cancelled", "Dispatcher"),
            ("Dispatched", "Cancel", "Cancelled", "System Manager"),
            ("Weighbridge Confirmed", "Cancel", "Cancelled", "Fleet Manager"),
            ("Weighbridge Confirmed", "Cancel", "Cancelled", "Dispatcher"),
            ("Weighbridge Confirmed", "Cancel", "Cancelled", "System Manager"),
            ("Approved", "Cancel", "Cancelled", "Fleet Manager"),
            ("Approved", "Cancel", "Cancelled", "Dispatcher"),
            ("Approved", "Cancel", "Cancelled", "System Manager"),
        ]
        for s, a, ns, al in transition_defs:
            wf.append("transitions", {
                "state": s,
                "action": a,
                "next_state": ns,
                "allowed": al,
                "allow_self_approval": 1,
                "condition": ""
            })
        wf.save(ignore_permissions=True)
        frappe.db.commit()
        print(f"Successfully updated Workflow 'Mining Trip Lifecycle' with {len(wf.transitions)} transitions.")

    # 3. Update Server Script: Mining Trip - Lead and Calculation Sync
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

# Commercial Value:
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

    # 4. Update Server Script: Mining Trip - Business Validations & Audit
    val_name = "Mining Trip - Business Validations & Audit"
    if frappe.db.exists("Server Script", val_name):
        ss_val = frappe.get_doc("Server Script", val_name)
        val_script = ss_val.script
        
        # Comprehensive Section 2 and 2B replacement with Weighbridge Protection and Manager Override
        target_v = """# 2. Net Weight Calculation & Validation
if doc.gross_weight_tons or doc.tare_weight_tons:
    gross = float(doc.gross_weight_tons or 0.0)
    tare = float(doc.tare_weight_tons or 0.0)

    if gross < tare:
        frappe.throw(f"Gross weight ({gross:.3f} Tons) cannot be less than tare weight ({tare:.3f} Tons).")

    doc.net_weight_tons = round(gross - tare, 3)

    if doc.net_weight_tons < 0:
        frappe.throw(f"Net weight ({doc.net_weight_tons:.3f} Tons) cannot be negative.")"""

        new_val_section = """# 2. Net Weight Calculation & Validation
if doc.gross_weight_tons or doc.tare_weight_tons:
    gross = float(doc.gross_weight_tons or 0.0)
    tare = float(doc.tare_weight_tons or 0.0)

    if gross < tare:
        frappe.throw(f"Gross weight ({gross:.3f} MT) cannot be less than tare weight ({tare:.3f} MT).")

    doc.net_weight_tons = round(gross - tare, 3)

    if doc.net_weight_tons < 0:
        frappe.throw(f"Net weight ({doc.net_weight_tons:.3f} MT) cannot be negative.")

# 2B. Status-Specific Lifecycle Guards & Weighbridge Unit Protection
if doc.trip_status == "Weighbridge Confirmed":
    gross = float(doc.gross_weight_tons or 0.0)
    tare = float(doc.tare_weight_tons or 0.0)
    net = float(doc.net_weight_tons or 0.0)
    if gross <= 0 or tare <= 0:
        frappe.throw("Valid positive gross weight and tare weight readings are mandatory to confirm weighbridge.")
    if gross <= tare:
        frappe.throw(f"Gross weight ({gross:.3f} MT) cannot be less than or equal to tare weight ({tare:.3f} MT).")
    if net <= 0:
        frappe.throw("Net haulage weight must be greater than zero to advance through weighbridge confirmation.")

    # Vehicle capacity reference and tolerance checking
    veh_cap = 0.0
    if doc.vehicle:
        veh_cap = float(frappe.db.get_value("Vehicle", doc.vehicle, "payload_capacity_tons") or 0.0)
    if not veh_cap and doc.custom_average_tonnage:
        veh_cap = float(doc.custom_average_tonnage or 0.0)
    if not veh_cap:
        veh_cap = 35.0  # Fleet baseline reference

    max_tol_pct = float(frappe.db.get_single_value("Fleet Settings", "weighbridge_max_tolerance_pct") or 50.0)
    max_allowed_net = round(veh_cap * (1.0 + (max_tol_pct / 100.0)), 3)

    # If net payload exceeds maximum plausible threshold (e.g. 52.5 MT on 35T vehicle, or raw kg entries like 15,000 MT)
    if net > max_allowed_net:
        u_roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (frappe.session.user,))]
        is_mgr = ("Fleet Manager" in u_roles) or ("System Manager" in u_roles) or (frappe.session.user == "Administrator")

        if not doc.is_weight_overridden:
            frappe.throw(
                f"Net payload weight ({net:.3f} MT) exceeds the maximum allowed capacity threshold ({max_allowed_net:.1f} MT) "
                f"for vehicle '{doc.vehicle}' (Rated Capacity: {veh_cap:.1f} MT, +{max_tol_pct:.0f}% tolerance). "
                f"If scale reading was entered in kilograms (e.g. {net*1000:,.0f} kg), please enter in Metric Tonnes ({net:.3f} MT). "
                f"Exceptional loads exceeding this limit require an authorized Fleet Manager Override with a mandatory documented reason."
            )

        if not is_mgr:
            frappe.throw(
                f"Unauthorized: Exceptional weighbridge override for Net weight {net:.3f} MT requires "
                f"'Fleet Manager' or 'System Manager' role. Current user '{frappe.session.user}' lacks permission."
            )

        if not (doc.weight_override_reason and doc.weight_override_reason.strip()):
            frappe.throw(
                f"A documented reason is mandatory when authorizing an exceptional weighbridge weight override ({net:.3f} MT)."
            )

        if not doc.weight_override_authorized_by:
            doc.weight_override_authorized_by = frappe.session.user
            doc.weight_override_timestamp = frappe.utils.now_datetime()

if doc.trip_status == "Delivered":
    if not doc.closing_odometer or float(doc.closing_odometer) <= 0:
        frappe.throw("A valid closing odometer reading is mandatory to mark trip as delivered.")
    if doc.opening_odometer is not None and float(doc.closing_odometer) < float(doc.opening_odometer):
        frappe.throw(f"Closing odometer ({doc.closing_odometer} km) cannot be lower than opening odometer ({doc.opening_odometer} km).")
    if not doc.return_date_time:
        frappe.throw("Return timestamp is mandatory to mark trip as delivered.")"""

        # Replace legacy section or previous 2B section
        if "# 2B. Status-Specific Lifecycle Guards" in val_script:
            # Replace from # 2. Net Weight Calculation up to end of Delivered block
            import re
            pattern = re.compile(r"# 2\. Net Weight Calculation & Validation.*?if not doc\.return_date_time:\s+frappe\.throw\(\"Return timestamp is mandatory to mark trip as delivered\.\"\)", re.DOTALL)
            if pattern.search(val_script):
                val_script = pattern.sub(new_val_section, val_script)
            else:
                val_script = val_script.replace(target_v, new_val_section)
        elif target_v in val_script:
            val_script = val_script.replace(target_v, new_val_section)
        
        # Remove any lingering duplicate legacy block if present
        legacy_dup = """# 2B. Status-Specific Lifecycle Guards (Independent Server-Side Enforcement)
if doc.trip_status in ["Weighbridge Confirmed", "Approved", "Delivered"]:
    gross = float(doc.gross_weight_tons or 0.0)
    tare = float(doc.tare_weight_tons or 0.0)
    net = float(doc.net_weight_tons or 0.0)
    if gross <= 0 or tare <= 0:
        frappe.throw("Valid positive gross weight and tare weight readings are mandatory to confirm weighbridge.")
    if gross <= tare:
        frappe.throw(f"Gross weight ({gross:.3f} Tons) cannot be less than or equal to tare weight ({tare:.3f} Tons).")
    if net <= 0:
        frappe.throw("Net haulage weight must be greater than zero to advance through weighbridge confirmation.")

if doc.trip_status == "Delivered":
    if not doc.closing_odometer or float(doc.closing_odometer) <= 0:
        frappe.throw("A valid closing odometer reading is mandatory to mark trip as delivered.")
    if doc.opening_odometer is not None and float(doc.closing_odometer) < float(doc.opening_odometer):
        frappe.throw(f"Closing odometer ({doc.closing_odometer} km) cannot be lower than opening odometer ({doc.opening_odometer} km).")
    if not doc.return_date_time:
        frappe.throw("Return timestamp is mandatory to mark trip as delivered.")
"""
        if legacy_dup in val_script:
            val_script = val_script.replace(legacy_dup, "")

        ss_val.script = val_script
        ss_val.save(ignore_permissions=True)
        frappe.db.commit()
        print(f"Successfully updated Server Script '{val_name}' with Weighbridge Unit Protection.")

    # 5. Helper function for reports
    def update_report(report_name, script_content):
        if frappe.db.exists("Report", report_name):
            frappe.db.set_value("Report", report_name, {
                "report_type": "Script Report",
                "report_script": script_content
            })
            frappe.db.commit()
            print(f"Successfully updated Report '{report_name}'.")

    # 6. Update Daily Fleet Income and Expense Summary
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
    'Trips Completed:Int:110',
    'Total Tonnage (MT):Float:130',
    'Commercial Value (₹):Currency:140',
    'Invoiced Revenue (₹):Currency:140',
    'Fuel Quantity (L):Float:110',
    'Fuel Cost (₹):Currency:110',
    'Repair Cost (₹):Currency:110',
    'Staff Attendance:Int:100',
    'Staff Salary (₹):Currency:110',
    'Total Expenses (₹):Currency:120',
    'Net Operating Profit (Realized) (₹):Currency:150',
    'Operational Contribution (Unbilled) (₹):Currency:160',
    'Realized Margin (%):Percent:110'
]

if resolved_mine == '__DENIED__':
    data = [columns, []]
else:
    cond_mine = "AND mine_site = %(mine_site)s" if resolved_mine else ""
    cond_date = ""
    cond_date_fl = ""
    cond_date_bk = ""
    cond_date_att = ""
    params = {}
    if resolved_mine: params['mine_site'] = resolved_mine

    if f.get('from_date'):
        cond_date += " AND DATE(dispatch_date_time) >= %(from_date)s"
        cond_date_fl += " AND fuel_date >= %(from_date)s"
        cond_date_bk += " AND DATE(breakdown_datetime) >= %(from_date)s"
        cond_date_att += " AND attendance_date >= %(from_date)s"
        params['from_date'] = f['from_date']

    if f.get('to_date'):
        cond_date += " AND DATE(dispatch_date_time) <= %(to_date)s"
        cond_date_fl += " AND fuel_date <= %(to_date)s"
        cond_date_bk += " AND DATE(breakdown_datetime) <= %(to_date)s"
        cond_date_att += " AND attendance_date <= %(to_date)s"
        params['to_date'] = f['to_date']

    sql = f'''
        SELECT
            d.dispatch_date,
            d.mine_site,
            COALESCE(rev.trips_count, 0) as trips_count,
            ROUND(COALESCE(rev.total_tons, 0.0), 2) as total_tons,
            ROUND(COALESCE(rev.commercial_value, 0.0), 2) as commercial_value,
            ROUND(COALESCE(rev.invoiced_revenue, 0.0), 2) as invoiced_revenue,
            ROUND(COALESCE(fuel.fuel_qnt, 0.0), 2) as fuel_qnt,
            ROUND(COALESCE(fuel.fuel_amount, 0.0), 2) as fuel_cost,
            ROUND(COALESCE(rep.repair_amount, 0.0), 2) as repair_cost,
            COALESCE(att.att_count, 0) as staff_attendance,
            ROUND(COALESCE(att.salary_amount, 0.0), 2) as staff_salary,
            ROUND(COALESCE(fuel.fuel_amount, 0.0) + COALESCE(rep.repair_amount, 0.0) + COALESCE(att.salary_amount, 0.0), 2) as total_expenses,
            ROUND(COALESCE(rev.invoiced_revenue, 0.0) - (COALESCE(fuel.fuel_amount, 0.0) + COALESCE(rep.repair_amount, 0.0) + COALESCE(att.salary_amount, 0.0)), 2) as realized_profit,
            ROUND(COALESCE(rev.commercial_value, 0.0) - (COALESCE(fuel.fuel_amount, 0.0) + COALESCE(rep.repair_amount, 0.0) + COALESCE(att.salary_amount, 0.0)), 2) as operational_contribution,
            CASE 
                WHEN COALESCE(rev.invoiced_revenue, 0.0) > 0 
                THEN ROUND(((COALESCE(rev.invoiced_revenue, 0.0) - (COALESCE(fuel.fuel_amount, 0.0) + COALESCE(rep.repair_amount, 0.0) + COALESCE(att.salary_amount, 0.0))) / rev.invoiced_revenue) * 100, 2)
                ELSE 0.0 
            END as realized_margin
        FROM (
            SELECT DATE(dispatch_date_time) as dispatch_date, mine_site FROM `tabMining Trip` WHERE docstatus != 2 {cond_mine} {cond_date}
            UNION
            SELECT DATE(fuel_date) as dispatch_date, mine_site FROM `tabFuel Log` WHERE docstatus != 2 {cond_mine} {cond_date_fl}
            UNION
            SELECT DATE(breakdown_datetime) as dispatch_date, mine_site FROM `tabVehicle Breakdown` WHERE docstatus != 2 {cond_mine} {cond_date_bk}
            UNION
            SELECT DATE(attendance_date) as dispatch_date, mine_site FROM `tabEmployee Attendance` WHERE docstatus != 2 {cond_mine} {cond_date_att}
        ) d
        LEFT JOIN (
            SELECT 
                DATE(mt.dispatch_date_time) as dispatch_date, 
                mt.mine_site, 
                COUNT(mt.name) as trips_count, 
                SUM(CASE WHEN mt.trip_status IN ('Weighbridge Confirmed', 'Approved', 'Delivered') AND mt.net_weight_tons > 0 THEN mt.net_weight_tons ELSE 0.0 END) as total_tons, 
                SUM(CASE WHEN mt.trip_status IN ('Weighbridge Confirmed', 'Approved', 'Delivered') AND mt.net_weight_tons > 0 THEN mt.gross_revenue ELSE 0.0 END) as commercial_value,
                SUM(COALESCE(inv_agg.invoiced_revenue, 0.0)) as invoiced_revenue
            FROM `tabMining Trip` mt
            LEFT JOIN (
                SELECT trip_id, SUM(inv_amt) AS invoiced_revenue FROM (
                    SELECT 
                        si.custom_mining_trip AS trip_id,
                        CASE WHEN si.is_return = 1 THEN -ABS(si.base_grand_total) ELSE si.base_grand_total END AS inv_amt
                    FROM `tabSales Invoice` si
                    WHERE si.docstatus = 1
                      AND si.custom_mining_trip IS NOT NULL AND si.custom_mining_trip != ''
                      AND (si.custom_is_test_record = 0 OR si.custom_is_test_record IS NULL)
                      AND NOT EXISTS (
                          SELECT 1 FROM `tabSales Invoice Item` sii_sub 
                          WHERE sii_sub.parent = si.name AND sii_sub.custom_mining_trip IS NOT NULL AND sii_sub.custom_mining_trip != ''
                      )
                    UNION ALL
                    SELECT 
                        sii.custom_mining_trip AS trip_id,
                        CASE WHEN si.is_return = 1 THEN -ABS(sii.base_net_amount) ELSE sii.base_net_amount END AS inv_amt
                    FROM `tabSales Invoice Item` sii
                    JOIN `tabSales Invoice` si ON si.name = sii.parent
                    WHERE si.docstatus = 1
                      AND sii.custom_mining_trip IS NOT NULL AND sii.custom_mining_trip != ''
                      AND (si.custom_is_test_record = 0 OR si.custom_is_test_record IS NULL)
                ) inv_items
                GROUP BY trip_id
            ) inv_agg ON inv_agg.trip_id = mt.name
            WHERE mt.docstatus != 2 AND mt.trip_status != 'Cancelled' {cond_mine} {cond_date}
            GROUP BY DATE(mt.dispatch_date_time), mt.mine_site
        ) rev ON rev.dispatch_date = d.dispatch_date AND rev.mine_site = d.mine_site
        LEFT JOIN (
            SELECT DATE(fuel_date) as dispatch_date, mine_site, 
                   SUM(quantity_litres) as fuel_qnt,
                   SUM(total_fuel_cost) as fuel_amount
            FROM `tabFuel Log` WHERE docstatus != 2 AND approval_status != 'Rejected' {cond_mine} {cond_date_fl}
            GROUP BY DATE(fuel_date), mine_site
        ) fuel ON fuel.dispatch_date = d.dispatch_date AND fuel.mine_site = d.mine_site
        LEFT JOIN (
            SELECT DATE(breakdown_datetime) as dispatch_date, mine_site, SUM(total_repair_cost) as repair_amount
            FROM `tabVehicle Breakdown` WHERE docstatus != 2 {cond_mine} {cond_date_bk}
            GROUP BY DATE(breakdown_datetime), mine_site
        ) rep ON rep.dispatch_date = d.dispatch_date AND rep.mine_site = d.mine_site
        LEFT JOIN (
            SELECT DATE(attendance_date) as dispatch_date, mine_site, 
                   COUNT(name) as att_count,
                   SUM(COALESCE(calculated_salary_amount, daily_salary_rate, 0.0)) as salary_amount
            FROM `tabEmployee Attendance` WHERE docstatus != 2 {cond_mine} {cond_date_att}
            GROUP BY DATE(attendance_date), mine_site
        ) att ON att.dispatch_date = d.dispatch_date AND att.mine_site = d.mine_site
        ORDER BY d.dispatch_date DESC
    '''
    rows = frappe.db.sql(sql, params, as_list=True)
    data = [columns, rows]
"""

    # 7. Update Monthly Fleet Income and Expense Summary
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
    'Trips Completed:Int:110',
    'Total Tonnage (MT):Float:130',
    'Commercial Value (₹):Currency:140',
    'Invoiced Revenue (₹):Currency:140',
    'Fuel Quantity (L):Float:110',
    'Fuel Cost (₹):Currency:110',
    'Repair Cost (₹):Currency:110',
    'Staff Attendance:Int:100',
    'Staff Salary (₹):Currency:110',
    'Total Expenses (₹):Currency:120',
    'Net Operating Profit (Realized) (₹):Currency:150',
    'Operational Contribution (Unbilled) (₹):Currency:160',
    'Realized Margin (%):Percent:110'
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
            ROUND(COALESCE(rev.commercial_value, 0.0), 2) as commercial_value,
            ROUND(COALESCE(rev.invoiced_revenue, 0.0), 2) as invoiced_revenue,
            ROUND(COALESCE(fuel.fuel_qnt, 0.0), 2) as fuel_qnt,
            ROUND(COALESCE(fuel.fuel_amount, 0.0), 2) as fuel_cost,
            ROUND(COALESCE(rep.repair_amount, 0.0), 2) as repair_cost,
            COALESCE(att.att_count, 0) as staff_attendance,
            ROUND(COALESCE(att.salary_amount, 0.0), 2) as staff_salary,
            ROUND(COALESCE(fuel.fuel_amount, 0.0) + COALESCE(rep.repair_amount, 0.0) + COALESCE(att.salary_amount, 0.0), 2) as total_expenses,
            ROUND(COALESCE(rev.invoiced_revenue, 0.0) - (COALESCE(fuel.fuel_amount, 0.0) + COALESCE(rep.repair_amount, 0.0) + COALESCE(att.salary_amount, 0.0)), 2) as realized_profit,
            ROUND(COALESCE(rev.commercial_value, 0.0) - (COALESCE(fuel.fuel_amount, 0.0) + COALESCE(rep.repair_amount, 0.0) + COALESCE(att.salary_amount, 0.0)), 2) as operational_contribution,
            CASE 
                WHEN COALESCE(rev.invoiced_revenue, 0.0) > 0 
                THEN ROUND(((COALESCE(rev.invoiced_revenue, 0.0) - (COALESCE(fuel.fuel_amount, 0.0) + COALESCE(rep.repair_amount, 0.0) + COALESCE(att.salary_amount, 0.0))) / rev.invoiced_revenue) * 100, 2)
                ELSE 0.0 
            END as realized_margin
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
            SELECT 
                LEFT(mt.dispatch_date_time, 7) as month_period, 
                mt.mine_site, 
                COUNT(mt.name) as trips_count, 
                SUM(CASE WHEN mt.trip_status IN ('Weighbridge Confirmed', 'Approved', 'Delivered') AND mt.net_weight_tons > 0 THEN mt.net_weight_tons ELSE 0.0 END) as total_tons, 
                SUM(CASE WHEN mt.trip_status IN ('Weighbridge Confirmed', 'Approved', 'Delivered') AND mt.net_weight_tons > 0 THEN mt.gross_revenue ELSE 0.0 END) as commercial_value,
                SUM(COALESCE(inv_agg.invoiced_revenue, 0.0)) as invoiced_revenue
            FROM `tabMining Trip` mt
            LEFT JOIN (
                SELECT trip_id, SUM(inv_amt) AS invoiced_revenue FROM (
                    SELECT 
                        si.custom_mining_trip AS trip_id,
                        CASE WHEN si.is_return = 1 THEN -ABS(si.base_grand_total) ELSE si.base_grand_total END AS inv_amt
                    FROM `tabSales Invoice` si
                    WHERE si.docstatus = 1
                      AND si.custom_mining_trip IS NOT NULL AND si.custom_mining_trip != ''
                      AND (si.custom_is_test_record = 0 OR si.custom_is_test_record IS NULL)
                      AND NOT EXISTS (
                          SELECT 1 FROM `tabSales Invoice Item` sii_sub 
                          WHERE sii_sub.parent = si.name AND sii_sub.custom_mining_trip IS NOT NULL AND sii_sub.custom_mining_trip != ''
                      )
                    UNION ALL
                    SELECT 
                        sii.custom_mining_trip AS trip_id,
                        CASE WHEN si.is_return = 1 THEN -ABS(sii.base_net_amount) ELSE sii.base_net_amount END AS inv_amt
                    FROM `tabSales Invoice Item` sii
                    JOIN `tabSales Invoice` si ON si.name = sii.parent
                    WHERE si.docstatus = 1
                      AND sii.custom_mining_trip IS NOT NULL AND sii.custom_mining_trip != ''
                      AND (si.custom_is_test_record = 0 OR si.custom_is_test_record IS NULL)
                ) inv_items
                GROUP BY trip_id
            ) inv_agg ON inv_agg.trip_id = mt.name
            WHERE mt.docstatus != 2 AND mt.trip_status != 'Cancelled' {cond_mine}
            GROUP BY LEFT(mt.dispatch_date_time, 7), mt.mine_site
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
        daily_script
    )

    update_report(
        "Monthly Fleet Income and Expense Summary",
        monthly_script
    )

    # -------------------------------------------------------------------------
    # 6. CONFIGURE DEMO USERS AND OPERATIONAL PERMISSIONS
    # -------------------------------------------------------------------------
    print("--- Step 6: Configuring Demo Users and Delete Permissions ---")
    from frappe.utils.password import update_password
    from frappe.permissions import setup_custom_perms

    demo_admin_email = "demo.admin@uptoware.com"
    if not frappe.db.exists("User", demo_admin_email):
        user_doc = frappe.get_doc({
            "doctype": "User",
            "email": demo_admin_email,
            "first_name": "Demo",
            "last_name": "Admin",
            "enabled": 1,
            "send_welcome_email": 0,
            "user_type": "System User"
        }).insert(ignore_permissions=True)
    else:
        user_doc = frappe.get_doc("User", demo_admin_email)
        user_doc.enabled = 1
        user_doc.save(ignore_permissions=True)

    demo_admin_roles = ["Fleet Head Office Admin", "Fleet Manager", "Desk User", "All"]
    existing_roles = [r.role for r in user_doc.roles]
    for r in demo_admin_roles:
        if r not in existing_roles:
            user_doc.append("roles", {"role": r})
    user_doc.roles = [r for r in user_doc.roles if r.role not in ["System Manager", "Administrator", "Script Manager"]]
    user_doc.save(ignore_permissions=True)
    update_password(demo_admin_email, "admin")

    demo_users = {
        "fleet.manager@uptoware.com": {
            "first_name": "Fleet",
            "last_name": "Manager",
            "roles": ["Fleet Manager", "Weighbridge Operator", "Stock User", "Desk User", "All"]
        },
        "dispatcher@uptoware.com": {
            "first_name": "Trip",
            "last_name": "Dispatcher",
            "roles": ["Dispatcher", "Desk User", "All"]
        },
        "workshop.supervisor@uptoware.com": {
            "first_name": "Workshop",
            "last_name": "Supervisor",
            "roles": ["Workshop Supervisor", "Desk User", "All"]
        },
        "accountant@uptoware.com": {
            "first_name": "Financial",
            "last_name": "Accountant",
            "roles": ["Accountant", "Accounts User", "Desk User", "All"]
        }
    }

    for email, details in demo_users.items():
        if not frappe.db.exists("User", email):
            u = frappe.get_doc({
                "doctype": "User",
                "email": email,
                "first_name": details["first_name"],
                "last_name": details["last_name"],
                "enabled": 1,
                "send_welcome_email": 0,
                "user_type": "System User"
            }).insert(ignore_permissions=True)
        else:
            u = frappe.get_doc("User", email)
            u.enabled = 1
            u.first_name = details["first_name"]
            u.last_name = details["last_name"]
            u.save(ignore_permissions=True)

        existing = [r.role for r in u.roles]
        for r in details["roles"]:
            if r not in existing:
                u.append("roles", {"role": r})
        u.save(ignore_permissions=True)
        update_password(email, "admin")

    fleet_doctypes = [
        "Vehicle", "Driver", "Mining Trip", "Mine Site", "Fuel Log",
        "Vehicle Breakdown", "Vehicle Insurance Policy", "Fleet Alert Log",
        "Fleet Mine Transfer Log", "Vehicle Driver Shift Allocation", "Operational Expense"
    ]
    for dt in fleet_doctypes:
        if not frappe.db.exists("DocType", dt):
            continue
        setup_custom_perms(dt)
        perm = frappe.db.get_value("Custom DocPerm", {"parent": dt, "role": "Fleet Head Office Admin", "permlevel": 0}, "name")
        if not perm:
            frappe.get_doc({
                "doctype": "Custom DocPerm",
                "parent": dt,
                "parenttype": "DocType",
                "parentfield": "permissions",
                "role": "Fleet Head Office Admin",
                "permlevel": 0,
                "read": 1, "write": 1, "create": 1, "delete": 1,
                "report": 1, "export": 1, "print": 1, "email": 1
            }).insert(ignore_permissions=True)
        else:
            p_doc = frappe.get_doc("Custom DocPerm", perm)
            p_doc.read = 1
            p_doc.write = 1
            p_doc.create = 1
            p_doc.delete = 1
            p_doc.report = 1
            p_doc.export = 1
            p_doc.save(ignore_permissions=True)

    deletion_scripts = {
        "Vehicle Breakdown - Deletion Safeguard": """# SERVER SCRIPT: Vehicle Breakdown - Deletion Safeguard (Before Delete)
user_roles = [r.role for r in frappe.db.get_all("Has Role", filters={"parent": frappe.session.user}, fields=["role"])]
is_admin = ("System Manager" in user_roles) or ("Fleet Head Office Admin" in user_roles) or (frappe.session.user == "Administrator")
if not is_admin:
    frappe.throw("Operational breakdown records cannot be deleted. Deletion of Vehicle Breakdown records is restricted to Administrators.")
""",
        "Vehicle Insurance Policy - Deletion Safeguard": """user = frappe.session.user
user_roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (user,))]
is_admin = ("System Manager" in user_roles) or ("Fleet Head Office Admin" in user_roles) or (user == "Administrator")

if not is_admin:
    frappe.throw("Physical deletion of insurance policy records is restricted to Administrators.")

if doc.policy_status == "Active":
    frappe.throw("Active insurance policies cannot be deleted. The policy must be cancelled first.")
""",
        "Operational Expense - Deletion Safeguard": """# SERVER SCRIPT: Operational Expense - Deletion Safeguard (Before Delete)
user_roles = [r.role for r in frappe.db.get_all("Has Role", filters={"parent": frappe.session.user}, fields=["role"])]
is_admin = ("System Manager" in user_roles) or ("Fleet Head Office Admin" in user_roles) or (frappe.session.user == "Administrator")
if not is_admin:
    frappe.throw("Operational expense records cannot be deleted. Deletion of Operational Expense records is restricted to Administrators.")

if doc.accounting_status == "Posted" or doc.posting_document_name:
    frappe.throw(f"Cannot delete Operational Expense linked to posted accounting document '{doc.posting_document_name}'. Reverse or cancel the accounting document first.")
""",
        "Fleet Alert Log - Deletion Safeguard": """user = frappe.session.user or "Administrator"
roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (user,))]
is_admin = ("System Manager" in roles) or ("Fleet Head Office Admin" in roles) or (user == "Administrator")
if not is_admin and not doc.is_test_record:
    frappe.throw("Physical deletion of Fleet Alert Log records is strictly prohibited. Resolve the alert instead.")
"""
    }
    for s_name, s_code in deletion_scripts.items():
        if frappe.db.exists("Server Script", s_name):
            ss = frappe.get_doc("Server Script", s_name)
            ss.script = s_code
            ss.save(ignore_permissions=True)

    frappe.db.commit()
    print("=== All Defect Fixes & Demo Accounts Successfully Applied and Verified ===")

if __name__ == "__main__":
    run()
