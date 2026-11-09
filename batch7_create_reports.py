import frappe

def create_reports():
    import frappe
    print("=== CONFIGURING BATCH 7 QUERY REPORTS ===")

    reports = [
        # 1. Supplier Register
        {
            "report_name": "Supplier Register",
            "ref_doctype": "Supplier",
            "query": """SELECT
    s.name AS "Supplier:Link/Supplier:160",
    s.supplier_name AS "Supplier Name:Data:180",
    s.supplier_group AS "Supplier Group:Link/Supplier Group:140",
    s.supplier_type AS "Type:Data:100",
    CASE WHEN s.custom_is_preferred_supplier = 1 THEN 'Yes' ELSE 'No' END AS "Preferred:Data:80",
    COALESCE(s.tax_id, '-') AS "GSTIN / Tax ID:Data:140",
    COALESCE(s.custom_pan, '-') AS "PAN:Data:110",
    CASE WHEN s.disabled = 1 THEN 'Disabled' ELSE 'Active' END AS "Status:Data:90",
    s.creation AS "Created On:Date:100"
FROM `tabSupplier` s
WHERE (s.custom_is_test_record = 0 OR s.custom_is_test_record IS NULL)
  AND (%(supplier_group)s IS NULL OR %(supplier_group)s = '' OR s.supplier_group = %(supplier_group)s)
  AND (%(supplier)s IS NULL OR %(supplier)s = '' OR s.name = %(supplier)s)
  AND (%(disabled)s IS NULL OR %(disabled)s = '' OR s.disabled = %(disabled)s)
ORDER BY s.supplier_name ASC"""
        },

        # 2. Supplier-wise Purchase Summary
        {
            "report_name": "Supplier-wise Purchase Summary",
            "ref_doctype": "Purchase Order",
            "query": """SELECT
    po.supplier AS "Supplier:Link/Supplier:160",
    po.supplier_name AS "Supplier Name:Data:180",
    s.supplier_group AS "Group:Link/Supplier Group:130",
    COUNT(DISTINCT po.name) AS "Total Orders:Int:90",
    ROUND(SUM(po.base_grand_total), 2) AS "Total Ordered Amount:Currency:140",
    ROUND(COALESCE(inv.total_billed, 0), 2) AS "Total Billed Amount:Currency:140",
    ROUND(COALESCE(inv.total_paid, 0), 2) AS "Total Paid Amount:Currency:140",
    ROUND(COALESCE(inv.total_outstanding, 0), 2) AS "Total Outstanding:Currency:140"
FROM `tabPurchase Order` po
JOIN `tabSupplier` s ON po.supplier = s.name
LEFT JOIN (
    SELECT
        supplier,
        SUM(base_grand_total) AS total_billed,
        SUM(paid_amount) AS total_paid,
        SUM(outstanding_amount) AS total_outstanding
    FROM `tabPurchase Invoice`
    WHERE docstatus = 1
      AND (custom_is_test_record = 0 OR custom_is_test_record IS NULL)
    GROUP BY supplier
) inv ON po.supplier = inv.supplier
WHERE po.docstatus = 1
  AND (po.custom_is_test_record = 0 OR po.custom_is_test_record IS NULL)
  AND (s.custom_is_test_record = 0 OR s.custom_is_test_record IS NULL)
  AND (%(company)s IS NULL OR %(company)s = '' OR po.company = %(company)s)
  AND (%(supplier)s IS NULL OR %(supplier)s = '' OR po.supplier = %(supplier)s)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR po.transaction_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR po.transaction_date <= %(to_date)s)
GROUP BY po.supplier, po.supplier_name, s.supplier_group
ORDER BY `Total Ordered Amount:Currency:140` DESC"""
        },

        # 3. Purchase Order Register
        {
            "report_name": "Purchase Order Register",
            "ref_doctype": "Purchase Order",
            "query": """SELECT
    po.name AS "Purchase Order:Link/Purchase Order:140",
    po.transaction_date AS "Date:Date:100",
    po.supplier AS "Supplier:Link/Supplier:150",
    po.supplier_name AS "Supplier Name:Data:160",
    COALESCE(po.custom_procurement_type, 'General Fleet Operations') AS "Procurement Type:Data:150",
    COALESCE(po.custom_vehicle, '-') AS "Vehicle:Link/Vehicle:120",
    COALESCE(po.custom_vehicle_breakdown, '-') AS "Breakdown:Link/Vehicle Breakdown:140",
    COALESCE(po.custom_mine_site, '-') AS "Mine Site:Link/Mine Site:140",
    po.status AS "Status:Data:110",
    ROUND(po.total_qty, 2) AS "Total Qty:Float:90",
    ROUND(po.base_grand_total, 2) AS "Grand Total:Currency:120",
    COALESCE(po.custom_approved_by, '-') AS "Approved By:Data:130",
    po.custom_approved_on AS "Approved On:Datetime:140"
FROM `tabPurchase Order` po
LEFT JOIN `tabVehicle` v ON po.custom_vehicle = v.name
LEFT JOIN `tabVehicle Breakdown` vb ON po.custom_vehicle_breakdown = vb.name
LEFT JOIN `tabMine Site` ms ON po.custom_mine_site = ms.name
WHERE po.docstatus = 1
  AND (po.custom_is_test_record = 0 OR po.custom_is_test_record IS NULL)
  AND (v.is_test_record = 0 OR v.is_test_record IS NULL)
  AND (vb.is_test_record = 0 OR vb.is_test_record IS NULL)
  AND (ms.is_test_record = 0 OR ms.is_test_record IS NULL)
  AND (%(company)s IS NULL OR %(company)s = '' OR po.company = %(company)s)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR po.transaction_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR po.transaction_date <= %(to_date)s)
  AND (%(supplier)s IS NULL OR %(supplier)s = '' OR po.supplier = %(supplier)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR po.custom_vehicle = %(vehicle)s)
  AND (%(procurement_type)s IS NULL OR %(procurement_type)s = '' OR po.custom_procurement_type = %(procurement_type)s)
  AND (%(status)s IS NULL OR %(status)s = '' OR po.status = %(status)s)
ORDER BY po.transaction_date DESC, po.creation DESC"""
        },

        # 4. Pending Purchase Orders
        {
            "report_name": "Pending Purchase Orders",
            "ref_doctype": "Purchase Order",
            "query": """SELECT
    po.name AS "Purchase Order:Link/Purchase Order:140",
    po.transaction_date AS "Date:Date:100",
    po.supplier AS "Supplier:Link/Supplier:150",
    COALESCE(po.custom_procurement_type, 'General Fleet Operations') AS "Procurement Type:Data:150",
    COALESCE(po.custom_vehicle, '-') AS "Vehicle:Link/Vehicle:120",
    COALESCE(po.custom_vehicle_breakdown, '-') AS "Breakdown:Link/Vehicle Breakdown:140",
    po.status AS "Status:Data:130",
    ROUND(po.total_qty, 2) AS "Total Qty:Float:90",
    ROUND(po.base_grand_total, 2) AS "Grand Total:Currency:120",
    ROUND(po.per_received, 1) AS "Received Pct:Percent:100",
    ROUND(po.per_billed, 1) AS "Billed Pct:Percent:100"
FROM `tabPurchase Order` po
WHERE po.docstatus = 1
  AND po.status IN ('To Receive and Bill', 'To Receive', 'To Bill')
  AND (po.custom_is_test_record = 0 OR po.custom_is_test_record IS NULL)
  AND (%(company)s IS NULL OR %(company)s = '' OR po.company = %(company)s)
  AND (%(supplier)s IS NULL OR %(supplier)s = '' OR po.supplier = %(supplier)s)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR po.transaction_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR po.transaction_date <= %(to_date)s)
ORDER BY po.transaction_date DESC"""
        },

        # 5. Purchase Receipt Register
        {
            "report_name": "Purchase Receipt Register",
            "ref_doctype": "Purchase Receipt",
            "query": """SELECT
    pr.name AS "Purchase Receipt:Link/Purchase Receipt:140",
    pr.posting_date AS "Date:Date:100",
    pr.posting_time AS "Time:Time:90",
    pr.supplier AS "Supplier:Link/Supplier:150",
    COALESCE(pri.purchase_order, '-') AS "Purchase Order:Link/Purchase Order:140",
    pri.warehouse AS "Warehouse:Link/Warehouse:140",
    COALESCE(pr.custom_procurement_type, 'General Fleet Operations') AS "Procurement Type:Data:150",
    COALESCE(pr.custom_vehicle, '-') AS "Vehicle:Link/Vehicle:120",
    COALESCE(pr.custom_vehicle_breakdown, '-') AS "Breakdown:Link/Vehicle Breakdown:140",
    pr.status AS "Status:Data:110",
    ROUND(pr.total_qty, 2) AS "Total Qty:Float:90",
    ROUND(pr.base_grand_total, 2) AS "Grand Total:Currency:120"
FROM `tabPurchase Receipt` pr
LEFT JOIN (
    SELECT parent, MIN(purchase_order) AS purchase_order, MIN(warehouse) AS warehouse
    FROM `tabPurchase Receipt Item`
    GROUP BY parent
) pri ON pr.name = pri.parent
WHERE pr.docstatus = 1
  AND (pr.custom_is_test_record = 0 OR pr.custom_is_test_record IS NULL)
  AND (%(company)s IS NULL OR %(company)s = '' OR pr.company = %(company)s)
  AND (%(supplier)s IS NULL OR %(supplier)s = '' OR pr.supplier = %(supplier)s)
  AND (%(warehouse)s IS NULL OR %(warehouse)s = '' OR pri.warehouse = %(warehouse)s)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR pr.posting_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR pr.posting_date <= %(to_date)s)
ORDER BY pr.posting_date DESC, pr.posting_time DESC"""
        },

        # 6. Purchase Invoice Register
        {
            "report_name": "Purchase Invoice Register",
            "ref_doctype": "Purchase Invoice",
            "query": """SELECT
    pi.name AS "Purchase Invoice:Link/Purchase Invoice:140",
    pi.posting_date AS "Posting Date:Date:100",
    pi.supplier AS "Supplier:Link/Supplier:150",
    COALESCE(pi.bill_no, '-') AS "Supplier Invoice No:Data:130",
    pi.bill_date AS "Bill Date:Date:100",
    COALESCE(pi.custom_procurement_type, 'General Fleet Operations') AS "Procurement Type:Data:150",
    COALESCE(pi.custom_vehicle, '-') AS "Vehicle:Link/Vehicle:120",
    COALESCE(pi.custom_vehicle_breakdown, '-') AS "Breakdown:Link/Vehicle Breakdown:140",
    pi.status AS "Status:Data:100",
    ROUND(pi.base_grand_total, 2) AS "Invoice Amount:Currency:120",
    ROUND(pi.paid_amount, 2) AS "Paid Amount:Currency:110",
    ROUND(pi.outstanding_amount, 2) AS "Outstanding Amount:Currency:120",
    pi.due_date AS "Due Date:Date:100"
FROM `tabPurchase Invoice` pi
WHERE pi.docstatus = 1
  AND (pi.custom_is_test_record = 0 OR pi.custom_is_test_record IS NULL)
  AND (%(company)s IS NULL OR %(company)s = '' OR pi.company = %(company)s)
  AND (%(supplier)s IS NULL OR %(supplier)s = '' OR pi.supplier = %(supplier)s)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR pi.posting_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR pi.posting_date <= %(to_date)s)
  AND (%(status)s IS NULL OR %(status)s = '' OR pi.status = %(status)s)
ORDER BY pi.posting_date DESC, pi.creation DESC"""
        },

        # 7. Supplier Outstanding / Payables
        {
            "report_name": "Supplier Outstanding / Payables",
            "ref_doctype": "Purchase Invoice",
            "query": """SELECT
    pi.supplier AS "Supplier:Link/Supplier:160",
    pi.supplier_name AS "Supplier Name:Data:180",
    COUNT(pi.name) AS "Unpaid Invoices:Int:110",
    ROUND(SUM(pi.base_grand_total), 2) AS "Total Invoiced:Currency:130",
    ROUND(SUM(pi.paid_amount), 2) AS "Total Settled:Currency:120",
    ROUND(SUM(pi.outstanding_amount), 2) AS "Net Outstanding:Currency:140"
FROM `tabPurchase Invoice` pi
WHERE pi.docstatus = 1
  AND pi.outstanding_amount > 0
  AND (pi.custom_is_test_record = 0 OR pi.custom_is_test_record IS NULL)
  AND (%(company)s IS NULL OR %(company)s = '' OR pi.company = %(company)s)
  AND (%(supplier)s IS NULL OR %(supplier)s = '' OR pi.supplier = %(supplier)s)
GROUP BY pi.supplier, pi.supplier_name
ORDER BY `Net Outstanding:Currency:140` DESC"""
        },

        # 9. Purchase by Vehicle / Breakdown / Mine Site
        {
            "report_name": "Purchase by Vehicle / Breakdown / Mine Site",
            "ref_doctype": "Purchase Order",
            "query": """SELECT
    COALESCE(po.custom_vehicle, 'General Fleet') AS "Vehicle:Data:140",
    COALESCE(po.custom_vehicle_breakdown, '-') AS "Breakdown:Data:150",
    COALESCE(po.custom_mine_site, '-') AS "Mine Site:Data:150",
    COALESCE(po.custom_procurement_type, 'General Fleet Operations') AS "Procurement Type:Data:160",
    COUNT(DISTINCT po.name) AS "Orders:Int:80",
    ROUND(SUM(po.base_grand_total), 2) AS "Total Purchase Cost:Currency:140",
    ROUND(COALESCE(inv.total_billed, 0), 2) AS "Billed Amount:Currency:130",
    ROUND(COALESCE(inv.total_paid, 0), 2) AS "Paid Amount:Currency:120"
FROM `tabPurchase Order` po
LEFT JOIN (
    SELECT
        custom_vehicle,
        custom_vehicle_breakdown,
        SUM(base_grand_total) AS total_billed,
        SUM(paid_amount) AS total_paid
    FROM `tabPurchase Invoice`
    WHERE docstatus = 1
      AND (custom_is_test_record = 0 OR custom_is_test_record IS NULL)
    GROUP BY custom_vehicle, custom_vehicle_breakdown
) inv ON COALESCE(po.custom_vehicle, '') = COALESCE(inv.custom_vehicle, '')
      AND COALESCE(po.custom_vehicle_breakdown, '') = COALESCE(inv.custom_vehicle_breakdown, '')
WHERE po.docstatus = 1
  AND (po.custom_is_test_record = 0 OR po.custom_is_test_record IS NULL)
  AND (%(company)s IS NULL OR %(company)s = '' OR po.company = %(company)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR po.custom_vehicle = %(vehicle)s)
  AND (%(mine_site)s IS NULL OR %(mine_site)s = '' OR po.custom_mine_site = %(mine_site)s)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR po.transaction_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR po.transaction_date <= %(to_date)s)
GROUP BY po.custom_vehicle, po.custom_vehicle_breakdown, po.custom_mine_site, po.custom_procurement_type
ORDER BY `Total Purchase Cost:Currency:140` DESC"""
        },

        # 10. Purchase Analysis by Month
        {
            "report_name": "Purchase Analysis by Month",
            "ref_doctype": "Purchase Order",
            "query": """SELECT
    DATE_FORMAT(po.transaction_date, '%%Y-%%m') AS "Month:Data:100",
    COALESCE(po.custom_procurement_type, 'General Fleet Operations') AS "Procurement Type:Data:160",
    COUNT(po.name) AS "PO Count:Int:90",
    ROUND(SUM(po.base_grand_total), 2) AS "Total Amount:Currency:130",
    ROUND(SUM(CASE WHEN po.custom_procurement_type = 'Spare Parts Replenishment' THEN po.base_grand_total ELSE 0 END), 2) AS "Spare Parts Cost:Currency:130",
    ROUND(SUM(CASE WHEN po.custom_procurement_type = 'Vehicle Breakdown' THEN po.base_grand_total ELSE 0 END), 2) AS "Breakdown Cost:Currency:130",
    ROUND(SUM(CASE WHEN po.custom_procurement_type NOT IN ('Spare Parts Replenishment', 'Vehicle Breakdown') THEN po.base_grand_total ELSE 0 END), 2) AS "Other Operations:Currency:130"
FROM `tabPurchase Order` po
WHERE po.docstatus = 1
  AND (po.custom_is_test_record = 0 OR po.custom_is_test_record IS NULL)
  AND (%(company)s IS NULL OR %(company)s = '' OR po.company = %(company)s)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR po.transaction_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR po.transaction_date <= %(to_date)s)
GROUP BY DATE_FORMAT(po.transaction_date, '%%Y-%%m'), po.custom_procurement_type
ORDER BY `Month:Data:100` DESC, `Total Amount:Currency:130` DESC"""
        }
    ]

    for r_data in reports:
        rep_name = r_data["report_name"]
        if frappe.db.exists("Report", rep_name):
            rep = frappe.get_doc("Report", rep_name)
            rep.query = r_data["query"]
            rep.disabled = 0
            rep.module = "Fleet Management"
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
            }).insert(ignore_permissions=True)
            print(f"Created Query Report: {rep_name}")

    frappe.db.commit()
    print("All 10 Batch 7 Query Reports configured successfully.")

if __name__ == '__main__':
    create_reports()
