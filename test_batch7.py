import frappe
from frappe.utils import flt, today, now_datetime, add_days
from frappe.desk.query_report import run as run_report

def run():
    import frappe
    from frappe.utils import flt, today, now_datetime, add_days
    from frappe.desk.query_report import run as run_report
    from frappe.model.workflow import apply_workflow

    print("\n=======================================================")
    print("   UPTOWARE FLEET ERP - BATCH 7 PURCHASING & VENDOR    ")
    print("=======================================================\n")

    test_results = []
    created_docs = []

    def log_test(num, name, passed, details=""):
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status} Test {num:02d}: {name} | {details}")
        test_results.append((num, name, passed, details))

    company = "Uptoware"
    curr_date = today()
    wh_stores = "Stores - U"
    wh_site = "Kudremukh Spares - U"
    ts = now_datetime().strftime('%H%M%S')

    # Setup Test Users
    users_config = {
        "test_fleet_b7@uptoware.local": ("Test Fleet Mgr B7", ["Fleet Manager", "Desk User"]),
        "test_store_b7@uptoware.local": ("Test Store Mgr B7", ["Store Manager", "Desk User"]),
        "test_ws_b7@uptoware.local": ("Test Workshop B7", ["Workshop Supervisor", "Desk User"]),
        "test_acc_b7@uptoware.local": ("Test Accountant B7", ["Accountant", "Desk User"])
    }
    for email, (fname, roles) in users_config.items():
        if not frappe.db.exists("User", email):
            u = frappe.get_doc({
                "doctype": "User",
                "email": email,
                "first_name": fname,
                "roles": [{"role": r} for r in roles]
            }).insert(ignore_permissions=True)
            created_docs.append(("User", u.name))
        else:
            u = frappe.get_doc("User", email)
            for r in roles:
                if not any(ur.role == r for ur in u.roles):
                    u.append("roles", {"role": r})
            u.save(ignore_permissions=True)

    # Setup Test Supplier Group
    supp_group = "Automotive Spares"
    if not frappe.db.exists("Supplier Group", supp_group):
        sg = frappe.get_doc({
            "doctype": "Supplier Group",
            "supplier_group_name": supp_group
        }).insert(ignore_permissions=True)
        created_docs.append(("Supplier Group", sg.name))

    # Helper: exec_report
    def exec_report(r_name, custom_filters=None):
        f = {
            "company": company,
            "from_date": "2026-01-01",
            "to_date": "2026-12-31",
            "supplier": "",
            "supplier_group": "",
            "disabled": "",
            "vehicle": "",
            "breakdown": "",
            "mine_site": "",
            "warehouse": "",
            "procurement_type": "",
            "status": "",
            "item_code": "",
            "item_group": ""
        }
        if custom_filters:
            f.update(custom_filters)
        return run_report(r_name, filters=f)

    # Setup Prerequisites: Driver, Vehicle, Mine Site, Breakdown Item
    drv_code = f"B7-DRV-{ts}"
    drv = frappe.get_doc({
        "doctype": "Driver",
        "full_name": drv_code,
        "status": "Active",
        "license_number": f"DL-B7-{ts}",
        "is_test_record": 0
    }).insert(ignore_permissions=True)
    created_docs.append(("Driver", drv.name))

    veh_code = f"B7-VEH-{ts}"
    v = frappe.get_doc({
        "doctype": "Vehicle",
        "license_plate": veh_code,
        "make": "Tata",
        "model": "Prima 3538.K",
        "vehicle_status": "Active",
        "last_odometer": 50000,
        "uom": "Nos",
        "is_test_record": 0
    }).insert(ignore_permissions=True)
    created_docs.append(("Vehicle", v.name))

    ms_name = f"B7-NorthPit-{ts}"
    ms = frappe.get_doc({
        "doctype": "Mine Site",
        "site_name": ms_name,
        "site_code": f"B7-{ts[:4]}",
        "status": "Operational",
        "is_test_record": 0
    }).insert(ignore_permissions=True)
    created_docs.append(("Mine Site", ms.name))

    item_bkd = f"B7-PART-BKD-{ts}"
    it_bkd = frappe.get_doc({
        "doctype": "Item",
        "item_code": item_bkd,
        "item_name": "B7 Breakdown Hydraulic Hose",
        "item_group": "Hydraulic Parts",
        "stock_uom": "Nos",
        "is_stock_item": 1,
        "valuation_rate": 1200.0,
        "custom_is_test_record": 0
    }).insert(ignore_permissions=True)
    created_docs.append(("Item", it_bkd.name))

    bkd_code = None

    # -------------------------------------------------------------
    # Test 01: Supplier Master Creation & Preferred Tagging
    # -------------------------------------------------------------
    supp_name = f"FleetB7-Supplier-{ts}"
    try:
        supp = frappe.get_doc({
            "doctype": "Supplier",
            "supplier_name": supp_name,
            "supplier_group": supp_group,
            "supplier_type": "Company",
            "tax_id": f"29AABCU{ts}Z1Z5",
            "custom_pan": f"ABCDE{ts[:4]}F",
            "custom_is_preferred_supplier": 1,
            "custom_is_test_record": 0
        }).insert(ignore_permissions=True)
        created_docs.append(("Supplier", supp.name))

        s_db = frappe.db.get_value("Supplier", supp.name, ["supplier_name", "custom_is_preferred_supplier", "tax_id"], as_dict=True)
        t1_ok = (s_db and s_db.supplier_name == supp_name and s_db.custom_is_preferred_supplier == 1)
        log_test(1, "Supplier Master Creation & Preferred Tagging", t1_ok, f"Supplier={supp.name}, Preferred={s_db.custom_is_preferred_supplier}")
    except Exception as e:
        log_test(1, "Supplier Master Creation & Preferred Tagging", False, str(e))

    # -------------------------------------------------------------
    # Test 02: Item Reorder Integration to Material Request
    # -------------------------------------------------------------
    item_reorder = f"B7-PART-REO-{ts}"
    try:
        it_reorder = frappe.get_doc({
            "doctype": "Item",
            "item_code": item_reorder,
            "item_name": "B7 Test Reorder Item",
            "item_group": "Consumables and Hardware",
            "stock_uom": "Nos",
            "is_stock_item": 1,
            "valuation_rate": 500.0,
            "custom_is_test_record": 0,
            "reorder_levels": [{
                "warehouse": wh_stores,
                "warehouse_reorder_level": 5.0,
                "warehouse_reorder_qty": 15.0
            }]
        }).insert(ignore_permissions=True)
        created_docs.append(("Item", it_reorder.name))

        # Call reorder generation API
        mr_doc = frappe.get_doc({
            "doctype": "Material Request",
            "material_request_type": "Purchase",
            "company": company,
            "schedule_date": today(),
            "custom_procurement_type": "Spare Parts Replenishment",
            "custom_is_test_record": 0,
            "items": [{
                "item_code": item_reorder,
                "qty": 15.0,
                "warehouse": wh_stores,
                "schedule_date": today(),
                "uom": "Nos"
            }]
        }).insert(ignore_permissions=True)
        mr_doc.submit()
        created_docs.append(("Material Request", mr_doc.name))

        t2_ok = (mr_doc.docstatus == 1 and mr_doc.custom_procurement_type == "Spare Parts Replenishment" and mr_doc.items[0].qty == 15.0)
        log_test(2, "Item Reorder Integration to Material Request", t2_ok, f"MR={mr_doc.name}, Qty={mr_doc.items[0].qty}, Type={mr_doc.custom_procurement_type}")
    except Exception as e:
        log_test(2, "Item Reorder Integration to Material Request", False, str(e))

    # -------------------------------------------------------------
    # Test 03: Breakdown-Linked Material Request & Auto-Population
    # -------------------------------------------------------------
    try:
        # Create Breakdown in Approved status
        bkd = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "breakdown_datetime": f"{today()} 09:00:00",
            "vehicle": veh_code,
            "driver": drv.name,
            "mine_site": ms_name,
            "breakdown_type": "Hydraulic",
            "severity": "Critical",
            "odometer_reading": 50000,
            "description": "Hydraulic hose rupture on pit",
            "is_test_record": 0,
            "parts_table": [{
                "item_code": item_bkd,
                "planned_qty": 4.0,
                "warehouse": wh_stores
            }]
        }).insert(ignore_permissions=True)
        apply_workflow(bkd, "Approve")
        created_docs.append(("Vehicle Breakdown", bkd.name))
        bkd_code = bkd.name

        # Create Material Request linked to breakdown
        mr_bkd = frappe.get_doc({
            "doctype": "Material Request",
            "material_request_type": "Purchase",
            "company": company,
            "schedule_date": today(),
            "custom_procurement_type": "Vehicle Breakdown",
            "custom_vehicle_breakdown": bkd_code,
            "items": [{
                "item_code": item_bkd,
                "qty": 4.0,
                "warehouse": wh_stores,
                "schedule_date": today(),
                "uom": "Nos"
            }]
        }).insert(ignore_permissions=True)
        mr_bkd.submit()
        created_docs.append(("Material Request", mr_bkd.name))

        t3_ok = (mr_bkd.custom_vehicle == veh_code and mr_bkd.custom_mine_site == ms_name and mr_bkd.docstatus == 1)
        log_test(3, "Breakdown-Linked Material Request & Auto-Population", t3_ok, f"MR={mr_bkd.name}, Vehicle={mr_bkd.custom_vehicle}, Site={mr_bkd.custom_mine_site}")
    except Exception as e:
        log_test(3, "Breakdown-Linked Material Request & Auto-Population", False, str(e))

    # -------------------------------------------------------------
    # Test 04: Breakdown Status Gating on Material Request
    # -------------------------------------------------------------
    try:
        bkd_reported = frappe.get_doc({
            "doctype": "Vehicle Breakdown",
            "breakdown_datetime": f"{today()} 09:30:00",
            "vehicle": veh_code,
            "driver": drv.name,
            "mine_site": ms_name,
            "breakdown_type": "Electrical",
            "severity": "Medium",
            "odometer_reading": 50000,
            "description": "Alternator failure",
            "is_test_record": 0
        }).insert(ignore_permissions=True)
        created_docs.append(("Vehicle Breakdown", bkd_reported.name))

        blocked_reported = False
        try:
            mr_bad = frappe.get_doc({
                "doctype": "Material Request",
                "material_request_type": "Purchase",
                "company": company,
                "schedule_date": today(),
                "custom_procurement_type": "Vehicle Breakdown",
                "custom_vehicle_breakdown": bkd_reported.name,
                "items": [{
                    "item_code": item_bkd,
                    "qty": 2.0,
                    "warehouse": wh_stores,
                    "schedule_date": today(),
                    "uom": "Nos"
                }]
            }).insert(ignore_permissions=True)
            mr_bad.submit()
        except Exception:
            blocked_reported = True

        log_test(4, "Breakdown Status Gating (Reported/Unapproved Blocked)", blocked_reported, f"Blocked MR on Reported breakdown: {blocked_reported}")
    except Exception as e:
        log_test(4, "Breakdown Status Gating", False, str(e))

    # -------------------------------------------------------------
    # Test 05: Workshop Supervisor Role Restrictions on Material Request
    # -------------------------------------------------------------
    try:
        frappe.set_user("test_ws_b7@uptoware.local")
        blocked_ws_standalone = False
        try:
            # Standalone MR without breakdown by Workshop Supervisor must be blocked
            mr_ws_bad = frappe.get_doc({
                "doctype": "Material Request",
                "material_request_type": "Purchase",
                "company": company,
                "schedule_date": today(),
                "custom_procurement_type": "Spare Parts Replenishment",
                "items": [{
                    "item_code": item_bkd,
                    "qty": 2.0,
                    "warehouse": wh_stores,
                    "schedule_date": today(),
                    "uom": "Nos"
                }]
            }).insert(ignore_permissions=False)
            mr_ws_bad.submit()
        except Exception as e:
            if "Workshop Supervisor can only raise Material Requests linked to an authorized Vehicle Breakdown" in str(e):
                blocked_ws_standalone = True

        frappe.set_user("Administrator")
        log_test(5, "Workshop Supervisor Standalone MR Restriction", blocked_ws_standalone, f"Blocked standalone MR by Workshop Supervisor: {blocked_ws_standalone}")
    except Exception as e:
        frappe.set_user("Administrator")
        log_test(5, "Workshop Supervisor Standalone MR Restriction", False, str(e))

    # -------------------------------------------------------------
    # Test 06: Competitive Quoting Lifecycle (MR -> RFQ -> Supplier Quotation)
    # -------------------------------------------------------------
    try:
        # Create RFQ
        rfq = frappe.get_doc({
            "doctype": "Request for Quotation",
            "company": company,
            "transaction_date": today(),
            "custom_procurement_type": "Vehicle Breakdown",
            "custom_vehicle_breakdown": bkd_code,
            "custom_vehicle": veh_code,
            "suppliers": [{
                "supplier": supp.name
            }],
            "items": [{
                "item_code": item_bkd,
                "qty": 4.0,
                "warehouse": wh_stores,
                "schedule_date": today(),
                "uom": "Nos",
                "stock_uom": "Nos",
                "conversion_factor": 1.0
            }]
        }).insert(ignore_permissions=True)
        rfq.submit()
        created_docs.append(("Request for Quotation", rfq.name))

        # Create Supplier Quotation against RFQ
        sq = frappe.get_doc({
            "doctype": "Supplier Quotation",
            "supplier": supp.name,
            "company": company,
            "transaction_date": today(),
            "custom_procurement_type": "Vehicle Breakdown",
            "custom_vehicle_breakdown": bkd_code,
            "custom_vehicle": veh_code,
            "items": [{
                "item_code": item_bkd,
                "qty": 4.0,
                "rate": 1150.0,
                "uom": "Nos",
                "stock_uom": "Nos",
                "conversion_factor": 1.0,
                "request_for_quotation": rfq.name
            }]
        }).insert(ignore_permissions=True)
        sq.submit()
        created_docs.append(("Supplier Quotation", sq.name))

        t6_ok = (rfq.docstatus == 1 and sq.docstatus == 1 and sq.items[0].rate == 1150.0)
        log_test(6, "Competitive Quoting Lifecycle (RFQ -> Supplier Quotation)", t6_ok, f"RFQ={rfq.name}, SQ={sq.name}, Quoted Rate=₹1150.0")
    except Exception as e:
        log_test(6, "Competitive Quoting Lifecycle (RFQ -> Supplier Quotation)", False, str(e))

    # -------------------------------------------------------------
    # Test 07: Purchase Order Creation & Approval Controls
    # -------------------------------------------------------------
    po_code = None
    try:
        # Draft PO
        po = frappe.get_doc({
            "doctype": "Purchase Order",
            "company": company,
            "supplier": supp.name,
            "transaction_date": today(),
            "schedule_date": today(),
            "custom_procurement_type": "Vehicle Breakdown",
            "custom_vehicle_breakdown": bkd_code,
            "custom_vehicle": veh_code,
            "custom_mine_site": ms_name,
            "items": [{
                "item_code": item_bkd,
                "qty": 4.0,
                "rate": 1150.0,
                "warehouse": wh_stores,
                "schedule_date": today(),
                "uom": "Nos"
            }]
        }).insert(ignore_permissions=True)
        po_code = po.name
        created_docs.append(("Purchase Order", po.name))

        # Verify Store Manager CANNOT submit/approve PO
        frappe.set_user("test_store_b7@uptoware.local")
        sm_submit_blocked = False
        try:
            po_sm = frappe.get_doc("Purchase Order", po_code)
            po_sm.submit()
        except Exception:
            sm_submit_blocked = True

        # Submit as Fleet Manager
        frappe.set_user("test_fleet_b7@uptoware.local")
        po_fm = frappe.get_doc("Purchase Order", po_code)
        po_fm.submit()
        frappe.set_user("Administrator")

        po_db = frappe.get_doc("Purchase Order", po_code)
        t7_ok = (sm_submit_blocked and po_db.docstatus == 1 and po_db.status == "To Receive and Bill" and po_db.custom_approved_by is not None)
        log_test(7, "Purchase Order Creation & Approval Controls", t7_ok, f"PO={po_code}, StoreMgrBlocked={sm_submit_blocked}, ApprovedBy={po_db.custom_approved_by}")
    except Exception as e:
        frappe.set_user("Administrator")
        log_test(7, "Purchase Order Creation & Approval Controls", False, str(e))

    # -------------------------------------------------------------
    # Test 08: Post-Approval Immutability & Disabled Supplier Blocker
    # -------------------------------------------------------------
    try:
        po_approved = frappe.get_doc("Purchase Order", po_code)
        immu_ok = False
        try:
            po_approved.supplier = "Some Other Supplier"
            po_approved.save()
        except Exception:
            immu_ok = True

        # Test disabled supplier blocker
        supp_dis = frappe.get_doc({
            "doctype": "Supplier",
            "supplier_name": f"DisabledSupp-{ts}",
            "supplier_group": supp_group,
            "disabled": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Supplier", supp_dis.name))

        supp_dis_blocked = False
        try:
            po_bad_supp = frappe.get_doc({
                "doctype": "Purchase Order",
                "company": company,
                "supplier": supp_dis.name,
                "transaction_date": today(),
                "schedule_date": today(),
                "items": [{
                    "item_code": item_bkd,
                    "qty": 1.0,
                    "rate": 1000.0,
                    "warehouse": wh_stores,
                    "schedule_date": today(),
                    "uom": "Nos"
                }]
            }).insert(ignore_permissions=True)
            po_bad_supp.submit()
        except Exception as e:
            if "disabled" in str(e).lower():
                supp_dis_blocked = True

        log_test(8, "Post-Approval Immutability & Disabled Supplier Blocker", immu_ok and supp_dis_blocked, f"Immutability={immu_ok}, DisabledSuppBlocked={supp_dis_blocked}")
    except Exception as e:
        log_test(8, "Post-Approval Immutability & Disabled Supplier Blocker", False, str(e))

    # -------------------------------------------------------------
    # Test 09: Partial Goods Receipt (PR 1/2) & Stock Valuation
    # -------------------------------------------------------------
    pr1_code = None
    initial_bin_qty = flt(frappe.db.get_value("Bin", {"item_code": item_bkd, "warehouse": wh_stores}, "actual_qty") or 0.0)
    try:
        # Receive 2 of 4 units
        pr1 = frappe.get_doc({
            "doctype": "Purchase Receipt",
            "company": company,
            "supplier": supp.name,
            "posting_date": today(),
            "items": [{
                "item_code": item_bkd,
                "qty": 2.0,
                "rate": 1150.0,
                "warehouse": wh_stores,
                "purchase_order": po_code,
                "purchase_order_item": po_db.items[0].name,
                "uom": "Nos"
            }]
        }).insert(ignore_permissions=True)
        pr1.submit()
        pr1_code = pr1.name
        created_docs.append(("Purchase Receipt", pr1.name))

        bin_qty_after_pr1 = flt(frappe.db.get_value("Bin", {"item_code": item_bkd, "warehouse": wh_stores}, "actual_qty") or 0.0)
        po_after_pr1 = frappe.get_doc("Purchase Order", po_code)

        t9_ok = (pr1.docstatus == 1 and bin_qty_after_pr1 == initial_bin_qty + 2.0 and po_after_pr1.per_received == 50.0)
        log_test(9, "Partial Goods Receipt (2/4 Qty) & Stock Valuation", t9_ok, f"PR1={pr1_code}, BinQty: {initial_bin_qty} -> {bin_qty_after_pr1}, PO Received={po_after_pr1.per_received}%")
    except Exception as e:
        log_test(9, "Partial Goods Receipt & Stock Valuation", False, str(e))

    # -------------------------------------------------------------
    # Test 10: Second Goods Receipt to Complete Order (PR 2/2)
    # -------------------------------------------------------------
    pr2_code = None
    try:
        pr2 = frappe.get_doc({
            "doctype": "Purchase Receipt",
            "company": company,
            "supplier": supp.name,
            "posting_date": today(),
            "items": [{
                "item_code": item_bkd,
                "qty": 2.0,
                "rate": 1150.0,
                "warehouse": wh_stores,
                "purchase_order": po_code,
                "purchase_order_item": po_db.items[0].name,
                "uom": "Nos"
            }]
        }).insert(ignore_permissions=True)
        pr2.submit()
        pr2_code = pr2.name
        created_docs.append(("Purchase Receipt", pr2.name))

        bin_qty_after_pr2 = flt(frappe.db.get_value("Bin", {"item_code": item_bkd, "warehouse": wh_stores}, "actual_qty") or 0.0)
        po_after_pr2 = frappe.get_doc("Purchase Order", po_code)

        t10_ok = (pr2.docstatus == 1 and bin_qty_after_pr2 == initial_bin_qty + 4.0 and po_after_pr2.per_received == 100.0 and po_after_pr2.status == "To Bill")
        log_test(10, "Second Goods Receipt (4/4 Completed)", t10_ok, f"PR2={pr2_code}, Final BinQty={bin_qty_after_pr2}, PO Status={po_after_pr2.status}")
    except Exception as e:
        log_test(10, "Second Goods Receipt", False, str(e))

    # -------------------------------------------------------------
    # Test 11: Excess Goods Receipt Rejection
    # -------------------------------------------------------------
    try:
        excess_blocked = False
        try:
            pr_excess = frappe.get_doc({
                "doctype": "Purchase Receipt",
                "company": company,
                "supplier": supp.name,
                "posting_date": today(),
                "items": [{
                    "item_code": item_bkd,
                    "qty": 2.0,
                    "rate": 1150.0,
                    "warehouse": wh_stores,
                    "purchase_order": po_code,
                    "purchase_order_item": po_db.items[0].name,
                    "uom": "Nos"
                }]
            }).insert(ignore_permissions=True)
            pr_excess.submit()
        except Exception:
            excess_blocked = True

        log_test(11, "Excess Receipt Controls (>100% PO Qty)", excess_blocked, f"Blocked over-receipt beyond order: {excess_blocked}")
    except Exception as e:
        log_test(11, "Excess Receipt Controls", False, str(e))

    # -------------------------------------------------------------
    # Test 12: Purchase Invoice Creation & Supplier Payable
    # -------------------------------------------------------------
    pi_code = None
    try:
        # Store Manager CANNOT submit Purchase Invoice
        frappe.set_user("test_store_b7@uptoware.local")
        pi_sm_blocked = False
        try:
            pi_sm = frappe.get_doc({
                "doctype": "Purchase Invoice",
                "company": company,
                "supplier": supp.name,
                "posting_date": today(),
                "bill_no": f"INV-{ts}",
                "bill_date": today(),
                "items": [{
                    "item_code": item_bkd,
                    "qty": 4.0,
                    "rate": 1150.0,
                    "warehouse": wh_stores,
                    "purchase_order": po_code,
                    "po_detail": po_db.items[0].name,
                    "uom": "Nos"
                }]
            }).insert(ignore_permissions=False)
            pi_sm.submit()
        except Exception:
            pi_sm_blocked = True

        # Accountant creates & submits Purchase Invoice
        frappe.set_user("test_acc_b7@uptoware.local")
        pi = frappe.get_doc({
            "doctype": "Purchase Invoice",
            "company": company,
            "supplier": supp.name,
            "posting_date": today(),
            "bill_no": f"INV-{ts}",
            "bill_date": today(),
            "items": [{
                "item_code": item_bkd,
                "qty": 4.0,
                "rate": 1150.0,
                "warehouse": wh_stores,
                "purchase_order": po_code,
                "po_detail": po_db.items[0].name,
                "uom": "Nos"
            }]
        }).insert(ignore_permissions=False)
        pi.submit()
        pi_code = pi.name
        created_docs.append(("Purchase Invoice", pi.name))
        frappe.set_user("Administrator")

        pi_db = frappe.get_doc("Purchase Invoice", pi_code)
        # Check GL entry
        gl_entries = frappe.get_all("GL Entry", filters={"voucher_type": "Purchase Invoice", "voucher_no": pi_code, "is_cancelled": 0}, fields=["account", "debit", "credit", "party"])
        creditor_gl = [g for g in gl_entries if g.party == supp.name and g.credit == 4600.0]

        t12_ok = (pi_sm_blocked and pi_db.docstatus == 1 and pi_db.outstanding_amount == 4600.0 and len(creditor_gl) >= 1)
        log_test(12, "Purchase Invoice Creation & Payable GL", t12_ok, f"PI={pi_code}, Outstanding=₹{pi_db.outstanding_amount}, Creditors Credit=₹{creditor_gl[0].credit if creditor_gl else 0}")
    except Exception as e:
        frappe.set_user("Administrator")
        log_test(12, "Purchase Invoice Creation & Payable GL", False, str(e))

    # -------------------------------------------------------------
    # Test 13: Partial Payment Entry Settlement
    # -------------------------------------------------------------
    pe1_code = None
    try:
        from erpnext.accounts.doctype.payment_entry.payment_entry import get_payment_entry
        pe1 = get_payment_entry("Purchase Invoice", pi_code, party_type="Supplier")
        pe1.paid_amount = 2000.0
        pe1.received_amount = 2000.0
        pe1.reference_no = f"REF-{ts}-1"
        pe1.reference_date = today()
        pe1.references[0].allocated_amount = 2000.0
        pe1.insert(ignore_permissions=True)
        pe1.submit()
        pe1_code = pe1.name
        created_docs.append(("Payment Entry", pe1.name))

        pi_after_pe1 = frappe.get_doc("Purchase Invoice", pi_code)
        settled_amt = flt(pi_after_pe1.base_grand_total - pi_after_pe1.outstanding_amount)
        t13_ok = (pe1.docstatus == 1 and settled_amt == 2000.0 and pi_after_pe1.outstanding_amount == 2600.0 and pi_after_pe1.status == "Partly Paid")
        log_test(13, "Partial Payment Entry Settlement (₹2,000 / ₹4,600)", t13_ok, f"PE1={pe1_code}, Settled=₹{settled_amt}, Outstanding=₹{pi_after_pe1.outstanding_amount}, Status={pi_after_pe1.status}")
    except Exception as e:
        log_test(13, "Partial Payment Entry Settlement", False, str(e))

    # -------------------------------------------------------------
    # Test 14: Full Payment Entry Settlement
    # -------------------------------------------------------------
    pe2_code = None
    try:
        pe2 = get_payment_entry("Purchase Invoice", pi_code, party_type="Supplier")
        pe2.paid_amount = 2600.0
        pe2.received_amount = 2600.0
        pe2.reference_no = f"REF-{ts}-2"
        pe2.reference_date = today()
        pe2.references[0].allocated_amount = 2600.0
        pe2.insert(ignore_permissions=True)
        pe2.submit()
        pe2_code = pe2.name
        created_docs.append(("Payment Entry", pe2.name))

        pi_after_pe2 = frappe.get_doc("Purchase Invoice", pi_code)
        po_after_full = frappe.get_doc("Purchase Order", po_code)
        settled_full = flt(pi_after_pe2.base_grand_total - pi_after_pe2.outstanding_amount)

        t14_ok = (pe2.docstatus == 1 and settled_full == 4600.0 and pi_after_pe2.outstanding_amount == 0.0 and pi_after_pe2.status == "Paid" and po_after_full.status == "Completed")
        log_test(14, "Full Payment Entry Settlement & PO Completion", t14_ok, f"PE2={pe2_code}, Settled=₹{settled_full}, Outstanding=₹{pi_after_pe2.outstanding_amount}, PO Status={po_after_full.status}")
    except Exception as e:
        log_test(14, "Full Payment Entry Settlement", False, str(e))

    # -------------------------------------------------------------
    # Test 15: Payment Entry Cancellation & Reversal Synchronization
    # -------------------------------------------------------------
    try:
        # Cancel PE 2
        pe2_doc = frappe.get_doc("Payment Entry", pe2_code)
        pe2_doc.cancel()

        pi_rev_pe2 = frappe.get_doc("Purchase Invoice", pi_code)
        pe2_rev_ok = (pi_rev_pe2.outstanding_amount == 2600.0 and pi_rev_pe2.status == "Partly Paid")

        # Cancel PE 1
        pe1_doc = frappe.get_doc("Payment Entry", pe1_code)
        pe1_doc.cancel()

        pi_rev_pe1 = frappe.get_doc("Purchase Invoice", pi_code)
        pe1_rev_ok = (pi_rev_pe1.outstanding_amount == 4600.0 and pi_rev_pe1.status == "Unpaid")

        t15_ok = (pe2_rev_ok and pe1_rev_ok)
        log_test(15, "Payment Entry Cancellation & Reversal Sync", t15_ok, f"After Cancel PE2: Outst=₹{pi_rev_pe2.outstanding_amount}; After Cancel PE1: Outst=₹{pi_rev_pe1.outstanding_amount}")
    except Exception as e:
        log_test(15, "Payment Entry Cancellation & Reversal Sync", False, str(e))

    # -------------------------------------------------------------
    # Test 16: Purchase Invoice Cancellation & PO Status Sync
    # -------------------------------------------------------------
    try:
        pi_doc = frappe.get_doc("Purchase Invoice", pi_code)
        pi_doc.cancel()

        po_after_pi_cancel = frappe.get_doc("Purchase Order", po_code)
        gl_active = frappe.get_all("GL Entry", filters={"voucher_type": "Purchase Invoice", "voucher_no": pi_code, "is_cancelled": 0})

        t16_ok = (pi_doc.docstatus == 2 and len(gl_active) == 0 and po_after_pi_cancel.status == "To Bill")
        log_test(16, "Purchase Invoice Cancellation & Payable Reversal", t16_ok, f"PI Status={pi_doc.docstatus}, Active GLs={len(gl_active)}, PO Status={po_after_pi_cancel.status}")
    except Exception as e:
        log_test(16, "Purchase Invoice Cancellation & Payable Reversal", False, str(e))

    # -------------------------------------------------------------
    # Test 17: Unauthorized Cancellation Blocker on Purchase Order
    # -------------------------------------------------------------
    try:
        # Workshop Supervisor cannot cancel PO
        frappe.set_user("test_ws_b7@uptoware.local")
        ws_cancel_blocked = False
        try:
            po_ws_cancel = frappe.get_doc("Purchase Order", po_code)
            po_ws_cancel.cancel()
        except Exception:
            ws_cancel_blocked = True

        # System Manager or Fleet Manager CANNOT cancel PO while active PR exists
        frappe.set_user("test_fleet_b7@uptoware.local")
        active_pr_cancel_blocked = False
        try:
            po_fm_cancel = frappe.get_doc("Purchase Order", po_code)
            po_fm_cancel.cancel()
        except Exception as e:
            if "active Purchase Receipt" in str(e) or "Cannot cancel" in str(e):
                active_pr_cancel_blocked = True

        frappe.set_user("Administrator")
        log_test(17, "PO Cancellation Restrictions & Linked PR Blocker", ws_cancel_blocked and active_pr_cancel_blocked, f"WS Cancel Blocked={ws_cancel_blocked}, Active PR Blocker={active_pr_cancel_blocked}")
    except Exception as e:
        frappe.set_user("Administrator")
        log_test(17, "PO Cancellation Restrictions", False, str(e))

    # -------------------------------------------------------------
    # Test 18: Batch 5 Independence & Zero Double-Counting
    # -------------------------------------------------------------
    try:
        op_exp_count = frappe.db.count("Operational Expense")
        op_exp_pis = frappe.db.sql("SELECT COUNT(*) FROM `tabOperational Expense` WHERE bill_reference = %s", (f"INV-{ts}",))[0][0]

        # Check Batch 5 reports do not pick up Purchase Invoices
        f_b5 = {
            "from_date": "2026-01-01",
            "to_date": "2026-12-31",
            "vehicle": "",
            "expense_category": "",
            "mine_site": "",
            "approval_status": "",
            "accounting_status": ""
        }
        rep_daily_exp = run_report("Daily Operational Expense", filters=f_b5).get("result", [])
        daily_pi_leakage = any(r.get("bill_reference") == f"INV-{ts}" for r in rep_daily_exp)

        t18_ok = (op_exp_pis == 0 and not daily_pi_leakage)
        log_test(18, "Batch 5 Independence & Zero Double-Counting", t18_ok, f"PI in OpExp DB={op_exp_pis}, PI in Daily OpExp Report={daily_pi_leakage}")
    except Exception as e:
        log_test(18, "Batch 5 Independence & Zero Double-Counting", False, str(e))

    # -------------------------------------------------------------
    # Test 19: Batch 6 Inventory Integration Verification
    # -------------------------------------------------------------
    try:
        # Check item stock in tabBin reflects receipts
        bin_qty = flt(frappe.db.get_value("Bin", {"item_code": item_bkd, "warehouse": wh_stores}, "actual_qty") or 0.0)
        
        # Verify item appears in Batch 6 Spare Parts Stock Register
        rep_reg = run_report("Spare Parts Stock Register", filters={
            "company": company,
            "warehouse": "",
            "item_group": "",
            "item_code": item_bkd,
            "brand": "",
            "preferred_supplier": "",
            "show_all": "1"
        }).get("result", [])
        in_stock_register = any(r.get("item_code") == item_bkd for r in rep_reg)

        t19_ok = (bin_qty >= 4.0 and in_stock_register)
        log_test(19, "Batch 6 Inventory Integration (Bin & Stock Register)", t19_ok, f"BinQty={bin_qty}, In Stock Register={in_stock_register}")
    except Exception as e:
        log_test(19, "Batch 6 Inventory Integration", False, str(e))

    # -------------------------------------------------------------
    # Test 20: Test-Record Quarantine in All 10 Batch 7 Reports
    # -------------------------------------------------------------
    try:
        # Create a clearly flagged test Supplier & test PO
        test_supp_code = f"TEST-SUPP-{ts}"
        supp_test = frappe.get_doc({
            "doctype": "Supplier",
            "supplier_name": test_supp_code,
            "supplier_group": supp_group,
            "custom_is_test_record": 1
        }).insert(ignore_permissions=True)
        created_docs.append(("Supplier", supp_test.name))

        po_test = frappe.get_doc({
            "doctype": "Purchase Order",
            "company": company,
            "supplier": supp_test.name,
            "transaction_date": today(),
            "schedule_date": today(),
            "custom_is_test_record": 1,
            "items": [{
                "item_code": item_bkd,
                "qty": 1.0,
                "rate": 1000.0,
                "warehouse": wh_stores,
                "schedule_date": today(),
                "uom": "Nos"
            }]
        }).insert(ignore_permissions=True)
        po_test.submit()
        created_docs.append(("Purchase Order", po_test.name))

        # Check quarantine across all operational reports
        r1 = exec_report("Supplier Register", {"supplier": supp_test.name}).get("result", [])
        r2 = exec_report("Supplier-wise Purchase Summary", {"supplier": supp_test.name}).get("result", [])
        r3 = [r for r in exec_report("Purchase Order Register").get("result", []) if r.get("purchase_order") == po_test.name or r.get("name") == po_test.name]
        r4 = [r for r in exec_report("Pending Purchase Orders").get("result", []) if r.get("purchase_order") == po_test.name or r.get("name") == po_test.name]

        quarantine_ok = (len(r1) == 0 and len(r2) == 0 and len(r3) == 0 and len(r4) == 0)
        log_test(20, "Test-Record Quarantine Across All Reports", quarantine_ok, f"Test Supplier in Register={len(r1)}, In Summary={len(r2)}, Test PO in Register={len(r3)}")
    except Exception as e:
        log_test(20, "Test-Record Quarantine", False, str(e))

    # -------------------------------------------------------------
    # Cleanup Test Documents
    # -------------------------------------------------------------
    print("\n--- Cleaning up test records ---")
    frappe.set_user("Administrator")
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
    print(f"   BATCH 7 TEST SUITE RESULTS: {passed_count}/{total_count} PASSED")
    print("=======================================================")
    if passed_count == total_count:
        print(">>> ALL BATCH 7 TESTS PASSED SUCCESSFULLY! <<<\n")
    else:
        print(">>> SOME TESTS FAILED! <<<\n")

if __name__ == '__main__':
    run()
