import { NextRequest, NextResponse } from 'next/server';
import { getDrivers, createDriver, updateDriver, createEmployee, frappeFetch, calculateStatutoryDoc } from '@/lib/frappe';
import { getAuthenticatedUser, checkPermission, isAuthorizedForTestRecords } from '@/lib/auth';
import { validateAndResolveMineFilter, assertMineAccess, MineAuthorizationError } from '@/lib/mineAuth';
import { CreateDriverInput, UpdateDriverInput, Driver, DriverStatus } from '@/types/fleet';

const PERMITTED_STATUSES: DriverStatus[] = ['Active', 'Suspended', 'Left'];
const PERMITTED_AVAILABILITY = ['ALL', 'ASSIGNED', 'UNASSIGNED'];
const PERMITTED_COMPLIANCE = ['ALL', 'VALID', 'EXPIRING_SOON', 'EXPIRED', 'MISSING'];
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const PHONE_REGEX = /^[+0-9\s()-]{7,25}$/;

function isValidDate(dateStr: string): boolean {
  if (!DATE_REGEX.test(dateStr)) return false;
  const timestamp = Date.parse(dateStr);
  if (isNaN(timestamp)) return false;
  const d = new Date(dateStr);
  return d.toISOString().slice(0, 10) === dateStr;
}

/**
 * Helper: Map Frappe Driver raw data to Driver type.
 * Reusable to avoid duplicating Driver-to-frontend mapping logic.
 */
function mapFrappeDriverToType(d: any): Driver {
  const licenseDoc = calculateStatutoryDoc('Driving License', d.expiry_date);
  return {
    id: d.name,
    name: d.full_name || d.name,
    fullName: d.full_name || d.name,
    status: (d.status as DriverStatus) || 'Active',
    cellNumber: d.cell_number || null,
    licenseNumber: d.license_number || null,
    issuingDate: d.issuing_date || null,
    expiryDate: d.expiry_date || null,
    medicalFitnessExpiry: d.medical_fitness_expiry || null,
    safetyScore: Number(d.safety_score ?? 100),
    assignedVehicle: d.assigned_vehicle || null,
    emergencyContactName: d.emergency_contact_name || null,
    emergencyContactPhone: d.emergency_contact_phone || null,
    isTestRecord: Boolean(d.is_test_record),
    licenseStatus: licenseDoc.status,
    daysToLicenseExpiry: licenseDoc.daysRemaining,
    customMineSite: d.custom_mine_site || undefined,
    mineSite: d.custom_mine_site || undefined,
    employee: d.employee || null,
    employeeId: d.employee || null,
  };
}

/**
 * Query for an existing Driver linked to an Employee.
 * Returns object with count and drivers array to detect multiple drivers.
 * Throws on network/permission errors (does not swallow them).
 */
async function getLinkedDrivers(
  employeeId: string,
  sessionCookie: string
): Promise<{ count: number; drivers: Driver[]; rawDrivers: any[] }> {
  const driverFilter = JSON.stringify([['employee', '=', employeeId]]);
  const driverRes = await frappeFetch<{ data: any[] }>(
    `/api/resource/Driver?filters=${encodeURIComponent(
      driverFilter
    )}&fields=["name","full_name","status","cell_number","license_number","issuing_date","expiry_date","medical_fitness_expiry","safety_score","assigned_vehicle","emergency_contact_name","emergency_contact_phone","employee","is_test_record","custom_mine_site"]&limit_page_length=100`,
    { sessionCookie }
  );

  const rawDrivers = driverRes.data || [];
  const drivers = rawDrivers.map(mapFrappeDriverToType);
  return { count: rawDrivers.length, drivers, rawDrivers };
}

/**
 * Update a Driver record with specific fields.
 * Used to synchronize registration fields that were not set by Server Script auto-creation.
 */
async function updateDriverViaAPI(
  sid: string,
  driverId: string,
  updates: Partial<CreateDriverInput>
): Promise<Driver> {
  // Only include fields that are actually provided
  const updateData: Partial<UpdateDriverInput> = {};
  if (updates.licenseNumber !== undefined) updateData.licenseNumber = updates.licenseNumber;
  if (updates.issuingDate !== undefined) updateData.issuingDate = updates.issuingDate;
  if (updates.expiryDate !== undefined) updateData.expiryDate = updates.expiryDate;
  if (updates.medicalFitnessExpiry !== undefined) updateData.medicalFitnessExpiry = updates.medicalFitnessExpiry;
  if (updates.emergencyContactName !== undefined) updateData.emergencyContactName = updates.emergencyContactName;
  if (updates.emergencyContactPhone !== undefined) updateData.emergencyContactPhone = updates.emergencyContactPhone;
  if (updates.customMineSite !== undefined) updateData.customMineSite = updates.customMineSite;

  return await updateDriver(sid, driverId, updateData);
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate request using user's Frappe session
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid operational session required.' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            Pragma: 'no-cache',
          },
        }
      );
    }

    // 2. Enforce server-side RBAC authorization
    if (!checkPermission(auth.user, 'drivers', 'view')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient operational role permissions.' },
        {
          status: 403,
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
            Pragma: 'no-cache',
          },
        }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const query = (searchParams.get('q') || '').toLowerCase().trim();
    const status = searchParams.get('status') || 'ALL';
    const availability = (searchParams.get('availability') || 'ALL').toUpperCase();
    const compliance = (searchParams.get('compliance') || 'ALL').toUpperCase();
    const requestedMine = searchParams.get('mine_site') || searchParams.get('mineSite');

    // Resolve mine authorization scope
    let mineFilter;
    try {
      mineFilter = validateAndResolveMineFilter(auth.user, requestedMine);
    } catch (err: any) {
      if (err instanceof MineAuthorizationError) {
        return NextResponse.json({ success: false, error: err.message }, { status: 403 });
      }
      throw err;
    }

    if (searchParams.get('include_test') === 'true' && !isAuthorizedForTestRecords(auth.user)) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Access to test records requires Administrator or System Manager privileges.' },
        { status: 403 }
      );
    }
    const includeTest = isAuthorizedForTestRecords(auth.user) && searchParams.get('include_test') === 'true';

    // Validate parameters
    if (status !== 'ALL' && !PERMITTED_STATUSES.includes(status as DriverStatus)) {
      return NextResponse.json(
        { success: false, error: 'Invalid driver status filter parameter.' },
        { status: 400 }
      );
    }

    if (!PERMITTED_AVAILABILITY.includes(availability)) {
      return NextResponse.json(
        { success: false, error: 'Invalid availability filter parameter.' },
        { status: 400 }
      );
    }

    if (!PERMITTED_COMPLIANCE.includes(compliance)) {
      return NextResponse.json(
        { success: false, error: 'Invalid compliance filter parameter.' },
        { status: 400 }
      );
    }

    let drivers = await getDrivers(auth.sid, includeTest);

    // Apply mine authorization filter
    if (mineFilter.filterType === 'single' && mineFilter.targetMine) {
      drivers = drivers.filter((d) => !d.customMineSite || d.customMineSite === mineFilter.targetMine);
    } else if (mineFilter.filterType === 'list' && mineFilter.targetMines) {
      drivers = drivers.filter((d) => !d.customMineSite || mineFilter.targetMines!.includes(d.customMineSite));
    }

    // Only display drivers with linked Employee profiles (Unified Personnel Master)
    drivers = drivers.filter((d) => Boolean(d.employee || d.employeeId));

    // Search query filter
    if (query) {
      drivers = drivers.filter(
        (d) =>
          d.fullName.toLowerCase().includes(query) ||
          d.id.toLowerCase().includes(query) ||
          (d.licenseNumber && d.licenseNumber.toLowerCase().includes(query)) ||
          (d.cellNumber && d.cellNumber.toLowerCase().includes(query)) ||
          (d.assignedVehicle && d.assignedVehicle.toLowerCase().includes(query))
      );
    }

    // Status filter
    if (status !== 'ALL') {
      drivers = drivers.filter((d) => d.status === status);
    }

    // Availability filter
    if (availability === 'ASSIGNED') {
      drivers = drivers.filter((d) => Boolean(d.assignedVehicle));
    } else if (availability === 'UNASSIGNED') {
      drivers = drivers.filter((d) => !d.assignedVehicle);
    }

    // Compliance filter
    if (compliance === 'VALID') {
      drivers = drivers.filter((d) => d.licenseStatus === 'valid');
    } else if (compliance === 'EXPIRING_SOON') {
      drivers = drivers.filter((d) => d.licenseStatus === 'expiring_soon');
    } else if (compliance === 'EXPIRED') {
      drivers = drivers.filter((d) => d.licenseStatus === 'expired');
    } else if (compliance === 'MISSING') {
      drivers = drivers.filter((d) => d.licenseStatus === 'missing');
    }

    return NextResponse.json(
      { success: true, count: drivers.length, data: drivers },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          Pragma: 'no-cache',
        },
      }
    );
  } catch (error: any) {
    console.error('API /drivers GET error:', error?.message || 'Error');
    const status = error.status || 500;
    return NextResponse.json(
      { success: false, error: 'Failed to fetch drivers directory.' },
      { status }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate request using user's Frappe session
    const auth = await getAuthenticatedUser(request);
    if (!auth) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Valid operational session required.' },
        { status: 401 }
      );
    }

    // 2. Enforce strict server-side RBAC authorization for driver registration
    // Only Fleet Manager and Administrator can register drivers
    if (!checkPermission(auth.user, 'drivers', 'manage')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden: Insufficient operational role permissions to register drivers.' },
        { status: 403 }
      );
    }

    // 3. Parse JSON safely
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Malformed JSON payload.' },
        { status: 400 }
      );
    }

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { success: false, error: 'Invalid driver registration payload.' },
        { status: 400 }
      );
    }

    // 4. Validate mandatory field: fullName
    const fullName = (body.fullName || '').trim();
    if (!fullName) {
      return NextResponse.json(
        { success: false, error: 'Full name is required.' },
        { status: 400 }
      );
    }
    if (fullName.length < 2 || fullName.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Full name must be between 2 and 100 characters.' },
        { status: 400 }
      );
    }

    // 5. Status validation
    const status: DriverStatus = body.status || 'Active';
    if (!PERMITTED_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid driver status. Permitted values: ${PERMITTED_STATUSES.join(', ')}.` },
        { status: 400 }
      );
    }

    // 6. Contact phone validations
    const cellNumber = (body.cellNumber || '').trim();
    if (cellNumber && !PHONE_REGEX.test(cellNumber)) {
      return NextResponse.json(
        { success: false, error: 'Invalid cellphone number format.' },
        { status: 400 }
      );
    }

    const emergencyContactPhone = (body.emergencyContactPhone || '').trim();
    if (emergencyContactPhone && !PHONE_REGEX.test(emergencyContactPhone)) {
      return NextResponse.json(
        { success: false, error: 'Invalid emergency contact phone number format.' },
        { status: 400 }
      );
    }

    const emergencyContactName = (body.emergencyContactName || '').trim();
    if (emergencyContactName && emergencyContactName.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Emergency contact name exceeds maximum length of 100 characters.' },
        { status: 400 }
      );
    }

    // 7. License number validation
    const licenseNumber = (body.licenseNumber || '').trim();
    if (licenseNumber && (licenseNumber.length < 3 || licenseNumber.length > 30)) {
      return NextResponse.json(
        { success: false, error: 'License number must be between 3 and 30 characters.' },
        { status: 400 }
      );
    }

    const issuingDate = (body.issuingDate || '').trim();
    const expiryDate = (body.expiryDate || '').trim();
    const medicalFitnessExpiry = (body.medicalFitnessExpiry || '').trim();

    // 8. Date validations
    const dateFields = [
      { key: 'issuingDate', val: issuingDate, label: 'License issuing date' },
      { key: 'expiryDate', val: expiryDate, label: 'License expiry date' },
      { key: 'medicalFitnessExpiry', val: medicalFitnessExpiry, label: 'Medical fitness expiry date' },
    ];

    for (const field of dateFields) {
      if (field.val) {
        if (!isValidDate(field.val)) {
          return NextResponse.json(
            { success: false, error: `Invalid date format for ${field.label}. Expected YYYY-MM-DD.` },
            { status: 400 }
          );
        }
      }
    }

    // 9. Safety score validation
    const safetyScore = body.safetyScore !== undefined && body.safetyScore !== null
      ? Number(body.safetyScore)
      : 100;
    if (isNaN(safetyScore) || safetyScore < 0 || safetyScore > 100) {
      return NextResponse.json(
        { success: false, error: 'Safety score must be a number between 0 and 100.' },
        { status: 400 }
      );
    }

    // 10. Assigned vehicle validation: if assigned, driver must be Active
    const assignedVehicle = (body.assignedVehicle || '').trim();
    if (assignedVehicle && status !== 'Active') {
      return NextResponse.json(
        { success: false, error: 'Vehicle can only be assigned to a driver with Active status.' },
        { status: 400 }
      );
    }

    // 10b. Operational Mine Site validation & authorization
    const mineSite = (body.customMineSite || body.mineSite || (auth.user.allowedMines.length === 1 ? auth.user.allowedMines[0] : '')).trim();
    if (!mineSite) {
      return NextResponse.json(
        { success: false, error: 'Assigned mine site is required.' },
        { status: 400 }
      );
    }

    try {
      assertMineAccess(auth.user, mineSite);
    } catch (err: any) {
      if (err instanceof MineAuthorizationError) {
        return NextResponse.json({ success: false, error: err.message }, { status: 403 });
      }
      throw err;
    }

    // 11. Employee linking (Unified Personnel Master)
    // If an employee ID is supplied, use it; otherwise create an Employee record with designation 'Driver'
    let linkedEmployeeId = (body.employee || '').trim();

    if (!linkedEmployeeId) {
      // Create new Employee; server script will auto-create Driver if designation='Driver'
      const nameParts = fullName.split(' ');
      const firstName = nameParts[0] || fullName;
      const lastName = nameParts.slice(1).join(' ') || undefined;

      const createdEmp = await createEmployee(`sid=${auth.sid}`, {
        firstName,
        lastName,
        cellNumber: cellNumber || undefined,
        designation: 'Driver',
        department: 'Operations - U',
        status: status === 'Active' ? 'Active' : status === 'Left' ? 'Left' : 'Suspended',
      });
      linkedEmployeeId = createdEmp.id;
    } else {
      // Verify the provided employee exists (this throws on network/permission errors, not swallowing them)
      const empRes = await frappeFetch<{ data: any }>(
        `/api/resource/Employee/${encodeURIComponent(linkedEmployeeId)}`,
        { sessionCookie: `sid=${auth.sid}` }
      );
      if (!empRes.data) {
        throw new Error(`Employee ${linkedEmployeeId} not found in system.`);
      }
    }

    // 12. Check for existing Driver linked to this Employee (CRITICAL for idempotency)
    // This check runs for BOTH newly created Employees AND existing Employees
    const sessionCookie = `sid=${auth.sid}`;
    const linkedDrivers = await getLinkedDrivers(linkedEmployeeId, sessionCookie);

    // C. Duplicate Driver Integrity Check
    if (linkedDrivers.count > 1) {
      return NextResponse.json(
        {
          success: false,
          error: `Data integrity error: ${linkedDrivers.count} Driver records are linked to Employee ${linkedEmployeeId}. Maximum one Driver per Employee is allowed.`
        },
        { status: 500 }
      );
    }

    if (linkedDrivers.count === 1) {
      // Driver already exists (either auto-created by server script or created in concurrent request)
      // B. Server Script-provided Driver: Verify if we need to update with full registration data
      const existingDriver = linkedDrivers.drivers[0];
      const rawDriver = linkedDrivers.rawDrivers[0];

      const needsUpdates: Partial<CreateDriverInput> = {};
      let hasUpdates = false;

      // Check each field - only update if submitted value differs from existing
      // Note: We intentionally update status, license, dates, emergency contact, and cell_number
      // But do NOT update operational fields like assigned_vehicle, safety_score (unless explicitly submitted)
      if (status && rawDriver.status !== status) {
        needsUpdates.status = status;
        hasUpdates = true;
      }
      if (licenseNumber && rawDriver.license_number !== licenseNumber) {
        needsUpdates.licenseNumber = licenseNumber;
        hasUpdates = true;
      }
      if (issuingDate && rawDriver.issuing_date !== issuingDate) {
        needsUpdates.issuingDate = issuingDate;
        hasUpdates = true;
      }
      if (expiryDate && rawDriver.expiry_date !== expiryDate) {
        needsUpdates.expiryDate = expiryDate;
        hasUpdates = true;
      }
      if (medicalFitnessExpiry && rawDriver.medical_fitness_expiry !== medicalFitnessExpiry) {
        needsUpdates.medicalFitnessExpiry = medicalFitnessExpiry;
        hasUpdates = true;
      }
      if (emergencyContactName && rawDriver.emergency_contact_name !== emergencyContactName) {
        needsUpdates.emergencyContactName = emergencyContactName;
        hasUpdates = true;
      }
      if (emergencyContactPhone && rawDriver.emergency_contact_phone !== emergencyContactPhone) {
        needsUpdates.emergencyContactPhone = emergencyContactPhone;
        hasUpdates = true;
      }
      if (mineSite && rawDriver.custom_mine_site !== mineSite) {
        needsUpdates.customMineSite = mineSite;
        hasUpdates = true;
      }
      // Sync cell_number from submission if provided (Server Script may have set it from Employee)
      if (cellNumber && rawDriver.cell_number !== cellNumber) {
        needsUpdates.cellNumber = cellNumber;
        hasUpdates = true;
      }

      // B. Update Driver with registration fields if they were submitted but not yet set
      // Note: We do NOT overwrite operational fields like assigned_vehicle
      if (hasUpdates) {
        try {
          const updatedDriver = await updateDriverViaAPI(auth.sid, existingDriver.id, needsUpdates);
          return NextResponse.json({ success: true, data: updatedDriver }, { status: 200 });
        } catch (updateErr: any) {
          if (updateErr.status === 403 || updateErr.message?.includes('permission')) {
            // Permission denied - Server Script auto-created Driver without full fields
            // Return HTTP 202 (Accepted) to indicate partial success - frontend must display warning
            return NextResponse.json(
              {
                success: true,
                data: existingDriver,
                warning: 'Driver record was auto-created by server script. Some submitted fields could not be synchronized due to permission restrictions. Please update manually via Driver profile.'
              },
              { status: 202 }
            );
          }
          throw updateErr;
        }
      }

      // No updates needed - return existing Driver
      return NextResponse.json({ success: true, data: existingDriver }, { status: 200 });
    }

    // 13. No existing Driver - create new Driver record
    const sanitizedInput: CreateDriverInput = {
      fullName,
      status,
      cellNumber: cellNumber || undefined,
      licenseNumber: licenseNumber || undefined,
      issuingDate: body.issuingDate ? body.issuingDate.trim() : undefined,
      expiryDate: body.expiryDate ? body.expiryDate.trim() : undefined,
      medicalFitnessExpiry: body.medicalFitnessExpiry ? body.medicalFitnessExpiry.trim() : undefined,
      safetyScore,
      assignedVehicle: assignedVehicle || undefined,
      emergencyContactName: emergencyContactName || undefined,
      emergencyContactPhone: emergencyContactPhone || undefined,
      customMineSite: mineSite,
      mineSite,
      employee: linkedEmployeeId,
    };

    let created: Driver;
    try {
      created = await createDriver(auth.sid, sanitizedInput);
    } catch (createErr: any) {
      // Retry on conflict: Driver might have been created by concurrent request or server script
      // This handles race conditions between check and create
      if (createErr.status === 409 || createErr.message?.includes('already exists')) {
        const driverOnRetry = await getLinkedDrivers(linkedEmployeeId, sessionCookie);
        if (driverOnRetry.count === 1) {
          created = driverOnRetry.drivers[0];
        } else {
          throw createErr;
        }
      } else {
        throw createErr;
      }
    }

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    console.error('API /drivers POST error:', error?.message || 'Error');
    const status = error.status || 500;
    const cleanError =
      error.status === 409
        ? 'A driver with this record already exists.'
        : error.status === 403
          ? 'Forbidden: Insufficient permissions to create driver in Frappe.'
          : error?.message?.includes('already assigned')
            ? error.message
            : 'Failed to create driver record.';
    return NextResponse.json({ success: false, error: cleanError }, { status });
  }
}

export async function PUT() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET, POST' } }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { success: false, error: 'Method Not Allowed' },
    { status: 405, headers: { Allow: 'GET, POST' } }
  );
}
