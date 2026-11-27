import { NextRequest } from 'next/server';

export type OperationalRole =
  | 'Fleet Manager'
  | 'Dispatcher'
  | 'Workshop Supervisor'
  | 'Accountant'
  | 'Administrator'
  | 'Maintenance Stores User'
  | 'Site Supervisor User'
  | 'Reconcile Incharge User'
  | 'Unauthorized';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  role: OperationalRole;
  department?: string;
  isAllMines: boolean;
  allowedMines: string[];
  isUnassigned: boolean;
}

export const AUTH_COOKIE_NAME = 'uptoware_sid';

export const DEMO_ACCOUNTS: Record<string, { name: string; role: OperationalRole; roles: string[] }> = {
  'user1@uptoware.com': {
    name: 'User Id - 1',
    role: 'Maintenance Stores User',
    roles: ['Workshop Supervisor', 'Item Manager', 'Stock Manager', 'HR User'],
  },
  'user2@uptoware.com': {
    name: 'User Id - 2',
    role: 'Site Supervisor User',
    roles: ['Dispatcher', 'Fleet User'],
  },
  'user3@uptoware.com': {
    name: 'User Id - 3',
    role: 'Reconcile Incharge User',
    roles: ['Fleet Manager', 'Dispatcher', 'Fleet User'],
  },
  'demo.admin@uptoware.com': {
    name: 'Demo Admin',
    role: 'Administrator',
    roles: [
      'Administrator',
      'System Manager',
      'Fleet Manager',
      'Stock Manager',
      'Item Manager',
      'Store Manager',
      'Purchase Manager',
      'HR Manager',
    ],
  },
  'fleet.manager@uptoware.com': {
    name: 'Fleet Manager',
    role: 'Fleet Manager',
    roles: ['Fleet Manager', 'Fleet User', 'Dispatcher'],
  },
  'dispatcher@uptoware.com': {
    name: 'Trip Dispatcher',
    role: 'Dispatcher',
    roles: ['Dispatcher', 'Fleet User'],
  },
  'workshop.supervisor@uptoware.com': {
    name: 'Workshop Supervisor',
    role: 'Workshop Supervisor',
    roles: ['Workshop Supervisor', 'Item Manager', 'Stock Manager'],
  },
  'accountant@uptoware.com': {
    name: 'Financial Accountant',
    role: 'Accountant',
    roles: ['Accountant', 'Accounts User', 'Accounts Manager'],
  },
};

/**
 * Maps a list of Frappe roles to a primary operational role.
 * Resolves deterministically according to operational hierarchy.
 */
export function mapFrappeRolesToOperationalRole(roles: string[]): OperationalRole {
  if (roles.includes('System Manager') || roles.includes('Administrator') || roles.includes('Fleet Head Office Admin')) {
    return 'Administrator';
  }
  if (roles.includes('Fleet Manager')) {
    return 'Fleet Manager';
  }
  if (roles.includes('Dispatcher')) {
    return 'Dispatcher';
  }
  if (roles.includes('Workshop Supervisor')) {
    return 'Workshop Supervisor';
  }
  if (roles.includes('Accountant') || roles.includes('Accounts Manager')) {
    return 'Accountant';
  }
  return 'Unauthorized';
}

export type PermissionAction = 'view' | 'manage' | 'full';

/**
 * Authoritative Centralized Permission Matrix
 * Governs operational authorization across modules.
 */
export const PERMISSION_MATRIX: Record<
  string,
  { view: OperationalRole[]; manage?: OperationalRole[]; full: OperationalRole[] }
> = {
  dashboard: {
    view: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    full: ['Administrator'],
  },
  vehicles: {
    view: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Administrator'],
    full: ['Administrator'],
  },
  drivers: {
    view: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Administrator'],
    full: ['Administrator'],
  },
  mineSites: {
    view: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Administrator'],
    full: ['Administrator'],
  },
  trips: {
    view: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Dispatcher', 'Administrator'],
    full: ['Administrator'],
  },
  dispatch: {
    view: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Dispatcher', 'Administrator'],
    full: ['Administrator'],
  },
  weighbridge: {
    view: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Dispatcher', 'Administrator'],
    full: ['Administrator'],
  },
  fuel: {
    view: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    full: ['Administrator'],
  },
  maintenance: {
    view: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Workshop Supervisor', 'Administrator'],
    full: ['Administrator'],
  },
  breakdowns: {
    view: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Workshop Supervisor', 'Administrator'],
    full: ['Administrator'],
  },
  spareParts: {
    view: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Workshop Supervisor', 'Administrator'],
    full: ['Administrator'],
  },
  inventory: {
    view: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Workshop Supervisor', 'Administrator'],
    full: ['Administrator'],
  },
  warehouses: {
    view: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Workshop Supervisor', 'Administrator'],
    full: ['Administrator'],
  },
  stockMovements: {
    view: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Workshop Supervisor', 'Administrator'],
    full: ['Administrator'],
  },
  suppliers: {
    view: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Accountant', 'Administrator'],
    full: ['Administrator'],
  },
  purchaseOrders: {
    view: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Accountant', 'Administrator'],
    full: ['Administrator'],
  },
  expenses: {
    view: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Accountant', 'Administrator'],
    full: ['Administrator'],
  },
  procurement: {
    view: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    full: ['Administrator'],
  },
  finance: {
    view: ['Fleet Manager', 'Accountant', 'Administrator'],
    manage: ['Accountant', 'Administrator'],
    full: ['Administrator'],
  },
  revenue: {
    view: ['Fleet Manager', 'Accountant', 'Administrator'],
    manage: ['Accountant', 'Administrator'],
    full: ['Administrator'],
  },
  collections: {
    view: ['Fleet Manager', 'Accountant', 'Administrator'],
    manage: ['Accountant', 'Administrator'],
    full: ['Administrator'],
  },
  profitability: {
    view: ['Fleet Manager', 'Accountant', 'Administrator'],
    manage: ['Accountant', 'Administrator'],
    full: ['Administrator'],
  },
  financialReports: {
    view: ['Fleet Manager', 'Accountant', 'Administrator'],
    manage: ['Accountant', 'Administrator'],
    full: ['Administrator'],
  },
  insurance: {
    view: ['Fleet Manager', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Administrator'],
    full: ['Administrator'],
  },
  compliance: {
    view: ['Fleet Manager', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Administrator'],
    full: ['Administrator'],
  },
  alerts: {
    view: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    full: ['Administrator'],
  },
  approvals: {
    view: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    full: ['Administrator'],
  },
  admin: {
    view: ['Administrator'],
    manage: ['Administrator'],
    full: ['Administrator'],
  },
  settings: {
    view: ['Fleet Manager', 'Administrator'],
    manage: ['Administrator'],
    full: ['Administrator'],
  },
  documents: {
    view: ['Fleet Manager', 'Dispatcher', 'Administrator'],
    manage: ['Fleet Manager', 'Administrator'],
    full: ['Administrator'],
  },
  shifts: {
    view: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Dispatcher', 'Administrator'],
    full: ['Administrator'],
  },
  employees: {
    view: ['Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'Administrator'],
    manage: ['Fleet Manager', 'Administrator'],
    full: ['Administrator'],
  },
};

/**
 * Validates whether an authenticated user has permission to perform an action on a module.
 */
export function checkPermission(
  user: AuthUser,
  module: string,
  action: PermissionAction = 'view'
): boolean {
  // Specialized restricted operational roles MUST be evaluated before generic Frappe role bypasses
  if (user.role === 'Maintenance Stores User') {
    const viewOnly = [
      'dashboard',
      'vehicles',
      'drivers',
      'mineSites',
      'employees', // read-only list for attendance marking
      'shifts',
      'leads',
      'alerts',
      'documents',
    ];
    const manageAllowed = [
      'fuel',
      'maintenance',
      'breakdowns',
      'spareParts',
      'inventory',
      'warehouses',
      'stockMovements',
      'suppliers',
      'purchaseOrders',
      'procurement',
      'attendance',
    ];
    if (action === 'full') return false;
    if (action === 'manage') return manageAllowed.includes(module);
    return viewOnly.includes(module) || manageAllowed.includes(module);
  }

  if (user.role === 'Site Supervisor User') {
    const viewOnly = ['dashboard', 'vehicles', 'drivers', 'mineSites', 'shifts', 'leads'];
    const manageAllowed = ['trips', 'dispatch'];
    if (action === 'full') return false;
    if (action === 'manage') return manageAllowed.includes(module);
    return viewOnly.includes(module) || manageAllowed.includes(module);
  }

  if (user.role === 'Reconcile Incharge User') {
    const viewOnly = ['dashboard', 'vehicles', 'drivers', 'mineSites', 'shifts', 'leads'];
    const manageAllowed = ['trips', 'dispatch', 'weighbridge'];
    if (action === 'full') return false;
    if (action === 'manage') return manageAllowed.includes(module);
    return viewOnly.includes(module) || manageAllowed.includes(module);
  }

  // Administrator and System Manager have full access across all modules
  if (
    user.role === 'Administrator' ||
    user.roles.includes('System Manager') ||
    user.roles.includes('Administrator')
  ) {
    return true;
  }

  const modulePerms = PERMISSION_MATRIX[module];
  if (!modulePerms) {
    return false;
  }

  if (action === 'full') {
    return modulePerms.full.includes(user.role);
  }

  if (action === 'manage') {
    return (
      (modulePerms.manage || []).includes(user.role) ||
      modulePerms.full.includes(user.role)
    );
  }

  // action === 'view'
  return (
    modulePerms.view.includes(user.role) ||
    (modulePerms.manage || []).includes(user.role) ||
    modulePerms.full.includes(user.role)
  );
}

/**
 * Validates whether an authenticated user has permission to view quarantined test records.
 * Strictly restricted to Administrator and System Manager when explicitly required.
 * Ordinary production roles (Fleet Manager, Dispatcher, Workshop Supervisor, Accountant) are strictly denied.
 */
export function isAuthorizedForTestRecords(user: AuthUser): boolean {
  if (
    user.role === 'Maintenance Stores User' ||
    user.role === 'Site Supervisor User' ||
    user.role === 'Reconcile Incharge User'
  ) {
    return false;
  }
  return (
    user.role === 'Administrator' ||
    user.roles.includes('Administrator') ||
    user.roles.includes('System Manager')
  );
}

/**
 * Extracts Frappe session ID from incoming Request Cookie header.
 */
export function extractSidFromRequest(request: Request | NextRequest): string | null {
  const cookieHeader = request.headers.get('cookie') || '';
  const cookies = cookieHeader.split(';').map((c) => c.trim());

  // Prioritize uptoware_sid
  const match = cookies.find((c) => c.startsWith(`${AUTH_COOKIE_NAME}=`));
  if (match) {
    return match.substring(AUTH_COOKIE_NAME.length + 1).trim();
  }

  // Also support direct Frappe sid
  const sidMatch = cookies.find((c) => c.startsWith('sid='));
  if (sidMatch) {
    return sidMatch.substring(4).trim();
  }

  return null;
}

/**
 * Validates the session ID against Frappe backend and retrieves user identity and roles.
 * Returns null if unauthenticated, session expired, or user is Guest.
 */
export async function getAuthenticatedUser(
  request: Request | NextRequest
): Promise<{ user: AuthUser; sid: string } | null> {
  const rawSid = extractSidFromRequest(request);
  if (!rawSid && process.env.LOCAL_DEMO_MODE !== 'true') {
    return null;
  }
  const sid = rawSid || 'local-demo-session';

  // Fast-path for local demo mode or high-availability demo session
  if (sid.startsWith('demo-session-')) {
    const rawRole = sid.replace('demo-session-', '').split('-')[0];
    const matchedAccount = Object.values(DEMO_ACCOUNTS).find(
      (acc) => acc.role.toLowerCase() === rawRole.toLowerCase()
    ) || DEMO_ACCOUNTS['demo.admin@uptoware.com'];

    return {
      user: {
        id: Object.keys(DEMO_ACCOUNTS).find((k) => DEMO_ACCOUNTS[k] === matchedAccount) || 'demo.admin@uptoware.com',
        name: matchedAccount.name,
        email: Object.keys(DEMO_ACCOUNTS).find((k) => DEMO_ACCOUNTS[k] === matchedAccount) || 'demo.admin@uptoware.com',
        role: matchedAccount.role,
        roles: matchedAccount.roles,
        department: 'Fleet Operations',
        isAllMines: true,
        allowedMines: ['JBR Eastern — Talcher Site'],
        isUnassigned: false,
      },
      sid,
    };
  }

  if (sid === 'local-demo-session') {
    return {
      user: {
        id: 'demo.admin@uptoware.com',
        name: 'Demo Administrator',
        email: 'demo.admin@uptoware.com',
        role: 'Administrator',
        roles: ['Administrator', 'Fleet Manager', 'Dispatcher', 'Workshop Supervisor', 'Accountant', 'System Manager'],
        department: 'Fleet Operations',
        isAllMines: true,
        allowedMines: ['JBR Eastern — Talcher Site'],
        isUnassigned: false,
      },
      sid,
    };
  }

  try {
    const FRAPPE_URL = process.env.FRAPPE_URL || 'http://localhost:8080';
    let msg: any = null;
    let roles: string[] = [];

    try {
      const res = await fetch(`${FRAPPE_URL}/api/method/uptoware_get_current_user`, {
        headers: {
          Cookie: `sid=${sid}`,
        },
        cache: 'no-store',
      });

      if (res.ok) {
        const json = await res.json();
        msg = json.message;
        roles = msg?.roles || [];
      } else {
        const errText = await res.text().catch(() => '');
        console.warn(`[Auth] Session verification: Server Script profile fetch (${res.status}):`, errText);
      }
    } catch (e: any) {
      console.warn('[Auth] Session verification fetch exception:', e?.message);
    }

    // Native Frappe fallback if Server Script API is disabled or fails
    if (!msg || !msg.user || msg.user === 'Guest') {
      try {
        const nativeRes = await fetch(`${FRAPPE_URL}/api/method/frappe.auth.get_logged_user`, {
          headers: { Cookie: `sid=${sid}` },
          cache: 'no-store',
        });

        if (nativeRes.ok) {
          const nJson = await nativeRes.json();
          const loggedUser = nJson.message;

          if (loggedUser && loggedUser !== 'Guest') {
            let fullName = loggedUser;
            try {
              const uRes = await fetch(`${FRAPPE_URL}/api/resource/User/${encodeURIComponent(loggedUser)}`, {
                headers: { Cookie: `sid=${sid}` },
                cache: 'no-store',
              });
              if (uRes.ok) {
                const uJson = await uRes.json();
                fullName = uJson?.data?.full_name || uJson?.data?.first_name || loggedUser;
                if (Array.isArray(uJson?.data?.roles) && uJson.data.roles.length > 0) {
                  roles = uJson.data.roles.map((r: any) => r.role || r);
                }
              }
            } catch (_) {}

            if (roles.length === 0) {
              if (loggedUser === 'Administrator' || loggedUser.toLowerCase().includes('admin')) {
                roles = ['Administrator', 'System Manager'];
              } else if (loggedUser.toLowerCase().includes('fleet.manager')) {
                roles = ['Fleet Manager', 'Stock User', 'Desk User', 'Weighbridge Operator'];
              } else if (loggedUser.toLowerCase().includes('dispatcher')) {
                roles = ['Dispatcher'];
              } else if (loggedUser.toLowerCase().includes('workshop')) {
                roles = ['Workshop Supervisor'];
              } else if (loggedUser.toLowerCase().includes('accountant')) {
                roles = ['Accountant'];
              }
            }

            msg = {
              user: loggedUser,
              email: loggedUser,
              full_name: fullName,
              roles,
              is_all_mines: loggedUser === 'Administrator' || roles.includes('Administrator'),
              allowed_mines: ['JBR Eastern — Talcher Site'],
            };
          }
        }
      } catch (fallbackErr: any) {
        console.error('[Auth] Native session fallback failed:', fallbackErr?.message);
      }
    }

    if (!msg || !msg.user || msg.user === 'Guest') {
      return null;
    }
    let primaryRole = mapFrappeRolesToOperationalRole(roles);
    const userIdentifier = (msg.user || msg.email || '').toLowerCase();
    if (userIdentifier.includes('user1')) {
      primaryRole = 'Maintenance Stores User';
    } else if (userIdentifier.includes('user2')) {
      primaryRole = 'Site Supervisor User';
    } else if (userIdentifier.includes('user3')) {
      primaryRole = 'Reconcile Incharge User';
    }
    const isSpecializedRole =
      primaryRole === 'Maintenance Stores User' ||
      primaryRole === 'Site Supervisor User' ||
      primaryRole === 'Reconcile Incharge User';
    const isAllMines = Boolean(
      !isSpecializedRole &&
      (msg.is_all_mines ||
        primaryRole === 'Administrator' ||
        roles.includes('System Manager') ||
        roles.includes('Fleet Head Office Admin'))
    );
    const allowedMines: string[] = Array.isArray(msg.allowed_mines) ? msg.allowed_mines : [];
    const isUnassigned = !isAllMines && allowedMines.length === 0;

    const department =
      primaryRole === 'Accountant'
        ? 'Finance & Accounts'
        : primaryRole === 'Workshop Supervisor'
          ? 'Workshop & Fleet Maintenance'
          : primaryRole === 'Dispatcher'
            ? 'Dispatch & Weighbridge Operations'
            : primaryRole === 'Unauthorized'
              ? 'Restricted Access'
              : 'Fleet Operations';

    return {
      user: {
        id: msg.user,
        name: msg.full_name || msg.user,
        email: msg.email || msg.user,
        roles,
        role: primaryRole,
        department,
        isAllMines,
        allowedMines,
        isUnassigned,
      },
      sid,
    };
  } catch (err) {
    console.error('Authentication verification error:', err);
    return null;
  }
}

