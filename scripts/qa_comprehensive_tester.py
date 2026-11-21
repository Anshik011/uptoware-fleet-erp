"""
qa_comprehensive_tester.py
Systematic QA test suite executing all API endpoints and CRUD flows
against both local dev server and AWS EC2 production.
"""

import sys
import json
import urllib.request
import urllib.parse
import http.cookiejar

BASE_URL = "http://localhost:3001"
if len(sys.argv) > 1:
    BASE_URL = sys.argv[1]

print(f"==================================================")
print(f"STARTING COMPREHENSIVE QA AUDIT ON: {BASE_URL}")
print(f"==================================================")

cookie_jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(cookie_jar))
urllib.request.install_opener(opener)

def request(path, method="GET", data=None):
    url = f"{BASE_URL}{path}"
    headers = {
        "Accept": "application/json",
        "User-Agent": "QA-Evidence-Agent/1.0"
    }
    encoded_data = None
    if data is not None:
        headers["Content-Type"] = "application/json"
        encoded_data = json.dumps(data).encode("utf-8")
    
    req = urllib.request.Request(url, data=encoded_data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            raw = res.read().decode("utf-8")
            status = res.status
            try:
                parsed = json.loads(raw)
            except Exception:
                parsed = raw
            return {"status": status, "data": parsed, "error": None}
    except urllib.error.HTTPError as e:
        raw = e.read().decode("utf-8")
        try:
            parsed = json.loads(raw)
        except Exception:
            parsed = raw
        return {"status": e.code, "data": parsed, "error": str(e)}
    except Exception as e:
        return {"status": 0, "data": None, "error": str(e)}

# Step 1: Login
print("\n--- 1. AUTHENTICATION TEST ---")
login_res = request("/api/auth/login", method="POST", data={
    "usr": "Administrator",
    "pwd": "admin"
})
print(f"Login Status: {login_res['status']}")
if login_res["status"] != 200:
    print(f"Login failed: {login_res}")
    # Try alternative or inspect cookies
else:
    print("Logged in successfully. Session established.")

# List of all GET endpoints to test
get_endpoints = [
    "/api/auth/session",
    "/api/dashboard",
    "/api/vehicles",
    "/api/drivers",
    "/api/employees",
    "/api/leads",
    "/api/trips",
    "/api/trips/options",
    "/api/inventory/items",
    "/api/inventory/warehouses",
    "/api/inventory/movements",
    "/api/inventory/options",
    "/api/procurement/orders",
    "/api/procurement/suppliers",
    "/api/procurement/receipts",
    "/api/procurement/invoices",
    "/api/procurement/reports",
    "/api/breakdowns",
    "/api/breakdowns/options",
    "/api/fuel",
    "/api/fuel/options",
    "/api/attendance",
    "/api/attendance/summary?month=2026-11",
    "/api/compliance/vehicles",
    "/api/compliance/reports",
    "/api/insurance/policies",
    "/api/insurance/options",
    "/api/finance/revenue",
    "/api/finance/collections",
    "/api/finance/profitability",
    "/api/finance/dashboard",
    "/api/finance/reports",
    "/api/weighbridge",
    "/api/dispatch",
    "/api/dispatch/eligibility",
    "/api/shifts",
    "/api/approvals",
    "/api/alerts",
    "/api/mine-sites",
    "/api/vehicle-types"
]

results = {
    "passed": [],
    "failed": [],
    "errors": []
}

print("\n--- 2. SYSTEMATIC GET ENDPOINTS AUDIT ---")
for ep in get_endpoints:
    res = request(ep)
    st = res["status"]
    if st == 200:
        results["passed"].append(ep)
        count = ""
        if isinstance(res["data"], dict):
            for k in ["data", "vehicles", "employees", "items", "trips", "orders", "suppliers", "records"]:
                if k in res["data"] and isinstance(res["data"][k], list):
                    count = f"({len(res['data'][k])} records)"
                    break
        print(f"  [PASS] {ep} => {st} {count}")
    else:
        results["failed"].append({"endpoint": ep, "status": st, "data": res["data"], "error": res["error"]})
        print(f"  [FAIL] {ep} => {st} : {res['data'] or res['error']}")

print(f"\nGET Audit Complete: {len(results['passed'])} PASS, {len(results['failed'])} FAIL")

# Step 3: Test Creation and CRUD Flows
print("\n--- 3. CRUD & BUSINESS LOGIC AUDIT ---")

# A. Spare Part creation
print("Testing Spare Part creation with auto-naming...")
spare_res = request("/api/inventory/items", method="POST", data={
    "itemName": "Automated QA Test Bushing",
    "itemGroup": "Spare Parts",
    "stockUom": "Nos",
    "valuationRate": 750,
    "partNumber": "BUSH-QA-01",
    "compatibleModel": "Tata Prima 3530.K",
    "reorderLevel": 3,
    "reorderQty": 8,
    "isTestRecord": True
})
print(f"Spare Part Creation: Status {spare_res['status']}")
if spare_res["status"] in [200, 201]:
    print(f"  [PASS] Spare part created: {spare_res['data'].get('item', {}).get('name') or spare_res['data']}")
else:
    print(f"  [FAIL] Spare part failed: {spare_res}")
    results["errors"].append({"action": "create_spare_part", "res": spare_res})

# B. Fleet Lead creation with distance band
print("Testing Fleet Lead creation with distance band ('4-5')...")
lead_res = request("/api/leads", method="POST", data={
    "lead_name": "QA Pit-to-Crusher 4-5KM",
    "lead_km": "4-5",
    "source_location": "Donimalai Pit A",
    "destination_location": "Primary Crusher 1",
    "is_active": 1,
    "isTestRecord": True
})
print(f"Fleet Lead Creation: Status {lead_res['status']}")
if lead_res["status"] in [200, 201]:
    print(f"  [PASS] Fleet Lead created: {lead_res['data']}")
else:
    print(f"  [FAIL] Fleet Lead failed: {lead_res}")
    results["errors"].append({"action": "create_fleet_lead", "res": lead_res})

# C. Employee creation with statutory fields
print("Testing Employee creation with mining statutory fields...")
emp_res = request("/api/employees", method="POST", data={
    "employeeName": "Ramesh Kumar QA",
    "fatherOrSpouseName": "Suresh Kumar",
    "designation": "Driver",
    "department": "Fleet Operations",
    "skillCategory": "SKILL",
    "pfType": "CMPF",
    "uanOrCmpfNo": "CMPF/KAR/99281/QA",
    "socialCategory": "OBC",
    "drivingLicenseNumber": "KA34-2022-998811",
    "drivingLicenseValidity": "2030-12-31",
    "vtNo": "VT/2026/088",
    "vtPeriod": "2026-2028",
    "formODone": "YES",
    "phone": "9876543210",
    "presentAddress": "Donimalai Township, Sandur",
    "status": "Active"
})
print(f"Employee Creation: Status {emp_res['status']}")
if emp_res["status"] in [200, 201]:
    print(f"  [PASS] Employee created: {emp_res['data']}")
else:
    print(f"  [FAIL] Employee failed: {emp_res}")
    results["errors"].append({"action": "create_employee", "res": emp_res})

# D. Vehicle creation with custom_transport_type
print("Testing Vehicle creation with Transport Type...")
veh_res = request("/api/vehicles", method="POST", data={
    "license_plate": "KA-34-QA-9999",
    "make": "Tata Motors",
    "model": "Prima 3530.K",
    "vehicle_type": "Tipper",
    "custom_transport_type": "Transport",
    "status": "Active",
    "isTestRecord": True
})
print(f"Vehicle Creation: Status {veh_res['status']}")
if veh_res["status"] in [200, 201]:
    print(f"  [PASS] Vehicle created: {veh_res['data']}")
else:
    print(f"  [FAIL] Vehicle failed: {veh_res}")
    results["errors"].append({"action": "create_vehicle", "res": veh_res})

# E. Attendance entry for Shift A, B, C
print("Testing Attendance entry...")
att_res = request("/api/attendance", method="POST", data={
    "employee": "EMP-QA-01" if emp_res.get("data", {}).get("employee", {}).get("name") else "EMP-0001",
    "date": "2026-11-22",
    "status": "Present",
    "shift": "Shift A"
})
print(f"Attendance Entry: Status {att_res['status']}")
if att_res["status"] in [200, 201]:
    print(f"  [PASS] Attendance created: {att_res['data']}")
else:
    print(f"  [FAIL / NOTICE] Attendance: {att_res['data'] or att_res['error']}")

print("\n==================================================")
print(f"AUDIT SUMMARY: {len(results['passed'])} PASS, {len(results['failed'])} FAIL, {len(results['errors'])} ERRORS")
print("==================================================")

with open("qa_audit_results.json", "w") as f:
    json.dump(results, f, indent=2)
print("Detailed results written to qa_audit_results.json")
