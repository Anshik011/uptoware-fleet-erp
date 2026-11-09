import frappe
from frappe.permissions import setup_custom_perms

def check():
    for dt in ['Material Request', 'Purchase Order', 'Purchase Receipt', 'Purchase Invoice', 'Payment Entry', 'Supplier', 'Stock Entry']:
        has_custom = frappe.db.exists("Custom DocPerm", {"parent": dt})
        print(f"{dt}: has_custom={bool(has_custom)}")

if __name__ == '__main__':
    check()

