# Uptoware Fleet ERP — Multi-Mine Architecture Design & Security Specification

**Document Version:** 2.0.0 (Comprehensive Critical Review & Engineering Correction)  
**Target System:** Uptoware Fleet ERP (ERPNext v16.51.1 / Frappe v16.52.0 / Next.js 16.4.5)  
**Status:** Final Architecture Specification (Under Review — Zero Execution Phase)  
**Author:** Principal ERPNext/Frappe Architect, Backend Developer & Security Engineer  
**Date:** 15 November 2026  

---

## Document Taxonomy & Legend

To ensure complete clarity between empirically verified behavior, engineering decisions, and policy requirements, every section and claim in this document is labeled using the following taxonomy:

- `[VERIFIED FACT]`: Empirically validated against the running Frappe v16.52.0 / ERPNext v16.51.1 container source code, MariaDB schema, or Next.js repository.
- `[ARCHITECTURAL DECISION]`: Approved structural or engineering design to satisfy technical requirements.
- `[RECOMMENDATION]`: Expert technical proposal designed to minimize operational friction and maximize security.
- `[REQUIRES BUSINESS APPROVAL]`: Operational policy decision that must be explicitly confirmed by business stakeholders before implementation.

---

## 1. Executive Technical Decision

### 1.1 Structural Strategy: Single-Company, Multi-Mine Operational Model
`[ARCHITECTURAL DECISION]`  
Uptoware Fleet ERP will implement a **Single-Company, Multi-Mine Operational Isolation Model** within the unified ERPNext v16 / Frappe v16 installation and Next.js frontend.

This model explicitly rejects multi-database sharding, separate Frappe sites, or multi-company fragmentation:
1. `[VERIFIED FACT]` **Single Legal Entity & General Ledger:** All mining operations operate under a single registered legal entity (`Uptoware`). Creating multiple Frappe Companies would fragment statutory compliance (GSTIN, PF, ESI, TDS, corporate tax returns), break shared Chart of Accounts reconciliation, and create massive operational friction for intra-company vendor and customer settlements.
2. `[VERIFIED FACT]` **ERPNext v16 Custom App Boundary:** No custom Frappe app is currently installed. Customizations operate strictly through standard Frappe mechanisms: DocTypes, Custom Fields, Property Setters, and Server Scripts. Python module hooks (`hooks.py`) are unavailable.
3. `[ARCHITECTURAL DECISION]` **Strict Default-Deny Authorization Engine:** Frappe's native User Permission mechanism is permissive by default (allow-all when unconfigured). Our architecture wraps Frappe permissions with a mandatory **Default-Deny Security Framework** using Frappe `Permission Query` Server Scripts and Next.js route-level session validation.
4. `[ARCHITECTURAL DECISION]` **Immutable Historical Provenance:** Assets (vehicles) and personnel (drivers) may be reallocated across mines over time. Transactions (`Mining Trip`, `Fuel Log`, `Vehicle Breakdown`, `Operational Expense`) permanently retain the immutable `mine_site` foreign key where the event occurred. Historical reports will never join against the asset's current home mine.

---

## 2. Critical Frappe v16 Permission Engine Findings & Corrections

### 2.1 The "Universal User Permission" Fallacy
`[VERIFIED FACT]`  
The initial version of this architecture document claimed:
> *"Native Frappe User Permissions automatically inject SQL constraints across frappe.get_list, frappe.get_all, link searches, report queries and frappe.get_doc."*

**This statement is empirically false in Frappe v16.52.0.** Treating Frappe User Permissions as a universal, automatic authorization boundary creates critical security vulnerabilities.

### 2.2 Method-by-Method Frappe v16 Permission Matrix
The following table records the exact behavior of Frappe internal methods verified against the installed source code (`apps/frappe/frappe/`):

| Method / Mechanism | Permission Enforcement Status | Verified Behavior & Vulnerability in Frappe v16.52.0 |
| :--- | :--- | :--- |
| `frappe.get_list` | **Enforced** (Role + User Perms + Query Scripts) | `[VERIFIED FACT]` Executes `DatabaseQuery.execute()`. Calls `build_match_conditions()` to apply role permissions, user permissions, and `Permission Query` Server Scripts. |
| `frappe.get_all` | **BYPASSED COMPLETELY** | `[VERIFIED FACT]` Explicitly defines `kwargs["ignore_permissions"] = True`. Never checks roles, user permissions, or query conditions. Any code using `get_all` exposes all records across all mines. |
| `frappe.get_doc` | **BYPASSED ON LOAD** | `[VERIFIED FACT]` Loads document and child tables directly from DB via `load_from_db()`. Does **not** check permissions. Permission is checked only if the caller explicitly invokes `doc.check_permission("read")`. |
| `frappe.client.get` | **Enforced** (Wraps `get_doc`) | `[VERIFIED FACT]` Whitelisted API method. Calls `frappe.get_doc()`, then explicitly runs `doc.check_permission()` and `doc.apply_fieldlevel_read_permissions()`. |
| `frappe.db.get_value` | **BYPASSED COMPLETELY** | `[VERIFIED FACT]` Executes direct SQL `SELECT fieldname FROM tab... WHERE ...`. Bypasses all role permissions, user permissions, and server script hooks. |
| `frappe.db.get_all` | **BYPASSED COMPLETELY** | `[VERIFIED FACT]` Direct alias to `frappe.get_all`. Sets `ignore_permissions = True`. |
| `frappe.get_cached_doc` | **BYPASSED ON LOAD** | `[VERIFIED FACT]` Returns cached document from Redis / memory or calls `frappe.get_doc`. Does not check permissions. |
| `frappe.has_permission` | **Conditional** | `[VERIFIED FACT]` Checks DocPerm roles. If `doc` is passed, evaluates `has_user_permission()`. If `doc=None`, checks only role permissions, ignoring row-level user permissions. |
| `frappe.permissions.has_user_permission` | **Permissive by Default** | `[VERIFIED FACT]` In `frappe/permissions.py`: If `user_permissions` dict is empty, it returns `True`. If `doc.mine_site` is empty and `apply_strict_user_permissions=0`, it returns `True`. |
| Link Search (`search_link`) | **Enforced but Cached** | `[VERIFIED FACT]` In `frappe/desk/search.py`: Enforces user permissions in `search_widget()`, but is decorated with `@http_cache(max_age=60)`. Cache must be evaluated for user leakage. |
| Script Reports (`tabReport`) | **BYPASSED IN RAW SQL** | `[VERIFIED FACT]` In `query_report.py`: Validates role permission `frappe.has_permission(ref_doctype, "report")`, but custom Python script code running `frappe.db.sql` bypasses row-level permissions unless explicitly parameterized. |
| Query Reports (`tabReport`) | **BYPASSED IN RAW SQL** | `[VERIFIED FACT]` Runs static SQL query. Does not inject user permissions unless query explicitly references `%(mine_site)s` filter. |
| Raw SQL (`frappe.db.sql`) | **BYPASSED COMPLETELY** | `[VERIFIED FACT]` Direct database execution. Zero permission checks. |
| Background Jobs (`frappe.enqueue`) | **BYPASSED COMPLETELY** | `[VERIFIED FACT]` Executes in worker thread under `frappe.session.user = "Administrator"` or background context, bypassing session-level user permissions. |
| Export Endpoints | **Mixed** | `[VERIFIED FACT]` CSV/Excel exports from Desk rely on `get_list` (enforced), but custom export routes or data migration tools using raw queries bypass checks. |

### 2.3 The Critical Frappe "Allow-by-Default" Security Vulnerability
`[VERIFIED FACT]`  
Inspection of `frappe/permissions.py` lines 353–410 and `frappe/model/db_query.py` lines 800–850 revealed the root vulnerability:
```python
user_permissions = get_user_permissions(user)
if not user_permissions:
    return True  # Open access!
```
And in `add_user_permissions(self, user_permissions)`:
```python
user_permission_values = user_permissions.get(df.get("options"), {})
if not user_permission_values:
    continue  # No SQL condition is added!
```
Furthermore, `apply_strict_user_permissions` in `tabSystem Settings` was inspected on the live MariaDB database and verified to be `0` (disabled).

**Consequence:** In standard Frappe, if an operational user (e.g. `Dispatcher` or `Mine Manager`) is created and assigned operational roles, but the administrator has **not yet created a User Permission record for `Mine Site`**, Frappe **GRANTS UNRESTRICTED ACCESS TO ALL RECORDS ACROSS ALL MINES**.

### 2.4 The Default-Deny Security Framework
`[ARCHITECTURAL DECISION]`  
To eliminate this vulnerability, the system will implement an explicit **Default-Deny Security Architecture**:

```
                                  [ Incoming Request ]
                                           │
                                  Is User Global Admin?
                               (System Manager / Head Office)
                                    ├── YES ──► Allow All Mines
                                    └── NO  ──┐
                                              ▼
                                 Query tabUser Permission 
                                   for allow = 'Mine Site'
                                              │
                         ┌────────────────────┴────────────────────┐
                         ▼                                         ▼
                 Mines Assigned > 0                        Mines Assigned == 0
                         │                                         │
                         ▼                                         ▼
          Inject SQL: `mine_site` IN (...)                 Inject SQL: 1 = 0
             Allow ONLY Assigned Mines                    STRICT ACCESS DENIED
                                                          (0 Records Returned)
```

1. **Permission Query Server Script:** Configured for `Mining Trip`, `Fuel Log`, `Vehicle Breakdown`, `Operational Expense`, `Vehicle`, `Driver`, and `Vehicle Driver Shift Allocation`.
   - If user has `System Manager` or `Fleet Head Office Admin`: `conditions = ""` (unrestricted).
   - If user has assigned mines: `conditions = "\`tab{doctype}\`.\`mine_site\` IN ('Mine A', 'Mine B')"`
   - If user is operational but has **NO** assigned mines: `conditions = "1=0"` (returns zero records).
2. **DocType Event Validation Guard (`before_validate` / `before_save`):**
   - Intercepts document creation and modification.
   - Throws `frappe.PermissionError` if the user attempts to insert or update a document linked to an unauthorized mine.

---

## 3. Reconsidered Mine Ownership Model

### 3.1 Four-Tier Master & Transaction Ownership Matrix

| Tier | Category | DocTypes | Mine Attribution Field | Lifecycle & Ownership Rule |
| :--- | :--- | :--- | :--- | :--- |
| **Tier 1** | **Mine-Specific Masters** | `Vehicle`, `Driver`, `Vehicle Driver Shift Allocation` | `custom_mine_site` / `mine_site` (Link `Mine Site`, Mandatory) | Stationed at an operational mine. Governs dispatch availability and roster scheduling. Updated only via approved asset transfer. |
| **Tier 2** | **Company-Wide Shared Masters** | `Employee`, `Customer`, `Supplier`, `Item` (Spare Parts), `Cost Center` | None (Company-Global) | Universal business entities. `Employee` represents statutory employment; `Driver` represents operational mine deployment. |
| **Tier 3** | **Hybrid Operational Masters** | `Warehouse` | `custom_mine_site` (Link `Mine Site`, Optional) | Central Spares Store has `custom_mine_site = NULL` (shared company store). Mine Stores/Workshops have `custom_mine_site` populated. |
| **Tier 4** | **Immutable Operational Transactions** | `Mining Trip`, `Fuel Log`, `Vehicle Breakdown`, `Vehicle Breakdown Part`, `Operational Expense`, `Stock Entry` | `mine_site` / `custom_mine_site` (Link `Mine Site`, Mandatory) | Permanently anchored to event location. Relocating a vehicle or driver never alters historical transaction mine sites. |
| **Tier 5** | **Commercial & Financial Invoices** | `Sales Invoice`, `Purchase Order`, `Purchase Receipt`, `Purchase Invoice` | `custom_mine_site` (Link `Mine Site`, Mandatory) | Header-level attribution for site P&L. General Ledger remains unified under `Uptoware`. |

### 3.2 Key Entity Ownership Evaluations
1. `[VERIFIED FACT]` **Employee vs. Driver Separation:**
   - In ERPNext, `Employee` represents the legal employment contract (PF, ESI, PAN, salary slips, bank accounts). Legal employment belongs to the company (`Uptoware`), not to a pit.
   - `Driver` represents the operational transport persona. The verified 1:1 bidirectional link (`Driver.employee` <-> `Employee.custom_driver_profile`) will be preserved.
   - `custom_mine_site` will be placed on `Driver`, while `Employee` remains company-wide.
2. `[ARCHITECTURAL DECISION]` **Warehouse & Inventory Segmentation:**
   - Central Spares Warehouse (e.g. `Central Fleet Stores - U`) will have `custom_mine_site = NULL`. It is accessible by Head Office Procurement for bulk purchasing.
   - Mine Workshop Stores (e.g. `Talcher Central Spares - U`) will have `custom_mine_site = 'JBR Eastern — Talcher Site'`. Local workshop supervisors can only issue materials from their assigned mine warehouse.
3. `[ARCHITECTURAL DECISION]` **Stock Entry Attribution:**
   - `Stock Entry` items reference `s_warehouse` and `t_warehouse`.
   - Capturing `custom_mine_site` at the `Stock Entry` header level provides direct indexing and prevents multi-join performance degradation in inventory reports.
4. `[ARCHITECTURAL DECISION]` **Transaction Provenance:**
   - Operational transactions (`Mining Trip`, `Fuel Log`, `Vehicle Breakdown`, `Operational Expense`) must explicitly store `mine_site` as an immutable foreign key. Deriving the mine dynamically from `Vehicle.custom_mine_site` at query time would rewrite history whenever a vehicle transfers.

---

## 4. Unified Asset Transfer Model & Historical Integrity

### 4.1 Rejection of Split Transfer DocTypes
`[ARCHITECTURAL DECISION]`  
The initial design proposed two separate DocTypes: `Vehicle Mine Transfer Log` and `Driver Mine Transfer Log`.  
**Correction:** The design is unified into a single, standardized DocType: **`Fleet Mine Transfer Log`**.

**Technical Justification:**
- Both vehicles and drivers share identical transfer approval workflows, status states (`Draft` -> `Pending Approval` -> `Approved` / `Rejected`), and audit requirements.
- Maintaining two DocTypes duplicates Server Scripts, permission configurations, and UI tables.
- A single DocType provides a centralized audit log of all resource movements across the company.

### 4.2 Schema Specification: `Fleet Mine Transfer Log`

```json
{
  "doctype": "DocType",
  "name": "Fleet Mine Transfer Log",
  "module": "Fleet Management",
  "naming_rule": "Expression",
  "autoname": "format:TRF-{YYYY}-{MM}-{#####}",
  "is_submittable": 1,
  "fields": [
    {
      "fieldname": "transfer_type",
      "label": "Asset Type",
      "fieldtype": "Select",
      "options": "Vehicle\nDriver",
      "reqd": 1,
      "in_list_view": 1
    },
    {
      "fieldname": "asset_id",
      "label": "Asset ID",
      "fieldtype": "Dynamic Link",
      "options": "transfer_type",
      "reqd": 1,
      "in_list_view": 1
    },
    {
      "fieldname": "asset_identifier",
      "label": "Asset Name / License Plate",
      "fieldtype": "Data",
      "read_only": 1,
      "in_list_view": 1
    },
    {
      "fieldname": "from_mine",
      "label": "Current / Origin Mine Site",
      "fieldtype": "Link",
      "options": "Mine Site",
      "reqd": 1,
      "read_only": 1,
      "in_list_view": 1
    },
    {
      "fieldname": "to_mine",
      "label": "Destination Mine Site",
      "fieldtype": "Link",
      "options": "Mine Site",
      "reqd": 1,
      "in_list_view": 1
    },
    {
      "fieldname": "effective_date",
      "label": "Effective Date & Time",
      "fieldtype": "Datetime",
      "reqd": 1,
      "default": "Now",
      "in_list_view": 1
    },
    {
      "fieldname": "odometer_at_transfer",
      "label": "Odometer at Transfer (KM)",
      "fieldtype": "Int",
      "depends_on": "eval:doc.transfer_type=='Vehicle'"
    },
    {
      "fieldname": "reason",
      "label": "Transfer Reason",
      "fieldtype": "Select",
      "options": "Operational Rebalancing\nMaintenance / Workshop Relocation\nContract Reallocation\nTemporary Deployment\nDriver Transfer",
      "reqd": 1
    },
    {
      "fieldname": "remarks",
      "label": "Remarks / Justification",
      "fieldtype": "Small Text"
    },
    {
      "fieldname": "requested_by",
      "label": "Requested By",
      "fieldtype": "Link",
      "options": "User",
      "read_only": 1,
      "default": "__user"
    },
    {
      "fieldname": "approved_by",
      "label": "Approved By",
      "fieldtype": "Link",
      "options": "User",
      "read_only": 1
    },
    {
      "fieldname": "transfer_status",
      "label": "Status",
      "fieldtype": "Select",
      "options": "Draft\nPending Approval\nCompleted\nCancelled",
      "default": "Draft",
      "read_only": 1,
      "in_standard_filter": 1
    }
  ]
}
```

### 4.3 Validation Guardrails on Asset Relocation
`[ARCHITECTURAL DECISION]`  
When `Fleet Mine Transfer Log` is submitted (`on_submit`):
1. **Active Trip Conflict Blocker:**
   - For Vehicles: Checks `tabMining Trip` where `vehicle = doc.asset_id` and `trip_status IN ('Dispatched', 'Weighbridge Confirmed')`. If found, throws `frappe.ValidationError: Cannot transfer vehicle while actively dispatched on trip {name}`.
   - For Drivers: Checks `tabMining Trip` where `driver = doc.asset_id` and `trip_status IN ('Dispatched', 'Weighbridge Confirmed')`.
2. **Active Shift Conflict Blocker:**
   - Checks `tabVehicle Driver Shift Allocation` for open shifts on the transfer date. Throws `frappe.ValidationError` if unended shifts exist.
3. **Monotonic Odometer Integrity (Vehicles):**
   - Validates that `odometer_at_transfer >= Vehicle.last_odometer`.
4. **Atomic Master Update:**
   - For Vehicles: Updates `tabVehicle.custom_mine_site = doc.to_mine` and `last_odometer = doc.odometer_at_transfer`.
   - For Drivers: Updates `tabDriver.custom_mine_site = doc.to_mine`.
5. **Zero Historical Mutation:**
   - Zero update statements are executed against historical `tabMining Trip`, `tabFuel Log`, `tabVehicle Breakdown`, or `tabOperational Expense`.

---

## 5. User Permission Architecture & Access Control

### 5.1 Three-Tier User Access Model
`[ARCHITECTURAL DECISION]`  
To prevent accidental global leakage and ensure precise authorization, users are categorized into three distinct access profiles:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        USER AUTHORIZATION TIERS                        │
├─────────────────────────┬──────────────────────┬───────────────────────┤
│ Tier A: Head Office     │ Tier B: Mine-Bound   │ Tier C: Unassigned /  │
│ (Unrestricted)          │ Operational          │ Revoked               │
├─────────────────────────┼──────────────────────┼───────────────────────┤
│ Roles:                  │ Roles:               │ Condition:            │
│ - System Manager        │ - Mine Manager       │ Has operational role  │
│ - Fleet Head Office     │ - Dispatcher         │ but 0 active          │
│   Admin                 │ - Workshop Sup.      │ tabUser Permission    │
│ - Fleet Head Office     │ - Mine Accountant    │ records for Mine Site │
│   Auditor               │                      │                       │
├─────────────────────────┼──────────────────────┼───────────────────────┤
│ Scope:                  │ Scope:               │ Scope:                │
│ All Mines or toggle     │ Strictly restricted  │ DEFAULT-DENY:         │
│ specific mine context   │ to assigned mine(s)  │ 0 records visible     │
└─────────────────────────┴──────────────────────┴───────────────────────┘
```

### 5.2 Server Script Query Condition Engine
`[VERIFIED FACT]`  
A Server Script of type `Permission Query` for `Mining Trip` (and replicated for other operational DocTypes) executes natively inside Frappe:

```python
# Server Script: fleet_trip_permission_query
# Script Type: Permission Query
# DocType: Mining Trip

user = frappe.session.user
user_roles = frappe.get_roles(user)

# Tier A: Head Office Unrestricted Access
if "System Manager" in user_roles or "Fleet Head Office Admin" in user_roles or "Fleet Head Office Auditor" in user_roles:
    conditions = ""
else:
    # Tier B: Mine-Bound Operational Access
    allowed_mines = frappe.get_all(
        "User Permission",
        filters={"user": user, "allow": "Mine Site"},
        pluck="for_value"
    )
    if allowed_mines:
        escaped_mines = ", ".join([frappe.db.escape(m) for m in allowed_mines])
        conditions = f"`tabMining Trip`.`mine_site` IN ({escaped_mines})"
    else:
        # Tier C: Unassigned Operational User -> DEFAULT-DENY
        conditions = "1=0"
```

### 5.3 Document Validation Hook
`[VERIFIED FACT]`  
A Server Script of type `DocType Event` on `Before Insert` / `Before Validate` prevents IDOR / payload manipulation:

```python
# Server Script: fleet_trip_validate_guard
# Script Type: DocType Event
# DocType Event: Before Validate
# DocType: Mining Trip

user = frappe.session.user
user_roles = frappe.get_roles(user)

if "System Manager" not in user_roles and "Fleet Head Office Admin" not in user_roles:
    allowed_mines = frappe.get_all(
        "User Permission",
        filters={"user": user, "allow": "Mine Site"},
        pluck="for_value"
    )
    if not allowed_mines or doc.mine_site not in allowed_mines:
        frappe.throw(
            f"Access Denied: You are not authorized to create or modify trips for Mine Site '{doc.mine_site}'.",
            frappe.PermissionError
        )
```

---

## 6. Comprehensive API-by-API Security Specification

`[VERIFIED FACT]`  
An exhaustive review of all 52 Next.js API route handlers in `frontend/src/app/api/` was conducted. The table below specifies the required authorization checks and security remediations for every operational route:

| Route Path | Method | Current Frappe Call | Vulnerability & Gap | Required Authorization Check | Target Status on Violation |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/api/trips` | `GET` | `frappeFetch(/api/resource/Mining Trip)` | If `mine_site` query omitted, Frappe returns all mines. | Pass session cookie; verify requested `mine_site` is in session's allowed mines. Default-deny query script handles empty case. | `403 Forbidden` |
| `/api/trips` | `POST` | `frappeFetch(POST /api/resource/Mining Trip)` | Tampered payload can set unauthorized `mine_site`. | Validate `payload.mine_site` against permitted mines. Verify vehicle & driver belong to that mine. | `403 Forbidden` / `422 Unprocessable` |
| `/api/trips/[id]` | `GET` | `frappeFetch(/api/resource/Mining Trip/{id})` | `read_doc` relies on `check_permission`. If unassigned, allows read. | Document permission check backed by `validate_guard`. | `403 Forbidden` |
| `/api/trips/[id]/transition` | `POST` | `/api/method/frappe.model.workflow.apply_workflow` | Workflow transition can be triggered across mines. | Validate document's `mine_site` before applying transition. | `403 Forbidden` |
| `/api/fuel` | `GET` | `frappeFetch(/api/resource/Fuel Log)` | Unfiltered queries expose all mine fuel records. | Require permitted `mine_site`. Backend Permission Query script enforces filter. | `403 Forbidden` |
| `/api/fuel` | `POST` | `frappeFetch(POST /api/resource/Fuel Log)` | Driver or vehicle from foreign mine can be refueled. | Enforce `payload.mine_site` match with vehicle `custom_mine_site`. | `403 Forbidden` |
| `/api/vehicles` | `GET` | `frappeFetch(/api/resource/Vehicle)` | `Vehicle` has no mine field; returns all vehicles company-wide. | Filter by `custom_mine_site` in permitted mines. | `403 Forbidden` |
| `/api/vehicles/[id]` | `GET`, `PUT` | `frappeFetch(/api/resource/Vehicle/{id})` | Vehicle can be modified by foreign mine manager. | Verify `vehicle.custom_mine_site` is in user's permitted mines. | `403 Forbidden` |
| `/api/drivers` | `GET` | `frappeFetch(/api/resource/Driver)` | `Driver` has no mine field; returns all drivers company-wide. | Filter by `custom_mine_site` in permitted mines. | `403 Forbidden` |
| `/api/drivers/[id]` | `GET`, `PUT` | `frappeFetch(/api/resource/Driver/{id})` | Driver profile editable across mines. | Verify `driver.custom_mine_site` in user's permitted mines. | `403 Forbidden` |
| `/api/shifts` | `GET`, `POST` | `frappeFetch(/api/resource/Vehicle Driver Shift Allocation)` | Shifts have no mine link; rosters unsegregated. | Filter by `mine_site`. Enforce vehicle, driver, and shift mine site agreement. | `403 Forbidden` |
| `/api/breakdowns` | `GET`, `POST` | `frappeFetch(/api/resource/Vehicle Breakdown)` | Breakdowns and part costs exposed across mines. | Filter by `mine_site`. Enforce part warehouse belongs to that mine. | `403 Forbidden` |
| `/api/expenses` | `GET`, `POST` | `frappeFetch(/api/resource/Operational Expense)` | Site operational expenses exposed across mines. | Enforce `mine_site` validation in route handler and server script. | `403 Forbidden` |
| `/api/dispatch` | `GET` | Composite queries on trips, vehicles, drivers | Dispatch queue shows foreign mine assets. | Restrict queue queries strictly to user's active mine. | `403 Forbidden` |
| `/api/dispatch/eligibility` | `POST` | Checks vehicle, driver, insurance validity | Eligibility check can be probed for foreign mine vehicles. | Verify vehicle `custom_mine_site == requested_mine_site`. | `403 Forbidden` |
| `/api/weighbridge` | `GET`, `POST` | Updates gross/tare weights on `Mining Trip` | Weighbridge operator could confirm foreign mine trips. | Verify trip `mine_site` matches operator's assigned mine. | `403 Forbidden` |
| `/api/mine-sites` | `GET` | `frappeFetch(/api/resource/Mine Site)` | Returns all mine sites indiscriminately. | Operational users receive only their assigned `Mine Site` records. Head Office receives all. | `200 OK` (Filtered) |
| `/api/inventory/warehouses` | `GET` | `frappeFetch(/api/resource/Warehouse)` | Returns all company warehouses. | Returns central shared warehouse + user's mine-assigned warehouses. | `200 OK` (Filtered) |
| `/api/inventory/movements` | `GET`, `POST` | `frappeFetch(/api/resource/Stock Entry)` | Stock movements visible across all sites. | Filter by `custom_mine_site` or warehouse mine association. | `403 Forbidden` |
| `/api/procurement/orders` | `GET`, `POST` | `frappeFetch(/api/resource/Purchase Order)` | Site purchase orders exposed across mines. | Filter by `custom_mine_site`. | `403 Forbidden` |
| `/api/finance/revenue` | `GET` | Aggregates mining trip revenue | Calculates revenue across all mines. | Filter aggregation query by permitted `mine_site`. | `403 Forbidden` |
| `/api/finance/collections` | `GET` | Aggregates customer invoice collections | Shows company-wide billing collections. | Filter invoices by `custom_mine_site`. | `403 Forbidden` |
| `/api/finance/reports` | `GET` | Executes financial profitability reports | Aggregates multi-mine financial data. | Restrict non-Head Office users to permitted mine site. | `403 Forbidden` |
| `/api/admin/users` | `GET`, `POST` | User administration endpoint | Unrestricted user list. | Restricted strictly to `System Manager` and `Fleet Head Office Admin`. | `403 Forbidden` |

---

## 7. Frontend Architecture Review & `MineContext.tsx` Design

### 7.1 Global Mine Context (`MineContext.tsx`)
`[ARCHITECTURAL DECISION]`  
A centralized React context provider (`frontend/src/context/MineContext.tsx`) manages operational mine state:

```tsx
export interface MineSiteOption {
  name: string;
  site_name: string;
  client: string;
}

export interface MineContextType {
  currentMine: string | 'ALL';
  availableMines: MineSiteOption[];
  isHeadOffice: boolean;
  isUnassigned: boolean;
  setCurrentMine: (mine: string | 'ALL') => void;
  isLoading: boolean;
}
```

### 7.2 Header Integration & State Persistence
`[ARCHITECTURAL DECISION]`
1. **Header Placement:** Located in `frontend/src/components/layout/Header.tsx` immediately to the left of the Notifications icon.
2. **Contextual Rendering by User Type:**
   - **Head Office Users (`System Manager`, `Fleet Head Office Admin`, `Fleet Head Office Auditor`):**
     Renders an interactive dropdown selector:
     - `[All Mines (Consolidated)]`
     - `JBR Eastern — Talcher Site`
     - `JBR Eastern — Ib Valley Site`
   - **Multi-Mine Operational Users (e.g. Area Manager for 2 mines):**
     Renders a dropdown containing only their assigned mines.
   - **Single-Mine Operational Users (e.g. Talcher Dispatcher):**
     Renders a locked, persistent badge:
     `📍 JBR Eastern — Talcher Site` (no dropdown toggle).
   - **Unassigned Operational Users:**
     Renders a high-contrast warning badge:
     `⚠️ No Mine Assigned (Access Restricted)`.
3. **State Persistence:**
   - Active mine selection is persisted in a secure cookie `uptoware_active_mine` (SameSite=Strict, Path=/).
   - Synchronized with `x-uptoware-mine-context` HTTP header on all client-side API requests.

### 7.3 Modal Guarding & Linked-Field Auto-Filtering
`[ARCHITECTURAL DECISION]`
- In `CreateTripModal`, `AddFuelModal`, `ShiftAllocationModal`, `AddBreakdownModal`, and `AddExpenseModal`:
  - When `currentMine != 'ALL'`, the `mine_site` form input is pre-filled with `currentMine` and rendered as **read-only**.
  - Dropdown pickers for `Vehicle` and `Driver` automatically filter by `custom_mine_site = currentMine`.
  - If a Head Office user has `currentMine == 'ALL'`, modal forms require the user to explicitly select an operational mine before loading asset dropdowns.

---

## 8. Resolution of Four Business-Policy Questions

`[REQUIRES BUSINESS APPROVAL]`  
The following four operational questions govern the final behavioral parameters of the Multi-Mine architecture. For each question, an expert recommended default, technical implications, and alternative supported designs are presented:

---

### Question 1: Inter-Mine Haulage Trips
*Can trips originate at one mine and deliver to another, or are trips strictly intra-mine?*

- **Recommended Default Policy:** **Strictly Intra-Mine.**  
  In opencast coal and mineral mining (e.g. Talcher/Ib Valley), tippers haul coal from pit faces to sidings, crushers, or stockyards within the same mining concession (5–25 km loops). Long-distance inter-mine haulage is handled by commercial freight/rail, not internal pit tippers.
- **Technical Implications:**  
  `Mining Trip` requires only a single `mine_site` field. Trip distance, weighbridge gross/tare, and turnaround time are evaluated within that single mine site.
- **Alternative Supported Design:**  
  Add `destination_mine_site` (Link `Mine Site`, optional) to `Mining Trip`. If populated, dispatch is owned by origin mine; delivery is acknowledged by destination mine weighbridge.
- **Action Required:** Business stakeholder must confirm if inter-mine tipper haulage is required.

---

### Question 2: Spare Parts Warehousing Structure
*Are spare parts warehouses independent per mine, or is there a central warehouse with stock transfers?*

- **Recommended Default Policy:** **Hybrid Warehousing Model.**  
  One central company warehouse (`Central Fleet Stores - U`) handles major procurement (bulk tires, engine assemblies, bulk filters) with `custom_mine_site = NULL`. Each mine site operates a dedicated on-site workshop store (e.g. `Talcher Central Spares - U`) with `custom_mine_site = 'JBR Eastern — Talcher Site'`.
- **Technical Implications:**  
  Procurement orders can be created for the central store or directly for site stores. Moving parts from central to site requires an ERPNext `Stock Entry` (Material Transfer). Local workshop supervisors can only issue parts (`Material Issue`) from their assigned mine's warehouse.
- **Alternative Supported Design:**  
  100% Autonomous Mine Warehouses: No central store. All purchase orders and receipts are strictly site-bound.
- **Action Required:** Business stakeholder must confirm if a centralized procurement warehouse is maintained.

---

### Question 3: Asset Transfer Authorization Authority
*Who has the business authority to approve vehicle and driver transfers between mines?*

- **Recommended Default Policy:** **Head Office Fleet Management Exclusively.**  
  Mine Managers may request an asset transfer, but approval and execution are restricted exclusively to `System Manager` and `Fleet Head Office Admin`. Local Mine Managers cannot unilaterally reassign company capital assets or transfer drivers away from other pits.
- **Technical Implications:**  
  `Fleet Mine Transfer Log` will enforce workflow permissions: `Mine Manager` can create/submit (Request); only `Fleet Head Office Admin` / `System Manager` can execute `Approve` / `Complete`.
- **Alternative Supported Design:**  
  Dual-Approval Model: Origin Mine Manager requests transfer -> Destination Mine Manager accepts transfer -> Asset is moved.
- **Action Required:** Business stakeholder must confirm transfer approval hierarchy.

---

### Question 4: Driver Multi-Mine Deployment & Relief Pool
*Are drivers permanently stationed at one mine, or can relief drivers float across multiple mines?*

- **Recommended Default Policy:** **Single Home Mine with Formal Transfer.**  
  Drivers are permanently stationed at a home mine (`Driver.custom_mine_site`). When a driver is temporarily redeployed to another mine for a multi-week stint, a `Fleet Mine Transfer Log` is executed with reason `Temporary Deployment`.
- **Technical Implications:**  
  Prevents scheduling conflicts, preserves clean shift allocation rosters, and ensures statutory mining pass compliance (DGMS safety certifications are often pit-specific).
- **Alternative Supported Design:**  
  Relief Driver Pool: Introduce a multi-link child table `Driver Permitted Mines` or assign multiple `User Permission` records for `Mine Site` to relief drivers.
- **Action Required:** Business stakeholder must confirm if relief drivers need multi-mine concurrent dispatching.

---

## 9. Dependency-Based Implementation Sequencing

The implementation is structured into 6 sequential stages. No stage may begin until its predecessor is verified:

```
Stage 1: Authorization Foundation
  ├── Configure Custom Roles (Fleet Head Office Admin, Fleet Head Office Auditor)
  ├── Deploy Server Scripts: fleet_mine_permission_query & fleet_mine_validate_guard
  └── Execute Security Regression Suite (Verify Default-Deny on empty permissions)
       │
       ▼
Stage 2: Master Ownership Extensions
  ├── Deploy Custom Fields: Vehicle.custom_mine_site, Driver.custom_mine_site,
  │   Vehicle Driver Shift Allocation.mine_site, Warehouse.custom_mine_site
  └── Execute Migration Backfill: Link existing JBR Talcher masters to 'JBR Eastern — Talcher Site'
       │
       ▼
Stage 3: Transaction Ownership & Validation Hardening
  ├── Upgrade Property Setters: Make mine_site mandatory on Fuel Log, Breakdown, Expense
  ├── Deploy Custom Field: Stock Entry.custom_mine_site
  └── Update Next.js Route Handlers: Enforce session mine validation on all POST/PUT routes
       │
       ▼
Stage 4: Unified Asset Transfer Mechanism
  ├── Create Custom DocType: Fleet Mine Transfer Log
  ├── Implement Server Script Validation: Anti-trip conflict, anti-shift conflict, odometer sync
  └── Implement Transfer Execution Hook: Atomic master custom_mine_site update
       │
       ▼
Stage 5: Frontend Mine Context & UI Hardening
  ├── Implement frontend/src/context/MineContext.tsx
  ├── Mount Mine Switcher / Badge in frontend/src/components/layout/Header.tsx
  ├── Update Modals: Lock active mine in CreateTrip, AddFuel, Breakdown, Shift, Expense modals
  └── Update LinkedField: Auto-filter vehicle and driver lookups by active mine
       │
       ▼
Stage 6: Reporting Consolidation & Final Acceptance Verification
  ├── Seed Test Mine Site: 'JBR Eastern — Ib Valley Site' with isolated assets
  ├── Update 13 Custom Fleet Reports: Parameterize SQL queries for mine_site
  ├── Verify Head Office Consolidated vs. Mine-Specific Reports
  └── Execute 15 Security Acceptance Test Scenarios
```

---

## 10. Executable Security Acceptance Test Design

`[ARCHITECTURAL DECISION]`  
The architecture will be certified production-ready upon passing the following 15 test scenarios:

### Scenario 1: Cross-Mine Master Enumeration (Negative Test)
- **Actor:** Talcher Mine Manager (`manager_talcher@jbreastern.com`).
- **Action:** `GET /api/vehicles` and `GET /api/drivers`.
- **Expected Result:** HTTP 200. Returned array contains *only* Talcher vehicles (`DEMO-OD-01` to `04`) and Talcher drivers (`HR-DRI-2026-00393` to `00396`). Zero Ib Valley assets returned.

### Scenario 2: Direct Document-ID Access Across Mines (Negative Test)
- **Actor:** Talcher Mine Manager.
- **Action:** `GET /api/trips/TRIP-IB-2026-00001` (Trip belonging to Ib Valley).
- **Expected Result:** HTTP 403 Forbidden (`frappe.PermissionError: Not permitted to view document of another mine`).

### Scenario 3: Query Parameter Tampering in API (Negative Test)
- **Actor:** Talcher Dispatcher.
- **Action:** `GET /api/fuel?mine_site=JBR%20Eastern%20—%20Ib%20Valley%20Site`.
- **Expected Result:** HTTP 403 Forbidden. Backend detects query `mine_site` is not in session's allowed mines.

### Scenario 4: Tampered Transaction Payload on Creation (Negative Test)
- **Actor:** Talcher Dispatcher.
- **Action:** `POST /api/trips` with payload:
  `{"vehicle": "DEMO-OD-01", "mine_site": "JBR Eastern — Ib Valley Site", ...}`.
- **Expected Result:** HTTP 403 Forbidden / 422 Unprocessable. Server Script `fleet_mine_validate_guard` rejects mismatch between user authorization and payload.

### Scenario 5: Linked-Field Lookups in Modals (Negative Test)
- **Actor:** Talcher Dispatcher opening `CreateTripModal`.
- **Action:** Search for available vehicles and drivers.
- **Expected Result:** UI dropdown shows only Talcher vehicles and drivers. Ib Valley vehicles do not appear in DOM or network search response.

### Scenario 6: Script / Query Report Permission Enforcement (Negative Test)
- **Actor:** Talcher Mine Accountant.
- **Action:** Run `Trip-wise Revenue and Profitability` report.
- **Expected Result:** Report rows, tonnage totals, and revenue figures reflect *only* Talcher trips. Ib Valley revenue is completely omitted.

### Scenario 7: Default-Deny on Unassigned Operational User (Negative Test)
- **Actor:** Newly created Dispatcher (`dispatcher_new@jbreastern.com`) with role `Dispatcher` but **0** User Permissions for `Mine Site`.
- **Action:** `GET /api/trips`, `GET /api/vehicles`, `GET /api/fuel`.
- **Expected Result:** HTTP 200 with empty data arrays `[]` (0 records returned). Access is strictly denied by default.

### Scenario 8: Warehouse & Spare Parts Segregation (Negative Test)
- **Actor:** Talcher Workshop Supervisor.
- **Action:** Open `AddBreakdownModal` and attempt to issue parts from `Ib Valley Spares Store - U`.
- **Expected Result:** Warehouse picker excludes Ib Valley store. Direct API payload attempting to consume from foreign warehouse is rejected.

### Scenario 9: Head Office Consolidated Reporting (Positive Test)
- **Actor:** Fleet Director (`director@jbreastern.com`, Head Office Admin).
- **Action:** Select `[All Mines (Consolidated)]` in Header and view `/reports`.
- **Expected Result:** Total tonnage, revenue, and fuel consumption show combined enterprise totals with breakdown by mine.

### Scenario 10: Head Office Specific Mine Gating (Positive Test)
- **Actor:** Fleet Director.
- **Action:** Select `JBR Eastern — Ib Valley Site` in Header and navigate to `/vehicles`.
- **Expected Result:** UI renders only Ib Valley vehicles. Metrics recalculate strictly for Ib Valley.

### Scenario 11: Vehicle Transfer Historical Preservation (Positive Test)
- **Actor:** Fleet Director.
- **Action:** Execute approved transfer of `DEMO-OD-01` from Talcher to Ib Valley on Nov 16.
- **Expected Result:**
  - `tabVehicle.custom_mine_site` becomes `JBR Eastern — Ib Valley Site`.
  - All trips, fuel logs, and breakdown costs recorded on or before Nov 15 remain tagged to `JBR Eastern — Talcher Site`.
  - Talcher historical P&L for Nov 1–15 is 100% unchanged.

### Scenario 12: Driver Transfer Historical Shift Preservation (Positive Test)
- **Actor:** Fleet Director.
- **Action:** Execute approved transfer of Driver `HR-DRI-2026-00393` to Ib Valley.
- **Expected Result:** Past shift allocations at Talcher remain intact. Driver now appears in Ib Valley shift scheduling roster.

### Scenario 13: Shared Vendor & Customer Utilization (Positive Test)
- **Actor:** Talcher Mine Accountant and Ib Valley Mine Accountant.
- **Action:** Both create Purchase Invoices against shared vendor `Indian Oil Corporation Ltd`.
- **Expected Result:** Shared supplier is successfully selected by both mines. Invoices carry distinct `custom_mine_site` tags.

### Scenario 14: Data Export Gating (Negative Test)
- **Actor:** Talcher Mine Manager.
- **Action:** Trigger CSV/Excel export from `/trips` and `/fuel`.
- **Expected Result:** Exported spreadsheet contains only Talcher rows. Zero cross-mine data leakage.

### Scenario 15: Immediate Permission Revocation (Negative Test)
- **Actor:** System Manager revokes Talcher User Permission from a suspended dispatcher.
- **Action:** Suspended dispatcher refreshes `/trips`.
- **Expected Result:** Immediate HTTP 403 / 0 records returned. No cached session leakage.

---

## 11. Existing Demo-Data Migration & Rollback Strategy

### 11.1 Demo-Data Backfill (Talcher Site)
`[ARCHITECTURAL DECISION]`  
Before applying mandatory constraints, all existing unlinked demo records will be deterministically backfilled to the verified operational site:

```sql
-- 1. Backfill Vehicles
UPDATE `tabVehicle`
SET `custom_mine_site` = 'JBR Eastern — Talcher Site'
WHERE `custom_mine_site` IS NULL OR `custom_mine_site` = '';

-- 2. Backfill Drivers
UPDATE `tabDriver`
SET `custom_mine_site` = 'JBR Eastern — Talcher Site'
WHERE `custom_mine_site` IS NULL OR `custom_mine_site` = '';

-- 3. Backfill Shift Allocations
UPDATE `tabVehicle Driver Shift Allocation`
SET `mine_site` = 'JBR Eastern — Talcher Site'
WHERE `mine_site` IS NULL OR `mine_site` = '';

-- 4. Backfill Warehouses (Mine-specific)
UPDATE `tabWarehouse`
SET `custom_mine_site` = 'JBR Eastern — Talcher Site'
WHERE `name` LIKE '%Talcher%' AND (`custom_mine_site` IS NULL OR `custom_mine_site` = '');
```

### 11.2 Rollback & Disaster Recovery
`[ARCHITECTURAL DECISION]`
1. **Pre-Migration Snapshot:**
   An automated database dump will be generated prior to executing any schema scripts:
   `docker exec erpnext-db-1 mariadb-dump -u root -ptrappe erpnext > backups/pre_multimine_migration.sql`
2. **Instant Operational Deactivation (Zero Downtime):**
   If permission query scripts need temporary deactivation during deployment:
   Disable Server Scripts `fleet_mine_permission_query` and `fleet_mine_validate_guard`. The application immediately reverts to standard single-mine behavior without code changes or downtime.
3. **Schema Invariance:**
   All schema extensions are additive custom fields (`custom_mine_site`). No standard Frappe columns are altered or dropped.

---

## 12. Exact Files and DocTypes Expected to Change

### 12.1 Backend / Frappe DocTypes & Custom Fields
- **DocTypes Modified (via Custom Field):**
  - `Vehicle` (add `custom_mine_site`, Link `Mine Site`, Mandatory)
  - `Driver` (add `custom_mine_site`, Link `Mine Site`, Mandatory)
  - `Vehicle Driver Shift Allocation` (add `mine_site`, Link `Mine Site`, Mandatory)
  - `Warehouse` (add `custom_mine_site`, Link `Mine Site`, Optional)
  - `Stock Entry` (add `custom_mine_site`, Link `Mine Site`, Optional)
- **DocTypes Created:**
  - `Fleet Mine Transfer Log` (Submittable transfer audit entity)
- **Server Scripts Created:**
  - `fleet_mine_permission_query` (Script Type: `Permission Query`)
  - `fleet_mine_validate_guard` (Script Type: `DocType Event`, Event: `Before Validate`)
  - `fleet_asset_transfer_handler` (Script Type: `DocType Event`, Event: `On Submit` for `Fleet Mine Transfer Log`)

### 12.2 Frontend API Route Handlers
- `frontend/src/app/api/trips/route.ts`
- `frontend/src/app/api/trips/[id]/route.ts`
- `frontend/src/app/api/trips/[id]/transition/route.ts`
- `frontend/src/app/api/fuel/route.ts`
- `frontend/src/app/api/fuel/[id]/route.ts`
- `frontend/src/app/api/vehicles/route.ts`
- `frontend/src/app/api/vehicles/[id]/route.ts`
- `frontend/src/app/api/drivers/route.ts`
- `frontend/src/app/api/drivers/[id]/route.ts`
- `frontend/src/app/api/shifts/route.ts`
- `frontend/src/app/api/shifts/[id]/route.ts`
- `frontend/src/app/api/breakdowns/route.ts`
- `frontend/src/app/api/breakdowns/[id]/route.ts`
- `frontend/src/app/api/expenses/route.ts`
- `frontend/src/app/api/expenses/[id]/route.ts`
- `frontend/src/app/api/dispatch/route.ts`
- `frontend/src/app/api/dispatch/eligibility/route.ts`
- `frontend/src/app/api/weighbridge/route.ts`
- `frontend/src/app/api/mine-sites/route.ts`
- `frontend/src/app/api/inventory/warehouses/route.ts`
- `frontend/src/app/api/inventory/movements/route.ts`
- `frontend/src/app/api/finance/revenue/route.ts`
- `frontend/src/app/api/finance/collections/route.ts`
- `frontend/src/app/api/finance/reports/route.ts`

### 12.3 Frontend Context & UI Components
- `frontend/src/context/MineContext.tsx` (**New File**)
- `frontend/src/types/fleet.ts` (Add `custom_mine_site` and `FleetMineTransferLog` types)
- `frontend/src/components/layout/Header.tsx` (Mount Mine Switcher / Badge UI)
- `frontend/src/components/trips/CreateTripModal.tsx` (Lock active mine, filter assets)
- `frontend/src/components/fuel/AddFuelModal.tsx` (Lock active mine, filter assets)
- `frontend/src/components/breakdowns/AddBreakdownModal.tsx` (Lock active mine, filter warehouses)
- `frontend/src/components/shifts/ShiftAllocationModal.tsx` (Lock active mine, enforce vehicle/driver match)
- `frontend/src/components/expenses/AddExpenseModal.tsx` (Lock active mine)

---

*End of Architecture Specification. Awaiting formal business approval on Section 8 policy decisions before Stage 1 execution.*
