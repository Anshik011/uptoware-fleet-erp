import frappe

def run():
    for dt_name in ["Vehicle", "Customer", "Mining Trip"]:
        meta = frappe.get_meta(dt_name)
        test_f = [f.fieldname for f in meta.fields if "test" in f.fieldname]
        print(f"DocType: {dt_name}, test fields: {test_f}")

if __name__ == "__main__":
    run()

