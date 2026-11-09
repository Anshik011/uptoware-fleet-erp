import frappe

def run():
    print("--- DOCTYPES CHECK ---")
    dt_matches = frappe.get_all("DocType", filters={"name": ["like", "%Expense%"]}, pluck="name")
    print("Existing Expense DocTypes:", dt_matches)

    print("\n--- COMPANY & ACCOUNTS ---")
    companies = frappe.get_all("Company", fields=["name", "default_currency", "default_cash_account", "default_bank_account", "default_payable_account", "cost_center"])
    print("Companies:", companies)

    if companies:
        comp = companies[0].name
        exp_accounts = frappe.get_all("Account", filters={"company": comp, "root_type": "Expense", "is_group": 0}, fields=["name", "account_name", "account_type"], limit=50)
        print(f"\nSample Expense Accounts for {comp}:")
        for a in exp_accounts:
            print(" -", a.name, f"({a.account_type})")
            
        cash_bank = frappe.get_all("Account", filters={"company": comp, "account_type": ["in", ["Cash", "Bank"]], "is_group": 0}, fields=["name", "account_name", "account_type"])
        print(f"\nCash/Bank Accounts for {comp}:")
        for cb in cash_bank:
            print(" -", cb.name, f"({cb.account_type})")
            
        cost_centers = frappe.get_all("Cost Center", filters={"company": comp, "is_group": 0}, fields=["name", "cost_center_name"])
        print(f"\nCost Centers for {comp}:")
        for cc in cost_centers:
            print(" -", cc.name)

    print("\n--- MODES OF PAYMENT ---")
    mops = frappe.get_all("Mode of Payment", fields=["name", "type", "enabled"])
    print("Modes of Payment:", mops)

    print("\n--- ROLES CHECK ---")
    roles = frappe.get_all("Role", filters={"name": ["in", ["Fleet Manager", "Workshop Supervisor", "Accountant", "Driver", "System Manager"]]}, pluck="name")
    print("Roles verified:", roles)

    print("\n--- EXPENSE CLAIM TYPE ---")
    claim_types = frappe.get_all("Expense Claim Type", fields=["name"])
    print("Expense Claim Types:", claim_types)

run()
