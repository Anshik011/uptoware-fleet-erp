import os
import json
import re

json_path = "/home/frappe/frappe-bench/reports_55_inventory.json" if os.path.exists("/home/frappe/frappe-bench/reports_55_inventory.json") else "reports_55_inventory.json"
with open(json_path) as f:
    reports = json.load(f)

print(f"Total reports: {len(reports)}")

missing_cols = []
for idx, r in enumerate(reports, 1):
    name = r["name"]
    query = r.get("query") or ""
    # find aliases AS "..."
    aliases = re.findall(r'AS\s+"([^"]+)"', query, re.IGNORECASE)
    placeholders = list(set(re.findall(r'%\((\w+)\)s', query)))
    if not aliases:
        # maybe AS `...` or single quotes
        aliases = re.findall(r'AS\s+[`\']([^`\']+)[\'`](?!\w)', query, re.IGNORECASE)
    if not aliases:
        missing_cols.append((name, query[:200]))
    else:
        print(f"[{idx:02d}] {name}: {len(aliases)} columns | Placeholders: {placeholders}")

if missing_cols:
    print("\nWARNING: Reports with NO matched aliases:")
    for m in missing_cols:
        print(m[0], "->", m[1])
else:
    print("\nALL 55 REPORTS HAVE EXPLICIT 'AS \"...\"' COLUMN DEFINITIONS!")
