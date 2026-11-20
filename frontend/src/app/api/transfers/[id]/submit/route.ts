import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser, checkPermission } from '@/lib/auth';
import { submitMineTransferLog } from '@/lib/frappe';

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

    // Submitting/approving transfers requires Administrator or Fleet Head Office Admin
    if (auth.user.role !== 'Administrator' && !auth.user.roles.includes('Fleet Head Office Admin')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Only Head Office Admin or Administrator can approve and submit mine transfers.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Transfer Log ID is required.' },
        { status: 400 }
      );
    }

    const submitted = await submitMineTransferLog(`sid=${auth.sid}`, id.trim());

    return NextResponse.json({
      success: true,
      data: submitted,
      message: `Fleet Mine Transfer Log '${id}' approved and submitted successfully.`,
    });
  } catch (error: any) {
    console.error('API /transfers/[id]/submit POST error:', error);
    let errorMsg = error.message || 'Internal server error submitting transfer log.';
    if (errorMsg.includes('ValidationError:')) {
      errorMsg = errorMsg.split('ValidationError:')[1].split('\n')[0].trim();
    }
    return NextResponse.json(
      { success: false, error: errorMsg },
      { status: error.status || 400 }
    );
  }
}

