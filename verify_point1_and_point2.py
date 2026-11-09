import frappe

def verify():
    frappe.init("frontend")
    frappe.connect()

    print("=" * 70)
    print("POINT 1: VEHICLE STATUS INTEGRITY VERIFICATION")
    print("=" * 70)
    # Check field meta
    meta = frappe.get_meta("Vehicle")
    status_df = meta.get_field("vehicle_status")
    print(f"Vehicle status fieldname: {status_df.fieldname}")
    print(f"Vehicle status fieldtype: {status_df.fieldtype}")
    print(f"Vehicle status options:\n{repr(status_df.options)}")
    permitted_options = [opt.strip() for opt in status_df.options.split("\n") if opt.strip()]
    print(f"Permitted options list: {permitted_options}")

    # Check distinct values in database
    vals = frappe.db.sql("SELECT DISTINCT vehicle_status FROM `tabVehicle`")
    print(f"Current distinct vehicle_status in tabVehicle: {[v[0] for v in vals]}")

    # Check if 'Available' exists in any vehicle record
    avail_count = frappe.db.count("Vehicle", {"vehicle_status": "Available"})
    print(f"Vehicles with vehicle_status = 'Available': {avail_count}")

    # Search for 'Available' in Server Scripts
    ss_list = frappe.db.sql("SELECT name, reference_doctype, script FROM `tabServer Script`", as_dict=True)
    ss_with_avail = []
    for s in ss_list:
        if "Available" in s["script"]:
            ss_with_avail.append((s["name"], s["reference_doctype"]))
    print(f"Server Scripts mentioning 'Available': {ss_with_avail}")

    # Check delivery and cancellation logic
    sync_script = frappe.db.get_value("Server Script", "Mining Trip - Odometer & Vehicle Status Sync", "script")
    print("\nMining Trip - Odometer & Vehicle Status Sync script content:")
    print("-" * 50)
    print(sync_script)
    print("-" * 50)

    print("\n" + "=" * 70)
    print("POINT 2: INSURANCE WARNING CONFIGURATION VERIFICATION")
    print("=" * 70)
    fs = frappe.get_doc("Fleet Settings")
    print("Fleet Settings record values:")
    fs_dict = fs.as_dict()
    for k in sorted(fs_dict.keys()):
        if any(term in k.lower() for term in ["warn", "day", "remind", "expir", "milestone", "interval", "insur"]):
            print(f"  {k}: {repr(fs_dict[k])}")

    # Inspect Batch 8 and Batch 11 schedulers
    scheds = frappe.db.sql("""
        SELECT name, script_type, reference_doctype, doctype_event, script
        FROM `tabServer Script`
        WHERE name LIKE '%Expiry%' OR name LIKE '%Scheduler%' OR script LIKE '%warning_window%' OR script LIKE '%reminder_intervals%'
    """, as_dict=True)

    for sc in scheds:
        print(f"\nScheduler Script Name: {sc['name']}")
        print(f"Script Type: {sc['script_type']} | Ref: {sc.get('reference_doctype')} | Event: {sc.get('doctype_event')}")
        print("-" * 50)
        lines = sc["script"].split("\n")
        # print first 50 lines or lines mentioning intervals / days
        for i, l in enumerate(lines[:60]):
            print(f"{i+1:2d}: {l}")

if __name__ == "__main__":
    verify()

