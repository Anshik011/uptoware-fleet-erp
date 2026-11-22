import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { deleteEmployee, updateEmployee, getEmployeeDetails } from '@/lib/frappe';

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

    if (!checkPermission(auth.user, 'employees', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const decodedId = decodeURIComponent(id).trim();
    const data = await getEmployeeDetails(`sid=${auth.sid}`, decodedId);

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch employee.' },
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
        { success: false, error: 'Unauthorized: Session required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'employees', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to edit employees.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const decodedId = decodeURIComponent(id).trim();
    const body = await request.json();

    const payload: any = {};
    if (body.firstName !== undefined) payload.first_name = body.firstName;
    if (body.lastName !== undefined) payload.last_name = body.lastName;
    if (body.designation !== undefined) payload.designation = body.designation;
    if (body.department !== undefined) payload.department = body.department;
    if (body.cellNumber !== undefined) payload.cell_number = body.cellNumber;
    if (body.companyEmail !== undefined) payload.company_email = body.companyEmail;
    if (body.status !== undefined) payload.status = body.status;
    if (body.dailySalary !== undefined) payload.custom_daily_salary = Number(body.dailySalary);
    if (body.mineSite !== undefined || body.customMineSite !== undefined) {
      payload.custom_mine_site = body.mineSite || body.customMineSite;
    }
    if (body.bankName !== undefined) payload.bank_name = body.bankName;
    if (body.bankAcNo !== undefined || body.bankAccountNo !== undefined) {
      payload.bank_ac_no = body.bankAcNo || body.bankAccountNo;
    }
    if (body.ifscCode !== undefined) payload.custom_ifsc_code = body.ifscCode;
    if (body.socialCategory !== undefined) payload.social_category = body.socialCategory;

    const updated = await updateEmployee(`sid=${auth.sid}`, decodedId, payload);

    return NextResponse.json({
      success: true,
      data: updated,
      message: `Employee ${decodedId} updated successfully.`,
    });
  } catch (error: any) {
    console.error('API /employees/[id] PUT error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update employee.' },
      { status: error.status || 500 }
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

    if (!checkPermission(auth.user, 'employees', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to delete employees.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const decodedId = decodeURIComponent(id).trim();

    await deleteEmployee(`sid=${auth.sid}`, decodedId);

    return NextResponse.json({
      success: true,
      message: `Employee ${decodedId} deleted successfully.`,
    });
  } catch (error: any) {
    console.error('API /employees/[id] DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete employee.' },
      { status: error.status || 500 }
    );
  }
}
