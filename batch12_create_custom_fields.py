import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def add_fields():
    frappe.init("frontend")
    frappe.connect()

    print("=== CREATING BATCH 12 AUDIT & APPROVAL CUSTOM FIELDS ===")

    custom_fields = {
        "Fuel Log": [
            {
                "fieldname": "rejection_reason",
                "label": "Rejection Reason",
                "fieldtype": "Small Text",
                "insert_after": "workflow_state"
            },
            {
                "fieldname": "rejected_by",
                "label": "Rejected By",
                "fieldtype": "Data",
                "read_only": 1,
                "insert_after": "rejection_reason"
            },
            {
                "fieldname": "rejected_on",
                "label": "Rejected On",
                "fieldtype": "Datetime",
                "read_only": 1,
                "insert_after": "rejected_by"
            }
        ],
        "Mining Trip": [
            {
                "fieldname": "cancellation_reason",
                "label": "Cancellation Reason",
                "fieldtype": "Small Text",
                "insert_after": "workflow_state"
            },
            {
                "fieldname": "cancelled_by",
                "label": "Cancelled By",
                "fieldtype": "Data",
                "read_only": 1,
                "insert_after": "cancellation_reason"
            },
            {
                "fieldname": "cancelled_on",
                "label": "Cancelled On",
                "fieldtype": "Datetime",
                "read_only": 1,
                "insert_after": "cancelled_by"
            }
        ],
        "Material Request": [
            {
                "fieldname": "custom_approved_by",
                "label": "Approved By",
                "fieldtype": "Data",
                "read_only": 1,
                "insert_after": "status"
            },
            {
                "fieldname": "custom_approved_on",
                "label": "Approved On",
                "fieldtype": "Datetime",
                "read_only": 1,
                "insert_after": "custom_approved_by"
            }
        ],
        "Purchase Receipt": [
            {
                "fieldname": "custom_verified_by",
                "label": "Verified By",
                "fieldtype": "Data",
                "read_only": 1,
                "insert_after": "status"
            },
            {
                "fieldname": "custom_verified_on",
                "label": "Verified On",
                "fieldtype": "Datetime",
                "read_only": 1,
                "insert_after": "custom_verified_by"
            }
        ],
        "Purchase Invoice": [
            {
                "fieldname": "custom_approved_by",
                "label": "Approved By",
                "fieldtype": "Data",
                "read_only": 1,
                "insert_after": "status"
            },
            {
                "fieldname": "custom_approved_on",
                "label": "Approved On",
                "fieldtype": "Datetime",
                "read_only": 1,
                "insert_after": "custom_approved_by"
            }
        ],
        "Sales Invoice": [
            {
                "fieldname": "custom_approved_by",
                "label": "Approved By",
                "fieldtype": "Data",
                "read_only": 1,
                "insert_after": "status"
            },
            {
                "fieldname": "custom_approved_on",
                "label": "Approved On",
                "fieldtype": "Datetime",
                "read_only": 1,
                "insert_after": "custom_approved_by"
            }
        ]
    }

    create_custom_fields(custom_fields, update=True)
    frappe.db.commit()
    print("Custom fields successfully created / verified.")

if __name__ == "__main__":
    add_fields()

