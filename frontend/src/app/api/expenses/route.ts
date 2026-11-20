import { NextRequest, NextResponse } from 'next/server';
import { getExpenses, createExpense } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission, isAuthorizedForTestRecords } from '@/lib/auth';
import { resolveUserMineScope, validateAndResolveMineFilter, validateWriteMineSite, MineAuthorizationError } from '@/lib/mineAuth';
import { CreateExpenseInput, ExpenseCategory } from '@/types/fleet';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'ALL';
    const category = searchParams.get('category') || undefined;
    const vehicle = searchParams.get('vehicle') || undefined;
    const miningTrip = searchParams.get('mining_trip') || undefined;
    const mineSite = searchParams.get('mine_site') || undefined;
    const fromDate = searchParams.get('from_date') || undefined;
    const toDate = searchParams.get('to_date') || undefined;
    const query = searchParams.get('q')?.toLowerCase().trim();
    if (searchParams.get('include_test') === 'true' && !isAuthorizedForTestRecords(auth.user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Access to test records requires Administrator or System Manager privileges.' },
        { status: 403 }
      );
    }
    const includeTest = isAuthorizedForTestRecords(auth.user) && searchParams.get('include_test') === 'true';

    const mineScope = await resolveUserMineScope(request);
    const mineFilter = validateAndResolveMineFilter(mineScope, searchParams.get('mine_site'));

    const { expenses, metrics } = await getExpenses(auth.sid, {
      status: status !== 'ALL' ? status : undefined,
      category: category && category !== 'ALL' ? category : undefined,
      vehicle: vehicle && vehicle !== 'ALL' ? vehicle : undefined,
      miningTrip: miningTrip && miningTrip !== 'ALL' ? miningTrip : undefined,
      mineSite: mineFilter.filterType === 'single' ? mineFilter.targetMine : undefined,
      fromDate,
      toDate,
      includeTest,
    });

    let filtered = expenses;
    if (mineFilter.filterType === 'list' && mineFilter.targetMines) {
      filtered = filtered.filter((e) => e.mineSite && mineFilter.targetMines!.includes(e.mineSite));
    }
    if (query) {
      filtered = filtered.filter(
        (e) =>
          e.id.toLowerCase().includes(query) ||
          (e.vehicle && e.vehicle.toLowerCase().includes(query)) ||
          (e.miningTrip && e.miningTrip.toLowerCase().includes(query)) ||
          (e.mineSite && e.mineSite.toLowerCase().includes(query)) ||
          (e.driver && e.driver.toLowerCase().includes(query)) ||
          (e.supplier && e.supplier.toLowerCase().includes(query)) ||
          (e.payeeName && e.payeeName.toLowerCase().includes(query)) ||
          (e.billReference && e.billReference.toLowerCase().includes(query)) ||
          (e.description && e.description.toLowerCase().includes(query)) ||
          e.expenseCategory.toLowerCase().includes(query)
      );
    }

    return NextResponse.json(
      {
        success: true,
        metrics,
        count: filtered.length,
        expenses: filtered,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: unknown) {
    if (error instanceof MineAuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    const err = error as { message?: string; status?: number };
    console.error('API /expenses GET error:', err?.message || 'Error');
    const status = err?.status || 500;
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to fetch operational expenses.' },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
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
        { success: false, error: 'Forbidden: Insufficient role permissions to record expense.' },
        { status: 403 }
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

    const expenseCategory = body.expenseCategory || body.category;
    const {
      amount,
      expenseDate,
      vehicle,
      miningTrip,
      mineSite,
      driver,
      supplier,
      payeeName,
      paymentMethod,
      billReference,
      receiptAttachment,
      description,
      expenseAccount,
      paymentAccount,
      costCenter,
      isTestRecord,
    } = body;

    // Field Validations
    if (!expenseCategory || typeof expenseCategory !== 'string' || !expenseCategory.trim()) {
      return NextResponse.json(
        { success: false, error: 'Expense category is strictly mandatory.' },
        { status: 400 }
      );
    }

    if (amount == null || isNaN(Number(amount)) || Number(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'Expense amount must be a positive number greater than 0.' },
        { status: 400 }
      );
    }

    if (!expenseDate || typeof expenseDate !== 'string' || !expenseDate.trim()) {
      return NextResponse.json(
        { success: false, error: 'Expense date is strictly mandatory.' },
        { status: 400 }
      );
    }

    if (!mineSite || typeof mineSite !== 'string' || !mineSite.trim()) {
      return NextResponse.json(
        { success: false, error: 'Mine Site is strictly mandatory for operational expense.' },
        { status: 400 }
      );
    }

    const mineScope = await resolveUserMineScope(request);
    validateWriteMineSite(mineScope, mineSite);

    const input: CreateExpenseInput = {
      expenseCategory: expenseCategory.trim() as ExpenseCategory,
      amount: Number(amount),
      expenseDate: expenseDate.trim(),
      vehicle: vehicle ? String(vehicle).trim() : undefined,
      miningTrip: miningTrip ? String(miningTrip).trim() : undefined,
      mineSite: mineSite ? String(mineSite).trim() : undefined,
      driver: driver ? String(driver).trim() : undefined,
      supplier: supplier ? String(supplier).trim() : undefined,
      payeeName: payeeName ? String(payeeName).trim() : undefined,
      paymentMethod: paymentMethod ? String(paymentMethod).trim() : undefined,
      billReference: billReference ? String(billReference).trim() : undefined,
      receiptAttachment: receiptAttachment ? String(receiptAttachment).trim() : undefined,
      description: description ? String(description).trim() : undefined,
      expenseAccount: expenseAccount ? String(expenseAccount).trim() : undefined,
      paymentAccount: paymentAccount ? String(paymentAccount).trim() : undefined,
      costCenter: costCenter ? String(costCenter).trim() : undefined,
      isTestRecord: Boolean(isTestRecord),
    };

    const expense = await createExpense(auth.sid, input);

    return NextResponse.json(
      {
        success: true,
        message: `Expense '${expense.id}' created successfully.`,
        expense,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    if (error instanceof MineAuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    const err = error as { message?: string; status?: number };
    console.error('API /expenses POST error:', err?.message || 'Error');
    const status = err?.status || 500;
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to record operational expense.' },
      { status }
    );
  }
}
