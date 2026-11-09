import frappe

def run():
    print("=== 1. UPDATING FUEL LOG SERVER SCRIPTS ===")

    # Server Script 1: Before Save (Validations, Benchmarks & Efficiency)
    fuel_log_before_save_code = """# 1. Vehicle presence validation
if not doc.vehicle:
    frappe.throw("Vehicle is required for Fuel Log.")

# 2. Fuel Quantity Validations
qty = float(doc.quantity_litres or 0.0)
if qty <= 0:
    frappe.throw("Fuel Quantity must be greater than zero. Invalid or zero quantity cannot be logged.")

# 3. Rate & Total Fuel Cost Validation
rate = float(doc.rate_per_litre or 0.0)
if rate < 0:
    frappe.throw("Rate per Litre cannot be negative.")

# Ensure total fuel cost matches quantity * rate
doc.total_fuel_cost = round(qty * rate, 2)

# 4. Odometer Reading Validations
if doc.odometer_reading_km is None or doc.odometer_reading_km == "":
    frappe.throw("Odometer Reading (KM) is required.")

odo = int(doc.odometer_reading_km)
if odo < 0:
    frappe.throw("Fuel odometer reading cannot be negative.")

# 5. Test Record Tagging & Propagation Isolation
if not doc.is_test_record:
    is_v_test = frappe.db.get_value("Vehicle", doc.vehicle, "is_test_record") if doc.vehicle else 0
    is_d_test = frappe.db.get_value("Driver", doc.driver, "is_test_record") if doc.driver else 0
    is_s_test = frappe.db.get_value("Mine Site", doc.mine_site, "is_test_record") if doc.mine_site else 0
    if is_v_test or is_d_test or is_s_test:
        doc.is_test_record = 1

# 6. Retrieve Vehicle Confirmed Odometer Reference
vehicle_confirmed_odo = int(frappe.db.get_value("Vehicle", doc.vehicle, "last_odometer") or 0)

# 7. Find previous valid Fuel Log strictly for the SAME vehicle
# Test record isolation: test logs compare only with test logs; production logs only with production logs
prev_filters = {
    "vehicle": doc.vehicle,
    "approval_status": ["!=", "Rejected"],
    "is_test_record": doc.is_test_record or 0
}
if doc.name:
    prev_filters["name"] = ["!=", doc.name]

prev_logs = frappe.get_all(
    "Fuel Log",
    filters=prev_filters,
    fields=["name", "odometer_reading_km", "fuel_date", "creation"],
    order_by="odometer_reading_km desc, creation desc",
    limit=1
)

if prev_logs:
    latest_prev_fuel_odo = int(prev_logs[0].odometer_reading_km or 0)
    
    # Reading must not be lower than the latest valid recorded odometer for that vehicle
    benchmark_odo = max(latest_prev_fuel_odo, vehicle_confirmed_odo)
    if odo < benchmark_odo:
        frappe.throw(
            f"Fuel odometer reading ({odo} KM) cannot be lower than the latest valid recorded odometer ({benchmark_odo} KM) for Vehicle '{doc.vehicle}'."
        )
    
    # Store previous fuel odometer
    doc.previous_odometer_km = latest_prev_fuel_odo
    doc.distance_travelled_km = odo - latest_prev_fuel_odo
    
    # Fuel Efficiency Calculation:
    # KM per Litre = Distance Travelled / Fuel Quantity
    # "Do not calculate misleading efficiency for duplicate or non-increasing odometer readings."
    if doc.distance_travelled_km > 0 and qty > 0:
        doc.km_per_litre = round(doc.distance_travelled_km / qty, 2)
    else:
        # Duplicate or zero distance travelled
        doc.km_per_litre = 0.0

else:
    # First fuel entry for this vehicle: establish benchmark
    # Validate against vehicle confirmed odometer if one exists
    if vehicle_confirmed_odo > 0 and odo < vehicle_confirmed_odo:
        frappe.throw(
            f"Fuel odometer reading ({odo} KM) cannot be lower than the vehicle's confirmed odometer ({vehicle_confirmed_odo} KM) for Vehicle '{doc.vehicle}'."
        )
    
    # First entry produces clean benchmark without misleading efficiency
    doc.previous_odometer_km = None
    doc.distance_travelled_km = 0
    doc.km_per_litre = 0.0

# 8. Approval Audit Stamping
if doc.approval_status == "Approved":
    if not doc.approved_by:
        doc.approved_by = frappe.session.user
    if not doc.approved_on:
        doc.approved_on = frappe.utils.now_datetime()
"""

    ss_fl_before_save = {
        "doctype": "Server Script",
        "name": "Fuel Log - Validations & Efficiency",
        "script_type": "DocType Event",
        "reference_doctype": "Fuel Log",
        "doctype_event": "Before Save",
        "script": fuel_log_before_save_code,
        "disabled": 0
    }

    if frappe.db.exists("Server Script", ss_fl_before_save["name"]):
        ss = frappe.get_doc("Server Script", ss_fl_before_save["name"])
        ss.update(ss_fl_before_save)
        ss.save(ignore_permissions=True)
        print("Updated Server Script: Fuel Log - Validations & Efficiency")
    else:
        ss = frappe.get_doc(ss_fl_before_save)
        ss.insert(ignore_permissions=True)
        print("Created Server Script: Fuel Log - Validations & Efficiency")

    # Server Script 2: After Save (Vehicle Odometer Sync strictly for Approved logs)
    fuel_log_after_save_code = """# Update Vehicle last_odometer ONLY from an Approved Fuel Log
if doc.approval_status == "Approved":
    fuel_odo = int(doc.odometer_reading_km or 0)
    curr_veh_odo = int(frappe.db.get_value("Vehicle", doc.vehicle, "last_odometer") or 0)
    
    # Only update if the approved fuel log odometer is strictly greater than the vehicle's confirmed odometer
    if fuel_odo > curr_veh_odo:
        frappe.db.set_value("Vehicle", doc.vehicle, "last_odometer", fuel_odo)
"""

    ss_fl_after_save = {
        "doctype": "Server Script",
        "name": "Fuel Log - Vehicle Odometer Sync & Approval",
        "script_type": "DocType Event",
        "reference_doctype": "Fuel Log",
        "doctype_event": "After Save",
        "script": fuel_log_after_save_code,
        "disabled": 0
    }

    if frappe.db.exists("Server Script", ss_fl_after_save["name"]):
        ss = frappe.get_doc("Server Script", ss_fl_after_save["name"])
        ss.update(ss_fl_after_save)
        ss.save(ignore_permissions=True)
        print("Updated Server Script: Fuel Log - Vehicle Odometer Sync & Approval")
    else:
        ss = frappe.get_doc(ss_fl_after_save)
        ss.insert(ignore_permissions=True)
        print("Created Server Script: Fuel Log - Vehicle Odometer Sync & Approval")

    # 2. Client Script for Live UI calculation of efficiency and previous odometer
    client_script_code = """frappe.ui.form.on('Fuel Log', {
    vehicle: function(frm) {
        if (frm.doc.vehicle) {
            frappe.db.get_list('Fuel Log', {
                filters: {
                    vehicle: frm.doc.vehicle,
                    approval_status: ['!=', 'Rejected'],
                    name: ['!=', frm.doc.name || '']
                },
                fields: ['odometer_reading_km'],
                order_by: 'odometer_reading_km desc, creation desc',
                limit: 1
            }).then(records => {
                if (records && records.length > 0) {
                    frm.set_value('previous_odometer_km', records[0].odometer_reading_km);
                } else {
                    frm.set_value('previous_odometer_km', null);
                }
                calculate_efficiency(frm);
            });
        }
    },
    odometer_reading_km: function(frm) {
        calculate_efficiency(frm);
    },
    quantity_litres: function(frm) {
        calculate_efficiency(frm);
    }
});

function calculate_efficiency(frm) {
    const odo = flt(frm.doc.odometer_reading_km);
    const prev = flt(frm.doc.previous_odometer_km);
    const qty = flt(frm.doc.quantity_litres);

    if (frm.doc.previous_odometer_km !== null && frm.doc.previous_odometer_km !== undefined && odo > prev) {
        const dist = odo - prev;
        frm.set_value('distance_travelled_km', dist);
        if (qty > 0) {
            frm.set_value('km_per_litre', flt((dist / qty).toFixed(2)));
        } else {
            frm.set_value('km_per_litre', 0);
        }
    } else {
        frm.set_value('distance_travelled_km', 0);
        frm.set_value('km_per_litre', 0);
    }
}
"""

    cs_dict = {
        "doctype": "Client Script",
        "name": "Fuel Log - Live Efficiency & Benchmarks",
        "dt": "Fuel Log",
        "script_type": "DocType Event",
        "script": client_script_code,
        "enabled": 1
    }

    if frappe.db.exists("Client Script", cs_dict["name"]):
        cs = frappe.get_doc("Client Script", cs_dict["name"])
        cs.update(cs_dict)
        cs.save(ignore_permissions=True)
        print("Updated Client Script: Fuel Log - Live Efficiency & Benchmarks")
    else:
        cs = frappe.get_doc(cs_dict)
        cs.insert(ignore_permissions=True)
        print("Created Client Script: Fuel Log - Live Efficiency & Benchmarks")

    frappe.clear_cache(doctype="Fuel Log")
    frappe.clear_cache()
    frappe.db.commit()
    print("SUCCESS: Fuel Log Server Scripts and Client Script applied successfully.")

run()
