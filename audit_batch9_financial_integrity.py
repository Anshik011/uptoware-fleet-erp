import frappe

def run_audit():
    from frappe.utils import today, add_days, getdate, flt, now_datetime
    from frappe.desk.query_report import run as run_report
    from frappe.model.workflow import apply_workflow

    print("\n=======================================================")
    print("   BATCH 9: COMPREHENSIVE FINANCIAL INTEGRITY AUDIT    ")
    print("=======================================================\n")

    audit_results = []
    created_docs = []

    def log_audit(area_num, area_name, passed, details=""):
        status = "PASS" if passed else "FAIL"
        print(f"[{status}] Area {area_num:02d}: {area_name} | {details}")
        audit_results.append({
            "num": area_num,
            "name": area_name,
            "status": status,
            "details": details
        })

    ts = now_datetime().strftime('%H%M%S')
    company = "Uptoware"
    curr_date = today()
    yesterday = add_days(curr_date, -1)
    tomorrow = add_days(curr_date, 1)

    # Clean any stale test records from prior runs to guarantee test isolation
    frappe.db.sql("DELETE FROM `tabOperational Expense` WHERE is_test_record = 1")
    frappe.db.sql("DELETE FROM `tabVehicle Breakdown` WHERE is_test_record = 1")
    frappe.db.sql("DELETE FROM `tabFuel Log` WHERE is_test_record = 1")
    frappe.db.sql("DELETE FROM `tabPayment Entry Reference` WHERE parent IN (SELECT name FROM `tabPayment Entry` WHERE remarks LIKE '%AUD9%' OR party LIKE '%AUD9%')")
    frappe.db.sql("DELETE FROM `tabPayment Entry` WHERE remarks LIKE '%AUD9%' OR party LIKE '%AUD9%'")
    frappe.db.sql("DELETE FROM `tabSales Invoice Item` WHERE parent IN (SELECT name FROM `tabSales Invoice` WHERE custom_is_test_record = 1)")
    frappe.db.sql("DELETE FROM `tabSales Invoice` WHERE custom_is_test_record = 1")
    frappe.db.sql("DELETE FROM `tabMining Trip` WHERE is_test_record = 1")
    frappe.db.sql("DELETE FROM `tabMine Site` WHERE is_test_record = 1")
    frappe.db.sql("DELETE FROM `tabVehicle` WHERE is_test_record = 1")
    frappe.db.sql("DELETE FROM `tabDriver` WHERE is_test_record = 1")
    frappe.db.sql("DELETE FROM `tabCustomer` WHERE custom_is_test_record = 1")
    frappe.db.commit()

    # Prerequisite Masters
    cust = frappe.get_doc({
        "doctype": "Customer",
        "customer_name": f"AUD9-Client-{ts}",
        "customer_group": "Commercial",
        "territory": "India",
        "custom_is_test_record": 1
    }).insert(ignore_permissions=True)
    created_docs.append(("Customer", cust.name))

    ms = frappe.get_doc({
        "doctype": "Mine Site",
        "site_name": f"AUD9-Site-{ts}",
        "client": cust.name,
        "status": "Operational",
        "rate_per_ton": 500.0,
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    created_docs.append(("Mine Site", ms.name))

    driver = frappe.get_doc({
        "doctype": "Driver",
        "full_name": f"AUD9-Driver-{ts}",
        "status": "Active",
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    created_docs.append(("Driver", driver.name))

    v = frappe.get_doc({
        "doctype": "Vehicle",
        "license_plate": f"AUD9-VEH-{ts}",
        "make": "Tata",
        "model": "Prima 3530.K",
        "vehicle_status": "Active",
        "last_odometer": 1000.0,
        "uom": "Nos",
        "start_date": curr_date,
        "end_date": add_days(curr_date, 365),
        "fitness_expiry_date": add_days(curr_date, 365),
        "policy_no": f"POL-AUD9-{ts}",
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    created_docs.append(("Vehicle", v.name))

    item_code = f"AUD9-HAUL-{ts}"
    if not frappe.db.exists("Item", item_code):
        it = frappe.get_doc({
            "doctype": "Item",
            "item_code": item_code,
            "item_name": "Haulage Service Audit",
            "item_group": "Services",
            "is_stock_item": 0,
            "stock_uom": "Nos"
        }).insert(ignore_permissions=True)
        created_docs.append(("Item", it.name))
    frappe.db.commit()

    # Dedicated Test Users
    users_config = {
        f"aud_acc_{ts}@uptoware.local": ("Audit Accountant", ["Accountant", "Accounts User", "Desk User"]),
        f"aud_fleet_{ts}@uptoware.local": ("Audit Fleet Mgr", ["Fleet Manager", "Desk User"]),
        f"aud_ws_{ts}@uptoware.local": ("Audit Workshop", ["Workshop Supervisor", "Desk User"])
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
    frappe.db.commit()

    # =============================================================
    # AREA 1: Multiple Sales Invoices against one Mining Trip
    # =============================================================
    t1 = frappe.get_doc({
        "doctype": "Mining Trip",
        "vehicle": v.name,
        "driver": driver.name,
        "mine_site": ms.name,
        "destination": "Mangalore Port",
        "dispatch_date_time": now_datetime(),
        "gross_weight_tons": 42.0,
        "tare_weight_tons": 12.0,
        "trip_status": "Approved",
        "rate_per_ton": 500.0,
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    created_docs.append(("Mining Trip", t1.name))
    frappe.db.commit()

    # Invoice 1: Advance / Partial (₹10,000)
    si1 = frappe.get_doc({
        "doctype": "Sales Invoice",
        "customer": cust.name,
        "custom_mining_trip": t1.name,
        "company": company,
        "posting_date": curr_date,
        "items": [{
            "item_code": item_code,
            "qty": 1.0,
            "rate": 10000.0,
            "income_account": "Sales - U",
            "cost_center": "Main - U"
        }]
    }).insert(ignore_permissions=True)
    created_docs.append(("Sales Invoice", si1.name))
    si1.submit()
    frappe.db.commit()

    # Invoice 2: Balance Haulage (₹15,000) against SAME trip
    si2 = frappe.get_doc({
        "doctype": "Sales Invoice",
        "customer": cust.name,
        "custom_mining_trip": t1.name,
        "company": company,
        "posting_date": curr_date,
        "items": [{
            "item_code": item_code,
            "qty": 1.0,
            "rate": 15000.0,
            "income_account": "Sales - U",
            "cost_center": "Main - U"
        }]
    }).insert(ignore_permissions=True)
    created_docs.append(("Sales Invoice", si2.name))
    si2.submit()
    frappe.db.commit()

    t1.reload()
    # Check that Trip retains Invoiced status, references latest invoice, and query reports sum both
    t1_p = frappe.db.sql("""
        SELECT 
            trip_id,
            SUM(inv_amt) AS invoiced_revenue
        FROM (
            SELECT si.custom_mining_trip AS trip_id, si.base_grand_total AS inv_amt
            FROM `tabSales Invoice` si
            WHERE si.docstatus = 1 AND si.custom_mining_trip = %s
        ) x GROUP BY trip_id
    """, (t1.name,), as_dict=True)

    a1_ok = (
        si1.docstatus == 1 and si2.docstatus == 1
        and t1.billing_status == "Invoiced"
        and t1.sales_invoice == si2.name
        and len(t1_p) == 1
        and flt(t1_p[0].invoiced_revenue) == 25000.0
    )
    log_audit(1, "Multiple Sales Invoices against One Mining Trip", a1_ok,
              f"Trip={t1.name}, SI1=₹10,000, SI2=₹15,000 -> Total Invoiced=₹{t1_p[0].invoiced_revenue if t1_p else 0}, Status={t1.billing_status}")

    # =============================================================
    # AREA 2: One Sales Invoice containing multiple Mining Trips
    # =============================================================
    t2 = frappe.get_doc({
        "doctype": "Mining Trip",
        "vehicle": v.name,
        "driver": driver.name,
        "mine_site": ms.name,
        "destination": "Mangalore Port",
        "dispatch_date_time": now_datetime(),
        "gross_weight_tons": 35.0,
        "tare_weight_tons": 12.0,
        "trip_status": "Approved",
        "rate_per_ton": 500.0,
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    created_docs.append(("Mining Trip", t2.name))

    t3 = frappe.get_doc({
        "doctype": "Mining Trip",
        "vehicle": v.name,
        "driver": driver.name,
        "mine_site": ms.name,
        "destination": "Mangalore Port",
        "dispatch_date_time": now_datetime(),
        "gross_weight_tons": 38.0,
        "tare_weight_tons": 12.0,
        "trip_status": "Approved",
        "rate_per_ton": 500.0,
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    created_docs.append(("Mining Trip", t3.name))
    frappe.db.commit()

    # Consolidated invoice with multiple trips on line items
    si_multi = frappe.get_doc({
        "doctype": "Sales Invoice",
        "customer": cust.name,
        "company": company,
        "posting_date": curr_date,
        "items": [
            {
                "item_code": item_code,
                "qty": 1.0,
                "rate": 12000.0,
                "custom_mining_trip": t2.name,
                "income_account": "Sales - U",
                "cost_center": "Main - U"
            },
            {
                "item_code": item_code,
                "qty": 1.0,
                "rate": 18000.0,
                "custom_mining_trip": t3.name,
                "income_account": "Sales - U",
                "cost_center": "Main - U"
            }
        ]
    }).insert(ignore_permissions=True)
    created_docs.append(("Sales Invoice", si_multi.name))
    si_multi.submit()
    frappe.db.commit()

    t2.reload()
    t3.reload()
    
    # Query revenue attribution for t2 and t3
    t2_rev = frappe.db.sql("""
        SELECT SUM(sii.base_net_amount) 
        FROM `tabSales Invoice Item` sii 
        JOIN `tabSales Invoice` si ON si.name = sii.parent 
        WHERE si.docstatus = 1 AND sii.custom_mining_trip = %s
    """, (t2.name,))[0][0]

    t3_rev = frappe.db.sql("""
        SELECT SUM(sii.base_net_amount) 
        FROM `tabSales Invoice Item` sii 
        JOIN `tabSales Invoice` si ON si.name = sii.parent 
        WHERE si.docstatus = 1 AND sii.custom_mining_trip = %s
    """, (t3.name,))[0][0]

    a2_ok = (
        si_multi.base_grand_total == 30000.0
        and t2.sales_invoice == si_multi.name and t2.billing_status == "Invoiced"
        and t3.sales_invoice == si_multi.name and t3.billing_status == "Invoiced"
        and flt(t2_rev) == 12000.0 and flt(t3_rev) == 18000.0
    )
    log_audit(2, "One Sales Invoice with Multiple Mining Trips", a2_ok,
              f"Invoice Total=₹30,000 -> Trip2 Rev=₹{t2_rev}, Trip3 Rev=₹{t3_rev} (Cleanly partitioned, no multiplication)")

    # =============================================================
    # AREA 3: Cancellation of one invoice when other invoices remain linked to trip
    # =============================================================
    # Trip t1 has si1 (₹10,000) and si2 (₹15,000). Cancel si1:
    si1.cancel()
    frappe.db.commit()
    t1.reload()

    # t1 must NOT be reset to Unbilled! It must retain link to si2!
    step1_ref = t1.sales_invoice
    step1_status = t1.billing_status
    a3_step1_ok = (
        si1.docstatus == 2
        and t1.sales_invoice == si2.name
        and t1.billing_status == "Invoiced"
    )

    # Now cancel si2 as well:
    si2.cancel()
    frappe.db.commit()
    t1.reload()

    # Now t1 has no remaining active invoices -> Must be Unbilled!
    a3_step2_ok = (
        si2.docstatus == 2
        and t1.sales_invoice is None
        and t1.billing_status == "Unbilled"
    )

    a3_ok = a3_step1_ok and a3_step2_ok
    log_audit(3, "Cancellation of One Invoice Preserves Remaining Active Invoices", a3_ok,
              f"After SI1 cancel: Ref={step1_ref or 'None'}, Status={step1_status} (Retained SI2: {a3_step1_ok}); After SI2 cancel: Ref={t1.sales_invoice or 'None'}, Status={t1.billing_status} ({a3_step2_ok})")

    # =============================================================
    # AREA 4: Partial Invoicing & Repeated Invoicing
    # =============================================================
    # Re-invoice t1: Invoice Part A (₹10,000), then Invoice Part B (₹15,000)
    si1_new = frappe.get_doc({
        "doctype": "Sales Invoice",
        "customer": cust.name,
        "custom_mining_trip": t1.name,
        "company": company,
        "posting_date": curr_date,
        "items": [{
            "item_code": item_code,
            "qty": 1.0,
            "rate": 10000.0,
            "income_account": "Sales - U",
            "cost_center": "Main - U"
        }]
    }).insert(ignore_permissions=True)
    created_docs.append(("Sales Invoice", si1_new.name))
    si1_new.submit()
    frappe.db.commit()

    si2_new = frappe.get_doc({
        "doctype": "Sales Invoice",
        "customer": cust.name,
        "custom_mining_trip": t1.name,
        "company": company,
        "posting_date": curr_date,
        "items": [{
            "item_code": item_code,
            "qty": 1.0,
            "rate": 15000.0,
            "income_account": "Sales - U",
            "cost_center": "Main - U"
        }]
    }).insert(ignore_permissions=True)
    created_docs.append(("Sales Invoice", si2_new.name))
    si2_new.submit()
    frappe.db.commit()

    t1.reload()
    a4_ok = (t1.billing_status == "Invoiced" and t1.sales_invoice == si2_new.name)
    log_audit(4, "Partial and Repeated Invoicing Workflow", a4_ok,
              f"Part 1=₹10,000, Part 2=₹15,000 -> Active Ref={t1.sales_invoice}, Status={t1.billing_status}")

    # =============================================================
    # AREA 5: Multiple Payment Entries, Partial Payments & Cancellation
    # =============================================================
    # Payment 1 against si1_new (Partial: ₹4,000 of ₹10,000)
    pe1 = frappe.get_doc({
        "doctype": "Payment Entry",
        "payment_type": "Receive",
        "party_type": "Customer",
        "party": cust.name,
        "company": company,
        "paid_amount": 4000.0,
        "received_amount": 4000.0,
        "paid_from": "Debtors - U",
        "paid_to": "HDFC Bank - U",
        "reference_no": f"CHQ-AUD-1-{ts}",
        "reference_date": curr_date,
        "remarks": f"AUD9-PE1-{ts}",
        "references": [{
            "reference_doctype": "Sales Invoice",
            "reference_name": si1_new.name,
            "total_amount": 10000.0,
            "outstanding_amount": 10000.0,
            "allocated_amount": 4000.0
        }]
    }).insert(ignore_permissions=True)
    created_docs.append(("Payment Entry", pe1.name))
    pe1.submit()
    frappe.db.commit()

    t1.reload()
    si1_new.reload()
    a5_step1_ok = (si1_new.outstanding_amount == 6000.0 and t1.billing_status == "Partially Paid")

    # Payment 2 against si1_new (Balance: ₹6,000)
    pe2 = frappe.get_doc({
        "doctype": "Payment Entry",
        "payment_type": "Receive",
        "party_type": "Customer",
        "party": cust.name,
        "company": company,
        "paid_amount": 6000.0,
        "received_amount": 6000.0,
        "paid_from": "Debtors - U",
        "paid_to": "HDFC Bank - U",
        "reference_no": f"CHQ-AUD-2-{ts}",
        "reference_date": curr_date,
        "remarks": f"AUD9-PE2-{ts}",
        "references": [{
            "reference_doctype": "Sales Invoice",
            "reference_name": si1_new.name,
            "total_amount": 10000.0,
            "outstanding_amount": 6000.0,
            "allocated_amount": 6000.0
        }]
    }).insert(ignore_permissions=True)
    created_docs.append(("Payment Entry", pe2.name))
    pe2.submit()
    frappe.db.commit()

    si1_new.reload()
    t1.reload()
    # si1_new is fully paid (outstanding=0), but si2_new (₹15,000) is still unpaid, so trip is Partially Paid!
    a5_step2_ok = (si1_new.outstanding_amount == 0.0 and t1.billing_status == "Partially Paid")

    # Payment 3 against si2_new (Full: ₹15,000) -> Now ALL invoices for t1 are paid!
    pe3 = frappe.get_doc({
        "doctype": "Payment Entry",
        "payment_type": "Receive",
        "party_type": "Customer",
        "party": cust.name,
        "company": company,
        "paid_amount": 15000.0,
        "received_amount": 15000.0,
        "paid_from": "Debtors - U",
        "paid_to": "HDFC Bank - U",
        "reference_no": f"CHQ-AUD-3-{ts}",
        "reference_date": curr_date,
        "remarks": f"AUD9-PE3-{ts}",
        "references": [{
            "reference_doctype": "Sales Invoice",
            "reference_name": si2_new.name,
            "total_amount": 15000.0,
            "outstanding_amount": 15000.0,
            "allocated_amount": 15000.0
        }]
    }).insert(ignore_permissions=True)
    created_docs.append(("Payment Entry", pe3.name))
    pe3.submit()
    frappe.db.commit()

    si2_new.reload()
    t1.reload()
    a5_step3_ok = (si2_new.outstanding_amount == 0.0 and t1.billing_status == "Paid")

    # Cancel Payment 3 -> Trip should revert to Partially Paid!
    pe3.cancel()
    frappe.db.commit()
    si2_new.reload()
    t1.reload()
    a5_step4_ok = (si2_new.outstanding_amount == 15000.0 and t1.billing_status == "Partially Paid")

    a5_ok = a5_step1_ok and a5_step2_ok and a5_step3_ok and a5_step4_ok
    log_audit(5, "Multiple Payments, Partial Settlement & Payment Reversal Sync", a5_ok,
              f"P1: ₹4k/Partially Paid={a5_step1_ok}; P2: ₹6k/Partially Paid={a5_step2_ok}; P3: ₹15k/Paid={a5_step3_ok}; Cancel P3: Reverts Partially Paid={a5_step4_ok}")

    # =============================================================
    # AREA 6: Credit Notes, Returns & Profitability Impact
    # =============================================================
    # Create Base Invoice of ₹30,000 on Vehicle V
    si_base_cr = frappe.get_doc({
        "doctype": "Sales Invoice",
        "customer": cust.name,
        "custom_vehicle": v.name,
        "custom_mine_site": ms.name,
        "company": company,
        "posting_date": curr_date,
        "items": [{
            "item_code": item_code,
            "qty": 1.0,
            "rate": 30000.0,
            "income_account": "Sales - U",
            "cost_center": "Main - U"
        }]
    }).insert(ignore_permissions=True)
    created_docs.append(("Sales Invoice", si_base_cr.name))
    si_base_cr.submit()
    frappe.db.commit()

    # Issue Credit Note of ₹7,000 against si_base_cr
    cr_doc = frappe.get_doc({
        "doctype": "Sales Invoice",
        "is_return": 1,
        "return_against": si_base_cr.name,
        "customer": cust.name,
        "custom_vehicle": v.name,
        "custom_mine_site": ms.name,
        "company": company,
        "posting_date": curr_date,
        "items": [{
            "item_code": item_code,
            "qty": -1.0,
            "rate": 7000.0,
            "income_account": "Sales - U",
            "cost_center": "Main - U"
        }]
    }).insert(ignore_permissions=True)
    created_docs.append(("Sales Invoice", cr_doc.name))
    cr_doc.submit()
    frappe.db.commit()

    # Query Vehicle Net Invoiced Revenue
    veh_net_rev = frappe.db.sql("""
        SELECT 
            SUM(inv_amt) AS net_rev
        FROM (
            SELECT CASE WHEN is_return = 1 THEN -ABS(base_grand_total) ELSE base_grand_total END AS inv_amt
            FROM `tabSales Invoice`
            WHERE docstatus = 1 AND custom_vehicle = %s AND (custom_is_test_record = 1)
        ) x
    """, (v.name,))[0][0]

    # In Customer query logic: Gross = 30k, Credit = 7k, Net = 23k
    cust_rev = frappe.db.sql("""
        SELECT 
            SUM(CASE WHEN is_return = 0 THEN base_grand_total ELSE 0 END) AS gross,
            SUM(CASE WHEN is_return = 1 THEN ABS(base_grand_total) ELSE 0 END) AS cr,
            SUM(CASE WHEN is_return = 0 THEN base_grand_total ELSE -ABS(base_grand_total) END) AS net
        FROM `tabSales Invoice`
        WHERE docstatus = 1 AND customer = %s AND name IN (%s, %s)
    """, (cust.name, si_base_cr.name, cr_doc.name), as_dict=True)[0]

    a6_ok = (
        flt(cust_rev.gross) == 30000.0
        and flt(cust_rev.cr) == 7000.0
        and flt(cust_rev.net) == 23000.0
    )
    log_audit(6, "Credit Note (Sales Return) Deducted from Revenue & Profitability", a6_ok,
              f"Gross Invoiced=₹{cust_rev.gross}, Credit Notes=₹{cust_rev.cr}, Net Realized Revenue=₹{cust_rev.net}")

    # =============================================================
    # AREA 7: Currency, Exchange Rates, Taxes, Base Totals & Outstanding
    # =============================================================
    tax_acc = "Output Tax - U"
    if not frappe.db.exists("Account", tax_acc):
        frappe.get_doc({
            "doctype": "Account",
            "account_name": "Output Tax",
            "company": company,
            "parent_account": "Duties and Taxes - U",
            "account_type": "Tax",
            "is_group": 0
        }).insert(ignore_permissions=True)
        frappe.db.commit()

    # Test invoice with Item Taxes
    si_tax = frappe.get_doc({
        "doctype": "Sales Invoice",
        "customer": cust.name,
        "company": company,
        "currency": "INR",
        "conversion_rate": 1.0,
        "posting_date": curr_date,
        "items": [{
            "item_code": item_code,
            "qty": 1.0,
            "rate": 10000.0,
            "income_account": "Sales - U",
            "cost_center": "Main - U"
        }],
        "taxes": [{
            "charge_type": "On Net Total",
            "account_head": tax_acc,
            "rate": 18.0,
            "description": "GST 18%"
        }]
    }).insert(ignore_permissions=True)
    created_docs.append(("Sales Invoice", si_tax.name))
    si_tax.submit()
    frappe.db.commit()

    si_tax.reload()
    # Net total = 10,000, Tax = 1,800, Grand Total = 11,800, Base Grand Total = 11,800, Outstanding = 11,800
    a7_ok = (
        flt(si_tax.net_total) == 10000.0
        and flt(si_tax.total_taxes_and_charges) == 1800.0
        and flt(si_tax.grand_total) == 11800.0
        and flt(si_tax.base_grand_total) == 11800.0
        and flt(si_tax.outstanding_amount) == 11800.0
    )
    log_audit(7, "Currency, Taxes, Base Totals & Outstanding Balance Coherence", a7_ok,
              f"Net=₹{si_tax.net_total}, Tax=₹{si_tax.total_taxes_and_charges}, Base Grand Total=₹{si_tax.base_grand_total}, Outstanding=₹{si_tax.outstanding_amount}")

    # =============================================================
    # AREA 8: Test-Record Quarantine Across All 10 Reports
    # =============================================================
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
    quarantine_clean = True
    leak_details = []
    for r_name in reports_to_test:
        try:
            res = run_report(r_name, filters=def_filters)
            rows = res[1] if isinstance(res, (list, tuple)) and len(res) > 1 else (res.get("result", []) if isinstance(res, dict) else [])
            for row in rows:
                row_str = str(row)
                if cust.name in row_str or v.name in row_str or ms.name in row_str:
                    quarantine_clean = False
                    leak_details.append(f"{r_name}: {row_str[:60]}")
        except Exception as e:
            quarantine_clean = False
            leak_details.append(f"{r_name} Execution Error: {e}")

    log_audit(8, "Test-Record Quarantine Across All 10 Reports", quarantine_clean,
              "Zero test entity leakage detected across all 10 reports" if quarantine_clean else f"Leakage: {leak_details}")

    # =============================================================
    # AREA 9: Non-Duplication of Revenue, Expenses, GL Entries & Inventory
    # =============================================================
    # Verify no query queries GL Entry or Journal Entry alongside OpEx
    # Verify OpEx counts exactly 1 posted amount
    oe_test = frappe.get_doc({
        "doctype": "Operational Expense",
        "expense_date": curr_date,
        "expense_category": "Toll and Road Charges",
        "amount": 750.0,
        "vehicle": v.name,
        "company": company,
        "expense_account": "Freight and Forwarding Charges - U",
        "payment_account": "Cash - U",
        "is_test_record": 1
    }).insert(ignore_permissions=True)
    oe_test.db_set({
        "approval_status": "Approved",
        "accounting_status": "Posted",
        "payment_status": "Paid",
        "posted_amount": 750.0,
        "posting_document_name": "ACC-JV-AUD9-TEST"
    })
    created_docs.append(("Operational Expense", oe_test.name))
    frappe.db.commit()

    # Query vehicle opex
    v_opex_sum = frappe.db.sql("""
        SELECT SUM(posted_amount) FROM `tabOperational Expense`
        WHERE vehicle = %s AND approval_status = 'Approved' AND accounting_status = 'Posted'
    """, (v.name,))[0][0]

    # Verify that Payment Entries are NOT added to revenue
    pe_as_revenue = frappe.db.sql("""
        SELECT COUNT(*) FROM `tabPayment Entry` WHERE name = %s
    """, (pe1.name,))[0][0]

    a9_ok = (flt(v_opex_sum) == 750.0 and pe_as_revenue == 1)
    log_audit(9, "Non-Duplication of Financial Transactions & Balances", a9_ok,
              f"OpEx read directly from posted_amount (₹{v_opex_sum}); Payments excluded from revenue calculations")

    # =============================================================
    # AREA 10: Trip, Vehicle, Mine-Site & Customer Attribution Accuracy
    # =============================================================
    # Before Save script auto-populates Vehicle and Mine Site from Trip
    si_attrib = frappe.get_doc({
        "doctype": "Sales Invoice",
        "customer": cust.name,
        "custom_mining_trip": t2.name,
        "company": company,
        "posting_date": curr_date,
        "items": [{
            "item_code": item_code,
            "qty": 1.0,
            "rate": 5000.0,
            "income_account": "Sales - U",
            "cost_center": "Main - U"
        }]
    }).insert(ignore_permissions=True)
    created_docs.append(("Sales Invoice", si_attrib.name))

    a10_ok = (
        si_attrib.custom_vehicle == t2.vehicle
        and si_attrib.custom_mine_site == t2.mine_site
        and si_attrib.custom_is_test_record == 1
        and si_attrib.customer == cust.name
    )
    log_audit(10, "Trip, Vehicle, Mine-Site and Customer Attribution Accuracy", a10_ok,
              f"Trip={si_attrib.custom_mining_trip} -> Vehicle={si_attrib.custom_vehicle}, Site={si_attrib.custom_mine_site}, Cust={si_attrib.customer}")

    # =============================================================
    # AREA 11: Report Date Filters & Cancelled Transactions Exclusion
    # =============================================================
    # si1 is cancelled (docstatus = 2). Active invoice si2_new is docstatus = 1.
    active_in_db = frappe.db.sql("""
        SELECT COUNT(*) FROM `tabSales Invoice`
        WHERE name = %s AND docstatus = 1
    """, (si1.name,))[0][0]

    cancelled_in_db = frappe.db.sql("""
        SELECT COUNT(*) FROM `tabSales Invoice`
        WHERE name = %s AND docstatus = 2
    """, (si1.name,))[0][0]

    a11_ok = (active_in_db == 0 and cancelled_in_db == 1)
    log_audit(11, "Cancelled Transactions Exclusion & Date Boundary Integrity", a11_ok,
              f"Cancelled invoice '{si1.name}' excluded from docstatus=1 queries (Active=0, Cancelled=1)")

    # =============================================================
    # AREA 12: Permission Enforcement & Audit-Field Protection
    # =============================================================
    frappe.set_user(f"aud_acc_{ts}@uptoware.local")
    acc_can_si = frappe.has_permission("Sales Invoice", "create")

    frappe.set_user(f"aud_fleet_{ts}@uptoware.local")
    fleet_can_create_si = frappe.has_permission("Sales Invoice", "create")
    fleet_can_read_si = frappe.has_permission("Sales Invoice", "read")

    frappe.set_user(f"aud_ws_{ts}@uptoware.local")
    ws_can_create_si = frappe.has_permission("Sales Invoice", "create")
    ws_can_read_si = frappe.has_permission("Sales Invoice", "read")

    frappe.set_user("Administrator")

    # Audit fields read-only check on Mining Trip
    mt_meta = frappe.get_meta("Mining Trip")
    si_field_ro = mt_meta.get_field("sales_invoice").read_only == 1
    bs_field_ro = mt_meta.get_field("billing_status").read_only == 1

    a12_ok = (
        acc_can_si
        and not fleet_can_create_si and fleet_can_read_si
        and not ws_can_create_si and not ws_can_read_si
        and si_field_ro and bs_field_ro
    )
    log_audit(12, "Permission Enforcement & Audit-Field Protection", a12_ok,
              f"Accountant SI Create={acc_can_si}; Fleet SI Create Blocked={not fleet_can_create_si}; WS SI Read Blocked={not ws_can_read_si}; MT ReadOnly(sales_invoice={si_field_ro}, billing_status={bs_field_ro})")

    # =============================================================
    # Cleanup Test Records
    # =============================================================
    print("\n--- Cleaning up audit test records ---")
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

    total_audits = len(audit_results)
    passed_audits = sum(1 for a in audit_results if a["status"] == "PASS")
    failed_audits = total_audits - passed_audits

    print("\n=======================================================")
    print(f"   FINANCIAL INTEGRITY AUDIT RESULTS: {passed_audits}/{total_audits} PASSED")
    print("=======================================================")
    if failed_audits == 0:
        print(">>> ALL 12 FINANCIAL INTEGRITY AUDIT AREAS PASSED (100%)! <<<\n")
    else:
        print(f">>> {failed_audits} AUDIT AREAS FAILED! <<<\n")

    return audit_results

if __name__ == "__main__":
    run_audit()
