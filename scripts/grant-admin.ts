/**
 * Bootstraps the first administrator (or moderator). Roles can otherwise only
 * be changed by an existing admin through the audited `adminSetUserRoles`
 * Cloud Function, so this script is the single out-of-band entry point.
 *
 * Emulator:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
 *     npm run grant-admin -- someone@example.com
 * Production (service-account credentials, NEVER committed):
 *   GOOGLE_APPLICATION_CREDENTIALS=./sa.json GCLOUD_PROJECT=your-project \
 *     npm run grant-admin -- someone@example.com [--moderator]
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const [email, flag] = process.argv.slice(2);
if (!email) {
  console.error('Usage: npm run grant-admin -- <email> [--moderator]');
  process.exit(1);
}
const role = flag === '--moderator' ? 'moderator' : 'admin';

initializeApp({ projectId: process.env.GCLOUD_PROJECT ?? 'demo-darna-eats' });

async function main() {
  const auth = getAuth();
  const db = getFirestore();
  const user = await auth.getUserByEmail(email!);
  const current = Array.isArray(user.customClaims?.roles) ? (user.customClaims!.roles as string[]) : ['buyer'];
  const roles = [...new Set([...current, 'buyer', role])];
  await auth.setCustomUserClaims(user.uid, { ...(user.customClaims ?? {}), roles });
  await db
    .collection('users')
    .doc(user.uid)
    .set({ roles, role, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await db.collection('auditLogs').add({
    actorId: 'cli:grant-admin',
    action: 'user.set_roles',
    entityType: 'user',
    entityId: user.uid,
    reason: 'bootstrap via scripts/grant-admin.ts',
    metadata: { before: current, after: roles },
    createdAt: FieldValue.serverTimestamp(),
  });
  console.log(`Granted ${role} to ${email} (${user.uid}). The user must sign out and in again to refresh their token.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
