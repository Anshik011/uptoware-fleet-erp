import frappe
import json

def setup_batch10_reports():
    print("=== CONFIGURING BATCH 10 MIS QUERY REPORTS ===")

    reports = [
        # 1. Fleet Utilization
        {
            "report_name": "Fleet Utilization",
            "ref_doctype": "Vehicle",
            "roles": ["System Manager", "Fleet Manager", "Workshop Supervisor", "Store Manager", "Accountant"],
            "query": """SELECT
    v.name AS "Vehicle:Link/Vehicle:140",
    v.make AS "Make:Data:110",
    v.model AS "Model:Data:120",
    v.vehicle_status AS "Status:Data:110",
    COALESCE(v.assigned_driver, '-') AS "Assigned Driver:Link/Driver:140",
    COALESCE(t.total_trips, 0) AS "Total Trips:Int:90",
    COALESCE(t.completed_trips, 0) AS "Delivered Trips:Int:100",
    COALESCE(t.total_tonnage, 0.0) AS "Total Tonnage (Tons):Float:140",
    COALESCE(fl.total_km, 0) AS "Distance Travelled (KM):Int:140",
    COALESCE(fl.total_fuel, 0.0) AS "Fuel Consumed (L):Float:120",
    COALESCE(bkd.total_downtime, 0.0) AS "Downtime (Hours):Float:120",
    CASE 
        WHEN v.vehicle_status = 'On Trip' THEN 'In Operation'
        WHEN v.vehicle_status = 'Active' AND COALESCE(t.total_trips, 0) > 0 THEN 'Utilized'
        WHEN v.vehicle_status IN ('Under Maintenance', 'Breakdown') THEN 'Maintenance / Down'
        WHEN v.vehicle_status = 'Out of Service' THEN 'Out of Service'
        ELSE 'Available / Standby'
    END AS "Utilization State:Data:140"
FROM `tabVehicle` v
LEFT JOIN (
    SELECT 
        mt.vehicle,
        COUNT(mt.name) AS total_trips,
        SUM(CASE WHEN mt.trip_status IN ('Approved', 'Delivered') THEN 1 ELSE 0 END) AS completed_trips,
        SUM(CASE WHEN mt.docstatus = 1 THEN IFNULL(mt.net_weight_tons, 0) ELSE 0 END) AS total_tonnage
    FROM `tabMining Trip` mt
    WHERE mt.docstatus != 2
      AND (mt.is_test_record = 0 OR mt.is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR mt.dispatch_date_time >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR mt.dispatch_date_time <= CONCAT(%(to_date)s, ' 23:59:59'))
    GROUP BY mt.vehicle
) t ON t.vehicle = v.name
LEFT JOIN (
    SELECT
        fl_sub.vehicle,
        SUM(IFNULL(fl_sub.distance_travelled_km, 0)) AS total_km,
        SUM(IFNULL(fl_sub.quantity_litres, 0)) AS total_fuel
    FROM `tabFuel Log` fl_sub
    WHERE fl_sub.docstatus = 1
      AND (fl_sub.is_test_record = 0 OR fl_sub.is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR fl_sub.fuel_date >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR fl_sub.fuel_date <= %(to_date)s)
    GROUP BY fl_sub.vehicle
) fl ON fl.vehicle = v.name
LEFT JOIN (
    SELECT
        vb_sub.vehicle,
        SUM(IFNULL(vb_sub.downtime_hours, 0)) AS total_downtime
    FROM `tabVehicle Breakdown` vb_sub
    WHERE vb_sub.docstatus != 2
      AND (vb_sub.is_test_record = 0 OR vb_sub.is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR vb_sub.breakdown_datetime >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR vb_sub.breakdown_datetime <= CONCAT(%(to_date)s, ' 23:59:59'))
    GROUP BY vb_sub.vehicle
) bkd ON bkd.vehicle = v.name
WHERE (v.is_test_record = 0 OR v.is_test_record IS NULL)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR v.name = %(vehicle)s)
  AND (%(vehicle_status)s IS NULL OR %(vehicle_status)s = '' OR v.vehicle_status = %(vehicle_status)s)
ORDER BY v.name ASC""",
            "javascript": """frappe.query_reports["Fleet Utilization"] = {
    "filters": [
        {"fieldname": "from_date", "label": __("From Date"), "fieldtype": "Date"},
        {"fieldname": "to_date", "label": __("To Date"), "fieldtype": "Date"},
        {"fieldname": "vehicle", "label": __("Vehicle"), "fieldtype": "Link", "options": "Vehicle"},
        {"fieldname": "vehicle_status", "label": __("Vehicle Status"), "fieldtype": "Select", "options": "\\nActive\\nOn Trip\\nUnder Maintenance\\nBreakdown\\nOut of Service"}
    ]
};"""
        },

        # 2. Vehicle Performance Summary
        {
            "report_name": "Vehicle Performance Summary",
            "ref_doctype": "Vehicle",
            "roles": ["System Manager", "Fleet Manager", "Accountant"],
            "query": """SELECT
    v.name AS "Vehicle:Link/Vehicle:130",
    v.make AS "Make:Data:100",
    v.model AS "Model:Data:110",
    v.vehicle_status AS "Status:Data:100",
    COALESCE(t.trip_count, 0) AS "Completed Trips:Int:100",
    COALESCE(t.total_tons, 0.0) AS "Total Tons:Float:100",
    COALESCE(fl.total_litres, 0.0) AS "Fuel Consumed (L):Float:120",
    COALESCE(fl.fuel_cost, 0.0) AS "Fuel Cost:Currency:120",
    COALESCE(fl.avg_kml, 0.0) AS "Avg KM/L:Float:90",
    COALESCE(bkd.repair_cost, 0.0) AS "Maintenance Cost:Currency:120",
    COALESCE(opex.vehicle_opex, 0.0) AS "Direct OpEx:Currency:120",
    (COALESCE(fl.fuel_cost, 0.0) + COALESCE(bkd.repair_cost, 0.0) + COALESCE(opex.vehicle_opex, 0.0)) AS "Total Operating Cost:Currency:140",
    COALESCE(rev.invoiced_revenue, 0.0) AS "Invoiced Revenue:Currency:130",
    (COALESCE(rev.invoiced_revenue, 0.0) - (COALESCE(fl.fuel_cost, 0.0) + COALESCE(bkd.repair_cost, 0.0) + COALESCE(opex.vehicle_opex, 0.0))) AS "Net Contribution:Currency:130"
FROM `tabVehicle` v
LEFT JOIN (
    SELECT 
        mt.vehicle,
        COUNT(mt.name) AS trip_count,
        SUM(IFNULL(mt.net_weight_tons, 0.0)) AS total_tons
    FROM `tabMining Trip` mt
    WHERE mt.docstatus = 1 
      AND mt.trip_status IN ('Approved', 'Delivered')
      AND (mt.is_test_record = 0 OR mt.is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR mt.dispatch_date_time >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR mt.dispatch_date_time <= CONCAT(%(to_date)s, ' 23:59:59'))
    GROUP BY mt.vehicle
) t ON t.vehicle = v.name
LEFT JOIN (
    SELECT
        fl_sub.vehicle,
        SUM(IFNULL(fl_sub.quantity_litres, 0.0)) AS total_litres,
        SUM(IFNULL(fl_sub.total_fuel_cost, 0.0)) AS fuel_cost,
        ROUND(AVG(CASE WHEN fl_sub.is_full_tank = 1 AND fl_sub.km_per_litre > 0 THEN fl_sub.km_per_litre ELSE NULL END), 2) AS avg_kml
    FROM `tabFuel Log` fl_sub
    WHERE fl_sub.docstatus = 1 
      AND fl_sub.approval_status = 'Approved'
      AND (fl_sub.is_test_record = 0 OR fl_sub.is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR fl_sub.fuel_date >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR fl_sub.fuel_date <= %(to_date)s)
    GROUP BY fl_sub.vehicle
) fl ON fl.vehicle = v.name
LEFT JOIN (
    SELECT
        vb_sub.vehicle,
        SUM(IFNULL(vb_sub.total_repair_cost, 0.0)) AS repair_cost
    FROM `tabVehicle Breakdown` vb_sub
    WHERE vb_sub.docstatus = 1 
      AND vb_sub.repair_status IN ('Repaired', 'Closed')
      AND (vb_sub.is_test_record = 0 OR vb_sub.is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR vb_sub.breakdown_datetime >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR vb_sub.breakdown_datetime <= CONCAT(%(to_date)s, ' 23:59:59'))
    GROUP BY vb_sub.vehicle
) bkd ON bkd.vehicle = v.name
LEFT JOIN (
    SELECT
        oe_sub.vehicle,
        SUM(IFNULL(oe_sub.posted_amount, 0.0)) AS vehicle_opex
    FROM `tabOperational Expense` oe_sub
    WHERE oe_sub.docstatus = 1 
      AND oe_sub.accounting_status = 'Posted'
      AND (oe_sub.is_test_record = 0 OR oe_sub.is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR oe_sub.expense_date >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR oe_sub.expense_date <= %(to_date)s)
    GROUP BY oe_sub.vehicle
) opex ON opex.vehicle = v.name
LEFT JOIN (
    SELECT 
        v_id,
        SUM(inv_amt) AS invoiced_revenue
    FROM (
        SELECT 
            si.custom_vehicle AS v_id,
            CASE WHEN si.is_return = 1 THEN -ABS(si.base_grand_total) ELSE si.base_grand_total END AS inv_amt
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1
          AND si.custom_vehicle IS NOT NULL AND si.custom_vehicle != ''
          AND (si.custom_is_test_record = 0 OR si.custom_is_test_record IS NULL)
          AND NOT EXISTS (
              SELECT 1 FROM `tabSales Invoice Item` sii_sub 
              WHERE sii_sub.parent = si.name AND sii_sub.custom_vehicle IS NOT NULL AND sii_sub.custom_vehicle != ''
          )
        UNION ALL
        SELECT 
            sii.custom_vehicle AS v_id,
            CASE WHEN si.is_return = 1 THEN -ABS(sii.base_net_amount) ELSE sii.base_net_amount END AS inv_amt
        FROM `tabSales Invoice Item` sii
        JOIN `tabSales Invoice` si ON si.name = sii.parent
        WHERE si.docstatus = 1
          AND sii.custom_vehicle IS NOT NULL AND sii.custom_vehicle != ''
          AND (si.custom_is_test_record = 0 OR si.custom_is_test_record IS NULL)
    ) v_rev
    GROUP BY v_id
) rev ON rev.v_id = v.name
WHERE (v.is_test_record = 0 OR v.is_test_record IS NULL)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR v.name = %(vehicle)s)
ORDER BY v.name ASC""",
            "javascript": """frappe.query_reports["Vehicle Performance Summary"] = {
    "filters": [
        {"fieldname": "from_date", "label": __("From Date"), "fieldtype": "Date"},
        {"fieldname": "to_date", "label": __("To Date"), "fieldtype": "Date"},
        {"fieldname": "vehicle", "label": __("Vehicle"), "fieldtype": "Link", "options": "Vehicle"}
    ]
};"""
        },

        # 3. Driver Performance
        {
            "report_name": "Driver Performance",
            "ref_doctype": "Driver",
            "roles": ["System Manager", "Fleet Manager"],
            "query": """SELECT
    d.name AS "Driver ID:Link/Driver:140",
    d.full_name AS "Full Name:Data:150",
    d.status AS "Status:Data:100",
    COALESCE(t.total_trips, 0) AS "Total Trips Assigned:Int:120",
    COALESCE(t.delivered_trips, 0) AS "Delivered Trips:Int:110",
    COALESCE(t.total_tonnage, 0.0) AS "Total Tonnage (Tons):Float:130",
    COALESCE(fl.total_km, 0) AS "Distance Driven (KM):Int:130",
    COALESCE(fl.total_litres, 0.0) AS "Fuel Consumed (L):Float:120",
    COALESCE(fl.avg_kml, 0.0) AS "Avg KM/L:Float:90",
    COALESCE(bkd.breakdowns, 0) AS "Breakdowns Encountered:Int:140"
FROM `tabDriver` d
LEFT JOIN (
    SELECT
        mt.driver,
        COUNT(mt.name) AS total_trips,
        SUM(CASE WHEN mt.trip_status IN ('Approved', 'Delivered') THEN 1 ELSE 0 END) AS delivered_trips,
        SUM(CASE WHEN mt.docstatus = 1 THEN IFNULL(mt.net_weight_tons, 0) ELSE 0 END) AS total_tonnage
    FROM `tabMining Trip` mt
    WHERE mt.docstatus != 2
      AND (mt.is_test_record = 0 OR mt.is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR mt.dispatch_date_time >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR mt.dispatch_date_time <= CONCAT(%(to_date)s, ' 23:59:59'))
    GROUP BY mt.driver
) t ON t.driver = d.name
LEFT JOIN (
    SELECT
        fl_sub.driver,
        SUM(IFNULL(fl_sub.distance_travelled_km, 0)) AS total_km,
        SUM(IFNULL(fl_sub.quantity_litres, 0.0)) AS total_litres,
        ROUND(AVG(CASE WHEN fl_sub.is_full_tank = 1 AND fl_sub.km_per_litre > 0 THEN fl_sub.km_per_litre ELSE NULL END), 2) AS avg_kml
    FROM `tabFuel Log` fl_sub
    WHERE fl_sub.docstatus = 1
      AND (fl_sub.is_test_record = 0 OR fl_sub.is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR fl_sub.fuel_date >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR fl_sub.fuel_date <= %(to_date)s)
    GROUP BY fl_sub.driver
) fl ON fl.driver = d.name
LEFT JOIN (
    SELECT
        vb_sub.driver,
        COUNT(vb_sub.name) AS breakdowns
    FROM `tabVehicle Breakdown` vb_sub
    WHERE vb_sub.docstatus != 2
      AND (vb_sub.is_test_record = 0 OR vb_sub.is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR vb_sub.breakdown_datetime >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR vb_sub.breakdown_datetime <= CONCAT(%(to_date)s, ' 23:59:59'))
    GROUP BY vb_sub.driver
) bkd ON bkd.driver = d.name
WHERE (%(driver)s IS NULL OR %(driver)s = '' OR d.name = %(driver)s)
  AND (%(status)s IS NULL OR %(status)s = '' OR d.status = %(status)s)
ORDER BY d.name ASC""",
            "javascript": """frappe.query_reports["Driver Performance"] = {
    "filters": [
        {"fieldname": "from_date", "label": __("From Date"), "fieldtype": "Date"},
        {"fieldname": "to_date", "label": __("To Date"), "fieldtype": "Date"},
        {"fieldname": "driver", "label": __("Driver"), "fieldtype": "Link", "options": "Driver"},
        {"fieldname": "status", "label": __("Status"), "fieldtype": "Select", "options": "\\nActive\\nInactive\\nSuspended\\nOn Leave"}
    ]
};"""
        },

        # 4. Trip Operations Summary
        {
            "report_name": "Trip Operations Summary",
            "ref_doctype": "Mining Trip",
            "roles": ["System Manager", "Fleet Manager", "Accountant"],
            "query": """SELECT
    mt.name AS "Trip ID:Link/Mining Trip:140",
    mt.dispatch_date_time AS "Dispatch Time:Datetime:140",
    mt.return_date_time AS "Return Time:Datetime:140",
    mt.vehicle AS "Vehicle:Link/Vehicle:120",
    mt.driver AS "Driver:Link/Driver:130",
    mt.mine_site AS "Mine Site:Link/Mine Site:140",
    mt.trip_status AS "Trip Status:Data:110",
    COALESCE(mt.tare_weight_tons, 0.0) AS "Tare (Tons):Float:90",
    COALESCE(mt.gross_weight_tons, 0.0) AS "Gross (Tons):Float:90",
    COALESCE(mt.net_weight_tons, 0.0) AS "Net Tons:Float:90",
    CASE 
        WHEN mt.return_date_time IS NOT NULL AND mt.dispatch_date_time IS NOT NULL 
        THEN ROUND(TIMESTAMPDIFF(MINUTE, mt.dispatch_date_time, mt.return_date_time) / 60.0, 2)
        ELSE NULL 
    END AS "Cycle Time (Hrs):Float:110",
    CASE 
        WHEN mt.net_weight_tons > 0 THEN 'Confirmed'
        ELSE 'Pending'
    END AS "Weighbridge:Data:100",
    COALESCE(mt.billing_status, 'Unbilled') AS "Billing Status:Data:110",
    COALESCE(mt.sales_invoice, '-') AS "Sales Invoice:Data:150"
FROM `tabMining Trip` mt
WHERE mt.docstatus != 2
  AND (mt.is_test_record = 0 OR mt.is_test_record IS NULL)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR mt.dispatch_date_time >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR mt.dispatch_date_time <= CONCAT(%(to_date)s, ' 23:59:59'))
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR mt.vehicle = %(vehicle)s)
  AND (%(driver)s IS NULL OR %(driver)s = '' OR mt.driver = %(driver)s)
  AND (%(mine_site)s IS NULL OR %(mine_site)s = '' OR mt.mine_site = %(mine_site)s)
  AND (%(trip_status)s IS NULL OR %(trip_status)s = '' OR mt.trip_status = %(trip_status)s)
  AND (%(billing_status)s IS NULL OR %(billing_status)s = '' OR mt.billing_status = %(billing_status)s)
ORDER BY mt.dispatch_date_time DESC""",
            "javascript": """frappe.query_reports["Trip Operations Summary"] = {
    "filters": [
        {"fieldname": "from_date", "label": __("From Date"), "fieldtype": "Date"},
        {"fieldname": "to_date", "label": __("To Date"), "fieldtype": "Date"},
        {"fieldname": "vehicle", "label": __("Vehicle"), "fieldtype": "Link", "options": "Vehicle"},
        {"fieldname": "driver", "label": __("Driver"), "fieldtype": "Link", "options": "Driver"},
        {"fieldname": "mine_site", "label": __("Mine Site"), "fieldtype": "Link", "options": "Mine Site"},
        {"fieldname": "trip_status", "label": __("Trip Status"), "fieldtype": "Select", "options": "\\nDraft\\nDispatched\\nWeighbridge Confirmed\\nApproved\\nDelivered\\nCancelled"},
        {"fieldname": "billing_status", "label": __("Billing Status"), "fieldtype": "Select", "options": "\\nUnbilled\\nInvoiced\\nPartially Paid\\nPaid\\nCancelled"}
    ]
};"""
        }
    ]

    for r_cfg in reports:
        r_name = r_cfg["report_name"]
        if frappe.db.exists("Report", r_name):
            r = frappe.get_doc("Report", r_name)
            r.report_type = "Query Report"
            r.ref_doctype = r_cfg["ref_doctype"]
            r.is_standard = "No"
            r.module = "Fleet Management"
            r.query = r_cfg["query"]
            r.javascript = r_cfg["javascript"]
            r.disabled = 0
            r.roles = []
            for role_name in r_cfg["roles"]:
                r.append("roles", {"role": role_name})
            r.save(ignore_permissions=True)
            print(f"Updated Report: {r_name}")
        else:
            r = frappe.get_doc({
                "doctype": "Report",
                "report_name": r_name,
                "report_type": "Query Report",
                "ref_doctype": r_cfg["ref_doctype"],
                "module": "Fleet Management",
                "is_standard": "No",
                "query": r_cfg["query"],
                "javascript": r_cfg["javascript"],
                "disabled": 0,
                "roles": [{"role": role_name} for role_name in r_cfg["roles"]]
            }).insert(ignore_permissions=True)
            print(f"Created Report: {r_name}")

    frappe.clear_cache()
    frappe.db.commit()
    print("=== ALL 4 BATCH 10 MIS QUERY REPORTS CONFIGURED SUCCESSFULLY ===")

if __name__ == "__main__":
    setup_batch10_reports()

