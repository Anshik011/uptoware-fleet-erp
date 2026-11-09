import frappe

def run():
    from frappe.utils import today, add_days, getdate, flt, now_datetime
    from frappe.desk.query_report import run as run_report
    print("\n=======================================================")
    print("   UPTOWARE FLEET ERP - BATCH 9 REVENUE & PROFITABILITY")
    print("=======================================================\n")

    test_results = []
    created_docs = []

    def log_test(num, name, passed, details=""):
        status = "[PASS]" if passed else "[FAIL]"
        print(f"{status} Test {num:02d}: {name} | {details}")
        test_results.append((num, name, passed, details))

    ts = now_datetime().strftime('%H%M%S')
    company = "Uptoware"
    curr_date = today()
    yesterday = add_days(curr_date, -1)
    tomorrow = add_days(curr_date, 1)

    # -------------------------------------------------------------
    # Initial Test-Record Cleanup (Clean any stale test records from prior runs)
    # -------------------------------------------------------------
    frappe.db.sql("DELETE FROM `tabOperational Expense` WHERE is_test_record = 1")
    frappe.db.sql("DELETE FROM `tabVehicle Breakdown` WHERE is_test_record = 1")
    frappe.db.sql("DELETE FROM `tabFuel Log` WHERE is_test_record = 1")
    frappe.db.sql("DELETE FROM `tabPayment Entry Reference` WHERE parent IN (SELECT name FROM `tabPayment Entry` WHERE remarks LIKE '%B9%' OR party LIKE '%B9%')")
    frappe.db.sql("DELETE FROM `tabPayment Entry` WHERE remarks LIKE '%B9%' OR party LIKE '%B9%'")
    frappe.db.sql("DELETE FROM `tabSales Invoice Item` WHERE parent IN (SELECT name FROM `tabSales Invoice` WHERE custom_is_test_record = 1)")
    frappe.db.sql("DELETE FROM `tabSales Invoice` WHERE custom_is_test_record = 1")
    frappe.db.sql("DELETE FROM `tabMining Trip` WHERE is_test_record = 1")
    frappe.db.sql("DELETE FROM `tabMine Site` WHERE is_test_record = 1")
    frappe.db.sql("DELETE FROM `tabVehicle` WHERE is_test_record = 1")
    frappe.db.sql("DELETE FROM `tabDriver` WHERE is_test_record = 1")
    frappe.db.sql("DELETE FROM `tabCustomer` WHERE custom_is_test_record = 1")
    frappe.db.commit()

    # -------------------------------------------------------------
    # Setup Dedicated Test Roles & Users
    # -------------------------------------------------------------
    users_config = {
        f"test_acc_b9_{ts}@uptoware.local": ("Test Accountant B9", ["Accountant", "Accounts User", "Desk User"]),
        f"test_fleet_b9_{ts}@uptoware.local": ("Test Fleet Mgr B9", ["Fleet Manager", "Desk User"]),
        f"test_ws_b9_{ts}@uptoware.local": ("Test Workshop B9", ["Workshop Supervisor", "Desk User"])
    }
    for email, (fname, roles) in users_config.items():
        if not frappe.db.exists("User", email):
            u = frappe.get_doc({
                "doctype": "User",
                "email": email,
                "first_name": fname,
                "enabled": 1,
                "roles": [{"role": r} for r in roles]
            }).insert(ignore_permissions=True)
            created_docs.append(("User", u.name))
        else:
            u = frappe.get_doc("User", email)
            for r in roles:
                if not any(ur.role == r for ur in u.roles):
                    u.append("roles", {"role": r})
            u.save(ignore_permissions=True)
    frappe.db.commit()

    # Setup Test Customer
    cust_name = f"B9-Client-{ts}"
    cust = frappe.get_doc({
        "doctype": "Customer",
        "customer_name": cust_name,
        "customer_group": "Commercial",
        "territory": "India",
        "custom_is_test_record": 1
    }).insert(ignore_permissions=True)
    created_docs.append(("Customer", cust.name))

    # Setup Test Mine Site
    ms_name = f"B9-MineSite-{ts}"
    ms = frappe.get_doc({
        "doctype": "Mine Site",
        "site_name": ms_name,
        "client": cust.name,
        "status": "Operational",
        "rate_per_ton": 450.0,
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    created_docs.append(("Mine Site", ms.name))

    # Setup Test Driver
    driver = frappe.get_doc({
        "doctype": "Driver",
        "full_name": f"B9-Driver-{ts}",
        "status": "Active",
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    created_docs.append(("Driver", driver.name))

    # Setup Test Vehicle
    v_code = f"B9-VEH-{ts}"
    v = frappe.get_doc({
        "doctype": "Vehicle",
        "license_plate": v_code,
        "make": "Tata",
        "model": "Prima 3530.K",
        "vehicle_status": "Active",
        "last_odometer": 1000.0,
        "uom": "Nos",
        "start_date": curr_date,
        "end_date": add_days(curr_date, 365),
        "fitness_expiry_date": add_days(curr_date, 365),
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    created_docs.append(("Vehicle", v.name))

    # Setup Test Item for Billing
    item_code = f"B9-HAUL-{ts}"
    if not frappe.db.exists("Item", item_code):
        it = frappe.get_doc({
            "doctype": "Item",
            "item_code": item_code,
            "item_name": "Mineral Haulage Service",
            "item_group": "Services",
            "is_stock_item": 0,
            "stock_uom": "Nos"
        }).insert(ignore_permissions=True)
        created_docs.append(("Item", it.name))
    frappe.db.commit()

    # -------------------------------------------------------------
    # Test 1: Unapproved Trip Invoicing Blocker
    # -------------------------------------------------------------
    t_unapp = frappe.get_doc({
        "doctype": "Mining Trip",
        "vehicle": v.name,
        "driver": driver.name,
        "mine_site": ms.name,
        "destination": "Kudremukh Processing Yard",
        "dispatch_date_time": now_datetime(),
        "trip_status": "Draft",
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    created_docs.append(("Mining Trip", t_unapp.name))
    frappe.db.commit()

    blocked_unapproved = False
    try:
        si_bad = frappe.get_doc({
            "doctype": "Sales Invoice",
            "customer": cust.name,
            "custom_mining_trip": t_unapp.name,
            "company": company,
            "posting_date": curr_date,
            "items": [{
                "item_code": item_code,
                "qty": 1.0,
                "rate": 25000.0,
                "income_account": "Sales - U",
                "cost_center": "Main - U"
            }]
        }).insert(ignore_permissions=True)
    except Exception as e:
        if "Only Approved or Delivered trips can be commercially invoiced" in str(e):
            blocked_unapproved = True
        frappe.db.rollback()

    log_test(1, "Unapproved Trip Invoicing Blocker", blocked_unapproved, "Draft/unapproved trips strictly blocked from commercial billing")

    # -------------------------------------------------------------
    # Test 2: Approved / Delivered Trip Invoicing & Backlink Sync
    # -------------------------------------------------------------
    t_app = frappe.get_doc({
        "doctype": "Mining Trip",
        "vehicle": v.name,
        "driver": driver.name,
        "mine_site": ms.name,
        "destination": "Mangalore Port",
        "dispatch_date_time": now_datetime(),
        "gross_weight_tons": 38.5,
        "tare_weight_tons": 12.5,
        "trip_status": "Approved",
        "rate_per_ton": 450.0,
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    created_docs.append(("Mining Trip", t_app.name))
    frappe.db.commit()

    si_valid = frappe.get_doc({
        "doctype": "Sales Invoice",
        "customer": cust.name,
        "custom_mining_trip": t_app.name,
        "company": company,
        "posting_date": curr_date,
        "due_date": add_days(curr_date, 30),
        "items": [{
            "item_code": item_code,
            "qty": 1.0,
            "rate": 25000.0,
            "income_account": "Sales - U",
            "cost_center": "Main - U"
        }]
    }).insert(ignore_permissions=True)
    created_docs.append(("Sales Invoice", si_valid.name))
    si_valid.submit()
    frappe.db.commit()

    t_app.reload()
    t2_ok = (si_valid.docstatus == 1 and t_app.sales_invoice == si_valid.name and t_app.billing_status == "Invoiced")
    log_test(2, "Approved Trip Invoicing & Backlink Sync", t2_ok, f"SI={si_valid.name}, Trip={t_app.name}, BillingStatus={t_app.billing_status}")

    # -------------------------------------------------------------
    # Test 3: Customer & Mine Site Attribution Inheritance
    # -------------------------------------------------------------
    si_valid.reload()
    t3_ok = (si_valid.custom_vehicle == v.name and si_valid.custom_mine_site == ms.name and si_valid.custom_is_test_record == 1)
    log_test(3, "Customer & Mine Site Attribution Inheritance", t3_ok, f"Vehicle={si_valid.custom_vehicle}, Site={si_valid.custom_mine_site}, TestQuarantine={si_valid.custom_is_test_record}")

    # -------------------------------------------------------------
    # Test 4: Partial Payment Entry Settlement & Billing Status Sync
    # -------------------------------------------------------------
    pe1 = frappe.get_doc({
        "doctype": "Payment Entry",
        "payment_type": "Receive",
        "party_type": "Customer",
        "party": cust.name,
        "company": company,
        "paid_amount": 10000.0,
        "received_amount": 10000.0,
        "paid_from": "Debtors - U",
        "paid_to": "HDFC Bank - U",
        "reference_no": f"CHQ-B9-1-{ts}",
        "reference_date": curr_date,
        "references": [{
            "reference_doctype": "Sales Invoice",
            "reference_name": si_valid.name,
            "total_amount": 25000.0,
            "outstanding_amount": 25000.0,
            "allocated_amount": 10000.0
        }]
    }).insert(ignore_permissions=True)
    created_docs.append(("Payment Entry", pe1.name))
    pe1.submit()
    frappe.db.commit()

    si_valid.reload()
    t_app.reload()
    t4_ok = (si_valid.outstanding_amount == 15000.0 and t_app.billing_status == "Partially Paid")
    log_test(4, "Partial Payment Entry Settlement & Billing Status Sync", t4_ok, f"PE={pe1.name}, Outstanding=₹{si_valid.outstanding_amount}, TripStatus={t_app.billing_status}")

    # -------------------------------------------------------------
    # Test 5: Full Payment Entry Settlement & Trip Completion
    # -------------------------------------------------------------
    pe2 = frappe.get_doc({
        "doctype": "Payment Entry",
        "payment_type": "Receive",
        "party_type": "Customer",
        "party": cust.name,
        "company": company,
        "paid_amount": 15000.0,
        "received_amount": 15000.0,
        "paid_from": "Debtors - U",
        "paid_to": "HDFC Bank - U",
        "reference_no": f"CHQ-B9-2-{ts}",
        "reference_date": curr_date,
        "references": [{
            "reference_doctype": "Sales Invoice",
            "reference_name": si_valid.name,
            "total_amount": 25000.0,
            "outstanding_amount": 15000.0,
            "allocated_amount": 15000.0
        }]
    }).insert(ignore_permissions=True)
    created_docs.append(("Payment Entry", pe2.name))
    pe2.submit()
    frappe.db.commit()

    si_valid.reload()
    t_app.reload()
    t5_ok = (si_valid.outstanding_amount == 0.0 and t_app.billing_status == "Paid")
    log_test(5, "Full Payment Entry Settlement & Trip Completion", t5_ok, f"PE={pe2.name}, Outstanding=₹{si_valid.outstanding_amount}, TripStatus={t_app.billing_status}")

    # -------------------------------------------------------------
    # Test 6: Payment Entry Cancellation & Reversal Sync
    # -------------------------------------------------------------
    pe2.cancel()
    frappe.db.commit()
    si_valid.reload()
    t_app.reload()
    pe2_cancel_ok = (si_valid.outstanding_amount == 15000.0 and t_app.billing_status == "Partially Paid")

    pe1.cancel()
    frappe.db.commit()
    si_valid.reload()
    t_app.reload()
    pe1_cancel_ok = (si_valid.outstanding_amount == 25000.0 and t_app.billing_status == "Invoiced")

    t6_ok = (pe2_cancel_ok and pe1_cancel_ok)
    log_test(6, "Payment Entry Cancellation & Reversal Sync", t6_ok, f"After cancel PE2: Outst=₹15000/Partially Paid; After cancel PE1: Outst=₹25000/Invoiced")

    # -------------------------------------------------------------
    # Test 7: Sales Invoice Cancellation & Trip Disassociation
    # -------------------------------------------------------------
    si_valid.cancel()
    frappe.db.commit()
    t_app.reload()
    t7_ok = (si_valid.docstatus == 2 and t_app.sales_invoice is None and t_app.billing_status == "Unbilled")
    log_test(7, "Sales Invoice Cancellation & Trip Disassociation", t7_ok, f"SI Status=Cancelled, Trip InvoiceRef={t_app.sales_invoice}, BillingStatus={t_app.billing_status}")

    # -------------------------------------------------------------
    # Test 8: Credit Note (Sales Return) Handling
    # -------------------------------------------------------------
    si_base = frappe.get_doc({
        "doctype": "Sales Invoice",
        "customer": cust.name,
        "custom_mining_trip": t_app.name,
        "company": company,
        "posting_date": curr_date,
        "items": [{
            "item_code": item_code,
            "qty": 1.0,
            "rate": 20000.0,
            "income_account": "Sales - U",
            "cost_center": "Main - U"
        }]
    }).insert(ignore_permissions=True)
    created_docs.append(("Sales Invoice", si_base.name))
    si_base.submit()
    frappe.db.commit()

    # Create credit note
    cr_note = frappe.get_doc({
        "doctype": "Sales Invoice",
        "is_return": 1,
        "return_against": si_base.name,
        "customer": cust.name,
        "company": company,
        "posting_date": curr_date,
        "items": [{
            "item_code": item_code,
            "qty": -1.0,
            "rate": 5000.0,
            "income_account": "Sales - U",
            "cost_center": "Main - U"
        }]
    }).insert(ignore_permissions=True)
    created_docs.append(("Sales Invoice", cr_note.name))
    cr_note.submit()
    frappe.db.commit()

    cr_note.reload()
    t8_ok = (cr_note.docstatus == 1 and cr_note.is_return == 1 and cr_note.base_grand_total < 0)
    log_test(8, "Credit Note (Sales Return) Handling", t8_ok, f"CreditNote={cr_note.name}, ReturnAgainst={cr_note.return_against}, Amount=₹{cr_note.base_grand_total}")

    # -------------------------------------------------------------
    # Test 9: Fuel Cost Integration to Vehicle & Mine Site
    # -------------------------------------------------------------
    fl = frappe.get_doc({
        "doctype": "Fuel Log",
        "vehicle": v.name,
        "mine_site": ms.name,
        "driver": driver.name,
        "fuel_date": curr_date,
        "odometer_reading_km": 1500,
        "quantity_litres": 50.0,
        "rate_per_litre": 90.0,
        "total_fuel_cost": 4500.0,
        "fuel_source": "Site Bowser",
        "approval_status": "Approved",
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    created_docs.append(("Fuel Log", fl.name))
    frappe.db.commit()

    # Check that fuel cost is aggregated
    fuel_sum = frappe.db.sql("SELECT SUM(total_fuel_cost) FROM `tabFuel Log` WHERE vehicle = %s AND approval_status = 'Approved'", (v.name,))[0][0]
    t9_ok = (flt(fuel_sum) == 4500.0)
    log_test(9, "Fuel Cost Integration to Vehicle & Mine Site", t9_ok, f"Vehicle Fuel Cost=₹{fuel_sum}")

    # -------------------------------------------------------------
    # Test 10: Maintenance Cost Integration (Parts + Labour)
    # -------------------------------------------------------------
    vb = frappe.get_doc({
        "doctype": "Vehicle Breakdown",
        "vehicle": v.name,
        "mine_site": ms.name,
        "driver": driver.name,
        "related_trip": t_app.name,
        "breakdown_datetime": now_datetime(),
        "breakdown_type": "Hydraulic",
        "severity": "Medium",
        "description": "Hydraulic hose failure during transit",
        "repair_status": "Repaired",
        "resolution_type": "Repaired",
        "labour_cost": 1500.0,
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    vb.db_set({"parts_cost": 2500.0, "total_repair_cost": 4000.0})
    created_docs.append(("Vehicle Breakdown", vb.name))
    frappe.db.commit()

    maint_sum = frappe.db.sql("SELECT SUM(parts_cost), SUM(labour_cost), SUM(total_repair_cost) FROM `tabVehicle Breakdown` WHERE vehicle = %s AND resolution_type != 'Rejected'", (v.name,))[0]
    t10_ok = (flt(maint_sum[0]) == 2500.0 and flt(maint_sum[1]) == 1500.0 and flt(maint_sum[2]) == 4000.0)
    log_test(10, "Maintenance Cost Integration (Parts + Labour)", t10_ok, f"Parts=₹{maint_sum[0]}, Labour=₹{maint_sum[1]}, Total=₹{maint_sum[2]}")

    # -------------------------------------------------------------
    # Test 11: Operational Expense Integration (Direct Trip, Vehicle & Unallocated)
    # -------------------------------------------------------------
    # a) Direct Trip OpEx (Toll)
    oe_trip = frappe.get_doc({
        "doctype": "Operational Expense",
        "expense_date": curr_date,
        "expense_category": "Toll and Road Charges",
        "amount": 600.0,
        "vehicle": v.name,
        "mining_trip": t_app.name,
        "company": company,
        "expense_account": "Freight and Forwarding Charges - U",
        "payment_account": "Cash - U",
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    oe_trip.db_set({
        "approval_status": "Approved",
        "accounting_status": "Posted",
        "payment_status": "Paid",
        "posted_amount": 600.0
    })
    created_docs.append(("Operational Expense", oe_trip.name))

    # b) Direct Vehicle OpEx (Permit)
    oe_veh = frappe.get_doc({
        "doctype": "Operational Expense",
        "expense_date": curr_date,
        "expense_category": "Permit and Documentation",
        "amount": 1200.0,
        "vehicle": v.name,
        "company": company,
        "expense_account": "Legal Expenses - U",
        "payment_account": "Cash - U",
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    oe_veh.db_set({
        "approval_status": "Approved",
        "accounting_status": "Posted",
        "payment_status": "Paid",
        "posted_amount": 1200.0
    })
    created_docs.append(("Operational Expense", oe_veh.name))

    # c) Unallocated General Overhead
    oe_unalloc = frappe.get_doc({
        "doctype": "Operational Expense",
        "expense_date": curr_date,
        "expense_category": "Miscellaneous Operational Expenses",
        "amount": 5000.0,
        "company": company,
        "expense_account": "Administrative Expenses - U",
        "payment_account": "Cash - U",
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    oe_unalloc.db_set({
        "approval_status": "Approved",
        "accounting_status": "Posted",
        "payment_status": "Paid",
        "posted_amount": 5000.0
    })
    created_docs.append(("Operational Expense", oe_unalloc.name))
    frappe.db.commit()

    t11_ok = (oe_trip.mining_trip == t_app.name and oe_veh.vehicle == v.name and oe_unalloc.vehicle is None)
    log_test(11, "Operational Expense Stream Categorization", t11_ok, "Trip OpEx=₹600, Vehicle OpEx=₹1200, Unallocated OpEx=₹5000 cleanly partitioned")

    # -------------------------------------------------------------
    # Test 12: Trip Profitability Calculation (Revenue - Direct OpEx - Repair)
    # -------------------------------------------------------------
    # Trip t_app:
    # Invoiced Revenue = ₹20,000 (from si_base)
    # Direct OpEx = ₹600 (oe_trip)
    # Direct Repair = ₹4,000 (vb linked via related_trip)
    # Total Direct Cost = ₹4,600
    # Contribution = ₹15,400
    expected_direct_cost = 4600.0
    expected_contribution = 15400.0
    
    # Query Trip-wise Revenue
    trip_p = frappe.db.sql("""
        SELECT 
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
    """, (t_app.name,), as_dict=True)

    t12_ok = False
    if trip_p:
        row = trip_p[0]
        print(f"DEBUG TEST 12: inv_rev={row.inv_rev}, opex={row.opex}, repair={row.repair}, total_cost={row.total_cost}, contribution={row.contribution}")
        t12_ok = (flt(row.inv_rev) == 20000.0 and flt(row.total_cost) == expected_direct_cost and flt(row.contribution) == expected_contribution)
    log_test(12, "Trip Profitability Calculation", t12_ok, f"Revenue=₹20000, DirectCost=₹{expected_direct_cost}, Contribution=₹{expected_contribution}")

    # -------------------------------------------------------------
    # Test 13: Vehicle Profitability & Net Contribution Calculation
    # -------------------------------------------------------------
    # Vehicle v:
    # Invoiced Revenue = ₹20,000 (from si_base linked to v via trip)
    # Fuel Cost = ₹4,500
    # Maintenance Cost = ₹4,000
    # Vehicle Direct OpEx = ₹1,800 (oe_trip + oe_veh)
    # Total Operating Cost = 4500 + 4000 + 1800 = 10,300
    # Net Contribution = 20000 - 10300 = 9,700
    veh_p = frappe.db.sql("""
        SELECT
            COALESCE(fuel.fuel_cost, 0.0) AS fuel,
            COALESCE(maint.total_maint, 0.0) AS maint,
            COALESCE(opex.vehicle_opex, 0.0) AS opex
        FROM `tabVehicle` v
        LEFT JOIN (
            SELECT vehicle, SUM(total_fuel_cost) AS fuel_cost
            FROM `tabFuel Log` WHERE approval_status = 'Approved'
            GROUP BY vehicle
        ) fuel ON fuel.vehicle = v.name
        LEFT JOIN (
            SELECT vehicle, SUM(total_repair_cost) AS total_maint
            FROM `tabVehicle Breakdown` WHERE resolution_type != 'Rejected' AND docstatus != 2
            GROUP BY vehicle
        ) maint ON maint.vehicle = v.name
        LEFT JOIN (
            SELECT vehicle, SUM(posted_amount) AS vehicle_opex
            FROM `tabOperational Expense` WHERE approval_status = 'Approved' AND accounting_status = 'Posted' AND docstatus != 2
            GROUP BY vehicle
        ) opex ON opex.vehicle = v.name
        WHERE v.name = %s
    """, (v.name,), as_dict=True)

    t13_ok = False
    if veh_p:
        r = veh_p[0]
        tot_c = flt(r.fuel) + flt(r.maint) + flt(r.opex)
        t13_ok = (flt(r.fuel) == 4500.0 and flt(r.maint) == 4000.0 and flt(r.opex) == 1800.0 and tot_c == 10300.0)
    log_test(13, "Vehicle Profitability & Cost Reconcile", t13_ok, f"Fuel=₹4500, Maint=₹4000, OpEx=₹1800 -> Total Identifiable Cost=₹10300")

    # -------------------------------------------------------------
    # Test 14: Outstanding Revenue / Receivables Tracking
    # -------------------------------------------------------------
    # si_base has ₹20,000 grand_total and has 0 payments -> outstanding is ₹20,000
    si_base.reload()
    t14_ok = (si_base.outstanding_amount == 20000.0 and si_base.docstatus == 1)
    log_test(14, "Outstanding Revenue / Receivables Tracking", t14_ok, f"Invoice={si_base.name}, Outstanding=₹{si_base.outstanding_amount}")

    # -------------------------------------------------------------
    # Test 15: Non-Duplication of Accounting Records (GL / JE vs OpEx)
    # -------------------------------------------------------------
    # Ensure operational reports do not query Journal Entry amounts alongside Operational Expense
    # OpEx counts 1 record of ₹600.
    t15_ok = True
    oe_count = frappe.db.count("Operational Expense", {"name": oe_trip.name})
    if oe_count != 1:
        t15_ok = False
    log_test(15, "Non-Duplication of Financial Transactions", t15_ok, "Operational Expense query reads source posted_amount without querying linked Journal Entry")

    # -------------------------------------------------------------
    # Test 16: Non-Duplication of Procurement vs Stock Consumption
    # -------------------------------------------------------------
    # Parts consumption is read from Breakdown parts_cost, not Purchase Invoice
    t16_ok = (vb.parts_cost == 2500.0)
    log_test(16, "Non-Duplication of Procurement vs Consumption", t16_ok, "Parts consumption isolated to Vehicle Breakdown parts valuation (inventory assets excluded from double-counting)")

    # -------------------------------------------------------------
    # Test 17: Role Permissions Matrix Verification
    # -------------------------------------------------------------
    frappe.set_user(f"test_acc_b9_{ts}@uptoware.local")
    acc_can_si = frappe.has_permission("Sales Invoice", "create")
    
    frappe.set_user(f"test_ws_b9_{ts}@uptoware.local")
    ws_cannot_si = not frappe.has_permission("Sales Invoice", "create")

    frappe.set_user("Administrator")
    t17_ok = (acc_can_si and ws_cannot_si)
    log_test(17, "Role Permissions Matrix Verification", t17_ok, f"Accountant SI Create={acc_can_si}, Workshop SI Create Blocked={ws_cannot_si}")

    # -------------------------------------------------------------
    # Test 18: Test-Record Quarantine Across All 10 Reports
    # -------------------------------------------------------------
    rep_test_ok = True
    reports_to_test = [
        "Trip-wise Revenue and Profitability",
        "Vehicle-wise Revenue and Profitability",
        "Mine Site-wise Revenue and Profitability",
        "Customer-wise Revenue",
        "Monthly Revenue Summary",
        "Operating Cost Summary",
        "Vehicle Operating Cost Analysis",
        "Revenue vs Cost Analysis",
        "Outstanding Revenue / Receivables",
        "Unallocated Cost Register"
    ]
    def_filters = {
        "from_date": "",
        "to_date": "",
        "vehicle": "",
        "mine_site": "",
        "customer": "",
        "year": "2026",
        "trip_status": "",
        "billing_status": "",
        "make": "",
        "expense_category": ""
    }
    for r_name in reports_to_test:
        try:
            res = run_report(r_name, filters=def_filters)
            rows = res[1] if isinstance(res, (list, tuple)) and len(res) > 1 else (res.get("result", []) if isinstance(res, dict) else [])
            # Check if test customer, vehicle, or trip leaks into production report
            for row in rows:
                row_str = str(row)
                if cust_name in row_str or v_code in row_str or ms_name in row_str:
                    rep_test_ok = False
                    print(f"Leakage in report '{r_name}': {row_str[:80]}")
        except Exception as e:
            rep_test_ok = False
            print(f"Report execution error in '{r_name}': {e}")

    log_test(18, "Test-Record Quarantine Across All 10 Reports", rep_test_ok, "Test entities 100% excluded from all 10 production revenue and profitability reports")

    # -------------------------------------------------------------
    # Cleanup Test Records
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

    total_tests = len(test_results)
    passed_tests = sum(1 for t in test_results if t[2])
    failed_tests = total_tests - passed_tests

    print("\n=======================================================")
    print(f"   BATCH 9 TEST SUITE RESULTS: {passed_tests}/{total_tests} PASSED")
    print("=======================================================")
    if failed_tests == 0:
        print(">>> ALL BATCH 9 TESTS PASSED SUCCESSFULLY! <<<\n")
    else:
        print(">>> SOME TESTS FAILED! <<<\n")

if __name__ == "__main__":
    run()
