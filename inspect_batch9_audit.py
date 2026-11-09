import frappe

def run():
    # Let's inspect t1 and any sales invoices in DB
    trips = frappe.db.get_all("Mining Trip", filters={"is_test_record": 1}, fields=["name", "sales_invoice", "billing_status"])
    print("Test Trips:", trips)
    for t in trips:
        invs = frappe.db.sql("""
            SELECT DISTINCT si.name, si.docstatus, si.custom_mining_trip, si.outstanding_amount, si.base_grand_total
            FROM `tabSales Invoice` si
            LEFT JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
            WHERE (si.custom_mining_trip = %s OR sii.custom_mining_trip = %s)
        """, (t.name, t.name), as_dict=True)
        print(f"Invoices for {t.name}:", invs)

if __name__ == "__main__":
    run()
