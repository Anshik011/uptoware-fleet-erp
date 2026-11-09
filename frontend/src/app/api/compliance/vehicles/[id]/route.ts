import { NextRequest, NextResponse } from 'next/server';
import { getVehicleCompliance, updateVehicleCompliance } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { UpdateComplianceInput } from '@/types/fleet';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'compliance', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const { vehicles } = await getVehicleCompliance(auth.sid, { showTestRecords: true });
    const vehicle = vehicles.find((v) => v.vehicle === id || v.licensePlate === id);

    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: `Vehicle '${id}' not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      vehicle,
    });
  } catch (error: any) {
    console.error('Error fetching vehicle compliance:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while fetching compliance' },
      { status: error.status || 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'compliance', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to update compliance documents.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body: Partial<UpdateComplianceInput> = await request.json();

    if (!body.documentType || !['Fitness', 'PUC', 'Road Tax', 'Permit'].includes(body.documentType)) {
      return NextResponse.json(
        { success: false, error: "Valid documentType ('Fitness', 'PUC', 'Road Tax', 'Permit') is mandatory." },
        { status: 400 }
      );
    }
    if (!body.expiryDate) {
      return NextResponse.json(
        { success: false, error: 'Expiry Date is mandatory.' },
        { status: 400 }
      );
    }

    const vehicle = await updateVehicleCompliance(auth.sid, {
      vehicle: id,
      documentType: body.documentType as any,
      expiryDate: body.expiryDate,
      docUrl: body.docUrl,
    });

    return NextResponse.json({
      success: true,
      vehicle,
      message: `${body.documentType} certificate updated successfully.`,
    });
  } catch (error: any) {
    console.error('Error updating compliance document:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while updating compliance document' },
      { status: error.status || 500 }
    );
  }
}

