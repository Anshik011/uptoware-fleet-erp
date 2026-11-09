import { NextRequest, NextResponse } from 'next/server';
import { getMiningTripById } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid operational session required.' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            Pragma: 'no-cache',
          },
        }
      );
    }

    if (!checkPermission(auth.user, 'trips', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient operational role permissions.' },
        {
          status: 403,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            Pragma: 'no-cache',
          },
        }
      );
    }

    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid trip identifier parameter.' },
        { status: 400 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const includeTest = searchParams.get('include_test') === 'true';

    const details = await getMiningTripById(auth.sid, id, includeTest);
    if (!details || !details.trip) {
      return NextResponse.json(
        { success: false, error: `Mining trip '${id}' not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, data: details },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error('API /trips/[id] GET error:', error?.message || 'Error');
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch mining trip details.' },
      { status }
    );
  }
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Forbidden: Operational trip record deletion is prohibited.' },
    { status: 403, headers: { Allow: 'GET' } }
  );
}

export async function POST() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET' } }
  );
}

