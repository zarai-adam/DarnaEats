import { readFileSync } from 'node:fs';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';

let env: RulesTestEnvironment;

const BUYER = 'buyer1';
const SELLER = 'seller1';
const OTHER_SELLER = 'seller2';
const SUSPENDED = 'seller3';
const ADMIN = 'admin1';

const buyer = () => env.authenticatedContext(BUYER, { roles: ['buyer'] }).firestore();
const seller = () => env.authenticatedContext(SELLER, { roles: ['buyer', 'seller'] }).firestore();
const otherSeller = () => env.authenticatedContext(OTHER_SELLER, { roles: ['buyer', 'seller'] }).firestore();
const suspended = () => env.authenticatedContext(SUSPENDED, { roles: ['buyer', 'seller'] }).firestore();
const admin = () => env.authenticatedContext(ADMIN, { roles: ['buyer', 'admin'] }).firestore();
const anon = () => env.unauthenticatedContext().firestore();

function validDish(sellerId: string) {
  return {
    sellerId,
    categoryId: 'lunch',
    nameAr: 'كسكسي',
    nameFr: 'Couscous',
    descriptionAr: '',
    descriptionFr: '',
    imageUrls: [],
    price: 12,
    currency: 'TND',
    portionDescriptionAr: '',
    portionDescriptionFr: '',
    availableQuantity: 5,
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
    allergens: ['gluten'],
    allergensDeclared: true,
    isActive: true,
    isHidden: false,
    sellerApproved: true,
  };
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-darna-eats',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'users', BUYER), {
      role: 'buyer',
      roles: ['buyer'],
      displayName: 'B',
      preferredLanguage: 'fr',
      photoUrl: null,
      isActive: true,
    });
    await setDoc(doc(db, 'sellerProfiles', SELLER), {
      status: 'approved',
      displayName: 'S1',
      story: '',
      specialties: [],
      serviceAreas: [],
      serviceAreaId: null,
      approximateLatitude: null,
      approximateLongitude: null,
      pickupAvailable: true,
      selfDeliveryAvailable: false,
      deliveryFee: 0,
      profilePhotoUrl: null,
      kitchenPhotoUrl: null,
      averageRating: 0,
    });
    await setDoc(doc(db, 'sellerProfiles', OTHER_SELLER), {
      status: 'submitted',
      displayName: 'S2',
      story: '',
      specialties: [],
      serviceAreas: [],
      serviceAreaId: null,
      approximateLatitude: null,
      approximateLongitude: null,
      pickupAvailable: true,
      selfDeliveryAvailable: false,
      deliveryFee: 0,
      profilePhotoUrl: null,
      kitchenPhotoUrl: null,
    });
    await setDoc(doc(db, 'sellerProfiles', SUSPENDED), {
      status: 'suspended',
      displayName: 'S3',
      story: '',
      specialties: [],
      serviceAreas: [],
      serviceAreaId: null,
      pickupAvailable: true,
      selfDeliveryAvailable: false,
      deliveryFee: 0,
    });
    await setDoc(doc(db, 'sellerVerification', SELLER), {
      status: 'approved',
      identityDocumentPath: 'verification/seller1/id.jpg',
    });
    await setDoc(doc(db, 'sellerVerification', OTHER_SELLER), {
      status: 'draft',
      legalFullName: '',
      identityDocumentPath: null,
      identityDocumentType: null,
      kitchenPhotoPath: null,
      hygieneAgreementAccepted: false,
      foodSafetyAgreementAccepted: false,
    });
    await setDoc(doc(db, 'sellerPrivate', SELLER), {
      pickupAddress: '12 rue secrète',
      exactLatitude: 36.8,
      exactLongitude: 10.1,
    });
    await setDoc(doc(db, 'serviceAreas', 'area1'), {
      approximateLatitude: 36.84,
      approximateLongitude: 10.18,
      isActive: true,
    });
    await setDoc(doc(db, 'dishes', 'dish1'), { ...validDish(SELLER) });
    await setDoc(doc(db, 'dishes', 'hiddenDish'), { ...validDish(SELLER), isHidden: true });
    await setDoc(doc(db, 'dishes', 'pendingSellerDish'), { ...validDish(OTHER_SELLER), sellerApproved: false });
    await setDoc(doc(db, 'orders', 'order1'), {
      buyerId: BUYER,
      sellerId: SELLER,
      status: 'pending',
      total: 12,
      deliveryAddress: 'Home',
    });
    await setDoc(doc(db, 'reviews', 'order1'), { sellerId: SELLER, reviewerId: BUYER, status: 'visible', rating: 5 });
    await setDoc(doc(db, 'reviews', 'removed1'), { sellerId: SELLER, reviewerId: 'x', status: 'removed', rating: 1 });
    await setDoc(doc(db, 'auditLogs', 'log1'), { actorId: ADMIN, action: 'seller.approve' });
    await setDoc(doc(db, 'conversations', `${BUYER}_${SELLER}`), {
      buyerId: BUYER,
      sellerId: SELLER,
      participants: [BUYER, SELLER],
      buyerUnread: 2,
      sellerUnread: 3,
    });
    await setDoc(doc(db, 'notifications', 'n1'), { userId: BUYER, isRead: false, titleFr: 'x' });
  });
});

describe('roles & users', () => {
  it('users cannot modify their own role', async () => {
    await assertFails(updateDoc(doc(buyer(), 'users', BUYER), { roles: ['admin'] }));
    await assertFails(updateDoc(doc(buyer(), 'users', BUYER), { role: 'admin' }));
  });
  it('users can update safe profile fields', async () => {
    await assertSucceeds(updateDoc(doc(buyer(), 'users', BUYER), { displayName: 'Yassine', preferredLanguage: 'ar' }));
  });
  it('users cannot create profiles directly or read other users', async () => {
    await assertFails(setDoc(doc(buyer(), 'users', 'someone'), { roles: ['admin'] }));
    await assertFails(getDoc(doc(seller(), 'users', BUYER)));
  });
  it('unauthenticated users cannot read protected data', async () => {
    await assertFails(getDoc(doc(anon(), 'users', BUYER)));
    await assertFails(getDoc(doc(anon(), 'orders', 'order1')));
    await assertFails(getDoc(doc(anon(), 'dishes', 'dish1')));
    await assertFails(getDoc(doc(anon(), 'sellerPrivate', SELLER)));
  });
});

describe('seller approval & verification', () => {
  it('buyer cannot approve a seller', async () => {
    await assertFails(updateDoc(doc(buyer(), 'sellerProfiles', OTHER_SELLER), { status: 'approved' }));
  });
  it('seller cannot self-approve', async () => {
    await assertFails(updateDoc(doc(otherSeller(), 'sellerProfiles', OTHER_SELLER), { status: 'approved' }));
    await assertFails(updateDoc(doc(otherSeller(), 'sellerVerification', OTHER_SELLER), { status: 'approved' }));
    await assertFails(updateDoc(doc(otherSeller(), 'sellerProfiles', OTHER_SELLER), { averageRating: 5 }));
  });
  it('seller can edit their storefront fields', async () => {
    await assertSucceeds(
      updateDoc(doc(otherSeller(), 'sellerProfiles', OTHER_SELLER), { story: 'Hello', displayName: 'Chez S2' }),
    );
  });
  it('public coordinates must match the service area centre', async () => {
    await assertFails(
      updateDoc(doc(otherSeller(), 'sellerProfiles', OTHER_SELLER), {
        serviceAreaId: 'area1',
        approximateLatitude: 36.84237,
        approximateLongitude: 10.18291,
      }),
    );
    await assertSucceeds(
      updateDoc(doc(otherSeller(), 'sellerProfiles', OTHER_SELLER), {
        serviceAreaId: 'area1',
        approximateLatitude: 36.84,
        approximateLongitude: 10.18,
      }),
    );
  });
  it('non-approved sellers are not publicly readable', async () => {
    await assertFails(getDoc(doc(buyer(), 'sellerProfiles', OTHER_SELLER)));
    await assertSucceeds(getDoc(doc(buyer(), 'sellerProfiles', SELLER)));
    await assertSucceeds(getDocs(query(collection(buyer(), 'sellerProfiles'), where('status', '==', 'approved'))));
    await assertFails(getDocs(collection(buyer(), 'sellerProfiles')));
  });
  it("sellers cannot access another seller's private or verification data", async () => {
    await assertFails(getDoc(doc(otherSeller(), 'sellerVerification', SELLER)));
    await assertFails(getDoc(doc(otherSeller(), 'sellerPrivate', SELLER)));
    await assertFails(getDoc(doc(buyer(), 'sellerPrivate', SELLER)));
    await assertSucceeds(getDoc(doc(seller(), 'sellerPrivate', SELLER)));
    await assertSucceeds(getDoc(doc(admin(), 'sellerVerification', SELLER)));
  });
  it('verification paths must point at the owner folder', async () => {
    await assertFails(
      updateDoc(doc(otherSeller(), 'sellerVerification', OTHER_SELLER), {
        identityDocumentPath: 'verification/seller1/id.jpg',
      }),
    );
    await assertSucceeds(
      updateDoc(doc(otherSeller(), 'sellerVerification', OTHER_SELLER), {
        identityDocumentPath: 'verification/seller2/id.jpg',
        identityDocumentType: 'national_id',
      }),
    );
  });
  it('approved verification can no longer be edited by the seller', async () => {
    await assertFails(updateDoc(doc(seller(), 'sellerVerification', SELLER), { legalFullName: 'x' }));
  });
});

describe('dishes', () => {
  it('approved seller can create a valid dish', async () => {
    await assertSucceeds(setDoc(doc(seller(), 'dishes', 'new1'), validDish(SELLER)));
  });
  it('rejects invalid dishes and spoofed ownership', async () => {
    await assertFails(setDoc(doc(seller(), 'dishes', 'bad1'), { ...validDish(SELLER), price: -5 }));
    await assertFails(setDoc(doc(seller(), 'dishes', 'bad2'), validDish(OTHER_SELLER)));
    await assertFails(setDoc(doc(seller(), 'dishes', 'bad3'), { ...validDish(SELLER), searchTokens: ['x'] }));
  });
  it('unapproved and suspended sellers cannot publish dishes', async () => {
    await assertFails(setDoc(doc(otherSeller(), 'dishes', 'x1'), { ...validDish(OTHER_SELLER) }));
    await assertFails(setDoc(doc(suspended(), 'dishes', 'x2'), { ...validDish(SUSPENDED) }));
  });
  it('sellers cannot unhide admin-hidden dishes or flip approval', async () => {
    await assertFails(updateDoc(doc(seller(), 'dishes', 'hiddenDish'), { isHidden: false }));
    await assertFails(updateDoc(doc(seller(), 'dishes', 'dish1'), { sellerApproved: false }));
    await assertSucceeds(updateDoc(doc(seller(), 'dishes', 'dish1'), { availableQuantity: 0 }));
  });
  it('buyers only see public dishes', async () => {
    await assertSucceeds(getDoc(doc(buyer(), 'dishes', 'dish1')));
    await assertFails(getDoc(doc(buyer(), 'dishes', 'hiddenDish')));
    await assertFails(getDoc(doc(buyer(), 'dishes', 'pendingSellerDish')));
    await assertSucceeds(
      getDocs(
        query(
          collection(buyer(), 'dishes'),
          where('sellerApproved', '==', true),
          where('isActive', '==', true),
          where('isHidden', '==', false),
        ),
      ),
    );
  });
  it("sellers cannot edit another seller's dish", async () => {
    await assertFails(updateDoc(doc(otherSeller(), 'dishes', 'dish1'), { price: 1 }));
  });
});

describe('orders, reviews & reports', () => {
  it('clients cannot write orders (totals are server-computed)', async () => {
    await assertFails(
      setDoc(doc(buyer(), 'orders', 'fake'), { buyerId: BUYER, sellerId: SELLER, total: 0.01, status: 'pending' }),
    );
    await assertFails(updateDoc(doc(buyer(), 'orders', 'order1'), { total: 1 }));
    await assertFails(updateDoc(doc(seller(), 'orders', 'order1'), { status: 'completed' }));
  });
  it('only participants can read an order (private address protected)', async () => {
    await assertSucceeds(getDoc(doc(buyer(), 'orders', 'order1')));
    await assertSucceeds(getDoc(doc(seller(), 'orders', 'order1')));
    await assertFails(getDoc(doc(otherSeller(), 'orders', 'order1')));
  });
  it('reviews: visible ones are public, removed ones are not; no client writes', async () => {
    await assertSucceeds(getDoc(doc(otherSeller(), 'reviews', 'order1')));
    await assertFails(getDoc(doc(otherSeller(), 'reviews', 'removed1')));
    await assertFails(setDoc(doc(buyer(), 'reviews', 'x'), { rating: 5, sellerId: SELLER }));
    await assertFails(updateDoc(doc(seller(), 'reviews', 'order1'), { status: 'removed' }));
  });
  it('clients cannot write reports or moderation decisions directly', async () => {
    await assertFails(addDoc(collection(buyer(), 'reports'), { reporterId: BUYER, status: 'resolved' }));
  });
});

describe('audit logs', () => {
  it('are append-only from the server; clients cannot write or edit', async () => {
    await assertFails(addDoc(collection(admin(), 'auditLogs'), { action: 'fake' }));
    await assertFails(updateDoc(doc(admin(), 'auditLogs', 'log1'), { action: 'tampered' }));
    await assertFails(deleteDoc(doc(admin(), 'auditLogs', 'log1')));
    await assertFails(getDoc(doc(buyer(), 'auditLogs', 'log1')));
    await assertSucceeds(getDoc(doc(admin(), 'auditLogs', 'log1')));
  });
});

describe('chat', () => {
  const cid = `${BUYER}_${SELLER}`;
  it('participants can send valid messages', async () => {
    await assertSucceeds(
      addDoc(collection(buyer(), 'conversations', cid, 'messages'), {
        senderId: BUYER,
        text: 'Salam',
        imagePath: null,
        isRead: false,
        createdAt: serverTimestamp(),
      }),
    );
  });
  it('rejects spoofed senders, oversize messages and outsiders', async () => {
    await assertFails(
      addDoc(collection(buyer(), 'conversations', cid, 'messages'), {
        senderId: SELLER,
        text: 'x',
        imagePath: null,
        isRead: false,
        createdAt: serverTimestamp(),
      }),
    );
    await assertFails(
      addDoc(collection(buyer(), 'conversations', cid, 'messages'), {
        senderId: BUYER,
        text: 'x'.repeat(1001),
        imagePath: null,
        isRead: false,
        createdAt: serverTimestamp(),
      }),
    );
    await assertFails(
      addDoc(collection(otherSeller(), 'conversations', cid, 'messages'), {
        senderId: OTHER_SELLER,
        text: 'hi',
        imagePath: null,
        isRead: false,
        createdAt: serverTimestamp(),
      }),
    );
    await assertFails(getDoc(doc(otherSeller(), 'conversations', cid)));
  });
  it('admins cannot read conversations directly (audited function only)', async () => {
    await assertFails(getDoc(doc(admin(), 'conversations', cid)));
  });
  it('participants may only reset their own unread counter', async () => {
    await assertSucceeds(updateDoc(doc(buyer(), 'conversations', cid), { buyerUnread: 0 }));
    await assertFails(updateDoc(doc(buyer(), 'conversations', cid), { sellerUnread: 0, buyerUnread: 0 }));
  });
  it('buyers can open a conversation only with approved sellers', async () => {
    const base = {
      buyerName: 'B',
      sellerName: 'S',
      orderId: null,
      lastMessageText: null,
      lastMessageAt: null,
      buyerUnread: 0,
      sellerUnread: 0,
    };
    await assertFails(
      setDoc(doc(buyer(), 'conversations', `${BUYER}_${OTHER_SELLER}`), {
        ...base,
        buyerId: BUYER,
        sellerId: OTHER_SELLER,
        participants: [BUYER, OTHER_SELLER],
      }),
    );
  });
});

describe('notifications', () => {
  it('owners can mark read but not forge', async () => {
    await assertSucceeds(updateDoc(doc(buyer(), 'notifications', 'n1'), { isRead: true }));
    await assertFails(updateDoc(doc(buyer(), 'notifications', 'n1'), { titleFr: 'forged' }));
    await assertFails(addDoc(collection(buyer(), 'notifications'), { userId: SELLER, titleFr: 'spam' }));
    await assertFails(getDoc(doc(seller(), 'notifications', 'n1')));
  });
});
