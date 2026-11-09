import frappe

def update_vip_sync():
    frappe.init("frontend")
    frappe.connect()

    script = """today_val = frappe.utils.getdate()

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

# C. Batch 11: Alert & auto-resolution on Active policy
if doc.policy_status == "Active":
    fs = frappe.get_single("Fleet Settings")
    if fs and fs.enable_fleet_notifications and (fs.enable_insurance_compliance_alerts if fs.enable_insurance_compliance_alerts is not None else 1):
        role = fs.insurance_compliance_alert_role or "Fleet Manager"
        now_dt = frappe.utils.now_datetime()
        pol_title = f"Policy Renewal Completed: {doc.name}"
        exists = frappe.db.exists("Fleet Alert Log", {"source_doctype": "Vehicle Insurance Policy", "source_name": doc.name, "alert_title": pol_title, "status": ["!=", "Resolved"]})
        if not exists:
            alt = frappe.get_doc({
                "doctype": "Fleet Alert Log",
                "alert_title": pol_title,
                "alert_category": "Insurance & Compliance",
                "severity": "Low",
                "status": "Unread",
                "source_doctype": "Vehicle Insurance Policy",
                "source_name": doc.name,
                "vehicle": doc.vehicle,
                "recipient_role": role,
                "delivery_channel": "In-App and Email",
                "alert_timestamp": now_dt,
                "action_required": "Insurance coverage active. Verify vehicle statutory summary.",
                "message": f"Insurance policy {doc.policy_no} for vehicle {doc.vehicle} is Active (Valid {doc.start_date} to {doc.end_date}).",
                "is_test_record": doc.is_test_record or 0
            })
            alt.insert(ignore_permissions=True)

        # Auto-resolve existing insurance expiry alerts for this vehicle
        open_alts = frappe.db.sql(\"\"\"
            SELECT name FROM `tabFleet Alert Log`
            WHERE vehicle = %s AND alert_category = 'Insurance & Compliance' AND status != 'Resolved' AND alert_title LIKE '%Insurance%'
        \"\"\", (doc.vehicle,))
        for oa in open_alts:
            frappe.db.set_value("Fleet Alert Log", oa[0], {"status": "Resolved", "resolved_on": now_dt, "resolved_by": frappe.session.user or "Administrator", "resolution_note": f"Policy renewed ({doc.name})."}, update_modified=False)
"""

    ss = frappe.get_doc("Server Script", "Vehicle Insurance Policy - Vehicle Sync")
    ss.script = script
    ss.save(ignore_permissions=True)
    frappe.db.commit()
    print("Updated Server Script: Vehicle Insurance Policy - Vehicle Sync")

if __name__ == "__main__":
    update_vip_sync()

