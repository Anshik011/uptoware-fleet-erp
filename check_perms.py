import frappe

def run():
    for dt in ['Stock Entry', 'Item', 'Vehicle Breakdown', 'Operational Expense', 'Material Request', 'Purchase Order', 'Purchase Receipt', 'Purchase Invoice', 'Payment Entry', 'Supplier']:
        cp = frappe.get_all('Custom DocPerm', filters={'parent': dt}, fields=['role', 'read', 'write', 'create', 'submit', 'cancel', 'delete'])
        print(f"{dt} Custom DocPerms count: {len(cp)}")
        for p in cp:
            print(f"   {p.role}: r={p.read}, w={p.write}, c={p.create}, s={p.submit}, can={p.cancel}, del={p.delete}")

if __name__ == '__main__':
    run()

