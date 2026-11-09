import frappe

def inspect_fields():
    meta = frappe.get_meta("Request for Quotation Item")
    for f in meta.fields:
        if 'uom' in f.fieldname or 'factor' in f.fieldname or f.reqd:
            print(f"fieldname: {f.fieldname}, label: {f.label}, reqd: {f.reqd}")

if __name__ == '__main__':
    inspect_fields()
