import frappe

def inspect_std_roles():
    doctypes = ['Supplier', 'Material Request', 'Purchase Order', 'Purchase Receipt', 'Purchase Invoice', 'Payment Entry']
    for dt in doctypes:
        perms = frappe.get_all('DocPerm', filters={'parent': dt}, fields=['role', 'read', 'write', 'create', 'submit', 'cancel'], order_by='idx')
        print(f"\n--- {dt} DocPerms ---")
        for p in perms:
            print(f"  {p.role}: read={p.read}, write={p.write}, create={p.create}, submit={p.submit}, cancel={p.cancel}")

if __name__ == '__main__':
    inspect_std_roles()

