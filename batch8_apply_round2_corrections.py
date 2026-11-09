import frappe

def run():
    print("=== BATCH 8: APPLYING ROUND 2 ACCEPTANCE CORRECTIONS ===")

    # -------------------------------------------------------------
    # 1. Add insured_declared_value to Vehicle Insurance Policy
    # -------------------------------------------------------------
    vip_dt = frappe.get_doc("DocType", "Vehicle Insurance Policy")
    has_idv = any(f.fieldname == "insured_declared_value" for f in vip_dt.fields)
    
    if not has_idv:
        # Find index of premium_amount
        prem_idx = next((i for i, f in enumerate(vip_dt.fields) if f.fieldname == "premium_amount"), -1)
        new_field = frappe.get_doc({
            "doctype": "DocField",
            "fieldname": "insured_declared_value",
            "label": "Insured Declared Value (IDV)",
            "fieldtype": "Currency",
            "options": "currency",
            "reqd": 0,
            "in_list_view": 1,
            "in_standard_filter": 0,
            "default": "0.0"
        })
        if prem_idx != -1:
            vip_dt.fields.insert(prem_idx + 1, new_field)
        else:
            vip_dt.append("fields", new_field)
        
        # Reset idx
        for i, f in enumerate(vip_dt.fields):
            f.idx = i + 1
            
        vip_dt.save(ignore_permissions=True)
        print("Added 'insured_declared_value' to Vehicle Insurance Policy DocType.")
    else:
        print("'insured_declared_value' already exists in Vehicle Insurance Policy.")

    # -------------------------------------------------------------
    # 2. Update Vehicle Insurance Register Report Query with IDV
    # -------------------------------------------------------------
    vir_query = """SELECT
    v.name AS "Vehicle:Link/Vehicle:130",
    v.make AS "Make:Data:100",
    v.model AS "Model:Data:120",
    COALESCE(v.insurance_company, vip.insurance_company, '-') AS "Insurance Company:Data:160",
    COALESCE(v.policy_no, vip.policy_no, '-') AS "Policy No:Data:140",
    COALESCE(vip.policy_type, 'Commercial Fleet Standard') AS "Policy Type:Data:140",
    v.start_date AS "Start Date:Date:100",
    v.end_date AS "Expiry Date:Date:100",
    CASE 
        WHEN v.end_date IS NULL THEN NULL 
        ELSE DATEDIFF(v.end_date, CURDATE()) 
    END AS "Days Remaining:Int:110",
    CASE
        WHEN v.end_date IS NULL THEN 'Not Recorded'
        WHEN v.end_date < CURDATE() THEN 'Expired'
        WHEN DATEDIFF(v.end_date, CURDATE()) <= fs.warning_window THEN 'Expiring Soon'
        ELSE 'Valid'
    END AS "Coverage Status:Data:120",
    COALESCE(vip.premium_amount, 0.0) AS "Annual Premium:Currency:120",
    COALESCE(vip.insured_declared_value, 0.0) AS "IDV:Currency:120",
    v.insurance_policy_doc AS "Policy Doc:Attach:110"
FROM `tabVehicle` v
CROSS JOIN (SELECT CAST(COALESCE(MAX(CASE WHEN field = 'warning_window_days' THEN value END), 30) AS UNSIGNED) AS warning_window FROM tabSingles WHERE doctype = 'Fleet Settings') fs
LEFT JOIN `tabVehicle Insurance Policy` vip ON vip.vehicle = v.name 
    AND vip.policy_status = 'Active' 
    AND (v.policy_no IS NULL OR vip.policy_no = v.policy_no)
WHERE (v.is_test_record = 0 OR v.is_test_record IS NULL)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR v.name = %(vehicle)s)
  AND (%(insurance_company)s IS NULL OR %(insurance_company)s = '' OR v.insurance_company = %(insurance_company)s)
  AND (%(status)s IS NULL OR %(status)s = '' OR (
        CASE
            WHEN v.end_date IS NULL THEN 'Not Recorded'
            WHEN v.end_date < CURDATE() THEN 'Expired'
            WHEN DATEDIFF(v.end_date, CURDATE()) <= fs.warning_window THEN 'Expiring Soon'
            ELSE 'Valid'
        END
  ) = %(status)s)
ORDER BY v.name ASC"""
    
    if frappe.db.exists("Report", "Vehicle Insurance Register"):
        r = frappe.get_doc("Report", "Vehicle Insurance Register")
        r.query = vir_query
        r.save(ignore_permissions=True)
        print("Updated 'Vehicle Insurance Register' Query Report with IDV column and dynamic warning window.")

    # -------------------------------------------------------------
    # 3. Create Server Script for Fleet Settings Validations
    # -------------------------------------------------------------
    fs_script_name = "Fleet Settings - Validations"
    fs_code = """# Validate warning_window_days
if doc.warning_window_days is None or int(doc.warning_window_days) <= 0:
    frappe.throw("Expiry Warning Window must be a positive integer greater than zero (e.g. 30).")

# Validate reminder_intervals
if not doc.reminder_intervals or not doc.reminder_intervals.strip():
    frappe.throw("Reminder Milestones cannot be empty. Please specify a comma-separated list of milestone days (e.g. '30, 15, 7, 0').")

raw_parts = doc.reminder_intervals.split(",")
valid_intervals = []
for p in raw_parts:
    p_clean = p.strip()
    if not p_clean:
        continue
    try:
        val = int(p_clean)
        if val < 0:
            frappe.throw(f"Reminder milestone '{p_clean}' cannot be negative. Milestones must be non-negative integers.")
        valid_intervals.append(val)
    except ValueError:
        frappe.throw(f"Invalid reminder milestone '{p_clean}'. Reminder milestones must be a comma-separated list of integers (e.g. '30, 15, 7, 0').")

if not valid_intervals:
    frappe.throw("Reminder Milestones must contain at least one valid milestone integer (e.g. '30, 15, 7, 0').")
"""
    if frappe.db.exists("Server Script", fs_script_name):
        ss_fs = frappe.get_doc("Server Script", fs_script_name)
        ss_fs.script = fs_code
        ss_fs.disabled = 0
        ss_fs.save(ignore_permissions=True)
        print(f"Updated Server Script: {fs_script_name}")
    else:
        ss_fs = frappe.get_doc({
            "doctype": "Server Script",
            "name": fs_script_name,
            "script_type": "DocType Event",
            "reference_doctype": "Fleet Settings",
            "doctype_event": "Before Save",
            "script": fs_code,
            "disabled": 0
        }).insert(ignore_permissions=True)
        print(f"Created Server Script: {fs_script_name}")

    # -------------------------------------------------------------
    # 4. Update Mining Trip Validation for Unavailable Mandatory Docs
    # -------------------------------------------------------------
    mt_name = "Mining Trip - Business Validations & Audit"
    mt_doc = frappe.get_doc("Server Script", mt_name)
    
    dispatch_check_code = """# 4B. Vehicle Statutory Document Expiry Validation on Dispatch
# Blocks dispatch if insurance, fitness, or other enforced statutory documents are expired, future-dated, in coverage gap, or unavailable/missing.
# Does NOT alter vehicle status to Breakdown/Under Maintenance; preserves Out of Service/Breakdown status intact.
if doc.trip_status == "Dispatched" and (doc.is_new() or (doc.get_doc_before_save() and doc.get_doc_before_save().get("trip_status") != "Dispatched")):
    v_docs = frappe.db.get_value("Vehicle", doc.vehicle, [
        "end_date", "start_date", "fitness_expiry_date", "puc_expiry_date", "road_tax_expiry_date", "permit_expiry_date"
    ], as_dict=True)
    if v_docs:
        today_val = frappe.utils.getdate()
        
        # Check settings
        enforce_ins = frappe.db.get_single_value("Fleet Settings", "enforce_insurance_on_dispatch")
        enforce_fit = frappe.db.get_single_value("Fleet Settings", "enforce_fitness_on_dispatch")
        enforce_puc = frappe.db.get_single_value("Fleet Settings", "enforce_puc_on_dispatch")
        enforce_tax = frappe.db.get_single_value("Fleet Settings", "enforce_road_tax_on_dispatch")
        enforce_pmt = frappe.db.get_single_value("Fleet Settings", "enforce_permit_on_dispatch")
        
        if enforce_ins is None: enforce_ins = 1
        if enforce_fit is None: enforce_fit = 1

        if enforce_ins:
            active_pol = frappe.db.sql(\"\"\"
                SELECT name, start_date, end_date
                FROM `tabVehicle Insurance Policy`
                WHERE vehicle = %s
                  AND policy_status = 'Active'
                  AND start_date <= %s
                  AND end_date >= %s
                LIMIT 1
            \"\"\", (doc.vehicle, today_val, today_val), as_dict=True)
            
            has_effective_policy = False
            if active_pol:
                has_effective_policy = True
            elif v_docs.end_date and v_docs.start_date:
                has_policies = frappe.db.count("Vehicle Insurance Policy", {"vehicle": doc.vehicle})
                if has_policies == 0:
                    v_start = frappe.utils.getdate(v_docs.start_date)
                    v_end = frappe.utils.getdate(v_docs.end_date)
                    if v_start <= today_val <= v_end:
                        has_effective_policy = True

            if not has_effective_policy:
                if not v_docs.end_date:
                    frappe.throw(f"Cannot dispatch Vehicle '{doc.vehicle}': No active insurance coverage recorded. Active insurance coverage covering today is mandatory for trip dispatch.")
                elif v_docs.start_date and frappe.utils.getdate(v_docs.start_date) > today_val:
                    frappe.throw(f"Cannot dispatch Vehicle '{doc.vehicle}': Insurance policy is future-dated (starts on {v_docs.start_date}). Policy is not yet effective today.")
                elif frappe.utils.getdate(v_docs.end_date) < today_val:
                    frappe.throw(f"Cannot dispatch Vehicle '{doc.vehicle}': Insurance expired on {v_docs.end_date}. Active insurance coverage is mandatory for trip dispatch.")
                else:
                    frappe.throw(f"Cannot dispatch Vehicle '{doc.vehicle}': No insurance policy currently effective today. Active insurance coverage covering today is mandatory for trip dispatch.")

        if enforce_fit:
            if not v_docs.fitness_expiry_date:
                frappe.throw(f"Cannot dispatch Vehicle '{doc.vehicle}': No valid Fitness Certificate recorded. Valid fitness certificate covering today is mandatory for trip dispatch.")
            elif frappe.utils.getdate(v_docs.fitness_expiry_date) < today_val:
                frappe.throw(f"Cannot dispatch Vehicle '{doc.vehicle}': Fitness Certificate expired on {v_docs.fitness_expiry_date}. Valid fitness certificate is mandatory for trip dispatch.")

        if enforce_puc:
            if not v_docs.puc_expiry_date:
                frappe.throw(f"Cannot dispatch Vehicle '{doc.vehicle}': No valid PUC Certificate recorded. Valid PUC certificate covering today is mandatory for trip dispatch.")
            elif frappe.utils.getdate(v_docs.puc_expiry_date) < today_val:
                frappe.throw(f"Cannot dispatch Vehicle '{doc.vehicle}': PUC Certificate expired on {v_docs.puc_expiry_date}.")

        if enforce_tax:
            if not v_docs.road_tax_expiry_date:
                frappe.throw(f"Cannot dispatch Vehicle '{doc.vehicle}': No valid Road Tax payment recorded. Valid road tax payment covering today is mandatory for trip dispatch.")
            elif frappe.utils.getdate(v_docs.road_tax_expiry_date) < today_val:
                frappe.throw(f"Cannot dispatch Vehicle '{doc.vehicle}': Road Tax expired on {v_docs.road_tax_expiry_date}.")

        if enforce_pmt:
            if not v_docs.permit_expiry_date:
                frappe.throw(f"Cannot dispatch Vehicle '{doc.vehicle}': No valid Goods Permit recorded. Valid goods permit covering today is mandatory for trip dispatch.")
            elif frappe.utils.getdate(v_docs.permit_expiry_date) < today_val:
                frappe.throw(f"Cannot dispatch Vehicle '{doc.vehicle}': Goods Permit expired on {v_docs.permit_expiry_date}.")
"""
    start_idx = mt_doc.script.find("# 4B. Vehicle Statutory Document Expiry Validation on Dispatch")
    end_idx = mt_doc.script.find("# 5. Driver Status Validation")
    if start_idx != -1 and end_idx != -1:
        mt_doc.script = mt_doc.script[:start_idx] + dispatch_check_code + "\n" + mt_doc.script[end_idx:]
        mt_doc.save(ignore_permissions=True)
        print("Updated Section 4B in Mining Trip validations with unavailable mandatory doc enforcement.")

    # -------------------------------------------------------------
    # 5. Update Expiry Monitoring Scripts to respect reminder_intervals
    # -------------------------------------------------------------
    # Update API script and Scheduler Script
    monitoring_scripts = [
        "Fleet Management - Expiry Monitoring & Notifications",
        "Fleet Management - Daily Expiry Monitoring Scheduler"
    ]
    for ms_name in monitoring_scripts:
        if frappe.db.exists("Server Script", ms_name):
            s_doc = frappe.get_doc("Server Script", ms_name)
            # Ensure reminder_intervals is parsed
            if "reminder_intervals" not in s_doc.script:
                target_find = 'recipient_role = frappe.db.get_single_value("Fleet Settings", "notification_recipient_role") or "Fleet Manager"'
                replacement = target_find + '\nintervals_str = frappe.db.get_single_value("Fleet Settings", "reminder_intervals") or "30, 15, 7, 0"\nconfigured_intervals = sorted([int(x.strip()) for x in intervals_str.split(",") if x.strip().isdigit()], reverse=True)'
                s_doc.script = s_doc.script.replace(target_find, replacement)
                s_doc.save(ignore_permissions=True)
                print(f"Updated Server Script '{ms_name}' with dynamic reminder intervals parsing.")

    frappe.clear_cache()
    frappe.db.commit()
    print("=== ROUND 2 ACCEPTANCE CORRECTIONS SUCCESSFULLY APPLIED ===")

if __name__ == "__main__":
    run()

