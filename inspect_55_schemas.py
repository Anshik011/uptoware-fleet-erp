import json
import re

json_path = "/home/frappe/frappe-bench/reports_55_inventory.json"
with open(json_path) as f:
    reports = json.load(f)

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

schema_manifest = []

for r in reports:
    name = r["name"]
    query = r.get("query") or ""
    aliases = re.findall(r'AS\s+"([^"]+)"', query, re.IGNORECASE)
    placeholders = sorted(list(set(re.findall(r'%\((\w+)\)s', query))))
    
    filters_meta = []
    for p in placeholders:
        f_def = filter_field_definitions.get(p, {"fieldtype": "Data", "label": p.replace("_", " ").title()})
        meta_item = dict(f_def)
        meta_item["fieldname"] = p
        filters_meta.append(meta_item)

    schema_manifest.append({
        "name": name,
        "aliases": aliases,
        "placeholders": placeholders,
        "filters": filters_meta
    })

with open("/home/frappe/frappe-bench/report_schemas_manifest.json", "w") as f:
    json.dump(schema_manifest, f, indent=2)

print(f"Generated schema manifest for all {len(schema_manifest)} reports.")

