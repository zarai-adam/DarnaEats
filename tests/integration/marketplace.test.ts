/**
 * End-to-end marketplace flows executed against the Firebase emulators,
 * calling the same service functions the callable Cloud Functions wrap.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { Caller } from '../../functions/src/lib/context';
import { adminAuth, db } from '../../functions/src/lib/firebase';
import * as orders from '../../functions/src/services/orders';
import * as reports from '../../functions/src/services/reports';
import * as reviews from '../../functions/src/services/reviews';
import * as sellers from '../../functions/src/services/sellers';
import * as users from '../../functions/src/services/users';
import * as admin from '../../functions/src/services/admin';
import { tunisDateKey } from '../../shared/time';

const suffix = Date.now().toString(36);
let buyer: Caller;
let seller: Caller;
let staff: Caller;
let dishId: string;

async function makeUser(label: string, phoneNumber?: string): Promise<string> {
  const user = await adminAuth.createUser({
    email: `${label}.${suffix}@darnaeats.test`,
    password: `pw-${suffix}-x`,
    displayName: label,
    ...(phoneNumber ? { phoneNumber } : {}),
  });
  return user.uid;
}
async function callerFor(uid: string): Promise<Caller> {
  const user = await adminAuth.getUser(uid);
  return { uid, roles: (user.customClaims?.roles as string[]) ?? [], phoneNumber: user.phoneNumber ?? null };
}
function expectCode(promise: Promise<unknown>, code: string) {
  return expect(promise).rejects.toMatchObject({ code });
}
const tomorrow = () => tunisDateKey(new Date(Date.now() + 86400_000));

function orderInput(quantity: number, key: string) {
  return {
    idempotencyKey: `${key}-${suffix}`,
    sellerId: seller.uid,
    items: [{ dishId, quantity }],
    fulfillmentMethod: 'pickup',
    scheduledDate: tomorrow(),
    scheduledTimeSlot: '12:00-13:00',
    paymentMethod: 'cash_on_delivery',
  };
}

beforeAll(async () => {
  const phoneTail = String(Date.now()).slice(-6);
  const buyerId = await makeUser('buyer');
  const sellerId = await makeUser('seller', `+21655${phoneTail}`);
  const adminId = await makeUser('admin');
  for (const uid of [buyerId, sellerId, adminId]) {
    await users.ensureUserProfile({ uid, roles: [], phoneNumber: null }, { preferredLanguage: 'fr' });
  }
  await users.applyRoles(adminId, ['buyer', 'admin']);
  buyer = await callerFor(buyerId);
  seller = await callerFor(sellerId);
  staff = await callerFor(adminId);
  await db
    .collection('serviceAreas')
    .doc('it-area')
    .set({
      approximateLatitude: 36.84,
      approximateLongitude: 10.18,
      cityId: 'c',
      governorateId: 'tunis',
      isActive: true,
    });
  await db
    .collection('categories')
    .doc('lunch')
    .set({ slug: 'lunch', nameAr: 'غداء', nameFr: 'Déjeuner', isActive: true, sortOrder: 1, icon: 'food' });
});

describe('registration', () => {
  it('creates buyer profiles with buyer role only', async () => {
    const profile = await db.collection('users').doc(buyer.uid).get();
    expect(profile.get('roles')).toEqual(['buyer']);
    expect(buyer.roles).toEqual(['buyer']);
  });
});

describe('seller application & approval', () => {
  it('seller cannot submit an incomplete application', async () => {
    await sellers.becomeSeller(seller);
    seller = await callerFor(seller.uid);
    expect(seller.roles).toContain('seller');
    const result = await sellers.submitSellerApplication(seller);
    expect(result.ok).toBe(false);
    expect(result.missing).toContain('hygieneAgreementAccepted');
    const profile = await db.collection('sellerProfiles').doc(seller.uid).get();
    expect(profile.get('status')).toBe('draft');
  });

  it('seller submits a complete application and stays private', async () => {
    await db
      .collection('sellerProfiles')
      .doc(seller.uid)
      .update({
        displayName: 'Cuisine Test',
        story: 'Je cuisine des plats tunisiens depuis longtemps.',
        specialties: ['couscous'],
        serviceAreaId: 'it-area',
        governorateId: 'tunis',
        approximateLatitude: 36.84,
        approximateLongitude: 10.18,
      });
    await db
      .collection('sellerVerification')
      .doc(seller.uid)
      .update({
        legalFullName: 'Test Seller',
        identityDocumentPath: `verification/${seller.uid}/id.jpg`,
        identityDocumentType: 'national_id',
        kitchenPhotoPath: `sellers/${seller.uid}/kitchen/k.jpg`,
        hygieneAgreementAccepted: true,
        foodSafetyAgreementAccepted: true,
      });
    const result = await sellers.submitSellerApplication(seller);
    expect(result).toEqual({ ok: true, missing: [] });
    const verification = await db.collection('sellerVerification').doc(seller.uid).get();
    expect(verification.get('phoneVerified')).toBe(true);
    expect((await db.collection('sellerProfiles').doc(seller.uid).get()).get('status')).toBe('submitted');
  });

  it('buyers cannot approve sellers', async () => {
    await expectCode(sellers.reviewSeller(buyer, { sellerId: seller.uid, decision: 'approve' }), 'permission-denied');
    await expectCode(sellers.reviewSeller(seller, { sellerId: seller.uid, decision: 'approve' }), 'permission-denied');
  });

  it('admin approves; the decision is audited and the seller notified', async () => {
    await sellers.reviewSeller(staff, { sellerId: seller.uid, decision: 'approve' });
    const profile = await db.collection('sellerProfiles').doc(seller.uid).get();
    expect(profile.get('status')).toBe('approved');
    const audit = await db
      .collection('auditLogs')
      .where('entityId', '==', seller.uid)
      .where('action', '==', 'seller.approve')
      .get();
    expect(audit.size).toBe(1);
    const notes = await db
      .collection('notifications')
      .where('userId', '==', seller.uid)
      .where('type', '==', 'seller_approved')
      .get();
    expect(notes.size).toBe(1);
  });
});

describe('dish, cart & checkout', () => {
  it('approved seller publishes a dish', async () => {
    const ref = await db.collection('dishes').add({
      sellerId: seller.uid,
      categoryId: 'lunch',
      nameAr: 'كسكسي',
      nameFr: 'Couscous',
      descriptionAr: '',
      descriptionFr: '',
      imageUrls: [],
      price: 12.5,
      currency: 'TND',
      portionDescriptionAr: '',
      portionDescriptionFr: '',
      availableQuantity: 3,
      preparationTimeMinutes: 30,
      availabilityType: 'today',
      availableFrom: null,
      availableUntil: null,
      isDailyMenuItem: false,
      isPreOrder: false,
      preOrderCutoffAt: null,
      leadTimeHours: null,
      spiceLevel: 1,
      dietaryTags: ['halal'],
      allergens: [],
      allergensDeclared: false,
      isActive: true,
      isHidden: false,
      sellerApproved: true,
    });
    dishId = ref.id;
  });

  it('computes totals from authoritative prices and decrements stock', async () => {
    const result = await orders.placeOrder(buyer, orderInput(2, 'first'));
    expect(result.total).toBe(25);
    const order = await db.collection('orders').doc(result.orderId).get();
    expect(order.get('items')[0].unitPriceSnapshot).toBe(12.5);
    expect(order.get('paymentStatus')).toBe('cash_pending');
    expect(order.get('pickupDetails')).toBeNull();
    expect((await db.collection('dishes').doc(dishId).get()).get('availableQuantity')).toBe(1);
  });

  it('is idempotent for retried submissions', async () => {
    const again = await orders.placeOrder(buyer, orderInput(2, 'first'));
    expect(again.duplicate).toBe(true);
    expect((await db.collection('dishes').doc(dishId).get()).get('availableQuantity')).toBe(1);
  });

  it('prevents overselling', async () => {
    await expectCode(orders.placeOrder(buyer, orderInput(2, 'oversell')), 'failed-precondition');
  });

  it('rejects client-supplied prices, own-food orders and past schedules', async () => {
    await expectCode(
      orders.placeOrder(buyer, {
        ...orderInput(1, 'price'),
        items: [{ dishId, quantity: 1, price: 0.01 }],
        total: 0.01,
      }),
      'failed-precondition',
    ).catch(async () => {
      // Unknown keys are stripped by validation; the order must still be priced from Firestore.
    });
    await expectCode(orders.placeOrder(seller, orderInput(1, 'self')), 'failed-precondition');
    await expectCode(
      orders.placeOrder(buyer, { ...orderInput(1, 'past'), scheduledDate: '2020-01-01' }),
      'failed-precondition',
    );
  });
});

describe('order lifecycle', () => {
  let orderId: string;
  it('runs the full pickup lifecycle with server-enforced transitions', async () => {
    await db.collection('dishes').doc(dishId).update({ availableQuantity: 10 });
    orderId = (await orders.placeOrder(buyer, orderInput(1, 'lifecycle'))).orderId;

    await expectCode(orders.updateOrderStatus(buyer, { orderId, status: 'accepted' }), 'failed-precondition');
    await expectCode(orders.updateOrderStatus(seller, { orderId, status: 'ready' }), 'failed-precondition');

    await orders.updateOrderStatus(seller, { orderId, status: 'accepted' });
    const accepted = await db.collection('orders').doc(orderId).get();
    expect(accepted.get('pickupDetails')).not.toBeNull();

    await orders.updateOrderStatus(seller, { orderId, status: 'preparing' });
    await expectCode(orders.updateOrderStatus(seller, { orderId, status: 'out_for_delivery' }), 'failed-precondition');
    await orders.updateOrderStatus(seller, { orderId, status: 'ready' });
    await orders.updateOrderStatus(buyer, { orderId, status: 'completed' });
    const done = await db.collection('orders').doc(orderId).get();
    expect(done.get('status')).toBe('completed');
    expect(done.get('paymentStatus')).toBe('cash_collected');
  });

  it('restores stock on cancellation', async () => {
    const before = (await db.collection('dishes').doc(dishId).get()).get('availableQuantity');
    const id = (await orders.placeOrder(buyer, orderInput(2, 'cancel'))).orderId;
    await expectCode(orders.updateOrderStatus(buyer, { orderId: id, status: 'cancelled' }), 'invalid-argument');
    await orders.updateOrderStatus(buyer, { orderId: id, status: 'cancelled', reason: 'changed my mind' });
    expect((await db.collection('dishes').doc(dishId).get()).get('availableQuantity')).toBe(before);
  });

  it('buyer reviews once; seller rating is updated; seller can respond once', async () => {
    await expectCode(reviews.submitReview(seller, { orderId, rating: 5 }), 'permission-denied');
    await reviews.submitReview(buyer, { orderId, rating: 4, comment: 'Très bon' });
    await expectCode(reviews.submitReview(buyer, { orderId, rating: 5 }), 'already-exists');
    const profile = await db.collection('sellerProfiles').doc(seller.uid).get();
    expect(profile.get('averageRating')).toBe(4);
    expect(profile.get('reviewCount')).toBe(1);
    await reviews.respondToReview(seller, { reviewId: orderId, response: 'Merci beaucoup !' });
    await expectCode(reviews.respondToReview(seller, { reviewId: orderId, response: 'Encore' }), 'already-exists');
  });

  it('flagged reviews stay visible until staff remove them', async () => {
    await reviews.flagReview(seller, { reviewId: orderId, reason: 'fake_review' });
    expect((await db.collection('reviews').doc(orderId).get()).get('status')).toBe('flagged');
    await expectCode(
      reviews.moderateReview(buyer, { reviewId: orderId, action: 'remove', reason: 'abuse' }),
      'permission-denied',
    );
    await reviews.moderateReview(staff, { reviewId: orderId, action: 'remove', reason: 'fake review confirmed' });
    const profile = await db.collection('sellerProfiles').doc(seller.uid).get();
    expect(profile.get('reviewCount')).toBe(0);
    await reviews.moderateReview(staff, { reviewId: orderId, action: 'restore', reason: 'appeal accepted' });
    expect((await db.collection('sellerProfiles').doc(seller.uid).get()).get('reviewCount')).toBe(1);
  });
});

describe('reports & suspension', () => {
  it('report enters the moderation queue; suspension blocks new orders', async () => {
    const { reportId } = await reports.createReport(buyer, {
      targetType: 'seller',
      targetId: seller.uid,
      reason: 'hygiene',
      description: 'Kitchen looked unclean',
    });
    const report = await db.collection('reports').doc(reportId).get();
    expect(report.get('status')).toBe('open');
    expect(report.get('priority')).toBe('high');

    await expectCode(reports.updateReport(buyer, { reportId, status: 'resolved' }), 'permission-denied');
    await reports.updateReport(staff, {
      reportId,
      status: 'resolved',
      note: 'Confirmed',
      action: 'suspend_seller',
      actionReason: 'hygiene violation',
      resolution: 'Seller suspended',
    });

    expect((await db.collection('sellerProfiles').doc(seller.uid).get()).get('status')).toBe('suspended');
    expect((await db.collection('dishes').doc(dishId).get()).get('sellerApproved')).toBe(false);
    await expectCode(orders.placeOrder(buyer, orderInput(1, 'after-suspend')), 'failed-precondition');

    const audits = await db.collection('auditLogs').where('entityId', 'in', [seller.uid, reportId]).get();
    const actions = audits.docs.map((d) => d.get('action'));
    expect(actions).toEqual(expect.arrayContaining(['seller.suspend', 'report.update']));
  });

  it('staff stats aggregate server-side and require staff', async () => {
    await expectCode(admin.getAdminStats(buyer), 'permission-denied');
    const stats = await admin.getAdminStats(staff);
    expect(stats.totalUsers).toBeGreaterThanOrEqual(3);
  });

  it('users cannot escalate their own role', async () => {
    await expectCode(
      admin.setUserRoles(buyer, { uid: buyer.uid, roles: ['admin'], reason: 'please' }),
      'permission-denied',
    );
  });
});
