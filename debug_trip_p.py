import frappe
from frappe.utils import flt

def run():
    # Find any existing test trips
    trips = frappe.db.sql("SELECT name FROM `tabMining Trip` WHERE is_test_record = 1 ORDER BY creation DESC LIMIT 3", as_dict=True)
    for t in trips:
        trip_name = t.name
        trip_p = frappe.db.sql("""
            SELECT 
                si.name AS si_name,
                si.base_grand_total AS inv_rev,
                COALESCE(opex.direct_opex, 0.0) AS opex,
                COALESCE(bkd.direct_repair, 0.0) AS repair,
                (COALESCE(opex.direct_opex, 0.0) + COALESCE(bkd.direct_repair, 0.0)) AS total_cost,
                (COALESCE(si.base_grand_total, 0.0) - (COALESCE(opex.direct_opex, 0.0) + COALESCE(bkd.direct_repair, 0.0))) AS contribution
            FROM `tabMining Trip` mt
            LEFT JOIN `tabSales Invoice` si ON (si.custom_mining_trip = mt.name OR si.name = mt.sales_invoice) AND si.docstatus = 1 AND si.is_return = 0
            LEFT JOIN (
                SELECT mining_trip, SUM(posted_amount) AS direct_opex
                FROM `tabOperational Expense`
                WHERE approval_status = 'Approved' AND accounting_status = 'Posted' AND docstatus != 2
                GROUP BY mining_trip
            ) opex ON opex.mining_trip = mt.name
            LEFT JOIN (
                SELECT related_trip, SUM(total_repair_cost) AS direct_repair
                FROM `tabVehicle Breakdown`
                WHERE resolution_type != 'Rejected' AND docstatus != 2
                GROUP BY related_trip
            ) bkd ON bkd.related_trip = mt.name
            WHERE mt.name = %s
        """, (trip_name,), as_dict=True)
        print(f"Trip: {trip_name}, trip_p: {trip_p}")

if __name__ == "__main__":
    run()

