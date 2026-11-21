# AWS Production Recovery & Authentication Restoration Report

**System:** Uptoware Fleet Management ERP  
**Production Domain:** https://fleet.uptoware.com  
**AWS Host:** `13.239.121.225` (AWS EC2 `m7i-flex.large`, Ubuntu)  
**Date:** November 20, 2026  
**Status:** **RECOVERED & FULLY OPERATIONAL (100% VERIFIED)**

---

## 1. Executive Summary

Production login and authenticated profile retrieval failures at `https://fleet.uptoware.com` have been completely resolved. 

The underlying failure was caused by Frappe's internal Nginx proxy container (`erpnext-docker-frontend-1`) caching a stale internal Docker IP (`172.18.0.10:8000`) for the Gunicorn backend container (`erpnext-docker-backend-1`), which had moved to `172.18.0.3` after a previous container restart. This caused all backend API routing through port 8080 to return `HTTP 502 Bad Gateway`.

Following owner approval, a minimal, non-disruptive remediation (`docker restart erpnext-docker-frontend-1`) was executed directly on EC2. The complete authentication lifecycle—from public HTTPS ping, credential login, secure session cookie issuance, authenticated profile retrieval, to main dashboard rendering and session invalidation upon logout—was verified end-to-end.

Temporary SSH access has been permanently revoked, leaving the production environment secure, unaltered in architecture, and with zero data loss.

---

## 2. Root Cause Analysis (Empirical Proof)

1. **Proxy Error Log Trace:**
   ```text
   connect() failed (113: No route to host) while connecting to upstream, request: "GET /api/method/ping HTTP/1.1", upstream: "http://172.18.0.10:8000/api/method/ping"
   ```
2. **Container IP Audit:**
   - Proxy container `erpnext-docker-frontend-1` (`c5143c54c291`): `172.18.0.11`
   - Active Backend container `erpnext-docker-backend-1` (`7a58d709e48f`): `172.18.0.3`
   - Upstream Target held by Nginx: `172.18.0.10` (no route to host)
3. **Backend Container Health:**
   - Direct probe to Gunicorn on `http://172.18.0.3:8000/api/method/ping -H 'Host: frontend'` confirmed backend was 100% healthy, returning `HTTP 200 OK {"message":"pong"}`.
4. **Resolution Mechanism:**
   - Nginx evaluates `upstream backend-server { server backend:8000; }` on process startup. Restarting the proxy container forced Nginx to re-query Docker DNS (`127.0.0.11`), binding to active IP `172.18.0.3:8000`.

---

## 3. Minimal Remediation Executed

| Parameter | Value |
| :--- | :--- |
| **Command Executed** | `docker restart erpnext-docker-frontend-1` |
| **Target Container ID** | `c5143c54c291` |
| **Execution Duration** | 1.48 seconds |
| **Database Impact** | None (MariaDB remained untouched) |
| **Redis Cache Impact** | None (Redis sessions remained untouched) |
| **Application Code Changes** | None (zero code modified in production) |

---

## 4. End-to-End Verification Matrix

| Test # | Lifecycle Checkpoint | Endpoint / Target | Expected | Observed | Status |
| :---: | :--- | :--- | :---: | :---: | :---: |
| **1** | Internal Frappe Ping | `http://127.0.0.1:8080/api/method/ping` | `HTTP 200` `{"message":"pong"}` | `HTTP 200` `{"message":"pong"}` | **PASS** |
| **2** | Public Frappe Ping | `https://fleet.uptoware.com/api/method/ping` | `HTTP 200` `{"message":"pong"}` | `HTTP 200` `{"message":"pong"}` | **PASS** |
| **3** | Operational Login | `POST https://fleet.uptoware.com/api/auth/login` | `HTTP 200` `success: true` | `HTTP 200` `success: true` | **PASS** |
| **4** | Session Cookie Issuance | Response Headers | `Set-Cookie: uptoware_sid; sid` | `Set-Cookie` present & valid | **PASS** |
| **5** | Authenticated Profile | `GET https://fleet.uptoware.com/api/auth/session` | `HTTP 200` identity match | `HTTP 200` User: `sahooashutosh011@gmail.com` | **PASS** |
| **6** | Main Dashboard Access | `GET https://fleet.uptoware.com/` | `HTTP 200` HTML payload | `HTTP 200` (50,360 bytes received) | **PASS** |
| **7** | Protected Fleet Route | `GET https://fleet.uptoware.com/vehicles` | `HTTP 200` HTML payload | `HTTP 200` (46,371 bytes received) | **PASS** |
| **8** | Session Persistence | Subsequent `/api/auth/session` | `HTTP 200` session intact | `HTTP 200` verified | **PASS** |
| **9** | Logout & Invalidation | `POST https://fleet.uptoware.com/api/auth/logout` | `HTTP 200` session cleared | `HTTP 200` cleared | **PASS** |
| **10** | Unauthenticated Guard | Subsequent `/api/auth/session` | `HTTP 401 Unauthorized` | `HTTP 401 Unauthorized` | **PASS** |

---

## 5. Security & Access Cleanup

1. **Temporary SSH Access Revocation:**
   - Ran `sed -i '/antigravity-devops@fleet-erp/d' ~/.ssh/authorized_keys` on EC2.
   - Verified `grep -c` returned `0`.
   - Subsequent SSH connection probe failed with `Permission denied (publickey)`. Access is permanently revoked.
2. **Local Key Pair Destruction:**
   - Removed `id_ed25519` and `id_ed25519.pub` from the local development system.
3. **Password Security Note:**
   - Per security protocol, the owner should rotate the password for `sahooashutosh011@gmail.com` through the web interface (`https://fleet.uptoware.com`) now that production login is fully operational.
