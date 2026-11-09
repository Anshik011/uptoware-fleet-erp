import { NextRequest, NextResponse } from 'next/server';
import { applyFuelTransition } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';

const VALID_ACTIONS = ['Approve', 'Reject', 'Re-open'];

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

    if (!checkPermission(auth.user, 'fuel', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to transition Fuel Logs.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid fuel log identifier.' },
        { status: 400 }
      );
    }

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body. Expected JSON payload.' },
        { status: 400 }
      );
    }

    const action = body.action;
    const rejectionReason = body.rejectionReason;

    if (!action || typeof action !== 'string' || !VALID_ACTIONS.includes(action.trim())) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid transition action '${action}'. Permitted actions: ${VALID_ACTIONS.join(', ')}.`,
        },
        { status: 400 }
      );
    }

    const trimmedAction = action.trim();

    if (trimmedAction === 'Reject') {
      if (!rejectionReason || typeof rejectionReason !== 'string' || !rejectionReason.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: 'A rejection reason is strictly required when rejecting a Fuel Log.',
          },
          { status: 400 }
        );
      }
    }

    if (trimmedAction === 'Approve') {
      if (auth.user.role !== 'Fleet Manager' && auth.user.role !== 'Administrator') {
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden: Only Fleet Managers and Administrators are authorized to approve Fuel Logs.',
          },
          { status: 403 }
        );
      }
    }

    const updatedLog = await applyFuelTransition(
      auth.sid,
      id,
      {
        action: trimmedAction,
        rejectionReason:
          typeof rejectionReason === 'string' && rejectionReason.trim()
            ? rejectionReason.trim()
            : undefined,
      },
      auth.user
    );

    return NextResponse.json({ success: true, data: updatedLog });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('API /fuel/[id]/transition error:', err?.message || 'Error');
    const msg = err?.message || '';
    const status =
      err?.status === 403 ||
      msg.includes('Forbidden') ||
      msg.includes('Self-approval') ||
      msg.includes('Unauthorized') ||
      msg.includes('not permitted')
        ? 403
        : err?.status === 417 || msg.includes('ValidationError') || msg.includes('cannot')
          ? 400
          : err?.status || 500;
    return NextResponse.json(
      { success: false, error: msg || 'Failed to apply fuel workflow transition.' },
      { status }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}

