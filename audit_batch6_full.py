import frappe
from frappe.utils import flt, today, now_datetime
from frappe.model.workflow import apply_workflow
from frappe.desk.query_report import run as run_report

def run():
    import frappe
    from frappe.utils import flt, today, now_datetime
    from frappe.model.workflow import apply_workflow
    from frappe.desk.query_report import run as run_report
    print("\n=======================================================")
    print("   BATCH 6: ARCHITECTURE, PERMISSIONS & INTEGRITY AUDIT")
    print("=======================================================\n")

    audit_results = []
    created_docs = []

    def log_audit(section, name, passed, details=""):
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status} [{section}] {name} | {details}")
        audit_results.append((section, name, passed, details))

    company = "Uptoware"
    curr_date = today()
    wh_stores = "Stores - U"
    wh_kudremukh = "Kudremukh Spares - U"
    supplier_name = "FleetParts Direct India"

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

    # =============================================================
    # AUDIT SECTION 1: STANDARD ERPNEXT REORDER FUNCTIONALITY
    # =============================================================
    try:
        # Check standard child table on Item
        has_reorder_table = frappe.db.has_column("Item Reorder", "warehouse_reorder_level")
        # Check that custom_reorder_level and custom_reorder_qty are removed
        has_custom_lvl = frappe.db.exists("Custom Field", "Item-custom_reorder_level")
        has_custom_qty = frappe.db.exists("Custom Field", "Item-custom_reorder_qty")
        
        # Test standard item creation with reorder_levels child table
        test_item_reorder = f"AUD-REORDER-{now_datetime().strftime('%H%M%S')}"
        it_reorder = frappe.get_doc({
            "doctype": "Item",
            "item_code": test_item_reorder,
            "item_name": "Audited Standard Reorder Item",
            "item_group": "Engine Parts",
            "stock_uom": "Nos",
            "is_stock_item": 1,
            "valuation_rate": 500.0,
            "reorder_levels": [
                {
                    "warehouse": wh_stores,
                    "warehouse_reorder_level": 12.0,
                    "warehouse_reorder_qty": 25.0,
                    "material_request_type": "Purchase"
                },
                {
                    "warehouse": wh_kudremukh,
                    "warehouse_reorder_level": 4.0,
                    "warehouse_reorder_qty": 10.0,
                    "material_request_type": "Transfer"
                }
            ],
            "custom_is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Item", it_reorder.name))

        # Check standard child table rows persisted
        reorder_rows = frappe.db.sql("""
            SELECT warehouse, warehouse_reorder_level, warehouse_reorder_qty, material_request_type
            FROM `tabItem Reorder`
            WHERE parent = %s
            ORDER BY warehouse ASC
        """, (test_item_reorder,), as_dict=True)

        s1_ok = (
            has_reorder_table
            and not has_custom_lvl
            and not has_custom_qty
            and len(reorder_rows) == 2
            and reorder_rows[0].warehouse_reorder_level in (4.0, 12.0)
        )
        log_audit("Section 1", "Standard Warehouse-Level Reorder Architecture", s1_ok, 
                  f"Standard Child Rows={len(reorder_rows)}, Redundant Custom Fields Removed={not has_custom_lvl and not has_custom_qty}")
    except Exception as e:
        log_audit("Section 1", "Standard Warehouse-Level Reorder Architecture", False, str(e))

    # =============================================================
    # AUDIT SECTION 2: COMPREHENSIVE TEST-RECORD ISOLATION
    # =============================================================
    try:
        # 1. Setup test vehicle & driver
        veh_test = f"AUD-VEH-T-{now_datetime().strftime('%H%M%S')}"
        vt = frappe.get_doc({
            "doctype": "Vehicle",
            "license_plate": veh_test,
            "make": "BharatBenz",
            "model": "3528.K Tipper",
            "vehicle_status": "Active",
            "last_odometer": 45000,
            "uom": "Nos",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Vehicle", vt.name))

        drv_test = f"AUD-DRV-T-{now_datetime().strftime('%H%M%S')}"
        dt = frappe.get_doc({
            "doctype": "Driver",
            "full_name": drv_test,
            "status": "Active",
            "license_number": f"DL-T-{now_datetime().strftime('%H%M%S')}",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Driver", dt.name))

        # Setup production-tagged item
        prod_item = f"AUD-ITEM-PROD-{now_datetime().strftime('%H%M%S')}"
        it_prod = frappe.get_doc({
            "doctype": "Item",
            "item_code": prod_item,
            "item_name": "Audit Production Filter",
            "item_group": "Filters and Lubricants",
            "stock_uom": "Nos",
            "is_stock_item": 1,
            "valuation_rate": 750.0,
            "custom_is_test_record": 0
        }).insert(ignore_permissions=True)
        created_docs.append(("Item", it_prod.name))

        # Setup test-tagged item
        test_item = f"AUD-ITEM-TEST-{now_datetime().strftime('%H%M%S')}"
        it_test = frappe.get_doc({
            "doctype": "Item",
            "item_code": test_item,
            "item_name": "Audit Test Filter",
            "item_group": "Filters and Lubricants",
            "stock_uom": "Nos",
            "is_stock_item": 1,
            "valuation_rate": 750.0,
            "custom_is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Item", it_test.name))

        # Stock receipt for both items in Stores
        se_rec_prod = frappe.get_doc({
            "doctype": "Stock Entry",
            "stock_entry_type": "Material Receipt",
            "company": company,
            "to_warehouse": wh_stores,
            "items": [{
                "item_code": prod_item,
                "qty": 10.0,
                "t_warehouse": wh_stores,
                "basic_rate": 750.0,
                "cost_center": "Main - U"
            }]
        }).insert(ignore_permissions=True)
        se_rec_prod.submit()
        created_docs.append(("Stock Entry", se_rec_prod.name))

        se_rec_test = frappe.get_doc({
            "doctype": "Stock Entry",
            "stock_entry_type": "Material Receipt",
            "company": company,
            "to_warehouse": wh_stores,
            "items": [{
                "item_code": test_item,
                "qty": 10.0,
                "t_warehouse": wh_stores,
                "basic_rate": 750.0,
                "cost_center": "Main - U"
            }]
        }).insert(ignore_permissions=True)
        se_rec_test.submit()
        created_docs.append(("Stock Entry", se_rec_test.name))

        # Case 2A: Test Breakdown with Production Item issued
        bkd_test = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "breakdown_datetime": f"{curr_date} 08:00:00",
            "vehicle": veh_test,
            "driver": dt.name,
            "odometer_reading": 45100,
            "breakdown_type": "Engine",
            "severity": "Critical",
            "description": "Test breakdown for audit",
            "parts_table": [{
                "item_code": prod_item,
                "planned_qty": 2.0,
                "warehouse": wh_stores
            }],
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Vehicle Breakdown", bkd_test.name))
        apply_workflow(bkd_test, "Approve")
        apply_workflow(bkd_test, "Send to Workshop")

        se_issue_test_bkd = frappe.get_doc({
            "doctype": "Stock Entry",
            "stock_entry_type": "Material Issue",
            "company": company,
            "custom_vehicle_breakdown": bkd_test.name,
            "custom_vehicle": veh_test,
            "items": [{
                "item_code": prod_item,
                "qty": 1.0,
                "s_warehouse": wh_stores,
                "basic_rate": 750.0,
                "cost_center": "Main - U"
            }]
        }).insert(ignore_permissions=True)
        se_issue_test_bkd.submit()
        created_docs.append(("Stock Entry", se_issue_test_bkd.name))

        # Verify Test-Record Quarantine in Reports:
        # Report 1 (Stock Register): test_item must be excluded; prod_item visible
        reg_t = exec_report("Spare Parts Stock Register", {"item_code": test_item})["result"]
        reg_p = exec_report("Spare Parts Stock Register", {"item_code": prod_item})["result"]

        # Report 4 (Consumption by Vehicle): test vehicle must be excluded
        v_cons = exec_report("Spare Parts Consumption by Vehicle", {"vehicle": veh_test})["result"]

        # Report 5 (Consumption by Breakdown): test breakdown must be excluded
        b_cons = exec_report("Spare Parts Consumption by Breakdown", {"vehicle": veh_test})["result"]

        # Report 7 (Stock Movement History): movements linked to test breakdown/vehicle must be excluded
        sle_test = exec_report("Stock Movement History", {"item_code": test_item})["result"]
        sle_test_bkd = [r for r in exec_report("Stock Movement History", {"item_code": prod_item})["result"] if r.get("breakdown") == bkd_test.name]

        s2_ok = (
            len(reg_t) == 0
            and len(reg_p) >= 1
            and len(v_cons) == 0
            and len(b_cons) == 0
            and len(sle_test) == 0
            and len(sle_test_bkd) == 0
        )
        log_audit("Section 2", "Test-Record Isolation Across Reports", s2_ok,
                  f"TestItem in Register={len(reg_t)}, TestVeh in Consumption={len(v_cons)}, TestBreakdown in Movement={len(sle_test_bkd)}")
    except Exception as e:
        log_audit("Section 2", "Test-Record Isolation Across Reports", False, str(e))

    # =============================================================
    # AUDIT SECTION 3: WAREHOUSE & MINE SITE PORTABILITY
    # =============================================================
    try:
        # Dynamically create new warehouse through standard ERPNext master
        new_wh_name = f"Sandur Pit Spares - U"
        if not frappe.db.exists("Warehouse", new_wh_name):
            wh_doc = frappe.get_doc({
                "doctype": "Warehouse",
                "warehouse_name": "Sandur Pit Spares",
                "parent_warehouse": "All Warehouses - U",
                "company": company
            }).insert(ignore_permissions=True)
            created_docs.append(("Warehouse", wh_doc.name))

        # Dynamically create new Mine Site
        new_site_name = f"Sandur Iron Ore Pit (AUD)"
        if not frappe.db.exists("Mine Site", new_site_name):
            ms_doc = frappe.get_doc({
                "doctype": "Mine Site",
                "site_name": new_site_name,
                "site_code": "SND-01",
                "status": "Operational",
                "is_test_record": 1
            }).insert(ignore_permissions=True)
            created_docs.append(("Mine Site", ms_doc.name))

        # Transfer stock to dynamically created warehouse
        se_dyn_wh = frappe.get_doc({
            "doctype": "Stock Entry",
            "stock_entry_type": "Material Transfer",
            "company": company,
            "from_warehouse": wh_stores,
            "to_warehouse": new_wh_name,
            "items": [{
                "item_code": prod_item,
                "qty": 3.0,
                "s_warehouse": wh_stores,
                "t_warehouse": new_wh_name,
                "basic_rate": 750.0,
                "cost_center": "Main - U"
            }]
        }).insert(ignore_permissions=True)
        se_dyn_wh.submit()
        created_docs.append(("Stock Entry", se_dyn_wh.name))

        # Verify dynamic warehouse stock balance in tabBin
        dyn_bin_qty = flt(frappe.db.get_value("Bin", {"item_code": prod_item, "warehouse": new_wh_name}, "actual_qty") or 0.0)

        # Verify dynamic warehouse in Warehouse-wise Stock report
        wh_rep = exec_report("Warehouse-wise Stock", {"warehouse": new_wh_name})["result"]

        s3_ok = (dyn_bin_qty == 3.0 and len(wh_rep) >= 1)
        log_audit("Section 3", "Dynamic Warehouse & Site Portability", s3_ok,
                  f"Dynamic Warehouse '{new_wh_name}' Bin Qty={dyn_bin_qty}, Found in Warehouse Stock Report={len(wh_rep) >= 1}")
    except Exception as e:
        log_audit("Section 3", "Dynamic Warehouse & Site Portability", False, str(e))

    # =============================================================
    # AUDIT SECTION 4: EFFECTIVE ROLE PERMISSIONS
    # =============================================================
    try:
        sm_user = "test_store_mgr@uptoware.local"
        ws_user = "test_ws_supervisor@uptoware.local"
        fm_user = "test_fleet_mgr@uptoware.local"
        acc_user = "test_acc@uptoware.local"

        for u_email, u_role, u_name in [
            (sm_user, "Store Manager", "Test Store Mgr"),
            (ws_user, "Workshop Supervisor", "Test Workshop Sup"),
            (fm_user, "Fleet Manager", "Test Fleet Mgr"),
            (acc_user, "Accountant", "Test Accountant")
        ]:
            if not frappe.db.exists("User", u_email):
                frappe.get_doc({
                    "doctype": "User",
                    "email": u_email,
                    "first_name": u_name,
                    "roles": [{"role": u_role}, {"role": "Desk User"}]
                }).insert(ignore_permissions=True)

        # 4A. Store Manager permissions
        sm_can_create_item = frappe.has_permission("Item", "create", user=sm_user)
        sm_can_delete_item = frappe.has_permission("Item", "delete", user=sm_user)
        sm_can_create_se = frappe.has_permission("Stock Entry", "create", user=sm_user)
        sm_can_delete_se = frappe.has_permission("Stock Entry", "delete", user=sm_user)
        sm_can_submit_se = frappe.has_permission("Stock Entry", "submit", user=sm_user)

        # 4B. Workshop Supervisor permissions
        ws_can_create_item = frappe.has_permission("Item", "create", user=ws_user)
        ws_can_delete_item = frappe.has_permission("Item", "delete", user=ws_user)
        ws_can_create_se = frappe.has_permission("Stock Entry", "create", user=ws_user)
        ws_can_submit_se = frappe.has_permission("Stock Entry", "submit", user=ws_user)
        ws_can_delete_se = frappe.has_permission("Stock Entry", "delete", user=ws_user)
        ws_can_cancel_se = frappe.has_permission("Stock Entry", "cancel", user=ws_user)

        # 4C. Workshop Supervisor Server-Side Guard: Blocked from arbitrary stock entry
        ws_blocked_standalone = False
        frappe.set_user(ws_user)
        try:
            se_ws_invalid = frappe.get_doc({
                "doctype": "Stock Entry",
                "stock_entry_type": "Material Issue",
                "company": company,
                "items": [{
                    "item_code": prod_item,
                    "qty": 1.0,
                    "s_warehouse": wh_stores,
                    "basic_rate": 750.0,
                    "cost_center": "Main - U"
                }]
            }).insert()
            se_ws_invalid.submit()
        except Exception as e:
            if "authorized to create and submit Stock Entries linked to an active Vehicle Breakdown" in str(e):
                ws_blocked_standalone = True

        # 4D. Workshop Supervisor Server-Side Guard: Blocked from Material Transfer
        ws_blocked_transfer = False
        try:
            se_ws_tr = frappe.get_doc({
                "doctype": "Stock Entry",
                "stock_entry_type": "Material Transfer",
                "company": company,
                "custom_vehicle_breakdown": bkd_test.name,
                "items": [{
                    "item_code": prod_item,
                    "qty": 1.0,
                    "s_warehouse": wh_stores,
                    "t_warehouse": wh_kudremukh,
                    "basic_rate": 750.0,
                    "cost_center": "Main - U"
                }]
            }).insert()
            se_ws_tr.submit()
        except Exception as e:
            if "not authorized to execute Stock Entries of type" in str(e):
                ws_blocked_transfer = True

        # 4E. Workshop Supervisor Authorized Issue: Succeeds for breakdown
        ws_issue_ok = False
        frappe.set_user(ws_user)
        try:
            se_ws_valid = frappe.get_doc({
                "doctype": "Stock Entry",
                "stock_entry_type": "Material Issue",
                "company": company,
                "custom_vehicle_breakdown": bkd_test.name,
                "custom_vehicle": veh_test,
                "items": [{
                    "item_code": prod_item,
                    "qty": 1.0,
                    "s_warehouse": wh_stores,
                    "basic_rate": 750.0,
                    "cost_center": "Main - U"
                }]
            }).insert()
            se_ws_valid.submit()
            created_docs.append(("Stock Entry", se_ws_valid.name))
            ws_issue_ok = True
        except Exception as e:
            print(f"WS authorized issue exception: {e}")

        frappe.set_user("Administrator")

        # 4F. Fleet Manager & Accountant restrictions
        fm_can_submit_se = frappe.has_permission("Stock Entry", "submit", user=fm_user)
        acc_can_submit_se = frappe.has_permission("Stock Entry", "submit", user=acc_user)

        s4_ok = (
            sm_can_create_item and not sm_can_delete_item and sm_can_submit_se and not sm_can_delete_se
            and not ws_can_create_item and not ws_can_delete_item and ws_can_submit_se and not ws_can_delete_se and not ws_can_cancel_se
            and ws_blocked_standalone
            and ws_blocked_transfer
            and ws_issue_ok
            and not fm_can_submit_se
            and not acc_can_submit_se
        )
        log_audit("Section 4", "Effective Role Permissions & Workflow Authorization", s4_ok,
                  f"SM Submit={sm_can_submit_se}, WS Breakdown Issue={ws_issue_ok}, WS Unauth Blocked={ws_blocked_standalone and ws_blocked_transfer}, Deletions Blocked={not sm_can_delete_se and not ws_can_delete_se}")
    except Exception as e:
        log_audit("Section 4", "Effective Role Permissions & Workflow Authorization", False, str(e))

    # =============================================================
    # AUDIT SECTION 5: STOCK RETURN AND VALUATION AUDIT
    # =============================================================
    try:
        frappe.set_user("Administrator")
        # Multi-issue and multi-return cycle on a clean breakdown
        veh_audit = f"AUD-VEH-V-{now_datetime().strftime('%H%M%S')}"
        va = frappe.get_doc({
            "doctype": "Vehicle",
            "license_plate": veh_audit,
            "make": "Tata",
            "model": "Prima 3138.K",
            "vehicle_status": "Active",
            "last_odometer": 45000,
            "uom": "Nos",
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Vehicle", va.name))

        item_audit = f"AUD-SEAL-{now_datetime().strftime('%H%M%S')}"
        it_a = frappe.get_doc({
            "doctype": "Item",
            "item_code": item_audit,
            "item_name": "Hydraulic Cylinder Seal Kit",
            "item_group": "Hydraulic Parts",
            "stock_uom": "Nos",
            "is_stock_item": 1,
            "valuation_rate": 1200.0,
            "reorder_levels": [{
                "warehouse": wh_stores,
                "warehouse_reorder_level": 6.0,
                "warehouse_reorder_qty": 15.0,
                "material_request_type": "Purchase"
            }],
            "custom_is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Item", it_a.name))

        # Receipt 10 units @ ₹1200
        se_init_rec = frappe.get_doc({
            "doctype": "Stock Entry",
            "stock_entry_type": "Material Receipt",
            "company": company,
            "to_warehouse": wh_stores,
            "items": [{
                "item_code": item_audit,
                "qty": 10.0,
                "t_warehouse": wh_stores,
                "basic_rate": 1200.0,
                "cost_center": "Main - U"
            }]
        }).insert(ignore_permissions=True)
        se_init_rec.submit()
        created_docs.append(("Stock Entry", se_init_rec.name))

        # Create Breakdown with planned qty = 5.0
        bkd_val = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "breakdown_datetime": f"{curr_date} 09:30:00",
            "vehicle": veh_audit,
            "driver": dt.name,
            "odometer_reading": 45100,
            "breakdown_type": "Hydraulic",
            "severity": "Critical",
            "description": "Hydraulic leak repair",
            "parts_table": [{
                "item_code": item_audit,
                "planned_qty": 5.0,
                "warehouse": wh_stores
            }],
            "labour_cost": 1500.0,
            "is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Vehicle Breakdown", bkd_val.name))
        apply_workflow(bkd_val, "Approve")
        apply_workflow(bkd_val, "Send to Workshop")

        # Transaction 1: Issue 2 units
        se_iss1 = frappe.get_doc({
            "doctype": "Stock Entry",
            "stock_entry_type": "Material Issue",
            "company": company,
            "custom_vehicle_breakdown": bkd_val.name,
            "custom_vehicle": veh_audit,
            "items": [{
                "item_code": item_audit,
                "qty": 2.0,
                "s_warehouse": wh_stores,
                "basic_rate": 1200.0,
                "cost_center": "Main - U"
            }]
        }).insert(ignore_permissions=True)
        se_iss1.submit()
        created_docs.append(("Stock Entry", se_iss1.name))

        bkd_val.reload()
        c1_ok = (flt(bkd_val.parts_table[0].issued_qty) == 2.0 and flt(bkd_val.parts_cost) == 2400.0 and flt(bkd_val.total_repair_cost) == 3900.0)

        # Transaction 2: Issue 2 more units (cumulative = 4.0)
        se_iss2 = frappe.get_doc({
            "doctype": "Stock Entry",
            "stock_entry_type": "Material Issue",
            "company": company,
            "custom_vehicle_breakdown": bkd_val.name,
            "custom_vehicle": veh_audit,
            "items": [{
                "item_code": item_audit,
                "qty": 2.0,
                "s_warehouse": wh_stores,
                "basic_rate": 1200.0,
                "cost_center": "Main - U"
            }]
        }).insert(ignore_permissions=True)
        se_iss2.submit()
        created_docs.append(("Stock Entry", se_iss2.name))

        bkd_val.reload()
        c2_ok = (flt(bkd_val.parts_table[0].issued_qty) == 4.0 and flt(bkd_val.parts_table[0].net_issued_qty) == 4.0 and flt(bkd_val.parts_cost) == 4800.0)

        # Transaction 3: Return 1 unit (net issued = 3.0)
        se_ret1 = frappe.get_doc({
            "doctype": "Stock Entry",
            "stock_entry_type": "Material Receipt",
            "custom_is_return": 1,
            "company": company,
            "custom_vehicle_breakdown": bkd_val.name,
            "custom_vehicle": veh_audit,
            "items": [{
                "item_code": item_audit,
                "qty": 1.0,
                "t_warehouse": wh_stores,
                "basic_rate": 1200.0,
                "cost_center": "Main - U"
            }]
        }).insert(ignore_permissions=True)
        se_ret1.submit()
        created_docs.append(("Stock Entry", se_ret1.name))

        bkd_val.reload()
        c3_ok = (flt(bkd_val.parts_table[0].returned_qty) == 1.0 and flt(bkd_val.parts_table[0].net_issued_qty) == 3.0 and flt(bkd_val.parts_cost) == 3600.0)

        # Transaction 4: Cancel Return 1 (net issued restored to 4.0, parts cost restored to 4800)
        se_ret1.cancel()
        bkd_val.reload()
        c4_ok = (flt(bkd_val.parts_table[0].returned_qty) == 0.0 and flt(bkd_val.parts_table[0].net_issued_qty) == 4.0 and flt(bkd_val.parts_cost) == 4800.0)

        # Transaction 5: Cancel Issue 2 (issued qty restored to 2.0, parts cost restored to 2400)
        se_iss2.cancel()
        bkd_val.reload()
        c5_ok = (flt(bkd_val.parts_table[0].issued_qty) == 2.0 and flt(bkd_val.parts_table[0].net_issued_qty) == 2.0 and flt(bkd_val.parts_cost) == 2400.0)

        # SLE Valuation Consistency Check
        # Bin actual_qty must be exactly 8.0 (10 received - 2 issued)
        final_bin_qty = flt(frappe.db.get_value("Bin", {"item_code": item_audit, "warehouse": wh_stores}, "actual_qty") or 0.0)
        sle_sum = flt(frappe.db.sql("SELECT SUM(actual_qty) FROM `tabStock Ledger Entry` WHERE item_code = %s AND warehouse = %s AND is_cancelled = 0", (item_audit, wh_stores))[0][0] or 0.0)

        c6_ok = (final_bin_qty == 8.0 and sle_sum == 8.0)

        s5_ok = (c1_ok and c2_ok and c3_ok and c4_ok and c5_ok and c6_ok)
        log_audit("Section 5", "Stock Return and Valuation Reconciliation", s5_ok,
                  f"Net Qty Flow: Iss1(2.0,₹2400) -> Iss2(4.0,₹4800) -> Ret1(3.0,₹3600) -> CancelRet(4.0,₹4800) -> CancelIss2(2.0,₹2400); Final SLE Qty={sle_sum}, Bin Qty={final_bin_qty}")
    except Exception as e:
        log_audit("Section 5", "Stock Return and Valuation Reconciliation", False, str(e))

    # =============================================================
    # CLEANUP TEST DOCUMENTS
    # =============================================================
    frappe.set_user("Administrator")
    print("\n--- Cleaning up test records ---")
    for dt_name, dn in reversed(created_docs):
        try:
            if frappe.db.exists(dt_name, dn):
                doc = frappe.get_doc(dt_name, dn)
                if doc.docstatus == 1:
                    doc.cancel()
                frappe.delete_doc(dt_name, dn, force=1)
        except Exception:
            pass
    frappe.db.commit()

    # =============================================================
    # AUDIT SUMMARY
    # =============================================================
    passed = sum(1 for _, _, p, _ in audit_results if p)
    total = len(audit_results)
    print("\n=======================================================")
    print(f"   BATCH 6 AUDIT RESULTS: {passed}/{total} SECTIONS PASSED")
    print("=======================================================")
    if passed == total:
        print(">>> ALL BATCH 6 AUDIT CHECKS PASSED PERFECTLY! <<<\n")
    else:
        print(">>> SOME AUDIT CHECKS FAILED! <<<\n")

if __name__ == "__main__":
    run()
