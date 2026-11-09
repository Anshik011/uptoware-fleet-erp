import { NextRequest, NextResponse } from 'next/server';
import { renewInsurancePolicy } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';

export async function POST(
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

    if (!checkPermission(auth.user, 'insurance', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: You do not have permission to renew insurance policies.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    if (!body.newPolicyNo || !body.newPolicyNo.trim()) {
      return NextResponse.json(
        { success: false, error: 'New Policy Number is mandatory for renewal.' },
        { status: 400 }
      );
    }
    if (!body.startDate || !body.endDate) {
      return NextResponse.json(
        { success: false, error: 'Start Date and End Date are mandatory for renewal.' },
        { status: 400 }
      );
    }
    if (body.premiumAmount === undefined || body.premiumAmount === null) {
      return NextResponse.json(
        { success: false, error: 'Premium Amount is mandatory for renewal.' },
        { status: 400 }
      );
    }

    const policy = await renewInsurancePolicy(auth.sid, {
      policyName: id,
      newPolicyNo: body.newPolicyNo.trim(),
      startDate: body.startDate,
      endDate: body.endDate,
      premiumAmount: Number(body.premiumAmount),
      insuranceCompany: body.insuranceCompany?.trim(),
      remarks: body.remarks?.trim(),
      activateNow: Boolean(body.activateNow),
    });

    return NextResponse.json(
      { success: true, policy, message: 'Policy renewed successfully.' },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Error renewing insurance policy:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while renewing policy' },
      { status: error.status || 500 }
    );
  }
}

