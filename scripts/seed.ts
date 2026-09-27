/**
 * DEVELOPMENT-ONLY seed script. Populates the Firebase EMULATORS with
 * fictional Greater Tunis demo data and demo accounts.
 *
 *   firebase emulators:start            (in another terminal)
 *   SEED_DEMO_PASSWORD=... npm run seed
 *
 * It refuses to run against a real project. Demo passwords are never
 * hardcoded: they come from SEED_DEMO_PASSWORD or are generated and printed.
 */
import { randomBytes } from 'node:crypto';
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { buildSearchTokens } from '../shared/text';
import { tunisDateKey } from '../shared/time';
import { categories, cities, governorates, sellers, serviceAreas, type SeedDish } from './seedData';

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error(
    'Refusing to seed: FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST must point at local emulators.',
  );
  process.exit(1);
}

const projectId = process.env.GCLOUD_PROJECT ?? process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? 'demo-darna-eats';
initializeApp({ projectId });
const db = getFirestore();
const auth = getAuth();

const password = process.env.SEED_DEMO_PASSWORD || randomBytes(9).toString('base64url');
const DEMO_DOMAIN = 'darnaeats.test';

async function upsertUser(email: string, displayName: string, roles: string[], phoneNumber?: string) {
  let uid: string;
  try {
    const existing = await auth.getUserByEmail(email);
    uid = existing.uid;
    await auth.updateUser(uid, { password, displayName, ...(phoneNumber ? { phoneNumber } : {}) });
  } catch {
    const created = await auth.createUser({
      email,
      password,
      displayName,
      emailVerified: true,
      ...(phoneNumber ? { phoneNumber } : {}),
    });
    uid = created.uid;
  }
  await auth.setCustomUserClaims(uid, { roles });
  const primary = roles.includes('admin') ? 'admin' : roles.includes('seller') ? 'seller' : 'buyer';
  await db
    .collection('users')
    .doc(uid)
    .set({
      role: primary,
      roles,
      displayName,
      email,
      phoneNumber: phoneNumber ?? null,
      photoUrl: null,
      preferredLanguage: 'fr',
      acceptedTermsVersion: '1.0',
      isActive: true,
      isDemoAccount: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      lastLoginAt: null,
    });
  return uid;
}

function dishDoc(sellerId: string, seller: (typeof sellers)[number], dish: SeedDish, index: number) {
  const area = serviceAreas.find((a) => a.id === seller.areaId)!;
  const category = categories.find((c) => c.id === dish.categoryId)!;
  return {
    sellerId,
    categoryId: dish.categoryId,
    nameAr: dish.nameAr,
    nameFr: dish.nameFr,
    descriptionAr: dish.descriptionAr,
    descriptionFr: dish.descriptionFr,
    // Demo data intentionally ships without photos; the app renders a local placeholder.
    imageUrls: [],
    price: dish.price,
    currency: 'TND',
    portionDescriptionAr: dish.portionAr,
    portionDescriptionFr: dish.portionFr,
    availableQuantity: dish.qty,
    preparationTimeMinutes: dish.prep,
    availabilityType: dish.preorder ? 'preorder' : 'today',
    availableFrom: dish.from ?? null,
    availableUntil: dish.until ?? null,
    isDailyMenuItem: Boolean(dish.daily),
    isPreOrder: Boolean(dish.preorder),
    preOrderCutoffAt: null,
    leadTimeHours: dish.preorder?.leadTimeHours ?? null,
    spiceLevel: dish.spice,
    dietaryTags: dish.tags,
    allergens: dish.allergens,
    // Only dishes whose cook explicitly declared allergens (even "none") show a declaration.
    allergensDeclared: dish.allergens.length > 0 || dish.allergensDeclared === true,
    isActive: true,
    isHidden: false,
    sellerApproved: true,
    // Server-maintained denormalised fields (normally written by onDishWritten).
    sellerName: seller.displayName,
    sellerRating: 0,
    sellerReviewCount: 0,
    serviceAreaId: area.id,
    cityId: area.cityId,
    governorateId: area.governorateId,
    approximateLatitude: area.lat,
    approximateLongitude: area.lng,
    pickupAvailable: seller.pickup,
    selfDeliveryAvailable: seller.delivery,
    searchTokens: buildSearchTokens([
      dish.nameAr,
      dish.nameFr,
      seller.displayName,
      category.slug,
      ...seller.specialties,
      ...dish.tags,
    ]),
    createdAt: Timestamp.fromMillis(Date.now() - index * 3600_000),
    updatedAt: FieldValue.serverTimestamp(),
  };
}

async function seedCatalog() {
  const batch = db.batch();
  for (const g of governorates)
    batch.set(db.collection('governorates').doc(g.id), {
      nameAr: g.nameAr,
      nameFr: g.nameFr,
      slug: g.id,
      isActive: g.isActive,
    });
  for (const c of cities) batch.set(db.collection('cities').doc(c.id), { ...c, slug: c.id, isActive: true });
  for (const a of serviceAreas) {
    batch.set(db.collection('serviceAreas').doc(a.id), {
      cityId: a.cityId,
      governorateId: a.governorateId,
      nameAr: a.nameAr,
      nameFr: a.nameFr,
      approximateLatitude: a.lat,
      approximateLongitude: a.lng,
      isActive: true,
    });
  }
  for (const c of categories) batch.set(db.collection('categories').doc(c.id), { ...c, isActive: true });
  batch.set(db.collection('appSettings').doc('marketplace'), {
    key: 'marketplace',
    value: 'greater_tunis',
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'seed',
  });
  batch.set(db.collection('appSettings').doc('termsVersion'), {
    key: 'termsVersion',
    value: '1.0',
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'seed',
  });
  await batch.commit();
}

async function main() {
  console.log(`Seeding emulator project "${projectId}"...`);
  await seedCatalog();

  const buyerId = await upsertUser(`buyer.demo@${DEMO_DOMAIN}`, 'Yassine (démo)', ['buyer'], '+21620000001');
  const adminId = await upsertUser(`admin.demo@${DEMO_DOMAIN}`, 'Admin (démo)', ['buyer', 'admin']);
  await upsertUser(`moderator.demo@${DEMO_DOMAIN}`, 'Modérateur (démo)', ['buyer', 'moderator']);
  const pendingId = await upsertUser(
    `pending.seller@${DEMO_DOMAIN}`,
    'Hela (candidate démo)',
    ['buyer', 'seller'],
    '+21620000099',
  );

  const sellerIds: Record<string, string> = {};
  let dishIndex = 0;
  const allDishIds: { id: string; sellerKey: string; price: number; nameAr: string; nameFr: string }[] = [];

  for (const [i, seller] of sellers.entries()) {
    const email = seller.key === 'seller.demo' ? `seller.demo@${DEMO_DOMAIN}` : `${seller.key}@${DEMO_DOMAIN}`;
    const uid = await upsertUser(
      email,
      seller.displayName,
      ['buyer', 'seller'],
      `+2162100${String(i).padStart(4, '0')}`,
    );
    sellerIds[seller.key] = uid;
    const area = serviceAreas.find((a) => a.id === seller.areaId)!;

    await db
      .collection('sellerProfiles')
      .doc(uid)
      .set({
        userId: uid,
        status: 'approved',
        displayName: seller.displayName,
        story: seller.story,
        profilePhotoUrl: null,
        kitchenPhotoUrl: null,
        specialties: seller.specialties,
        governorateId: area.governorateId,
        cityId: area.cityId,
        serviceAreaId: area.id,
        serviceAreas: [area.id],
        approximateLatitude: area.lat,
        approximateLongitude: area.lng,
        pickupAvailable: seller.pickup,
        selfDeliveryAvailable: seller.delivery,
        deliveryFee: seller.deliveryFee,
        averageRating: 0,
        reviewCount: 0,
        orderCount: 0,
        verifiedAt: Timestamp.fromMillis(Date.now() - 30 * 86400_000),
        createdAt: Timestamp.fromMillis(Date.now() - 45 * 86400_000),
        updatedAt: FieldValue.serverTimestamp(),
      });
    await db
      .collection('sellerVerification')
      .doc(uid)
      .set({
        sellerId: uid,
        status: 'approved',
        legalFullName: `${seller.displayName} (fictif)`,
        identityDocumentPath: null,
        identityDocumentType: 'national_id',
        kitchenPhotoPath: null,
        phoneVerified: true,
        hygieneAgreementAccepted: true,
        foodSafetyAgreementAccepted: true,
        submittedAt: Timestamp.fromMillis(Date.now() - 40 * 86400_000),
        reviewedAt: Timestamp.fromMillis(Date.now() - 30 * 86400_000),
        reviewedBy: adminId,
        rejectionReason: null,
        adminNotes: 'Demo seller - seeded data',
      });
    await db
      .collection('sellerPrivate')
      .doc(uid)
      .set({
        sellerId: uid,
        pickupAddress: `Adresse fictive de démo, ${area.nameFr}`,
        contactPhone: null,
        exactLatitude: null,
        exactLongitude: null,
      });

    const dailyIds: string[] = [];
    for (const dish of seller.dishes) {
      const ref = db.collection('dishes').doc();
      await ref.set(dishDoc(uid, seller, dish, dishIndex++));
      allDishIds.push({
        id: ref.id,
        sellerKey: seller.key,
        price: dish.price,
        nameAr: dish.nameAr,
        nameFr: dish.nameFr,
      });
      if (!dish.preorder) dailyIds.push(ref.id);
    }

    // Today's daily menu for every other seller.
    if (i % 2 === 0) {
      const summaries = seller.dishes
        .filter((d) => !d.preorder)
        .slice(0, 3)
        .map((d) => {
          const match = allDishIds.find((x) => x.sellerKey === seller.key && x.nameFr === d.nameFr)!;
          return { id: match.id, nameAr: d.nameAr, nameFr: d.nameFr, price: d.price, imageUrl: null };
        });
      await db
        .collection('menus')
        .doc(`${uid}_${tunisDateKey()}`)
        .set({
          sellerId: uid,
          date: tunisDateKey(),
          titleAr: 'قائمة اليوم',
          titleFr: 'Menu du jour',
          descriptionAr: 'أطباق طازجة محضّرة اليوم.',
          descriptionFr: "Plats frais préparés aujourd'hui.",
          dishIds: summaries.map((s) => s.id),
          status: 'published',
          sellerApproved: true,
          dishSummaries: summaries,
          sellerName: seller.displayName,
          serviceAreaId: area.id,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
    }
  }

  // A pending application so the admin verification queue has something to review.
  await db
    .collection('sellerProfiles')
    .doc(pendingId)
    .set({
      userId: pendingId,
      status: 'submitted',
      displayName: 'Cuisine de Hela (démo)',
      story: 'Candidature de démonstration: couscous et pâtisseries de Béja.',
      profilePhotoUrl: null,
      kitchenPhotoUrl: null,
      specialties: ['couscous', 'pastries'],
      governorateId: 'manouba',
      cityId: 'den-den',
      serviceAreaId: 'denden-centre',
      serviceAreas: ['denden-centre'],
      approximateLatitude: 36.81,
      approximateLongitude: 10.12,
      pickupAvailable: true,
      selfDeliveryAvailable: false,
      deliveryFee: 0,
      averageRating: 0,
      reviewCount: 0,
      orderCount: 0,
      verifiedAt: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  await db.collection('sellerVerification').doc(pendingId).set({
    sellerId: pendingId,
    status: 'submitted',
    legalFullName: 'Hela Candidate (fictif)',
    identityDocumentPath: null,
    identityDocumentType: 'national_id',
    kitchenPhotoPath: null,
    phoneVerified: true,
    hygieneAgreementAccepted: true,
    foodSafetyAgreementAccepted: true,
    submittedAt: FieldValue.serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
    rejectionReason: null,
    adminNotes: null,
  });
  await db
    .collection('sellerPrivate')
    .doc(pendingId)
    .set({ sellerId: pendingId, pickupAddress: '', contactPhone: null, exactLatitude: null, exactLongitude: null });

  // Completed demo orders with genuine reviews, so ratings match real review documents.
  const reviewPlan: { sellerKey: string; rating: number; comment: string }[] = [
    { sellerKey: 'seller.demo', rating: 5, comment: 'Couscous délicieux, comme chez ma grand-mère.' },
    { sellerKey: 'seller2', rating: 4, comment: 'ملاوي بنين برشا، شوية حار.' },
    { sellerKey: 'seller3', rating: 5, comment: "Brik bien croustillante, livraison à l'heure." },
    { sellerKey: 'seller4', rating: 5, comment: "Makroudh parfait pour l'Aïd." },
  ];
  for (const [n, plan] of reviewPlan.entries()) {
    const sellerId = sellerIds[plan.sellerKey]!;
    const dish = allDishIds.find((d) => d.sellerKey === plan.sellerKey)!;
    const orderRef = db.collection('orders').doc(`demo-order-${n + 1}`);
    const completedAt = Timestamp.fromMillis(Date.now() - (n + 2) * 86400_000);
    const seller = sellers.find((s) => s.key === plan.sellerKey)!;
    await orderRef.set({
      orderNumber: `DE-DEMO${n + 1}`,
      buyerId,
      buyerName: 'Yassine (démo)',
      sellerId,
      sellerName: seller.displayName,
      status: 'completed',
      items: [
        {
          dishId: dish.id,
          dishNameSnapshot: { ar: dish.nameAr, fr: dish.nameFr },
          imageUrlSnapshot: null,
          unitPriceSnapshot: dish.price,
          quantity: 2,
          subtotal: dish.price * 2,
          notes: null,
        },
      ],
      subtotal: dish.price * 2,
      deliveryFee: 0,
      total: dish.price * 2,
      currency: 'TND',
      paymentMethod: 'cash_on_delivery',
      paymentStatus: 'cash_collected',
      fulfillmentMethod: 'pickup',
      scheduledDate: tunisDateKey(completedAt.toDate()),
      scheduledTimeSlot: '12:00-13:00',
      buyerNotes: null,
      deliveryAddress: null,
      deliveryLatitude: null,
      deliveryLongitude: null,
      pickupDetails: null,
      sellerNotes: null,
      reviewed: true,
      statusHistory: [{ status: 'completed', at: completedAt.toMillis(), by: sellerId }],
      createdAt: completedAt,
      updatedAt: completedAt,
      acceptedAt: completedAt,
      readyAt: completedAt,
      completedAt,
      cancelledAt: null,
      cancelReason: null,
    });
    await db.collection('reviews').doc(orderRef.id).set({
      orderId: orderRef.id,
      reviewerId: buyerId,
      reviewerName: 'Yassine',
      revieweeId: sellerId,
      sellerId,
      rating: plan.rating,
      comment: plan.comment,
      status: 'visible',
      sellerResponse: null,
      sellerResponseAt: null,
      createdAt: completedAt,
      updatedAt: completedAt,
    });
    await db
      .collection('sellerProfiles')
      .doc(sellerId)
      .update({ averageRating: plan.rating, reviewCount: 1, orderCount: 1 });
    const dishes = await db.collection('dishes').where('sellerId', '==', sellerId).get();
    await Promise.all(dishes.docs.map((d) => d.ref.update({ sellerRating: plan.rating, sellerReviewCount: 1 })));
    await db
      .collection('conversations')
      .doc(`${buyerId}_${sellerId}`)
      .set({
        buyerId,
        sellerId,
        participants: [buyerId, sellerId],
        buyerName: 'Yassine (démo)',
        sellerName: seller.displayName,
        orderId: orderRef.id,
        lastMessageText: null,
        lastMessageAt: null,
        buyerUnread: 0,
        sellerUnread: 0,
        createdAt: completedAt,
        updatedAt: completedAt,
      });
  }

  console.log('\nSeed complete (EMULATOR ONLY - development accounts):');
  console.log(`  Buyer   : buyer.demo@${DEMO_DOMAIN}`);
  console.log(`  Seller  : seller.demo@${DEMO_DOMAIN}   (approved, "Cuisine de Khalti Najet")`);
  console.log(`  Pending : pending.seller@${DEMO_DOMAIN} (application awaiting review)`);
  console.log(`  Admin   : admin.demo@${DEMO_DOMAIN}`);
  console.log(`  Moderator: moderator.demo@${DEMO_DOMAIN}`);
  console.log(
    process.env.SEED_DEMO_PASSWORD
      ? '  Password: value of SEED_DEMO_PASSWORD'
      : `  Generated password (this run only): ${password}`,
  );
  console.log(
    `  ${sellers.length} approved sellers, ${allDishIds.length} dishes, ${serviceAreas.length} service areas.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
