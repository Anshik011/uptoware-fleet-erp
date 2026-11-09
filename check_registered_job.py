import frappe

def run():
    jobs = frappe.get_all("Scheduled Job Type", filters={"server_script": "Fleet Management - Daily Expiry Monitoring Scheduler"}, fields=["name", "method", "frequency", "server_script", "stopped"])
    print("Registered Scheduled Jobs:", jobs)

run()

