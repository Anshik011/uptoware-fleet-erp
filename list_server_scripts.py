import frappe

def list_server_scripts():
    scripts = frappe.get_all("Server Script", fields=["name", "script_type", "reference_doctype", "doctype_event", "disabled"])
    print(f"Total Server Scripts: {len(scripts)}")
    for s in scripts:
        print(f"  {s.name} | DocType: {s.reference_doctype} | Event: {s.doctype_event} | Disabled: {s.disabled}")

if __name__ == '__main__':
    list_server_scripts()

