import frappe

def run():
    print("=== UPDATING MINING TRIP VALIDATIONS SCRIPT (ZERO IMPORTS) ===")
    ss_name = "Mining Trip - Business Validations & Audit"
    ss = frappe.get_doc("Server Script", ss_name)
    
    dispatch_check_code = """# 4B. Vehicle Statutory Document Expiry Validation on Dispatch
# Blocks dispatch if insurance or fitness (or other enforced statutory documents) are expired, future-dated, or in coverage gap.
# Does NOT alter vehicle status to Breakdown/Under Maintenance; preserves Out of Service/Breakdown status intact.
if doc.trip_status == "Dispatched" and (doc.is_new() or (doc.get_doc_before_save() and doc.get_doc_before_save().get("trip_status") != "Dispatched")):
    v_docs = frappe.db.get_value("Vehicle", doc.vehicle, [
        "end_date", "start_date", "fitness_expiry_date", "puc_expiry_date", "road_tax_expiry_date", "permit_expiry_date"
    ], as_dict=True)
    if v_docs:
        today_val = frappe.utils.getdate()
        
        # Check settings
        enforce_ins = frappe.db.get_single_value("Fleet Settings", "enforce_insurance_on_dispatch")
        enforce_fit = frappe.db.get_single_value("Fleet Settings", "enforce_fitness_on_dispatch")
        enforce_puc = frappe.db.get_single_value("Fleet Settings", "enforce_puc_on_dispatch")
        enforce_tax = frappe.db.get_single_value("Fleet Settings", "enforce_road_tax_on_dispatch")
        enforce_pmt = frappe.db.get_single_value("Fleet Settings", "enforce_permit_on_dispatch")
        
        if enforce_ins is None: enforce_ins = 1
        if enforce_fit is None: enforce_fit = 1

        if enforce_ins:
            # Check Vehicle Insurance Policy master first for policy currently effective today
            active_pol = frappe.db.sql(\"\"\"
                SELECT name, start_date, end_date
                FROM `tabVehicle Insurance Policy`
                WHERE vehicle = %s
                  AND policy_status = 'Active'
                  AND start_date <= %s
                  AND end_date >= %s
                LIMIT 1
            \"\"\", (doc.vehicle, today_val, today_val), as_dict=True)
            
            has_effective_policy = False
            if active_pol:
                has_effective_policy = True
            elif v_docs.end_date and v_docs.start_date:
                # Fallback to Vehicle summary fields if no Vehicle Insurance Policy records exist
                has_policies = frappe.db.count("Vehicle Insurance Policy", {"vehicle": doc.vehicle})
                if has_policies == 0:
                    v_start = frappe.utils.getdate(v_docs.start_date)
                    v_end = frappe.utils.getdate(v_docs.end_date)
                    if v_start <= today_val <= v_end:
                        has_effective_policy = True

            if not has_effective_policy:
                if not v_docs.end_date:
                    frappe.throw(f"Cannot dispatch Vehicle '{doc.vehicle}': No active insurance coverage recorded. Active insurance coverage covering today is mandatory for trip dispatch.")
                elif v_docs.start_date and frappe.utils.getdate(v_docs.start_date) > today_val:
                    frappe.throw(f"Cannot dispatch Vehicle '{doc.vehicle}': Insurance policy is future-dated (starts on {v_docs.start_date}). Policy is not yet effective today.")
                elif frappe.utils.getdate(v_docs.end_date) < today_val:
                    frappe.throw(f"Cannot dispatch Vehicle '{doc.vehicle}': Insurance expired on {v_docs.end_date}. Active insurance coverage is mandatory for trip dispatch.")
                else:
                    frappe.throw(f"Cannot dispatch Vehicle '{doc.vehicle}': No insurance policy currently effective today. Active insurance coverage covering today is mandatory for trip dispatch.")

        if enforce_fit:
            if not v_docs.fitness_expiry_date:
                pass
            elif frappe.utils.getdate(v_docs.fitness_expiry_date) < today_val:
                frappe.throw(f"Cannot dispatch Vehicle '{doc.vehicle}': Fitness Certificate expired on {v_docs.fitness_expiry_date}. Valid fitness certificate is mandatory for trip dispatch.")

        if enforce_puc and v_docs.puc_expiry_date and frappe.utils.getdate(v_docs.puc_expiry_date) < today_val:
            frappe.throw(f"Cannot dispatch Vehicle '{doc.vehicle}': PUC Certificate expired on {v_docs.puc_expiry_date}.")

        if enforce_tax and v_docs.road_tax_expiry_date and frappe.utils.getdate(v_docs.road_tax_expiry_date) < today_val:
            frappe.throw(f"Cannot dispatch Vehicle '{doc.vehicle}': Road Tax expired on {v_docs.road_tax_expiry_date}.")

        if enforce_pmt and v_docs.permit_expiry_date and frappe.utils.getdate(v_docs.permit_expiry_date) < today_val:
            frappe.throw(f"Cannot dispatch Vehicle '{doc.vehicle}': Goods Permit expired on {v_docs.permit_expiry_date}.")
"""

    start_idx = ss.script.find("# 4B. Vehicle Statutory Document Expiry Validation on Dispatch")
    end_idx = ss.script.find("# 5. Driver Status Validation")
    if start_idx != -1 and end_idx != -1:
        ss.script = ss.script[:start_idx] + dispatch_check_code + "\n" + ss.script[end_idx:]
        ss.save(ignore_permissions=True)
        print("Updated Section 4B with future policy and gap validations.")
    elif "# 4B. Vehicle Statutory Document Expiry Validation on Dispatch" not in ss.script:
        target = '# 5. Driver Status Validation'
        if target in ss.script:
            ss.script = ss.script.replace(target, dispatch_check_code + "\n" + target)
            ss.save(ignore_permissions=True)
            print("Successfully injected statutory expiry validation.")

    frappe.clear_cache()
    frappe.db.commit()

if __name__ == "__main__":
    run()
