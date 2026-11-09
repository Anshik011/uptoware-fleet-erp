import frappe

def run():
    comp = "Uptoware"
    accounts = frappe.get_all("Account", filters={"company": comp}, fields=["name", "account_name", "root_type", "account_type", "is_group", "parent_account"])
    print(f"Total Accounts for {comp}: {len(accounts)}")
    print("\nExpense Accounts:")
    for a in accounts:
        if a.root_type == "Expense" and not a.is_group:
            print(f"  {a.name:<40} | type: {a.account_type or 'None':<15} | parent: {a.parent_account}")

    print("\nCash & Bank Accounts:")
    for a in accounts:
        if a.account_type in ["Cash", "Bank"] and not a.is_group:
            print(f"  {a.name:<40} | type: {a.account_type:<15}")

    print("\nPayable Accounts:")
    for a in accounts:
        if a.account_type == "Payable" and not a.is_group:
            print(f"  {a.name:<40} | type: {a.account_type:<15}")

run()
