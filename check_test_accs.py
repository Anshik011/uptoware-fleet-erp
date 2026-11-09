import frappe

def run():
    dt = frappe.get_doc("DocType", "Operational Expense")
    cat_field = next(f for f in dt.fields if f.fieldname == "expense_category")
    print("Expense categories:", cat_field.options.split("\n"))

if __name__ == "__main__":
    run()
