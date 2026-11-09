import { NextRequest, NextResponse } from 'next/server';
import { applyExpenseWorkflow } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { ExpenseWorkflowAction } from '@/types/fleet';

const VALID_ACTIONS: ExpenseWorkflowAction[] = [
  'Submit for Approval',
  'Approve',
  'Reject',
  'Re-open',
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

    if (!checkPermission(auth.user, 'expenses', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to execute expense transition.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid expense ID parameter.' },
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

    const { action, rejectionReason } = body;

    if (!action || typeof action !== 'string' || !VALID_ACTIONS.includes(action.trim() as ExpenseWorkflowAction)) {
      return NextResponse.json(
        {
          success: false,
          error: `Invalid workflow action '${action}'. Permitted actions: ${VALID_ACTIONS.join(', ')}`,
        },
        { status: 400 }
      );
    }

    const trimmedAction = action.trim() as ExpenseWorkflowAction;

    // Strict validation for Reject: mandatory non-empty reason
    if (trimmedAction === 'Reject') {
      if (!rejectionReason || typeof rejectionReason !== 'string' || !rejectionReason.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: 'Rejection reason is strictly mandatory when rejecting an expense record.',
          },
          { status: 400 }
        );
      }
    }

    const updated = await applyExpenseWorkflow(auth.sid, id, trimmedAction, {
      rejectionReason: rejectionReason ? String(rejectionReason).trim() : undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Expense '${id}' transitioned successfully via '${trimmedAction}'.`,
      expense: updated,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('API /expenses/[id]/transition POST error:', err?.message || 'Error');
    const status = err?.status || 500;
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to execute expense workflow transition.' },
      { status }
    );
  }
}

