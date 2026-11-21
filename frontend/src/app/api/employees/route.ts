import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { getEmployees, createEmployee } from '@/lib/frappe';

export async function GET(request: NextRequest) {
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
        { success: false, error: 'Forbidden: Insufficient permissions to view employees.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!, 10) : 100;

    const employees = await getEmployees(`sid=${auth.sid}`, { status, limit });

    return NextResponse.json({
      success: true,
      data: employees,
      count: employees.length,
    });
  } catch (error: any) {
    console.error('Employees GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error fetching employees.' },
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

    if (!checkPermission(auth.user, 'employees', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient permissions to create employees.' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      firstName,
      lastName,
      cellNumber,
      companyEmail,
      personalEmail,
      department,
      designation,
      branch,
      status,
      mineSite,
      assignedVehicle,
      dailySalary,
      ifscCode,
      aadhaarNo,
      panNo,
      dateOfJoining,
      relievingDate,
      bankAccountNo,
      bankName,
      fatherOrSpouseName,
      presentAddress,
      permanentAddress,
      dateOfBirth,
      gender,
      skillCategory,
      pfType,
      uanOrCmpfNo,
      socialCategory,
      dlNo,
      dlValidity,
      vtNo,
      vtPeriod,
      formO,
    } = body;

    if (!firstName || typeof firstName !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Validation Error: First name is required.' },
        { status: 400 }
      );
    }

    const created = await createEmployee(`sid=${auth.sid}`, {
      firstName,
      lastName,
      cellNumber,
      companyEmail,
      personalEmail,
      department,
      designation,
      branch,
      status: status || 'Active',
      customMineSite: mineSite,
      assignedVehicle,
      dailySalary: dailySalary ? Number(dailySalary) : 0,
      ifscCode,
      aadhaarNo,
      panNo,
      dateOfJoining: dateOfJoining || null,
      relievingDate: relievingDate || null,
      bankAcNo: bankAccountNo || null,
      bankName: bankName || null,
      fatherOrSpouseName: fatherOrSpouseName || null,
      presentAddress: presentAddress || null,
      permanentAddress: permanentAddress || null,
      dateOfBirth: dateOfBirth || null,
      gender: gender || null,
      skillCategory: skillCategory || 'SKILL',
      pfType: pfType || 'CMPF',
      uanOrCmpfNo: uanOrCmpfNo || null,
      socialCategory: socialCategory || 'GENERAL',
      dlNo: dlNo || null,
      dlValidity: dlValidity || null,
      vtNo: vtNo || null,
      vtPeriod: vtPeriod || null,
      formO: formO || 'YES',
    } as any);

    return NextResponse.json(
      {
        success: true,
        data: created,
        message: 'Employee created successfully in ERPNext.',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Employees POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error creating employee.' },
      { status: 500 }
    );
  }
}

