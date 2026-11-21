# UPTOWARE FLEET ERP V1 — PRODUCTION DEPLOYMENT OPERATOR RUNBOOK

**Document Version:** 1.0.0 (Executable Operator Runbook)  
**Target Environment:** AWS EC2 Production Server  
**Public Domain:** https://fleet.uptoware.com  
**Target Host IP:** `13.239.121.225`  
**SSH User:** `ubuntu`  
**Production Repository:** `/home/ubuntu/uptoware-fleet-erp`  
**Frappe Bench:** `/home/frappe/frappe-bench` (Site: `frontend`)  
**Backend Container:** `erpnext-docker-backend-1`  
**Proxy Container:** `erpnext-docker-frontend-1`  
**Frontend Service:** `uptoware-frontend.service` (Port 3001)  
**Release Payload Archive:** `uptoware-v1-complete-release.tar.gz`  
**Date:** 2026-11-21  

---

## 1. Release Manifest & Change Classification

This release deploys the **complete Uptoware Fleet ERP V1 application**, encompassing 94 compiled frontend routes, 54 API mediators, all Frappe DocType customizations, weighbridge governance rules, defect auto-linking, and 15-column realigned financial reports.

### A. Committed vs. Uncommitted Changes

1. **Committed Release Baseline:**
   - **Base Commit:** `b8924335a69f33b44b320418d63c635462309a13`
   - **Production Deployed Base:** `7bcff9c` (1 commit behind; clean fast-forward candidate)
   - **Committed Scope:** AppShell navigation Suspense boundaries, TripDrawer odometer enforcement, workflow precondition clearance.

2. **Uncommitted Stabilization Scope (Included in Tarball):**
   - **`frontend/src/types/fleet.ts`**: Weighbridge reading, tolerance thresholds, and override audit interfaces.
   - **`frontend/src/lib/frappe.ts`**: Transition payload mapping for weighbridge attributes.
   - **`frontend/src/app/api/trips/[id]/transition/route.ts`**: Workflow API route validating tolerance variances and manager overrides.
   - **`frontend/src/components/trips/TripWorkflowModal.tsx`**: UI modal rendering amber variance warning (>15%) and blocking red manager override prompt (>50%).
   - **`apply_trip_defects_fix.py`**: Idempotent Frappe Python migration establishing Custom Fields, threshold settings, and 15-column aligned reports.

3. **Quarantined Test Harnesses (Excluded from Production):**
   - `audit_accounting_lifecycle.py`
   - `test_batch12.py`
   - `test_batch1_regression.py`
   - Local scratch scripts and development markdown files.

---

## 2. Release Artifacts & File Checksums

The complete production payload is packaged into a self-contained, verified tarball:

| File Name / Path | Size | SHA256 Checksum | Target Destination |
| :--- | :---: | :--- | :--- |
| **`uptoware-v1-complete-release.tar.gz`** | `1.5 MB` | `a6d4dfa79da3e51a4cf3d1d7bbd6d1f09a0dad9c0bc6ad46bdf14a4cf83cb8e0` | `/home/ubuntu/uptoware-fleet-erp/` |
| **`OPERATOR_DEPLOY_V1.sh`** | `7.8 KB` | `c7d1e8d4cf525389658ec3540ce8a047da5c9f56353d9eeb8c83a8b417c6a0c0` | `/home/ubuntu/uptoware-fleet-erp/` |
| **`OPERATOR_ROLLBACK_V1.sh`** | `3.4 KB` | `771b059345bdae65c01b1cb91176b92f0dc3cfa7da9c11867e3bf9bcfd964f40` | `/home/ubuntu/uptoware-fleet-erp/` |
| **`PHASE1_PRODUCTION_PREFLIGHT.sh`** | `29.9 KB` | `9b38981df5a0be96ff1e60f06f8c7b8d80f836fba654be9cfcb68c6a04ae3282` | Streamed via SSH stdin (in-memory) |

### Key Files Inside the Release Tarball:
- `apply_trip_defects_fix.py`: `28bc468202201516c8a2f5106022aba4e57c4b5fb2701d083f59bf3a3ce157a5`
- `frontend/src/types/fleet.ts`: `fbb4b30c216b7f54de98f6b067a59d92a8bc6936fd0bcb680d8de3a2ed523e0e`
- `frontend/src/lib/frappe.ts`: `ca29420697addd8dc6807adf378e958544d188a1688fa61975027da95e9e940b`
- `frontend/src/app/api/trips/[id]/transition/route.ts`: `ca27505345435cbafe190cb63110a43e59ae0de4c55603c0527c8badf0c7fed6`
- `frontend/src/components/trips/TripWorkflowModal.tsx`: `1f09ae02cccbcd0624efdce6bc0003efa4a7b1fddf27ff41a7f48dea6a2ddab3`

---

## 3. Pre-Deployment Operator Step-by-Step Instructions

Execute the following sequential commands from your local management terminal using your authorized SSH key.

### STEP 1: Execute Preflight Safety Inspection (Read-Only)
Streams the non-destructive inspection script directly into memory:

```bash
set -o pipefail
ssh -i <path-to-ssh-key> ubuntu@13.239.121.225 'bash -s' < PHASE1_PRODUCTION_PREFLIGHT.sh 2>&1 | tee preflight_$(date +%Y%m%d_%H%M%S).log
```
- **Evaluation:** Confirm final verdict is `GREEN` (Exit 0) or `AMBER` (Exit 2). If `RED` (Exit 1), stop immediately.

---

### STEP 2: Transfer Release Artifacts to EC2
Copy the verified release package and deployment scripts to the production host:

```bash
scp -i <path-to-ssh-key> uptoware-v1-complete-release.tar.gz OPERATOR_DEPLOY_V1.sh OPERATOR_ROLLBACK_V1.sh ubuntu@13.239.121.225:/home/ubuntu/uptoware-fleet-erp/
```

---

### STEP 3: Execute Controlled Deployment on EC2
Log into the server and run the automated operator script:

```bash
ssh -i <path-to-ssh-key> ubuntu@13.239.121.225
cd /home/ubuntu/uptoware-fleet-erp
chmod +x OPERATOR_DEPLOY_V1.sh OPERATOR_ROLLBACK_V1.sh
./OPERATOR_DEPLOY_V1.sh 2>&1 | tee deploy_$(date +%Y%m%d_%H%M%S).log
```

#### What `OPERATOR_DEPLOY_V1.sh` Automatically Executes:
1. **Payload Verification:** Verifies SHA256 checksum of `uptoware-v1-complete-release.tar.gz`.
2. **Atomic Backup:** Executes `bench --site frontend backup --with-files` and verifies gzip archive integrity via `gzip -t`.
3. **Frontend Snapshot:** Preserves pre-deployment frontend directory in `/home/ubuntu/deployment_backups_<timestamp>/frontend_pre_deploy`.
4. **Isolated Restore Dry-Run:** Tests SQL archive parse and import into disposable database `_dry_run_verify_<timestamp>`.
5. **Payload Extraction:** Extracts complete V1 frontend source and migration script onto `/home/ubuntu/uptoware-fleet-erp`.
6. **Backend Migration:** Copies `apply_trip_defects_fix.py` into backend container, executes patch, and clears Frappe cache.
7. **Production Build:** Executes `npm run build` in `/home/ubuntu/uptoware-fleet-erp/frontend`.
   *(If build fails, it automatically reverts the frontend directory and aborts).*
8. **Service Restart:** Restarts `uptoware-frontend.service` and verifies `systemctl is-active`.
9. **Smoke Tests:** Probes local port 3001, Frappe internal API, and public HTTPS ingress.

---

## 4. Post-Deployment Verification Matrix

Perform read-only verification across the 18 core modules:

| Module | Verification Step | Target Endpoint / URL | Expected Result |
| :--- | :--- | :--- | :--- |
| **1. Public Ingress** | TLS & Ingress Probe | `https://fleet.uptoware.com/login` | `HTTP 200 OK` (Next.js HTML payload) |
| **2. Frappe Backend** | Internal API Ping | `https://fleet.uptoware.com/api/method/ping` | `HTTP 200` `{"message":"pong"}` |
| **3. Authentication** | Standard Login | `POST /api/auth/login` | Valid `uptoware_sid` session cookie |
| **4. UI Shell** | Client PDF Headings 1–9 | Home / Dashboard | 9 mandatory cards visible; sidebar accordion collapses |
| **5. Vehicle Directory** | Vehicle Records | `/vehicles` | 12 attributes displayed, registration dates, odometer |
| **6. Driver Directory** | Driver Roster | `/drivers` | Commercial licenses and vehicle assignments |
| **7. Mine Sites** | Multi-Tenant Sites | `/mine-sites` | JBR Eastern & Talcher sites listed with active switcher |
| **8. Trip State Machine** | Live Trip Dispatch | `/trips` | State transitions (Loading -> Weighbridge -> Completed) |
| **9. Weighbridge Station**| Tolerance Check | `/weighbridge` | Amber warning >15%, Red manager override >50% |
| **10. Fuel Management** | Bowser Dispensing | `/fuel` | Fuel logs, km/L consumption analytics |
| **11. Breakdowns** | Defect Auto-Link | `/breakdowns` | Trip defects auto-link to vehicle breakdowns |
| **12. Operating Finance**| Expense Vouchers | `/expenses` | Expense records synchronize without journal errors |
| **13. Spare Parts** | Warehouse Stock | `/spare-parts` | Stock bin balances and reorder thresholds |
| **14. Procurement** | Purchasing Flow | `/procurement` | Material Requests, Purchase Orders, Receipts |
| **15. Compliance** | Statutory Certs | `/compliance` | Fitness, PUC, tax, permit expiry tracking |
| **16. Insurance** | Policy Register | `/insurance` | Policy numbers, coverage, renewal alerts |
| **17. Profitability** | Commercial Revenue | `/profitability` | Customer rate cards, HSD escalation formulas |
| **18. Financial Reports**| 15-Column Layout | `/reports` | Columns 9–15 aligned; net operating profit unshifted |

---

## 5. Rollback Procedure

If any blocker is detected during post-deployment verification, run the automated rollback script:

```bash
cd /home/ubuntu/uptoware-fleet-erp
./OPERATOR_ROLLBACK_V1.sh /home/ubuntu/deployment_backups_<timestamp>
```

### What `OPERATOR_ROLLBACK_V1.sh` Does:
1. Restores the pre-deployment frontend source from `/home/ubuntu/deployment_backups_<timestamp>/frontend_pre_deploy`.
2. Re-runs `npm run build` on the known-good code and restarts `uptoware-frontend.service`.
3. If database restoration is required, restores the SQL dump via `bench --site frontend restore <backup.sql.gz> --force`.
4. Clears Frappe cache and verifies public login status.

---

## 6. Final Status & Deliverables Summary

- **Complete V1 Release Payload:** [`uptoware-v1-complete-release.tar.gz`](file:///c:/Users/Admin/.gemini/antigravity-ide/scratch/erpnext/uptoware-v1-complete-release.tar.gz) (`1.5 MB`, SHA256: `a6d4dfa79da3e51a4cf3d1d7bbd6d1f09a0dad9c0bc6ad46bdf14a4cf83cb8e0`).
- **Operator Execution Script:** [`OPERATOR_DEPLOY_V1.sh`](file:///c:/Users/Admin/.gemini/antigravity-ide/scratch/erpnext/OPERATOR_DEPLOY_V1.sh).
- **Operator Rollback Script:** [`OPERATOR_ROLLBACK_V1.sh`](file:///c:/Users/Admin/.gemini/antigravity-ide/scratch/erpnext/OPERATOR_ROLLBACK_V1.sh).
- **Preflight Safety Inspection:** [`PHASE1_PRODUCTION_PREFLIGHT.sh`](file:///c:/Users/Admin/.gemini/antigravity-ide/scratch/erpnext/PHASE1_PRODUCTION_PREFLIGHT.sh).
- **Execution Runbook:** [`OPERATOR_EXECUTION_RUNBOOK.md`](file:///c:/Users/Admin/.gemini/antigravity-ide/scratch/erpnext/OPERATOR_EXECUTION_RUNBOOK.md).

**All artifacts are packaged and verified. The release package is ready for operator deployment.**
