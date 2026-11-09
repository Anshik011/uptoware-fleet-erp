import { NextRequest, NextResponse } from 'next/server';
import { applyTripTransition } from '@/lib/frappe';
import { getAuthenticatedUser } from '@/lib/auth';
import { TripTransitionInput } from '@/types/fleet';

const VALID_ACTIONS = [
  'Dispatch',
  'Confirm Weighbridge',
  'Approve',
  'Mark Delivered',
  'Cancel',
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid operational session required.' },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid trip identifier parameter.' },
        { status: 400 }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid request body. Expected JSON payload.' },
        { status: 400 }
      );
    }

    const {
      action,
      grossWeightTons,
      tareWeightTons,
      closingOdometer,
      returnDateTime,
      cancellationReason,
    } = body;

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

    // Specific input validations
    if (trimmedAction === 'Cancel') {
      if (!cancellationReason || typeof cancellationReason !== 'string' || !cancellationReason.trim()) {
        return NextResponse.json(
          {
            success: false,
            error: 'A cancellation reason is strictly required when cancelling a Mining Trip.',
          },
          { status: 400 }
        );
      }
    }

    if (trimmedAction === 'Confirm Weighbridge') {
      if (grossWeightTons == null || tareWeightTons == null) {
        return NextResponse.json(
          {
            success: false,
            error: 'Gross weight and tare weight are mandatory for weighbridge confirmation.',
          },
          { status: 400 }
        );
      }
      const gross = Number(grossWeightTons);
      const tare = Number(tareWeightTons);
      if (isNaN(gross) || isNaN(tare) || gross <= 0 || tare <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Gross weight and tare weight must be positive numeric values.',
          },
          { status: 400 }
        );
      }
      if (gross < tare) {
        return NextResponse.json(
          {
            success: false,
            error: `Gross weight (${gross.toFixed(3)} Tons) cannot be less than tare weight (${tare.toFixed(3)} Tons).`,
          },
          { status: 400 }
        );
      }
    }

    if (trimmedAction === 'Mark Delivered') {
      if (closingOdometer == null) {
        return NextResponse.json(
          {
            success: false,
            error: 'Closing odometer reading is mandatory to mark trip as delivered.',
          },
          { status: 400 }
        );
      }
      const odo = Number(closingOdometer);
      if (isNaN(odo) || odo <= 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Closing odometer must be a positive numeric value.',
          },
          { status: 400 }
        );
      }
    }

    const input: TripTransitionInput = {
      action: trimmedAction,
      grossWeightTons: grossWeightTons != null ? Number(grossWeightTons) : undefined,
      tareWeightTons: tareWeightTons != null ? Number(tareWeightTons) : undefined,
      closingOdometer: closingOdometer != null ? Number(closingOdometer) : undefined,
      returnDateTime: returnDateTime || undefined,
      cancellationReason: cancellationReason ? String(cancellationReason).trim() : undefined,
    };

    const updatedTrip = await applyTripTransition(auth.sid, id, input);
    return NextResponse.json({ success: true, data: updatedTrip });
  } catch (error: any) {
    console.error('API /trips/[id]/transition error:', error?.message || 'Error');
    const msg = error?.message || '';
    const status =
      error.status === 403 ||
      msg.includes('WorkflowTransitionError') ||
      msg.includes('Not a valid Workflow Action') ||
      msg.includes('Unauthorized') ||
      msg.includes('Self-approval') ||
      msg.includes('not permitted')
        ? 403
        : error.status === 404 || msg.includes('not found')
          ? 404
          : error.status === 417 || error.status === 400 || msg.includes('cannot') || msg.includes('mandatory') || msg.includes('expired')
            ? 400
            : error.status || 500;

    return NextResponse.json(
      { success: false, error: msg || 'Failed to apply workflow transition.' },
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
