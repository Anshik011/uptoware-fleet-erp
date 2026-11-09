import frappe, json

frappe.init('frontend')
frappe.connect()

def inspect_dt(dt):
    meta = frappe.get_meta(dt)
    fields = []
    for f in meta.fields:
        if f.fieldtype not in ['Section Break', 'Column Break', 'Tab Break'] and not f.fieldname.startswith('amended'):
            fields.append({
                'fieldname': f.fieldname,
                'label': f.label,
                'fieldtype': f.fieldtype,
                'reqd': f.reqd,
                'options': (f.options or '').replace('\n', ', ')
            })
    return fields

print('=== VEHICLE FIELDS ===')
for f in inspect_dt('Vehicle'):
    print(f"{f['fieldname']:<32} | {str(f['label']):<28} | {f['fieldtype']:<14} | reqd: {f['reqd']} | {f['options']}")

print('\n=== MINING TRIP FIELDS ===')
for f in inspect_dt('Mining Trip'):
    print(f"{f['fieldname']:<32} | {str(f['label']):<28} | {f['fieldtype']:<14} | reqd: {f['reqd']} | {f['options']}")

print('\n=== FLEET ALERT LOG FIELDS ===')
for f in inspect_dt('Fleet Alert Log'):
    print(f"{f['fieldname']:<32} | {str(f['label']):<28} | {f['fieldtype']:<14} | reqd: {f['reqd']} | {f['options']}")

