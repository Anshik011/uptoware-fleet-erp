import frappe

def run():
    print("=== BATCH 8: CREATING 7 INSURANCE & RENEWAL QUERY REPORTS ===")

    reports = [
        # 1. Vehicle Insurance Register
        {
            "report_name": "Vehicle Insurance Register",
            "ref_doctype": "Vehicle Insurance Policy",
            "query": """SELECT
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
        WHEN DATEDIFF(v.end_date, CURDATE()) <= 30 THEN 'Expiring Soon'
        ELSE 'Valid'
    END AS "Coverage Status:Data:120",
    COALESCE(vip.premium_amount, 0.0) AS "Annual Premium:Currency:120",
    v.insurance_policy_doc AS "Policy Doc:Attach:110"
FROM `tabVehicle` v
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
            WHEN DATEDIFF(v.end_date, CURDATE()) <= 30 THEN 'Expiring Soon'
            ELSE 'Valid'
        END
  ) = %(status)s)
ORDER BY v.name ASC"""
        },

        # 2. Insurance Expiry Report
        {
            "report_name": "Insurance Expiry Report",
            "ref_doctype": "Vehicle Insurance Policy",
            "query": """SELECT
    vip.name AS "Policy Ref:Link/Vehicle Insurance Policy:140",
    vip.policy_no AS "Policy Number:Data:140",
    vip.vehicle AS "Vehicle:Link/Vehicle:130",
    vip.insurance_company AS "Insurance Company:Data:160",
    vip.policy_type AS "Policy Type:Data:130",
    vip.start_date AS "Start Date:Date:100",
    vip.end_date AS "Expiry Date:Date:100",
    DATEDIFF(vip.end_date, CURDATE()) AS "Days to Expiry:Int:110",
    CASE
        WHEN vip.end_date < CURDATE() THEN 'Expired'
        WHEN DATEDIFF(vip.end_date, CURDATE()) <= fs.warning_window THEN 'Expiring Soon'
        ELSE 'Active'
    END AS "Status:Data:110",
    vip.premium_amount AS "Premium:Currency:110",
    CASE
        WHEN vip.end_date < CURDATE() THEN 'Renew Immediately (Dispatch Blocked)'
        WHEN DATEDIFF(vip.end_date, CURDATE()) <= 7 THEN 'Urgent Renewal Required'
        ELSE 'Initiate Renewal'
    END AS "Action Required:Data:180"
FROM `tabVehicle Insurance Policy` vip
JOIN `tabVehicle` v ON vip.vehicle = v.name
CROSS JOIN (SELECT CAST(COALESCE(MAX(CASE WHEN field = 'warning_window_days' THEN value END), 30) AS UNSIGNED) AS warning_window FROM tabSingles WHERE doctype = 'Fleet Settings') fs
WHERE (vip.is_test_record = 0 OR vip.is_test_record IS NULL)
  AND (v.is_test_record = 0 OR v.is_test_record IS NULL)
  AND vip.policy_status IN ('Active', 'Expired')
  AND (vip.end_date <= DATE_ADD(CURDATE(), INTERVAL fs.warning_window DAY))
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR vip.vehicle = %(vehicle)s)
  AND (%(insurance_company)s IS NULL OR %(insurance_company)s = '' OR vip.insurance_company = %(insurance_company)s)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR vip.end_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR vip.end_date <= %(to_date)s)
ORDER BY vip.end_date ASC"""
        },

        # 3. Vehicle Document Expiry Report
        {
            "report_name": "Vehicle Document Expiry Report",
            "ref_doctype": "Vehicle",
            "query": """SELECT
    v.name AS "Vehicle:Link/Vehicle:130",
    v.make AS "Make:Data:100",
    v.model AS "Model:Data:120",
    CASE
        WHEN v.end_date IS NULL THEN 'Not Recorded'
        WHEN v.end_date < CURDATE() THEN 'Expired'
        WHEN DATEDIFF(v.end_date, CURDATE()) <= fs.warning_window THEN 'Expiring Soon'
        ELSE 'Valid'
    END AS "Insurance Status:Data:120",
    v.end_date AS "Insurance Expiry:Date:100",

    CASE
        WHEN v.fitness_expiry_date IS NULL THEN 'Not Recorded'
        WHEN v.fitness_expiry_date < CURDATE() THEN 'Expired'
        WHEN DATEDIFF(v.fitness_expiry_date, CURDATE()) <= fs.warning_window THEN 'Expiring Soon'
        ELSE 'Valid'
    END AS "Fitness Status:Data:120",
    v.fitness_expiry_date AS "Fitness Expiry:Date:100",

    CASE
        WHEN v.puc_expiry_date IS NULL THEN 'Not Recorded'
        WHEN v.puc_expiry_date < CURDATE() THEN 'Expired'
        WHEN DATEDIFF(v.puc_expiry_date, CURDATE()) <= fs.warning_window THEN 'Expiring Soon'
        ELSE 'Valid'
    END AS "PUC Status:Data:120",
    v.puc_expiry_date AS "PUC Expiry:Date:100",

    CASE
        WHEN v.road_tax_expiry_date IS NULL THEN 'Not Recorded'
        WHEN v.road_tax_expiry_date < CURDATE() THEN 'Expired'
        WHEN DATEDIFF(v.road_tax_expiry_date, CURDATE()) <= fs.warning_window THEN 'Expiring Soon'
        ELSE 'Valid'
    END AS "Road Tax Status:Data:120",
    v.road_tax_expiry_date AS "Road Tax Expiry:Date:100",

    CASE
        WHEN v.permit_expiry_date IS NULL THEN 'Not Recorded'
        WHEN v.permit_expiry_date < CURDATE() THEN 'Expired'
        WHEN DATEDIFF(v.permit_expiry_date, CURDATE()) <= fs.warning_window THEN 'Expiring Soon'
        ELSE 'Valid'
    END AS "Permit Status:Data:120",
    v.permit_expiry_date AS "Permit Expiry:Date:100",

    CASE
        WHEN (v.end_date < CURDATE() OR v.fitness_expiry_date < CURDATE() OR v.puc_expiry_date < CURDATE() OR v.road_tax_expiry_date < CURDATE() OR v.permit_expiry_date < CURDATE())
            THEN 'Non-Compliant (Expired Documents)'
        WHEN (DATEDIFF(v.end_date, CURDATE()) <= fs.warning_window OR DATEDIFF(v.fitness_expiry_date, CURDATE()) <= fs.warning_window OR DATEDIFF(v.puc_expiry_date, CURDATE()) <= fs.warning_window OR DATEDIFF(v.road_tax_expiry_date, CURDATE()) <= fs.warning_window OR DATEDIFF(v.permit_expiry_date, CURDATE()) <= fs.warning_window)
            THEN 'Attention Needed (Expiring Soon)'
        WHEN (v.end_date IS NOT NULL AND v.fitness_expiry_date IS NOT NULL)
            THEN 'Fully Compliant'
        ELSE 'Incomplete Documentation'
    END AS "Overall Compliance:Data:160"
FROM `tabVehicle` v
CROSS JOIN (SELECT CAST(COALESCE(MAX(CASE WHEN field = 'warning_window_days' THEN value END), 30) AS UNSIGNED) AS warning_window FROM tabSingles WHERE doctype = 'Fleet Settings') fs
WHERE (v.is_test_record = 0 OR v.is_test_record IS NULL)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR v.name = %(vehicle)s)
ORDER BY v.name ASC"""
        },

        # 4. Upcoming Renewals
        {
            "report_name": "Upcoming Renewals",
            "ref_doctype": "Vehicle",
            "query": """SELECT * FROM (
    SELECT
        v.name AS "Vehicle:Link/Vehicle:130",
        'Insurance' AS "Document Type:Data:130",
        COALESCE(v.policy_no, '-') AS "Reference No:Data:140",
        v.end_date AS "Expiry Date:Date:100",
        DATEDIFF(v.end_date, CURDATE()) AS "Days Remaining:Int:110",
        CASE
            WHEN DATEDIFF(v.end_date, CURDATE()) <= 7 THEN 'Critical (<= 7 Days)'
            WHEN DATEDIFF(v.end_date, CURDATE()) <= 15 THEN 'High (<= 15 Days)'
            ELSE 'Expiring Within Warning Window'
        END AS "Urgency:Data:130",
        'Renew Insurance Policy' AS "Action Required:Data:160",
        v.is_test_record
    FROM `tabVehicle` v
    CROSS JOIN (SELECT CAST(COALESCE(MAX(CASE WHEN field = 'warning_window_days' THEN value END), 30) AS UNSIGNED) AS warning_window FROM tabSingles WHERE doctype = 'Fleet Settings') fs
    WHERE v.end_date IS NOT NULL AND v.end_date >= CURDATE() AND v.end_date <= DATE_ADD(CURDATE(), INTERVAL fs.warning_window DAY)

    UNION ALL

    SELECT
        v.name AS "Vehicle:Link/Vehicle:130",
        'Fitness Certificate' AS "Document Type:Data:130",
        'FC' AS "Reference No:Data:140",
        v.fitness_expiry_date AS "Expiry Date:Date:100",
        DATEDIFF(v.fitness_expiry_date, CURDATE()) AS "Days Remaining:Int:110",
        CASE
            WHEN DATEDIFF(v.fitness_expiry_date, CURDATE()) <= 7 THEN 'Critical (<= 7 Days)'
            WHEN DATEDIFF(v.fitness_expiry_date, CURDATE()) <= 15 THEN 'High (<= 15 Days)'
            ELSE 'Expiring Within Warning Window'
        END AS "Urgency:Data:130",
        'Renew Fitness Certificate' AS "Action Required:Data:160",
        v.is_test_record
    FROM `tabVehicle` v
    CROSS JOIN (SELECT CAST(COALESCE(MAX(CASE WHEN field = 'warning_window_days' THEN value END), 30) AS UNSIGNED) AS warning_window FROM tabSingles WHERE doctype = 'Fleet Settings') fs
    WHERE v.fitness_expiry_date IS NOT NULL AND v.fitness_expiry_date >= CURDATE() AND v.fitness_expiry_date <= DATE_ADD(CURDATE(), INTERVAL fs.warning_window DAY)

    UNION ALL

    SELECT
        v.name AS "Vehicle:Link/Vehicle:130",
        'PUC Certificate' AS "Document Type:Data:130",
        'PUC' AS "Reference No:Data:140",
        v.puc_expiry_date AS "Expiry Date:Date:100",
        DATEDIFF(v.puc_expiry_date, CURDATE()) AS "Days Remaining:Int:110",
        CASE
            WHEN DATEDIFF(v.puc_expiry_date, CURDATE()) <= 7 THEN 'Critical (<= 7 Days)'
            WHEN DATEDIFF(v.puc_expiry_date, CURDATE()) <= 15 THEN 'High (<= 15 Days)'
            ELSE 'Expiring Within Warning Window'
        END AS "Urgency:Data:130",
        'Renew Pollution Certificate' AS "Action Required:Data:160",
        v.is_test_record
    FROM `tabVehicle` v
    CROSS JOIN (SELECT CAST(COALESCE(MAX(CASE WHEN field = 'warning_window_days' THEN value END), 30) AS UNSIGNED) AS warning_window FROM tabSingles WHERE doctype = 'Fleet Settings') fs
    WHERE v.puc_expiry_date IS NOT NULL AND v.puc_expiry_date >= CURDATE() AND v.puc_expiry_date <= DATE_ADD(CURDATE(), INTERVAL fs.warning_window DAY)

    UNION ALL

    SELECT
        v.name AS "Vehicle:Link/Vehicle:130",
        'Road Tax' AS "Document Type:Data:130",
        'TAX' AS "Reference No:Data:140",
        v.road_tax_expiry_date AS "Expiry Date:Date:100",
        DATEDIFF(v.road_tax_expiry_date, CURDATE()) AS "Days Remaining:Int:110",
        CASE
            WHEN DATEDIFF(v.road_tax_expiry_date, CURDATE()) <= 7 THEN 'Critical (<= 7 Days)'
            WHEN DATEDIFF(v.road_tax_expiry_date, CURDATE()) <= 15 THEN 'High (<= 15 Days)'
            ELSE 'Expiring Within Warning Window'
        END AS "Urgency:Data:130",
        'Pay Road Tax' AS "Action Required:Data:160",
        v.is_test_record
    FROM `tabVehicle` v
    CROSS JOIN (SELECT CAST(COALESCE(MAX(CASE WHEN field = 'warning_window_days' THEN value END), 30) AS UNSIGNED) AS warning_window FROM tabSingles WHERE doctype = 'Fleet Settings') fs
    WHERE v.road_tax_expiry_date IS NOT NULL AND v.road_tax_expiry_date >= CURDATE() AND v.road_tax_expiry_date <= DATE_ADD(CURDATE(), INTERVAL fs.warning_window DAY)

    UNION ALL

    SELECT
        v.name AS "Vehicle:Link/Vehicle:130",
        'Goods Permit' AS "Document Type:Data:130",
        'PERMIT' AS "Reference No:Data:140",
        v.permit_expiry_date AS "Expiry Date:Date:100",
        DATEDIFF(v.permit_expiry_date, CURDATE()) AS "Days Remaining:Int:110",
        CASE
            WHEN DATEDIFF(v.permit_expiry_date, CURDATE()) <= 7 THEN 'Critical (<= 7 Days)'
            WHEN DATEDIFF(v.permit_expiry_date, CURDATE()) <= 15 THEN 'High (<= 15 Days)'
            ELSE 'Expiring Within Warning Window'
        END AS "Urgency:Data:130",
        'Renew Goods Permit' AS "Action Required:Data:160",
        v.is_test_record
    FROM `tabVehicle` v
    CROSS JOIN (SELECT CAST(COALESCE(MAX(CASE WHEN field = 'warning_window_days' THEN value END), 30) AS UNSIGNED) AS warning_window FROM tabSingles WHERE doctype = 'Fleet Settings') fs
    WHERE v.permit_expiry_date IS NOT NULL AND v.permit_expiry_date >= CURDATE() AND v.permit_expiry_date <= DATE_ADD(CURDATE(), INTERVAL fs.warning_window DAY)
) upcoming
WHERE (upcoming.is_test_record = 0 OR upcoming.is_test_record IS NULL)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR upcoming.`Vehicle:Link/Vehicle:130` = %(vehicle)s)
  AND (%(document_type)s IS NULL OR %(document_type)s = '' OR upcoming.`Document Type:Data:130` = %(document_type)s)
ORDER BY upcoming.`Expiry Date:Date:100` ASC"""
        },

        # 5. Expired Insurance & Documents
        {
            "report_name": "Expired Insurance & Documents",
            "ref_doctype": "Vehicle",
            "query": """SELECT * FROM (
    SELECT
        v.name AS "Vehicle:Link/Vehicle:130",
        v.vehicle_status AS "Vehicle Status:Data:110",
        'Insurance' AS "Document Type:Data:130",
        COALESCE(v.policy_no, '-') AS "Reference No:Data:140",
        v.end_date AS "Expiry Date:Date:100",
        DATEDIFF(CURDATE(), v.end_date) AS "Days Overdue:Int:100",
        CASE WHEN v.insurance_policy_doc IS NOT NULL AND v.insurance_policy_doc != '' THEN 'Yes' ELSE 'No' END AS "Attachment Present:Data:130",
        'BLOCKED FROM DISPATCH' AS "Dispatch Impact:Data:160",
        v.is_test_record
    FROM `tabVehicle` v
    WHERE v.end_date IS NOT NULL AND v.end_date < CURDATE()

    UNION ALL

    SELECT
        v.name AS "Vehicle:Link/Vehicle:130",
        v.vehicle_status AS "Vehicle Status:Data:110",
        'Fitness Certificate' AS "Document Type:Data:130",
        'FC' AS "Reference No:Data:140",
        v.fitness_expiry_date AS "Expiry Date:Date:100",
        DATEDIFF(CURDATE(), v.fitness_expiry_date) AS "Days Overdue:Int:100",
        CASE WHEN v.fitness_doc IS NOT NULL AND v.fitness_doc != '' THEN 'Yes' ELSE 'No' END AS "Attachment Present:Data:130",
        'BLOCKED FROM DISPATCH' AS "Dispatch Impact:Data:160",
        v.is_test_record
    FROM `tabVehicle` v
    WHERE v.fitness_expiry_date IS NOT NULL AND v.fitness_expiry_date < CURDATE()

    UNION ALL

    SELECT
        v.name AS "Vehicle:Link/Vehicle:130",
        v.vehicle_status AS "Vehicle Status:Data:110",
        'PUC Certificate' AS "Document Type:Data:130",
        'PUC' AS "Reference No:Data:140",
        v.puc_expiry_date AS "Expiry Date:Date:100",
        DATEDIFF(CURDATE(), v.puc_expiry_date) AS "Days Overdue:Int:100",
        CASE WHEN v.puc_doc IS NOT NULL AND v.puc_doc != '' THEN 'Yes' ELSE 'No' END AS "Attachment Present:Data:130",
        'Dispatch Restricted' AS "Dispatch Impact:Data:160",
        v.is_test_record
    FROM `tabVehicle` v
    WHERE v.puc_expiry_date IS NOT NULL AND v.puc_expiry_date < CURDATE()

    UNION ALL

    SELECT
        v.name AS "Vehicle:Link/Vehicle:130",
        v.vehicle_status AS "Vehicle Status:Data:110",
        'Road Tax' AS "Document Type:Data:130",
        'TAX' AS "Reference No:Data:140",
        v.road_tax_expiry_date AS "Expiry Date:Date:100",
        DATEDIFF(CURDATE(), v.road_tax_expiry_date) AS "Days Overdue:Int:100",
        CASE WHEN v.road_tax_doc IS NOT NULL AND v.road_tax_doc != '' THEN 'Yes' ELSE 'No' END AS "Attachment Present:Data:130",
        'Dispatch Restricted' AS "Dispatch Impact:Data:160",
        v.is_test_record
    FROM `tabVehicle` v
    WHERE v.road_tax_expiry_date IS NOT NULL AND v.road_tax_expiry_date < CURDATE()

    UNION ALL

    SELECT
        v.name AS "Vehicle:Link/Vehicle:130",
        v.vehicle_status AS "Vehicle Status:Data:110",
        'Goods Permit' AS "Document Type:Data:130",
        'PERMIT' AS "Reference No:Data:140",
        v.permit_expiry_date AS "Expiry Date:Date:100",
        DATEDIFF(CURDATE(), v.permit_expiry_date) AS "Days Overdue:Int:100",
        CASE WHEN v.permit_doc IS NOT NULL AND v.permit_doc != '' THEN 'Yes' ELSE 'No' END AS "Attachment Present:Data:130",
        'Dispatch Restricted' AS "Dispatch Impact:Data:160",
        v.is_test_record
    FROM `tabVehicle` v
    WHERE v.permit_expiry_date IS NOT NULL AND v.permit_expiry_date < CURDATE()
) expired_docs
WHERE (expired_docs.is_test_record = 0 OR expired_docs.is_test_record IS NULL)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR expired_docs.`Vehicle:Link/Vehicle:130` = %(vehicle)s)
  AND (%(document_type)s IS NULL OR %(document_type)s = '' OR expired_docs.`Document Type:Data:130` = %(document_type)s)
ORDER BY expired_docs.`Days Overdue:Int:100` DESC"""
        },

        # 6. Insurance Premium by Vehicle
        {
            "report_name": "Insurance Premium by Vehicle",
            "ref_doctype": "Vehicle Insurance Policy",
            "query": """SELECT
    v.name AS "Vehicle:Link/Vehicle:130",
    v.make AS "Make:Data:100",
    v.model AS "Model:Data:120",
    COUNT(vip.name) AS "Total Policies:Int:100",
    COALESCE(SUM(CASE WHEN vip.policy_status = 'Active' THEN vip.premium_amount ELSE 0 END), 0.0) AS "Current Annual Premium:Currency:140",
    COALESCE(SUM(vip.premium_amount), 0.0) AS "Historical Premium Total:Currency:140",
    COALESCE(MAX(CASE WHEN vip.policy_status = 'Active' THEN vip.policy_no ELSE NULL END), v.policy_no, '-') AS "Active Policy No:Data:140",
    COALESCE(MAX(CASE WHEN vip.policy_status = 'Active' THEN vip.insurance_company ELSE NULL END), v.insurance_company, '-') AS "Insurer:Data:160"
FROM `tabVehicle` v
LEFT JOIN `tabVehicle Insurance Policy` vip ON vip.vehicle = v.name 
    AND (vip.is_test_record = 0 OR vip.is_test_record IS NULL)
WHERE (v.is_test_record = 0 OR v.is_test_record IS NULL)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR v.name = %(vehicle)s)
GROUP BY v.name, v.make, v.model, v.policy_no, v.insurance_company
ORDER BY `Historical Premium Total:Currency:140` DESC"""
        },

        # 7. Insurance Renewal History
        {
            "report_name": "Insurance Renewal History",
            "ref_doctype": "Vehicle Insurance Policy",
            "query": """SELECT
    vip.name AS "Policy Ref:Link/Vehicle Insurance Policy:140",
    vip.policy_no AS "Policy Number:Data:140",
    vip.vehicle AS "Vehicle:Link/Vehicle:130",
    vip.policy_type AS "Policy Type:Data:130",
    vip.insurance_company AS "Insurance Company:Data:160",
    vip.start_date AS "Start Date:Date:100",
    vip.end_date AS "Expiry Date:Date:100",
    vip.premium_amount AS "Premium Amount:Currency:120",
    vip.policy_status AS "Status:Data:100",
    CASE WHEN vip.is_renewal = 1 THEN 'Yes' ELSE 'No' END AS "Is Renewal:Data:90",
    COALESCE(vip.previous_policy, '-') AS "Previous Policy:Link/Vehicle Insurance Policy:140",
    COALESCE(vip.approved_by, '-') AS "Approved By:Link/User:130",
    vip.approved_on AS "Approved On:Datetime:140",
    COALESCE(vip.remarks, '-') AS "Remarks:Data:180"
FROM `tabVehicle Insurance Policy` vip
JOIN `tabVehicle` v ON vip.vehicle = v.name
WHERE (vip.is_test_record = 0 OR vip.is_test_record IS NULL)
  AND (v.is_test_record = 0 OR v.is_test_record IS NULL)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR vip.vehicle = %(vehicle)s)
  AND (%(policy_status)s IS NULL OR %(policy_status)s = '' OR vip.policy_status = %(policy_status)s)
  AND (%(is_renewal)s IS NULL OR %(is_renewal)s = '' OR (CASE WHEN vip.is_renewal = 1 THEN 'Yes' ELSE 'No' END) = %(is_renewal)s)
ORDER BY vip.vehicle ASC, vip.start_date DESC"""
        }
    ]

    for r_data in reports:
        rep_name = r_data["report_name"]
        if frappe.db.exists("Report", rep_name):
            rep = frappe.get_doc("Report", rep_name)
            rep.query = r_data["query"]
            rep.disabled = 0
            rep.save(ignore_permissions=True)
            print(f"Updated Query Report: {rep_name}")
        else:
            rep = frappe.get_doc({
                "doctype": "Report",
                "report_name": rep_name,
                "ref_doctype": r_data["ref_doctype"],
                "report_type": "Query Report",
                "is_standard": "No",
                "module": "Fleet Management",
                "query": r_data["query"]
            })
            rep.insert(ignore_permissions=True)
            print(f"Created Query Report: {rep_name}")

    frappe.clear_cache()
    frappe.db.commit()
    print("=== ALL 7 BATCH 8 REPORTS CREATED & CONFIGURED SUCCESSFULLY ===")

if __name__ == "__main__":
    run()
