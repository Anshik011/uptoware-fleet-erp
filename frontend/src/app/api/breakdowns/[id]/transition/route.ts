import { NextRequest, NextResponse } from 'next/server';
import { applyBreakdownWorkflow } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { BreakdownWorkflowAction } from '@/types/fleet';

const VALID_ACTIONS: BreakdownWorkflowAction[] = [
  'Approve',
  'Reject',
  'Send to Workshop',
  'Request Parts',
  'Parts Received',
  'Mark Repaired',
  'Close Breakdown',
];

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

    if (!checkPermission(auth.user, 'breakdowns', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to execute breakdown transition.' },
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

    let body: Record<string, unknown> = {};
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body. Expected JSON payload.' },
        { status: 400 }
      );
    }

    const { action, repairDetails, laborCost, parts, rejectionReason } = body;

    if (!action || typeof action !== 'string' || !VALID_ACTIONS.includes(action.trim() as BreakdownWorkflowAction)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid workflow action '${action}'. Permitted actions: ${VALID_ACTIONS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const trimmedAction = action.trim() as BreakdownWorkflowAction;

    // Strict validation for Reject: mandatory non-empty reason
    if (trimmedAction === 'Reject') {
      if (!rejectionReason || typeof rejectionReason !== 'string' || !rejectionReason.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rejection reason is strictly mandatory when rejecting a breakdown incident.',
          },
          { status: 400 }
        );
      }
    }

    const updated = await applyBreakdownWorkflow(auth.sid, id, trimmedAction, {
      repairDetails: repairDetails ? String(repairDetails).trim() : undefined,
      laborCost: laborCost != null ? Number(laborCost) : undefined,
      parts: Array.isArray(parts) ? parts : undefined,
      rejectionReason: rejectionReason ? String(rejectionReason).trim() : undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Breakdown '${id}' transitioned successfully via '${trimmedAction}'.`,
      breakdown: updated,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('API /breakdowns/[id]/transition POST error:', err?.message || 'Error');
    const status = err?.status || 500;
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to execute breakdown workflow transition.' },
      { status }
    );
  }
}

