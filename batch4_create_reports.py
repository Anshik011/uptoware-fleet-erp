import frappe

def run():
    print("=== CREATING & CONFIGURING ALL 6 BATCH 4 OPERATIONAL REPORTS ===")

    reports = [
        {
            "report_name": "Vehicle Breakdown Register",
            "query": """SELECT
    vb.name AS "Breakdown ID:Link/Vehicle Breakdown:140",
    vb.breakdown_datetime AS "Breakdown Date:Datetime:140",
    vb.vehicle AS "Vehicle:Link/Vehicle:120",
    vb.driver AS "Driver:Link/Driver:130",
    vb.mine_site AS "Mine Site:Link/Mine Site:140",
    vb.breakdown_type AS "Type:Data:110",
    vb.severity AS "Severity:Data:90",
    vb.repair_status AS "Repair Status:Data:120",
    IFNULL(vb.resolution_type, 'Repaired') AS "Resolution:Data:110",
    vb.assigned_workshop AS "Workshop/Supplier:Link/Supplier:150",
    vb.downtime_hours AS "Downtime (Hrs):Float:120",
    vb.parts_cost AS "Parts Cost:Currency:110",
    vb.labour_cost AS "Labour Cost:Currency:110",
    vb.total_repair_cost AS "Total Cost:Currency:120"
FROM `tabVehicle Breakdown` vb
JOIN `tabVehicle` v ON v.name = vb.vehicle
WHERE (vb.is_test_record = 0 OR vb.is_test_record IS NULL)
  AND (v.is_test_record = 0 OR v.is_test_record IS NULL)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR vb.breakdown_datetime >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR vb.breakdown_datetime <= %(to_date)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR vb.vehicle = %(vehicle)s)
  AND (%(breakdown_type)s IS NULL OR %(breakdown_type)s = '' OR vb.breakdown_type = %(breakdown_type)s)
  AND (%(repair_status)s IS NULL OR %(repair_status)s = '' OR vb.repair_status = %(repair_status)s)
ORDER BY vb.breakdown_datetime DESC"""
        },
        {
            "report_name": "Vehicle Downtime Report",
            "query": """SELECT
    vb.vehicle AS "Vehicle:Link/Vehicle:140",
    COUNT(vb.name) AS "Total Breakdowns:Int:130",
    ROUND(SUM(IFNULL(vb.downtime_hours, 0)), 2) AS "Total Downtime (Hrs):Float:160",
    ROUND(AVG(IFNULL(vb.downtime_hours, 0)), 2) AS "Avg Downtime (Hrs):Float:150",
    ROUND(MAX(IFNULL(vb.downtime_hours, 0)), 2) AS "Max Single Downtime (Hrs):Float:180",
    COUNT(CASE WHEN vb.severity = 'Critical' THEN 1 END) AS "Critical Incidents:Int:130"
FROM `tabVehicle Breakdown` vb
JOIN `tabVehicle` v ON v.name = vb.vehicle
WHERE (vb.is_test_record = 0 OR vb.is_test_record IS NULL)
  AND (v.is_test_record = 0 OR v.is_test_record IS NULL)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR vb.breakdown_datetime >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR vb.breakdown_datetime <= %(to_date)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR vb.vehicle = %(vehicle)s)
  AND (%(breakdown_type)s IS NULL OR %(breakdown_type)s = '' OR vb.breakdown_type = %(breakdown_type)s)
  AND (%(repair_status)s IS NULL OR %(repair_status)s = '' OR vb.repair_status = %(repair_status)s)
GROUP BY vb.vehicle
ORDER BY `Total Downtime (Hrs):Float:160` DESC"""
        },
        {
            "report_name": "Maintenance Cost by Vehicle",
            "query": """SELECT
    vb.vehicle AS "Vehicle:Link/Vehicle:140",
    COUNT(vb.name) AS "Breakdown Count:Int:130",
    ROUND(SUM(IFNULL(vb.parts_cost, 0)), 2) AS "Parts Cost:Currency:130",
    ROUND(SUM(IFNULL(vb.labour_cost, 0)), 2) AS "Labour Cost:Currency:130",
    ROUND(SUM(IFNULL(vb.total_repair_cost, 0)), 2) AS "Total Maintenance Cost:Currency:170",
    ROUND(AVG(IFNULL(vb.total_repair_cost, 0)), 2) AS "Avg Cost per Breakdown:Currency:160"
FROM `tabVehicle Breakdown` vb
JOIN `tabVehicle` v ON v.name = vb.vehicle
WHERE (vb.is_test_record = 0 OR vb.is_test_record IS NULL)
  AND (v.is_test_record = 0 OR v.is_test_record IS NULL)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR vb.breakdown_datetime >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR vb.breakdown_datetime <= %(to_date)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR vb.vehicle = %(vehicle)s)
  AND (%(breakdown_type)s IS NULL OR %(breakdown_type)s = '' OR vb.breakdown_type = %(breakdown_type)s)
  AND (%(repair_status)s IS NULL OR %(repair_status)s = '' OR vb.repair_status = %(repair_status)s)
GROUP BY vb.vehicle
ORDER BY `Total Maintenance Cost:Currency:170` DESC"""
        },
        {
            "report_name": "Breakdown Frequency by Type",
            "query": """SELECT
    vb.breakdown_type AS "Breakdown Type:Data:140",
    COUNT(vb.name) AS "Incident Count:Int:120",
    ROUND(SUM(IFNULL(vb.downtime_hours, 0)), 2) AS "Total Downtime (Hrs):Float:150",
    ROUND(AVG(IFNULL(vb.downtime_hours, 0)), 2) AS "Avg Downtime (Hrs):Float:150",
    ROUND(SUM(IFNULL(vb.total_repair_cost, 0)), 2) AS "Total Repair Cost:Currency:150"
FROM `tabVehicle Breakdown` vb
JOIN `tabVehicle` v ON v.name = vb.vehicle
WHERE (vb.is_test_record = 0 OR vb.is_test_record IS NULL)
  AND (v.is_test_record = 0 OR v.is_test_record IS NULL)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR vb.breakdown_datetime >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR vb.breakdown_datetime <= %(to_date)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR vb.vehicle = %(vehicle)s)
  AND (%(breakdown_type)s IS NULL OR %(breakdown_type)s = '' OR vb.breakdown_type = %(breakdown_type)s)
  AND (%(repair_status)s IS NULL OR %(repair_status)s = '' OR vb.repair_status = %(repair_status)s)
GROUP BY vb.breakdown_type
ORDER BY `Incident Count:Int:120` DESC"""
        },
        {
            "report_name": "Pending Repairs / Awaiting Parts",
            "query": """SELECT
    vb.name AS "Breakdown ID:Link/Vehicle Breakdown:140",
    vb.breakdown_datetime AS "Reported On:Datetime:140",
    vb.vehicle AS "Vehicle:Link/Vehicle:120",
    vb.driver AS "Driver:Link/Driver:130",
    vb.breakdown_type AS "Type:Data:110",
    vb.severity AS "Severity:Data:90",
    vb.repair_status AS "Current Status:Data:120",
    vb.assigned_workshop AS "Assigned Workshop:Link/Supplier:150",
    ROUND(TIMESTAMPDIFF(HOUR, vb.breakdown_datetime, NOW()), 1) AS "Hours Open:Float:110",
    vb.description AS "Problem Summary:Data:220"
FROM `tabVehicle Breakdown` vb
JOIN `tabVehicle` v ON v.name = vb.vehicle
WHERE (vb.is_test_record = 0 OR vb.is_test_record IS NULL)
  AND (v.is_test_record = 0 OR v.is_test_record IS NULL)
  AND vb.repair_status IN ('Reported', 'Approved', 'In Workshop', 'Awaiting Parts')
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR vb.breakdown_datetime >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR vb.breakdown_datetime <= %(to_date)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR vb.vehicle = %(vehicle)s)
  AND (%(breakdown_type)s IS NULL OR %(breakdown_type)s = '' OR vb.breakdown_type = %(breakdown_type)s)
ORDER BY vb.breakdown_datetime ASC"""
        },
        {
            "report_name": "Vehicle Maintenance History",
            "query": """SELECT
    vb.breakdown_datetime AS "Breakdown Date:Datetime:140",
    vb.name AS "Breakdown ID:Link/Vehicle Breakdown:140",
    vb.vehicle AS "Vehicle:Link/Vehicle:120",
    vb.breakdown_type AS "Breakdown Type:Data:120",
    vb.severity AS "Severity:Data:90",
    vb.repair_status AS "Status:Data:100",
    IFNULL(vb.resolution_type, 'Repaired') AS "Resolution:Data:110",
    vb.downtime_hours AS "Downtime (Hrs):Float:110",
    IFNULL((SELECT GROUP_CONCAT(CONCAT(p.item_code, ' (x', p.issued_qty, ')') SEPARATOR ', ') FROM `tabVehicle Breakdown Part` p WHERE p.parent = vb.name AND p.status = 'Issued'), 'None') AS "Parts Consumed:Data:200",
    vb.total_repair_cost AS "Repair Cost:Currency:120",
    vb.assigned_workshop AS "Workshop / Supplier:Link/Supplier:150"
FROM `tabVehicle Breakdown` vb
JOIN `tabVehicle` v ON v.name = vb.vehicle
WHERE (vb.is_test_record = 0 OR vb.is_test_record IS NULL)
  AND (v.is_test_record = 0 OR v.is_test_record IS NULL)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR vb.breakdown_datetime >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR vb.breakdown_datetime <= %(to_date)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR vb.vehicle = %(vehicle)s)
  AND (%(breakdown_type)s IS NULL OR %(breakdown_type)s = '' OR vb.breakdown_type = %(breakdown_type)s)
  AND (%(repair_status)s IS NULL OR %(repair_status)s = '' OR vb.repair_status = %(repair_status)s)
ORDER BY vb.breakdown_datetime DESC"""
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
                "ref_doctype": "Vehicle Breakdown",
                "report_type": "Query Report",
                "is_standard": "No",
                "module": "Fleet Management",
                "query": r_data["query"]
            })
            rep.insert(ignore_permissions=True)
            print(f"Created Query Report: {rep_name}")

    frappe.db.commit()
    print("=== ALL 6 BATCH 4 REPORTS CONFIGURED & IS_TEST_RECORD QUARANTINE APPLIED ===")

run()
