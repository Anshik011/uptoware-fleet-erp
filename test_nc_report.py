import frappe
from frappe.desk.doctype.number_card.number_card import get_result

def test_nc_report():
    nc_dict = {
        "doctype": "Number Card",
        "name": "Test Invoiced Revenue Card",
        "label": "Test Invoiced Revenue",
        "module": "Fleet Management",
        "type": "Report",
        "report_name": "Revenue vs Cost Analysis",
        "report_field": "Invoiced Revenue",
        "report_function": "Sum",
        "is_public": 1,
        "filters_json": "{}"
    }
    if not frappe.db.exists("Number Card", "Test Invoiced Revenue Card"):
        c = frappe.get_doc(nc_dict).insert(ignore_permissions=True)
    else:
        c = frappe.get_doc("Number Card", "Test Invoiced Revenue Card")
    
    print("Created card doc:", c.name)
    try:
        from frappe.desk.doctype.number_card.number_card import get_result
        # Test how get_result evaluates type == "Report"
        res = get_result(c, filters=c.filters_json)
        print("Result from report card:", res)
    except Exception as e:
        print("Error evaluating report card:", e)
    finally:
        c.delete()

if __name__ == "__main__":
    test_nc_report()

