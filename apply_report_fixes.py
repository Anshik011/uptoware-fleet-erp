import frappe
import json
import re

def apply_all_fixes():
    frappe.init("frontend")
    frappe.connect()

    with open("/home/frappe/frappe-bench/report_schemas_manifest.json") as f:
        manifest = json.load(f)

    print(f"Applying Script Report transformation and filter sync to {len(manifest)} reports...")

    filter_field_definitions = {
        "from_date": {"fieldtype": "Date", "label": "From Date"},
        "to_date": {"fieldtype": "Date", "label": "To Date"},
        "vehicle": {"fieldtype": "Link", "options": "Vehicle", "label": "Vehicle"},
        "driver": {"fieldtype": "Link", "options": "Driver", "label": "Driver"},
        "mine_site": {"fieldtype": "Link", "options": "Mine Site", "label": "Mine Site"},
        "supplier": {"fieldtype": "Link", "options": "Supplier", "label": "Supplier"},
        "supplier_group": {"fieldtype": "Link", "options": "Supplier Group", "label": "Supplier Group"},
        "preferred_supplier": {"fieldtype": "Link", "options": "Supplier", "label": "Preferred Supplier"},
        "customer": {"fieldtype": "Link", "options": "Customer", "label": "Customer"},
        "warehouse": {"fieldtype": "Link", "options": "Warehouse", "label": "Warehouse"},
        "item_code": {"fieldtype": "Link", "options": "Item", "label": "Item Code"},
        "item_group": {"fieldtype": "Link", "options": "Item Group", "label": "Item Group"},
        "brand": {"fieldtype": "Link", "options": "Brand", "label": "Brand"},
        "company": {"fieldtype": "Link", "options": "Company", "label": "Company"},
        "mining_trip": {"fieldtype": "Link", "options": "Mining Trip", "label": "Mining Trip"},
        "expense_category": {"fieldtype": "Data", "label": "Expense Category"},
        "accounting_status": {"fieldtype": "Select", "options": "\nPending\nPosted", "label": "Accounting Status"},
        "approval_status": {"fieldtype": "Select", "options": "\nDraft\nSubmitted\nApproved\nRejected", "label": "Approval Status"},
        "trip_status": {"fieldtype": "Select", "options": "\nDraft\nDispatched\nArrived at Site\nLoaded\nDelivered\nCancelled", "label": "Trip Status"},
        "billing_status": {"fieldtype": "Select", "options": "\nUnbilled\nBilled", "label": "Billing Status"},
        "repair_status": {"fieldtype": "Select", "options": "\nReported\nIn Workshop\nAwaiting Parts\nRepaired\nClosed\nRejected", "label": "Repair Status"},
        "breakdown_type": {"fieldtype": "Select", "options": "\nMechanical\nElectrical\nTyre\nHydraulic\nAccident\nOther", "label": "Breakdown Type"},
        "procurement_type": {"fieldtype": "Select", "options": "\nSpare Parts\nTyres\nLubricants / Fuel\nConsumables\nExternal Repair Service", "label": "Procurement Type"},
        "status": {"fieldtype": "Data", "label": "Status"},
        "vehicle_status": {"fieldtype": "Select", "options": "\nActive\nOn Trip\nUnder Maintenance\nBreakdown\nOut of Service", "label": "Vehicle Status"},
        "policy_status": {"fieldtype": "Select", "options": "\nDraft\nActive\nExpired\nCancelled", "label": "Policy Status"},
        "is_renewal": {"fieldtype": "Select", "options": "\n0\n1", "label": "Is Renewal"},
        "document_type": {"fieldtype": "Select", "options": "\nInsurance\nFitness Certificate\nPUC Certificate\nRoad Tax\nGoods Permit", "label": "Document Type"},
        "disabled": {"fieldtype": "Select", "options": "\n0\n1", "label": "Disabled"},
        "include_cancelled": {"fieldtype": "Check", "label": "Include Cancelled"},
        "show_all": {"fieldtype": "Check", "label": "Show All"},
        "year": {"fieldtype": "Int", "label": "Year"},
        "insurance_company": {"fieldtype": "Data", "label": "Insurance Company"},
        "voucher_type": {"fieldtype": "Select", "options": "\nStock Entry\nPurchase Receipt\nDelivery Note", "label": "Voucher Type"},
        "make": {"fieldtype": "Data", "label": "Make"}
    }

    success_count = 0

    for idx, item in enumerate(manifest, 1):
        rname = item["name"]
        if not frappe.db.exists("Report", rname):
            print(f"[{idx:02d}/55] Skipping {rname}: does not exist")
            continue

        rep = frappe.get_doc("Report", rname)
        q = rep.query or ""
        aliases = item["aliases"]
        placeholders = item["placeholders"]

        # 1. Update report_type
        rep.report_type = "Script Report"

        # 2. Build params mapping lines
        params_lines = []
        for p in placeholders:
            if p in ["show_all", "include_cancelled"]:
                params_lines.append(f"    '{p}': '1' if f.get('{p}') in [1, '1', True] else '0',")
            elif p in ["disabled", "is_renewal"]:
                params_lines.append(f"    '{p}': str(f.get('{p}')) if f.get('{p}') is not None and str(f.get('{p}')).strip() != '' else None,")
            else:
                params_lines.append(f"    '{p}': f.get('{p}') or None,")

        # Check if is_test_record is mentioned as %(is_test_record)s
        if "is_test_record" in q and "'is_test_record'" not in "\n".join(params_lines):
            params_lines.append("    'is_test_record': 0,")

        params_block = "\n".join(params_lines)
        columns_block = repr(aliases)

        # 3. Build robust report_script
        rep.report_script = f"""f = filters if isinstance(filters, dict) else {{}}

params = {{
{params_block}
}}

columns = {columns_block}

if params.get('from_date') and params.get('to_date') and str(params['from_date']) > str(params['to_date']):
    data = [columns, []]
else:
    query = frappe.db.get_value('Report', '{rname}', 'query')
    res = frappe.db.sql(query, params, as_list=True)
    data = [columns, res]
"""

        # 4. Populate filters child table
        rep.set("filters", [])
        js_filters = []

        for p in placeholders:
            fdef = filter_field_definitions.get(p, {"fieldtype": "Data", "label": p.replace("_", " ").title()})
            row = {
                "fieldname": p,
                "label": fdef.get("label", p.title()),
                "fieldtype": fdef.get("fieldtype", "Data"),
                "options": fdef.get("options"),
                "mandatory": 0
            }
            rep.append("filters", row)

            js_f = {
                "fieldname": p,
                "label": fdef.get("label", p.title()),
                "fieldtype": fdef.get("fieldtype", "Data")
            }
            if fdef.get("options"):
                js_f["options"] = fdef.get("options")
            js_filters.append(js_f)

        # 5. Populate javascript field for Desk
        js_code = f"""frappe.query_reports["{rname}"] = {{
    "filters": {json.dumps(js_filters, indent=8)}
}};
"""
        rep.javascript = js_code

        # Save report
        rep.save(ignore_permissions=True)
        success_count += 1
        print(f"[{idx:02d}/55] ✅ {rname}: Transformed to Script Report with {len(placeholders)} filters & {len(aliases)} columns")

    frappe.db.commit()
    print("\n" + "=" * 80)
    print(f"TRANSFORMATION COMPLETE: {success_count} / {len(manifest)} reports successfully updated in database.")
    print("=" * 80)

if __name__ == "__main__":
    apply_all_fixes()

