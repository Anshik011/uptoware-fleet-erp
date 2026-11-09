import frappe
import json

def inspect_workspace():
    for ws_name in ["Stock", "Accounts", "Buying"]:
        try:
            ws = frappe.get_doc("Workspace", ws_name)
            print(f"\n================ WORKSPACE: {ws.name} ================")
            print(f"Title: {ws.title}, Module: {ws.module}, Public: {ws.public}")
            print(f"Shortcuts ({len(ws.shortcuts)}): {[(s.label, s.link_to, s.type) for s in ws.shortcuts[:5]]}")
            print(f"Links ({len(ws.links)}): {[(l.label, l.link_to, l.type) for l in ws.links[:5]]}")
            print(f"Custom Blocks ({len(ws.custom_blocks)}): {[(b.label, b.custom_block_name) for b in ws.custom_blocks]}")
            if ws.content:
                parsed = json.loads(ws.content)
                types = [block.get("type") for block in parsed]
                print(f"Content block types: {types[:15]}")
                for b in parsed[:5]:
                    print("  Block:", b)
        except Exception as e:
            print(f"Error {ws_name}: {e}")

if __name__ == "__main__":
    inspect_workspace()

