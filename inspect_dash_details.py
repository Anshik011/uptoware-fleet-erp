import frappe
import json

def inspect_dashboards():
    for d_name in ["Stock", "Accounts", "Buying", "Selling"]:
        try:
            d = frappe.get_doc("Dashboard", d_name)
            print(f"=== DASHBOARD: {d.name} ===")
            print(f"Module: {d.module}, Is Standard: {d.is_standard}, Is Default: {d.is_default}")
            print(f"Charts ({len(d.charts)}): {[c.chart for c in d.charts]}")
            print(f"Cards ({len(d.cards)}): {[c.card for c in d.cards]}")
        except Exception as e:
            print(f"Error {d_name}: {e}")

if __name__ == "__main__":
    inspect_dashboards()

