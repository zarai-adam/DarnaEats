import type { SellerStatus } from '../shared/constants';
import {
  canSubmitApplication,
  decisionRequiresReason,
  missingApplicationRequirements,
  nextSellerStatus,
  type SellerDecision,
} from '../shared/sellerApproval';
import { writeAudit } from '../lib/audit';
import { requirePermission, type Caller } from '../lib/context';
import { fail, parseInput } from '../lib/errors';
import { adminAuth, db, FieldValue } from '../lib/firebase';
import { templateFor } from '../lib/notificationTemplates';
import { notify, notifyStaff } from '../lib/notify';
import { sellerDecisionSchema } from '../lib/schemas';
import { applyRoles } from './users';

/**
 * Opts the caller into selling. Creates private draft documents; nothing
 * becomes public until an admin approves the application.
 */
export async function becomeSeller(caller: Caller) {
  const userRef = db.collection('users').doc(caller.uid);
  const profileRef = db.collection('sellerProfiles').doc(caller.uid);
  const verificationRef = db.collection('sellerVerification').doc(caller.uid);
  const privateRef = db.collection('sellerPrivate').doc(caller.uid);

  const userSnap = await userRef.get();
  if (!userSnap.exists) fail('failed-precondition', 'user/profile-missing');
  if (userSnap.get('isActive') === false) fail('permission-denied', 'user/inactive');

  await db.runTransaction(async (tx) => {
    const [profile, verification, priv] = await Promise.all([
      tx.get(profileRef),
      tx.get(verificationRef),
      tx.get(privateRef),
    ]);
    if (!profile.exists) {
      tx.set(profileRef, {
        userId: caller.uid,
        status: 'draft',
        displayName: userSnap.get('displayName') ?? '',
        story: '',
        profilePhotoUrl: null,
        kitchenPhotoUrl: null,
        specialties: [],
        governorateId: null,
        cityId: null,
        serviceAreaId: null,
        serviceAreas: [],
        approximateLatitude: null,
        approximateLongitude: null,
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
    }
    if (!verification.exists) {
      tx.set(verificationRef, {
        sellerId: caller.uid,
        status: 'draft',
        legalFullName: '',
        identityDocumentPath: null,
        identityDocumentType: null,
        kitchenPhotoPath: null,
        phoneVerified: false,
        hygieneAgreementAccepted: false,
        foodSafetyAgreementAccepted: false,
        submittedAt: null,
        reviewedAt: null,
        reviewedBy: null,
        rejectionReason: null,
        adminNotes: null,
      });
    }
    if (!priv.exists) {
      tx.set(privateRef, {
        sellerId: caller.uid,
        pickupAddress: '',
        contactPhone: null,
        exactLatitude: null,
        exactLongitude: null,
      });
    }
  });

  const roles = new Set([...((userSnap.get('roles') as string[] | undefined) ?? ['buyer']), 'buyer', 'seller']);
  await applyRoles(caller.uid, [...roles]);
  return { ok: true };
}

export async function submitSellerApplication(caller: Caller) {
  const profileRef = db.collection('sellerProfiles').doc(caller.uid);
  const verificationRef = db.collection('sellerVerification').doc(caller.uid);
  const authUser = await adminAuth.getUser(caller.uid);
  // Phone verification is authoritative from Firebase Auth, never from the client.
  const phoneVerified = Boolean(authUser.phoneNumber);

  const missing = await db.runTransaction(async (tx) => {
    const [profile, verification] = await Promise.all([tx.get(profileRef), tx.get(verificationRef)]);
    if (!profile.exists || !verification.exists) fail('failed-precondition', 'seller/not-started');
    const status = profile.get('status') as SellerStatus;
    if (!canSubmitApplication(status)) fail('failed-precondition', `seller/cannot-submit-from-${status}`);

    const missingFields = missingApplicationRequirements({
      displayName: profile.get('displayName'),
      story: profile.get('story'),
      specialties: profile.get('specialties'),
      serviceAreaId: profile.get('serviceAreaId'),
      kitchenPhotoPath: verification.get('kitchenPhotoPath'),
      identityDocumentPath: verification.get('identityDocumentPath'),
      identityDocumentType: verification.get('identityDocumentType'),
      legalFullName: verification.get('legalFullName'),
      phoneVerified,
      hygieneAgreementAccepted: verification.get('hygieneAgreementAccepted'),
      foodSafetyAgreementAccepted: verification.get('foodSafetyAgreementAccepted'),
    });
    if (missingFields.length > 0) return missingFields;

    tx.update(profileRef, { status: 'submitted', updatedAt: FieldValue.serverTimestamp() });
    tx.update(verificationRef, {
      status: 'submitted',
      phoneVerified,
      submittedAt: FieldValue.serverTimestamp(),
      rejectionReason: null,
    });
    return [];
  });

  if (missing.length > 0) {
    return { ok: false, missing };
  }
  await writeAudit({
    actorId: caller.uid,
    action: 'seller.application_submitted',
    entityType: 'seller',
    entityId: caller.uid,
  });
  await notifyStaff('admin_new_application', templateFor('admin_new_application'), 'seller', caller.uid);
  return { ok: true, missing: [] as string[] };
}

/** Flips the server-maintained `sellerApproved` flag on a seller's dishes and menus. */
export async function setSellerContentVisibility(sellerId: string, approved: boolean): Promise<void> {
  for (const collection of ['dishes', 'menus'] as const) {
    const snap = await db.collection(collection).where('sellerId', '==', sellerId).get();
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = db.batch();
      snap.docs.slice(i, i + 400).forEach((doc) => batch.update(doc.ref, { sellerApproved: approved }));
      await batch.commit();
    }
  }
}

async function cancelOpenOrdersForSeller(sellerId: string, actorId: string): Promise<number> {
  const snap = await db
    .collection('orders')
    .where('sellerId', '==', sellerId)
    .where('status', 'in', ['pending', 'accepted', 'preparing'])
    .get();
  for (const doc of snap.docs) {
    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(doc.ref);
      const status = fresh.get('status');
      if (!['pending', 'accepted', 'preparing'].includes(status)) return;
      const items = (fresh.get('items') as { dishId: string; quantity: number }[]) ?? [];
      const dishRefs = items.map((item) => db.collection('dishes').doc(item.dishId));
      const dishSnaps = await Promise.all(dishRefs.map((ref) => tx.get(ref)));
      tx.update(doc.ref, {
        status: 'cancelled',
        cancelledAt: FieldValue.serverTimestamp(),
        cancelReason: 'seller_suspended',
        paymentStatus: 'not_applicable',
        updatedAt: FieldValue.serverTimestamp(),
        statusHistory: FieldValue.arrayUnion({ status: 'cancelled', at: Date.now(), by: actorId }),
      });
      dishSnaps.forEach((snap, i) => {
        if (snap.exists) tx.update(snap.ref, { availableQuantity: FieldValue.increment(items[i]!.quantity) });
      });
    });
    await notify({
      userId: doc.get('buyerId'),
      type: 'order_cancelled',
      copy: templateFor('order_cancelled', { orderNumber: doc.get('orderNumber') ?? doc.id }),
      relatedEntityType: 'order',
      relatedEntityId: doc.id,
    });
  }
  return snap.size;
}

/** Admin/moderator decision on a seller. Every decision is audited. */
export async function reviewSeller(caller: Caller, raw: unknown) {
  const input = parseInput(sellerDecisionSchema, raw);
  const decision = input.decision as SellerDecision;
  requirePermission(caller, decision === 'suspend' || decision === 'reactivate' ? 'seller.suspend' : 'seller.review');
  if (decisionRequiresReason(decision) && !input.reason) fail('invalid-argument', 'validation:reason');

  const profileRef = db.collection('sellerProfiles').doc(input.sellerId);
  const verificationRef = db.collection('sellerVerification').doc(input.sellerId);

  const { from, to } = await db.runTransaction(async (tx) => {
    const [profile, verification] = await Promise.all([tx.get(profileRef), tx.get(verificationRef)]);
    if (!profile.exists) fail('not-found', 'seller/not-found');
    const current = profile.get('status') as SellerStatus;
    const next = nextSellerStatus(current, decision);
    if (!next) fail('failed-precondition', `seller/invalid-transition-${current}-${decision}`);

    const profileUpdate: Record<string, unknown> = { status: next, updatedAt: FieldValue.serverTimestamp() };
    if (decision === 'approve') profileUpdate.verifiedAt = FieldValue.serverTimestamp();
    tx.update(profileRef, profileUpdate);

    if (verification.exists) {
      const verificationStatus =
        decision === 'request_changes'
          ? 'changes_requested'
          : decision === 'start_review'
            ? 'under_review'
            : decision === 'approve'
              ? 'approved'
              : decision === 'reject'
                ? 'rejected'
                : verification.get('status');
      tx.update(verificationRef, {
        status: verificationStatus,
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: caller.uid,
        rejectionReason: decision === 'reject' || decision === 'request_changes' ? (input.reason ?? null) : null,
        ...(input.adminNotes ? { adminNotes: input.adminNotes } : {}),
      });
    }
    return { from: current, to: next };
  });

  if (to === 'approved') await setSellerContentVisibility(input.sellerId, true);
  let cancelledOrders = 0;
  if (to === 'suspended') {
    await setSellerContentVisibility(input.sellerId, false);
    cancelledOrders = await cancelOpenOrdersForSeller(input.sellerId, caller.uid);
  }

  await writeAudit({
    actorId: caller.uid,
    action: `seller.${decision}`,
    entityType: 'seller',
    entityId: input.sellerId,
    reason: input.reason ?? null,
    metadata: { from, to, cancelledOrders },
  });

  const notificationType = {
    approve: 'seller_approved',
    reject: 'seller_rejected',
    request_changes: 'seller_changes_requested',
    suspend: 'seller_suspended',
    reactivate: 'seller_reactivated',
    start_review: null,
  }[decision];
  if (notificationType) {
    await notify({
      userId: input.sellerId,
      type: notificationType as 'seller_approved',
      copy: templateFor(notificationType as 'seller_approved'),
      relatedEntityType: 'seller',
      relatedEntityId: input.sellerId,
    });
  }
  return { ok: true, status: to };
}
