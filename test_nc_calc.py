import frappe
from frappe.desk.doctype.number_card.number_card import get_result

def test():
    c = frappe.new_doc('Number Card')
    c.update({
        'name': 'Test Total Vehicles',
        'label': 'Test Total Vehicles',
        'module': 'Fleet Management',
        'type': 'Document Type',
        'document_type': 'Vehicle',
        'function': 'Count',
        'filters_json': '[["Vehicle", "is_test_record", "=", 0]]'
    })
    res = get_result(c, filters=c.filters_json)
    print("Test Total Vehicles result:", res)

if __name__ == '__main__':
    test()

