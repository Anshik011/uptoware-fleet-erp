import { NextRequest, NextResponse } from 'next/server';
import { getInsuranceOptions } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';

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
        { success: false, error: 'Forbidden: Insufficient role permissions.' },
        { status: 403 }
      );
    }

    const options = await getInsuranceOptions(auth.sid);

    return NextResponse.json({
      success: true,
      ...options,
    });
  } catch (error: any) {
    console.error('Error fetching insurance options:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while fetching options' },
      { status: error.status || 500 }
    );
  }
}

