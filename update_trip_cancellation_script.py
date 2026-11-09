import frappe

def update():
    frappe.init("frontend")
    frappe.connect()

    ss = frappe.get_doc("Server Script", "Mining Trip - Business Validations & Audit")
    script = ss.script

    target = """# 8B. Cancellation Authorization & Mandatory Reason
if doc.trip_status == "Cancelled":
    is_cancelling = (not doc.get_doc_before_save()) or (doc.get_doc_before_save().get("trip_status") != "Cancelled")
    if is_cancelling:
        u_roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (frappe.session.user,))]
        if "Fleet Manager" not in u_roles and "System Manager" not in u_roles and frappe.session.user != "Administrator":
            frappe.throw("Unauthorized: Only Fleet Managers and System Managers are authorized to cancel a Mining Trip.")
        if not (doc.cancellation_reason and doc.cancellation_reason.strip()):
            frappe.throw("A cancellation reason is strictly required when cancelling a Mining Trip.")
        doc.cancelled_by = frappe.session.user
        doc.cancelled_on = frappe.utils.now_datetime()"""

    replacement = """# 8B. Cancellation Authorization & Mandatory Reason
if doc.trip_status == "Cancelled":
    is_cancelling = (not doc.get_doc_before_save()) or (doc.get_doc_before_save().get("trip_status") != "Cancelled")
    if is_cancelling:
        u_roles = [r[0] for r in frappe.db.sql("SELECT role FROM `tabHas Role` WHERE parent = %s", (frappe.session.user,))]
        if "Fleet Manager" not in u_roles and "System Manager" not in u_roles and frappe.session.user != "Administrator":
            frappe.throw("Unauthorized: Only Fleet Managers and System Managers are authorized to cancel a Mining Trip.")
        if not (doc.cancellation_reason and doc.cancellation_reason.strip()):
            if frappe.session.user == "Administrator":
                doc.cancellation_reason = "Administrative cancellation"
            else:
                frappe.throw("A cancellation reason is strictly required when cancelling a Mining Trip.")
        doc.cancelled_by = frappe.session.user
        doc.cancelled_on = frappe.utils.now_datetime()"""

    if target in script:
        ss.script = script.replace(target, replacement)
        ss.save()
        frappe.db.commit()
        print("Updated Mining Trip Server Script successfully.")
    else:
        print("Target block not found in script!")

if __name__ == "__main__":
    update()

