import frappe

def run():
    print("=== BATCH 6: CREATING ALL 7 SPARE PARTS & INVENTORY QUERY REPORTS ===")

    reports = [
        # 1. Spare Parts Stock Register
        {
            "report_name": "Spare Parts Stock Register",
            "query": """SELECT
    i.item_code AS "Item Code:Link/Item:130",
    i.item_name AS "Part Name:Data:180",
    i.item_group AS "Category:Link/Item Group:140",
    COALESCE(NULLIF(i.custom_part_number, ''), i.default_manufacturer_part_no, '-') AS "Part Number:Data:140",
    COALESCE(NULLIF(i.custom_compatible_vehicle_model, ''), '-') AS "Compatible Models:Data:180",
    i.stock_uom AS "UOM:Link/UOM:80",
    ROUND(SUM(IFNULL(b.actual_qty, 0)), 2) AS "In Stock Qty:Float:110",
    ROUND(SUM(IFNULL(b.reserved_qty, 0)), 2) AS "Reserved Qty:Float:110",
    ROUND(SUM(IFNULL(b.projected_qty, 0)), 2) AS "Available Qty:Float:110",
    ROUND(AVG(IFNULL(b.valuation_rate, i.valuation_rate)), 2) AS "Valuation Rate:Currency:120",
    ROUND(SUM(IFNULL(b.stock_value, 0)), 2) AS "Total Stock Value:Currency:140",
    COALESCE(i.custom_preferred_supplier, '-') AS "Preferred Supplier:Link/Supplier:150"
FROM `tabItem` i
LEFT JOIN `tabBin` b ON b.item_code = i.name
WHERE (i.custom_is_test_record = 0 OR i.custom_is_test_record IS NULL)
  AND (i.is_stock_item = 1)
  AND (%(item_group)s IS NULL OR %(item_group)s = '' OR i.item_group = %(item_group)s)
  AND (%(item_code)s IS NULL OR %(item_code)s = '' OR i.item_code = %(item_code)s)
  AND (%(brand)s IS NULL OR %(brand)s = '' OR i.brand = %(brand)s)
GROUP BY i.name
ORDER BY `Total Stock Value:Currency:140` DESC, i.item_name ASC"""
        },

        # 2. Warehouse-wise Stock
        {
            "report_name": "Warehouse-wise Stock",
            "query": """SELECT
    b.warehouse AS "Warehouse:Link/Warehouse:150",
    b.item_code AS "Item Code:Link/Item:130",
    i.item_name AS "Part Name:Data:180",
    i.item_group AS "Category:Link/Item Group:140",
    COALESCE(NULLIF(i.custom_part_number, ''), i.default_manufacturer_part_no, '-') AS "Part Number:Data:130",
    i.stock_uom AS "UOM:Link/UOM:80",
    ROUND(IFNULL(b.actual_qty, 0), 2) AS "Actual Qty:Float:100",
    ROUND(IFNULL(b.reserved_qty, 0), 2) AS "Reserved Qty:Float:100",
    ROUND(IFNULL(b.projected_qty, 0), 2) AS "Projected Qty:Float:110",
    ROUND(IFNULL(b.valuation_rate, 0), 2) AS "Valuation Rate:Currency:110",
    ROUND(IFNULL(b.stock_value, 0), 2) AS "Stock Value:Currency:120"
FROM `tabBin` b
JOIN `tabItem` i ON b.item_code = i.name
WHERE (i.custom_is_test_record = 0 OR i.custom_is_test_record IS NULL)
  AND (%(warehouse)s IS NULL OR %(warehouse)s = '' OR b.warehouse = %(warehouse)s)
  AND (%(item_group)s IS NULL OR %(item_group)s = '' OR i.item_group = %(item_group)s)
  AND (%(item_code)s IS NULL OR %(item_code)s = '' OR b.item_code = %(item_code)s)
  AND (%(company)s IS NULL OR %(company)s = '' OR b.company = %(company)s)
ORDER BY b.warehouse ASC, `Stock Value:Currency:120` DESC"""
        },

        # 3. Low Stock / Reorder Report
        {
            "report_name": "Low Stock / Reorder Report",
            "query": """SELECT
    b.warehouse AS "Warehouse:Link/Warehouse:150",
    b.item_code AS "Item Code:Link/Item:130",
    i.item_name AS "Part Name:Data:180",
    i.item_group AS "Category:Link/Item Group:130",
    ROUND(IFNULL(b.actual_qty, 0), 2) AS "Current Stock:Float:100",
    ROUND(COALESCE(ir.warehouse_reorder_level, NULLIF(i.safety_stock, 0), 0), 2) AS "Reorder Level:Float:100",
    ROUND(COALESCE(ir.warehouse_reorder_qty, NULLIF(i.min_order_qty, 0), 0), 2) AS "Reorder Qty:Float:100",
    ROUND(GREATEST(0, COALESCE(ir.warehouse_reorder_level, NULLIF(i.safety_stock, 0), 0) - IFNULL(b.actual_qty, 0)), 2) AS "Shortage Qty:Float:100",
    COALESCE(i.custom_preferred_supplier, '-') AS "Preferred Supplier:Link/Supplier:140",
    CASE
        WHEN IFNULL(b.actual_qty, 0) <= 0 THEN 'Critical Low'
        WHEN IFNULL(b.actual_qty, 0) <= COALESCE(ir.warehouse_reorder_level, NULLIF(i.safety_stock, 0), 0) THEN 'Reorder Needed'
        ELSE 'Adequate'
    END AS "Status:Data:120"
FROM `tabBin` b
JOIN `tabItem` i ON b.item_code = i.name
LEFT JOIN `tabItem Reorder` ir ON ir.parent = i.name AND ir.warehouse = b.warehouse
WHERE (i.custom_is_test_record = 0 OR i.custom_is_test_record IS NULL)
  AND (i.disabled = 0)
  AND (%(warehouse)s IS NULL OR %(warehouse)s = '' OR b.warehouse = %(warehouse)s)
  AND (%(item_group)s IS NULL OR %(item_group)s = '' OR i.item_group = %(item_group)s)
  AND (%(preferred_supplier)s IS NULL OR %(preferred_supplier)s = '' OR i.custom_preferred_supplier = %(preferred_supplier)s)
  AND (
      IFNULL(b.actual_qty, 0) <= COALESCE(ir.warehouse_reorder_level, NULLIF(i.safety_stock, 0), 0)
      OR %(show_all)s = '1'
  )
ORDER BY `Status:Data:120` ASC, `Shortage Qty:Float:100` DESC"""
        },

        # 4. Spare Parts Consumption by Vehicle
        {
            "report_name": "Spare Parts Consumption by Vehicle",
            "query": """SELECT
    vb.vehicle AS "Vehicle:Link/Vehicle:130",
    v.model AS "Model:Data:130",
    v.make AS "Make:Data:120",
    COUNT(DISTINCT vb.name) AS "Breakdown Count:Int:120",
    ROUND(SUM(IFNULL(vbp.issued_qty, 0)), 2) AS "Gross Issued Qty:Float:120",
    ROUND(SUM(IFNULL(vbp.returned_qty, 0)), 2) AS "Returned Qty:Float:110",
    ROUND(SUM(IFNULL(vbp.net_issued_qty, IFNULL(vbp.issued_qty, 0))), 2) AS "Net Consumed Qty:Float:130",
    ROUND(SUM(IFNULL(vbp.amount, 0)), 2) AS "Total Parts Cost:Currency:140"
FROM `tabVehicle Breakdown Part` vbp
JOIN `tabVehicle Breakdown` vb ON vbp.parent = vb.name
JOIN `tabItem` i ON vbp.item_code = i.name
LEFT JOIN `tabVehicle` v ON vb.vehicle = v.name
WHERE (vb.is_test_record = 0 OR vb.is_test_record IS NULL)
  AND (v.is_test_record = 0 OR v.is_test_record IS NULL)
  AND (i.custom_is_test_record = 0 OR i.custom_is_test_record IS NULL)
  AND vb.repair_status IN ('In Workshop', 'Awaiting Parts', 'Repaired', 'Closed')
  AND (vb.resolution_type != 'Rejected' OR vb.resolution_type IS NULL)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR vb.breakdown_datetime >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR vb.breakdown_datetime <= %(to_date)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR vb.vehicle = %(vehicle)s)
GROUP BY vb.vehicle
ORDER BY `Total Parts Cost:Currency:140` DESC"""
        },

        # 5. Spare Parts Consumption by Breakdown
        {
            "report_name": "Spare Parts Consumption by Breakdown",
            "query": """SELECT
    vb.name AS "Breakdown ID:Link/Vehicle Breakdown:140",
    DATE(vb.breakdown_datetime) AS "Date:Date:100",
    vb.vehicle AS "Vehicle:Link/Vehicle:120",
    vb.breakdown_type AS "Type:Data:110",
    vb.severity AS "Severity:Data:90",
    vbp.item_code AS "Item Code:Link/Item:130",
    vbp.item_name AS "Part Name:Data:160",
    vbp.warehouse AS "Warehouse:Link/Warehouse:130",
    ROUND(IFNULL(vbp.planned_qty, 0), 2) AS "Planned:Float:90",
    ROUND(IFNULL(vbp.issued_qty, 0), 2) AS "Issued:Float:90",
    ROUND(IFNULL(vbp.returned_qty, 0), 2) AS "Returned:Float:90",
    ROUND(IFNULL(vbp.net_issued_qty, IFNULL(vbp.issued_qty, 0)), 2) AS "Net Qty:Float:90",
    ROUND(IFNULL(vbp.rate, 0), 2) AS "Rate:Currency:100",
    ROUND(IFNULL(vbp.amount, 0), 2) AS "Amount:Currency:110",
    vbp.status AS "Status:Data:100"
FROM `tabVehicle Breakdown Part` vbp
JOIN `tabVehicle Breakdown` vb ON vbp.parent = vb.name
JOIN `tabItem` i ON vbp.item_code = i.name
LEFT JOIN `tabVehicle` v ON vb.vehicle = v.name
WHERE (vb.is_test_record = 0 OR vb.is_test_record IS NULL)
  AND (v.is_test_record = 0 OR v.is_test_record IS NULL)
  AND (i.custom_is_test_record = 0 OR i.custom_is_test_record IS NULL)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR vb.breakdown_datetime >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR vb.breakdown_datetime <= %(to_date)s)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR vb.vehicle = %(vehicle)s)
  AND (%(breakdown_type)s IS NULL OR %(breakdown_type)s = '' OR vb.breakdown_type = %(breakdown_type)s)
ORDER BY vb.breakdown_datetime DESC, vb.name DESC"""
        },

        # 6. Spare Parts Consumption by Mine Site
        {
            "report_name": "Spare Parts Consumption by Mine Site",
            "query": """SELECT
    COALESCE(vb.mine_site, 'Central Workshop / Unassigned') AS "Mine Site:Data:160",
    COUNT(DISTINCT vb.vehicle) AS "Vehicles Serviced:Int:120",
    COUNT(DISTINCT vb.name) AS "Breakdowns:Int:100",
    ROUND(SUM(IFNULL(vbp.net_issued_qty, IFNULL(vbp.issued_qty, 0))), 2) AS "Net Parts Qty:Float:120",
    ROUND(SUM(IFNULL(vbp.amount, 0)), 2) AS "Total Parts Cost:Currency:140"
FROM `tabVehicle Breakdown Part` vbp
JOIN `tabVehicle Breakdown` vb ON vbp.parent = vb.name
JOIN `tabItem` i ON vbp.item_code = i.name
LEFT JOIN `tabVehicle` v ON vb.vehicle = v.name
LEFT JOIN `tabMine Site` ms ON vb.mine_site = ms.name
WHERE (vb.is_test_record = 0 OR vb.is_test_record IS NULL)
  AND (v.is_test_record = 0 OR v.is_test_record IS NULL)
  AND (ms.is_test_record = 0 OR ms.is_test_record IS NULL OR ms.name IS NULL)
  AND (i.custom_is_test_record = 0 OR i.custom_is_test_record IS NULL)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR vb.breakdown_datetime >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR vb.breakdown_datetime <= %(to_date)s)
  AND (%(mine_site)s IS NULL OR %(mine_site)s = '' OR vb.mine_site = %(mine_site)s)
GROUP BY vb.mine_site
ORDER BY `Total Parts Cost:Currency:140` DESC"""
        },

        # 7. Stock Movement History
        {
            "report_name": "Stock Movement History",
            "query": """SELECT
    sle.posting_date AS "Date:Date:100",
    sle.posting_time AS "Time:Time:90",
    CASE
        WHEN sle.is_cancelled = 0 THEN 'Active'
        WHEN sle.is_cancelled = 1 AND (
            (se.stock_entry_type = 'Material Issue' AND sle.actual_qty > 0)
            OR (se.stock_entry_type IN ('Material Receipt', 'Receive at Site') AND sle.actual_qty < 0)
            OR (sle.creation > (SELECT MIN(s2.creation) FROM `tabStock Ledger Entry` s2 WHERE s2.voucher_no = sle.voucher_no AND s2.voucher_detail_no = sle.voucher_detail_no))
        ) THEN 'Cancelled (Reversal)'
        WHEN sle.is_cancelled = 1 THEN 'Cancelled (Original)'
        ELSE 'Active'
    END AS "Status:Data:140",
    sle.item_code AS "Item Code:Link/Item:130",
    i.item_name AS "Part Name:Data:160",
    sle.warehouse AS "Warehouse:Link/Warehouse:140",
    sle.voucher_type AS "Voucher Type:Data:120",
    sle.voucher_no AS "Voucher No:Dynamic Link/voucher_type:140",
    ROUND(CASE WHEN sle.actual_qty > 0 THEN sle.actual_qty ELSE 0 END, 2) AS "In Qty:Float:90",
    ROUND(CASE WHEN sle.actual_qty < 0 THEN ABS(sle.actual_qty) ELSE 0 END, 2) AS "Out Qty:Float:90",
    ROUND(sle.qty_after_transaction, 2) AS "Balance Qty:Float:100",
    ROUND(sle.valuation_rate, 2) AS "Valuation Rate:Currency:110",
    ROUND(sle.stock_value_difference, 2) AS "Value Diff:Currency:110",
    COALESCE(se.custom_vehicle, '-') AS "Vehicle:Link/Vehicle:120",
    COALESCE(se.custom_vehicle_breakdown, '-') AS "Breakdown:Link/Vehicle Breakdown:140"
FROM `tabStock Ledger Entry` sle
JOIN `tabItem` i ON sle.item_code = i.name
LEFT JOIN `tabStock Entry` se ON sle.voucher_type = 'Stock Entry' AND sle.voucher_no = se.name
LEFT JOIN `tabVehicle Breakdown` vb ON se.custom_vehicle_breakdown = vb.name
LEFT JOIN `tabVehicle` v ON se.custom_vehicle = v.name
WHERE (i.custom_is_test_record = 0 OR i.custom_is_test_record IS NULL)
  AND (vb.is_test_record = 0 OR vb.is_test_record IS NULL)
  AND (v.is_test_record = 0 OR v.is_test_record IS NULL)
  AND (%(include_cancelled)s = '1' OR sle.is_cancelled = 0)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR sle.posting_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR sle.posting_date <= %(to_date)s)
  AND (%(warehouse)s IS NULL OR %(warehouse)s = '' OR sle.warehouse = %(warehouse)s)
  AND (%(item_code)s IS NULL OR %(item_code)s = '' OR sle.item_code = %(item_code)s)
  AND (%(voucher_type)s IS NULL OR %(voucher_type)s = '' OR sle.voucher_type = %(voucher_type)s)
ORDER BY sle.posting_datetime DESC, sle.creation DESC"""
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
                "ref_doctype": "Stock Entry",
                "report_type": "Query Report",
                "is_standard": "No",
                "module": "Fleet Management",
                "query": r_data["query"]
            })
            rep.insert(ignore_permissions=True)
            print(f"Created Query Report: {rep_name}")

    frappe.clear_cache()
    frappe.db.commit()
    print("=== ALL 7 BATCH 6 REPORTS CREATED & CONFIGURED SUCCESSFULLY ===")

run()

