import { logger } from 'firebase-functions/v2';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { LIMITS } from '../shared/constants';
import { db, FieldValue, REGION } from '../lib/firebase';
import { templateFor } from '../lib/notificationTemplates';
import { notify } from '../lib/notify';
import { computeDishDerived, derivedChanged, sellerDenormalized } from '../services/dishes';

/** Keeps dish search tokens and seller denormalisation in sync. */
export const onDishWritten = onDocumentWritten({ document: 'dishes/{dishId}', region: REGION }, async (event) => {
  const after = event.data?.after;
  if (!after?.exists) return;
  const dish = after.data()!;
  const [seller, category] = await Promise.all([
    db.collection('sellerProfiles').doc(dish.sellerId).get(),
    dish.categoryId ? db.collection('categories').doc(dish.categoryId).get() : Promise.resolve(null),
  ]);
  const derived = computeDishDerived(dish, seller.data(), (category?.get('slug') as string | undefined) ?? null);
  // Guard against trigger loops: only write when something actually changed.
  if (derivedChanged(dish, derived)) {
    await after.ref.update(derived);
  }
});

const SELLER_DENORM_FIELDS = [
  'displayName',
  'averageRating',
  'reviewCount',
  'serviceAreaId',
  'cityId',
  'governorateId',
  'approximateLatitude',
  'approximateLongitude',
  'pickupAvailable',
  'selfDeliveryAvailable',
  'specialties',
];

/** Propagates public seller fields onto that seller's dishes, menus and conversations. */
export const onSellerProfileWritten = onDocumentWritten(
  { document: 'sellerProfiles/{sellerId}', region: REGION },
  async (event) => {
    const before = event.data?.before?.data();
    const after = event.data?.after?.data();
    if (!after) return;
    const changed = SELLER_DENORM_FIELDS.some(
      (f) => JSON.stringify(before?.[f] ?? null) !== JSON.stringify(after[f] ?? null),
    );
    if (!changed) return;

    const sellerId = event.params.sellerId;
    const denorm = sellerDenormalized(after);
    const dishes = await db.collection('dishes').where('sellerId', '==', sellerId).get();
    for (let i = 0; i < dishes.docs.length; i += 400) {
      const batch = db.batch();
      // Touching `sellerName` et al. re-runs onDishWritten, which rebuilds search tokens.
      dishes.docs.slice(i, i + 400).forEach((d) => batch.update(d.ref, { ...denorm }));
      await batch.commit();
    }
    if (before?.displayName !== after.displayName) {
      const menus = await db.collection('menus').where('sellerId', '==', sellerId).get();
      const batch = db.batch();
      menus.docs.forEach((m) => batch.update(m.ref, { sellerName: after.displayName ?? '' }));
      await batch.commit();
    }
  },
);

/** Stores compact dish summaries on published menus so the daily feed is a single query. */
export const onMenuWritten = onDocumentWritten({ document: 'menus/{menuId}', region: REGION }, async (event) => {
  const after = event.data?.after;
  if (!after?.exists) return;
  const menu = after.data()!;
  const dishIds = ((menu.dishIds as string[] | undefined) ?? []).slice(0, 20);
  const dishes = await Promise.all(dishIds.map((id) => db.collection('dishes').doc(id).get()));
  const summaries = dishes
    .filter((d) => d.exists && d.get('sellerId') === menu.sellerId)
    .map((d) => ({
      id: d.id,
      nameAr: d.get('nameAr') as string,
      nameFr: d.get('nameFr') as string,
      price: d.get('price') as number,
      imageUrl: ((d.get('imageUrls') as string[] | undefined) ?? [])[0] ?? null,
    }));
  const seller = await db.collection('sellerProfiles').doc(menu.sellerId).get();
  const next = {
    dishSummaries: summaries,
    sellerName: (seller.get('displayName') as string) ?? '',
    sellerApproved: seller.get('status') === 'approved',
    serviceAreaId: (seller.get('serviceAreaId') as string | null) ?? null,
  };
  if (
    JSON.stringify({
      a: menu.dishSummaries,
      b: menu.sellerName,
      c: menu.sellerApproved,
      d: menu.serviceAreaId ?? null,
    }) !== JSON.stringify({ a: next.dishSummaries, b: next.sellerName, c: next.sellerApproved, d: next.serviceAreaId })
  ) {
    await after.ref.update(next);
  }
});

/** Updates conversation metadata and pushes a notification to the recipient. */
export const onMessageCreated = onDocumentCreated(
  { document: 'conversations/{conversationId}/messages/{messageId}', region: REGION },
  async (event) => {
    const message = event.data?.data();
    if (!message) return;
    const convoRef = db.collection('conversations').doc(event.params.conversationId);
    const convo = await convoRef.get();
    if (!convo.exists) return;
    const senderIsBuyer = message.senderId === convo.get('buyerId');
    const recipientId = (senderIsBuyer ? convo.get('sellerId') : convo.get('buyerId')) as string;
    const preview = typeof message.text === 'string' ? message.text.slice(0, 120) : '';
    await convoRef.update({
      lastMessageText: preview || '📷',
      lastMessageAt: message.createdAt ?? FieldValue.serverTimestamp(),
      lastSenderId: message.senderId,
      [senderIsBuyer ? 'sellerUnread' : 'buyerUnread']: FieldValue.increment(1),
      updatedAt: FieldValue.serverTimestamp(),
    });
    if (preview.length > LIMITS.maxMessageLength)
      logger.warn('oversized message slipped past rules', { id: event.params.messageId });
    // Messages are push-only (no in-app notification doc) to limit writes.
    await notify({
      userId: recipientId,
      type: 'new_message',
      copy: templateFor('new_message', {
        senderName: (senderIsBuyer ? convo.get('buyerName') : convo.get('sellerName')) as string,
      }),
      relatedEntityType: 'conversation',
      relatedEntityId: event.params.conversationId,
      persist: false,
    });
  },
);
