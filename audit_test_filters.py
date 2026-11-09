import frappe
import json

def audit_test_record_filters():
    print("=== AUDITING NUMBER CARDS FOR TEST RECORD EXCLUSION ===")
    cards = frappe.get_all("Number Card", filters={"module": "Fleet Management"}, fields=["name", "label", "document_type", "filters_json"])
    for c in sorted(cards, key=lambda x: x.label):
        f = json.loads(c.filters_json or "[]")
        meta = frappe.get_meta(c.document_type) if c.document_type else None
        has_test_field = meta.has_field("is_test_record") or meta.has_field("custom_is_test_record") if meta else False
        
        # Check if filter has test record
        filter_str = str(f)
        has_filter = "is_test_record" in filter_str
        print(f"Card: {c.label:35} | DocType: {c.document_type:20} | HasTestField: {str(has_test_field):5} | HasFilter: {str(has_filter):5}")

    print("\n=== AUDITING DASHBOARD CHARTS FOR TEST RECORD EXCLUSION ===")
    charts = frappe.get_all("Dashboard Chart", filters={"module": "Fleet Management"}, fields=["name", "chart_name", "document_type", "filters_json"])
    for ch in sorted(charts, key=lambda x: x.chart_name):
        f = json.loads(ch.filters_json or "[]")
        filter_str = str(f)
        has_filter = "is_test_record" in filter_str
        print(f"Chart: {ch.chart_name:35} | DocType: {ch.document_type:20} | HasFilter: {str(has_filter):5}")

if __name__ == "__main__":
    audit_test_record_filters()

