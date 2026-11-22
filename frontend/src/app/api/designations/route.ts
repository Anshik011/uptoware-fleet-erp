import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { getDesignations, createDesignation } from '@/lib/frappe';

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    const sessionCookie = auth?.sid ? `sid=${auth.sid}` : '';

    const designations = await getDesignations(sessionCookie);

    return NextResponse.json({
      success: true,
      data: designations,
      count: designations.length,
    });
  } catch (error: any) {
    console.error('Designations GET error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch designations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedUser(request);
    const sessionCookie = auth?.sid ? `sid=${auth.sid}` : '';

    const body = await request.json().catch(() => ({}));
    const name = (body.name || body.designation || '').trim();

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Designation name is required' },
        { status: 400 }
      );
    }

    const created = await createDesignation(sessionCookie, name);

    return NextResponse.json(
      {
        success: true,
        data: created,
        message: 'Designation created successfully',
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Designations POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create designation' },
      { status: error.status || 500 }
    );
  }
}
