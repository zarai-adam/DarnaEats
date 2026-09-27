import { writeAuditIn } from '../lib/audit';
import { requirePermission, type Caller } from '../lib/context';
import { fail, parseInput } from '../lib/errors';
import { db, FieldValue } from '../lib/firebase';
import { templateFor } from '../lib/notificationTemplates';
import { notify, notifyStaff } from '../lib/notify';
import { enforceRateLimit } from '../lib/rateLimit';
import { flagReviewSchema, moderateReviewSchema, respondToReviewSchema, submitReviewSchema } from '../lib/schemas';
import { LIMITS } from '../shared/constants';
import { roundMoney } from '../shared/pricing';

/** Recomputes a running average when a rating is added (+1) or removed (-1). */
export function adjustAverage(average: number, count: number, rating: number, delta: 1 | -1) {
  const nextCount = Math.max(0, count + delta);
  if (nextCount === 0) return { averageRating: 0, reviewCount: 0 };
  const nextAverage = (average * count + delta * rating) / nextCount;
  return { averageRating: Math.round(nextAverage * 100) / 100, reviewCount: nextCount };
}

/**
 * Reviews are post-moderated: visible immediately, one per completed order,
 * and only by the buyer of that order. Review id == order id.
 */
export async function submitReview(caller: Caller, raw: unknown) {
  const input = parseInput(submitReviewSchema, raw);
  const orderRef = db.collection('orders').doc(input.orderId);
  const reviewRef = db.collection('reviews').doc(input.orderId);

  const sellerId = await db.runTransaction(async (tx) => {
    const [order, existing] = await Promise.all([tx.get(orderRef), tx.get(reviewRef)]);
    if (!order.exists) fail('not-found', 'order/not-found');
    if (order.get('buyerId') !== caller.uid) fail('permission-denied', 'review/not-buyer');
    if (order.get('status') !== 'completed') fail('failed-precondition', 'review/order-not-completed');
    if (existing.exists) fail('already-exists', 'review/already-submitted');

    const sellerRef = db.collection('sellerProfiles').doc(order.get('sellerId') as string);
    const seller = await tx.get(sellerRef);
    const stats = adjustAverage(
      Number(seller.get('averageRating') ?? 0),
      Number(seller.get('reviewCount') ?? 0),
      input.rating,
      1,
    );

    const buyerName = ((order.get('buyerName') as string) || '').split(' ')[0] ?? '';
    tx.set(reviewRef, {
      orderId: input.orderId,
      reviewerId: caller.uid,
      reviewerName: buyerName,
      revieweeId: order.get('sellerId'),
      sellerId: order.get('sellerId'),
      rating: input.rating,
      comment: input.comment ?? '',
      status: 'visible',
      sellerResponse: null,
      sellerResponseAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(sellerRef, stats);
    tx.update(orderRef, { reviewed: true });
    return order.get('sellerId') as string;
  });

  await notify({
    userId: sellerId,
    type: 'new_review',
    copy: templateFor('new_review', { rating: String(input.rating) }),
    relatedEntityType: 'review',
    relatedEntityId: input.orderId,
  });
  return { ok: true, reviewId: input.orderId };
}

export async function respondToReview(caller: Caller, raw: unknown) {
  const input = parseInput(respondToReviewSchema, raw);
  const ref = db.collection('reviews').doc(input.reviewId);
  const reviewerId = await db.runTransaction(async (tx) => {
    const review = await tx.get(ref);
    if (!review.exists) fail('not-found', 'review/not-found');
    if (review.get('sellerId') !== caller.uid) fail('permission-denied', 'review/not-seller');
    if (review.get('sellerResponse')) fail('already-exists', 'review/already-responded');
    if (review.get('status') === 'removed') fail('failed-precondition', 'review/removed');
    tx.update(ref, {
      sellerResponse: input.response,
      sellerResponseAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return review.get('reviewerId') as string;
  });
  await notify({
    userId: reviewerId,
    type: 'review_response',
    copy: templateFor('review_response'),
    relatedEntityType: 'review',
    relatedEntityId: input.reviewId,
  });
  return { ok: true };
}

/** Any signed-in user can flag a review; it stays visible until moderated. */
export async function flagReview(caller: Caller, raw: unknown) {
  const input = parseInput(flagReviewSchema, raw);
  await enforceRateLimit(caller.uid, 'report', LIMITS.reportsPerUserPerDay, 86400);
  const ref = db.collection('reviews').doc(input.reviewId);
  await db.runTransaction(async (tx) => {
    const review = await tx.get(ref);
    if (!review.exists || review.get('status') === 'removed') fail('not-found', 'review/not-found');
    if (review.get('status') === 'visible')
      tx.update(ref, { status: 'flagged', updatedAt: FieldValue.serverTimestamp() });
    tx.set(db.collection('reports').doc(), {
      reporterId: caller.uid,
      targetType: 'review',
      targetId: input.reviewId,
      relatedConversationId: null,
      reason: input.reason,
      description: input.description ?? '',
      status: 'open',
      priority: 'medium',
      adminNotes: [],
      resolution: null,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  await notifyStaff('admin_flagged_review', templateFor('admin_flagged_review'), 'review', input.reviewId);
  return { ok: true };
}

/** Staff moderation of a review. Keeps seller aggregates consistent. */
export async function moderateReview(caller: Caller, raw: unknown) {
  const input = parseInput(moderateReviewSchema, raw);
  requirePermission(caller, 'review.moderate');
  await applyReviewModeration(caller.uid, input.reviewId, input.action, input.reason);
  return { ok: true };
}

export async function applyReviewModeration(
  actorId: string,
  reviewId: string,
  action: 'remove' | 'restore' | 'dismiss_flag',
  reason: string,
): Promise<void> {
  const ref = db.collection('reviews').doc(reviewId);
  await db.runTransaction(async (tx) => {
    const review = await tx.get(ref);
    if (!review.exists) fail('not-found', 'review/not-found');
    const status = review.get('status') as string;
    const sellerRef = db.collection('sellerProfiles').doc(review.get('sellerId') as string);
    const seller = await tx.get(sellerRef);
    const avg = Number(seller.get('averageRating') ?? 0);
    const count = Number(seller.get('reviewCount') ?? 0);
    const rating = Number(review.get('rating'));

    if (action === 'remove') {
      if (status === 'removed') fail('failed-precondition', 'review/already-removed');
      tx.update(sellerRef, adjustAverage(avg, count, rating, -1));
      tx.update(ref, {
        status: 'removed',
        moderationReason: reason,
        moderatedBy: actorId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else if (action === 'restore') {
      if (status !== 'removed') fail('failed-precondition', 'review/not-removed');
      tx.update(sellerRef, adjustAverage(avg, count, rating, 1));
      tx.update(ref, {
        status: 'visible',
        moderationReason: reason,
        moderatedBy: actorId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      if (status !== 'flagged') fail('failed-precondition', 'review/not-flagged');
      tx.update(ref, {
        status: 'visible',
        moderationReason: reason,
        moderatedBy: actorId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    writeAuditIn(tx, {
      actorId,
      action: `review.${action}`,
      entityType: 'review',
      entityId: reviewId,
      reason,
      metadata: { from: status, rating: roundMoney(rating) },
    });
  });
}
