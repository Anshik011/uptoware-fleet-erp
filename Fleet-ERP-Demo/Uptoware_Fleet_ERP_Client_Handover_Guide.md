# UPTOWARE FLEET MANAGEMENT ERP — PRODUCTION CLIENT HANDOVER & OPERATIONAL GUIDE

## 1. Executive Product Overview
The **Uptoware Fleet Management ERP** is an enterprise-grade logistics, operations, and haulage management solution engineered for commercial mining, transportation, and industrial transport operations. It integrates vehicle compliance tracking, driver shift allocations, weighbridge operations, automated fuel & expense tracking, maintenance dispatching, and double-entry financial accounting into a single unified platform.

---

## 2. Architecture & Production Deployment Topology

The platform comprises a distributed, decoupled multi-service containerized architecture:

1. **Frontend Presentation & BFF Layer (Port 3001 / Port 80):**
   - Next.js 16 (React 19 / Turbopack / TypeScript 5.9).
   - Server-Side Role-Based Access Control (RBAC) middleware.
   - Centralized authentication context via secure HTTP-only cookies (`uptoware_sid`).
2. **Operations & ERP Business Engine (Port 8080):**
   - ERPNext Enterprise Application Engine (v16.51.1).
   - Frappe Framework Application Server (v16.52.0).
   - Python 3.14 WSGI Gunicorn runtime.
3. **Data & Storage Layer:**
   - MariaDB 11.8 Enterprise Database with InnoDB ACID engine.
   - Redis Cache & Redis Message Broker (Redis 6.2).
   - Docker Persistent Named Volumes for private document attachments and immutable backups.

---

## 3. Production Deployment & Service Configuration

### A. Environment Configuration Requirements
Create a production environment file (`.env.production`) on the host server:

```env
# Frontend Production Configuration
PORT=3001
NODE_ENV=production
NEXT_PUBLIC_API_URL=http://localhost:8080
FRAPPE_BACKEND_URL=http://erpnext-frontend-1:8080

# Production Domain & SSL (Host Reverse Proxy)
DOMAIN_NAME=fleet.uptoware.com
LETSENCRYPT_EMAIL=ops@uptoware.com

# Database Connection (Internal Container Network)
DB_HOST=db
DB_PORT=3306
MYSQL_ROOT_PASSWORD=<SECURE_STRONG_ROOT_SECRET>
DB_NAME=_75036aaae4ad31e5
DB_USER=_75036aaae4ad31e5
DB_PASSWORD=<SECURE_STRONG_DB_SECRET>
```

### B. Production Nginx Reverse Proxy & HTTPS (Host Level)
Deploy an edge reverse proxy (e.g., Nginx with Certbot) directing external traffic:

```nginx
server {
    listen 80;
    server_name fleet.uptoware.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name fleet.uptoware.com;

    ssl_certificate /etc/letsencrypt/live/fleet.uptoware.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/fleet.uptoware.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Direct Backend API Pass (Protected Internal Routing)
    location /api/method/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 4. User Access & Role Authorization Matrix

The application enforces strict Role-Based Access Control (RBAC). Permitted roles and their functional domain boundaries:

| User Role | Operations Scope | Permitted System Actions |
| :--- | :--- | :--- |
| **Administrator** | Full Platform Administration | User creation, role assignments, system backups, global configuration, full audit log access. |
| **Fleet Manager** | Core Logistics & Commercial | Vehicle and Driver master management, Shift Allocation, Trip approvals, Customer Contracts, Billing initiation. |
| **Dispatcher** | Daily Yard & Weighbridge Dispatch | Vehicle dispatch, Driver roster lookup, Trip departure registration, Weighbridge scale confirmation. |
| **Workshop Supervisor** | Maintenance & Spare Parts | Breakdown incident logging, Work order maintenance creation, Spare Part stock entry issue & return. |
| **Accountant** | Financials & General Ledger | Sales Invoice review and submission, Payment Entry recording and allocation against invoices, Profitability reports. |

---

## 5. Standard Operating Procedures (Key Workflows)

### Workflow 1: Driver Registration & Unified Master Sync
1. Navigate to **Driver Roster (`/drivers`)** and click **"Register Driver"**.
2. Provide the operator's full name, contact phone, licence number, and statutory validity dates.
3. The platform automatically verifies and creates a linked personnel master record in `Employee` (Designation: `'Driver'`).
4. Strict 1:1 uniqueness guarantees that no duplicate driver profiles or orphaned employees can be generated.

### Workflow 2: Shift Allocation & Dispatching
1. Navigate to **Shift Allocation (`/shifts`)**.
2. Select an active vehicle and driver. The system automatically enforces non-overlapping shift times and verifies statutory compliance (e.g. valid licence, active insurance, and current fitness certificates).
3. In **Dispatch Queue (`/dispatch`)**, initialize a new haulage trip. Drivers and vehicles are dynamically validated before trip release.

### Workflow 3: Weighbridge Confirmation & Delivery
1. When the vehicle reaches the pit or transfer terminal, navigate to **Weighbridge Operations (`/weighbridge`)**.
2. Register the gross weight upon arrival and tare weight upon return.
3. The system calculates net tonnage with high precision and transitions the trip state to `Weighbridge Confirmed`, then `Delivered`.

### Workflow 4: Financial Billing & Payment Collections
1. Navigate to **Revenue & Invoicing (`/revenue`)**.
2. Select **"Prepare Invoice from Trip"** for a delivered haulage trip.
3. The system looks up the approved **Customer Contract**, applies the verified contract rate per ton against the scale net tonnage, and generates a **Draft Sales Invoice**.
4. The accountant reviews the invoice and submits it in accordance with organizational approval policies.
5. In **Payments & Collections (`/collections`)**, click **"Record Payment"** to allocate incoming client remittances against submitted invoices with outstanding balances.

---

## 6. Backup, Verification & Disaster Recovery Procedures

### A. Performing an Immediate Automated Backup
To take a complete, verified snapshot of the production database and all uploaded files, run:

```bash
docker exec erpnext-backend-1 bench --site frontend backup --with-files
```

This creates a timestamped bundle containing:
- `*-frontend-database.sql.gz` (Full MariaDB SQL dump).
- `*-frontend-files.tar` (Public media and vehicle documents).
- `*-frontend-private-files.tar` (Private statutory records and licences).
- `*-frontend-site_config_backup.json` (Encryption keys and site metadata).

### B. Disaster Recovery & Restoration Procedure
In the event of total server loss, restore the system on any clean Docker host:

1. Deploy the Docker Compose stack from the repository.
2. Transfer the backup archive files to the host.
3. Execute the site restore command:
   ```bash
   docker exec erpnext-backend-1 bench --site frontend restore \
       /path/to/backup/database.sql.gz \
       --with-private-files /path/to/backup/private-files.tar \
       --with-public-files /path/to/backup/files.tar
   ```
4. Run site migration to re-index all database schemas:
   ```bash
   docker exec erpnext-backend-1 bench --site frontend migrate
   ```

---

## 7. Known Operational Boundaries & Client Configuration Requirements

1. **Customer Contract Rates:**
   - Every Mine Site customer must have an active, approved `Customer Contract` record with a defined haulage rate per ton before an automated Sales Invoice can be generated.
2. **Chart of Accounts & Tax Templates:**
   - Client-specific Goods & Services Tax (GST) and cost centers must be configured in ERPNext general ledger settings to match local statutory compliance requirements.
3. **SMS / Email Gateways:**
   - Notifications for dispatch alerts and breakdown incident triggers require connecting the organization's SMTP relay or SMS provider in Frappe Notification settings.

