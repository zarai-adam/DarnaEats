import { LIMITS, type ReportPriority, type ReportReason } from '../shared/constants';
import { writeAudit } from '../lib/audit';
import { requirePermission, type Caller } from '../lib/context';
import { fail, parseInput } from '../lib/errors';
import { db, FieldValue } from '../lib/firebase';
import { templateFor } from '../lib/notificationTemplates';
import { notifyStaff } from '../lib/notify';
import { enforceRateLimit } from '../lib/rateLimit';
import { createReportSchema, updateReportSchema } from '../lib/schemas';
import { setDishHidden } from './dishes';
import { applyReviewModeration } from './reviews';
import { reviewSeller } from './sellers';

export function priorityFor(reason: ReportReason, targetType: string): ReportPriority {
  if (reason === 'food_safety' || targetType === 'hygiene') return 'urgent';
  if (reason === 'hygiene' || reason === 'fraud' || reason === 'harassment') return 'high';
  if (reason === 'fake_review' || reason === 'wrong_order' || reason === 'no_show') return 'medium';
  return 'low';
}

/** Resolves which conversation (if any) a report concerns, for later inspection. */
async function relatedConversation(caller: Caller, targetType: string, targetId: string): Promise<string | null> {
  if (targetType === 'conversation') {
    const convo = await db.collection('conversations').doc(targetId).get();
    if (!convo.exists) fail('not-found', 'report/target-not-found');
    const participants = (convo.get('participants') as string[]) ?? [];
    if (!participants.includes(caller.uid)) fail('permission-denied', 'report/not-participant');
    return targetId;
  }
  if (targetType === 'order') {
    const order = await db.collection('orders').doc(targetId).get();
    if (!order.exists) fail('not-found', 'report/target-not-found');
    if (order.get('buyerId') !== caller.uid && order.get('sellerId') !== caller.uid)
      fail('permission-denied', 'report/not-participant');
    return `${order.get('buyerId')}_${order.get('sellerId')}`;
  }
  return null;
}

export async function createReport(caller: Caller, raw: unknown) {
  const input = parseInput(createReportSchema, raw);
  await enforceRateLimit(caller.uid, 'report', LIMITS.reportsPerUserPerDay, 86400);
  const relatedConversationId = await relatedConversation(caller, input.targetType, input.targetId);
  const priority = priorityFor(input.reason, input.targetType);
  const ref = await db.collection('reports').add({
    reporterId: caller.uid,
    targetType: input.targetType,
    targetId: input.targetId,
    relatedConversationId,
    reason: input.reason,
    description: input.description ?? '',
    status: 'open',
    priority,
    adminNotes: [],
    resolution: null,
    resolvedBy: null,
    resolvedAt: null,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  await notifyStaff('admin_new_report', templateFor('admin_new_report', { priority }), 'report', ref.id);
  return { ok: true, reportId: ref.id };
}

/** Staff triage of a report, optionally applying a moderation action. */
export async function updateReport(caller: Caller, raw: unknown) {
  const input = parseInput(updateReportSchema, raw);
  requirePermission(caller, 'report.update');
  const ref = db.collection('reports').doc(input.reportId);
  const report = await ref.get();
  if (!report.exists) fail('not-found', 'report/not-found');

  const targetType = report.get('targetType') as string;
  const targetId = report.get('targetId') as string;
  const actionReason = input.actionReason ?? input.resolution ?? 'report_action';

  if (input.action && input.action !== 'none') {
    if (input.action === 'hide_dish') {
      if (targetType !== 'dish') fail('invalid-argument', 'report/action-target-mismatch');
      await setDishHidden(caller, { dishId: targetId, hidden: true, reason: actionReason });
    } else if (input.action === 'remove_review') {
      if (targetType !== 'review') fail('invalid-argument', 'report/action-target-mismatch');
      await applyReviewModeration(caller.uid, targetId, 'remove', actionReason);
    } else if (input.action === 'suspend_seller') {
      const sellerId = await sellerIdForTarget(targetType, targetId);
      if (!sellerId) fail('invalid-argument', 'report/no-seller-for-target');
      await reviewSeller(caller, { sellerId, decision: 'suspend', reason: actionReason });
    }
  }

  const update: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
  if (input.status) update.status = input.status;
  if (input.priority) update.priority = input.priority;
  if (input.resolution) update.resolution = input.resolution;
  if (input.note) update.adminNotes = FieldValue.arrayUnion({ by: caller.uid, at: Date.now(), text: input.note });
  if (input.status === 'resolved' || input.status === 'dismissed') {
    update.resolvedBy = caller.uid;
    update.resolvedAt = FieldValue.serverTimestamp();
  }
  await ref.update(update);
  await writeAudit({
    actorId: caller.uid,
    action: 'report.update',
    entityType: 'report',
    entityId: input.reportId,
    reason: input.resolution ?? input.actionReason ?? null,
    metadata: {
      status: input.status ?? null,
      priority: input.priority ?? null,
      action: input.action ?? 'none',
      noteAdded: Boolean(input.note),
    },
  });
  return { ok: true };
}

async function sellerIdForTarget(targetType: string, targetId: string): Promise<string | null> {
  if (targetType === 'seller' || targetType === 'hygiene') {
    const seller = await db.collection('sellerProfiles').doc(targetId).get();
    return seller.exists ? targetId : null;
  }
  const collection = { dish: 'dishes', order: 'orders', review: 'reviews' }[targetType];
  if (!collection) return null;
  const snap = await db.collection(collection).doc(targetId).get();
  return (snap.get('sellerId') as string | undefined) ?? null;
}
