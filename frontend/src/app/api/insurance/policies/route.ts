import { NextRequest, NextResponse } from 'next/server';
import { getInsurancePolicies, createInsurancePolicy } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission, isAuthorizedForTestRecords } from '@/lib/auth';
import { CreateInsurancePolicyInput } from '@/types/fleet';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'insurance', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions for insurance policies.' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || undefined;
    const status = searchParams.get('status') || undefined;
    const policyType = searchParams.get('policy_type') || undefined;
    const vehicle = searchParams.get('vehicle') || undefined;
    const showTestRecords =
      isAuthorizedForTestRecords(auth.user) && searchParams.get('include_test') === 'true';

    const { policies, metrics } = await getInsurancePolicies(auth.sid, {
      search,
      status,
      policyType,
      vehicle,
      showTestRecords,
    });

    let filtered = policies;
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.policyNo.toLowerCase().includes(q) ||
          p.vehicle.toLowerCase().includes(q) ||
          p.insuranceCompany.toLowerCase().includes(q) ||
          p.id.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({
      success: true,
      policies: filtered,
      data: filtered,
      metrics,
      totalCount: filtered.length,
    });
  } catch (error: any) {
    console.error('Error fetching insurance policies:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while fetching insurance policies' },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'insurance', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to create insurance policies.' },
        { status: 403 }
      );
    }

    const body: CreateInsurancePolicyInput = await request.json();

    if (!body.vehicle || !body.vehicle.trim()) {
      return NextResponse.json(
        { success: false, error: 'Vehicle is mandatory for insurance policy.' },
        { status: 400 }
      );
    }
    if (!body.policyNo || !body.policyNo.trim()) {
      return NextResponse.json(
        { success: false, error: 'Policy Number is mandatory.' },
        { status: 400 }
      );
    }
    if (!body.insuranceCompany || !body.insuranceCompany.trim()) {
      return NextResponse.json(
        { success: false, error: 'Insurance Company is mandatory.' },
        { status: 400 }
      );
    }
    if (!body.startDate || !body.endDate) {
      return NextResponse.json(
        { success: false, error: 'Start Date and End Date are mandatory.' },
        { status: 400 }
      );
    }

    const policy = await createInsurancePolicy(auth.sid, body);

    return NextResponse.json(
      { success: true, policy, message: 'Insurance policy created successfully.' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error creating insurance policy:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while creating insurance policy' },
      { status: error.status || 500 }
    );
  }
}
