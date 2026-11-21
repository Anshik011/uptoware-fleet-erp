# UPTOWARE FLEET ERP V1 — PHASE 1 PRODUCTION PREFLIGHT EXECUTION GUIDE

**Document Version:** 2.2.0 (Final Execution Safety Checked)  
**Target Environment:** AWS EC2 Production Server  
**Public Domain:** https://fleet.uptoware.com  
**Target Host IP:** `13.239.121.225`  
**SSH User:** `ubuntu`  
**Application Directory:** `/home/ubuntu/uptoware-fleet-erp`  
**Frappe Bench:** `/home/frappe/frappe-bench` (Site: `frontend`)  
**Backend Container:** `erpnext-docker-backend-1`  
**Proxy Container:** `erpnext-docker-frontend-1`  
**Frontend Service:** `uptoware-frontend.service` (Port 3001)  
**Intended Committed Base:** `b8924335a69f33b44b320418d63c635462309a13`  
**Date:** 2026-11-21  

---

## 1. Overview & Operational Principles

This execution guide governs **Phase 1: Read-Only Production Preflight Inspection** for Uptoware Fleet ERP V1.

Phase 1 conducts a complete, non-invasive diagnostic audit of the live AWS EC2 host to verify baseline commit lineage, working tree cleanliness, container stack health, Frappe API responsiveness, Next.js service availability, public TLS ingress, and host storage metrics.

### Non-Negotiable Operational Constraints:
1. **100% Read-Only Inspection:** The inspection executes purely in-memory via SSH standard input. It creates **NO remote files**, writes **NO remote logs**, executes **NO git mutations**, runs **NO migrations**, and performs **NO service or container restarts**.
2. **Zero Remote Disk Footprint:** Neither the script file nor its execution logs are written to the EC2 filesystem. All logging streams back in real-time and is persisted locally on the management workstation.
3. **Strict Unix LF Format:** The preflight script [`PHASE1_PRODUCTION_PREFLIGHT.sh`](file:///c:/Users/Admin/.gemini/antigravity-ide/scratch/erpnext/PHASE1_PRODUCTION_PREFLIGHT.sh) is formatted strictly with Unix LF (`\n`) line endings and contains zero CRLF (`\r\n`) characters.
4. **Bounded Diagnostics:** All network probes, container socket pings, and directory-sizing commands enforce strict, finite timeouts (5s to 10s). If the `timeout` command is unavailable, probes fail closed (skipping execution and reporting `NOT VERIFIED`). Probes never fall back to unbounded execution, and timeouts produce `NOT VERIFIED`, never a false `PASS`.
5. **Zero Credential Exposure:** Database passwords, encryption keys, salts, and tokens are never printed, echoed, or exported. Configuration checks verify file existence without reading or dumping file contents.
6. **Non-Stop Diagnostics:** Diagnostic checks continue across all sections even if an individual test encounters an issue, ensuring a complete diagnostic footprint is returned for human evaluation.
7. **Standardized Status & Verdicts:** Every check reports one of four unambiguous states: `PASS`, `WARNING`, `BLOCKER`, or `NOT VERIFIED`. The consolidated verdict evaluates strictly to `GREEN` (0), `AMBER` (2), or `RED` (1).
8. **Informational Storage Diagnostics:** Storage measurements are reported as raw metrics and observed filesystem topologies without arbitrary fixed-threshold cutoffs. Backup disk clearance is evaluated and approved as a separate decision gate.
9. **Mandatory Boundary Notice:** Every Phase 1 output concludes with the binding operational statement:  
   *"Phase 1 inspection does not authorize backup, migration, code deployment, or service restart."*

---

## 2. Release Comparison & File Classification

The proposed V1 release stabilizes trip lifecycle transitions, weighbridge tolerance enforcement, and financial reporting column alignments. The local repository contains both committed revisions and uncommitted stabilization changes.

### A. Committed Release Base
- **Committed Base Commit:** `b8924335a69f33b44b320418d63c635462309a13`
- **Branch:** `main`
- **Baseline Subject:** `fix(trips): fix weighbridge tolerance calculations and trip defect handling`

### B. Tracked Working-Tree Classification
Only Production Runtime files and the idempotent Migration Script form the production deployment payload. Test harnesses and local artifacts are strictly quarantined.

| Classification | File Path | In Production Payload? | Functional Scope & Release Rationale |
| :--- | :--- | :---: | :--- |
| **Production Runtime** | `frontend/src/types/fleet.ts` | **YES** | TypeScript interfaces for weighbridge gross/tare/net readings and override audit metadata. |
| **Production Runtime** | `frontend/src/lib/frappe.ts` | **YES** | Frappe API client payload mapping for weighbridge transitions and tolerance overrides. |
| **Production Runtime** | `frontend/src/app/api/trips/[id]/transition/route.ts` | **YES** | Next.js API route handling workflow status transitions with tolerance validation. |
| **Production Runtime** | `frontend/src/components/trips/TripWorkflowModal.tsx` | **YES** | UI workflow modal rendering amber warning (>15% variance) and red override requirement (>50% variance). |
| **Migration Script** | `apply_trip_defects_fix.py` | **YES** | Idempotent Frappe Python script establishing Custom Fields, tolerance limits, and the aligned 15-column financial report definitions. |
| **Documentation** | `DEVELOPMENT_PROGRESS.md` | **YES (Tracked)** | Non-executable audit log and change summary. |
| **Test-Only Harness** | `audit_accounting_lifecycle.py` | **NO** | Test harness for accounting lifecycle validation (excluded from production). |
| **Test-Only Harness** | `test_batch12.py` | **NO** | Test harness for batch approval workflows (excluded from production). |
| **Test-Only Harness** | `test_batch1_regression.py` | **NO** | Test harness for driver-vehicle regression validation (excluded from production). |
| **Local Untracked** | `PHASE1_PRODUCTION_PREFLIGHT.sh` | **NO** | Preflight inspection script (streamed via stdin; Unix LF; never saved to EC2). |
| **Local Untracked** | `PHASE1_EXECUTION_GUIDE.md` | **NO** | Local deployment runbook and execution documentation. |
| **Local Untracked** | `AWS_PRODUCTION_RECOVERY_REPORT.md` | **NO** | Historical post-incident recovery audit report. |

---

## 3. Pre-Execution Requirements

Before executing Phase 1, the release engineer must verify:
1. **Explicit Authorization:** Formal stakeholder approval to initiate read-only production preflight inspection.
2. **SSH Key Pair:** Valid SSH private key with read access for user `ubuntu` on host `13.239.121.225`.
3. **Local Tooling:** Management workstation equipped with standard OpenSSH client (`ssh`) and standard core utilities (`bash`, `tee`).
4. **Script Integrity:** Syntax validation completed locally via `bash -n PHASE1_PRODUCTION_PREFLIGHT.sh` on the actual LF-formatted script (0 errors).

---

## 4. Execution Protocol & Exit Code Preservation

To guarantee zero remote filesystem impact and preserve the remote execution exit code across pipelines, the inspection script is piped directly into the remote shell via SSH standard input using Bash `pipefail`.

### Recommended Execution Command

From the local repository directory on your management workstation, run:

```bash
set -o pipefail
ssh -i <path-to-ssh-key> ubuntu@13.239.121.225 'bash -s' < PHASE1_PRODUCTION_PREFLIGHT.sh 2>&1 | tee "phase1_preflight_$(date +%Y%m%d_%H%M%S).log"
```

### Critical Execution Rules:
- **`set -o pipefail` is mandatory:** In standard bash pipelines (`cmd1 | cmd2`), the pipeline exit code defaults to the exit code of the final command (`tee`), which almost always returns 0 even if SSH fails. Enabling `pipefail` ensures that if SSH terminates with code 1 or 2, the pipeline returns that exact failure code.
- **Do NOT mask exit codes:** Never append `|| true`, `|| echo "Done"`, or similar error-suppressing constructs.
- **Local Logging Only:** The `tee` command writes the complete execution transcript to a timestamped log file on the **local management workstation**, while mirroring the output to your local terminal. **No log file is created on the EC2 host.**

---

## 5. Diagnostic Sections & Check Specifications

`PHASE1_PRODUCTION_PREFLIGHT.sh` evaluates 8 diagnostic sections:

### Section 1: Git Repository & Release Baseline Inspection
- **Repository Directory & Access:** Confirms `/home/ubuntu/uptoware-fleet-erp/.git` exists and is accessible. If `cd` fails or the repository cannot be accessed, reports a `BLOCKER` and continues all subsequent checks without terminating.
- **Working Tree Cleanliness:** Executes `git status --porcelain`.
  - `PASS`: Completely empty output (clean working tree).
  - `BLOCKER`: Modified, deleted, or untracked files present on production.
- **Commit Equality & Lineage:** Compares `Current HEAD` to intended base `b8924335a69f33b44b320418d63c635462309a13`.
  - `PASS`: Production HEAD exactly equals `b892433`.
  - `WARNING`: Production HEAD is an ancestor of `b892433` (clean fast-forward candidate) or commits ahead.
  - `BLOCKER`: Commits have diverged (neither ancestor nor descendant).

### Section 2: Docker Container Stack Health & Discovery
- **Docker CLI & Daemon:** Validates `docker info` responds without error.
- **Backend Container (`erpnext-docker-backend-1`):** Inspects running state, restart counts, and health status.
- **Proxy Container (`erpnext-docker-frontend-1`):** Inspects running state, restart counts, and health status.
- **MariaDB Container Discovery:**
  - Scans all containers via `docker ps -a --format "{{.Names}}"`.
  - Excludes utility/backup containers matching `backup`, `dump`, or `restore` (e.g., `db-backup`).
  - Evaluates container name, image name (`.Config.Image`), and Compose service label (`com.docker.compose.service`).
  - Identifies database candidates matching `mariadb` or standalone `db` segment (`(^|[-_])db([-_]|$)`).
  - Reports each discovered candidate and evaluates its health status.
- **Redis Container Discovery:** Discovers all containers matching `redis` and inspects each container individually.
- **Container Health Interpretation:**
  - Running + healthy (`healthy`) = `PASS`.
  - Running + unhealthy (`unhealthy`) = `BLOCKER`.
  - Running + unconfigured healthcheck (`none` / unconfigured) = `WARNING` (prevents false PASS).
  - Restarting or stopped critical container = `BLOCKER`.
  - Missing expected container = `BLOCKER` or `NOT VERIFIED`.

### Section 3: MariaDB & Redis Engine Responsiveness
- **MariaDB Responsiveness:**
  - Enumerates running candidates identified in Section 2.
  - If multiple candidates exist, applies strict Docker metadata preference: prioritizes containers whose image matches `mariadb|mysql` and compose service label matches `db|mariadb|mysql`.
  - If exactly 1 running candidate exists: Requires corroborating Docker image (`mariadb|mysql`) or Compose service metadata (`db|mariadb|mysql`) to verify it. A candidate name alone is not treated as conclusive; without reliable metadata, reports `NOT VERIFIED`. If verified, executes `mariadb-admin ping` / `mysqladmin ping` bounded by a 5-second timeout (`run_with_timeout 5`). Returns `PASS` if responsive or healthy, or `NOT VERIFIED` if socket authentication is required or the ping times out.
  - If multiple running candidates exist and cannot be uniquely established from metadata: Reports `NOT VERIFIED` rather than selecting arbitrarily.
  - If no running candidate exists: Reports `NOT VERIFIED`.
- **Redis Responsiveness:**
  - Probes **all** discovered Redis containers individually via `redis-cli ping` bounded by a 5-second timeout (`run_with_timeout 5`).
  - Returns `PASS` if responsive (`PONG` or expected `NOAUTH`), `NOT VERIFIED` on timeout, or `WARNING`/`BLOCKER` on unexpected responses.

### Section 4: Frappe Backend API & Site Configuration
- **HTTP Backend Ping:** Probes internal Gunicorn proxy:
  `curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 -m 10 "http://localhost:8080/api/method/ping" -H "Host: frontend"`
  - `PASS`: Responds `HTTP 200 OK`.
  - `BLOCKER`: Non-200 status code or connection failure.
- **Site Configuration Presence:** Tests existence of `/home/frappe/frappe-bench/sites/frontend/site_config.json` bounded by 5-second timeout.
  - `PASS`: File exists (contents are strictly unprinted).
  - `BLOCKER`: File confirmed missing inside backend container.
  - `NOT VERIFIED`: Probe timed out or failed to execute.

### Section 5: Next.js Frontend Service & Local Port Probe
- **Systemd Service:** Inspects `systemctl is-active uptoware-frontend.service`.
  - `PASS`: Active and running (reports uptime timestamp).
  - `BLOCKER`: Inactive, failed, or restarting.
- **Local Port 3001 Probe:** Probes `http://localhost:3001/login` (bounded: connect 5s, max-time 10s).
  - `PASS`: Responds `HTTP 200`, `307`, or `308`.
  - `BLOCKER`: Connection refused or unexpected HTTP status.

### Section 6: Public Domain & TLS Ingress
- **Bounded Ingress Probe:** Probes `https://fleet.uptoware.com/login` over external network (bounded: connect 5s, max-time 10s).
  - `PASS`: Responds `HTTP 200 OK` or valid redirect (`307`/`308`).
- **Bounded Diagnostic Fallback:** If connection fails (`HTTP 000`), executes a strictly bounded verbose diagnostic:
  `curl -v --connect-timeout 5 -m 10 https://fleet.uptoware.com/login 2>&1 | grep -iE "SSL|certificate|handshake|refused|timed out|could not resolve"`
  - Enforces strict 5s connection and 10s total timeout to prevent indefinite hangs.
  - Never outputs request headers, credentials, or secrets.

### Section 7: Storage & Directory Sizing (Informational Only)
- **Filesystem Diagnostics:** Reports observed device string, filesystem type, and available MB for root `/` and Docker root `/var/lib/docker`.
- **Accurate Mount Topology:** Compares observed filesystem device strings. If identical, reports that `/` and `/var/lib/docker` reside on the same filesystem device. If different, reports distinct filesystem devices without making unverified EBS volume claims.
- **Bounded Directory Footprint:** Measures directory sizes for Frappe public files, private files, backups, and `/var/lib/mysql` using a strict 10-second timeout per directory (`run_with_timeout 10 docker exec ... du -sh`). Lists recent backup timestamps inside the container with a 5-second timeout without creating or modifying files.
- **Informational Status Reporting:** If all measurements are successfully obtained, reports `PASS`. If any measurement fails or times out, marks that measurement as `NOT VERIFIED (timed out or unavailable)` and reports overall section status as `NOT VERIFIED` (preventing false PASS). No fixed storage threshold is enforced.

### Section 8: Consolidated Summary & Final Verdict
Aggregates all checks into a consolidated report card, prints the final verdict, displays the mandatory boundary notice, and exits with the standardized exit code.

---

## 6. Interpreting Statuses, Verdicts & Exit Codes

### Status Definitions:
- **`PASS`**: The inspected attribute complies fully with production requirements.
- **`WARNING`**: Non-fatal condition detected that requires human review (e.g., ancestor commit requiring fast-forward, container with unmonitored healthcheck).
- **`BLOCKER`**: Critical failure that compromises deployment safety (e.g., dirty working tree, diverged commit, down container, unhealthy container).
- **`NOT VERIFIED`**: Diagnostic probe could not definitively confirm status without elevated privileges, timed out, or required manual disambiguation.

### Final Verdicts & Exit Codes:

| Verdict | Exit Code | Criteria | Next Operational Step |
| :--- | :---: | :--- | :--- |
| **`GREEN`** | **`0`** | `BLOCKER == 0`, `WARNING == 0`, `NOT VERIFIED == 0`. | All read-only checks passed. Present log for review to request Phase 2 backup authorization. |
| **`AMBER`** | **`2`** | `BLOCKER == 0`, but `WARNING > 0` or `NOT VERIFIED > 0`. | Review warnings and unverified items with engineering team before seeking deployment authorization. |
| **`RED`** | **`1`** | `BLOCKER > 0`. | **STOP IMMEDIATELY.** Deployment preparation halted. Investigate and resolve root cause before proceeding. |

---

## 7. Required Evidence to Return for Verification

Upon completing the Phase 1 run, return the following four verification artifacts:

1. **Complete Execution Log:** Full text output captured in `phase1_preflight_<timestamp>.log`.
2. **Current Production HEAD:** The 40-character commit hash currently deployed on EC2 and its genealogical relationship to `b892433`.
3. **Storage & Mount Metrics:** Observed filesystem device names, types, and available MB on `/` and `/var/lib/docker`.
4. **Final Script Verdict & Exit Code:** Exact preflight verdict (`GREEN`, `AMBER`, or `RED`) and process exit code (`0`, `2`, or `1`).

---

## 8. Explicit Stop Condition

> **CRITICAL OPERATIONAL NOTICE:**  
> **Phase 1 inspection does not authorize backup, migration, code deployment, or service restart.**  
> Execution of Phase 1 terminates upon generating the preflight diagnostic log. No further automated or remote actions may be performed without explicit, separate authorization following human review of the preflight findings.
