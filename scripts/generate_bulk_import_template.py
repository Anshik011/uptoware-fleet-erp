"""
generate_bulk_import_template.py
Generates a comprehensive multi-sheet Excel file (.xlsx) with styled headers,
data validation hints, and valid sample rows for bulk importing into ERPNext.
"""

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = openpyxl.Workbook()
# Remove default sheet
wb.remove(wb.active)

# Color styles adhering to enterprise blue/slate palette
HEADER_FILL = PatternFill(start_color="1E3A8A", end_color="1E3A8A", fill_type="solid") # Dark Blue
HEADER_FONT = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
SAMPLE_FONT = Font(name="Calibri", size=10)
THIN_BORDER = Border(
    left=Side(style="thin", color="CBD5E1"),
    right=Side(style="thin", color="CBD5E1"),
    top=Side(style="thin", color="CBD5E1"),
    bottom=Side(style="thin", color="CBD5E1")
)

def format_sheet(ws, title, headers, sample_rows):
    ws.title = title
    # Header row
    for col_idx, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_idx, value=header)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.row_dimensions[1].height = 28

    # Data rows
    for row_idx, row_data in enumerate(sample_rows, 2):
        ws.row_dimensions[row_idx].height = 20
        for col_idx, val in enumerate(row_data, 1):
            cell = ws.cell(row=row_idx, column=col_idx, value=val)
            cell.font = SAMPLE_FONT
            cell.border = THIN_BORDER
            if isinstance(val, (int, float)):
                cell.alignment = Alignment(horizontal="right", vertical="center")
            else:
                cell.alignment = Alignment(horizontal="left", vertical="center")

    # Auto-fit column widths
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 5, 14)

# 1. Sheet: Instructions
ws_intro = wb.create_sheet(title="Instructions")
ws_intro.row_dimensions[1].height = 30
title_cell = ws_intro.cell(row=1, column=1, value="Uptoware Fleet ERP — Bulk Data Import Guide")
title_cell.font = Font(name="Calibri", size=16, bold=True, color="1E3A8A")

instructions = [
    "",
    "How to use this Bulk Import Workbook:",
    "1. Each sheet corresponds to a primary operational entity in ERPNext / Uptoware Fleet ERP.",
    "2. You can upload this entire workbook or individual sheets via the /import portal.",
    "3. Mandatory fields are marked in the headers. Do not alter column header names.",
    "4. Client Custom Fields Included:",
    "   - Vehicles: Transport Type ('Transport' or 'Non Transport') - Decoupled from static drivers.",
    "   - Employees: Indian Mining Statutory fields (Father/Spouse Name, Skill Category, CMPF/EPF, DL No & Expiry, VT No & Period, Form O).",
    "   - Fleet Leads: Distance Bands ('3-4', '4-5', '5-6') KM.",
    "   - Trips: Shifts ('Shift A', 'Shift B', 'Shift C'), Odometer start/close, Trip count multiplier.",
    "   - Spare Parts: Item Groups ('Spare Parts', 'Consumables', 'Tyres', 'Lubricants', 'Electrical', 'Mechanical').",
    "5. Date format: YYYY-MM-DD (e.g. 2026-11-22).",
    "6. If you have any questions or need custom imports, contact your fleet administrator."
]
for r_idx, text in enumerate(instructions, 2):
    cell = ws_intro.cell(row=r_idx, column=1, value=text)
    cell.font = Font(name="Calibri", size=11, bold=(r_idx in [2, 5]))
ws_intro.column_dimensions["A"].width = 110

# 2. Sheet: Vehicles
v_headers = ["License Plate*", "Make*", "Model*", "Vehicle Type", "Transport Type*", "Vehicle Status*", "Operational Mine Site*", "Odometer Value (Last)*", "Fuel Type*", "Fuel UOM*"]
v_samples = [
    ["KA-34-M-1001", "Tata", "Prima 3538.K", "Tipper", "Transport", "Active", "JBR Eastern — Talcher Site", 12500, "Diesel", "Litre"],
    ["KA-34-M-1002", "Ashok Leyland", "Captain 3123", "Tipper", "Transport", "Active", "JBR Eastern — Ib Valley Site", 8400, "Diesel", "Litre"],
    ["KA-34-M-1003", "Volvo", "FMX 460", "Dumper", "Transport", "Active", "JBR Eastern — Talcher Site", 19200, "Diesel", "Litre"],
    ["KA-34-U-9001", "Mahindra", "Bolero Camper", "Utility", "Non Transport", "Active", "JBR Eastern — Talcher Site", 31000, "Diesel", "Litre"]
]
format_sheet(wb.create_sheet(), "Vehicles", v_headers, v_samples)

# 3. Sheet: Employees
emp_headers = [
    "Full Name*", "Designation*", "Assigned Mine Site", "Mobile Phone", "Father / Spouse Name*",
    "Skill Category*", "PF Type*", "UAN / CMPF Number", "Social Category*", "Driving License No",
    "DL Expiry (YYYY-MM-DD)", "VT Number", "VT Period", "Form O Details", "Status*", "Company*"
]
emp_samples = [
    ["Manoj Kumar Singh", "Driver", "JBR Eastern — Talcher Site", "9876543201", "Ramawtar Singh", "Skilled", "CMPF", "CMPF-TAL-8821", "OBC", "DL-OD-2018-0912", "2030-12-31", "VT-2024-811", "3 Years", "Fit for Mining Operations — A Grade", "Active", "Uptoware"],
    ["Rameshwar Patel", "Driver", "JBR Eastern — Ib Valley Site", "9876543202", "Gopal Patel", "Skilled", "CMPF", "CMPF-IB-9023", "General", "DL-OD-2019-1142", "2029-08-15", "VT-2023-402", "5 Years", "Periodical Medical Exam Valid till 2028", "Active", "Uptoware"],
    ["Sanjay Verma", "Mine Supervisor", "JBR Eastern — Talcher Site", "9876543203", "Devendra Verma", "Highly Skilled", "EPF", "101928374655", "General", "", "", "", "", "Form O Certified", "Active", "Uptoware"],
    ["Bikash Sahoo", "Workshop Mechanic", "JBR Eastern — Talcher Site", "9876543204", "Kailash Sahoo", "Skilled", "EPF", "101827364512", "OBC", "", "", "VT-2022-109", "3 Years", "Fit for Duty", "Active", "Uptoware"]
]
format_sheet(wb.create_sheet(), "Employees", emp_headers, emp_samples)

# 4. Sheet: Mine Sites
ms_headers = ["Mine Site Name*", "Customer / Client*", "Mineral Type*", "Loading Pits", "Target Tonnage (MT)*", "Status*"]
ms_samples = [
    ["JBR Eastern — Talcher Site", "Mahanadi Coalfields Limited", "Coal", "Pit 1, Pit 2, North Quarry", 50000, "Active"],
    ["JBR Eastern — Ib Valley Site", "Mahanadi Coalfields Limited", "Coal", "Main Pit, West Extension", 35000, "Active"],
    ["Kudremukh Iron Ore Site", "KIOCL Limited", "Iron Ore", "Lakya Pit", 25000, "Active"]
]
format_sheet(wb.create_sheet(), "Mine_Sites", ms_headers, ms_samples)

# 5. Sheet: Fleet Leads
lead_headers = ["Lead Name*", "Mine Site*", "Destination*", "Mineral Type*", "Distance Band (KM)*", "Rate Per Ton (INR)*", "Is Active*"]
lead_samples = [
    ["Talcher Pit 1 to Siding 2", "JBR Eastern — Talcher Site", "Siding 2 Railhead", "Coal", "3-4", 180, 1],
    ["Talcher Pit 2 to Washery", "JBR Eastern — Talcher Site", "Central Coal Washery", "Coal", "4-5", 220, 1],
    ["Ib Valley Pit to Siding 1", "JBR Eastern — Ib Valley Site", "Ib Siding 1", "Coal", "5-6", 260, 1]
]
format_sheet(wb.create_sheet(), "Fleet_Leads", lead_headers, lead_samples)

# 6. Sheet: Spare Parts
sp_headers = ["Part Name*", "Item Group*", "Unit of Measure*", "Standard Rate (INR)*", "Part Number / OEM Ref", "Compatible Vehicle Model", "Preferred Supplier", "Reorder Level", "Reorder Qty"]
sp_samples = [
    ["Heavy Duty Brake Pad Set", "Spare Parts", "Set", 2450, "TATA-214982", "Tata Prima 3538.K", "JAI HANUMAN", 10, 25],
    ["Engine Oil 15W40 CI-4 (20L)", "Lubricants", "Box", 4800, "CAST-15W40-20L", "Universal Diesel", "JAI HANUMAN", 5, 20],
    ["Heavy Duty Alternator 24V", "Electrical", "Nos", 8500, "BOSCH-0124655024", "Volvo FMX 460 / Scania", "JAI HANUMAN", 2, 5],
    ["Tubeless Radial Tyre 11R20", "Tyres", "Nos", 22000, "MRF-SUPER-LUG-50", "Tata / Ashok Leyland", "JAI HANUMAN", 8, 16]
]
format_sheet(wb.create_sheet(), "Spare_Parts", sp_headers, sp_samples)

# 7. Sheet: Suppliers
sup_headers = ["Supplier Name*", "Supplier Group*", "Supplier Type*", "PAN Number", "GSTIN", "Country*"]
sup_samples = [
    ["JAI HANUMAN", "Spare Parts", "Company", "AAACJ1234F", "21AAACJ1234F1Z5", "India"],
    ["Talcher On-Site Workshop", "Services", "Company", "AABCT5678K", "21AABCT5678K1ZA", "India"],
    ["Indian Oil Corporation Limited", "Fuel", "Company", "AAACI1928C", "21AAACI1928C1Z8", "India"]
]
format_sheet(wb.create_sheet(), "Suppliers", sup_headers, sup_samples)

# 8. Sheet: Mining Trips
trip_headers = [
    "Vehicle No*", "Driver ID*", "Mine Site*", "Destination*", "Material Type*", "Shift*",
    "Distance Band (KM)*", "Trip Count Multiplier*", "Average Tonnage (MT)*", "Rate Per Ton (INR)*",
    "Opening Odometer*", "Closing Odometer*"
]
trip_samples = [
    ["KA-34-M-1001", "HR-DRI-2026-00393", "JBR Eastern — Talcher Site", "Siding 2 Railhead", "Coal", "Shift A", "3-4", 6, 34.5, 180, 12500, 12524],
    ["KA-34-M-1002", "HR-DRI-2026-00394", "JBR Eastern — Ib Valley Site", "Ib Siding 1", "Coal", "Shift A", "4-5", 5, 32.0, 220, 8400, 8425],
    ["KA-34-M-1003", "HR-DRI-2026-00395", "JBR Eastern — Talcher Site", "Central Coal Washery", "Coal", "Shift B", "4-5", 4, 38.0, 220, 19200, 19220]
]
format_sheet(wb.create_sheet(), "Mining_Trips", trip_headers, trip_samples)

# 9. Sheet: Fuel Logs
fuel_headers = ["Vehicle No*", "Driver ID*", "Refuel Date (YYYY-MM-DD)*", "Dispensed Litres*", "Price Per Litre (INR)*", "Fuel Source*", "Odometer Reading*"]
fuel_samples = [
    ["KA-34-M-1001", "HR-DRI-2026-00393", "2026-11-22", 180, 92.50, "On-Site Storage Tank", 12524],
    ["KA-34-M-1002", "HR-DRI-2026-00394", "2026-11-22", 150, 92.50, "On-Site Storage Tank", 8425],
    ["KA-34-M-1003", "HR-DRI-2026-00395", "2026-11-22", 210, 92.50, "Fuel Station", 19220]
]
format_sheet(wb.create_sheet(), "Fuel_Logs", fuel_headers, fuel_samples)

# Save workbook
output_path = "Uptoware_Fleet_ERP_Bulk_Import_Template.xlsx"
wb.save(output_path)
print(f"SUCCESS: Saved multi-sheet template workbook to {output_path}")
