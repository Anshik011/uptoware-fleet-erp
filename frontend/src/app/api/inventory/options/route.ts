import { NextRequest, NextResponse } from 'next/server';
import { getInventoryOptions } from '@/lib/frappe';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    const options = await getInventoryOptions(auth.sid);

    return NextResponse.json({
      success: true,
      ...options,
    });
  } catch (error: any) {
    console.error('Error fetching inventory options:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error while fetching inventory options' },
      { status: error.status || 500 }
    );
  }
}

