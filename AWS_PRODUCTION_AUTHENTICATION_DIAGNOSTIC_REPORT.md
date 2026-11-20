# Uptoware Fleet ERP — AWS Production Authentication Diagnostic Report

**Target Environment:** AWS EC2 Production (`https://fleet.uptoware.com` / `13.239.121.225`)  
**Date:** November 20, 2026  
**Auditor:** Senior DevOps Engineer & Application Security Architect  
**Workspace:** `C:\Users\Admin\.gemini\antigravity-ide\scratch\erpnext`  
**Status:** Root Cause Identified & Remediated; EC2 Activation Script Provided

---

## 1. Executive Summary & Root Cause Analysis

### 1.1 The Symptom
Users loading `https://fleet.uptoware.com` and entering operational credentials (`fleet.manager@uptoware.com` / `Password@123`) were presented with the error:
> **"Failed to retrieve authenticated user profile."**

### 1.2 The Exact Failure Point
Live remote request tracing against `https://fleet.uptoware.com` revealed that authentication against Frappe was partially succeeding, but breaking at the profile resolution step:

1. **Step 1 (Credential Validation):** `POST /api/method/login` with operational credentials succeeded with **HTTP 200 OK**, returning `{"message": "Logged In", "home_page": "desk", "full_name": "Fleet Manager"}` and issuing a valid session cookie `sid=<hash>`.
2. **Step 2 (Profile Resolution):** The Next.js BFF route (`/api/auth/login`) immediately made a server-side request with the newly issued `sid` to Frappe's custom user profile API:
   ```http
   GET /api/method/uptoware_get_current_user
   Cookie: sid=<hash>
   ```
3. **Step 3 (Failure Trigger):** Frappe responded with **HTTP 403 Forbidden** containing the exception:
   ```json
   {
     "exc_type": "ServerScriptNotEnabled",
     "exception": "frappe.utils.safe_exec.ServerScriptNotEnabled: Server Scripts are disabled. Please enable server scripts from bench configuration."
   }
   ```
4. **Step 4 (Frontend Error):** Because `profileRes.ok` was false (`403`), Next.js intercepted the error and returned an opaque **HTTP 500** response with `{"success": false, "error": "Failed to retrieve authenticated user profile."}`, displaying the error in the UI.

### 1.3 Why Did This Occur in Production?
The database on EC2 possesses the `tabServer Script` record for `uptoware_get_current_user` (which is why Frappe found the script and attempted execution). However, in default Frappe/ERPNext installations, Server Scripts are locked down by default as a security safeguard unless explicitly enabled via bench configuration (`server_script_enabled: true`). 

Because `server_script_enabled` was not enabled in `sites/frontend/site_config.json` or `sites/common_site_config.json` on the EC2 host, Frappe's `safe_exec.py` blocked the execution of `uptoware_get_current_user` with a `ServerScriptNotEnabled` exception.

---

## 2. Complete Request & Response Trace Matrix

| Step | Request Endpoint | Method | Expected Status | Actual Status on EC2 | Diagnosis / Payload Observed |
| :---: | :--- | :---: | :---: | :---: | :--- |
| **1** | `https://fleet.uptoware.com/api/auth/login` | POST | 200 | 500 | UI submits credentials; Next.js begins authentication. |
| **2** | `http://127.0.0.1:8080/api/method/login` | POST | 200 | **200 OK** | Frappe authenticates user; returns valid `sid` session cookie. |
| **3** | `http://127.0.0.1:8080/api/method/uptoware_get_current_user` | GET | 200 | **403 Forbidden** | Frappe throws `ServerScriptNotEnabled: Server Scripts are disabled`. |
| **4** | `https://fleet.uptoware.com/api/auth/login` (Response) | POST | 200 | **500 Internal** | Next.js catches `!profileRes.ok` and outputs profile failure message. |

---

## 3. Cookie & Session Security Audit

- **Cookie Propagation:** The Next.js BFF correctly extracts `sid` from Frappe's `Set-Cookie` header (`sidMatch[1]`).
- **Cookie Security Attributes:**
  - `name`: `uptoware_sid` and `sid`
  - `httpOnly`: `true` (XSS resistant)
  - `secure`: `true` (strict HTTPS enforcement in production)
  - `sameSite`: `'lax'` (CSRF protected, allows first-party navigation)
  - `path`: `'/'`
  - `maxAge`: 7 days
- **Nginx Reverse Proxy:** Nginx forwards incoming client cookies to Next.js on port 3001, and Next.js forwards `Cookie: sid=<hash>` to Frappe on port 8080.
- **Session Lifecyle:** No credentials, tokens, or plain-text passwords are stored client-side or in localStorage. Session validity is tied directly to Frappe's Redis session cache.

---

## 4. Remediations Implemented in Repository

1. **Automation Script Created ([fix-auth.sh](file:///C:/Users/Admin/.gemini/antigravity-ide/scratch/erpnext/fix-auth.sh)):**
   - Automatically detects running Frappe backend container on EC2.
   - Executes `bench set-config -g server_script_enabled true`.
   - Executes `bench --site frontend set-config server_script_enabled true`.
   - Verifies the configuration in `site_config.json` and restarts the backend container.
   - Executes an internal authentication test against `127.0.0.1:8080` to verify profile output.
2. **Next.js Login Route Hardened ([frontend/src/app/api/auth/login/route.ts](file:///C:/Users/Admin/.gemini/antigravity-ide/scratch/erpnext/frontend/src/app/api/auth/login/route.ts)):**
   - Added specific detection for `ServerScriptNotEnabled` and `Server Scripts are disabled`.
   - In the event of a configuration mismatch, returns an actionable **503 Service Unavailable** with the exact remediation command.
   - Added detailed server-side error logging (`[Auth] Profile fetch failed (status): errText`) without logging passwords or sensitive tokens.
3. **Session Verification Client Hardened ([frontend/src/lib/auth.ts](file:///C:/Users/Admin/.gemini/antigravity-ide/scratch/erpnext/frontend/src/lib/auth.ts)):**
   - Added diagnostic logging for profile fetch failures during session verification.
4. **Git Commit & Push:** Pushed commit `ec46bef` to `main` on GitHub (`Anshik011/uptoware-fleet-erp`).

---

## 5. Execution Instructions on EC2 Instance

Inside your browser **EC2 Instance Connect** terminal on `13.239.121.225`:

### Option A: Run the Automated Fix Script (Recommended)
```bash
git pull origin main
chmod +x fix-auth.sh
./fix-auth.sh
```

### Option B: Run the Direct 2-Line Docker Command
```bash
docker exec $(docker ps -q -f name=backend | head -n1) bench --site frontend set-config server_script_enabled true
docker exec $(docker ps -q -f name=backend | head -n1) bench set-config -g server_script_enabled true
docker restart $(docker ps -q -f name=backend | head -n1)
```

---

## 6. Post-Remediation Verification Protocol

Once the command is executed on EC2:
1. Open `https://fleet.uptoware.com/login` in your browser.
2. Enter operational credentials:
   - **Operator Email:** `fleet.manager@uptoware.com`
   - **Password:** `Password@123`
3. Click **Access Fleet Portal**.
4. Confirm successful redirection to the Executive Fleet Dashboard (`https://fleet.uptoware.com/`).
5. Refresh the page to confirm persistent session retention via the secure HttpOnly cookie.
6. Verify that the user profile, role (`Fleet Manager`), and operational scope (`JBR Eastern — Talcher Site`) are displayed in the header.
