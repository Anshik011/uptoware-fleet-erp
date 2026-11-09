import frappe

def run():
    accs = frappe.db.sql("SELECT name, account_type FROM `tabAccount` WHERE company = 'Uptoware' AND account_type IN ('Bank', 'Cash', 'Receivable', 'Payable')", as_dict=True)
    for a in accs:
        print(a)

if __name__ == "__main__":
    run()

