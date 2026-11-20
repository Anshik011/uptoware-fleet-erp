import { NextRequest, NextResponse } from 'next/server';
import { getFleetVehicleTypes } from '@/lib/frappe';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid operational session required.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    const vehicleTypes = await getFleetVehicleTypes(auth.sid);

    return NextResponse.json(
      {
        success: true,
        data: vehicleTypes,
        count: vehicleTypes.length,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error('API /vehicle-types GET error:', error?.message || 'Error');
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, error: error?.message || 'Failed to fetch vehicle types.' },
      { status, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
