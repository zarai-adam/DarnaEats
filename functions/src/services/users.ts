import { primaryRole } from '../shared/permissions';
import type { Caller } from '../lib/context';
import { parseInput } from '../lib/errors';
import { adminAuth, db, FieldValue } from '../lib/firebase';
import { ensureUserProfileSchema } from '../lib/schemas';

/**
 * Idempotently creates the caller's `users` document and default custom
 * claims. Roles are never taken from the client: new accounts are buyers.
 */
export async function ensureUserProfile(caller: Caller, raw: unknown) {
  const input = parseInput(ensureUserProfileSchema, raw ?? {});
  const ref = db.collection('users').doc(caller.uid);
  const authUser = await adminAuth.getUser(caller.uid);

  const result = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (snap.exists) {
      const updates: Record<string, unknown> = {
        lastLoginAt: FieldValue.serverTimestamp(),
        phoneNumber: authUser.phoneNumber ?? snap.get('phoneNumber') ?? null,
        email: authUser.email ?? snap.get('email') ?? null,
      };
      if (input.preferredLanguage) updates.preferredLanguage = input.preferredLanguage;
      tx.update(ref, updates);
      return { created: false, roles: (snap.get('roles') as string[] | undefined) ?? ['buyer'] };
    }
    const roles = ['buyer'];
    tx.set(ref, {
      role: 'buyer',
      roles,
      displayName: input.displayName ?? authUser.displayName ?? '',
      phoneNumber: authUser.phoneNumber ?? null,
      email: authUser.email ?? null,
      photoUrl: null,
      preferredLanguage: input.preferredLanguage ?? 'ar',
      acceptedTermsVersion: input.acceptedTermsVersion ?? null,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastLoginAt: FieldValue.serverTimestamp(),
    });
    return { created: true, roles };
  });

  const currentClaims = authUser.customClaims ?? {};
  const claimRoles = Array.isArray(currentClaims.roles) ? (currentClaims.roles as string[]) : [];
  const needsClaims = result.roles.some((r) => !claimRoles.includes(r)) || claimRoles.length !== result.roles.length;
  if (needsClaims) {
    await adminAuth.setCustomUserClaims(caller.uid, { ...currentClaims, roles: result.roles });
  }
  return { created: result.created, roles: result.roles, role: primaryRole(result.roles), claimsUpdated: needsClaims };
}

/** Updates roles on both the Firestore profile and the auth token claims. */
export async function applyRoles(uid: string, roles: string[]): Promise<void> {
  const unique = [...new Set(roles)];
  const user = await adminAuth.getUser(uid);
  await adminAuth.setCustomUserClaims(uid, { ...(user.customClaims ?? {}), roles: unique });
  await db
    .collection('users')
    .doc(uid)
    .set({ roles: unique, role: primaryRole(unique), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
}
