import { NextRequest } from 'next/server';
import { AuthUser, getAuthenticatedUser } from '@/lib/auth';

export interface MineScope {
  user: AuthUser;
  sid: string;
  isAllMines: boolean;
  allowedMines: string[];
  isUnassigned: boolean;
}

export class MineAuthorizationError extends Error {
  status: number;
  code: string;

  constructor(message: string, status = 403, code = 'MINE_ACCESS_DENIED') {
    super(message);
    this.name = 'MineAuthorizationError';
    this.status = status;
    this.code = code;
  }
}

function resolveScope(scopeOrUser: MineScope | AuthUser): {
  isAllMines: boolean;
  allowedMines: string[];
  isUnassigned: boolean;
} {
  if ('isAllMines' in scopeOrUser && 'allowedMines' in scopeOrUser && 'isUnassigned' in scopeOrUser) {
    return {
      isAllMines: Boolean(scopeOrUser.isAllMines),
      allowedMines: scopeOrUser.allowedMines || [],
      isUnassigned: Boolean(scopeOrUser.isUnassigned),
    };
  }
  return {
    isAllMines: false,
    allowedMines: [],
    isUnassigned: true,
  };
}

/**
 * Resolves the authenticated user's operational mine scope.
 * Throws 401 if unauthenticated.
 */
export async function resolveUserMineScope(
  request: Request | NextRequest
): Promise<MineScope> {
  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    throw new MineAuthorizationError(
      'Unauthorized: Valid operational session required.',
      401,
      'UNAUTHORIZED'
    );
  }

  const { user, sid } = auth;
  return {
    user,
    sid,
    isAllMines: user.isAllMines,
    allowedMines: user.allowedMines || [],
    isUnassigned: user.isUnassigned,
  };
}

export interface MineFilterResolution {
  filterType: 'all' | 'single' | 'list';
  targetMine?: string;
  targetMines?: string[];
}

/**
 * Validates a requested mine site filter against the user's permitted mine scope.
 * - If user has All Mines: returns requestedMine if provided, or 'all'.
 * - If user is unassigned: throws 403 Forbidden (Strict Default-Deny).
 * - If specific requestedMine provided: checks if it is in allowedMines. Throws 403 if unauthorized.
 * - If no requestedMine provided: returns single or list of permitted mines.
 */
export function validateAndResolveMineFilter(
  scopeOrUser: MineScope | AuthUser,
  requestedMine?: string | null
): MineFilterResolution {
  const scope = resolveScope(scopeOrUser);
  const trimmed = requestedMine?.trim();

  if (scope.isAllMines) {
    if (trimmed && trimmed !== 'ALL') {
      return { filterType: 'single', targetMine: trimmed };
    }
    return { filterType: 'all' };
  }

  if (scope.isUnassigned) {
    throw new MineAuthorizationError(
      'Access Denied: Operational user has no assigned mine sites (Default-Deny).',
      403,
      'NO_MINE_ASSIGNMENT'
    );
  }

  if (trimmed && trimmed !== 'ALL') {
    if (!scope.allowedMines.includes(trimmed)) {
      throw new MineAuthorizationError(
        `Access Denied: You are not authorized for Mine Site '${trimmed}'.`,
        403,
        'UNAUTHORIZED_MINE'
      );
    }
    return { filterType: 'single', targetMine: trimmed };
  }

  // No specific mine requested: return all permitted mines for this user
  if (scope.allowedMines.length === 1) {
    return { filterType: 'single', targetMine: scope.allowedMines[0] };
  }
  return { filterType: 'list', targetMines: scope.allowedMines };
}

/**
 * Validates a write operation (POST/PUT) against the user's permitted mine scope.
 * Ensures the target mine site in the payload is authorized.
 */
export function validateWriteMineSite(
  scopeOrUser: MineScope | AuthUser,
  targetMineSite?: string | null
): string {
  const scope = resolveScope(scopeOrUser);
  const trimmed = targetMineSite?.trim();
  if (!trimmed) {
    throw new MineAuthorizationError(
      'Validation Error: Operational records require a valid Mine Site.',
      400,
      'MISSING_MINE_SITE'
    );
  }

  if (scope.isAllMines) {
    return trimmed;
  }

  if (scope.isUnassigned) {
    throw new MineAuthorizationError(
      'Access Denied: Operational user has no assigned mine sites (Default-Deny).',
      403,
      'NO_MINE_ASSIGNMENT'
    );
  }

  if (!scope.allowedMines.includes(trimmed)) {
    throw new MineAuthorizationError(
      `Access Denied: You are not authorized to create or modify records for Mine Site '${trimmed}'.`,
      403,
      'UNAUTHORIZED_MINE'
    );
  }

  return trimmed;
}

/**
 * Validates that an existing document loaded from Frappe belongs to an authorized mine.
 */
export function validateDocumentMineOwnership(
  scopeOrUser: MineScope | AuthUser,
  documentMineSite?: string | null
): void {
  const scope = resolveScope(scopeOrUser);
  if (scope.isAllMines) {
    return;
  }

  const trimmed = documentMineSite?.trim();
  if (scope.isUnassigned || !trimmed || !scope.allowedMines.includes(trimmed)) {
    throw new MineAuthorizationError(
      'Access Denied: You are not authorized to access this document.',
      403,
      'FORBIDDEN_DOCUMENT'
    );
  }
}

/**
 * Asserts that the authenticated user has access to a specific mine site.
 */
export function assertMineAccess(
  scopeOrUser: MineScope | AuthUser,
  targetMineSite?: string | null
): void {
  validateDocumentMineOwnership(scopeOrUser, targetMineSite);
}
