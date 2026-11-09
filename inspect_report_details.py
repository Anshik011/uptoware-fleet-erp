import os
import json
import re

json_path = "/home/frappe/frappe-bench/reports_55_inventory.json" if os.path.exists("/home/frappe/frappe-bench/reports_55_inventory.json") else "reports_55_inventory.json"
with open(json_path) as f:
    reports = json.load(f)

print(f"Total reports: {len(reports)}")

for idx, r in enumerate(reports, 1):
    name = r["name"]
    query = r.get("query") or ""
    # find columns in query: SELECT col AS "Label:Type:Width", ...
    # or find placeholders %(key)s
    placeholders = list(set(re.findall(r'%\((\w+)\)s', query)))
    # print summary
    print(f"[{idx:02d}] {name} ({r.get('report_type')}) -> Placeholders: {placeholders}")
