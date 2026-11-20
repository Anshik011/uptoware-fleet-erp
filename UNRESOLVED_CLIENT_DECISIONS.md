# Uptoware Fleet ERP — Unresolved Client Decisions Register

**Document Version:** 1.1  
**Date:** November 18, 2026  
**Audience:** Client Stakeholders, Project Owner, Fleet Operations & Finance Directors  
**Status:** Awaiting Formal Business Policy Ratification Before Production Deployment  

---

## Executive Overview

The Uptoware Fleet Management ERP is technically implemented, verified, and operational. To prevent arbitrary assumptions from being mistaken for approved business rules, the engineering team has cataloged all unconfirmed operational policies below.

Each item describes:
1. **What the client explicitly requested.**
2. **What is currently implemented.**
3. **What decision is missing.**
4. **The operational and financial consequences if the decision remains unresolved.**

---

## 1. Itemized Unresolved Decisions

### Decision 1: Attendance & Wage Multipliers
* **What Client Explicitly Requested:** Daily attendance logging of drivers and workshop staff at mine sites, monthly attendance summaries, and tracking of monthly salary expenditure.
* **What is Currently Implemented:**
  - `Present`: $1.0 \times \text{Daily Salary Rate}$
  - `Half Day`: $0.5 \times \text{Daily Salary Rate}$
  - `Absent`: $0.0 \times \text{Daily Salary Rate}$
  - `On Leave`: $0.0 \times \text{Daily Salary Rate}$
  - Labeled in Next.js UI as **"Indicative Daily Wage (Provisional)"** with disclaimer footnotes.
* **What Decision is Missing:**
  1. Does the client pay half-day attendance at exactly 50%, or is there a minimum shift guarantee (e.g., 4 hours / fixed minimum allowance)?
  2. Are any leave categories paid (e.g., Casual Leave, Medical Leave) or are all site drivers treated strictly as daily-wage contractors?
  3. Are there overtime allowances or night-shift differentials for drivers operating between 10:00 PM and 06:00 AM?
* **Consequences if Unresolved:** Monthly payroll exports from Fleet ERP may diverge from actual contractor payments made by site HR/Accounts, creating payroll reconciliation discrepancies.

---

### Decision 2: High-Speed Diesel (HSD) Price Escalation Formula
* **What Client Explicitly Requested:** High-Speed Diesel price tracking to support contractual price adjustment clauses.
* **What is Currently Implemented:**
  - Script Report `HSD Fuel Price Escalation Report` computes:
    $$\text{Escalation Delta} = \text{Actual Dispensed Rate} - \text{Contract Base Rate}$$
    $$\text{Financial Impact} = \text{Escalation Delta} \times \text{Quantity Dispensed}$$
  - Both positive escalation and negative de-escalation are preserved.
  - `contract_base_rate` is a user-configurable report filter parameter with a fallback default of ₹85.00/L.
* **What Decision is Missing:**
  1. What is the official benchmark diesel rate agreed per mining client contract (e.g., ₹85.00/L, ₹88.50/L, or ₹92.00/L)?
  2. Does the contract specify 100% price pass-through, or a cost-sharing ratio (e.g., 80% client / 20% contractor)?
  3. Does the clause include de-escalation (negative billing deductions when fuel prices drop below the benchmark)?
  4. Is escalation calculated per trip based on fuel consumption standards (e.g., Litres/T-km) or on bulk dispensing logs?
* **Consequences if Unresolved:** Billing fuel price escalation to mining clients using an unratified formula could result in invoice rejection by the client's internal audit.

---

### Decision 3: Vehicle Earning Report Format & Accounting Treatment
* **What Client Explicitly Requested:** The client requested a vehicle earning report, but explicitly stated: *"Vehicle Earning Report format will be provided."*
* **What is Currently Implemented:**
  - Script Report `Vehicle Earning Summary Report`:
    $$\text{Net Profit} = \text{Gross Haulage Revenue} - (\text{Fuel Cost} + \text{Workshop Repair Costs})$$
    $$\text{Profit per Ton} = \frac{\text{Net Profit}}{\text{Delivered Tonnage}}$$
  - Labeled in Next.js UI as **"Provisional Earning Summary (Draft Format Pending Client Template)"**.
* **What Decision is Missing:**
  1. Formal client template / spreadsheet format has not been delivered.
  2. Does the client require driver daily wages, vehicle insurance amortization, road tax, and EMI/depreciation to be factored into the per-vehicle net margin?
  3. Does the client calculate vehicle revenue from indicative weighbridge haulage amounts or exclusively from final approved Sales Invoices?
* **Consequences if Unresolved:** Executives viewing asset profitability may misinterpret operational gross margin as net accounting profit if overheads and capital costs are omitted.

---

### Decision 4: Standard Vehicle Axle Ratings & Payload Tolerances
* **What Client Explicitly Requested:** Fleet vehicles must belong to one of 7 categories: `Hyva`, `Loader`, `Pickup`, `Bolero`, `Tanker`, `Innova`, `Other`.
* **What is Currently Implemented:**
  - All 7 categories configured in `Fleet Vehicle Type`.
  - Default capacities seeded as editable defaults (Hyva 35T, Loader 25T, Pickup 2.5T, Bolero 1.5T, Tanker 20T, Innova 1.0T, Other 0T).
  - Vehicles in database have individual capacities (e.g. DEMO-OD-03 = 31T, DEMO-OD-04 = 40T).
* **What Decision is Missing:**
  1. What are the statutory Gross Vehicle Weight (GVW) and legal payload limits enforced by mining authorities for each tipper model (e.g. 10-wheeler 28T vs 12-wheeler 35T vs 14-wheeler 40T)?
  2. Should the system block weighbridge tickets that exceed the vehicle's registered payload capacity, or issue an overload warning flag?
* **Consequences if Unresolved:** Inadvertent overloading could result in statutory fines from mining authorities or excessive vehicle wear.

---

### Decision 5: Inter-Mine Asset Transfer Governance & Statutory Compliances
* **What Client Explicitly Requested:** Support multi-mine operations with vehicle reassignments.
* **What is Currently Implemented:**
  - DocType `Fleet Mine Transfer Log` allows transferring vehicles between sites.
  - Submissions restricted to `Administrator` and `Fleet Head Office Admin`.
  - Historical attribution to original mine is permanently preserved.
* **What Decision is Missing:**
  1. What documentation is mandatory before a vehicle is transferred across state or district mining borders (e.g., Mining Transit Pass, e-Way Bill, Road Tax clearance)?
  2. Does an asset transfer require mutual sign-off (Dispatching Mine Supervisor + Receiving Mine Supervisor)?
* **Consequences if Unresolved:** Vehicles moved between mining leaseholds without statutory transit permits risk impoundment by district mining officials.

---

### Decision 6: Leaf Warehouse Mine Site Attribution
* **What Client Explicitly Requested:** Spare parts management and inventory tracking.
* **What is Currently Implemented:**
  - Server Script `Stock Entry - Mine Authorization Guard` validates warehouse mine attribution.
  - Active leaf warehouses have `custom_mine_site = NULL` (treated as Central Shared Stores).
* **What Decision is Missing:**
  1. Are spare parts stores organized as dedicated site-level warehouses (e.g. "Talcher Stores", "Ib Valley Stores"), or as a centralized regional depot supplying satellite pits?
* **Consequences if Unresolved:** Parts issued from a central store without site tagging cannot be accurately segregated into site-level P&L statements.

---

### Decision 7: Breakdown Approval & Procurement Authority Delegation (DOA)
* **What Client Explicitly Requested:** 10-step breakdown lifecycle (Driver report $\rightarrow$ Supervisor inspects $\rightarrow$ Check stock $\rightarrow$ Issue or requisition $\rightarrow$ Higher authority authorization $\rightarrow$ Purchase $\rightarrow$ Delivery $\rightarrow$ Repair $\rightarrow$ Handover).
* **What is Currently Implemented:**
  - Drivers report only.
  - Workshop Supervisors manage repair transitions and parts issuance.
  - Fleet Managers approve and close breakdowns.
  - Procurement is segregated: `Purchase Order` and `Material Request` operate under procurement roles (`Purchase Manager`, `System Manager`).
* **What Decision is Missing:**
  1. What are the financial threshold limits for repair approvals (e.g. repairs up to ₹10,000 approved by Workshop Supervisor; repairs > ₹10,000 requiring Fleet Manager or General Manager sign-off)?
  2. Exactly which corporate job title represents the "Higher Authority" authorized to sign off on emergency parts procurement?
* **Consequences if Unresolved:** High-value workshop purchase requests may either stall awaiting unclear approvals or be authorized by unauthorized site personnel.

---

## 2. Summary of Required Stakeholder Actions

| Decision ID | Area | Required Input From | Recommended Action |
| :---: | :--- | :--- | :--- |
| **D-1** | Attendance / Payroll | HR / Accounts Lead | Confirm half-day multiplier (0.5x) and leave pay rules. |
| **D-2** | Fuel Escalation | Commercial / Contracts | Provide benchmark diesel rates and escalation formula per contract. |
| **D-3** | Vehicle Earning | Finance / Controller | Provide official report layout and indirect cost attribution policy. |
| **D-4** | Vehicle Capacities | Fleet Technical Director | Confirm model-wise statutory payload limits and overload policy. |
| **D-5** | Asset Transfers | Operations Director | Ratify inter-mine transit checklist and multi-supervisor approvals. |
| **D-6** | Warehouse Mapping | Stores / Inventory Manager | Assign site ownership to active leaf warehouses. |
| **D-7** | Breakdown Authority | Operations / Managing Director | Define Delegation of Authority (DOA) financial thresholds. |
