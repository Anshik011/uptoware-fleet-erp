import frappe

def run():
    company = "Uptoware"
    accounts = frappe.get_all("Account", filters={"company": company, "is_group": 0}, fields=["name", "account_name", "account_type", "root_type"])
    print(f"Accounts for {company} ({len(accounts)} found):")
    for a in accounts:
        if a.root_type == "Expense" or a.account_type in ["Cash", "Bank", "Payable"]:
            print(f"  {a.name} | type: {a.account_type} | root: {a.root_type}")

    cost_centers = frappe.get_all("Cost Center", filters={"company": company, "is_group": 0}, fields=["name"])
    print("Cost Centers:", [c.name for c in cost_centers])

run()
