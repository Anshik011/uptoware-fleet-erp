import { NextRequest, NextResponse } from 'next/server';
import {
  createPaymentEntry,
  findPaymentEntryByReference,
  getPaymentEntries,
  getPendingDraftAllocationsForInvoice,
  getSubmittedSalesInvoiceForAllocation,
} from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission, isAuthorizedForTestRecords } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid operational session required.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!checkPermission(auth.user, 'collections', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to view collections register.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { searchParams } = request.nextUrl;
    const includeTest =
      isAuthorizedForTestRecords(auth.user) && searchParams.get('include_test') === 'true';

    const filters = {
      customer: searchParams.get('customer') || undefined,
      modeOfPayment: searchParams.get('mode_of_payment') || undefined,
      fromDate: searchParams.get('from_date') || undefined,
      toDate: searchParams.get('to_date') || undefined,
    };

    const payments = await getPaymentEntries(auth.sid, filters, includeTest);

    // Summary statistics
    let totalReceived = 0;
    let totalAllocated = 0;
    let totalUnallocated = 0;
    const modeBreakdown: Record<string, { mode: string; count: number; amount: number }> = {};
    const customerBreakdown: Record<string, { customer: string; count: number; amount: number }> = {};

    for (const p of payments) {
      totalReceived += p.receivedAmount;
      totalAllocated += p.allocatedAmount;
      totalUnallocated += p.unallocatedAmount;

      const m = p.modeOfPayment || 'Other';
      if (!modeBreakdown[m]) {
        modeBreakdown[m] = { mode: m, count: 0, amount: 0 };
      }
      modeBreakdown[m].count++;
      modeBreakdown[m].amount += p.receivedAmount;

      const c = p.partyName || p.party;
      if (!customerBreakdown[c]) {
        customerBreakdown[c] = { customer: c, count: 0, amount: 0 };
      }
      customerBreakdown[c].count++;
      customerBreakdown[c].amount += p.receivedAmount;
    }

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        is_test_included: includeTest,
        totalCount: payments.length,
        summary: {
          totalReceived,
          totalAllocated,
          totalUnallocated,
          totalCollectionsCount: payments.length,
        },
        paymentModes: Object.values(modeBreakdown),
        customers: Object.values(customerBreakdown),
        payments,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error('API /api/finance/collections error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch collections' },
      { status: error?.status || 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid operational session required.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!checkPermission(auth.user, 'collections', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to record payments.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Malformed JSON payload expected.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const {
      party,
      amount,
      modeOfPayment,
      referenceNo,
      referenceDate,
      invoices = [],
      customIsTestRecord,
    } = body;

    if (!party || typeof party !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Party (customer) is required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!amount || typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Valid payment amount is required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!modeOfPayment || typeof modeOfPayment !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Payment mode is required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!Array.isArray(invoices) || invoices.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one invoice allocation is required.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (referenceNo && typeof referenceNo === 'string' && referenceNo.trim()) {
      const existingPayment = await findPaymentEntryByReference(auth.sid, party, referenceNo.trim());
      if (existingPayment) {
        return NextResponse.json(
          {
            success: false,
            error: `Payment Entry '${existingPayment.id}' already exists with reference number '${referenceNo.trim()}' for party '${party}'.`,
          },
          { status: 400, headers: { 'Cache-Control': 'no-store' } }
        );
      }
    }

    const validationErrors: string[] = [];
    const references: Array<{
      referenceDoctype: 'Sales Invoice';
      referenceName: string;
      totalAmount: number;
      outstandingAmount: number;
      allocatedAmount: number;
    }> = [];
    let totalAllocation = 0;
    const seenInvoiceIds = new Set<string>();

    for (const invRef of invoices) {
      const invoiceId = typeof invRef === 'string' ? invRef : invRef.id;
      const allocationAmount = typeof invRef === 'object' ? invRef.amount : null;

      if (!invoiceId || typeof invoiceId !== 'string') {
        validationErrors.push('Invalid invoice reference.');
        continue;
      }

      if (seenInvoiceIds.has(invoiceId)) {
        validationErrors.push(`Duplicate invoice reference: ${invoiceId}.`);
        continue;
      }
      seenInvoiceIds.add(invoiceId);

      if (allocationAmount === null || allocationAmount === undefined) {
        validationErrors.push(`Allocation amount is required for invoice ${invoiceId}.`);
        continue;
      }

      if (typeof allocationAmount !== 'number' || !Number.isFinite(allocationAmount) || allocationAmount <= 0) {
        validationErrors.push(`Allocation for invoice ${invoiceId} must be a positive number.`);
        continue;
      }

      const invoice = await getSubmittedSalesInvoiceForAllocation(auth.sid, invoiceId);
      if (!invoice) {
        validationErrors.push(`Invoice ${invoiceId} not found or not submitted.`);
        continue;
      }

      if (invoice.customer !== party) {
        validationErrors.push(`Invoice ${invoiceId} belongs to customer ${invoice.customer}, not ${party}.`);
        continue;
      }

      if (invoice.isReturn) {
        validationErrors.push(`Invoice ${invoiceId} is a credit note return.`);
        continue;
      }

      if (invoice.outstandingAmount <= 0) {
        validationErrors.push(`Invoice ${invoiceId} has no outstanding balance.`);
        continue;
      }

      const draftAllocations = await getPendingDraftAllocationsForInvoice(auth.sid, invoiceId);
      const effectiveOutstanding = invoice.outstandingAmount - draftAllocations;

      if (effectiveOutstanding <= 0) {
        validationErrors.push(
          `Invoice ${invoiceId} has no available balance for allocation (₹${draftAllocations.toFixed(2)} pending in draft payment entries).`
        );
        continue;
      }

      if (allocationAmount > effectiveOutstanding) {
        validationErrors.push(
          `Allocation ₹${allocationAmount.toFixed(2)} exceeds invoice ${invoiceId} available balance ₹${effectiveOutstanding.toFixed(2)}${draftAllocations > 0 ? ` (₹${draftAllocations.toFixed(2)} pending in drafts)` : ''}.`
        );
        continue;
      }

      references.push({
        referenceDoctype: 'Sales Invoice',
        referenceName: invoiceId,
        totalAmount: invoice.grandTotal,
        outstandingAmount: invoice.outstandingAmount,
        allocatedAmount: allocationAmount,
      });

      totalAllocation += allocationAmount;
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Payment validation failed.', validationErrors },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (totalAllocation > amount) {
      return NextResponse.json(
        { success: false, error: `Total allocation ₹${totalAllocation.toFixed(2)} exceeds payment amount ₹${amount.toFixed(2)}.` },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const paymentInput = {
      party,
      paidAmount: amount,
      modeOfPayment,
      referenceNo: referenceNo || undefined,
      referenceDate: referenceDate || undefined,
      references,
      custom_is_test_record: customIsTestRecord,
    };

    const paymentEntry = await createPaymentEntry(auth.sid, paymentInput);

    return NextResponse.json(
      {
        success: true,
        payment: {
          id: paymentEntry.id,
          postingDate: paymentEntry.postingDate,
          paymentType: paymentEntry.paymentType,
          party: paymentEntry.party,
          partyName: paymentEntry.partyName,
          modeOfPayment: paymentEntry.modeOfPayment,
          paidAmount: paymentEntry.paidAmount,
          receivedAmount: paymentEntry.receivedAmount,
          allocatedAmount: paymentEntry.allocatedAmount,
          unallocatedAmount: paymentEntry.unallocatedAmount,
          status: paymentEntry.status,
          isTestRecord: paymentEntry.isTestRecord,
          references: paymentEntry.references,
        },
        message: `Draft Payment Entry ${paymentEntry.id} created.`,
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    console.error('API /api/finance/collections POST error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create payment entry.' },
      { status: error?.status || 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function PUT() {
  return NextResponse.json({ success: false, error: 'Method Not Allowed' }, { status: 405, headers: { Allow: 'GET' } });
}

export async function DELETE() {
  return NextResponse.json({ success: false, error: 'Method Not Allowed' }, { status: 405, headers: { Allow: 'GET' } });
}

