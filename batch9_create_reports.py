import frappe

def create_reports():
    print("=== CONFIGURING ENHANCED BATCH 9 REVENUE & PROFITABILITY QUERY REPORTS ===")

    reports = [
        # 1. Trip-wise Revenue and Profitability
        {
            "report_name": "Trip-wise Revenue and Profitability",
            "ref_doctype": "Mining Trip",
            "query": """SELECT
    mt.name AS "Trip ID:Link/Mining Trip:140",
    mt.dispatch_date_time AS "Dispatch Date:Datetime:140",
    mt.vehicle AS "Vehicle:Link/Vehicle:120",
    mt.driver AS "Driver:Link/Driver:130",
    mt.mine_site AS "Mine Site:Link/Mine Site:140",
    COALESCE(ms.client, '-') AS "Client:Link/Customer:130",
    COALESCE(mt.net_weight_tons, 0.0) AS "Net Tons:Float:90",
    mt.trip_status AS "Trip Status:Data:100",
    COALESCE(mt.billing_status, 'Unbilled') AS "Billing Status:Data:110",
    COALESCE(mt.rate_per_ton, 0.0) AS "Indicative Rate:Currency:110",
    CASE 
        WHEN mt.trip_status IN ('Approved', 'Delivered') AND mt.rate_per_ton > 0 
        THEN ROUND(COALESCE(mt.net_weight_tons, 0.0) * mt.rate_per_ton, 2)
        ELSE 0.0 
    END AS "Estimated Revenue:Currency:130",
    COALESCE(rev.invoiced_revenue, 0.0) AS "Invoiced Revenue:Currency:130",
    COALESCE(opex.direct_opex, 0.0) AS "Direct Trip OpEx:Currency:120",
    COALESCE(bkd.direct_repair, 0.0) AS "Direct Repair Cost:Currency:120",
    (COALESCE(opex.direct_opex, 0.0) + COALESCE(bkd.direct_repair, 0.0)) AS "Total Direct Cost:Currency:120",
    (COALESCE(rev.invoiced_revenue, 0.0) - (COALESCE(opex.direct_opex, 0.0) + COALESCE(bkd.direct_repair, 0.0))) AS "Contribution:Currency:120",
    COALESCE(rev.invoice_names, mt.sales_invoice, '-') AS "Sales Invoice:Data:160"
FROM `tabMining Trip` mt
LEFT JOIN `tabMine Site` ms ON ms.name = mt.mine_site
LEFT JOIN (
    SELECT 
        trip_id,
        SUM(inv_amt) AS invoiced_revenue,
        GROUP_CONCAT(DISTINCT inv_name ORDER BY inv_name SEPARATOR ', ') AS invoice_names
    FROM (
        -- Header-level trip link (when items do NOT have specific item-level trip link)
        SELECT 
            si.custom_mining_trip AS trip_id,
            CASE WHEN si.is_return = 1 THEN -ABS(si.base_grand_total) ELSE si.base_grand_total END AS inv_amt,
            si.name AS inv_name
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1
          AND si.custom_mining_trip IS NOT NULL AND si.custom_mining_trip != ''
          AND (si.custom_is_test_record = 0 OR si.custom_is_test_record IS NULL)
          AND NOT EXISTS (
              SELECT 1 FROM `tabSales Invoice Item` sii_sub 
              WHERE sii_sub.parent = si.name AND sii_sub.custom_mining_trip IS NOT NULL AND sii_sub.custom_mining_trip != ''
          )
        
        UNION ALL
        
        -- Item-level trip link (multi-trip invoices or line-level trip attribution)
        SELECT 
            sii.custom_mining_trip AS trip_id,
            CASE WHEN si.is_return = 1 THEN -ABS(sii.base_net_amount) ELSE sii.base_net_amount END AS inv_amt,
            si.name AS inv_name
        FROM `tabSales Invoice Item` sii
        JOIN `tabSales Invoice` si ON si.name = sii.parent
        WHERE si.docstatus = 1
          AND sii.custom_mining_trip IS NOT NULL AND sii.custom_mining_trip != ''
          AND (si.custom_is_test_record = 0 OR si.custom_is_test_record IS NULL)
    ) trip_invoices
    GROUP BY trip_id
) rev ON rev.trip_id = mt.name
LEFT JOIN (
    SELECT mining_trip, SUM(posted_amount) AS direct_opex
    FROM `tabOperational Expense`
    WHERE approval_status = 'Approved' 
      AND accounting_status = 'Posted' 
      AND docstatus != 2
      AND mining_trip IS NOT NULL
      AND (is_test_record = 0 OR is_test_record IS NULL)
    GROUP BY mining_trip
) opex ON opex.mining_trip = mt.name
LEFT JOIN (
    SELECT related_trip, SUM(total_repair_cost) AS direct_repair
    FROM `tabVehicle Breakdown`
    WHERE resolution_type != 'Rejected'
      AND docstatus != 2
      AND related_trip IS NOT NULL
      AND (is_test_record = 0 OR is_test_record IS NULL)
    GROUP BY related_trip
) bkd ON bkd.related_trip = mt.name
WHERE (mt.is_test_record = 0 OR mt.is_test_record IS NULL)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR mt.vehicle = %(vehicle)s)
  AND (%(mine_site)s IS NULL OR %(mine_site)s = '' OR mt.mine_site = %(mine_site)s)
  AND (%(trip_status)s IS NULL OR %(trip_status)s = '' OR mt.trip_status = %(trip_status)s)
  AND (%(billing_status)s IS NULL OR %(billing_status)s = '' OR mt.billing_status = %(billing_status)s)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR DATE(mt.dispatch_date_time) >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR DATE(mt.dispatch_date_time) <= %(to_date)s)
ORDER BY mt.dispatch_date_time DESC"""
        },

        # 2. Vehicle-wise Revenue and Profitability
        {
            "report_name": "Vehicle-wise Revenue and Profitability",
            "ref_doctype": "Vehicle",
            "query": """SELECT
    v.name AS "Vehicle:Link/Vehicle:130",
    v.make AS "Make:Data:100",
    v.model AS "Model:Data:110",
    COALESCE(t.trip_count, 0) AS "Trips Count:Int:90",
    COALESCE(t.total_tons, 0.0) AS "Total Tons:Float:100",
    COALESCE(rev.invoiced_revenue, 0.0) AS "Invoiced Revenue:Currency:130",
    COALESCE(fuel.fuel_cost, 0.0) AS "Fuel Cost:Currency:120",
    COALESCE(maint.parts_cost, 0.0) AS "Parts Cost:Currency:110",
    COALESCE(maint.labour_cost, 0.0) AS "Labour Cost:Currency:110",
    COALESCE(maint.total_maint, 0.0) AS "Maintenance Cost:Currency:130",
    COALESCE(opex.vehicle_opex, 0.0) AS "Direct OpEx:Currency:120",
    COALESCE(ins.premium, 0.0) AS "Insurance:Currency:110",
    (COALESCE(fuel.fuel_cost, 0.0) + COALESCE(maint.total_maint, 0.0) + COALESCE(opex.vehicle_opex, 0.0) + COALESCE(ins.premium, 0.0)) AS "Total Operating Cost:Currency:140",
    (COALESCE(rev.invoiced_revenue, 0.0) - (COALESCE(fuel.fuel_cost, 0.0) + COALESCE(maint.total_maint, 0.0) + COALESCE(opex.vehicle_opex, 0.0) + COALESCE(ins.premium, 0.0))) AS "Net Contribution:Currency:130",
    CASE 
        WHEN COALESCE(rev.invoiced_revenue, 0.0) > 0 
        THEN ROUND(((COALESCE(rev.invoiced_revenue, 0.0) - (COALESCE(fuel.fuel_cost, 0.0) + COALESCE(maint.total_maint, 0.0) + COALESCE(opex.vehicle_opex, 0.0) + COALESCE(ins.premium, 0.0))) / rev.invoiced_revenue) * 100.0, 2)
        ELSE 0.0
    END AS "Operating Margin %%:Percent:110"
FROM `tabVehicle` v
LEFT JOIN (
    SELECT vehicle, COUNT(name) AS trip_count, SUM(COALESCE(net_weight_tons, 0.0)) AS total_tons
    FROM `tabMining Trip`
    WHERE (is_test_record = 0 OR is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR DATE(dispatch_date_time) >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR DATE(dispatch_date_time) <= %(to_date)s)
    GROUP BY vehicle
) t ON t.vehicle = v.name
LEFT JOIN (
    SELECT 
        vehicle_id,
        SUM(inv_amt) AS invoiced_revenue
    FROM (
        -- Header-level vehicle link (when items do NOT have specific item-level vehicle link)
        SELECT 
            si.custom_vehicle AS vehicle_id,
            CASE WHEN si.is_return = 1 THEN -ABS(si.base_grand_total) ELSE si.base_grand_total END AS inv_amt
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1
          AND si.custom_vehicle IS NOT NULL AND si.custom_vehicle != ''
          AND (si.custom_is_test_record = 0 OR si.custom_is_test_record IS NULL)
          AND (%(from_date)s IS NULL OR %(from_date)s = '' OR si.posting_date >= %(from_date)s)
          AND (%(to_date)s IS NULL OR %(to_date)s = '' OR si.posting_date <= %(to_date)s)
          AND NOT EXISTS (
              SELECT 1 FROM `tabSales Invoice Item` sii_sub 
              WHERE sii_sub.parent = si.name AND sii_sub.custom_vehicle IS NOT NULL AND sii_sub.custom_vehicle != ''
          )
        
        UNION ALL
        
        -- Item-level vehicle link (multi-vehicle invoices or line-level vehicle attribution)
        SELECT 
            sii.custom_vehicle AS vehicle_id,
            CASE WHEN si.is_return = 1 THEN -ABS(sii.base_net_amount) ELSE sii.base_net_amount END AS inv_amt
        FROM `tabSales Invoice Item` sii
        JOIN `tabSales Invoice` si ON si.name = sii.parent
        WHERE si.docstatus = 1
          AND sii.custom_vehicle IS NOT NULL AND sii.custom_vehicle != ''
          AND (si.custom_is_test_record = 0 OR si.custom_is_test_record IS NULL)
          AND (%(from_date)s IS NULL OR %(from_date)s = '' OR si.posting_date >= %(from_date)s)
          AND (%(to_date)s IS NULL OR %(to_date)s = '' OR si.posting_date <= %(to_date)s)
    ) veh_invoices
    GROUP BY vehicle_id
) rev ON rev.vehicle_id = v.name
LEFT JOIN (
    SELECT vehicle, SUM(total_fuel_cost) AS fuel_cost
    FROM `tabFuel Log`
    WHERE approval_status = 'Approved'
      AND (is_test_record = 0 OR is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR fuel_date >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR fuel_date <= %(to_date)s)
    GROUP BY vehicle
) fuel ON fuel.vehicle = v.name
LEFT JOIN (
    SELECT vehicle, SUM(parts_cost) AS parts_cost, SUM(labour_cost) AS labour_cost, SUM(total_repair_cost) AS total_maint
    FROM `tabVehicle Breakdown`
    WHERE resolution_type != 'Rejected'
      AND docstatus != 2
      AND (is_test_record = 0 OR is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR DATE(breakdown_datetime) >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR DATE(breakdown_datetime) <= %(to_date)s)
    GROUP BY vehicle
) maint ON maint.vehicle = v.name
LEFT JOIN (
    SELECT vehicle, SUM(posted_amount) AS vehicle_opex
    FROM `tabOperational Expense`
    WHERE approval_status = 'Approved'
      AND accounting_status = 'Posted'
      AND docstatus != 2
      AND vehicle IS NOT NULL
      AND (is_test_record = 0 OR is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR expense_date >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR expense_date <= %(to_date)s)
    GROUP BY vehicle
) opex ON opex.vehicle = v.name
LEFT JOIN (
    SELECT vehicle, SUM(premium_amount) AS premium
    FROM `tabVehicle Insurance Policy`
    WHERE policy_status = 'Active'
      AND (is_test_record = 0 OR is_test_record IS NULL)
    GROUP BY vehicle
) ins ON ins.vehicle = v.name
WHERE (v.is_test_record = 0 OR v.is_test_record IS NULL)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR v.name = %(vehicle)s)
  AND (%(make)s IS NULL OR %(make)s = '' OR v.make = %(make)s)
ORDER BY v.name ASC"""
        },

        # 3. Mine Site-wise Revenue and Profitability
        {
            "report_name": "Mine Site-wise Revenue and Profitability",
            "ref_doctype": "Mine Site",
            "query": """SELECT
    ms.name AS "Mine Site:Link/Mine Site:140",
    COALESCE(ms.client, '-') AS "Client:Link/Customer:140",
    ms.status AS "Status:Data:100",
    COALESCE(t.trip_count, 0) AS "Trips:Int:80",
    COALESCE(t.total_tons, 0.0) AS "Total Tons:Float:100",
    COALESCE(rev.invoiced_revenue, 0.0) AS "Invoiced Revenue:Currency:130",
    COALESCE(fuel.fuel_cost, 0.0) AS "Site Fuel Cost:Currency:120",
    COALESCE(bkd.repair_cost, 0.0) AS "Site Repair Cost:Currency:120",
    COALESCE(opex.site_opex, 0.0) AS "Site OpEx:Currency:120",
    (COALESCE(fuel.fuel_cost, 0.0) + COALESCE(bkd.repair_cost, 0.0) + COALESCE(opex.site_opex, 0.0)) AS "Total Site Cost:Currency:130",
    (COALESCE(rev.invoiced_revenue, 0.0) - (COALESCE(fuel.fuel_cost, 0.0) + COALESCE(bkd.repair_cost, 0.0) + COALESCE(opex.site_opex, 0.0))) AS "Site Contribution:Currency:130"
FROM `tabMine Site` ms
LEFT JOIN (
    SELECT mine_site, COUNT(name) AS trip_count, SUM(COALESCE(net_weight_tons, 0.0)) AS total_tons
    FROM `tabMining Trip`
    WHERE (is_test_record = 0 OR is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR DATE(dispatch_date_time) >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR DATE(dispatch_date_time) <= %(to_date)s)
    GROUP BY mine_site
) t ON t.mine_site = ms.name
LEFT JOIN (
    SELECT 
        site_id,
        SUM(inv_amt) AS invoiced_revenue
    FROM (
        -- Header-level site link (when items do NOT have specific item-level site link)
        SELECT 
            si.custom_mine_site AS site_id,
            CASE WHEN si.is_return = 1 THEN -ABS(si.base_grand_total) ELSE si.base_grand_total END AS inv_amt
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1
          AND si.custom_mine_site IS NOT NULL AND si.custom_mine_site != ''
          AND (si.custom_is_test_record = 0 OR si.custom_is_test_record IS NULL)
          AND (%(from_date)s IS NULL OR %(from_date)s = '' OR si.posting_date >= %(from_date)s)
          AND (%(to_date)s IS NULL OR %(to_date)s = '' OR si.posting_date <= %(to_date)s)
          AND NOT EXISTS (
              SELECT 1 FROM `tabSales Invoice Item` sii_sub 
              WHERE sii_sub.parent = si.name AND sii_sub.custom_mine_site IS NOT NULL AND sii_sub.custom_mine_site != ''
          )
        
        UNION ALL
        
        -- Item-level site link (multi-site invoices or line-level site attribution)
        SELECT 
            sii.custom_mine_site AS site_id,
            CASE WHEN si.is_return = 1 THEN -ABS(sii.base_net_amount) ELSE sii.base_net_amount END AS inv_amt
        FROM `tabSales Invoice Item` sii
        JOIN `tabSales Invoice` si ON si.name = sii.parent
        WHERE si.docstatus = 1
          AND sii.custom_mine_site IS NOT NULL AND sii.custom_mine_site != ''
          AND (si.custom_is_test_record = 0 OR si.custom_is_test_record IS NULL)
          AND (%(from_date)s IS NULL OR %(from_date)s = '' OR si.posting_date >= %(from_date)s)
          AND (%(to_date)s IS NULL OR %(to_date)s = '' OR si.posting_date <= %(to_date)s)
    ) site_invoices
    GROUP BY site_id
) rev ON rev.site_id = ms.name
LEFT JOIN (
    SELECT mine_site, SUM(total_fuel_cost) AS fuel_cost
    FROM `tabFuel Log`
    WHERE approval_status = 'Approved'
      AND (is_test_record = 0 OR is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR fuel_date >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR fuel_date <= %(to_date)s)
    GROUP BY mine_site
) fuel ON fuel.mine_site = ms.name
LEFT JOIN (
    SELECT mine_site, SUM(total_repair_cost) AS repair_cost
    FROM `tabVehicle Breakdown`
    WHERE resolution_type != 'Rejected'
      AND docstatus != 2
      AND (is_test_record = 0 OR is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR DATE(breakdown_datetime) >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR DATE(breakdown_datetime) <= %(to_date)s)
    GROUP BY mine_site
) bkd ON bkd.mine_site = ms.name
LEFT JOIN (
    SELECT mine_site, SUM(posted_amount) AS site_opex
    FROM `tabOperational Expense`
    WHERE approval_status = 'Approved'
      AND accounting_status = 'Posted'
      AND docstatus != 2
      AND mine_site IS NOT NULL
      AND (is_test_record = 0 OR is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR expense_date >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR expense_date <= %(to_date)s)
    GROUP BY mine_site
) opex ON opex.mine_site = ms.name
WHERE (ms.is_test_record = 0 OR ms.is_test_record IS NULL)
  AND (%(mine_site)s IS NULL OR %(mine_site)s = '' OR ms.name = %(mine_site)s)
  AND (%(customer)s IS NULL OR %(customer)s = '' OR ms.client = %(customer)s)
ORDER BY ms.name ASC"""
        },

        # 4. Customer-wise Revenue
        {
            "report_name": "Customer-wise Revenue",
            "ref_doctype": "Customer",
            "query": """SELECT
    c.name AS "Customer:Link/Customer:160",
    c.customer_group AS "Customer Group:Data:120",
    COUNT(si.name) AS "Invoices Count:Int:100",
    COALESCE(SUM(CASE WHEN si.is_return = 0 THEN si.base_grand_total ELSE 0 END), 0.0) AS "Gross Invoiced:Currency:130",
    COALESCE(SUM(CASE WHEN si.is_return = 1 THEN ABS(si.base_grand_total) ELSE 0 END), 0.0) AS "Credit Notes:Currency:120",
    COALESCE(SUM(CASE WHEN si.is_return = 0 THEN si.base_grand_total ELSE -ABS(si.base_grand_total) END), 0.0) AS "Net Revenue:Currency:130",
    COALESCE(SUM(si.base_paid_amount), 0.0) AS "Collected Amount:Currency:130",
    COALESCE(SUM(si.outstanding_amount), 0.0) AS "Outstanding Receivables:Currency:140"
FROM `tabCustomer` c
JOIN `tabSales Invoice` si ON si.customer = c.name AND si.docstatus = 1
WHERE (c.custom_is_test_record = 0 OR c.custom_is_test_record IS NULL)
  AND (si.custom_is_test_record = 0 OR si.custom_is_test_record IS NULL)
  AND (%(customer)s IS NULL OR %(customer)s = '' OR c.name = %(customer)s)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR si.posting_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR si.posting_date <= %(to_date)s)
GROUP BY c.name, c.customer_group
ORDER BY 6 DESC"""
        },

        # 5. Monthly Revenue Summary
        {
            "report_name": "Monthly Revenue Summary",
            "ref_doctype": "Sales Invoice",
            "query": """SELECT
    DATE_FORMAT(si.posting_date, '%%Y-%%m') AS "Month:Data:100",
    COUNT(si.name) AS "Invoices:Int:80",
    COALESCE(SUM(CASE WHEN si.is_return = 0 THEN si.base_grand_total ELSE 0 END), 0.0) AS "Gross Revenue:Currency:130",
    COALESCE(SUM(CASE WHEN si.is_return = 1 THEN ABS(si.base_grand_total) ELSE 0 END), 0.0) AS "Credit Notes:Currency:120",
    COALESCE(SUM(CASE WHEN si.is_return = 0 THEN si.base_grand_total ELSE -ABS(si.base_grand_total) END), 0.0) AS "Net Revenue:Currency:130",
    COALESCE(SUM(si.base_paid_amount), 0.0) AS "Collected:Currency:130",
    COALESCE(SUM(si.outstanding_amount), 0.0) AS "Outstanding:Currency:130"
FROM `tabSales Invoice` si
WHERE si.docstatus = 1
  AND (si.custom_is_test_record = 0 OR si.custom_is_test_record IS NULL)
  AND (%(year)s IS NULL OR %(year)s = '' OR YEAR(si.posting_date) = %(year)s)
  AND (%(customer)s IS NULL OR %(customer)s = '' OR si.customer = %(customer)s)
GROUP BY DATE_FORMAT(si.posting_date, '%%Y-%%m')
ORDER BY 1 DESC"""
        },

        # 6. Operating Cost Summary
        {
            "report_name": "Operating Cost Summary",
            "ref_doctype": "Operational Expense",
            "query": """SELECT
    cost_summary.category AS "Cost Category:Data:200",
    cost_summary.source_doctype AS "Source DocType:Data:160",
    cost_summary.txn_count AS "Transactions Count:Int:120",
    cost_summary.total_cost AS "Total Cost:Currency:140"
FROM (
    SELECT 
        'Fuel Consumption' AS category,
        'Fuel Log' AS source_doctype,
        COUNT(name) AS txn_count,
        COALESCE(SUM(total_fuel_cost), 0.0) AS total_cost
    FROM `tabFuel Log`
    WHERE approval_status = 'Approved'
      AND (is_test_record = 0 OR is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR fuel_date >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR fuel_date <= %(to_date)s)

    UNION ALL

    SELECT 
        'Maintenance Spare Parts' AS category,
        'Vehicle Breakdown' AS source_doctype,
        COUNT(name) AS txn_count,
        COALESCE(SUM(parts_cost), 0.0) AS total_cost
    FROM `tabVehicle Breakdown`
    WHERE resolution_type != 'Rejected'
      AND docstatus != 2
      AND parts_cost > 0
      AND (is_test_record = 0 OR is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR DATE(breakdown_datetime) >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR DATE(breakdown_datetime) <= %(to_date)s)

    UNION ALL

    SELECT 
        'Maintenance Labour & Repairs' AS category,
        'Vehicle Breakdown' AS source_doctype,
        COUNT(name) AS txn_count,
        COALESCE(SUM(labour_cost), 0.0) AS total_cost
    FROM `tabVehicle Breakdown`
    WHERE resolution_type != 'Rejected'
      AND docstatus != 2
      AND labour_cost > 0
      AND (is_test_record = 0 OR is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR DATE(breakdown_datetime) >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR DATE(breakdown_datetime) <= %(to_date)s)

    UNION ALL

    SELECT 
        'Direct Vehicle Operational Expenses' AS category,
        'Operational Expense' AS source_doctype,
        COUNT(name) AS txn_count,
        COALESCE(SUM(posted_amount), 0.0) AS total_cost
    FROM `tabOperational Expense`
    WHERE approval_status = 'Approved'
      AND accounting_status = 'Posted'
      AND docstatus != 2
      AND vehicle IS NOT NULL
      AND (is_test_record = 0 OR is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR expense_date >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR expense_date <= %(to_date)s)

    UNION ALL

    SELECT 
        'Unallocated / General Fleet Overheads' AS category,
        'Operational Expense' AS source_doctype,
        COUNT(name) AS txn_count,
        COALESCE(SUM(posted_amount), 0.0) AS total_cost
    FROM `tabOperational Expense`
    WHERE approval_status = 'Approved'
      AND accounting_status = 'Posted'
      AND docstatus != 2
      AND vehicle IS NULL AND mining_trip IS NULL AND mine_site IS NULL
      AND (is_test_record = 0 OR is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR expense_date >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR expense_date <= %(to_date)s)

    UNION ALL

    SELECT 
        'Fleet Insurance Premium' AS category,
        'Vehicle Insurance Policy' AS source_doctype,
        COUNT(name) AS txn_count,
        COALESCE(SUM(premium_amount), 0.0) AS total_cost
    FROM `tabVehicle Insurance Policy`
    WHERE policy_status = 'Active'
      AND (is_test_record = 0 OR is_test_record IS NULL)
) cost_summary
WHERE cost_summary.total_cost > 0
ORDER BY cost_summary.total_cost DESC"""
        },

        # 7. Vehicle Operating Cost Analysis
        {
            "report_name": "Vehicle Operating Cost Analysis",
            "ref_doctype": "Vehicle",
            "query": """SELECT
    v.name AS "Vehicle:Link/Vehicle:130",
    v.make AS "Make:Data:100",
    v.model AS "Model:Data:110",
    COALESCE(odo.distance_km, 0) AS "Distance Run (KM):Int:110",
    COALESCE(fuel.fuel_cost, 0.0) AS "Fuel Cost:Currency:120",
    COALESCE(maint.parts_cost, 0.0) AS "Parts Cost:Currency:110",
    COALESCE(maint.labour_cost, 0.0) AS "Labour Cost:Currency:110",
    COALESCE(opex.vehicle_opex, 0.0) AS "Direct OpEx:Currency:110",
    COALESCE(ins.premium, 0.0) AS "Insurance:Currency:110",
    (COALESCE(fuel.fuel_cost, 0.0) + COALESCE(maint.parts_cost, 0.0) + COALESCE(maint.labour_cost, 0.0) + COALESCE(opex.vehicle_opex, 0.0) + COALESCE(ins.premium, 0.0)) AS "Total Vehicle Cost:Currency:140",
    CASE 
        WHEN COALESCE(odo.distance_km, 0) > 0 
        THEN ROUND((COALESCE(fuel.fuel_cost, 0.0) + COALESCE(maint.parts_cost, 0.0) + COALESCE(maint.labour_cost, 0.0) + COALESCE(opex.vehicle_opex, 0.0) + COALESCE(ins.premium, 0.0)) / odo.distance_km, 2)
        ELSE 0.0
    END AS "Cost per KM:Currency:110"
FROM `tabVehicle` v
LEFT JOIN (
    SELECT vehicle, SUM(distance_travelled_km) AS distance_km
    FROM `tabFuel Log`
    WHERE approval_status = 'Approved'
      AND (is_test_record = 0 OR is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR fuel_date >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR fuel_date <= %(to_date)s)
    GROUP BY vehicle
) odo ON odo.vehicle = v.name
LEFT JOIN (
    SELECT vehicle, SUM(total_fuel_cost) AS fuel_cost
    FROM `tabFuel Log`
    WHERE approval_status = 'Approved'
      AND (is_test_record = 0 OR is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR fuel_date >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR fuel_date <= %(to_date)s)
    GROUP BY vehicle
) fuel ON fuel.vehicle = v.name
LEFT JOIN (
    SELECT vehicle, SUM(parts_cost) AS parts_cost, SUM(labour_cost) AS labour_cost
    FROM `tabVehicle Breakdown`
    WHERE resolution_type != 'Rejected'
      AND docstatus != 2
      AND (is_test_record = 0 OR is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR DATE(breakdown_datetime) >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR DATE(breakdown_datetime) <= %(to_date)s)
    GROUP BY vehicle
) maint ON maint.vehicle = v.name
LEFT JOIN (
    SELECT vehicle, SUM(posted_amount) AS vehicle_opex
    FROM `tabOperational Expense`
    WHERE approval_status = 'Approved'
      AND accounting_status = 'Posted'
      AND docstatus != 2
      AND vehicle IS NOT NULL
      AND (is_test_record = 0 OR is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR expense_date >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR expense_date <= %(to_date)s)
    GROUP BY vehicle
) opex ON opex.vehicle = v.name
LEFT JOIN (
    SELECT vehicle, SUM(premium_amount) AS premium
    FROM `tabVehicle Insurance Policy`
    WHERE policy_status = 'Active'
      AND (is_test_record = 0 OR is_test_record IS NULL)
    GROUP BY vehicle
) ins ON ins.vehicle = v.name
WHERE (v.is_test_record = 0 OR v.is_test_record IS NULL)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR v.name = %(vehicle)s)
ORDER BY v.name ASC"""
        },

        # 8. Revenue vs Cost Analysis
        {
            "report_name": "Revenue vs Cost Analysis",
            "ref_doctype": "Sales Invoice",
            "query": """SELECT
    'Vehicle' AS "Entity Type:Data:100",
    v.name AS "Entity Name:Data:140",
    COALESCE(rev.invoiced_revenue, 0.0) AS "Invoiced Revenue:Currency:130",
    COALESCE(fuel.fuel_cost, 0.0) AS "Fuel Cost:Currency:120",
    COALESCE(maint.total_maint, 0.0) AS "Maintenance Cost:Currency:120",
    COALESCE(opex.vehicle_opex, 0.0) AS "Operational Expenses:Currency:120",
    (COALESCE(fuel.fuel_cost, 0.0) + COALESCE(maint.total_maint, 0.0) + COALESCE(opex.vehicle_opex, 0.0)) AS "Total Identifiable Cost:Currency:140",
    (COALESCE(rev.invoiced_revenue, 0.0) - (COALESCE(fuel.fuel_cost, 0.0) + COALESCE(maint.total_maint, 0.0) + COALESCE(opex.vehicle_opex, 0.0))) AS "Operating Margin / Profit:Currency:140",
    CASE 
        WHEN COALESCE(rev.invoiced_revenue, 0.0) > 0 
        THEN ROUND(((COALESCE(fuel.fuel_cost, 0.0) + COALESCE(maint.total_maint, 0.0) + COALESCE(opex.vehicle_opex, 0.0)) / rev.invoiced_revenue) * 100.0, 2)
        ELSE 0.0
    END AS "Cost-to-Revenue Ratio %%:Percent:130"
FROM `tabVehicle` v
LEFT JOIN (
    SELECT 
        vehicle_id,
        SUM(inv_amt) AS invoiced_revenue
    FROM (
        -- Header-level vehicle link (when items do NOT have specific item-level vehicle link)
        SELECT 
            si.custom_vehicle AS vehicle_id,
            CASE WHEN si.is_return = 1 THEN -ABS(si.base_grand_total) ELSE si.base_grand_total END AS inv_amt
        FROM `tabSales Invoice` si
        WHERE si.docstatus = 1
          AND si.custom_vehicle IS NOT NULL AND si.custom_vehicle != ''
          AND (si.custom_is_test_record = 0 OR si.custom_is_test_record IS NULL)
          AND (%(from_date)s IS NULL OR %(from_date)s = '' OR si.posting_date >= %(from_date)s)
          AND (%(to_date)s IS NULL OR %(to_date)s = '' OR si.posting_date <= %(to_date)s)
          AND NOT EXISTS (
              SELECT 1 FROM `tabSales Invoice Item` sii_sub 
              WHERE sii_sub.parent = si.name AND sii_sub.custom_vehicle IS NOT NULL AND sii_sub.custom_vehicle != ''
          )
        
        UNION ALL
        
        -- Item-level vehicle link (multi-vehicle invoices or line-level vehicle attribution)
        SELECT 
            sii.custom_vehicle AS vehicle_id,
            CASE WHEN si.is_return = 1 THEN -ABS(sii.base_net_amount) ELSE sii.base_net_amount END AS inv_amt
        FROM `tabSales Invoice Item` sii
        JOIN `tabSales Invoice` si ON si.name = sii.parent
        WHERE si.docstatus = 1
          AND sii.custom_vehicle IS NOT NULL AND sii.custom_vehicle != ''
          AND (si.custom_is_test_record = 0 OR si.custom_is_test_record IS NULL)
          AND (%(from_date)s IS NULL OR %(from_date)s = '' OR si.posting_date >= %(from_date)s)
          AND (%(to_date)s IS NULL OR %(to_date)s = '' OR si.posting_date <= %(to_date)s)
    ) veh_invoices
    GROUP BY vehicle_id
) rev ON rev.vehicle_id = v.name
LEFT JOIN (
    SELECT vehicle, SUM(total_fuel_cost) AS fuel_cost
    FROM `tabFuel Log`
    WHERE approval_status = 'Approved'
      AND (is_test_record = 0 OR is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR fuel_date >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR fuel_date <= %(to_date)s)
    GROUP BY vehicle
) fuel ON fuel.vehicle = v.name
LEFT JOIN (
    SELECT vehicle, SUM(total_repair_cost) AS total_maint
    FROM `tabVehicle Breakdown`
    WHERE resolution_type != 'Rejected'
      AND docstatus != 2
      AND (is_test_record = 0 OR is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR DATE(breakdown_datetime) >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR DATE(breakdown_datetime) <= %(to_date)s)
    GROUP BY vehicle
) maint ON maint.vehicle = v.name
LEFT JOIN (
    SELECT vehicle, SUM(posted_amount) AS vehicle_opex
    FROM `tabOperational Expense`
    WHERE approval_status = 'Approved'
      AND accounting_status = 'Posted'
      AND docstatus != 2
      AND vehicle IS NOT NULL
      AND (is_test_record = 0 OR is_test_record IS NULL)
      AND (%(from_date)s IS NULL OR %(from_date)s = '' OR expense_date >= %(from_date)s)
      AND (%(to_date)s IS NULL OR %(to_date)s = '' OR expense_date <= %(to_date)s)
    GROUP BY vehicle
) opex ON opex.vehicle = v.name
WHERE (v.is_test_record = 0 OR v.is_test_record IS NULL)
  AND (%(vehicle)s IS NULL OR %(vehicle)s = '' OR v.name = %(vehicle)s)
  AND (COALESCE(rev.invoiced_revenue, 0.0) > 0 OR COALESCE(fuel.fuel_cost, 0.0) > 0 OR COALESCE(maint.total_maint, 0.0) > 0 OR COALESCE(opex.vehicle_opex, 0.0) > 0)
ORDER BY 8 DESC"""
        },

        # 9. Outstanding Revenue / Receivables
        {
            "report_name": "Outstanding Revenue / Receivables",
            "ref_doctype": "Sales Invoice",
            "query": """SELECT
    si.name AS "Invoice No:Link/Sales Invoice:140",
    si.posting_date AS "Posting Date:Date:100",
    si.customer AS "Customer:Link/Customer:150",
    si.due_date AS "Due Date:Date:100",
    si.base_grand_total AS "Grand Total:Currency:120",
    si.base_paid_amount AS "Paid Amount:Currency:120",
    si.outstanding_amount AS "Outstanding Amount:Currency:130",
    CASE 
        WHEN si.due_date IS NOT NULL AND CURDATE() > si.due_date THEN DATEDIFF(CURDATE(), si.due_date)
        ELSE 0 
    END AS "Days Overdue:Int:100",
    si.status AS "Invoice Status:Data:110",
    COALESCE(si.custom_mining_trip, '-') AS "Mining Trip:Link/Mining Trip:130",
    COALESCE(si.custom_vehicle, '-') AS "Vehicle:Link/Vehicle:120"
FROM `tabSales Invoice` si
WHERE si.docstatus = 1
  AND si.outstanding_amount > 0
  AND (si.custom_is_test_record = 0 OR si.custom_is_test_record IS NULL)
  AND (%(customer)s IS NULL OR %(customer)s = '' OR si.customer = %(customer)s)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR si.posting_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR si.posting_date <= %(to_date)s)
ORDER BY si.due_date ASC"""
        },

        # 10. Unallocated Cost Register
        {
            "report_name": "Unallocated Cost Register",
            "ref_doctype": "Operational Expense",
            "query": """SELECT
    oe.name AS "Expense ID:Link/Operational Expense:140",
    oe.expense_date AS "Expense Date:Date:100",
    oe.expense_category AS "Expense Category:Data:140",
    oe.posted_amount AS "Amount:Currency:120",
    oe.description AS "Description:Data:200",
    COALESCE(oe.cost_center, '-') AS "Cost Center:Link/Cost Center:130",
    COALESCE(oe.payment_method, '-') AS "Payment Method:Link/Payment Method:130",
    COALESCE(oe.payment_account, '-') AS "Payment Account:Link/Account:160",
    oe.accounting_status AS "Accounting Status:Data:120",
    COALESCE(oe.posting_document_name, '-') AS "Posting Doc:Data:140",
    COALESCE(oe.approved_by, '-') AS "Approved By:Link/User:140"
FROM `tabOperational Expense` oe
WHERE oe.approval_status = 'Approved'
  AND oe.accounting_status = 'Posted'
  AND oe.docstatus != 2
  AND oe.vehicle IS NULL 
  AND oe.mining_trip IS NULL 
  AND oe.mine_site IS NULL
  AND (oe.is_test_record = 0 OR oe.is_test_record IS NULL)
  AND (%(expense_category)s IS NULL OR %(expense_category)s = '' OR oe.expense_category = %(expense_category)s)
  AND (%(from_date)s IS NULL OR %(from_date)s = '' OR oe.expense_date >= %(from_date)s)
  AND (%(to_date)s IS NULL OR %(to_date)s = '' OR oe.expense_date <= %(to_date)s)
ORDER BY oe.expense_date DESC"""
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
            r.disabled = 0
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
                "disabled": 0
            }).insert(ignore_permissions=True)
            print(f"Created Report: {r_name}")

    frappe.clear_cache()
    frappe.db.commit()
    print("=== ALL 10 ENHANCED BATCH 9 QUERY REPORTS CONFIGURED SUCCESSFULLY ===")

if __name__ == "__main__":
    create_reports()
