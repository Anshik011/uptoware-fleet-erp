import frappe

def test():
    val = frappe.db.sql("""
        SELECT CAST(COALESCE(MAX(CASE WHEN field = 'warning_window_days' THEN value END), 30) AS UNSIGNED) AS warning_window
        FROM tabSingles WHERE doctype = 'Fleet Settings'
    """, as_dict=True)
    print("tabSingles query result:", val)

test()

