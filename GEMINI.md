# UPTOWARE FLEET ERP — PROJECT OPERATIONAL MEMORY & SYSTEM RULES

## 1. MANDATORY EC2 PRODUCTION DEPLOYMENT PROTOCOL
- **Production Host:** `13.239.121.225` (AWS EC2, user: `ubuntu`)
- **SSH Key Location:** `C:\Users\Admin\Downloads\fleet-key.pem`
- **Remote Directory:** `/home/ubuntu/uptoware-fleet-erp`
- **Frontend Service:** `uptoware-frontend.service` (Port 3001, public domain: `https://fleet.uptoware.com`)
- **DEPLOYMENT LAW:** Never tell the user an issue is fixed or complete until it is pushed to GitHub `origin/main`, pulled onto the EC2 host via SSH, compiled with `npm run build`, and restarted with `sudo systemctl restart uptoware-frontend.service`.
- **Command:**
  ```bash
  ssh -i C:\Users\Admin\Downloads\fleet-key.pem -o StrictHostKeyChecking=no ubuntu@13.239.121.225 "cd /home/ubuntu/uptoware-fleet-erp && git pull origin main && cd frontend && npm run build && sudo systemctl restart uptoware-frontend.service"
  ```

## 2. TRIP ENTRY & RECONCILIATION DOMAIN RULES
- **Reconcile Hub Cards:** Never show premature `Avg` or `Total` on unreconciled/pending trips. Display strictly: Date (`DD.MM.YYYY`), Shift, Vehicle Number, Lead/Route, Trip Count, and `[Reconcile & Enter Avg ->]`.
- **Reconcile Form Fields:** Assigned Driver and Challan fields are permanently deleted from reconcile view. Rate per Ton is strictly read-only from Lead Master. Quantity (`Trips × Avg`) and Amount (`Qty × Rate`) compute dynamically.
- **Workflow Integrity:** Never attempt direct `trip_status` editing via PUT; always apply transitions through `frappe.model.workflow.apply_workflow` (`Draft` -> `Dispatched` -> `Weighbridge Confirmed` -> `Approved`).
- **Driver Dropdown:** Always include all active employees with driving designations (`Driver`, `Operator`, `P/L Opt`) in the driver dropdown, auto-activating any suspended driver profiles with active employment.

## 3. ATTENDANCE & SALARY FORMAT RULES
- **Driver & Operator Matrix Footer:** Must always display centered shift-wise totals (`Shift A: X | Shift B: Y | Shift C: Z`) for present drivers, exactly mirroring Other Staff.
- **Attendance Summary (1-31 Matrix):** Must have full borders, large clear typography, with Absent and Total Salary columns deleted.
- **Attendance Home:** Current month present staff only, with columns `Sl No, Emp Name, Designation, Total Present, Rate Per Day, Total Amount, Bank Details`.

## 4. VEHICLE INCOME & FUEL AUDIT RULES
- Zero hardcoded numbers or sample arrays.
- Fuel dispensation entries entered in `HsdAverageMenu` must persist directly to Frappe's `Fuel Log` doctype so they dynamically reflect under `HSD Diesel Consumption Log` in the Vehicle Income statement.
