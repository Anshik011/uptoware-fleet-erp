import { NextRequest, NextResponse } from 'next/server';
import { getExpenseDetails, updateExpense } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { UpdateExpenseInput } from '@/types/fleet';

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

    if (!checkPermission(auth.user, 'expenses', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions.' },
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

    const expense = await getExpenseDetails(auth.sid, id);

    return NextResponse.json(
      {
        success: true,
        expense,
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
    console.error('API /expenses/[id] GET error:', err?.message || 'Error');
    const status = err?.status || 500;
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch expense details.' },
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

    if (!checkPermission(auth.user, 'expenses', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to update expense.' },
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

    let body: UpdateExpenseInput = {};
    try {
      body = (await request.json()) as UpdateExpenseInput;
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body. Expected JSON payload.' },
        { status: 400 }
      );
    }

    const updated = await updateExpense(auth.sid, id, body);

    return NextResponse.json({
      success: true,
      message: `Expense '${id}' updated successfully.`,
      expense: updated,
    });
  } catch (error: unknown) {
    const err = error as { message?: string; status?: number };
    console.error('API /expenses/[id] PATCH error:', err?.message || 'Error');
    const status = err?.status || 500;
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to update expense.' },
      { status }
    );
  }
}

