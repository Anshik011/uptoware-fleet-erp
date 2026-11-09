import frappe
from frappe.utils import flt, today, now_datetime
from frappe.desk.query_report import run as run_report

def run():
    import frappe
    from frappe.utils import flt, today, now_datetime
    from frappe.desk.query_report import run as run_report
    print("=== DEMONSTRATING CURRENT RETURN LINKAGE & STOCK MOVEMENT AUDIT ===")

    company = "Uptoware"
    curr_date = today()
    wh_stores = "Stores - U"

    # 1. Setup Vehicle, Driver, Item
    ts = now_datetime().strftime('%H%M%S')
    test_veh = f"RET-VEH-{ts}"
    v = frappe.get_doc({
        "doctype": "Vehicle",
        "license_plate": test_veh,
        "make": "Tata",
        "model": "Prima",
        "last_odometer": 30000,
        "uom": "Nos",
        "vehicle_status": "Active",
        "is_test_record": 1
    }).insert(ignore_permissions=True)

    test_driver = f"RET-DRV-{ts}"
    d = frappe.get_doc({
        "doctype": "Driver",
        "full_name": test_driver,
        "status": "Active",
        "license_number": f"DL-RET-{ts}",
        "is_test_record": 1
    }).insert(ignore_permissions=True)

    test_item = f"RET-PART-{ts}"
    it = frappe.get_doc({
        "doctype": "Item",
        "item_code": test_item,
        "item_name": "Return Audit Test Part",
        "item_group": "Filters and Lubricants",
        "stock_uom": "Nos",
        "is_stock_item": 1,
        "valuation_rate": 500.0,
        "custom_is_test_record": 1
    }).insert(ignore_permissions=True)

    # Initial stock receipt of 10 units
    se_rec = frappe.get_doc({
        "doctype": "Stock Entry",
        "stock_entry_type": "Material Receipt",
        "company": company,
        "to_warehouse": wh_stores,
        "items": [{
            "item_code": test_item,
            "qty": 10.0,
            "t_warehouse": wh_stores,
            "basic_rate": 500.0,
            "cost_center": "Main - U"
        }]
    }).insert(ignore_permissions=True)
    se_rec.submit()

    # 2. Create Breakdown with planned qty = 6.0
    bkd = frappe.get_doc({
        "doctype": "Vehicle Breakdown",
        "breakdown_datetime": f"{curr_date} 10:00:00",
        "vehicle": test_veh,
        "driver": d.name,
        "odometer_reading": 30100,
        "breakdown_type": "Engine",
        "severity": "Critical",
        "description": "Return linkage audit",
        "parts_table": [{
            "item_code": test_item,
            "planned_qty": 6.0,
            "warehouse": wh_stores
        }],
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    from frappe.model.workflow import apply_workflow
    apply_workflow(bkd, "Approve")
    apply_workflow(bkd, "Send to Workshop")

    # Issue 1: 2 units (Voucher 1)
    se_iss1 = frappe.get_doc({
        "doctype": "Stock Entry",
        "stock_entry_type": "Material Issue",
        "company": company,
        "custom_vehicle_breakdown": bkd.name,
        "custom_vehicle": test_veh,
        "items": [{
            "item_code": test_item,
            "qty": 2.0,
            "s_warehouse": wh_stores,
            "basic_rate": 500.0,
            "cost_center": "Main - U"
        }]
    }).insert(ignore_permissions=True)
    se_iss1.submit()
    print(f"Submitted Issue 1 ({se_iss1.name}): 2.0 units issued.")

    # Issue 2: 3 units (Voucher 2)
    se_iss2 = frappe.get_doc({
        "doctype": "Stock Entry",
        "stock_entry_type": "Material Issue",
        "company": company,
        "custom_vehicle_breakdown": bkd.name,
        "custom_vehicle": test_veh,
        "items": [{
            "item_code": test_item,
            "qty": 3.0,
            "s_warehouse": wh_stores,
            "basic_rate": 500.0,
            "cost_center": "Main - U"
        }]
    }).insert(ignore_permissions=True)
    se_iss2.submit()
    print(f"Submitted Issue 2 ({se_iss2.name}): 3.0 units issued.")

    bkd.reload()
    print(f"Breakdown Parts Table: Issued Qty = {bkd.parts_table[0].issued_qty}, Net Issued = {bkd.parts_table[0].net_issued_qty}, Parts Cost = {bkd.parts_cost}")

    # Return 4 units (Exceeds Issue 2's 3 units, but within total net issued of 5 units)
    # Notice: In current architecture, this succeeds because return links to Breakdown, not Voucher 2!
    se_ret = frappe.get_doc({
        "doctype": "Stock Entry",
        "stock_entry_type": "Material Receipt",
        "custom_is_return": 1,
        "company": company,
        "custom_vehicle_breakdown": bkd.name,
        "custom_vehicle": test_veh,
        "items": [{
            "item_code": test_item,
            "qty": 4.0,
            "t_warehouse": wh_stores,
            "basic_rate": 500.0,
            "cost_center": "Main - U"
        }]
    }).insert(ignore_permissions=True)
    se_ret.submit()
    print(f"Submitted Return ({se_ret.name}): 4.0 units returned against Breakdown '{bkd.name}'.")

    bkd.reload()
    print(f"Breakdown After Return: Issued Qty = {bkd.parts_table[0].issued_qty}, Returned Qty = {bkd.parts_table[0].returned_qty}, Net Issued = {bkd.parts_table[0].net_issued_qty}, Parts Cost = {bkd.parts_cost}")

    # Attempt to return 2 more units (Total return would become 6.0 vs 5.0 net issued) -> Must be blocked!
    blocked_excess_return = False
    try:
        se_ret_excess = frappe.get_doc({
            "doctype": "Stock Entry",
            "stock_entry_type": "Material Receipt",
            "custom_is_return": 1,
            "company": company,
            "custom_vehicle_breakdown": bkd.name,
            "custom_vehicle": test_veh,
            "items": [{
                "item_code": test_item,
                "qty": 2.0,
                "t_warehouse": wh_stores,
                "basic_rate": 500.0,
                "cost_center": "Main - U"
            }]
        }).insert(ignore_permissions=True)
        se_ret_excess.submit()
    except Exception as e:
        print(f"Excess Return Blocked: {e}")
        blocked_excess_return = True

    # Check Cancelled Stock Entry & Stock Ledger
    se_iss2.cancel()
    print(f"Cancelled Issue 2 ({se_iss2.name}).")

    # Inspect SLEs for se_iss2
    sles = frappe.db.sql("""
        SELECT name, actual_qty, qty_after_transaction, is_cancelled
        FROM `tabStock Ledger Entry`
        WHERE voucher_no = %s
    """, (se_iss2.name,), as_dict=True)
    print(f"\nSLE entries for cancelled voucher {se_iss2.name}:")
    for s in sles:
        print(f"  Row: {s.name}, Qty: {s.actual_qty}, Balance: {s.qty_after_transaction}, is_cancelled: {s.is_cancelled}")

    # Cleanup
    for dt, dn in [("Stock Entry", se_ret.name), ("Stock Entry", se_iss1.name), ("Stock Entry", se_rec.name),
                   ("Vehicle Breakdown", bkd.name), ("Item", it.name), ("Vehicle", v.name), ("Driver", d.name)]:
        try:
            doc = frappe.get_doc(dt, dn)
            if doc.docstatus == 1:
                doc.cancel()
            frappe.delete_doc(dt, dn, force=1)
        except Exception:
            pass
    frappe.db.commit()
    print("\nCleanup completed.")

run()
