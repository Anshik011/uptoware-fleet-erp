import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { updateDriverDocumentStatus, callFrappeApi } from '@/lib/frappe';
import { DocumentVerificationStatus } from '@/types/fleet';

const PERMITTED_STATUSES: DocumentVerificationStatus[] = ['Pending', 'Verified', 'Rejected'];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { success: false, error: 'Forbidden: Insufficient permissions.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const queryParams = new URLSearchParams({
      doctype: 'Driver Document',
      name: id,
    });

    const res = await callFrappeApi(
      `/api/method/frappe.client.get?${queryParams.toString()}`,
      `sid=${auth.sid}`,
      { method: 'GET' }
    );

    if (!res.message) {
      return NextResponse.json(
        { success: false, error: `Driver document '${id}' not found.` },
        { status: 404 }
      );
    }

    const d = res.message;
    return NextResponse.json({
      success: true,
      data: {
        id: d.name,
        driver: d.driver,
        driverName: d.driver_name,
        documentCategory: d.document_category,
        documentNumber: d.document_number,
        issueDate: d.issue_date,
        expiryDate: d.expiry_date,
        issuingAuthority: d.issuing_authority,
        fileAttachment: d.file_attachment,
        fileName: d.file_name,
        fileType: d.file_type,
        verificationStatus: d.verification_status,
        verifiedBy: d.verified_by,
        verificationDate: d.verification_date,
        rejectionReason: d.rejection_reason,
        remarks: d.remarks,
        replacedDocument: d.replaced_document,
        isActive: Boolean(d.is_active),
        uploadedBy: d.uploaded_by,
        uploadDate: d.upload_date,
        isTestRecord: Boolean(d.is_test_record),
      },
    });
  } catch (error: any) {
    console.error('Driver document GET [id] error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
        { success: false, error: 'Forbidden: Insufficient permissions to verify documents.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { verificationStatus, rejectionReason, isActive } = body;

    if (verificationStatus && !PERMITTED_STATUSES.includes(verificationStatus)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid verification status '${verificationStatus}'. Permitted: ${PERMITTED_STATUSES.join(', ')}`,
        },
        { status: 400 }
      );
    }

    if (verificationStatus === 'Rejected' && !rejectionReason) {
      return NextResponse.json(
        { success: false, error: 'Rejection reason is required when rejecting a document.' },
        { status: 400 }
      );
    }

    if (verificationStatus) {
      await updateDriverDocumentStatus(
        `sid=${auth.sid}`,
        id,
        verificationStatus,
        auth.user.email || auth.user.name,
        rejectionReason
      );
    }

    if (typeof isActive === 'boolean') {
      await callFrappeApi('/api/method/frappe.client.set_value', `sid=${auth.sid}`, {
        method: 'POST',
        body: JSON.stringify({
          doctype: 'Driver Document',
          name: id,
          fieldname: { is_active: isActive ? 1 : 0 },
        }),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Driver document '${id}' updated successfully.`,
    });
  } catch (error: any) {
    console.error('Driver document PATCH [id] error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Fetch document to verify ownership or test status
    const queryParams = new URLSearchParams({
      doctype: 'Driver Document',
      name: id,
    });

    const getRes = await callFrappeApi(
      `/api/method/frappe.client.get?${queryParams.toString()}`,
      `sid=${auth.sid}`,
      { method: 'GET' }
    );

    if (!getRes.message) {
      return NextResponse.json(
        { success: false, error: `Driver document '${id}' not found.` },
        { status: 404 }
      );
    }

    const isTestRecord = Boolean(getRes.message.is_test_record);
    const isAdmin = auth.user.role === 'Administrator';

    if (!isAdmin && !isTestRecord) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only administrators can delete genuine documents.' },
        { status: 403 }
      );
    }

    await callFrappeApi('/api/method/frappe.client.delete', `sid=${auth.sid}`, {
      method: 'POST',
      body: JSON.stringify({
        doctype: 'Driver Document',
        name: id,
      }),
    });

    return NextResponse.json({
      success: true,
      message: `Driver document '${id}' deleted successfully.`,
    });
  } catch (error: any) {
    console.error('Driver document DELETE [id] error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}

