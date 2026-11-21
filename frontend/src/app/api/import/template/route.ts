import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

// Curated fields for each fleet DocType incorporating Indian mining & client customizations
const DOCTYPE_EXPORT_FIELDS: Record<string, string[]> = {
  Vehicle: [
    'license_plate',
    'make',
    'model',
    'custom_vehicle_type',
    'custom_transport_type',
    'vehicle_status',
    'custom_mine_site',
    'last_odometer',
    'fuel_type',
    'uom',
  ],
  Employee: [
    'first_name',
    'designation',
    'custom_mine_site',
    'cell_number',
    'father_or_spouse_name',
    'custom_skill_category',
    'custom_pf_type',
    'custom_uan_cmpf_number',
    'custom_social_category',
    'custom_driving_license_number',
    'custom_dl_validity',
    'custom_vt_number',
    'custom_vt_validity_period',
    'custom_form_o_details',
    'status',
    'company',
    'department',
  ],
  'Mine Site': [
    'mine_site_name',
    'client',
    'mineral_type',
    'loading_pits',
    'target_tonnage',
    'status',
  ],
  'Fleet Lead': [
    'lead_name',
    'mine_site',
    'destination',
    'mineral_type',
    'lead_km',
    'rate_per_ton',
    'is_active',
  ],
  Item: [
    'item_code',
    'item_name',
    'item_group',
    'stock_uom',
    'valuation_rate',
    'custom_part_number',
    'custom_compatible_vehicle_model',
    'custom_preferred_supplier',
    'is_stock_item',
  ],
  Supplier: [
    'supplier_name',
    'supplier_group',
    'supplier_type',
    'pan',
    'gstin',
    'country',
  ],
  'Mining Trip': [
    'vehicle',
    'driver',
    'mine_site',
    'destination',
    'material_type',
    'shift',
    'lead_km',
    'trip_count',
    'average_tonnage',
    'rate_per_ton',
    'opening_odometer',
    'closing_odometer',
  ],
  'Fuel Log': [
    'vehicle',
    'driver',
    'fuel_date',
    'dispensed_litres',
    'fuel_price_per_litre',
    'fuel_source',
    'last_odometer',
  ],
};

const FRAPPE_URL = process.env.FRAPPE_URL || 'http://localhost:8080';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'excel';
    const doctype = searchParams.get('doctype') || 'Vehicle';

    // 1. Check if user requested the Master Multi-Tab Template
    if (format === 'master') {
      const templatePath = path.join(process.cwd(), 'public', 'templates', 'Uptoware_Fleet_ERP_Bulk_Import_Template.xlsx');
      if (fs.existsSync(templatePath)) {
        const fileBuffer = fs.readFileSync(templatePath);
        return new NextResponse(fileBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': 'attachment; filename="Uptoware_Fleet_ERP_Bulk_Import_Template.xlsx"',
          },
        });
      }
    }

    // 2. Otherwise request official Frappe template for specific DocType
    const fields = DOCTYPE_EXPORT_FIELDS[doctype] || ['name'];
    const exportFieldsJson = JSON.stringify({ [doctype]: fields });
    const fileType = format.toLowerCase() === 'csv' ? 'CSV' : 'Excel';

    const frappeUrl = new URL(`${FRAPPE_URL}/api/method/frappe.core.doctype.data_import.data_import.download_template`);
    frappeUrl.searchParams.set('doctype', doctype);
    frappeUrl.searchParams.set('file_type', fileType);
    frappeUrl.searchParams.set('export_records', 'blank_template');
    frappeUrl.searchParams.set('export_fields', exportFieldsJson);

    const fRes = await fetch(frappeUrl.toString(), {
      headers: {
        Cookie: `sid=${auth.sid}`,
        Referer: FRAPPE_URL,
      },
    });

    if (!fRes.ok) {
      const errText = await fRes.text();
      return NextResponse.json(
        { success: false, error: `Frappe template error: ${errText}` },
        { status: fRes.status }
      );
    }

    const fileBuf = await fRes.arrayBuffer();
    const ext = fileType === 'CSV' ? 'csv' : 'xlsx';
    const contentType = fileType === 'CSV'
      ? 'text/csv; charset=utf-8'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

    return new NextResponse(fileBuf, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${doctype}_Import_Template.${ext}"`,
      },
    });
  } catch (err: any) {
    console.error('Error in /api/import/template:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'Internal server error while generating template' },
      { status: 500 }
    );
  }
}
