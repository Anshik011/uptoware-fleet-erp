import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { deleteEmployee, updateEmployee, getEmployeeDetails, updateDriver } from '@/lib/frappe';

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
    if (body.personalEmail !== undefined) payload.personal_email = body.personalEmail;
    if (body.status !== undefined) payload.status = body.status;
    if (body.dailySalary !== undefined) payload.custom_daily_salary = Number(body.dailySalary);
    if (body.mineSite !== undefined || body.customMineSite !== undefined) {
      payload.custom_mine_site = body.mineSite || body.customMineSite;
    }
    if (body.assignedVehicle !== undefined) payload.custom_assigned_vehicle = body.assignedVehicle || null;
    if (body.bankName !== undefined) payload.bank_name = body.bankName;
    if (body.bankAcNo !== undefined || body.bankAccountNo !== undefined) {
      payload.bank_ac_no = body.bankAcNo || body.bankAccountNo;
    }
    if (body.ifscCode !== undefined) payload.custom_ifsc_code = body.ifscCode;
    if (body.aadhaarNo !== undefined) payload.custom_aadhaar_no = body.aadhaarNo;
    if (body.panNo !== undefined) payload.custom_pan_no = body.panNo;
    if (body.fatherOrSpouseName !== undefined) payload.father_or_spouse_name = body.fatherOrSpouseName;
    if (body.presentAddress !== undefined) payload.current_address = body.presentAddress;
    if (body.permanentAddress !== undefined) payload.permanent_address = body.permanentAddress;
    if (body.dateOfBirth !== undefined) payload.date_of_birth = body.dateOfBirth;
    if (body.dateOfJoining !== undefined) payload.date_of_joining = body.dateOfJoining;
    if (body.relievingDate !== undefined) payload.relieving_date = body.relievingDate;
    if (body.gender !== undefined) payload.gender = body.gender;
    if (body.skillCategory !== undefined) payload.skill_category = body.skillCategory;
    if (body.pfType !== undefined) payload.pf_type = body.pfType;
    if (body.uanOrCmpfNo !== undefined) payload.uan_or_cmpf_no = body.uanOrCmpfNo;
    if (body.socialCategory !== undefined) payload.social_category = body.socialCategory;
    if (body.dlNo !== undefined) payload.driving_license_number = body.dlNo;
    if (body.dlValidity !== undefined) payload.driving_license_validity = body.dlValidity;
    if (body.vtNo !== undefined) payload.vt_no = body.vtNo;
    if (body.vtPeriod !== undefined) payload.vt_period = body.vtPeriod;
    if (body.formO !== undefined) payload.form_o_done = body.formO;

    const updated = await updateEmployee(`sid=${auth.sid}`, decodedId, payload);

    // If driverStatus or DL validity is updated, synchronize to linked driver
    if (body.driverStatus !== undefined || body.dlValidity !== undefined || body.dlNo !== undefined) {
      try {
        const empDetails = await getEmployeeDetails(`sid=${auth.sid}`, decodedId);
        if (empDetails?.linkedDriverId) {
          const driverUpdates: any = {};
          if (body.driverStatus) driverUpdates.status = body.driverStatus;
          if (body.dlNo) driverUpdates.licenseNumber = body.dlNo;
          if (body.dlValidity) driverUpdates.expiryDate = body.dlValidity;
          await updateDriver(auth.sid, empDetails.linkedDriverId, driverUpdates);
        }
      } catch (syncErr) {
        console.warn('Syncing driver status from employee update:', syncErr);
      }
    }

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
