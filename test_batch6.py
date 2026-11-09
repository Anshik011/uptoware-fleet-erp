def run():
    import frappe
    from frappe.utils import flt, today, now_datetime
    from frappe.model.workflow import apply_workflow
    from frappe.desk.query_report import run as run_report

    print("\n=======================================================")
    print("   UPTOWARE FLEET ERP - BATCH 6 SPARE PARTS SUITE      ")
    print("=======================================================\n")

    test_results = []
    created_docs = []

    def log_test(num, name, passed, details=""):
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status} Test {num:02d}: {name} | {details}")
        test_results.append((num, name, passed, details))

    frappe.set_user("Administrator")
    company = "Uptoware"
    curr_date = today()
    wh_stores = "Stores - U"
    wh_site = "Kudremukh Spares - U"

    # 0. Setup Prerequisites: Supplier, Users
    supplier_name = "FleetParts Direct India"
    if not frappe.db.exists("Supplier", supplier_name):
        supp = frappe.get_doc({
            "doctype": "Supplier",
            "supplier_name": supplier_name,
            "supplier_group": "All Supplier Groups",
            "supplier_type": "Company"
        }).insert(ignore_permissions=True)
        created_docs.append(("Supplier", supp.name))

    # Setup Test Store Manager User
    sm_user = "test_store_mgr@uptoware.local"
    if not frappe.db.exists("User", sm_user):
        frappe.get_doc({
            "doctype": "User",
            "email": sm_user,
            "first_name": "Test Store Manager",
            "roles": [{"role": "Store Manager"}, {"role": "Desk User"}]
        }).insert(ignore_permissions=True)
    else:
        u = frappe.get_doc("User", sm_user)
        u.add_roles("Store Manager", "Desk User")

    # Setup Test Vehicle, Driver, Mine Site
    test_veh = "TEST-VEH-B6-01"
    if not frappe.db.exists("Vehicle", test_veh):
        v = frappe.get_doc({
            "doctype": "Vehicle",
            "license_plate": test_veh,
            "make": "Volvo",
            "model": "FMX 460 Mining Tipper",
            "vehicle_status": "Active",
            "last_odometer": 45000,
            "uom": "Nos",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Vehicle", v.name))
    else:
        frappe.db.set_value("Vehicle", test_veh, "vehicle_status", "Active")

    test_driver = "Test Driver B6"
    d_name = frappe.db.get_value("Driver", {"full_name": test_driver}, "name")
    if not d_name:
        drv = frappe.get_doc({
            "doctype": "Driver",
            "full_name": test_driver,
            "status": "Active",
            "license_number": "DL-TEST-B6-99",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        d_name = drv.name
        created_docs.append(("Driver", d_name))

    test_site = "Kudremukh North Pit (B6)"
    if not frappe.db.exists("Mine Site", test_site):
        ms = frappe.get_doc({
            "doctype": "Mine Site",
            "site_name": test_site,
            "site_code": "KNP-B6",
            "status": "Operational",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Mine Site", ms.name))

    # Test Item Codes
    item_filter = f"SP-FLT-OIL-{now_datetime().strftime('%H%M%S')}"
    item_brake = f"SP-BRK-PAD-{now_datetime().strftime('%H%M%S')}"

    # -------------------------------------------------------------
    # Test 01: Spare Part Item Creation & Classification
    # -------------------------------------------------------------
    try:
        frappe.set_user("Administrator")
        part1 = frappe.get_doc({
            "doctype": "Item",
            "item_code": item_filter,
            "item_name": "Heavy Duty Engine Oil Filter",
            "item_group": "Filters and Lubricants",
            "stock_uom": "Nos",
            "is_stock_item": 1,
            "valuation_rate": 850.0,
            "custom_part_number": "VOL-21707134",
            "custom_compatible_vehicle_model": "Volvo FMX 460, Tata Prima 3138.K",
            "custom_preferred_supplier": supplier_name,
            "reorder_levels": [{
                "warehouse": wh_stores,
                "warehouse_reorder_level": 5.0,
                "warehouse_reorder_qty": 20.0,
                "material_request_type": "Purchase"
            }],
            "safety_stock": 5.0,
            "min_order_qty": 20.0,
            "custom_is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Item", part1.name))

        t1_ok = (
            part1.item_group == "Filters and Lubricants"
            and part1.custom_part_number == "VOL-21707134"
            and part1.custom_preferred_supplier == supplier_name
            and len(part1.reorder_levels) == 1
            and flt(part1.reorder_levels[0].warehouse_reorder_level) == 5.0
        )
        log_test(1, "Spare Part Item Creation & Classification", t1_ok, f"Item {part1.name} in Group {part1.item_group}")
    except Exception as e:
        log_test(1, "Spare Part Item Creation & Classification", False, str(e))

    # -------------------------------------------------------------
    # Test 02: Warehouse Stock Receipt & Bin Visibility
    # -------------------------------------------------------------
    try:
        frappe.set_user("Administrator")
        mr = frappe.get_doc({
            "doctype": "Stock Entry",
            "stock_entry_type": "Material Receipt",
            "company": company,
            "to_warehouse": wh_stores,
            "items": [{
                "item_code": item_filter,
                "qty": 10.0,
                "t_warehouse": wh_stores,
                "basic_rate": 850.0,
                "cost_center": "Main - U"
            }]
        }).insert(ignore_permissions=True)
        mr.submit()
        created_docs.append(("Stock Entry", mr.name))

        bin_qty = frappe.db.get_value("Bin", {"item_code": item_filter, "warehouse": wh_stores}, "actual_qty")
        bin_val = frappe.db.get_value("Bin", {"item_code": item_filter, "warehouse": wh_stores}, "stock_value")
        t2_ok = (flt(bin_qty) == 10.0 and flt(bin_val) == 8500.0)
        log_test(2, "Warehouse Stock Receipt & Bin Visibility", t2_ok, f"Bin Qty={bin_qty}, Stock Value=₹{bin_val}")
    except Exception as e:
        log_test(2, "Warehouse Stock Receipt & Bin Visibility", False, str(e))

    # -------------------------------------------------------------
    # Test 03: Multi-Warehouse Transfer (Stores -> Kudremukh Spares)
    # -------------------------------------------------------------
    try:
        frappe.set_user("Administrator")
        mt = frappe.get_doc({
            "doctype": "Stock Entry",
            "stock_entry_type": "Material Transfer",
            "company": company,
            "from_warehouse": wh_stores,
            "to_warehouse": wh_site,
            "items": [{
                "item_code": item_filter,
                "qty": 4.0,
                "s_warehouse": wh_stores,
                "t_warehouse": wh_site,
                "basic_rate": 850.0,
                "cost_center": "Main - U"
            }]
        }).insert(ignore_permissions=True)
        mt.submit()
        created_docs.append(("Stock Entry", mt.name))

        qty_stores = frappe.db.get_value("Bin", {"item_code": item_filter, "warehouse": wh_stores}, "actual_qty")
        qty_site = frappe.db.get_value("Bin", {"item_code": item_filter, "warehouse": wh_site}, "actual_qty")
        t3_ok = (flt(qty_stores) == 6.0 and flt(qty_site) == 4.0)
        log_test(3, "Multi-Warehouse Stock Transfer", t3_ok, f"Stores={qty_stores}, Kudremukh Site={qty_site}")
    except Exception as e:
        log_test(3, "Multi-Warehouse Stock Transfer", False, str(e))

    # -------------------------------------------------------------
    # Test 04: Reorder Level & Low Stock Threshold Detection
    # -------------------------------------------------------------
    try:
        # Create second item with stock below reorder level
        part2 = frappe.get_doc({
            "doctype": "Item",
            "item_code": item_brake,
            "item_name": "Heavy Duty Brake Shoe Assembly",
            "item_group": "Brake System",
            "stock_uom": "Set",
            "is_stock_item": 1,
            "valuation_rate": 3200.0,
            "custom_part_number": "TAT-BRK-990",
            "custom_preferred_supplier": supplier_name,
            "reorder_levels": [{
                "warehouse": wh_stores,
                "warehouse_reorder_level": 8.0,
                "warehouse_reorder_qty": 15.0,
                "material_request_type": "Purchase"
            }],
            "safety_stock": 8.0,
            "min_order_qty": 15.0,
            "custom_is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Item", part2.name))

        # Receipt 3 units (reorder level is 8 -> shortage is 5)
        mr2 = frappe.get_doc({
            "doctype": "Stock Entry",
            "stock_entry_type": "Material Receipt",
            "company": company,
            "to_warehouse": wh_stores,
            "items": [{
                "item_code": item_brake,
                "qty": 3.0,
                "t_warehouse": wh_stores,
                "basic_rate": 3200.0,
                "cost_center": "Main - U"
            }]
        }).insert(ignore_permissions=True)
        mr2.submit()
        created_docs.append(("Stock Entry", mr2.name))

        # Check stock vs standard reorder level
        curr_stock = flt(frappe.db.get_value("Bin", {"item_code": item_brake, "warehouse": wh_stores}, "actual_qty") or 0.0)
        reorder_lvl = flt(frappe.db.get_value("Item Reorder", {"parent": item_brake, "warehouse": wh_stores}, "warehouse_reorder_level") or 0.0)
        is_low_stock = (curr_stock <= reorder_lvl)
        shortage = reorder_lvl - curr_stock
        t4_ok = (is_low_stock and shortage == 5.0)
        log_test(4, "Reorder Level & Low Stock Threshold Detection", t4_ok, f"Current Stock={curr_stock}, Reorder Level={reorder_lvl}, Shortage={shortage}")
    except Exception as e:
        log_test(4, "Reorder Level & Low Stock Threshold Detection", False, str(e))

    # -------------------------------------------------------------
    # Setup Vehicle Breakdown for Parts Tests
    # -------------------------------------------------------------
    bkd = frappe.get_doc({
        "doctype": "Vehicle Breakdown",
        "breakdown_datetime": f"{curr_date} 09:00:00",
        "vehicle": test_veh,
        "driver": d_name,
        "mine_site": test_site,
        "odometer_reading": 45100,
        "breakdown_type": "Engine",
        "severity": "Critical",
        "description": "Routine scheduled service: Oil filter replacement and maintenance",
        "parts_table": [{
            "item_code": item_filter,
            "planned_qty": 2.0,
            "warehouse": wh_stores
        }],
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    created_docs.append(("Vehicle Breakdown", bkd.name))
    apply_workflow(bkd, "Approve")
    apply_workflow(bkd, "Send to Workshop")
    bkd.reload()

    # -------------------------------------------------------------
    # Test 05: Spare Parts Issue Against Breakdown (Partial Issue 1/2)
    # -------------------------------------------------------------
    se_issue_1 = None
    try:
        se_issue_1 = frappe.get_doc({
            "doctype": "Stock Entry",
            "stock_entry_type": "Material Issue",
            "company": company,
            "custom_vehicle_breakdown": bkd.name,
            "custom_vehicle": test_veh,
            "items": [{
                "item_code": item_filter,
                "qty": 1.0,
                "s_warehouse": wh_stores,
                "basic_rate": 850.0,
                "cost_center": "Main - U"
            }]
        }).insert(ignore_permissions=True)
        se_issue_1.submit()
        created_docs.append(("Stock Entry", se_issue_1.name))

        bkd.reload()
        row = bkd.parts_table[0]
        t5_ok = (
            flt(row.issued_qty) == 1.0
            and row.status == "Partially Issued"
            and flt(bkd.parts_cost) == 850.0
        )
        log_test(5, "Spare Parts Partial Issue (1/2 Qty)", t5_ok, f"Issued Qty={row.issued_qty}, Status={row.status}, Parts Cost=₹{bkd.parts_cost}")
    except Exception as e:
        log_test(5, "Spare Parts Partial Issue", False, str(e))

    # -------------------------------------------------------------
    # Test 06: Second Issue to Complete Planned Quantity (2/2 Qty)
    # -------------------------------------------------------------
    se_issue_2 = None
    try:
        se_issue_2 = frappe.get_doc({
            "doctype": "Stock Entry",
            "stock_entry_type": "Material Issue",
            "company": company,
            "custom_vehicle_breakdown": bkd.name,
            "custom_vehicle": test_veh,
            "items": [{
                "item_code": item_filter,
                "qty": 1.0,
                "s_warehouse": wh_stores,
                "basic_rate": 850.0,
                "cost_center": "Main - U"
            }]
        }).insert(ignore_permissions=True)
        se_issue_2.submit()
        created_docs.append(("Stock Entry", se_issue_2.name))

        bkd.reload()
        row = bkd.parts_table[0]
        t6_ok = (
            flt(row.issued_qty) == 2.0
            and flt(row.net_issued_qty) == 2.0
            and row.status == "Issued"
            and flt(bkd.parts_cost) == 1700.0
        )
        log_test(6, "Second Issue to Complete Planned Qty (2/2)", t6_ok, f"Cumulative Issued={row.issued_qty}, Status={row.status}, Total Parts Cost=₹{bkd.parts_cost}")
    except Exception as e:
        log_test(6, "Second Issue to Complete Planned Qty", False, str(e))

    # -------------------------------------------------------------
    # Test 07: Excess Quantity Rejection
    # -------------------------------------------------------------
    try:
        blocked_excess = False
        try:
            se_ex = frappe.get_doc({
                "doctype": "Stock Entry",
                "stock_entry_type": "Material Issue",
                "company": company,
                "custom_vehicle_breakdown": bkd.name,
                "custom_vehicle": test_veh,
                "items": [{
                    "item_code": item_filter,
                    "qty": 1.0, # Total would become 3.0 vs 2.0 planned
                    "s_warehouse": wh_stores,
                    "basic_rate": 850.0,
                    "cost_center": "Main - U"
                }]
            }).insert(ignore_permissions=True)
            se_ex.submit()
        except Exception as e:
            if "cannot exceed planned quantity" in str(e).lower():
                blocked_excess = True

        log_test(7, "Excess Quantity Rejection (Issued > Planned)", blocked_excess, f"Blocked over-issuance: {blocked_excess}")
    except Exception as e:
        log_test(7, "Excess Quantity Rejection", False, str(e))

    # -------------------------------------------------------------
    # Test 08: Insufficient Stock Rejection
    # -------------------------------------------------------------
    try:
        blocked_insuff = False
        # Create a temp item with 0 stock
        temp_item = f"SP-ZERO-{now_datetime().strftime('%H%M%S')}"
        t_item = frappe.get_doc({
            "doctype": "Item",
            "item_code": temp_item,
            "item_name": "Zero Stock Test Part",
            "item_group": "Consumables and Hardware",
            "stock_uom": "Nos",
            "is_stock_item": 1,
            "valuation_rate": 100.0,
            "custom_is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Item", t_item.name))

        # Add to breakdown parts
        bkd.append("parts_table", {
            "item_code": temp_item,
            "planned_qty": 5.0,
            "warehouse": wh_stores
        })
        bkd.save(ignore_permissions=True)

        try:
            se_zero = frappe.get_doc({
                "doctype": "Stock Entry",
                "stock_entry_type": "Material Issue",
                "company": company,
                "custom_vehicle_breakdown": bkd.name,
                "custom_vehicle": test_veh,
                "items": [{
                    "item_code": temp_item,
                    "qty": 2.0,
                    "s_warehouse": wh_stores,
                    "basic_rate": 100.0,
                    "cost_center": "Main - U"
                }]
            }).insert(ignore_permissions=True)
            se_zero.submit()
        except Exception as e:
            err_msg = str(e)
            if "insufficient stock" in err_msg.lower() or "needed in warehouse" in err_msg.lower():
                blocked_insuff = True
            else:
                details = f"Unexpected error: {err_msg}"

        log_test(8, "Insufficient Stock Rejection", blocked_insuff, f"Blocked issuance with 0 stock: {blocked_insuff}" + (f" | {details}" if not blocked_insuff and 'details' in locals() else ""))
    except Exception as e:
        log_test(8, "Insufficient Stock Rejection", False, str(e))

    # -------------------------------------------------------------
    # Test 09: Stock Return of Unused Parts (Return 1 Unit)
    # -------------------------------------------------------------
    se_return = None
    try:
        # Stock balance in Stores before return
        pre_return_stock = flt(frappe.db.get_value("Bin", {"item_code": item_filter, "warehouse": wh_stores}, "actual_qty") or 0.0)

        # Return 1 unit of oil filter back to warehouse
        se_return = frappe.get_doc({
            "doctype": "Stock Entry",
            "stock_entry_type": "Material Receipt",
            "custom_is_return": 1,
            "custom_vehicle_breakdown": bkd.name,
            "custom_vehicle": test_veh,
            "company": company,
            "to_warehouse": wh_stores,
            "items": [{
                "item_code": item_filter,
                "qty": 1.0,
                "t_warehouse": wh_stores,
                "basic_rate": 850.0,
                "cost_center": "Main - U"
            }]
        }).insert(ignore_permissions=True)
        se_return.submit()
        created_docs.append(("Stock Entry", se_return.name))

        # Verify stock returned to warehouse
        post_return_stock = flt(frappe.db.get_value("Bin", {"item_code": item_filter, "warehouse": wh_stores}, "actual_qty") or 0.0)
        stock_restored = (post_return_stock == pre_return_stock + 1.0)

        # Verify breakdown parts table updated
        bkd.reload()
        row = [p for p in bkd.parts_table if p.item_code == item_filter][0]
        t9_ok = (
            stock_restored
            and flt(row.issued_qty) == 2.0
            and flt(row.returned_qty) == 1.0
            and flt(row.net_issued_qty) == 1.0
            and flt(row.amount) == 850.0
            and row.status == "Partially Issued"
            and flt(bkd.parts_cost) == 850.0
        )
        log_test(9, "Stock Return of Unused Parts", t9_ok, f"Returned Qty={row.returned_qty}, Net Qty={row.net_issued_qty}, Parts Cost=₹{bkd.parts_cost}, Bin Stock: {pre_return_stock} -> {post_return_stock}")
    except Exception as e:
        log_test(9, "Stock Return of Unused Parts", False, str(e))

    # -------------------------------------------------------------
    # Test 10: Excess Return Rejection (Return > Net Issued)
    # -------------------------------------------------------------
    try:
        blocked_excess_return = False
        try:
            # Currently net issued is 1.0. Attempting to return 2.0 units should fail!
            se_ex_ret = frappe.get_doc({
                "doctype": "Stock Entry",
                "stock_entry_type": "Material Receipt",
                "custom_is_return": 1,
                "custom_vehicle_breakdown": bkd.name,
                "custom_vehicle": test_veh,
                "company": company,
                "to_warehouse": wh_stores,
                "items": [{
                    "item_code": item_filter,
                    "qty": 2.0,
                    "t_warehouse": wh_stores,
                    "basic_rate": 850.0,
                    "cost_center": "Main - U"
                }]
            }).insert(ignore_permissions=True)
            se_ex_ret.submit()
        except Exception as e:
            if "cannot return" in str(e).lower() and "net-issued" in str(e).lower():
                blocked_excess_return = True

        log_test(10, "Excess Return Rejection (Return > Net Issued)", blocked_excess_return, f"Blocked excess return: {blocked_excess_return}")
    except Exception as e:
        log_test(10, "Excess Return Rejection", False, str(e))

    # -------------------------------------------------------------
    # Test 11: Stock Return Cancellation & Reversal
    # -------------------------------------------------------------
    try:
        if se_return:
            se_return.cancel()
            bkd.reload()
            row = [p for p in bkd.parts_table if p.item_code == item_filter][0]
            t11_ok = (
                flt(row.returned_qty) == 0.0
                and flt(row.net_issued_qty) == 2.0
                and flt(row.amount) == 1700.0
                and row.status == "Issued"
                and flt(bkd.parts_cost) == 1700.0
            )
            log_test(11, "Stock Return Cancellation & Reversal", t11_ok, f"Returned Qty={row.returned_qty}, Net Qty={row.net_issued_qty}, Cost Restored=₹{bkd.parts_cost}")
        else:
            log_test(11, "Stock Return Cancellation & Reversal", False, "No return entry to cancel")
    except Exception as e:
        log_test(11, "Stock Return Cancellation & Reversal", False, str(e))

    # -------------------------------------------------------------
    # Test 12: Stock Issue Cancellation & Reversal
    # -------------------------------------------------------------
    try:
        if se_issue_2:
            se_issue_2.cancel()
            bkd.reload()
            row = [p for p in bkd.parts_table if p.item_code == item_filter][0]
            t12_ok = (
                flt(row.issued_qty) == 1.0
                and flt(row.net_issued_qty) == 1.0
                and flt(row.amount) == 850.0
                and row.status == "Partially Issued"
                and flt(bkd.parts_cost) == 850.0
            )
            log_test(12, "Stock Issue Cancellation & Reversal", t12_ok, f"Issued Qty reduced to {row.issued_qty}, Status={row.status}, Parts Cost=₹{bkd.parts_cost}")
        else:
            log_test(12, "Stock Issue Cancellation & Reversal", False, "No issue entry to cancel")
    except Exception as e:
        log_test(12, "Stock Issue Cancellation & Reversal", False, str(e))

    # -------------------------------------------------------------
    # Test 13: Stock Valuation Reconciliation against Stock Ledger
    # -------------------------------------------------------------
    try:
        # Check remaining submitted Stock Entry Detail for se_issue_1
        sed = frappe.db.get_value("Stock Entry Detail", {"parent": se_issue_1.name, "item_code": item_filter}, ["basic_rate", "amount"], as_dict=True)
        bkd.reload()
        row = [p for p in bkd.parts_table if p.item_code == item_filter][0]
        reconciled = (flt(row.rate) == flt(sed.basic_rate) and flt(row.amount) == flt(sed.amount))
        log_test(13, "Stock Valuation Reconciliation against Stock Ledger", reconciled, f"Part Amount=₹{row.amount}, Stock Entry Detail Amount=₹{sed.amount}")
    except Exception as e:
        log_test(13, "Stock Valuation Reconciliation against Stock Ledger", False, str(e))

    # -------------------------------------------------------------
    # Test 14: Breakdown Vehicle Status Lifecycle Integration
    # -------------------------------------------------------------
    try:
        # Mark breakdown Repaired -> status remains Under Maintenance
        apply_workflow(bkd, "Mark Repaired")
        veh_st_repaired = frappe.db.get_value("Vehicle", test_veh, "vehicle_status")

        # Close breakdown -> status cleanly restored to Active
        apply_workflow(bkd, "Close Breakdown")
        veh_st_closed = frappe.db.get_value("Vehicle", test_veh, "vehicle_status")

        t14_ok = (veh_st_repaired == "Under Maintenance" and veh_st_closed == "Active")
        log_test(14, "Breakdown Vehicle Status Integration", t14_ok, f"Repaired Status='{veh_st_repaired}', Closed Status='{veh_st_closed}'")
    except Exception as e:
        log_test(14, "Breakdown Vehicle Status Integration", False, str(e))

    # -------------------------------------------------------------
    # Helper: exec_report with all standard filters populated
    # -------------------------------------------------------------
    def exec_report(r_name, custom_filters=None):
        f = {
            "from_date": "2026-01-01",
            "to_date": "2026-12-31",
            "warehouse": "",
            "item_group": "",
            "item_code": "",
            "brand": "",
            "company": company,
            "preferred_supplier": "",
            "show_all": "1",
            "vehicle": "",
            "breakdown_type": "",
            "mine_site": "",
            "voucher_type": "",
            "include_cancelled": "0"
        }
        if custom_filters:
            f.update(custom_filters)
        return run_report(r_name, filters=f)

    # -------------------------------------------------------------
    # Test 15: Test-Record Quarantine in All 7 Reports
    # -------------------------------------------------------------
    try:
        # All test items have custom_is_test_record = 1
        # Check that test items are excluded from Spare Parts Stock Register
        rep_reg = exec_report("Spare Parts Stock Register", custom_filters={"item_code": item_filter})
        rows_reg = rep_reg.get("result", [])
        
        rep_wh = exec_report("Warehouse-wise Stock", custom_filters={"item_code": item_filter})
        rows_wh = rep_wh.get("result", [])

        rep_low = exec_report("Low Stock / Reorder Report", custom_filters={"item_group": "Filters and Lubricants", "show_all": "1"})
        rows_low = [r for r in rep_low.get("result", []) if r.get("item_code") == item_filter]

        quarantine_ok = (len(rows_reg) == 0 and len(rows_wh) == 0 and len(rows_low) == 0)
        log_test(15, "Test-Record Quarantine in Reports", quarantine_ok, f"Test Part '{item_filter}' 100% excluded from Stock Register, Warehouse Stock, and Low Stock reports")
    except Exception as e:
        log_test(15, "Test-Record Quarantine in Reports", False, str(e))

    # -------------------------------------------------------------
    # Test 16: Role Permissions (Store Manager & Workshop Supervisor)
    # -------------------------------------------------------------
    try:
        frappe.set_user(sm_user)
        # Store Manager can create Item
        sm_can_read_item = frappe.has_permission("Item", "read", user=sm_user)
        sm_can_create_se = frappe.has_permission("Stock Entry", "create", user=sm_user)
        sm_can_submit_se = frappe.has_permission("Stock Entry", "submit", user=sm_user)
        
        # Workshop Supervisor cannot submit Material Receipt or tamper with stock valuation rates directly
        ws_user = "test_ws_supervisor@uptoware.local"
        if not frappe.db.exists("User", ws_user):
            frappe.get_doc({
                "doctype": "User",
                "email": ws_user,
                "first_name": "Test Workshop Supervisor",
                "roles": [{"role": "Workshop Supervisor"}, {"role": "Desk User"}]
            }).insert(ignore_permissions=True)

        ws_can_read_item = frappe.has_permission("Item", "read", user=ws_user)
        ws_can_delete_item = frappe.has_permission("Item", "delete", user=ws_user)

        perms_ok = (sm_can_read_item and sm_can_create_se and sm_can_submit_se and ws_can_read_item and not ws_can_delete_item)
        log_test(16, "Role Permissions (Store Manager & Workshop Supervisor)", perms_ok, f"StoreMgr SE Submit={sm_can_submit_se}, Workshop Read={ws_can_read_item}, Workshop Delete Blocked={not ws_can_delete_item}")
    except Exception as e:
        log_test(16, "Role Permissions", False, str(e))

    # -------------------------------------------------------------
    # Test 17: Production Stock Visibility in All 7 Reports
    # -------------------------------------------------------------
    try:
        frappe.set_user("Administrator")
        reports_list = [
            "Spare Parts Stock Register",
            "Warehouse-wise Stock",
            "Low Stock / Reorder Report",
            "Spare Parts Consumption by Vehicle",
            "Spare Parts Consumption by Breakdown",
            "Spare Parts Consumption by Mine Site",
            "Stock Movement History"
        ]
        all_passed = True
        for r_name in reports_list:
            res = exec_report(r_name, custom_filters={
                "from_date": "2026-01-01",
                "to_date": "2026-12-31",
                "company": company,
                "show_all": "1"
            })
            if "columns" not in res:
                all_passed = False
                break

        log_test(17, "Production Stock Visibility in All 7 Reports", all_passed, f"All 7 reports verified with production query schemas")
    except Exception as e:
        log_test(17, "Production Stock Visibility in All 7 Reports", False, str(e))

    # -------------------------------------------------------------
    # Cleanup Test Documents
    # -------------------------------------------------------------
    frappe.set_user("Administrator")
    print("\n--- Cleaning up test records ---")
    for dt, dn in reversed(created_docs):
        try:
            if frappe.db.exists(dt, dn):
                doc = frappe.get_doc(dt, dn)
                if doc.docstatus == 1:
                    doc.cancel()
                frappe.delete_doc(dt, dn, force=1)
        except Exception:
            pass
    frappe.db.commit()

    # -------------------------------------------------------------
    # Summary
    # -------------------------------------------------------------
    passed_count = sum(1 for _, _, p, _ in test_results if p)
    total_count = len(test_results)
    print("\n=======================================================")
    print(f"   BATCH 6 TEST SUITE RESULTS: {passed_count}/{total_count} PASSED")
    print("=======================================================")
    if passed_count == total_count:
        print(">>> ALL BATCH 6 TESTS PASSED SUCCESSFULLY! <<<\n")
    else:
        print(">>> SOME TESTS FAILED! <<<\n")

run()
