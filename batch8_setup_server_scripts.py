import frappe

def run():
    print("=== BATCH 8: CONFIGURING SERVER SCRIPTS (ZERO IMPORTS) ===")

    scripts = [
        # 1. Vehicle Insurance Policy - Validations & Lifecycle
        {
            "name": "Vehicle Insurance Policy - Validations & Lifecycle",
            "script_type": "DocType Event",
            "reference_doctype": "Vehicle Insurance Policy",
            "doctype_event": "Before Save",
            "script": """# 1. Mandatory Validations
if not doc.vehicle:
    frappe.throw("Vehicle is mandatory for insurance policy.")
if not doc.insurance_company or not doc.insurance_company.strip():
    frappe.throw("Insurance Company is mandatory.")
if not doc.policy_no or not doc.policy_no.strip():
    frappe.throw("Policy Number is mandatory.")
if not doc.start_date:
    frappe.throw("Policy Start Date is mandatory.")
if not doc.end_date:
    frappe.throw("Policy Expiry Date is mandatory.")
if doc.premium_amount is None or float(doc.premium_amount) < 0:
    frappe.throw("Premium Amount must be a positive number or zero.")

# 2. Date Sequence Validation
if frappe.utils.getdate(doc.end_date) < frappe.utils.getdate(doc.start_date):
    frappe.throw(f"Policy Expiry Date ({doc.end_date}) cannot precede Start Date ({doc.start_date}).")

# 3. Test Record Inheritance
if not doc.is_test_record and doc.vehicle:
    v_test = frappe.db.get_value("Vehicle", doc.vehicle, "is_test_record")
    if v_test:
        doc.is_test_record = 1

# 4. Role Authorization Helper
user = frappe.session.user
user_roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (user,))]
can_manage = ("Fleet Manager" in user_roles) or ("System Manager" in user_roles) or (user == "Administrator")

# 5. Protect Audit Fields from manual client edit
if doc.get_doc_before_save():
    old = doc.get_doc_before_save()
    if not ("System Manager" in user_roles or user == "Administrator"):
        if doc.approved_by != old.approved_by or doc.approved_on != old.approved_on:
            frappe.throw("Manual modification of approval audit fields is strictly prohibited.")
        if doc.cancelled_by != old.cancelled_by or doc.cancelled_on != old.cancelled_on:
            frappe.throw("Manual modification of cancellation audit fields is strictly prohibited.")

# 6. Policy Status Transitions & Controls
old_status = doc.get_doc_before_save().get("policy_status") if doc.get_doc_before_save() else None
new_status = doc.policy_status

# A. Activation Control
if new_status == "Active":
    if not can_manage:
        frappe.throw("Only Fleet Managers or System Managers are authorized to activate an insurance policy.")
    
    # Overlapping Active Policy Prevention on same vehicle
    overlaps = frappe.db.sql(\"\"\"
        SELECT name, policy_no, start_date, end_date
        FROM `tabVehicle Insurance Policy`
        WHERE vehicle = %s
          AND policy_status = 'Active'
          AND name != %s
          AND start_date <= %s
          AND end_date >= %s
    \"\"\", (doc.vehicle, doc.name or "NEW", doc.end_date, doc.start_date), as_dict=True)
    
    if overlaps:
        frappe.throw(f"Vehicle '{doc.vehicle}' already has an active insurance policy '{overlaps[0].name}' (Policy No: {overlaps[0].policy_no}) covering period {overlaps[0].start_date} to {overlaps[0].end_date}. Overlapping active policy periods are strictly prohibited.")
    
    # Stamp Approval
    if not doc.approved_by:
        doc.approved_by = user
        doc.approved_on = frappe.utils.now_datetime()

# B. Cancellation Control
elif new_status == "Cancelled":
    if not can_manage:
        frappe.throw("Only Fleet Managers or System Managers are authorized to cancel an insurance policy.")
    if not doc.cancellation_reason or not doc.cancellation_reason.strip():
        frappe.throw("Cancellation reason is mandatory when cancelling an insurance policy.")
    if not doc.cancelled_by:
        doc.cancelled_by = user
        doc.cancelled_on = frappe.utils.now_datetime()

# C. Expired transition validation
elif new_status == "Expired":
    if frappe.utils.getdate(doc.end_date) >= frappe.utils.getdate():
        if not ("System Manager" in user_roles or user == "Administrator"):
            frappe.throw(f"Policy '{doc.policy_no}' cannot be marked Expired because its end date ({doc.end_date}) is in the future.")
"""
        },

        # 2. Vehicle Insurance Policy - Vehicle Sync
        {
            "name": "Vehicle Insurance Policy - Vehicle Sync",
            "script_type": "DocType Event",
            "reference_doctype": "Vehicle Insurance Policy",
            "doctype_event": "After Save",
            "script": """today_val = frappe.utils.getdate()

# A. Find active policy currently effective TODAY for this vehicle
effective_pol = frappe.db.sql(\"\"\"
    SELECT insurance_company, policy_no, start_date, end_date, policy_doc
    FROM `tabVehicle Insurance Policy`
    WHERE vehicle = %s
      AND policy_status = 'Active'
      AND start_date <= %s
      AND end_date >= %s
    ORDER BY end_date DESC
    LIMIT 1
\"\"\", (doc.vehicle, today_val, today_val), as_dict=True)

if effective_pol:
    frappe.db.set_value("Vehicle", doc.vehicle, {
        "insurance_company": effective_pol[0].insurance_company,
        "policy_no": effective_pol[0].policy_no,
        "start_date": effective_pol[0].start_date,
        "end_date": effective_pol[0].end_date,
        "insurance_policy_doc": effective_pol[0].policy_doc
    }, update_modified=False)
else:
    # No policy currently effective today!
    # Check if there is an expired policy (latest past policy)
    past_pol = frappe.db.sql(\"\"\"
        SELECT insurance_company, policy_no, start_date, end_date, policy_doc
        FROM `tabVehicle Insurance Policy`
        WHERE vehicle = %s
          AND policy_status IN ('Active', 'Expired')
          AND end_date < %s
        ORDER BY end_date DESC
        LIMIT 1
    \"\"\", (doc.vehicle, today_val), as_dict=True)
    if past_pol:
        frappe.db.set_value("Vehicle", doc.vehicle, {
            "insurance_company": past_pol[0].insurance_company,
            "policy_no": past_pol[0].policy_no,
            "start_date": past_pol[0].start_date,
            "end_date": past_pol[0].end_date,
            "insurance_policy_doc": past_pol[0].policy_doc
        }, update_modified=False)
    else:
        # Check if there is a future policy
        future_pol = frappe.db.sql(\"\"\"
            SELECT insurance_company, policy_no, start_date, end_date, policy_doc
            FROM `tabVehicle Insurance Policy`
            WHERE vehicle = %s
              AND policy_status = 'Active'
              AND start_date > %s
            ORDER BY start_date ASC
            LIMIT 1
        \"\"\", (doc.vehicle, today_val), as_dict=True)
        if future_pol:
            frappe.db.set_value("Vehicle", doc.vehicle, {
                "insurance_company": future_pol[0].insurance_company,
                "policy_no": future_pol[0].policy_no,
                "start_date": future_pol[0].start_date,
                "end_date": future_pol[0].end_date,
                "insurance_policy_doc": future_pol[0].policy_doc
            }, update_modified=False)
        else:
            frappe.db.set_value("Vehicle", doc.vehicle, {
                "insurance_company": None,
                "policy_no": None,
                "start_date": None,
                "end_date": None,
                "insurance_policy_doc": None
            }, update_modified=False)

# B. If renewal, expire previous policy ONLY if previous policy's period has ended
if doc.policy_status == "Active" and doc.is_renewal and doc.previous_policy:
    prev_end = frappe.db.get_value("Vehicle Insurance Policy", doc.previous_policy, "end_date")
    if prev_end and frappe.utils.getdate(prev_end) < today_val:
        frappe.db.set_value("Vehicle Insurance Policy", doc.previous_policy, "policy_status", "Expired")
"""
        },

        # 3. Vehicle Insurance Policy - Deletion Safeguard
        {
            "name": "Vehicle Insurance Policy - Deletion Safeguard",
            "script_type": "DocType Event",
            "reference_doctype": "Vehicle Insurance Policy",
            "doctype_event": "Before Delete",
            "script": """user = frappe.session.user
user_roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (user,))]
is_admin = ("System Manager" in user_roles) or (user == "Administrator")

if not is_admin:
    frappe.throw("Physical deletion of insurance policy records is restricted to System Managers.")

if doc.policy_status == "Active":
    frappe.throw("Active insurance policies cannot be deleted. The policy must be cancelled first.")
"""
        },

        # 4. Fleet Management - Expiry Monitoring & Notifications (API Method)
        {
            "name": "Fleet Management - Expiry Monitoring & Notifications",
            "script_type": "API",
            "api_method": "check_document_expiries",
            "script": """today = frappe.utils.getdate(frappe.utils.nowdate())
now_dt = frappe.utils.now_datetime()

# Fetch settings
warning_days = frappe.db.get_single_value("Fleet Settings", "warning_window_days") or 30
recipient_role = frappe.db.get_single_value("Fleet Settings", "notification_recipient_role") or "Fleet Manager"

doc_types = [
    ("Insurance", "end_date"),
    ("Fitness Certificate", "fitness_expiry_date"),
    ("PUC Certificate", "puc_expiry_date"),
    ("Road Tax", "road_tax_expiry_date"),
    ("Goods Permit", "permit_expiry_date")
]

vehicles = frappe.get_all("Vehicle", fields=["name", "end_date", "fitness_expiry_date", "puc_expiry_date", "road_tax_expiry_date", "permit_expiry_date", "policy_no", "is_test_record"])

# Query email recipients dynamically from role
recipient_emails = [r[0] for r in frappe.db.sql(\"\"\"
    SELECT u.email FROM `tabUser` u
    JOIN `tabHas Role` hr ON hr.parent = u.name
    WHERE hr.role = %s AND u.enabled = 1 AND u.email != ''
\"\"\", (recipient_role,))]

created_count = 0
skipped_count = 0
emails_queued = 0

for v in vehicles:
    # Synchronize Vehicle summary with active policy effective today
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

    for dtype, fieldname in doc_types:
        exp_date_val = v.get(fieldname)
        if not exp_date_val:
            continue
        
        exp_date = frappe.utils.getdate(exp_date_val)
        days_left = (exp_date - today).days

        # Determine stage based on warning window
        stage = None
        if days_left <= 0:
            stage = "Expired"
        elif days_left <= 7:
            stage = "7 Days Prior"
        elif days_left <= 15:
            stage = "15 Days Prior"
        elif days_left <= warning_days:
            stage = "30 Days Prior"

        if not stage:
            continue

        # Check deduplication in Fleet Expiry Notification Log
        exists = frappe.db.exists("Fleet Expiry Notification Log", {
            "vehicle": v.name,
            "document_type": dtype,
            "expiry_date": exp_date,
            "notification_stage": stage
        })

        if exists:
            skipped_count += 1
            continue

        # Create notification log
        action_msg = f"CRITICAL: {dtype} for vehicle {v.name} expired on {exp_date}. Immediate renewal required." if stage == "Expired" else f"ACTION REQUIRED: {dtype} for vehicle {v.name} expires in {days_left} days on {exp_date}. Please initiate renewal."

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
        created_count += 1

        # Queue email if recipients found and not test record
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
                frappe.db.set_value("Fleet Expiry Notification Log", notif.name, "status", "Queued")
                emails_queued += 1
            except Exception:
                pass

frappe.db.commit()

response = {
    "status": "success",
    "vehicles_scanned": len(vehicles),
    "notifications_created": created_count,
    "notifications_skipped_dedup": skipped_count,
    "emails_queued": emails_queued
}
frappe.response["message"] = response
"""
        },

        # 5. Fleet Management - Daily Expiry Monitoring Scheduler (Scheduler Event)
        {
            "name": "Fleet Management - Daily Expiry Monitoring Scheduler",
            "script_type": "Scheduler Event",
            "event_frequency": "Daily",
            "script": """today = frappe.utils.getdate(frappe.utils.nowdate())
now_dt = frappe.utils.now_datetime()

# Fetch settings
warning_days = frappe.db.get_single_value("Fleet Settings", "warning_window_days") or 30
recipient_role = frappe.db.get_single_value("Fleet Settings", "notification_recipient_role") or "Fleet Manager"

doc_types = [
    ("Insurance", "end_date"),
    ("Fitness Certificate", "fitness_expiry_date"),
    ("PUC Certificate", "puc_expiry_date"),
    ("Road Tax", "road_tax_expiry_date"),
    ("Goods Permit", "permit_expiry_date")
]

vehicles = frappe.get_all("Vehicle", fields=["name", "end_date", "fitness_expiry_date", "puc_expiry_date", "road_tax_expiry_date", "permit_expiry_date", "policy_no", "is_test_record"])

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

    for dtype, fieldname in doc_types:
        exp_date_val = v.get(fieldname)
        if not exp_date_val:
            continue
        
        exp_date = frappe.utils.getdate(exp_date_val)
        days_left = (exp_date - today).days

        stage = None
        if days_left <= 0:
            stage = "Expired"
        elif days_left <= 7:
            stage = "7 Days Prior"
        elif days_left <= 15:
            stage = "15 Days Prior"
        elif days_left <= warning_days:
            stage = "30 Days Prior"

        if not stage:
            continue

        exists = frappe.db.exists("Fleet Expiry Notification Log", {
            "vehicle": v.name,
            "document_type": dtype,
            "expiry_date": exp_date,
            "notification_stage": stage
        })

        if exists:
            continue

        action_msg = f"CRITICAL: {dtype} for vehicle {v.name} expired on {exp_date}. Immediate renewal required." if stage == "Expired" else f"ACTION REQUIRED: {dtype} for vehicle {v.name} expires in {days_left} days on {exp_date}. Please initiate renewal."

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
                frappe.db.set_value("Fleet Expiry Notification Log", notif.name, "status", "Queued")
            except Exception:
                pass

frappe.db.commit()
"""
        },

        # 6. Fleet Management - Policy Renewal API
        {
            "name": "Fleet Management - Policy Renewal API",
            "script_type": "API",
            "api_method": "renew_insurance_policy",
            "script": """user = frappe.session.user
user_roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (user,))]
if not (("Fleet Manager" in user_roles) or ("System Manager" in user_roles) or (user == "Administrator")):
    frappe.throw("Only Fleet Managers or System Managers are authorized to renew insurance policies.")

policy_name = frappe.form_dict.get("policy_name")
new_policy_no = frappe.form_dict.get("new_policy_no")
start_date = frappe.form_dict.get("start_date")
end_date = frappe.form_dict.get("end_date")
premium_amount = frappe.form_dict.get("premium_amount")
insurance_company = frappe.form_dict.get("insurance_company")
remarks = frappe.form_dict.get("remarks")
activate_now = frappe.form_dict.get("activate_now")

if not policy_name or not frappe.db.exists("Vehicle Insurance Policy", policy_name):
    frappe.throw(f"Source policy '{policy_name}' not found.")
if not new_policy_no:
    frappe.throw("New policy number is mandatory for renewal.")
if not start_date or not end_date:
    frappe.throw("Start date and End date are mandatory for renewal.")
if premium_amount is None:
    frappe.throw("Premium amount is mandatory for renewal.")

old_policy = frappe.get_doc("Vehicle Insurance Policy", policy_name)

new_pol = frappe.get_doc({
    "doctype": "Vehicle Insurance Policy",
    "vehicle": old_policy.vehicle,
    "insurance_company": insurance_company or old_policy.insurance_company,
    "policy_no": new_policy_no,
    "policy_type": old_policy.policy_type,
    "start_date": start_date,
    "end_date": end_date,
    "premium_amount": float(premium_amount),
    "is_renewal": 1,
    "previous_policy": old_policy.name,
    "policy_status": "Active" if activate_now else "Draft",
    "remarks": remarks or f"Renewed from {old_policy.policy_no}",
    "company": old_policy.company,
    "is_test_record": old_policy.is_test_record
})

new_pol.insert(ignore_permissions=True)
frappe.db.commit()

frappe.response["message"] = {
    "status": "success",
    "new_policy": new_pol.name,
    "policy_no": new_pol.policy_no,
    "policy_status": new_pol.policy_status
}
"""
        }
    ]

    for s_data in scripts:
        s_name = s_data["name"]
        if s_data.get("script_type") == "Scheduler Event":
            meth = frappe.scrub(f"{s_name}-{s_data['event_frequency']}")
            frappe.db.sql("DELETE FROM `tabScheduled Job Type` WHERE server_script = %s OR method = %s", (s_name, meth))
            frappe.db.commit()
        if frappe.db.exists("Server Script", s_name):
            doc = frappe.get_doc("Server Script", s_name)
            doc.script_type = s_data["script_type"]
            doc.disabled = 0
            doc.script = s_data["script"]
            if s_data["script_type"] == "DocType Event":
                doc.reference_doctype = s_data["reference_doctype"]
                doc.doctype_event = s_data["doctype_event"]
            elif s_data["script_type"] == "API":
                doc.api_method = s_data["api_method"]
                doc.allow_guest = 0
            elif s_data["script_type"] == "Scheduler Event":
                doc.event_frequency = s_data["event_frequency"]
            doc.save(ignore_permissions=True)
            print(f"Updated Server Script: {s_name}")
        else:
            doc = frappe.new_doc("Server Script")
            doc.name = s_name
            doc.script_type = s_data["script_type"]
            doc.disabled = 0
            doc.script = s_data["script"]
            if s_data["script_type"] == "DocType Event":
                doc.reference_doctype = s_data["reference_doctype"]
                doc.doctype_event = s_data["doctype_event"]
            elif s_data["script_type"] == "API":
                doc.api_method = s_data["api_method"]
                doc.allow_guest = 0
            elif s_data["script_type"] == "Scheduler Event":
                doc.event_frequency = s_data["event_frequency"]
            doc.insert(ignore_permissions=True)
            print(f"Created Server Script: {s_name}")

    frappe.clear_cache()
    frappe.db.commit()
    print("=== SERVER SCRIPTS CONFIGURATION COMPLETED ===")

if __name__ == "__main__":
    run()
