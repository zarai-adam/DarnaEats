import type { DocumentData } from 'firebase-admin/firestore';
import { buildSearchTokens } from '../shared/text';
import { writeAudit } from '../lib/audit';
import { requirePermission, type Caller } from '../lib/context';
import { fail, parseInput } from '../lib/errors';
import { db, FieldValue } from '../lib/firebase';
import { setDishHiddenSchema } from '../lib/schemas';

export async function setDishHidden(caller: Caller, raw: unknown) {
  const input = parseInput(setDishHiddenSchema, raw);
  requirePermission(caller, 'dish.hide');
  const ref = db.collection('dishes').doc(input.dishId);
  const snap = await ref.get();
  if (!snap.exists) fail('not-found', 'dish/not-found');
  await ref.update({
    isHidden: input.hidden,
    hiddenReason: input.hidden ? input.reason : null,
    updatedAt: FieldValue.serverTimestamp(),
  });
  await writeAudit({
    actorId: caller.uid,
    action: input.hidden ? 'dish.hide' : 'dish.unhide',
    entityType: 'dish',
    entityId: input.dishId,
    reason: input.reason,
    metadata: { sellerId: snap.get('sellerId') },
  });
  return { ok: true };
}

export interface SellerDenormalized {
  sellerName: string;
  sellerRating: number;
  sellerReviewCount: number;
  serviceAreaId: string | null;
  cityId: string | null;
  governorateId: string | null;
  approximateLatitude: number | null;
  approximateLongitude: number | null;
  pickupAvailable: boolean;
  selfDeliveryAvailable: boolean;
}

export function sellerDenormalized(seller: DocumentData | undefined): SellerDenormalized {
  return {
    sellerName: seller?.displayName ?? '',
    sellerRating: seller?.averageRating ?? 0,
    sellerReviewCount: seller?.reviewCount ?? 0,
    serviceAreaId: seller?.serviceAreaId ?? null,
    cityId: seller?.cityId ?? null,
    governorateId: seller?.governorateId ?? null,
    approximateLatitude: seller?.approximateLatitude ?? null,
    approximateLongitude: seller?.approximateLongitude ?? null,
    pickupAvailable: seller?.pickupAvailable === true,
    selfDeliveryAvailable: seller?.selfDeliveryAvailable === true,
  };
}

/** Server-maintained dish fields used for discovery and search. */
export function computeDishDerived(dish: DocumentData, seller: DocumentData | undefined, categorySlug: string | null) {
  const denorm = sellerDenormalized(seller);
  const searchTokens = buildSearchTokens([
    dish.nameAr,
    dish.nameFr,
    denorm.sellerName,
    categorySlug,
    ...((seller?.specialties as string[] | undefined) ?? []),
    ...((dish.dietaryTags as string[] | undefined) ?? []),
  ]);
  return { ...denorm, searchTokens, sellerApproved: seller?.status === 'approved' };
}

export function derivedChanged(current: DocumentData, next: Record<string, unknown>): boolean {
  return Object.entries(next).some(
    ([key, value]) => JSON.stringify(current[key] ?? null) !== JSON.stringify(value ?? null),
  );
}
