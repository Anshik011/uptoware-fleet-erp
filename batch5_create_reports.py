def run():
    import frappe

    print("=== CREATING & CONFIGURING ALL 7 BATCH 5 OPERATIONAL EXPENSE REPORTS ===")

    reports = [
        {
            "report_name": "Daily Operational Expense",
            "query": """SELECT
    oe.expense_date AS "Date:Date:110",
    COUNT(oe.name) AS "Expense Count:Int:110",
    ROUND(SUM(IFNULL(oe.amount, 0)), 2) AS "Total Amount:Currency:130",
    ROUND(SUM(CASE WHEN oe.approval_status = 'Approved' THEN IFNULL(oe.amount, 0) ELSE 0 END), 2) AS "Approved Amount:Currency:130",
    ROUND(SUM(IFNULL(oe.posted_amount, 0)), 2) AS "Posted Amount:Currency:130",
    ROUND(SUM(IFNULL(oe.paid_amount, 0)), 2) AS "Paid Amount:Currency:130"
FROM `tabOperational Expense` oe
WHERE (oe.is_test_record = 0 OR oe.is_test_record IS NULL)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR oe.expense_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR oe.expense_date <= %(to_date)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR oe.vehicle = %(vehicle)s)
  AND (%(expense_category)s IS NULL OR %(expense_category)s = '' OR oe.expense_category = %(expense_category)s)
  AND (%(mine_site)s IS NULL OR %(mine_site)s = '' OR oe.mine_site = %(mine_site)s)
  AND (%(approval_status)s IS NULL OR %(approval_status)s = '' OR oe.approval_status = %(approval_status)s)
  AND (%(accounting_status)s IS NULL OR %(accounting_status)s = '' OR oe.accounting_status = %(accounting_status)s)
GROUP BY oe.expense_date
ORDER BY oe.expense_date DESC"""
        },
        {
            "report_name": "Monthly Operational Expense",
            "query": """SELECT
    SUBSTRING(oe.expense_date, 1, 7) AS "Month:Data:110",
    COUNT(oe.name) AS "Expense Count:Int:110",
    ROUND(SUM(IFNULL(oe.amount, 0)), 2) AS "Total Amount:Currency:130",
    ROUND(SUM(CASE WHEN oe.approval_status = 'Approved' THEN IFNULL(oe.amount, 0) ELSE 0 END), 2) AS "Approved Amount:Currency:130",
    ROUND(SUM(IFNULL(oe.posted_amount, 0)), 2) AS "Posted Amount:Currency:130",
    ROUND(SUM(IFNULL(oe.paid_amount, 0)), 2) AS "Paid Amount:Currency:130",
    ROUND(SUM(CASE WHEN oe.approval_status = 'Approved' AND (oe.accounting_status != 'Posted' OR oe.accounting_status IS NULL) THEN IFNULL(oe.amount, 0) ELSE 0 END), 2) AS "Unposted Approved:Currency:150"
FROM `tabOperational Expense` oe
WHERE (oe.is_test_record = 0 OR oe.is_test_record IS NULL)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR oe.expense_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR oe.expense_date <= %(to_date)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR oe.vehicle = %(vehicle)s)
  AND (%(expense_category)s IS NULL OR %(expense_category)s = '' OR oe.expense_category = %(expense_category)s)
  AND (%(mine_site)s IS NULL OR %(mine_site)s = '' OR oe.mine_site = %(mine_site)s)
GROUP BY SUBSTRING(oe.expense_date, 1, 7)
ORDER BY `Month:Data:110` DESC"""
        },
        {
            "report_name": "Vehicle-wise Expense",
            "query": """SELECT
    IFNULL(oe.vehicle, 'General Fleet (No Vehicle)') AS "Vehicle:Data:150",
    COUNT(oe.name) AS "Expense Count:Int:110",
    ROUND(SUM(IFNULL(oe.amount, 0)), 2) AS "Total Amount:Currency:130",
    ROUND(SUM(CASE WHEN oe.approval_status = 'Approved' THEN IFNULL(oe.amount, 0) ELSE 0 END), 2) AS "Approved Amount:Currency:130",
    ROUND(SUM(IFNULL(oe.posted_amount, 0)), 2) AS "Posted Amount:Currency:130",
    ROUND(SUM(IFNULL(oe.paid_amount, 0)), 2) AS "Paid Amount:Currency:130",
    ROUND(AVG(IFNULL(oe.amount, 0)), 2) AS "Avg Expense Amount:Currency:140"
FROM `tabOperational Expense` oe
WHERE (oe.is_test_record = 0 OR oe.is_test_record IS NULL)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR oe.expense_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR oe.expense_date <= %(to_date)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR oe.vehicle = %(vehicle)s)
  AND (%(expense_category)s IS NULL OR %(expense_category)s = '' OR oe.expense_category = %(expense_category)s)
  AND (%(mine_site)s IS NULL OR %(mine_site)s = '' OR oe.mine_site = %(mine_site)s)
GROUP BY oe.vehicle
ORDER BY `Total Amount:Currency:130` DESC"""
        },
        {
            "report_name": "Trip-wise Expense",
            "query": """SELECT
    oe.mining_trip AS "Mining Trip:Link/Mining Trip:140",
    oe.vehicle AS "Vehicle:Link/Vehicle:120",
    oe.driver AS "Driver:Link/Driver:130",
    oe.mine_site AS "Mine Site:Link/Mine Site:140",
    COUNT(oe.name) AS "Expense Count:Int:110",
    ROUND(SUM(IFNULL(oe.amount, 0)), 2) AS "Total Trip Expenses:Currency:140",
    ROUND(SUM(CASE WHEN oe.approval_status = 'Approved' THEN IFNULL(oe.amount, 0) ELSE 0 END), 2) AS "Approved Amount:Currency:130",
    ROUND(SUM(IFNULL(oe.posted_amount, 0)), 2) AS "Posted Amount:Currency:130",
    ROUND(SUM(IFNULL(oe.paid_amount, 0)), 2) AS "Paid Amount:Currency:130"
FROM `tabOperational Expense` oe
WHERE (oe.is_test_record = 0 OR oe.is_test_record IS NULL)
  AND oe.mining_trip IS NOT NULL AND oe.mining_trip != ''
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR oe.expense_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR oe.expense_date <= %(to_date)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR oe.vehicle = %(vehicle)s)
  AND (%(mining_trip)s IS NULL OR %(mining_trip)s = '' OR oe.mining_trip = %(mining_trip)s)
  AND (%(mine_site)s IS NULL OR %(mine_site)s = '' OR oe.mine_site = %(mine_site)s)
GROUP BY oe.mining_trip, oe.vehicle, oe.driver, oe.mine_site
ORDER BY `Total Trip Expenses:Currency:140` DESC"""
        },
        {
            "report_name": "Mine Site-wise Expense",
            "query": """SELECT
    IFNULL(oe.mine_site, 'Unassigned / Non-Site') AS "Mine Site:Data:160",
    COUNT(oe.name) AS "Expense Count:Int:110",
    ROUND(SUM(IFNULL(oe.amount, 0)), 2) AS "Total Amount:Currency:130",
    ROUND(SUM(CASE WHEN oe.approval_status = 'Approved' THEN IFNULL(oe.amount, 0) ELSE 0 END), 2) AS "Approved Amount:Currency:130",
    ROUND(SUM(IFNULL(oe.posted_amount, 0)), 2) AS "Posted Amount:Currency:130",
    ROUND(SUM(IFNULL(oe.paid_amount, 0)), 2) AS "Paid Amount:Currency:130"
FROM `tabOperational Expense` oe
WHERE (oe.is_test_record = 0 OR oe.is_test_record IS NULL)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR oe.expense_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR oe.expense_date <= %(to_date)s)
  AND (%(mine_site)s IS NULL OR %(mine_site)s = '' OR oe.mine_site = %(mine_site)s)
  AND (%(expense_category)s IS NULL OR %(expense_category)s = '' OR oe.expense_category = %(expense_category)s)
GROUP BY oe.mine_site
ORDER BY `Total Amount:Currency:130` DESC"""
        },
        {
            "report_name": "Expense Category Analysis",
            "query": """SELECT
    oe.expense_category AS "Expense Category:Data:180",
    COUNT(oe.name) AS "Count:Int:90",
    ROUND(SUM(IFNULL(oe.amount, 0)), 2) AS "Total Amount:Currency:130",
    ROUND(SUM(CASE WHEN oe.approval_status = 'Approved' THEN IFNULL(oe.amount, 0) ELSE 0 END), 2) AS "Approved Amount:Currency:130",
    ROUND(SUM(IFNULL(oe.posted_amount, 0)), 2) AS "Posted Amount:Currency:130",
    ROUND(SUM(IFNULL(oe.paid_amount, 0)), 2) AS "Paid Amount:Currency:130",
    ROUND(AVG(IFNULL(oe.amount, 0)), 2) AS "Average Amount:Currency:130"
FROM `tabOperational Expense` oe
WHERE (oe.is_test_record = 0 OR oe.is_test_record IS NULL)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR oe.expense_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR oe.expense_date <= %(to_date)s)
  AND (%(expense_category)s IS NULL OR %(expense_category)s = '' OR oe.expense_category = %(expense_category)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR oe.vehicle = %(vehicle)s)
  AND (%(mine_site)s IS NULL OR %(mine_site)s = '' OR oe.mine_site = %(mine_site)s)
GROUP BY oe.expense_category
ORDER BY `Total Amount:Currency:130` DESC"""
        },
        {
            "report_name": "Pending Expense Approvals",
            "query": """SELECT
    oe.name AS "Expense ID:Link/Operational Expense:140",
    oe.expense_date AS "Date:Date:110",
    oe.approval_status AS "Status:Data:100",
    oe.expense_category AS "Category:Data:150",
    oe.amount AS "Amount:Currency:120",
    oe.vehicle AS "Vehicle:Link/Vehicle:120",
    oe.driver AS "Driver:Link/Driver:130",
    oe.mining_trip AS "Trip:Link/Mining Trip:130",
    oe.mine_site AS "Mine Site:Link/Mine Site:140",
    oe.submitted_by AS "Submitted By:Link/User:140",
    oe.submitted_on AS "Submitted On:Datetime:140",
    oe.description AS "Description:Small Text:200"
FROM `tabOperational Expense` oe
WHERE (oe.is_test_record = 0 OR oe.is_test_record IS NULL)
  AND oe.approval_status IN ('Draft', 'Submitted')
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR oe.expense_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR oe.expense_date <= %(to_date)s)
  AND (%(approval_status)s IS NULL OR %(approval_status)s = '' OR oe.approval_status = %(approval_status)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR oe.vehicle = %(vehicle)s)
  AND (%(driver)s IS NULL OR %(driver)s = '' OR oe.driver = %(driver)s)
  AND (%(mine_site)s IS NULL OR %(mine_site)s = '' OR oe.mine_site = %(mine_site)s)
  AND (%(expense_category)s IS NULL OR %(expense_category)s = '' OR oe.expense_category = %(expense_category)s)
ORDER BY oe.expense_date ASC, oe.creation ASC"""
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
                "ref_doctype": "Operational Expense",
                "report_type": "Query Report",
                "is_standard": "No",
                "module": "Fleet Management",
                "query": r_data["query"]
            })
            rep.insert(ignore_permissions=True)
            print(f"Created Query Report: {rep_name}")

    frappe.db.commit()
    print("=== ALL 7 BATCH 5 REPORTS CONFIGURED & IS_TEST_RECORD QUARANTINE APPLIED ===")

run()
