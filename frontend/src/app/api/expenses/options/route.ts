import { NextRequest, NextResponse } from 'next/server';
import { getExpenseOptions } from '@/lib/frappe';
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

    const options = await getExpenseOptions(auth.sid);

    return NextResponse.json(
      {
        success: true,
        ...options,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('API /expenses/options GET error:', err?.message || 'Error');
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch expense options.' },
      { status: 500 }
    );
  }
}
