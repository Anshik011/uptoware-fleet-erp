import frappe

def apply_consolidated_remediation():
    frappe.init("frontend")
    frappe.connect()

    print("=== APPLYING CONSOLIDATED BATCH 11 REMEDIATIONS ===")

    # 1. Update Scheduler Scripts (Daily Expiry Monitoring Scheduler + API)
    scheduler_code = """today = frappe.utils.getdate(frappe.utils.nowdate())
now_dt = frappe.utils.now_datetime()

# 1. Fetch settings
fs = frappe.get_doc("Fleet Settings")
warning_days = fs.warning_window_days or 30
recipient_role = fs.insurance_compliance_alert_role or fs.notification_recipient_role or "Fleet Manager"
intervals_str = fs.reminder_intervals or "30, 15, 7, 0"
configured_intervals = sorted([int(x.strip()) for x in intervals_str.split(",") if x.strip().isdigit()], reverse=True)
notifications_created = 0
notifications_skipped_dedup = 0
expiries_detected = 0

enable_notifs = fs.enable_fleet_notifications if fs.enable_fleet_notifications is not None else 1
enable_in_app = fs.enable_in_app_notifications if fs.enable_in_app_notifications is not None else 1
enable_email = fs.enable_email_notifications if fs.enable_email_notifications is not None else 1

esc_hours = fs.breakdown_escalation_hours or 48
rep_threshold = fs.repeated_breakdown_threshold or 3
rep_window_days = fs.repeated_breakdown_window_days or 30
rem_freq_hours = fs.reminder_frequency_hours or 24
max_reminders = fs.max_reminder_count or 5
rec_threshold = float(fs.receivables_alert_threshold or 500000.0)

# 2. Synchronize Vehicles and Statutory Expiries
doc_types = [
    ("Insurance", "end_date"),
    ("Fitness Certificate", "fitness_expiry_date"),
    ("PUC Certificate", "puc_expiry_date"),
    ("Road Tax", "road_tax_expiry_date"),
    ("Goods Permit", "permit_expiry_date")
]

vehicles = frappe.get_all("Vehicle", fields=["name", "end_date", "fitness_expiry_date", "puc_expiry_date", "road_tax_expiry_date", "permit_expiry_date", "policy_no", "vehicle_status", "is_test_record"])

recipient_emails = [r[0] for r in frappe.db.sql(\"\"\"
    SELECT u.email FROM `tabUser` u
    JOIN `tabHas Role` hr ON hr.parent = u.name
    WHERE hr.role = %s AND u.enabled = 1 AND u.email != ''
\"\"\", (recipient_role,))]

for v in vehicles:
    effective_pol = frappe.db.sql(\"\"\"
        SELECT insurance_company, policy_no, start_date, end_date, policy_doc
        FROM `tabVehicle Insurance Policy`
        WHERE vehicle = %s
          AND policy_status = 'Active'
          AND start_date <= %s
          AND end_date >= %s
        ORDER BY end_date DESC
        LIMIT 1
    \"\"\", (v.name, today, today), as_dict=True)

    if effective_pol:
        frappe.db.set_value("Vehicle", v.name, {
            "insurance_company": effective_pol[0].insurance_company,
            "policy_no": effective_pol[0].policy_no,
            "start_date": effective_pol[0].start_date,
            "end_date": effective_pol[0].end_date,
            "insurance_policy_doc": effective_pol[0].policy_doc
        }, update_modified=False)
        v.end_date = effective_pol[0].end_date

    has_compliance_block = False
    block_reasons = []

    for dtype, fieldname in doc_types:
        exp_date_val = v.get(fieldname)
        
        # Missing mandatory document check
        if not exp_date_val and v.vehicle_status == "Active":
            has_compliance_block = True
            block_reasons.append(f"Missing {dtype}")
            if enable_notifs and (fs.enable_insurance_compliance_alerts if fs.enable_insurance_compliance_alerts is not None else 1):
                m_title = f"Missing Mandatory Document: {v.name} ({dtype})"
                if not frappe.db.exists("Fleet Alert Log", {"source_doctype": "Vehicle", "source_name": v.name, "alert_title": m_title, "status": ["!=", "Resolved"]}):
                    m_alt = frappe.get_doc({
                        "doctype": "Fleet Alert Log",
                        "alert_title": m_title,
                        "alert_category": "Insurance & Compliance",
                        "severity": "High",
                        "status": "Unread",
                        "source_doctype": "Vehicle",
                        "source_name": v.name,
                        "vehicle": v.name,
                        "recipient_role": recipient_role,
                        "delivery_channel": "In-App and Email",
                        "alert_timestamp": now_dt,
                        "action_required": f"Upload mandatory {dtype} for vehicle {v.name} before trip dispatch.",
                        "message": f"Active vehicle {v.name} does not have a recorded {dtype}.",
                        "is_test_record": v.is_test_record or 0
                    })
                    m_alt.insert(ignore_permissions=True)
            continue
        elif not exp_date_val:
            continue
        
        exp_date = frappe.utils.getdate(exp_date_val)
        days_left = (exp_date - today).days

        stage = None
        if days_left <= 0:
            stage = "Expired"
            has_compliance_block = True
            block_reasons.append(f"Expired {dtype}")
        elif days_left <= 7:
            stage = "7 Days Prior"
        elif days_left <= 15:
            stage = "15 Days Prior"
        elif days_left <= warning_days:
            stage = "30 Days Prior"

        if not stage:
            continue

        # Maintain Fleet Expiry Notification Log (Batch 8 compatibility)
        fenl_exists = frappe.db.exists("Fleet Expiry Notification Log", {
            "vehicle": v.name,
            "document_type": dtype,
            "expiry_date": exp_date,
            "notification_stage": stage
        })

        action_msg = f"CRITICAL: {dtype} for vehicle {v.name} expired on {exp_date}. Immediate renewal required." if stage == "Expired" else f"ACTION REQUIRED: {dtype} for vehicle {v.name} expires in {days_left} days on {exp_date}. Please initiate renewal."

        expiries_detected += 1
        if not fenl_exists:
            notifications_created += 1
            notif = frappe.get_doc({
                "doctype": "Fleet Expiry Notification Log",
                "vehicle": v.name,
                "document_type": dtype,
                "expiry_date": exp_date,
                "notification_stage": stage,
                "recipient": recipient_role,
                "sent_datetime": now_dt,
                "status": "Logged",
                "action_required": action_msg,
                "message": f"Expiry Alert: Vehicle {v.name} - {dtype} expires on {exp_date} (Days left: {days_left}). Stage: {stage}.",
                "is_test_record": v.is_test_record or 0
            })
            notif.insert(ignore_permissions=True)

            if recipient_emails and not (v.is_test_record):
                try:
                    frappe.sendmail(
                        recipients=recipient_emails,
                        subject=f"Fleet Expiry Alert: {v.name} - {dtype} ({stage})",
                        message=f"<p><strong>Fleet Expiry Alert</strong></p><p>Vehicle: {v.name}</p><p>Document: {dtype}</p><p>Expiry Date: {exp_date}</p><p>Stage: {stage}</p><p>{action_msg}</p>",
                        reference_doctype="Fleet Expiry Notification Log",
                        reference_name=notif.name,
                        now=False
                    )
                    frappe.db.set_value("Fleet Expiry Notification Log", notif.name, "status", "Queued", update_modified=False)
                except Exception:
                    pass
        else:
            notifications_skipped_dedup += 1

        # Also create Fleet Alert Log (Batch 11 Central Architecture)
        if enable_notifs and (fs.enable_insurance_compliance_alerts if fs.enable_insurance_compliance_alerts is not None else 1):
            alt_title = f"{dtype} Expired: {v.name}" if stage == "Expired" else f"{dtype} Expiry Due: {v.name} ({stage})"
            alt_exists = frappe.db.exists("Fleet Alert Log", {
                "source_doctype": "Vehicle",
                "source_name": v.name,
                "alert_title": alt_title,
                "status": ["!=", "Resolved"]
            })
            if not alt_exists:
                alt_sev = "Critical" if stage == "Expired" else ("High" if stage in ["7 Days Prior", "15 Days Prior"] else "Medium")
                alt_doc = frappe.get_doc({
                    "doctype": "Fleet Alert Log",
                    "alert_title": alt_title,
                    "alert_category": "Insurance & Compliance",
                    "severity": alt_sev,
                    "status": "Unread",
                    "source_doctype": "Vehicle",
                    "source_name": v.name,
                    "vehicle": v.name,
                    "recipient_role": recipient_role,
                    "delivery_channel": "In-App and Email",
                    "alert_timestamp": now_dt,
                    "action_required": action_msg,
                    "message": f"{dtype} for vehicle {v.name} expires on {exp_date} ({days_left} days remaining). Stage: {stage}.",
                    "is_test_record": v.is_test_record or 0
                })
                alt_doc.insert(ignore_permissions=True)

                if enable_in_app:
                    users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (recipient_role,))
                    for u in users:
                        try:
                            frappe.get_doc({"doctype": "Notification Log", "subject": alt_title, "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": alt_doc.name, "email_content": alt_doc.message}).insert(ignore_permissions=True)
                        except Exception:
                            pass

    # Check for Dispatch Compliance Block alert
    if has_compliance_block and v.vehicle_status == "Active" and enable_notifs and (fs.enable_insurance_compliance_alerts if fs.enable_insurance_compliance_alerts is not None else 1):
        blk_title = f"Dispatch Blocked (Compliance): {v.name}"
        if not frappe.db.exists("Fleet Alert Log", {"source_doctype": "Vehicle", "source_name": v.name, "alert_title": blk_title, "status": ["!=", "Resolved"]}):
            blk_alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": blk_title,
                "alert_category": "Insurance & Compliance",
                "severity": "Critical",
                "status": "Unread",
                "source_doctype": "Vehicle",
                "source_name": v.name,
                "vehicle": v.name,
                "recipient_role": recipient_role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": f"Vehicle {v.name} is blocked from dispatch due to: {', '.join(block_reasons)}. Renew compliance documents immediately.",
                "message": f"Compliance dispatch block active for vehicle {v.name}. Reasons: {', '.join(block_reasons)}.",
                "is_test_record": v.is_test_record or 0
            })
            blk_alt.insert(ignore_permissions=True)
    elif not has_compliance_block:
        # Auto-resolve compliance blocks
        open_blks = frappe.get_all("Fleet Alert Log", filters={"source_doctype": "Vehicle", "source_name": v.name, "alert_title": f"Dispatch Blocked (Compliance): {v.name}", "status": ["!=", "Resolved"]}, fields=["name"])
        for ob in open_blks:
            frappe.db.set_value("Fleet Alert Log", ob.name, {"status": "Resolved", "resolved_on": now_dt, "resolved_by": "Administrator", "resolution_note": "Statutory compliance restored."}, update_modified=False)

# 3. Driver License and Medical Expiries
if enable_notifs and (fs.enable_vehicle_driver_alerts if fs.enable_vehicle_driver_alerts is not None else 1):
    d_role = fs.vehicle_driver_alert_role or "Fleet Manager"
    drivers = frappe.get_all("Driver", fields=["name", "expiry_date", "medical_fitness_expiry", "status", "is_test_record"])
    for d in drivers:
        d_checks = [
            ("Driver License", d.expiry_date),
            ("Driver Medical Fitness", d.medical_fitness_expiry)
        ]
        for d_lbl, d_exp in d_checks:
            if not d_exp:
                continue
            d_exp_dt = frappe.utils.getdate(d_exp)
            d_days = (d_exp_dt - today).days
            if d_days <= warning_days:
                d_stage = "Expired" if d_days <= 0 else (f"{d_days} Days Remaining")
                d_title = f"{d_lbl} Expired: {d.name}" if d_days <= 0 else f"{d_lbl} Expiry Due: {d.name}"
                d_exists = frappe.db.exists("Fleet Alert Log", {
                    "source_doctype": "Driver",
                    "source_name": d.name,
                    "alert_title": d_title,
                    "status": ["!=", "Resolved"]
                })
                if not d_exists:
                    d_sev = "Critical" if d_days <= 0 else "High"
                    d_alt = frappe.get_doc({
                        "doctype": "Fleet Alert Log",
                        "alert_title": d_title,
                        "alert_category": "Vehicle & Driver",
                        "severity": d_sev,
                        "status": "Unread",
                        "source_doctype": "Driver",
                        "source_name": d.name,
                        "driver": d.name,
                        "recipient_role": d_role,
                        "delivery_channel": "In-App and Email",
                        "alert_timestamp": now_dt,
                        "action_required": f"Initiate immediate {d_lbl} renewal for driver {d.name} before dispatching trips.",
                        "message": f"{d_lbl} for driver {d.name} expires on {d_exp_dt} ({d_days} days left).",
                        "is_test_record": d.is_test_record or 0
                    })
                    d_alt.insert(ignore_permissions=True)
                    if enable_in_app:
                        users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (d_role,))
                        for u in users:
                            try:
                                frappe.get_doc({"doctype": "Notification Log", "subject": d_title, "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": d_alt.name, "email_content": d_alt.message}).insert(ignore_permissions=True)
                            except Exception:
                                pass

# 4. Breakdown Escalation (> 48h) & Repeated Breakdowns (>= 3 in 30d)
if enable_notifs and (fs.enable_maintenance_alerts if fs.enable_maintenance_alerts is not None else 1):
    m_role = fs.maintenance_alert_role or "Workshop Supervisor"
    open_breakdowns = frappe.db.sql(\"\"\"
        SELECT vb.name, vb.vehicle, vb.breakdown_datetime, vb.severity, vb.repair_status, vb.is_test_record,
               TIMESTAMPDIFF(HOUR, vb.breakdown_datetime, %s) as open_hours
        FROM `tabVehicle Breakdown` vb
        JOIN `tabVehicle` v ON v.name = vb.vehicle
        WHERE vb.repair_status NOT IN ('Repaired', 'Closed')
          AND vb.resolution_type != 'Rejected'
          AND vb.docstatus != 2
          AND TIMESTAMPDIFF(HOUR, vb.breakdown_datetime, %s) >= %s
    \"\"\", (now_dt, now_dt, esc_hours), as_dict=True)

    for ob in open_breakdowns:
        esc_title = f"Breakdown Escalation: {ob.vehicle} (Open {ob.open_hours}h)"
        esc_exists = frappe.db.exists("Fleet Alert Log", {
            "source_doctype": "Vehicle Breakdown",
            "source_name": ob.name,
            "alert_title": esc_title,
            "status": ["!=", "Resolved"]
        })
        if not esc_exists:
            esc_alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": esc_title,
                "alert_category": "Maintenance & Workshop",
                "severity": "Critical",
                "status": "Unread",
                "source_doctype": "Vehicle Breakdown",
                "source_name": ob.name,
                "vehicle": ob.vehicle,
                "recipient_role": m_role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": f"Urgent workshop escalation: breakdown {ob.name} unresolved for {ob.open_hours} hours.",
                "message": f"Vehicle {ob.vehicle} breakdown {ob.name} has been open for {ob.open_hours} hours without repair completion.",
                "is_test_record": ob.is_test_record or 0
            })
            esc_alt.insert(ignore_permissions=True)
            if enable_in_app:
                users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (m_role,))
                for u in users:
                    try:
                        frappe.get_doc({"doctype": "Notification Log", "subject": esc_title, "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": esc_alt.name, "email_content": esc_alt.message}).insert(ignore_permissions=True)
                    except Exception:
                        pass

    # Repeated breakdowns check
    rep_vehs = frappe.db.sql(\"\"\"
        SELECT vb.vehicle, COUNT(vb.name) as bd_count
        FROM `tabVehicle Breakdown` vb
        JOIN `tabVehicle` v ON v.name = vb.vehicle
        WHERE vb.breakdown_datetime >= DATE_SUB(%s, INTERVAL %s DAY)
          AND vb.docstatus != 2
          AND vb.is_test_record = 0
        GROUP BY vb.vehicle
        HAVING bd_count >= %s
    \"\"\", (now_dt, rep_window_days, rep_threshold), as_dict=True)

    for rv in rep_vehs:
        rep_title = f"Repeated Breakdown Alert: {rv.vehicle} ({rv.bd_count} in {rep_window_days}d)"
        rep_exists = frappe.db.exists("Fleet Alert Log", {
            "source_doctype": "Vehicle",
            "source_name": rv.vehicle,
            "alert_title": rep_title,
            "status": ["!=", "Resolved"]
        })
        if not rep_exists:
            rep_alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": rep_title,
                "alert_category": "Maintenance & Workshop",
                "severity": "High",
                "status": "Unread",
                "source_doctype": "Vehicle",
                "source_name": rv.vehicle,
                "vehicle": rv.vehicle,
                "recipient_role": m_role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": "Initiate comprehensive technical overhaul and Root Cause Analysis.",
                "message": f"Vehicle {rv.vehicle} has suffered {rv.bd_count} breakdowns in the past {rep_window_days} days.",
                "is_test_record": 0
            })
            rep_alt.insert(ignore_permissions=True)
            if enable_in_app:
                users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (m_role,))
                for u in users:
                    try:
                        frappe.get_doc({"doctype": "Notification Log", "subject": rep_title, "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": rep_alt.name, "email_content": rep_alt.message}).insert(ignore_permissions=True)
                    except Exception:
                        pass

# 5. Overdue Customer Invoices & Receivables Threshold
if enable_notifs and (fs.enable_financial_alerts if fs.enable_financial_alerts is not None else 1):
    f_role = fs.financial_alert_role or "Accountant"
    overdue_invoices = frappe.db.sql(\"\"\"
        SELECT name, customer, due_date, outstanding_amount, custom_vehicle, custom_mining_trip, custom_is_test_record
        FROM `tabSales Invoice`
        WHERE docstatus = 1
          AND outstanding_amount > 0
          AND due_date < %s
    \"\"\", (today,), as_dict=True)

    for inv in overdue_invoices:
        inv_title = f"Overdue Invoice Alert: {inv.name} ({inv.customer})"
        inv_exists = frappe.db.exists("Fleet Alert Log", {
            "source_doctype": "Sales Invoice",
            "source_name": inv.name,
            "alert_title": inv_title,
            "status": ["!=", "Resolved"]
        })
        if not inv_exists:
            inv_alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": inv_title,
                "alert_category": "Revenue & Financial",
                "severity": "High",
                "status": "Unread",
                "source_doctype": "Sales Invoice",
                "source_name": inv.name,
                "vehicle": inv.custom_vehicle,
                "recipient_role": f_role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": f"Follow up with customer {inv.customer} for overdue payment of ₹{inv.outstanding_amount}.",
                "message": f"Sales Invoice {inv.name} due on {inv.due_date} is overdue with outstanding ₹{inv.outstanding_amount}.",
                "is_test_record": inv.custom_is_test_record or 0
            })
            inv_alt.insert(ignore_permissions=True)
            if enable_in_app:
                users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (f_role,))
                for u in users:
                    try:
                        frappe.get_doc({"doctype": "Notification Log", "subject": inv_title, "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": inv_alt.name, "email_content": inv_alt.message}).insert(ignore_permissions=True)
                    except Exception:
                        pass

    # Receivables alert threshold check
    cust_receivables = frappe.db.sql(\"\"\"
        SELECT customer, SUM(outstanding_amount) as total_out
        FROM `tabSales Invoice`
        WHERE docstatus = 1 AND outstanding_amount > 0
        GROUP BY customer
        HAVING total_out >= %s
    \"\"\", (rec_threshold,), as_dict=True)

    for cr in cust_receivables:
        cr_title = f"Receivables Threshold Breached: {cr.customer} (₹{cr.total_out:.2f})"
        cr_exists = frappe.db.exists("Fleet Alert Log", {
            "source_doctype": "Customer",
            "source_name": cr.customer,
            "alert_title": cr_title,
            "status": ["!=", "Resolved"]
        })
        if not cr_exists:
            cr_alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": cr_title,
                "alert_category": "Revenue & Financial",
                "severity": "Critical",
                "status": "Unread",
                "source_doctype": "Customer",
                "source_name": cr.customer,
                "recipient_role": f_role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": f"Total outstanding balance (₹{cr.total_out:.2f}) exceeds credit threshold of ₹{rec_threshold:.2f}. Suspend credit.",
                "message": f"Customer {cr.customer} total outstanding receivables ₹{cr.total_out:.2f} exceeded threshold ₹{rec_threshold:.2f}.",
                "is_test_record": 0
            })
            cr_alt.insert(ignore_permissions=True)

# 6. Inventory: Low Stock & Stockout Risk
if enable_notifs and (fs.enable_inventory_alerts if fs.enable_inventory_alerts is not None else 1):
    inv_role = fs.inventory_alert_role or "Store Manager"
    reorders = frappe.db.sql(\"\"\"
        SELECT ir.parent as item_code, ir.warehouse, ir.warehouse_reorder_level, b.actual_qty
        FROM `tabItem Reorder` ir
        LEFT JOIN `tabBin` b ON b.item_code = ir.parent AND b.warehouse = ir.warehouse
    \"\"\", as_dict=True)

    for r in reorders:
        actual = float(r.actual_qty or 0.0)
        reorder_lvl = float(r.warehouse_reorder_level or 0.0)
        if actual <= 0:
            so_title = f"Stockout Risk Alert: {r.item_code} in {r.warehouse}"
            if not frappe.db.exists("Fleet Alert Log", {"source_doctype": "Item", "source_name": r.item_code, "alert_title": so_title, "status": ["!=", "Resolved"]}):
                so_alt = frappe.get_doc({
                    "doctype": "Fleet Alert Log",
                    "alert_title": so_title,
                    "alert_category": "Inventory",
                    "severity": "Critical",
                    "status": "Unread",
                    "source_doctype": "Item",
                    "source_name": r.item_code,
                    "recipient_role": inv_role,
                    "delivery_channel": "In-App and Email",
                    "alert_timestamp": now_dt,
                    "action_required": f"Immediate stockout: zero units in {r.warehouse}. Raise emergency purchase order.",
                    "message": f"Spare part {r.item_code} in warehouse {r.warehouse} is out of stock (Stock: {actual}).",
                    "is_test_record": 0
                })
                so_alt.insert(ignore_permissions=True)
        elif actual <= reorder_lvl:
            ls_title = f"Low Stock Alert: {r.item_code} in {r.warehouse}"
            if not frappe.db.exists("Fleet Alert Log", {"source_doctype": "Item", "source_name": r.item_code, "alert_title": ls_title, "status": ["!=", "Resolved"]}):
                ls_alt = frappe.get_doc({
                    "doctype": "Fleet Alert Log",
                    "alert_title": ls_title,
                    "alert_category": "Inventory",
                    "severity": "High",
                    "status": "Unread",
                    "source_doctype": "Item",
                    "source_name": r.item_code,
                    "recipient_role": inv_role,
                    "delivery_channel": "In-App and Email",
                    "alert_timestamp": now_dt,
                    "action_required": f"Stock ({actual}) below reorder level ({reorder_lvl}). Initiate replenishment.",
                    "message": f"Spare part {r.item_code} in warehouse {r.warehouse} stock {actual} is below reorder level {reorder_lvl}.",
                    "is_test_record": 0
                })
                ls_alt.insert(ignore_permissions=True)
        else:
            # Auto-resolve low stock/stockout when replenished
            open_stock_alts = frappe.get_all("Fleet Alert Log", filters={"source_doctype": "Item", "source_name": r.item_code, "status": ["!=", "Resolved"]}, fields=["name", "alert_title"])
            for osa in open_stock_alts:
                if "Stock" in osa.alert_title:
                    frappe.db.set_value("Fleet Alert Log", osa.name, {"status": "Resolved", "resolved_on": now_dt, "resolved_by": "Administrator", "resolution_note": f"Stock replenished (Current: {actual})."}, update_modified=False)

# 7. Procurement: Supplier Payment Due & Delayed Procurement
if enable_notifs and (fs.enable_procurement_alerts if fs.enable_procurement_alerts is not None else 1):
    proc_role = fs.procurement_alert_role or "Store Manager"
    due_pis = frappe.db.sql(\"\"\"
        SELECT name, supplier, due_date, outstanding_amount
        FROM `tabPurchase Invoice`
        WHERE docstatus = 1 AND outstanding_amount > 0 AND due_date <= %s
    \"\"\", (today,), as_dict=True)

    for pi in due_pis:
        pi_due_title = f"Supplier Payment Due: {pi.name} ({pi.supplier})"
        if not frappe.db.exists("Fleet Alert Log", {"source_doctype": "Purchase Invoice", "source_name": pi.name, "alert_title": pi_due_title, "status": ["!=", "Resolved"]}):
            pi_due_alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": pi_due_title,
                "alert_category": "Procurement",
                "severity": "Medium",
                "status": "Unread",
                "source_doctype": "Purchase Invoice",
                "source_name": pi.name,
                "recipient_role": proc_role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": f"Process supplier payment of ₹{pi.outstanding_amount} for {pi.supplier} due on {pi.due_date}.",
                "message": f"Purchase Invoice {pi.name} for supplier {pi.supplier} is due for payment (Outstanding: ₹{pi.outstanding_amount}).",
                "is_test_record": 0
            })
            pi_due_alt.insert(ignore_permissions=True)

    delayed_pos = frappe.db.sql(\"\"\"
        SELECT po.name, po.supplier, MIN(poi.schedule_date) as exp_date
        FROM `tabPurchase Order` po
        JOIN `tabPurchase Order Item` poi ON poi.parent = po.name
        WHERE po.docstatus = 1 AND po.status NOT IN ('Completed', 'Closed', 'Delivered')
          AND poi.schedule_date < %s
        GROUP BY po.name
    \"\"\", (today,), as_dict=True)

    for dpo in delayed_pos:
        del_title = f"Delayed Procurement Alert: {dpo.name} ({dpo.supplier})"
        if not frappe.db.exists("Fleet Alert Log", {"source_doctype": "Purchase Order", "source_name": dpo.name, "alert_title": del_title, "status": ["!=", "Resolved"]}):
            del_alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": del_title,
                "alert_category": "Procurement",
                "severity": "High",
                "status": "Unread",
                "source_doctype": "Purchase Order",
                "source_name": dpo.name,
                "recipient_role": proc_role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": f"Expedite delayed procurement with supplier {dpo.supplier} (Expected: {dpo.exp_date}).",
                "message": f"Purchase Order {dpo.name} from supplier {dpo.supplier} has not been received by scheduled date {dpo.exp_date}.",
                "is_test_record": 0
            })
            del_alt.insert(ignore_permissions=True)

# 8. Unresolved Alert Reminders & Escalations
open_alerts = frappe.get_all("Fleet Alert Log", filters={
    "status": ["in", ["Unread", "Read", "Acknowledged"]],
    "reminder_count": ["<", max_reminders]
}, fields=["name", "alert_title", "alert_category", "severity", "recipient_role", "alert_timestamp", "last_reminder_on", "reminder_count", "message", "action_required", "is_test_record"])

for alt in open_alerts:
    last_dt = alt.last_reminder_on or alt.alert_timestamp
    if not last_dt:
        continue
    elapsed_hours = (now_dt - frappe.utils.get_datetime(last_dt)).total_seconds() / 3600.0

    if elapsed_hours >= rem_freq_hours:
        new_count = alt.reminder_count + 1
        frappe.db.set_value("Fleet Alert Log", alt.name, {
            "reminder_count": new_count,
            "last_reminder_on": now_dt
        }, update_modified=False)

        rem_title = f"[REMINDER #{new_count}] {alt.alert_title}"
        if enable_in_app:
            users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (alt.recipient_role,))
            for u in users:
                try:
                    frappe.get_doc({
                        "doctype": "Notification Log",
                        "subject": rem_title,
                        "for_user": u[0],
                        "type": "Alert",
                        "document_type": "Fleet Alert Log",
                        "document_name": alt.name,
                        "email_content": f"<p>Reminder #{new_count}: {alt.message}</p>"
                    }).insert(ignore_permissions=True)
                except Exception:
                    pass

        if enable_email and not alt.is_test_record:
            emails = [r[0] for r in frappe.db.sql("SELECT u.email FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1 AND u.email != ''", (alt.recipient_role,))]
            if emails:
                try:
                    frappe.sendmail(
                        recipients=emails,
                        subject=rem_title,
                        message=f"<p><strong>{rem_title}</strong></p><p>{alt.message}</p><p><strong>Action Required:</strong> {alt.action_required}</p>",
                        reference_doctype="Fleet Alert Log",
                        reference_name=alt.name,
                        now=False
                    )
                except Exception:
                    pass

frappe.db.commit()

response = {
    "status": "success",
    "vehicles_scanned": len(vehicles),
    "notifications_created": notifications_created,
    "notifications_skipped_dedup": notifications_skipped_dedup,
    "expiries_detected": expiries_detected,
    "message": "Daily Fleet Expiry, Escalation & Reminder Scheduler executed successfully."
}
frappe.response["message"] = response
"""

    ss_sched = frappe.get_doc("Server Script", "Fleet Management - Daily Expiry Monitoring Scheduler")
    ss_sched.script = scheduler_code
    ss_sched.save(ignore_permissions=True)

    ss_api = frappe.get_doc("Server Script", "Fleet Management - Expiry Monitoring & Notifications")
    ss_api.script = scheduler_code
    ss_api.save(ignore_permissions=True)
    print("Updated Daily Scheduler and API Server Scripts.")

    # 2. Update Operational Expense - Notification Events (Add Expense Threshold Breached)
    oe_script = """fs = frappe.get_doc("Fleet Settings")
if not fs or not fs.enable_fleet_notifications or not fs.enable_financial_alerts:
    pass
else:
    role = fs.financial_alert_role or "Accountant"
    now_dt = frappe.utils.now_datetime()
    wf_st = doc.workflow_state or doc.approval_status
    title = None
    severity = "Medium"
    action = ""
    msg = ""

    if wf_st == "Submitted":
        title = f"Expense Awaiting Approval: {doc.name}"
        severity = "Medium"
        action = f"Review and approve operational expense of ₹{doc.amount} ({doc.expense_category})."
        msg = f"Operational Expense {doc.name} for ₹{doc.amount} ({doc.expense_category}) submitted by {doc.submitted_by or 'User'} is awaiting approval."
    elif wf_st == "Approved":
        title = f"Expense Approved: {doc.name}"
        severity = "Low"
        action = "Post GL Journal Entry or schedule payment settlement."
        msg = f"Operational Expense {doc.name} for ₹{doc.amount} has been approved."
        open_alts = frappe.get_all("Fleet Alert Log", filters={"source_doctype": "Operational Expense", "source_name": doc.name, "alert_title": f"Expense Awaiting Approval: {doc.name}", "status": ["!=", "Resolved"]}, fields=["name"])
        for oa in open_alts:
            frappe.db.set_value("Fleet Alert Log", oa.name, {"status": "Resolved", "resolved_on": now_dt, "resolved_by": frappe.session.user or "Administrator", "resolution_note": "Expense approved."}, update_modified=False)
    elif wf_st == "Rejected":
        title = f"Expense Rejected: {doc.name}"
        severity = "Medium"
        action = f"Review rejection reason: {doc.rejection_reason or 'None'}."
        msg = f"Operational Expense {doc.name} for ₹{doc.amount} was rejected. Reason: {doc.rejection_reason or 'None'}."
        open_alts = frappe.get_all("Fleet Alert Log", filters={"source_doctype": "Operational Expense", "source_name": doc.name, "alert_title": f"Expense Awaiting Approval: {doc.name}", "status": ["!=", "Resolved"]}, fields=["name"])
        for oa in open_alts:
            frappe.db.set_value("Fleet Alert Log", oa.name, {"status": "Resolved", "resolved_on": now_dt, "resolved_by": frappe.session.user or "Administrator", "resolution_note": "Expense rejected."}, update_modified=False)

    if title:
        exists = frappe.db.exists("Fleet Alert Log", {"source_doctype": "Operational Expense", "source_name": doc.name, "alert_title": title, "status": ["!=", "Resolved"]})
        if not exists:
            alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": title,
                "alert_category": "Revenue & Financial",
                "severity": severity,
                "status": "Unread",
                "source_doctype": "Operational Expense",
                "source_name": doc.name,
                "vehicle": doc.vehicle,
                "driver": doc.driver,
                "recipient_role": role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": action,
                "message": msg,
                "is_test_record": doc.is_test_record or 0
            })
            alt.insert(ignore_permissions=True)

            if fs.enable_in_app_notifications:
                users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (role,))
                for u in users:
                    try:
                        frappe.get_doc({"doctype": "Notification Log", "subject": title, "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": alt.name, "email_content": msg}).insert(ignore_permissions=True)
                    except Exception:
                        pass

            if fs.enable_email_notifications and not doc.is_test_record:
                emails = [r[0] for r in frappe.db.sql("SELECT u.email FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1 AND u.email != ''", (role,))]
                if emails:
                    try:
                        frappe.sendmail(recipients=emails, subject=f"[{severity.upper()}] {title}", message=f"<p><strong>{title}</strong></p><p>{msg}</p><p><strong>Action Required:</strong> {action}</p>", reference_doctype="Fleet Alert Log", reference_name=alt.name, now=False)
                        frappe.db.set_value("Fleet Alert Log", alt.name, "email_queued", 1, update_modified=False)
                    except Exception:
                        pass

    # Expense Threshold Breached check (>= 25,000)
    if float(doc.amount or 0.0) >= 25000.0:
        th_title = f"Expense Threshold Breached: {doc.name} (₹{doc.amount})"
        th_exists = frappe.db.exists("Fleet Alert Log", {"source_doctype": "Operational Expense", "source_name": doc.name, "alert_title": th_title, "status": ["!=", "Resolved"]})
        if not th_exists:
            th_alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": th_title,
                "alert_category": "Revenue & Financial",
                "severity": "High",
                "status": "Unread",
                "source_doctype": "Operational Expense",
                "source_name": doc.name,
                "vehicle": doc.vehicle,
                "recipient_role": role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": f"High expense (₹{doc.amount}) exceeds standard threshold of ₹25,000. Ensure managerial justification.",
                "message": f"Operational Expense {doc.name} for ₹{doc.amount} ({doc.expense_category}) exceeded high expense threshold.",
                "is_test_record": doc.is_test_record or 0
            })
            th_alt.insert(ignore_permissions=True)
"""
    ss_oe = frappe.get_doc("Server Script", "Operational Expense - Notification Events")
    ss_oe.script = oe_script
    ss_oe.save(ignore_permissions=True)
    print("Updated Operational Expense - Notification Events.")

    # 3. Update Payment Entry - Notification Events (Add Partial Payment support)
    pe_script = """fs = frappe.get_doc("Fleet Settings")
if not fs or not fs.enable_fleet_notifications or not fs.enable_financial_alerts:
    pass
elif doc.payment_type == "Receive" and doc.party_type == "Customer":
    role = fs.financial_alert_role or "Accountant"
    now_dt = frappe.utils.now_datetime()
    
    # Check if this payment left any linked Sales Invoice with remaining balance
    has_partial = False
    for ref in (doc.references or []):
        if ref.reference_doctype == "Sales Invoice":
            out = frappe.db.get_value("Sales Invoice", ref.reference_name, "outstanding_amount")
            if out and float(out) > 0:
                has_partial = True
                break

    titles_to_create = [f"Customer Payment Received: {doc.name}"]
    if has_partial:
        titles_to_create.append(f"Invoice Partially Paid: {doc.name}")

    for title in titles_to_create:
        action = f"Verify payment allocation of ₹{doc.paid_amount} for customer {doc.party}."
        msg = f"Payment Entry {doc.name} submitted for customer {doc.party} with amount ₹{doc.paid_amount}."

        exists = frappe.db.exists("Fleet Alert Log", {"source_doctype": "Payment Entry", "source_name": doc.name, "alert_title": title, "status": ["!=", "Resolved"]})
        if not exists:
            alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": title,
                "alert_category": "Revenue & Financial",
                "severity": "Low",
                "status": "Unread",
                "source_doctype": "Payment Entry",
                "source_name": doc.name,
                "recipient_role": role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": action,
                "message": msg,
                "is_test_record": doc.custom_is_test_record or 0
            })
            alt.insert(ignore_permissions=True)

            if fs.enable_in_app_notifications:
                users = frappe.db.sql("SELECT u.name FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1", (role,))
                for u in users:
                    try:
                        frappe.get_doc({"doctype": "Notification Log", "subject": title, "for_user": u[0], "type": "Alert", "document_type": "Fleet Alert Log", "document_name": alt.name, "email_content": msg}).insert(ignore_permissions=True)
                    except Exception:
                        pass

            if fs.enable_email_notifications and not doc.custom_is_test_record:
                emails = [r[0] for r in frappe.db.sql("SELECT u.email FROM `tabUser` u JOIN `tabHas Role` hr ON hr.parent = u.name WHERE hr.role = %s AND u.enabled = 1 AND u.email != ''", (role,))]
                if emails:
                    try:
                        frappe.sendmail(recipients=emails, subject=f"[LOW] {title}", message=f"<p><strong>{title}</strong></p><p>{msg}</p><p><strong>Action Required:</strong> {action}</p>", reference_doctype="Fleet Alert Log", reference_name=alt.name, now=False)
                        frappe.db.set_value("Fleet Alert Log", alt.name, "email_queued", 1, update_modified=False)
                    except Exception:
                        pass
"""
    ss_pe = frappe.get_doc("Server Script", "Payment Entry - Notification Events")
    ss_pe.script = pe_script
    ss_pe.save(ignore_permissions=True)
    print("Updated Payment Entry - Notification Events.")

    frappe.db.commit()
    print("All consolidated remediations applied successfully.")

if __name__ == "__main__":
    apply_consolidated_remediation()

