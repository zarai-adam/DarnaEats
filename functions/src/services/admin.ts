import { AggregateField, type Query } from 'firebase-admin/firestore';
import { tunisDateKey } from '../shared/time';
import { writeAudit } from '../lib/audit';
import { requirePermission, requireStaff, type Caller } from '../lib/context';
import { fail, parseInput } from '../lib/errors';
import { adminAuth, db, FieldValue, Timestamp } from '../lib/firebase';
import {
  catalogSchemas,
  inspectConversationSchema,
  saveCatalogEntitySchema,
  setUserActiveSchema,
  setUserRolesSchema,
  verificationAccessSchema,
  type CatalogCollection,
} from '../lib/schemas';
import { applyRoles } from './users';

async function count(query: Query): Promise<number> {
  const snap = await query.count().get();
  return snap.data().count;
}

/** Dashboard metrics via server-side aggregation (cheap: 1 read per 1000 docs). */
export async function getAdminStats(caller: Caller) {
  requireStaff(caller);
  const todayKey = tunisDateKey();
  const startOfToday = Timestamp.fromMillis(Date.parse(`${todayKey}T00:00:00Z`) - 60 * 60_000);

  const [
    totalUsers,
    activeSellers,
    pendingApplications,
    activeDishes,
    ordersToday,
    completedOrders,
    openReports,
    flaggedReviews,
    ratingAgg,
  ] = await Promise.all([
    count(db.collection('users')),
    count(db.collection('sellerProfiles').where('status', '==', 'approved')),
    count(db.collection('sellerProfiles').where('status', 'in', ['submitted', 'under_review'])),
    count(
      db
        .collection('dishes')
        .where('isActive', '==', true)
        .where('isHidden', '==', false)
        .where('sellerApproved', '==', true),
    ),
    count(db.collection('orders').where('createdAt', '>=', startOfToday)),
    count(db.collection('orders').where('status', '==', 'completed')),
    count(db.collection('reports').where('status', 'in', ['open', 'in_review'])),
    count(db.collection('reviews').where('status', '==', 'flagged')),
    db
      .collection('reviews')
      .where('status', 'in', ['visible', 'flagged'])
      .aggregate({ avg: AggregateField.average('rating') })
      .get(),
  ]);

  const avg = (ratingAgg.data() as { avg?: number | null }).avg ?? null;
  return {
    totalUsers,
    activeSellers,
    pendingApplications,
    activeDishes,
    ordersToday,
    completedOrders,
    openReports,
    flaggedReviews,
    averageRating: avg === null ? null : Math.round(avg * 100) / 100,
  };
}

/** Marketplace analytics: order funnel by status and orders per governorate. */
export async function getAdminAnalytics(caller: Caller) {
  requireStaff(caller);
  const statuses = [
    'pending',
    'accepted',
    'preparing',
    'ready',
    'out_for_delivery',
    'completed',
    'cancelled',
    'disputed',
  ];
  const byStatus = Object.fromEntries(
    await Promise.all(
      statuses.map(async (s) => [s, await count(db.collection('orders').where('status', '==', s))] as const),
    ),
  );
  const govs = await db.collection('governorates').get();
  const sellersByGovernorate = Object.fromEntries(
    await Promise.all(
      govs.docs.map(
        async (g) =>
          [
            g.id,
            await count(
              db.collection('sellerProfiles').where('status', '==', 'approved').where('governorateId', '==', g.id),
            ),
          ] as const,
      ),
    ),
  );
  const revenueAgg = await db
    .collection('orders')
    .where('status', '==', 'completed')
    .aggregate({ gmv: AggregateField.sum('total') })
    .get();
  const gmv = (revenueAgg.data() as { gmv?: number | null }).gmv ?? 0;
  const [buyers, sellers] = await Promise.all([
    count(db.collection('users').where('role', '==', 'buyer')),
    count(db.collection('users').where('roles', 'array-contains', 'seller')),
  ]);
  return {
    ordersByStatus: byStatus,
    sellersByGovernorate,
    completedOrderValue: Math.round(gmv * 1000) / 1000,
    buyers,
    sellers,
  };
}

export async function setUserRoles(caller: Caller, raw: unknown) {
  const input = parseInput(setUserRolesSchema, raw);
  requirePermission(caller, 'user.roles');
  if (input.uid === caller.uid && !input.roles.includes('admin'))
    fail('failed-precondition', 'admin/cannot-demote-self');
  const before = (await db.collection('users').doc(input.uid).get()).get('roles') ?? [];
  await applyRoles(input.uid, input.roles.includes('buyer') ? input.roles : ['buyer', ...input.roles]);
  await writeAudit({
    actorId: caller.uid,
    action: 'user.set_roles',
    entityType: 'user',
    entityId: input.uid,
    reason: input.reason,
    metadata: { before, after: input.roles },
  });
  return { ok: true };
}

export async function setUserActive(caller: Caller, raw: unknown) {
  const input = parseInput(setUserActiveSchema, raw);
  requirePermission(caller, 'user.active');
  if (input.uid === caller.uid) fail('failed-precondition', 'admin/cannot-disable-self');
  await adminAuth.updateUser(input.uid, { disabled: !input.active });
  if (!input.active) await adminAuth.revokeRefreshTokens(input.uid);
  await db
    .collection('users')
    .doc(input.uid)
    .set({ isActive: input.active, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await writeAudit({
    actorId: caller.uid,
    action: input.active ? 'user.reactivate' : 'user.deactivate',
    entityType: 'user',
    entityId: input.uid,
    reason: input.reason,
  });
  return { ok: true };
}

export async function saveCatalogEntity(caller: Caller, raw: unknown) {
  const input = parseInput(saveCatalogEntitySchema, raw);
  requirePermission(caller, 'catalog.write');
  const collection = input.collection as CatalogCollection;
  const data = parseInput(catalogSchemas[collection] as never, input.data) as Record<string, unknown>;
  const ref = input.id ? db.collection(collection).doc(input.id) : db.collection(collection).doc();
  const extra = collection === 'appSettings' ? { updatedBy: caller.uid } : {};
  await ref.set({ ...data, ...extra, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  await writeAudit({
    actorId: caller.uid,
    action: `catalog.save.${collection}`,
    entityType: collection,
    entityId: ref.id,
    metadata: data,
  });
  return { ok: true, id: ref.id };
}

/**
 * Lets staff read a conversation ONLY in the context of a report that
 * concerns it. Every access is written to the audit log.
 */
export async function inspectConversation(caller: Caller, raw: unknown) {
  const input = parseInput(inspectConversationSchema, raw);
  requirePermission(caller, 'conversation.inspect');
  const report = await db.collection('reports').doc(input.reportId).get();
  if (!report.exists) fail('not-found', 'report/not-found');
  const linked =
    report.get('relatedConversationId') === input.conversationId ||
    (report.get('targetType') === 'conversation' && report.get('targetId') === input.conversationId);
  if (!linked) fail('permission-denied', 'inspect/report-not-linked');

  const convo = await db.collection('conversations').doc(input.conversationId).get();
  if (!convo.exists) fail('not-found', 'conversation/not-found');
  const messages = await convo.ref.collection('messages').orderBy('createdAt', 'desc').limit(200).get();
  await writeAudit({
    actorId: caller.uid,
    action: 'conversation.inspect',
    entityType: 'conversation',
    entityId: input.conversationId,
    reason: `report:${input.reportId}`,
  });
  return {
    buyerId: convo.get('buyerId') as string,
    sellerId: convo.get('sellerId') as string,
    messages: messages.docs
      .map((m) => ({
        id: m.id,
        senderId: m.get('senderId') as string,
        text: (m.get('text') as string | null) ?? '',
        hasImage: Boolean(m.get('imagePath')),
        createdAt: (m.get('createdAt') as Timestamp | null)?.toMillis() ?? null,
      }))
      .reverse(),
  };
}

/** Records that a staff member opened a seller's identity documents. */
export async function logVerificationAccess(caller: Caller, raw: unknown) {
  const input = parseInput(verificationAccessSchema, raw);
  requirePermission(caller, 'seller.review');
  await writeAudit({
    actorId: caller.uid,
    action: 'verification.document_viewed',
    entityType: 'seller',
    entityId: input.sellerId,
  });
  return { ok: true };
}
