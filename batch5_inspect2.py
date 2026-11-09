import frappe

def run():
    print("--- STANDARD ACCOUNTING DOCTYPES ---")
    for dt in ["Journal Entry", "Purchase Invoice", "Payment Entry", "Cost Center", "Mode of Payment"]:
        exists = frappe.db.exists("DocType", dt)
        print(f" - {dt}: {'EXISTS' if exists else 'NOT FOUND'}")

    print("\n--- CHECK EXISTING FLEET MANAGEMENT DOCTYPES ---")
    custom_dts = frappe.get_all("DocType", filters={"module": "Fleet Management"}, pluck="name")
    print("Fleet Management DocTypes:", custom_dts)

    print("\n--- CHECK VEHICLE FIELDS ---")
    v_fields = [df.fieldname for df in frappe.get_meta("Vehicle").fields]
    print("Vehicle custom fields related to cost center or account:", [f for f in v_fields if "cost" in f or "account" in f])

    print("\n--- CHECK MINING TRIP FIELDS ---")
    mt_fields = [df.fieldname for df in frappe.get_meta("Mining Trip").fields]
    print("Mining Trip fields count:", len(mt_fields))

    print("\n--- CHECK MINE SITE FIELDS ---")
    ms_fields = [df.fieldname for df in frappe.get_meta("Mine Site").fields]
    print("Mine Site fields count:", len(ms_fields))

run()
