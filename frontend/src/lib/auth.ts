import { NextRequest } from 'next/server';

export type OperationalRole =
  | 'Fleet Manager'
  | 'Dispatcher'
  | 'Workshop Supervisor'
  | 'Accountant'
  | 'Administrator';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  role: OperationalRole;
  department?: string;
}

export const AUTH_COOKIE_NAME = 'uptoware_sid';

/**
 * Maps a list of Frappe roles to a primary operational role.
 * Resolves deterministically according to operational hierarchy.
 */
export function mapFrappeRolesToOperationalRole(roles: string[]): OperationalRole {
  if (roles.includes('System Manager') || roles.includes('Administrator')) {
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
  return 'Fleet Manager';
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
    manage: ['Fleet Manager', 'Workshop Supervisor', 'Administrator'],
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
  const sid = extractSidFromRequest(request);
  if (!sid) {
    return null;
  }

  try {
    const FRAPPE_URL = process.env.FRAPPE_URL || 'http://localhost:8080';
    const res = await fetch(`${FRAPPE_URL}/api/method/uptoware_get_current_user`, {
      headers: {
        Cookie: `sid=${sid}`,
      },
      cache: 'no-store',
    });

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    const msg = json.message;
    if (!msg || !msg.user || msg.user === 'Guest') {
      return null;
    }

    const roles: string[] = msg.roles || [];
    const primaryRole = mapFrappeRolesToOperationalRole(roles);

    const department =
      primaryRole === 'Accountant'
        ? 'Finance & Accounts'
        : primaryRole === 'Workshop Supervisor'
          ? 'Workshop & Fleet Maintenance'
          : primaryRole === 'Dispatcher'
            ? 'Dispatch & Weighbridge Operations'
            : 'Fleet Operations';

    return {
      user: {
        id: msg.user,
        name: msg.full_name || msg.user,
        email: msg.email || msg.user,
        roles,
        role: primaryRole,
        department,
      },
      sid,
    };
  } catch (err) {
    console.error('Authentication verification error:', err);
    return null;
  }
}

