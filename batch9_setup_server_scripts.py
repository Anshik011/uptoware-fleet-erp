import frappe

def run():
    print("=== DEPLOYING ENHANCED BATCH 9 FINANCIAL INTEGRITY SERVER SCRIPTS ===")

    scripts = [
        {
            "name": "Sales Invoice - Fleet Operations & Revenue Sync",
            "script_type": "DocType Event",
            "reference_doctype": "Sales Invoice",
            "doctype_event": "Before Save",
            "script": """# 1. Test record quarantine propagation (Header level)
if doc.custom_mining_trip:
    t_is_test = frappe.db.get_value("Mining Trip", doc.custom_mining_trip, "is_test_record")
    if t_is_test:
        doc.custom_is_test_record = 1

if doc.custom_vehicle and not doc.custom_is_test_record:
    v_is_test = frappe.db.get_value("Vehicle", doc.custom_vehicle, "is_test_record")
    if v_is_test:
        doc.custom_is_test_record = 1

if doc.customer and not doc.custom_is_test_record:
    c_is_test = frappe.db.get_value("Customer", doc.customer, "custom_is_test_record")
    if c_is_test:
        doc.custom_is_test_record = 1

# 2. Auto-populate vehicle and mine_site from header mining_trip if not set
if doc.custom_mining_trip:
    trip_data = frappe.db.get_value("Mining Trip", doc.custom_mining_trip, ["vehicle", "mine_site", "trip_status"], as_dict=True)
    if trip_data:
        if not doc.custom_vehicle:
            doc.custom_vehicle = trip_data.vehicle
        if not doc.custom_mine_site:
            doc.custom_mine_site = trip_data.mine_site
        
        # Gating: Only Approved or Delivered trips can be commercially invoiced
        if trip_data.trip_status not in ["Approved", "Delivered"]:
            frappe.throw(f"Cannot invoice Mining Trip '{doc.custom_mining_trip}': Trip status is '{trip_data.trip_status}'. Only Approved or Delivered trips can be commercially invoiced.")

# 3. Check and propagate line items (supports multi-trip invoices)
if doc.items:
    for item in doc.items:
        # If item specifies a trip, validate and propagate attribution
        if item.custom_mining_trip:
            itm_trip_data = frappe.db.get_value("Mining Trip", item.custom_mining_trip, ["vehicle", "mine_site", "trip_status", "is_test_record"], as_dict=True)
            if itm_trip_data:
                if itm_trip_data.is_test_record:
                    doc.custom_is_test_record = 1
                if not item.custom_vehicle:
                    item.custom_vehicle = itm_trip_data.vehicle
                if not item.custom_mine_site:
                    item.custom_mine_site = itm_trip_data.mine_site
                if itm_trip_data.trip_status not in ["Approved", "Delivered"]:
                    frappe.throw(f"Cannot invoice line item for Mining Trip '{item.custom_mining_trip}': Trip status is '{itm_trip_data.trip_status}'. Only Approved or Delivered trips can be commercially invoiced.")
        # If item doesn't specify a trip, but header does, inherit from header
        elif doc.custom_mining_trip:
            item.custom_mining_trip = doc.custom_mining_trip
            if not item.custom_vehicle and doc.custom_vehicle:
                item.custom_vehicle = doc.custom_vehicle
            if not item.custom_mine_site and doc.custom_mine_site:
                item.custom_mine_site = doc.custom_mine_site
"""
        },
        {
            "name": "Sales Invoice - Revenue & Trip Status Submission Sync",
            "script_type": "DocType Event",
            "reference_doctype": "Sales Invoice",
            "doctype_event": "After Submit",
            "script": """# Collect all trips linked to this submitted invoice (header and line items)
trips_to_update = set()
if doc.custom_mining_trip:
    trips_to_update.add(doc.custom_mining_trip)

if doc.items:
    for itm in doc.items:
        if itm.custom_mining_trip:
            trips_to_update.add(itm.custom_mining_trip)

for trip_name in trips_to_update:
    if frappe.db.exists("Mining Trip", trip_name):
        # Query all active submitted invoices linked to this trip
        active_invoices = frappe.db.sql(\"\"\"
            SELECT DISTINCT si.name, si.outstanding_amount, si.base_grand_total
            FROM `tabSales Invoice` si
            LEFT JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
            WHERE si.docstatus = 1
              AND (si.custom_mining_trip = %s OR sii.custom_mining_trip = %s)
        \"\"\", (trip_name, trip_name), as_dict=True)

        if active_invoices:
            total_out = sum(float(inv.outstanding_amount or 0.0) for inv in active_invoices)
            total_grand = sum(float(inv.base_grand_total or 0.0) for inv in active_invoices)
            if total_out <= 0:
                b_status = "Paid"
            elif total_out < total_grand:
                b_status = "Partially Paid"
            else:
                b_status = "Invoiced"
        else:
            b_status = "Paid" if doc.outstanding_amount == 0 else "Invoiced"

        frappe.db.set_value("Mining Trip", trip_name, {
            "sales_invoice": doc.name,
            "billing_status": b_status
        }, update_modified=False)
"""
        },
        {
            "name": "Sales Invoice - Revenue & Trip Status Cancellation Sync",
            "script_type": "DocType Event",
            "reference_doctype": "Sales Invoice",
            "doctype_event": "After Cancel",
            "script": """# Collect all trips linked to this cancelled invoice (header and line items)
trips_to_check = set()
if doc.custom_mining_trip:
    trips_to_check.add(doc.custom_mining_trip)

if doc.items:
    for itm in doc.items:
        if itm.custom_mining_trip:
            trips_to_check.add(itm.custom_mining_trip)

for trip_name in trips_to_check:
    if frappe.db.exists("Mining Trip", trip_name):
        # Query remaining active submitted invoices linked to this trip (excluding the cancelling invoice)
        remaining_invoices = frappe.db.sql(\"\"\"
            SELECT DISTINCT si.name, si.outstanding_amount, si.base_grand_total
            FROM `tabSales Invoice` si
            LEFT JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
            WHERE si.docstatus = 1
              AND si.name != %s
              AND (si.custom_mining_trip = %s OR sii.custom_mining_trip = %s)
        \"\"\", (doc.name, trip_name, trip_name), as_dict=True)

        if remaining_invoices:
            # Other active invoices remain! Do NOT erase billing relationships!
            total_out = sum(float(inv.outstanding_amount or 0.0) for inv in remaining_invoices)
            total_grand = sum(float(inv.base_grand_total or 0.0) for inv in remaining_invoices)
            if total_out <= 0:
                rem_status = "Paid"
            elif total_out < total_grand:
                rem_status = "Partially Paid"
            else:
                rem_status = "Invoiced"

            # Retain link to the most recent remaining active invoice
            latest_active_inv = remaining_invoices[-1].name
            frappe.db.set_value("Mining Trip", trip_name, {
                "sales_invoice": latest_active_inv,
                "billing_status": rem_status
            }, update_modified=False)
        else:
            # Truly no active invoices remaining -> Reset to Unbilled
            frappe.db.set_value("Mining Trip", trip_name, {
                "sales_invoice": None,
                "billing_status": "Unbilled"
            }, update_modified=False)
"""
        },
        {
            "name": "Payment Entry - Sales Invoice & Trip Revenue Settlement",
            "script_type": "DocType Event",
            "reference_doctype": "Payment Entry",
            "doctype_event": "After Submit",
            "script": """# Sync customer payment receipt to linked Sales Invoices and Mining Trips
if doc.payment_type == "Receive" and doc.references:
    trips_to_sync = set()
    for ref in doc.references:
        if ref.reference_doctype == "Sales Invoice":
            # Header trip
            h_trip = frappe.db.get_value("Sales Invoice", ref.reference_name, "custom_mining_trip")
            if h_trip:
                trips_to_sync.add(h_trip)
            # Item trips
            item_trips = frappe.db.get_all("Sales Invoice Item", filters={"parent": ref.reference_name}, pluck="custom_mining_trip")
            for itrip in item_trips:
                if itrip:
                    trips_to_sync.add(itrip)

    for trip_name in trips_to_sync:
        if frappe.db.exists("Mining Trip", trip_name):
            active_invoices = frappe.db.sql(\"\"\"
                SELECT DISTINCT si.name, si.outstanding_amount, si.base_grand_total
                FROM `tabSales Invoice` si
                LEFT JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
                WHERE si.docstatus = 1
                  AND (si.custom_mining_trip = %s OR sii.custom_mining_trip = %s)
            \"\"\", (trip_name, trip_name), as_dict=True)

            if active_invoices:
                total_out = sum(float(inv.outstanding_amount or 0.0) for inv in active_invoices)
                total_grand = sum(float(inv.base_grand_total or 0.0) for inv in active_invoices)
                if total_out <= 0:
                    new_status = "Paid"
                elif total_out < total_grand:
                    new_status = "Partially Paid"
                else:
                    new_status = "Invoiced"
                frappe.db.set_value("Mining Trip", trip_name, "billing_status", new_status, update_modified=False)
"""
        },
        {
            "name": "Payment Entry - Sales Invoice & Trip Revenue Settlement Reversal",
            "script_type": "DocType Event",
            "reference_doctype": "Payment Entry",
            "doctype_event": "After Cancel",
            "script": """# Revert billing status on cancellation of payment
if doc.payment_type == "Receive" and doc.references:
    trips_to_sync = set()
    for ref in doc.references:
        if ref.reference_doctype == "Sales Invoice":
            h_trip = frappe.db.get_value("Sales Invoice", ref.reference_name, "custom_mining_trip")
            if h_trip:
                trips_to_sync.add(h_trip)
            item_trips = frappe.db.get_all("Sales Invoice Item", filters={"parent": ref.reference_name}, pluck="custom_mining_trip")
            for itrip in item_trips:
                if itrip:
                    trips_to_sync.add(itrip)

    for trip_name in trips_to_sync:
        if frappe.db.exists("Mining Trip", trip_name):
            active_invoices = frappe.db.sql(\"\"\"
                SELECT DISTINCT si.name, si.outstanding_amount, si.base_grand_total
                FROM `tabSales Invoice` si
                LEFT JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
                WHERE si.docstatus = 1
                  AND (si.custom_mining_trip = %s OR sii.custom_mining_trip = %s)
            \"\"\", (trip_name, trip_name), as_dict=True)

            if active_invoices:
                total_out = sum(float(inv.outstanding_amount or 0.0) for inv in active_invoices)
                total_grand = sum(float(inv.base_grand_total or 0.0) for inv in active_invoices)
                if total_out <= 0:
                    new_status = "Paid"
                elif total_out < total_grand:
                    new_status = "Partially Paid"
                else:
                    new_status = "Invoiced"
                frappe.db.set_value("Mining Trip", trip_name, "billing_status", new_status, update_modified=False)
"""
        }
    ]

    for s_dict in scripts:
        s_name = s_dict["name"]
        if frappe.db.exists("Server Script", s_name):
            doc = frappe.get_doc("Server Script", s_name)
            doc.script = s_dict["script"]
            doc.script_type = s_dict["script_type"]
            doc.reference_doctype = s_dict["reference_doctype"]
            doc.doctype_event = s_dict["doctype_event"]
            doc.disabled = 0
            doc.save(ignore_permissions=True)
            print(f"Updated Server Script: {s_name}")
        else:
            doc = frappe.get_doc({
                "doctype": "Server Script",
                "name": s_name,
                "script_type": s_dict["script_type"],
                "reference_doctype": s_dict["reference_doctype"],
                "doctype_event": s_dict["doctype_event"],
                "script": s_dict["script"],
                "disabled": 0
            }).insert(ignore_permissions=True)
            print(f"Created Server Script: {s_name}")

    # Enforce read_only on Mining Trip billing_status
    dt = frappe.get_doc("DocType", "Mining Trip")
    for f in dt.fields:
        if f.fieldname in ["sales_invoice", "billing_status"]:
            f.read_only = 1
    dt.save(ignore_permissions=True)
    print("Enforced read_only on Mining Trip.sales_invoice and Mining Trip.billing_status")

    frappe.clear_cache()
    frappe.db.commit()
    print("=== SERVER SCRIPTS CONFIGURED & COMMITTED SUCCESSFULLY ===")

if __name__ == "__main__":
    run()
