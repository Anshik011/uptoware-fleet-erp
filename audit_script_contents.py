import frappe

def audit_details():
    frappe.init("frontend")
    frappe.connect()

    print("=== INSPECTING SERVER SCRIPTS CONTENT ===")
    scripts_to_check = [
        "Mining Trip - Business Validations & Audit",
        "Vehicle Insurance Policy - Vehicle Sync",
        "Fleet Settings - Validations",
        "Fleet Management - Daily Expiry Monitoring Scheduler",
        "Sales Invoice - Notification Events",
        "Payment Entry - Notification Events",
        "Stock Entry - Notification Events",
        "Purchase Order - Notification Events",
        "Purchase Receipt - Notification Events",
        "Purchase Invoice - Notification Events",
        "Material Request - Notification Events",
        "Vehicle - Notification Events",
        "Fuel Log - Notification Events",
        "Vehicle Breakdown - Notification Events",
        "Operational Expense - Notification Events"
    ]

    for s_name in scripts_to_check:
        if frappe.db.exists("Server Script", s_name):
            doc = frappe.get_doc("Server Script", s_name)
            print(f"\n--- Script: {s_name} (Length: {len(doc.script)} chars) ---")
            lines = doc.script.split("\n")
            # print first 5 and last 5 lines
            for l in lines[:10]:
                print("  ", l)
            if len(lines) > 10:
                print("   ...")
                for l in lines[-5:]:
                    print("  ", l)
        else:
            print(f"\n--- Script: {s_name} NOT FOUND ---")

if __name__ == "__main__":
    audit_details()

