import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { getVehicleDocuments, createVehicleDocument, callFrappeApi } from '@/lib/frappe';
import { VehicleDocumentCategory, DocumentVerificationStatus } from '@/types/fleet';

const PERMITTED_CATEGORIES: VehicleDocumentCategory[] = [
  'Registration Certificate (RC)',
  'Fitness Certificate',
  'Pollution Under Control (PUC)',
  'National / State Permit',
  'Road Tax Token',
  'Insurance Policy Document',
  'Mining Pass / Entry Permit',
  'Other',
];

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'documents', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to view vehicle documents.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const vehicle = searchParams.get('vehicle') || undefined;
    const category = searchParams.get('category') as VehicleDocumentCategory | undefined;
    const verificationStatus = searchParams.get('verification_status') as DocumentVerificationStatus | undefined;
    const includeTest = searchParams.get('include_test') === 'true';
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100;

    const docs = await getVehicleDocuments(`sid=${auth.sid}`, {
      vehicle,
      category,
      verificationStatus,
      includeTest,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: docs,
      count: docs.length,
    });
  } catch (error: any) {
    console.error('Vehicle documents GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error fetching vehicle documents.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'documents', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to manage vehicle documents.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      vehicle,
      documentCategory,
      documentNumber,
      issueDate,
      expiryDate,
      issuingAuthority,
      fileAttachment,
      fileName,
      fileType,
      verificationStatus,
      remarks,
      replacedDocument,
      isTestRecord,
    } = body;

    if (!vehicle || typeof vehicle !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Validation Error: Vehicle ID is required.' },
        { status: 400 }
      );
    }

    if (!documentCategory || !PERMITTED_CATEGORIES.includes(documentCategory)) {
      return NextResponse.json(
        {
          success: false,
          error: `Validation Error: Invalid document category '${documentCategory}'. Permitted categories: ${PERMITTED_CATEGORIES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (!documentNumber || typeof documentNumber !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Validation Error: Document number is required.' },
        { status: 400 }
      );
    }

    if (!expiryDate) {
      return NextResponse.json(
        { success: false, error: 'Validation Error: Expiry date is required.' },
        { status: 400 }
      );
    }

    if (!fileAttachment) {
      return NextResponse.json(
        { success: false, error: 'Validation Error: File attachment URL is required.' },
        { status: 400 }
      );
    }

    const createdDoc = await createVehicleDocument(
      `sid=${auth.sid}`,
      {
        vehicle,
        documentCategory,
        documentNumber,
        issueDate: issueDate || null,
        expiryDate,
        issuingAuthority: issuingAuthority || null,
        fileAttachment,
        fileName: fileName || null,
        fileType: fileType || null,
        verificationStatus: verificationStatus || 'Pending',
        remarks: remarks || null,
        replacedDocument: replacedDocument || null,
        isTestRecord: Boolean(isTestRecord),
      },
      auth.user.email || auth.user.name
    );

    if (replacedDocument) {
      await callFrappeApi('/api/method/frappe.client.set_value', `sid=${auth.sid}`, {
        method: 'POST',
        body: JSON.stringify({
          doctype: 'Vehicle Document',
          name: replacedDocument,
          fieldname: 'is_active',
          value: 0,
        }),
      }).catch((e) => console.warn('Failed to deactivate replaced vehicle doc:', e));
    }

    return NextResponse.json(
      {
        success: true,
        data: createdDoc,
        message: 'Vehicle document uploaded and registered successfully.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Vehicle document POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error creating vehicle document.' },
      { status: 500 }
    );
  }
}

