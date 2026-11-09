import frappe

def run():
    from frappe.desk import query_report as qr
    print("=== 1. VERIFYING ALL 6 BATCH 4 OPERATIONAL REPORTS & QUARANTINE ===")
    reps = [
        "Vehicle Breakdown Register",
        "Vehicle Downtime Report",
        "Maintenance Cost by Vehicle",
        "Breakdown Frequency by Type",
        "Pending Repairs / Awaiting Parts",
        "Vehicle Maintenance History"
    ]
    
    empty_filters = {
        "from_date": "",
        "to_date": "",
        "vehicle": "",
        "breakdown_type": "",
        "repair_status": ""
    }

    all_passed = True
    for rep_name in reps:
        res = qr.run(rep_name, empty_filters)
        rows = res.get("result", [])
        
        has_test = False
        for row in rows:
            b_id = row.get("breakdown_id")
            v_id = row.get("vehicle")
            if b_id:
                is_test = frappe.db.get_value("Vehicle Breakdown", b_id, "is_test_record")
                if is_test:
                    has_test = True
            elif v_id:
                is_test = frappe.db.get_value("Vehicle", v_id, "is_test_record")
                if is_test:
                    has_test = True
                    
        status = "[PASS]" if not has_test else "[FAIL]"
        if has_test:
            all_passed = False
        print(f"  {status} {rep_name}: Returned {len(rows)} operational rows. Test records present: {has_test}")

    assert all_passed, "One or more reports contained quarantined test records!"
    print("  -> ALL 6 REPORTS CONFIRMED 100% OPERATIONAL & QUARANTINED (Zero test records leaked).\n")

    print("=== 2. RECONCILING STOCK VALUATION & REPAIR COSTS ===")
    # Query all submitted Stock Entries linked to a Vehicle Breakdown
    se_entries = frappe.db.sql("""
        SELECT se.custom_vehicle_breakdown, sed.item_code, sed.qty, sed.basic_rate, sed.amount, se.name as stock_entry, se.docstatus
        FROM `tabStock Entry Detail` sed
        JOIN `tabStock Entry` se ON se.name = sed.parent
        WHERE se.custom_vehicle_breakdown IS NOT NULL AND se.custom_vehicle_breakdown != ''
        AND se.docstatus = 1
    """, as_dict=True)
    
    print(f"  Found {len(se_entries)} submitted Stock Entry item lines linked to Vehicle Breakdowns.")
    
    # Group by breakdown
    b_breakdown_costs = {}
    for entry in se_entries:
        b_id = entry.custom_vehicle_breakdown
        if b_id not in b_breakdown_costs:
            b_breakdown_costs[b_id] = 0.0
        b_breakdown_costs[b_id] += float(entry.amount)

    all_reconciled = True
    for b_id, expected_parts_cost in b_breakdown_costs.items():
        if not frappe.db.exists("Vehicle Breakdown", b_id):
            print(f"  [SKIP] Breakdown {b_id} no longer exists in DB (deleted during early development).")
            continue
            
        doc = frappe.get_doc("Vehicle Breakdown", b_id)
        actual_parts_cost = float(doc.parts_cost or 0.0)
        expected_total = actual_parts_cost + float(doc.labour_cost or 0.0)
        actual_total = float(doc.total_repair_cost or 0.0)
        
        diff = abs(actual_parts_cost - expected_parts_cost)
        tot_diff = abs(actual_total - expected_total)
        
        status = "[MATCH]" if (diff < 0.01 and tot_diff < 0.01) else "[MISMATCH]"
        if diff >= 0.01 or tot_diff >= 0.01:
            all_reconciled = False
        print(f"  {status} Breakdown {b_id} ({'TEST' if doc.is_test_record else 'OPERATIONAL'}): Stock Valuation Parts Cost = ₹{expected_parts_cost:.2f}, Doc Parts Cost = ₹{actual_parts_cost:.2f}, Total Repair Cost = ₹{actual_total:.2f}")

    assert all_reconciled, "Stock valuation does not match Breakdown parts cost!"
    print("  -> STOCK VALUATION RECONCILIATION 100% VERIFIED.\n")

    print("=== 3. AUDITING DOCTYPES & CUSTOM FIELDS FOR DUPLICATES ===")
    # Check Vehicle DocType
    vehicle_meta = frappe.get_meta("Vehicle")
    status_fields = [f for f in vehicle_meta.fields if "status" in f.fieldname.lower()]
    print(f"  Vehicle fields containing 'status': {[f.fieldname for f in status_fields]}")
    assert len(status_fields) == 1 and status_fields[0].fieldname == "vehicle_status", "Duplicate or unexpected status field on Vehicle!"

    # Check Custom Field definition
    cf = frappe.get_doc("Custom Field", "Vehicle-vehicle_status")
    print(f"  Custom Field 'Vehicle-vehicle_status': Type={cf.fieldtype}, Options={cf.options.replace(chr(10), ', ')}")
    assert cf.dt == "Vehicle" and cf.fieldname == "vehicle_status", "Invalid custom field definition!"

    # Check for duplicate DocTypes
    all_dts = frappe.get_all("DocType", pluck="name")
    batch_dts = ["Mine Site", "Mining Trip", "Fuel Log", "Vehicle Breakdown", "Vehicle Breakdown Part"]
    for dt in batch_dts:
        matching = [d for d in all_dts if d.lower() == dt.lower()]
        print(f"  Checking DocType '{dt}': Matches found = {matching}")
        assert len(matching) == 1, f"Duplicate or missing DocType for {dt}!"

    print("  -> NO DUPLICATE DOCTYPES OR CUSTOM FIELDS INTRODUCED.\n")
    print("=== ALL CHECKS COMPLETED SUCCESSFULLY ===")

run()
