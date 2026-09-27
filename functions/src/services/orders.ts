import { createHash } from 'node:crypto';
import type { DocumentSnapshot } from 'firebase-admin/firestore';
import { isOrderable, requiredLeadMinutes, type AvailabilityInput } from '../shared/availability';
import { LIMITS, type FulfillmentMethod, type OrderStatus } from '../shared/constants';
import {
  canTransition,
  DISPUTE_WINDOW_HOURS,
  shouldRestoreInventory,
  STATUS_TIMESTAMP_FIELD,
  type OrderActor,
} from '../shared/orderStateMachine';
import { computeTotals, lineSubtotal } from '../shared/pricing';
import { isScheduleValid } from '../shared/time';
import { writeAuditIn } from '../lib/audit';
import { callerIsStaff, type Caller } from '../lib/context';
import { fail, parseInput } from '../lib/errors';
import { db, FieldValue, Timestamp } from '../lib/firebase';
import { orderStatusCopy, templateFor } from '../lib/notificationTemplates';
import { notify, notifyStaff } from '../lib/notify';
import { enforceRateLimit } from '../lib/rateLimit';
import { placeOrderSchema, updateOrderStatusSchema } from '../lib/schemas';
import { getPaymentProvider } from './payments';

export function orderIdFor(buyerId: string, idempotencyKey: string): string {
  return createHash('sha256').update(`${buyerId}:${idempotencyKey}`).digest('hex').slice(0, 24);
}

export function orderNumberFor(orderId: string): string {
  return `DE-${orderId.slice(0, 6).toUpperCase()}`;
}

export function conversationIdFor(buyerId: string, sellerId: string): string {
  return `${buyerId}_${sellerId}`;
}

function dishAvailability(snap: DocumentSnapshot): AvailabilityInput & { preparationTimeMinutes: number } {
  const d = snap.data() ?? {};
  const cutoff = d.preOrderCutoffAt instanceof Timestamp ? d.preOrderCutoffAt.toMillis() : null;
  return {
    isActive: d.isActive === true,
    isHidden: d.isHidden === true,
    sellerApproved: d.sellerApproved === true,
    availableQuantity: typeof d.availableQuantity === 'number' ? d.availableQuantity : 0,
    availabilityType: d.availabilityType ?? 'today',
    availableFrom: d.availableFrom ?? null,
    availableUntil: d.availableUntil ?? null,
    isPreOrder: d.isPreOrder === true,
    leadTimeHours: d.leadTimeHours ?? null,
    preOrderCutoffAt: cutoff,
    preparationTimeMinutes: typeof d.preparationTimeMinutes === 'number' ? d.preparationTimeMinutes : 30,
  };
}

/**
 * Places a cash-on-delivery order. Prices, totals, seller approval and stock
 * are all read from authoritative Firestore data inside one transaction so
 * concurrent orders can never oversell a dish.
 */
export async function placeOrder(caller: Caller, raw: unknown, now: Date = new Date()) {
  const input = parseInput(placeOrderSchema, raw);
  if (input.sellerId === caller.uid) fail('failed-precondition', 'order/cannot-order-own-food');

  const orderId = orderIdFor(caller.uid, input.idempotencyKey);
  const orderRef = db.collection('orders').doc(orderId);

  // Idempotent retry: return the existing order without charging the rate limit.
  const existing = await orderRef.get();
  if (existing.exists) {
    if (existing.get('buyerId') !== caller.uid) fail('permission-denied', 'order/not-owner');
    return {
      orderId,
      orderNumber: existing.get('orderNumber') as string,
      total: existing.get('total') as number,
      duplicate: true,
    };
  }
  await enforceRateLimit(caller.uid, 'placeOrder', LIMITS.ordersPerBuyerPerHour, 3600);

  const buyerRef = db.collection('users').doc(caller.uid);
  const sellerRef = db.collection('sellerProfiles').doc(input.sellerId);
  const dishRefs = input.items.map((item) => db.collection('dishes').doc(item.dishId));
  const conversationRef = db.collection('conversations').doc(conversationIdFor(caller.uid, input.sellerId));
  const payment = getPaymentProvider(input.paymentMethod);

  const result = await db.runTransaction(async (tx) => {
    const [buyer, seller, again, conversation, ...dishes] = await Promise.all([
      tx.get(buyerRef),
      tx.get(sellerRef),
      tx.get(orderRef),
      tx.get(conversationRef),
      ...dishRefs.map((ref) => tx.get(ref)),
    ]);
    if (again.exists) {
      return {
        orderId,
        orderNumber: again.get('orderNumber') as string,
        total: again.get('total') as number,
        duplicate: true,
      };
    }
    if (!buyer.exists || buyer.get('isActive') === false) fail('permission-denied', 'user/inactive');
    if (!seller.exists || seller.get('status') !== 'approved') fail('failed-precondition', 'seller/not-available');

    const fulfillment = input.fulfillmentMethod as FulfillmentMethod;
    if (fulfillment === 'pickup' && seller.get('pickupAvailable') !== true)
      fail('failed-precondition', 'order/pickup-unavailable');
    if (fulfillment === 'seller_delivery' && seller.get('selfDeliveryAvailable') !== true) {
      fail('failed-precondition', 'order/delivery-unavailable');
    }

    let leadMinutes = 30;
    const lines = input.items.map((item, index) => {
      const snap = dishes[index]!;
      if (!snap.exists) fail('not-found', `dish/not-found:${item.dishId}`);
      if (snap.get('sellerId') !== input.sellerId) fail('invalid-argument', 'order/mixed-sellers');
      const availability = dishAvailability(snap);
      if (!isOrderable(availability, now)) fail('failed-precondition', `dish/unavailable:${item.dishId}`);
      if (availability.availableQuantity < item.quantity)
        fail('failed-precondition', `dish/insufficient-stock:${item.dishId}`);
      leadMinutes = Math.max(leadMinutes, requiredLeadMinutes(availability, availability.preparationTimeMinutes));
      const unitPrice = snap.get('price') as number;
      return {
        dishId: item.dishId,
        dishNameSnapshot: { ar: snap.get('nameAr') as string, fr: snap.get('nameFr') as string },
        imageUrlSnapshot: ((snap.get('imageUrls') as string[] | undefined) ?? [])[0] ?? null,
        unitPriceSnapshot: unitPrice,
        quantity: item.quantity,
        subtotal: lineSubtotal({ unitPrice, quantity: item.quantity }),
        notes: item.notes ?? null,
      };
    });

    if (!isScheduleValid(input.scheduledDate, input.scheduledTimeSlot, now, leadMinutes)) {
      fail('failed-precondition', 'order/invalid-schedule');
    }

    const deliveryFee = fulfillment === 'seller_delivery' ? Number(seller.get('deliveryFee') ?? 0) : 0;
    const totals = computeTotals(
      lines.map((l) => ({ unitPrice: l.unitPriceSnapshot, quantity: l.quantity })),
      deliveryFee,
    );
    if (totals.total > LIMITS.maxOrderTotal) fail('failed-precondition', 'order/total-too-high');

    const paymentInit = payment.createPayment({ orderId, amount: totals.total, currency: 'TND' });
    const orderNumber = orderNumberFor(orderId);

    tx.set(orderRef, {
      orderNumber,
      buyerId: caller.uid,
      buyerName: (buyer.get('displayName') as string) || '',
      sellerId: input.sellerId,
      sellerName: seller.get('displayName') as string,
      status: 'pending' as OrderStatus,
      items: lines,
      ...totals,
      currency: 'TND',
      paymentMethod: input.paymentMethod,
      paymentStatus: paymentInit.status,
      fulfillmentMethod: fulfillment,
      scheduledDate: input.scheduledDate,
      scheduledTimeSlot: input.scheduledTimeSlot,
      buyerNotes: input.buyerNotes ?? null,
      deliveryAddress: fulfillment === 'seller_delivery' ? (input.deliveryAddress ?? null) : null,
      deliveryLatitude: fulfillment === 'seller_delivery' ? (input.deliveryLatitude ?? null) : null,
      deliveryLongitude: fulfillment === 'seller_delivery' ? (input.deliveryLongitude ?? null) : null,
      pickupDetails: null,
      sellerNotes: null,
      reviewed: false,
      statusHistory: [{ status: 'pending', at: now.getTime(), by: caller.uid }],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      acceptedAt: null,
      readyAt: null,
      completedAt: null,
      cancelledAt: null,
      cancelReason: null,
    });

    lines.forEach((line, index) => {
      tx.update(dishRefs[index]!, { availableQuantity: FieldValue.increment(-line.quantity) });
    });

    if (conversation.exists) {
      tx.update(conversationRef, { orderId, updatedAt: FieldValue.serverTimestamp() });
    } else {
      tx.set(conversationRef, {
        buyerId: caller.uid,
        sellerId: input.sellerId,
        participants: [caller.uid, input.sellerId],
        buyerName: (buyer.get('displayName') as string) || '',
        sellerName: seller.get('displayName') as string,
        orderId,
        lastMessageText: null,
        lastMessageAt: null,
        buyerUnread: 0,
        sellerUnread: 0,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    return { orderId, orderNumber, total: totals.total, duplicate: false };
  });

  if (!result.duplicate) {
    await notify({
      userId: input.sellerId,
      type: 'order_created',
      copy: templateFor('order_created', { orderNumber: result.orderNumber }),
      relatedEntityType: 'order',
      relatedEntityId: orderId,
    });
  }
  return result;
}

function actorFor(caller: Caller, order: DocumentSnapshot): OrderActor | null {
  if (order.get('sellerId') === caller.uid) return 'seller';
  if (order.get('buyerId') === caller.uid) return 'buyer';
  if (callerIsStaff(caller)) return 'admin';
  return null;
}

/** Validates and applies an order status transition (server-authoritative). */
export async function updateOrderStatus(caller: Caller, raw: unknown, now: Date = new Date()) {
  const input = parseInput(updateOrderStatusSchema, raw);
  const orderRef = db.collection('orders').doc(input.orderId);
  const to = input.status as OrderStatus;

  const outcome = await db.runTransaction(async (tx) => {
    const order = await tx.get(orderRef);
    if (!order.exists) fail('not-found', 'order/not-found');
    const actor = actorFor(caller, order);
    if (!actor) fail('permission-denied', 'order/not-participant');

    const from = order.get('status') as OrderStatus;
    const fulfillment = order.get('fulfillmentMethod') as FulfillmentMethod;
    if (!canTransition(from, to, actor, fulfillment))
      fail('failed-precondition', `order/invalid-transition-${from}-${to}`);

    if (to === 'disputed' && from === 'completed') {
      const completedAt = order.get('completedAt') as Timestamp | null;
      if (completedAt && now.getTime() - completedAt.toMillis() > DISPUTE_WINDOW_HOURS * 3600_000) {
        fail('failed-precondition', 'order/dispute-window-closed');
      }
    }
    if ((to === 'cancelled' || to === 'disputed') && !input.reason) fail('invalid-argument', 'validation:reason');

    const sellerRef = db.collection('sellerProfiles').doc(order.get('sellerId') as string);
    const items = (order.get('items') as { dishId: string; quantity: number }[]) ?? [];
    const dishSnaps = shouldRestoreInventory(from, to)
      ? await Promise.all(items.map((item) => tx.get(db.collection('dishes').doc(item.dishId))))
      : [];

    const update: Record<string, unknown> = {
      status: to,
      updatedAt: FieldValue.serverTimestamp(),
      statusHistory: FieldValue.arrayUnion({ status: to, at: now.getTime(), by: caller.uid }),
    };
    const tsField = STATUS_TIMESTAMP_FIELD[to];
    if (tsField) update[tsField] = FieldValue.serverTimestamp();
    if (input.sellerNotes && actor === 'seller') update.sellerNotes = input.sellerNotes;

    if (to === 'accepted') {
      // Suspended or unapproved sellers can never accept new orders.
      const [seller, priv] = await Promise.all([
        tx.get(sellerRef),
        tx.get(db.collection('sellerPrivate').doc(order.get('sellerId') as string)),
      ]);
      if (seller.get('status') !== 'approved') fail('failed-precondition', 'seller/not-available');
      if (fulfillment === 'pickup') {
        // Exact pickup details are shared only with this order's buyer, only after acceptance.
        update.pickupDetails = {
          address: (priv.get('pickupAddress') as string) || null,
          latitude: priv.get('exactLatitude') ?? null,
          longitude: priv.get('exactLongitude') ?? null,
        };
      }
    }
    if (to === 'completed') {
      update.paymentStatus = getPaymentProvider('cash_on_delivery').confirmPayment({ orderId: input.orderId }).status;
      tx.update(sellerRef, { orderCount: FieldValue.increment(1) });
    }
    if (to === 'cancelled') {
      update.cancelReason = input.reason ?? null;
      update.paymentStatus = getPaymentProvider('cash_on_delivery').refundPayment({ orderId: input.orderId }).status;
      update.pickupDetails = null;
      dishSnaps.forEach((snap, index) => {
        if (snap.exists) tx.update(snap.ref, { availableQuantity: FieldValue.increment(items[index]!.quantity) });
      });
    }
    if (to === 'disputed') {
      update.disputeReason = input.reason ?? null;
      const reportRef = db.collection('reports').doc();
      tx.set(reportRef, {
        reporterId: caller.uid,
        targetType: 'order',
        targetId: input.orderId,
        relatedConversationId: conversationIdFor(order.get('buyerId'), order.get('sellerId')),
        reason: 'other',
        description: input.reason ?? '',
        status: 'open',
        priority: 'high',
        adminNotes: [],
        resolution: null,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    tx.update(orderRef, update);

    if (actor === 'admin' || to === 'cancelled' || to === 'disputed') {
      writeAuditIn(tx, {
        actorId: caller.uid,
        action: `order.${to}`,
        entityType: 'order',
        entityId: input.orderId,
        reason: input.reason ?? null,
        metadata: { from, to, actor },
      });
    }
    return {
      actor,
      buyerId: order.get('buyerId') as string,
      sellerId: order.get('sellerId') as string,
      orderNumber: order.get('orderNumber') as string,
    };
  });

  const recipients =
    outcome.actor === 'seller'
      ? [outcome.buyerId]
      : outcome.actor === 'buyer'
        ? [outcome.sellerId]
        : [outcome.buyerId, outcome.sellerId];
  await Promise.all(
    recipients.map((userId) =>
      notify({
        userId,
        type: to === 'cancelled' ? 'order_cancelled' : 'order_status_changed',
        copy: orderStatusCopy(to, outcome.orderNumber),
        relatedEntityType: 'order',
        relatedEntityId: input.orderId,
      }),
    ),
  );
  if (to === 'disputed') {
    await notifyStaff(
      'admin_new_report',
      templateFor('admin_new_report', { priority: 'high' }),
      'order',
      input.orderId,
    );
  }
  return { ok: true, status: to };
}

/** Cancels pending orders whose scheduled slot has already passed. */
export async function expireStalePendingOrders(now: Date = new Date()): Promise<number> {
  const cutoff = Timestamp.fromMillis(now.getTime() - 12 * 3600_000);
  const snap = await db
    .collection('orders')
    .where('status', '==', 'pending')
    .where('createdAt', '<', cutoff)
    .limit(200)
    .get();
  let expired = 0;
  for (const doc of snap.docs) {
    try {
      await updateOrderStatus(
        { uid: 'system', roles: ['admin'], phoneNumber: null },
        { orderId: doc.id, status: 'cancelled', reason: 'expired_not_accepted' },
        now,
      );
      expired += 1;
    } catch {
      // Order changed concurrently; skip.
    }
  }
  return expired;
}
