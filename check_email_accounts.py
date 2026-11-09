import frappe

def run():
    accounts = frappe.get_all("Email Account", fields=["name", "email_id", "default_outgoing", "enable_outgoing"])
    print("Email Accounts in DB:", accounts)

run()

