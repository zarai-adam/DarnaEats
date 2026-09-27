import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/services/firebase/app';
import { fromDoc, fromDocOrNull } from '@/services/firebase/converters';
import type { DishFormValues } from '@/schemas/dish';
import type { Dish } from '@/types/models';
import { qk } from '../queryKeys';

const publicFilters = [
  where('sellerApproved', '==', true),
  where('isActive', '==', true),
  where('isHidden', '==', false),
];

export function useDish(id: string | undefined) {
  return useQuery({
    queryKey: qk.dish(id ?? ''),
    enabled: Boolean(id),
    queryFn: async () => fromDocOrNull<Dish>(await getDoc(doc(db, 'dishes', id!))),
    staleTime: 60_000,
    meta: { persist: true },
  });
}

export function useSellerPublicDishes(sellerId: string | undefined) {
  return useQuery({
    queryKey: qk.sellerDishes(sellerId ?? ''),
    enabled: Boolean(sellerId),
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, 'dishes'), where('sellerId', '==', sellerId), ...publicFilters, limit(60)),
      );
      return snap.docs.map((d) => fromDoc<Dish>(d)).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
    },
    staleTime: 60_000,
    meta: { persist: true },
  });
}

export function useLatestDishes(governorateId: string | null, max = 20) {
  return useQuery({
    queryKey: qk.latestDishes(governorateId),
    queryFn: async () => {
      const constraints = governorateId ? [where('governorateId', '==', governorateId)] : [];
      const snap = await getDocs(
        query(collection(db, 'dishes'), ...publicFilters, ...constraints, orderBy('createdAt', 'desc'), limit(max)),
      );
      return snap.docs.map((d) => fromDoc<Dish>(d));
    },
    staleTime: 2 * 60_000,
    meta: { persist: true },
  });
}

export function useMyDishes(uid: string) {
  return useQuery({
    queryKey: qk.myDishes(uid),
    enabled: Boolean(uid),
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, 'dishes'), where('sellerId', '==', uid), orderBy('createdAt', 'desc'), limit(100)),
      );
      return snap.docs.map((d) => fromDoc<Dish>(d));
    },
  });
}

/** Converts form values into the exact document shape allowed by the rules. */
export function dishPayload(values: DishFormValues, imageUrls: string[]) {
  return {
    categoryId: values.categoryId,
    nameAr: values.nameAr.trim(),
    nameFr: values.nameFr.trim(),
    descriptionAr: values.descriptionAr.trim(),
    descriptionFr: values.descriptionFr.trim(),
    imageUrls,
    price: Math.round(values.price * 1000) / 1000,
    currency: 'TND' as const,
    portionDescriptionAr: values.portionDescriptionAr.trim(),
    portionDescriptionFr: values.portionDescriptionFr.trim(),
    availableQuantity: values.availableQuantity,
    preparationTimeMinutes: values.preparationTimeMinutes,
    availabilityType: values.isPreOrder ? ('preorder' as const) : values.availabilityType,
    availableFrom: values.useTimeWindow ? values.availableFrom || null : null,
    availableUntil: values.useTimeWindow ? values.availableUntil || null : null,
    isDailyMenuItem: values.isDailyMenuItem,
    isPreOrder: values.isPreOrder,
    preOrderCutoffAt:
      values.isPreOrder && values.preOrderCutoffAt ? Timestamp.fromMillis(values.preOrderCutoffAt) : null,
    leadTimeHours: values.isPreOrder ? values.leadTimeHours : null,
    spiceLevel: values.spiceLevel,
    dietaryTags: values.dietaryTags,
    allergens: values.allergens,
    allergensDeclared: values.allergensDeclared,
    isActive: values.isActive,
    updatedAt: serverTimestamp(),
  };
}

export function useSaveDish(uid: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values, imageUrls }: { id?: string; values: DishFormValues; imageUrls: string[] }) => {
      const payload = dishPayload(values, imageUrls);
      if (id) {
        await updateDoc(doc(db, 'dishes', id), payload);
        return id;
      }
      const ref = await addDoc(collection(db, 'dishes'), {
        ...payload,
        sellerId: uid,
        isHidden: false,
        sellerApproved: true,
        createdAt: serverTimestamp(),
      });
      return ref.id;
    },
    onSuccess: (id) => {
      void client.invalidateQueries({ queryKey: qk.myDishes(uid) });
      void client.invalidateQueries({ queryKey: qk.dish(id) });
      void client.invalidateQueries({ queryKey: qk.sellerDishes(uid) });
    },
  });
}

export function useQuickDishUpdate(uid: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      changes,
    }: {
      id: string;
      changes: Partial<Pick<Dish, 'isActive' | 'availableQuantity'>>;
    }) => {
      await updateDoc(doc(db, 'dishes', id), { ...changes, updatedAt: serverTimestamp() });
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: qk.myDishes(uid) }),
  });
}

export function useDeleteDish(uid: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDoc(doc(db, 'dishes', id)),
    onSuccess: () => void client.invalidateQueries({ queryKey: qk.myDishes(uid) }),
  });
}
