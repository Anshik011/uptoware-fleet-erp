import frappe

def inspect():
    doctypes = ['Supplier', 'Material Request', 'Purchase Order', 'Purchase Receipt', 'Purchase Invoice', 'Payment Entry', 'Request for Quotation', 'Supplier Quotation']
    print("=== CUSTOM FIELDS ON PURCHASING DOCTYPES ===")
    cfs = frappe.get_all('Custom Field', filters={'dt': ['in', doctypes]}, fields=['dt', 'fieldname', 'fieldtype', 'label'])
    for cf in cfs:
        print(f"{cf.dt} -> {cf.fieldname} ({cf.fieldtype}): {cf.label}")

    print("\n=== EXISTING WORKFLOWS ===")
    wfs = frappe.get_all('Workflow', fields=['name', 'document_type', 'is_active'])
    for wf in wfs:
        print(f"{wf.name} on {wf.document_type} (Active: {wf.is_active})")

    print("\n=== ROLES CHECK ===")
    roles = ['Fleet Manager', 'Workshop Supervisor', 'Store Manager', 'Accountant', 'System Manager']
    for r in roles:
        exists = frappe.db.exists('Role', r)
        print(f"Role '{r}': Exists={bool(exists)}")

    print("\n=== DOCPERMS ON PURCHASING DOCTYPES ===")
    for dt in doctypes:
        perms = frappe.get_all('Custom DocPerm', filters={'parent': dt, 'role': ['in', roles]}, fields=['role', 'read', 'write', 'create', 'submit', 'cancel', 'amend'])
        if perms:
            print(f"-- Custom DocPerms for {dt} --")
            for p in perms:
                print(f"  {p.role}: read={p.read}, write={p.write}, create={p.create}, submit={p.submit}, cancel={p.cancel}")
        else:
            # Check standard docperms
            std_perms = frappe.get_all('DocPerm', filters={'parent': dt, 'role': ['in', roles]}, fields=['role', 'read', 'write', 'create', 'submit', 'cancel', 'amend'])
            print(f"-- Standard DocPerms for {dt} --")
            for p in std_perms:
                print(f"  {p.role}: read={p.read}, write={p.write}, create={p.create}, submit={p.submit}, cancel={p.cancel}")

if __name__ == '__main__':
    inspect()

