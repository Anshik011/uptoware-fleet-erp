import { NextRequest, NextResponse } from 'next/server';
import {
  createSalesInvoice,
  deleteSalesInvoice,
  findSalesInvoicesForTrip,
  getApprovedFleetBillingContract,
  getCustomerBillingTerms,
  getMiningTripById,
  getSalesInvoices,
  updateTripBillingReference,
  validateItemForSalesInvoice,
} from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission, isAuthorizedForTestRecords } from '@/lib/auth';
import {
  resolveUserMineScope,
  validateAndResolveMineFilter,
  validateDocumentMineOwnership,
  MineAuthorizationError,
} from '@/lib/mineAuth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid operational session required.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    if (!checkPermission(auth.user, 'revenue', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to view revenue register.' },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const { searchParams } = request.nextUrl;
    const includeTest =
      isAuthorizedForTestRecords(auth.user) && searchParams.get('include_test') === 'true';

    const mineScope = await resolveUserMineScope(request);
    const mineFilter = validateAndResolveMineFilter(mineScope, searchParams.get('mine_site') || undefined);

    const filters = {
      customer: searchParams.get('customer') || undefined,
      status: searchParams.get('status') || undefined,
      vehicle: searchParams.get('vehicle') || undefined,
      trip: searchParams.get('trip') || undefined,
      fromDate: searchParams.get('from_date') || undefined,
      toDate: searchParams.get('to_date') || undefined,
    };

    let invoices = await getSalesInvoices(auth.sid, filters, includeTest);

    if (mineFilter.filterType === 'single' && mineFilter.targetMine) {
      invoices = invoices.filter((inv) => inv.mineSite === mineFilter.targetMine);
    } else if (mineFilter.filterType === 'list' && mineFilter.targetMines) {
      invoices = invoices.filter((inv) => inv.mineSite && mineFilter.targetMines!.includes(inv.mineSite));
    }

    // Summary statistics
    let totalInvoiced = 0;
    let totalOutstanding = 0;
    let totalReturns = 0;
    let paidInvoicesCount = 0;
    const customerAggregation: Record<string, { customer: string; count: number; invoiced: number; outstanding: number }> = {};

    for (const inv of invoices) {
      if (inv.isReturn) {
        totalReturns += Math.abs(inv.baseGrandTotal);
      } else {
        totalInvoiced += inv.baseGrandTotal;
      }
      totalOutstanding += inv.outstandingAmount;
      if (inv.status === 'Paid') {
        paidInvoicesCount++;
      }

      const c = inv.customerName || inv.customer;
      if (!customerAggregation[c]) {
        customerAggregation[c] = { customer: c, count: 0, invoiced: 0, outstanding: 0 };
      }
      customerAggregation[c].count++;
      customerAggregation[c].invoiced += inv.isReturn ? -Math.abs(inv.baseGrandTotal) : inv.baseGrandTotal;
      customerAggregation[c].outstanding += inv.outstandingAmount;
    }

    const netRevenue = totalInvoiced - totalReturns;

    return NextResponse.json(
      {
        success: true,
        timestamp: new Date().toISOString(),
        is_test_included: includeTest,
        totalCount: invoices.length,
        summary: {
          totalInvoiced,
          totalReturns,
          netRevenue,
          totalOutstanding,
          paidInvoicesCount,
          totalInvoicesCount: invoices.length,
        },
        customers: Object.values(customerAggregation),
        invoices,
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
    if (error instanceof MineAuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    console.error('API /api/finance/revenue error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch sales invoices' },
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

    if (!checkPermission(auth.user, 'revenue', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient role permissions to create sales invoices.' },
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

    const { tripId } = body;
    if (!tripId || typeof tripId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Trip ID is required to create invoice.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const allowTest = isAuthorizedForTestRecords(auth.user);
    const tripDetails = await getMiningTripById(auth.sid, tripId, allowTest);
    const trip = tripDetails.trip;
    if (!trip) {
      return NextResponse.json(
        { success: false, error: `Trip ${tripId} not found or access denied.` },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const mineScope = await resolveUserMineScope(request);
    validateDocumentMineOwnership(mineScope, trip.mineSite);

    // Only Delivered trips are eligible for invoicing
    if (trip.tripStatus !== 'Delivered') {
      return NextResponse.json(
        { success: false, error: `Trip must be 'Delivered' before invoicing. Current status: ${trip.tripStatus}` },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Check if trip already carries an active invoice reference or invoiced status
    if (trip.salesInvoice || trip.billingStatus === 'Invoiced') {
      return NextResponse.json(
        {
          success: false,
          error: `Trip ${tripId} is already invoiced (Sales Invoice: ${trip.salesInvoice || 'Active'}).`,
          salesInvoice: trip.salesInvoice || undefined,
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Check for any existing invoice (Draft or Submitted) linked to this trip
    const existingInvoices = await findSalesInvoicesForTrip(auth.sid, tripId);
    if (existingInvoices.length > 0) {
      const existing = existingInvoices[0];
      return NextResponse.json(
        {
          success: false,
          error: `Invoice ${existing.id} already exists for this trip (${existing.status}).`,
          salesInvoice: existing.id,
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const mineSiteDetails = tripDetails.siteDetails;
    if (!mineSiteDetails) {
      return NextResponse.json(
        { success: false, error: `Could not resolve Mine Site information for customer assignment.` },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const customerId = mineSiteDetails.client;
    if (!customerId) {
      return NextResponse.json(
        { success: false, error: `Mine Site '${mineSiteDetails.id}' has no assigned customer for billing.` },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const confirmedWeight = trip.netWeightTons || 0;
    if (confirmedWeight <= 0) {
      return NextResponse.json(
        { success: false, error: `Trip has no confirmed net weight for billing. Weighbridge confirmation required.` },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Resolve approved billing rate and service item from Customer Contract
    const postingDate = new Date().toISOString().split('T')[0];
    const contract = await getApprovedFleetBillingContract(
      auth.sid,
      customerId,
      mineSiteDetails.id,
      postingDate
    );

    if (!contract) {
      return NextResponse.json(
        {
          success: false,
          error: `No approved billing contract found for Customer ${customerId} and Mine Site ${mineSiteDetails.id} effective ${postingDate}.`,
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Validate service Item exists and is enabled
    const validatedItem = await validateItemForSalesInvoice(auth.sid, contract.serviceItem);
    if (!validatedItem) {
      return NextResponse.json(
        {
          success: false,
          error: `Contract service item '${contract.serviceItem}' is not a valid enabled sales item in ERPNext.`,
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // Resolve Customer payment terms or leave due date to ERPNext default
    const customerBilling = await getCustomerBillingTerms(auth.sid, customerId);
    if (!customerBilling) {
      return NextResponse.json(
        { success: false, error: `Customer record ${customerId} not found.` },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const billingAmount = Math.round(confirmedWeight * contract.ratePerTon * 100) / 100;
    const invoiceInput = {
      customer: customerId,
      postingDate,
      paymentTermsTemplate: customerBilling.paymentTermsTemplate || undefined,
      items: [
        {
          itemCode: validatedItem.itemCode,
          description: `Haulage: ${mineSiteDetails.siteName} to ${trip.destination}. ${trip.materialType}. ${confirmedWeight.toFixed(3)}T @ ₹${contract.ratePerTon.toFixed(2)}/T. Contract ${contract.id}.`,
          qty: confirmedWeight,
          rate: contract.ratePerTon,
          custom_mining_trip: tripId,
          custom_vehicle: trip.vehicle,
          custom_mine_site: trip.mineSite,
        },
      ],
      custom_is_test_record: trip.isTestRecord,
      custom_mining_trip: tripId,
      custom_vehicle: trip.vehicle,
      custom_mine_site: trip.mineSite,
    };

    const draftInvoice = await createSalesInvoice(auth.sid, invoiceInput);

    // Update trip billing reference only after successful invoice creation
    try {
      await updateTripBillingReference(auth.sid, tripId, draftInvoice.id);
    } catch (updateError: any) {
      console.error(`Invoice ${draftInvoice.id} created but trip link failed:`, updateError?.message);
      // Clean up draft invoice immediately to prevent orphaned or inconsistent state
      await deleteSalesInvoice(auth.sid, draftInvoice.id).catch((delErr) => {
        console.error(`Emergency cleanup of draft invoice ${draftInvoice.id} failed:`, delErr?.message);
      });
      return NextResponse.json(
        {
          success: false,
          error: `Failed to link Sales Invoice with Mining Trip ${tripId}: ${updateError?.message || 'Update failed'}. Draft invoice was deleted to preserve data consistency.`,
        },
        { status: 500, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      {
        success: true,
        invoice: {
          id: draftInvoice.id,
          customer: customerId,
          customerName: customerBilling.customerName,
          postingDate: draftInvoice.postingDate,
          dueDate: draftInvoice.dueDate,
          grandTotal: draftInvoice.grandTotal,
          baseGrandTotal: draftInvoice.baseGrandTotal,
          outstandingAmount: draftInvoice.outstandingAmount,
          status: draftInvoice.status,
          items: draftInvoice.items,
          miningTrip: tripId,
          vehicle: trip.vehicle,
          mineSite: trip.mineSite,
        },
        message: `Draft Sales Invoice ${draftInvoice.id} created from approved contract ${contract.id}.`,
      },
      { status: 201, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error: any) {
    if (error instanceof MineAuthorizationError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    console.error('API /api/finance/revenue POST error:', error?.message || error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to create sales invoice.' },
      { status: error?.status || 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}

export async function PUT() {
  return NextResponse.json({ success: false, error: 'Method Not Allowed' }, { status: 405, headers: { Allow: 'GET, POST' } });
}

export async function DELETE() {
  return NextResponse.json({ success: false, error: 'Method Not Allowed' }, { status: 405, headers: { Allow: 'GET, POST' } });
}