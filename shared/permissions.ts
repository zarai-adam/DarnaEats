import type { Role } from './constants';

export interface AuthClaims {
  roles?: readonly string[];
}

export function hasRole(claims: AuthClaims | null | undefined, role: Role): boolean {
  return Boolean(claims?.roles?.includes(role));
}

export function isStaff(claims: AuthClaims | null | undefined): boolean {
  return hasRole(claims, 'admin') || hasRole(claims, 'moderator');
}

export function isAdmin(claims: AuthClaims | null | undefined): boolean {
  return hasRole(claims, 'admin');
}

/** Roles a user may request for themselves. Staff roles are admin-granted only. */
export const SELF_ASSIGNABLE_ROLES: readonly Role[] = ['buyer', 'seller'];

export function canSelfAssign(role: Role): boolean {
  return SELF_ASSIGNABLE_ROLES.includes(role);
}

/** Actions moderators can take; admins can do everything. */
const MODERATOR_ACTIONS = new Set([
  'review.moderate',
  'report.update',
  'dish.hide',
  'seller.review',
  'conversation.inspect',
]);

export function canPerform(claims: AuthClaims | null | undefined, action: string): boolean {
  if (isAdmin(claims)) return true;
  if (hasRole(claims, 'moderator')) return MODERATOR_ACTIONS.has(action);
  return false;
}

export function primaryRole(roles: readonly string[]): Role {
  if (roles.includes('admin')) return 'admin';
  if (roles.includes('moderator')) return 'moderator';
  if (roles.includes('seller')) return 'seller';
  return 'buyer';
}
