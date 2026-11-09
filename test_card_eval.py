import frappe
from frappe.desk.doctype.number_card.number_card import get_result
from frappe.desk.doctype.dashboard_chart.dashboard_chart import get

def test_evaluation():
    print("Testing Number Card evaluation...")
    # Check if a card can be created and get_result called
    card_dict = {
        "doctype": "Number Card",
        "name": "Test Total Vehicles",
        "label": "Test Total Vehicles",
        "module": "Fleet Management",
        "type": "Document Type",
        "document_type": "Vehicle",
        "function": "Count",
        "is_public": 1,
        "filters_json": '[["Vehicle", "is_test_record", "=", 0]]'
    }
    if not frappe.db.exists("Number Card", "Test Total Vehicles"):
        c = frappe.get_doc(card_dict).insert(ignore_permissions=True)
    else:
        c = frappe.get_doc("Number Card", "Test Total Vehicles")
    
    res = get_result(c.name)
    print("Card result:", res)
    c.delete()
    print("Deleted test card successfully.")

if __name__ == "__main__":
    test_evaluation()

