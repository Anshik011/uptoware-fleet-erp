import frappe

def run():
    print("=== CONFIGURING CLIENT SCRIPT FOR VEHICLE BREAKDOWN ===")

    cs_code = """
frappe.ui.form.on('Vehicle Breakdown', {
    setup: function(frm) {
        // Limit query filters
        frm.set_query('vehicle', function() {
            return {
                filters: {
                    'is_test_record': frm.doc.is_test_record || 0
                }
            };
        });

        frm.set_query('driver', function() {
            return {
                filters: {
                    'status': 'Active'
                }
            };
        });

        frm.set_query('mine_site', function() {
            return {
                filters: {
                    'status': 'Operational'
                }
            };
        });
    },

    vehicle: function(frm) {
        if (frm.doc.vehicle) {
            frappe.db.get_value('Vehicle', frm.doc.vehicle, ['last_odometer', 'assigned_driver', 'is_test_record'])
                .then(r => {
                    if (r && r.message) {
                        if (!frm.doc.odometer_reading && r.message.last_odometer) {
                            frm.set_value('odometer_reading', r.message.last_odometer);
                        }
                        if (!frm.doc.driver && r.message.assigned_driver) {
                            frm.set_value('driver', r.message.assigned_driver);
                        }
                        if (r.message.is_test_record) {
                            frm.set_value('is_test_record', 1);
                        }
                    }
                });
        }
    },

    breakdown_datetime: function(frm) {
        calculate_downtime(frm);
    },

    repair_completion_datetime: function(frm) {
        calculate_downtime(frm);
    },

    labour_cost: function(frm) {
        calculate_total_cost(frm);
    }
});

frappe.ui.form.on('Vehicle Breakdown Part', {
    item_code: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.item_code) {
            frappe.db.get_value('Item', row.item_code, ['item_name', 'stock_uom', 'valuation_rate'])
                .then(r => {
                    if (r && r.message) {
                        frappe.model.set_value(cdt, cdn, 'item_name', r.message.item_name);
                        frappe.model.set_value(cdt, cdn, 'stock_uom', r.message.stock_uom);
                        if (!row.rate && r.message.valuation_rate) {
                            frappe.model.set_value(cdt, cdn, 'rate', r.message.valuation_rate);
                        }
                    }
                });
        }
    },

    amount: function(frm) {
        calculate_total_cost(frm);
    }
});

function calculate_downtime(frm) {
    if (frm.doc.breakdown_datetime && frm.doc.repair_completion_datetime) {
        let b = new Date(frm.doc.breakdown_datetime);
        let c = new Date(frm.doc.repair_completion_datetime);
        if (c >= b) {
            let diffHours = (c - b) / (1000 * 60 * 60);
            frm.set_value('downtime_hours', Math.round(diffHours * 100) / 100);
        }
    }
}

function calculate_total_cost(frm) {
    let parts_total = 0;
    (frm.doc.parts_table || []).forEach(row => {
        if (row.status === 'Issued' || row.stock_entry) {
            parts_total += flt(row.amount);
        }
    });
    frm.set_value('parts_cost', Math.round(parts_total * 100) / 100);
    let total = parts_total + flt(frm.doc.labour_cost);
    frm.set_value('total_repair_cost', Math.round(total * 100) / 100);
}
"""

    cs_name = "Vehicle Breakdown - Live UI Calculations"
    if frappe.db.exists("Client Script", cs_name):
        cs = frappe.get_doc("Client Script", cs_name)
        cs.script = cs_code
        cs.enabled = 1
        cs.save(ignore_permissions=True)
        print(f"Updated Client Script: {cs_name}")
    else:
        cs = frappe.get_doc({
            "doctype": "Client Script",
            "name": cs_name,
            "dt": "Vehicle Breakdown",
            "script": cs_code,
            "enabled": 1
        })
        cs.insert(ignore_permissions=True)
        print(f"Created Client Script: {cs_name}")

    frappe.clear_cache()
    frappe.db.commit()
    print("SUCCESS: Client Script created.")

run()
