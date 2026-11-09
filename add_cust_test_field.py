import frappe

def run():
    from frappe.custom.doctype.custom_field.custom_field import create_custom_fields
    print("=== ADDING custom_is_test_record TO CUSTOMER ===")
    create_custom_fields({
        "Customer": [
            {
                "fieldname": "custom_is_test_record",
                "label": "Is Test Record",
                "fieldtype": "Check",
                "default": "0",
                "insert_after": "customer_name"
            }
        ]
    }, ignore_validate=True)
    frappe.db.commit()
    print("Added custom_is_test_record to Customer.")

if __name__ == "__main__":
    run()
