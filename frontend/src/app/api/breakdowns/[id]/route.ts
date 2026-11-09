import { NextRequest, NextResponse } from 'next/server';
import { getBreakdownDetails, updateBreakdown } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { UpdateBreakdownInput } from '@/types/fleet';

export async function GET(
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

    if (!checkPermission(auth.user, 'breakdowns', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid breakdown ID parameter.' },
        { status: 400 }
      );
    }

    const breakdown = await getBreakdownDetails(auth.sid, id);

    return NextResponse.json(
      {
        success: true,
        breakdown,
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
    console.error('API /breakdowns/[id] GET error:', err?.message || 'Error');
    const status = err?.status || 500;
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch breakdown details.' },
      { status }
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
        { success: false, error: 'Unauthorized: Session authentication required.' },
        { status: 401 }
      );
    }

    if (!checkPermission(auth.user, 'breakdowns', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to update breakdown.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid breakdown ID parameter.' },
        { status: 400 }
      );
    }

    let body: UpdateBreakdownInput = {};
    try {
      body = (await request.json()) as UpdateBreakdownInput;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body. Expected JSON payload.' },
        { status: 400 }
      );
    }

    const updated = await updateBreakdown(auth.sid, id, body);

    return NextResponse.json({
      success: true,
      message: `Breakdown '${id}' updated successfully.`,
      breakdown: updated,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('API /breakdowns/[id] PATCH error:', err?.message || 'Error');
    const status = err?.status || 500;
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update breakdown.' },
      { status }
    );
  }
}

