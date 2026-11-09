import frappe
import json

def inspect_number_cards():
    names = ['Total Active Items', 'Total Warehouses', 'Total Stock Value', 'Purchase Orders to Receive', 'Annual Purchase']
    for n in names:
        try:
            nc = frappe.get_doc("Number Card", n)
            print(f"=== NUMBER CARD: {nc.name} ===")
            print(f"Label: {nc.label}, DocType: {nc.document_type}, Type: {nc.type}")
            print(f"Function: {nc.function}, Field: {nc.aggregate_function_based_on}")
            print(f"Method: {nc.method}, Report Name: {nc.report_name}, Report Field: {nc.report_field}")
            print(f"Filters JSON: {nc.filters_json}")
            print(f"Dynamic Filters: {nc.dynamic_filters_json}")
        except Exception as e:
            print(f"Error {n}: {e}")

if __name__ == "__main__":
    inspect_number_cards()

