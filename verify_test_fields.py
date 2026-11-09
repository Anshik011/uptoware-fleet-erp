import frappe

def verify_test_fields():
    for dt in ["Sales Invoice", "Purchase Order", "Purchase Invoice", "Payment Entry", "Vehicle", "Mining Trip", "Fuel Log", "Vehicle Breakdown", "Operational Expense", "Vehicle Insurance Policy"]:
        meta = frappe.get_meta(dt)
        has_test = meta.has_field("is_test_record")
        has_cust_test = meta.has_field("custom_is_test_record")
        print(f"{dt}: is_test_record={has_test}, custom_is_test_record={has_cust_test}")

if __name__ == "__main__":
    verify_test_fields()

