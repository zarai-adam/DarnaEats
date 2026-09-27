import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/services/firebase/app';
import { fromDoc } from '@/services/firebase/converters';
import type { Favorite } from '@/types/models';
import { qk } from '../queryKeys';

export function favoriteId(uid: string, targetType: 'seller' | 'dish', targetId: string) {
  return `${uid}_${targetType}_${targetId}`;
}

export function useFavorites(uid: string) {
  return useQuery({
    queryKey: qk.favorites(uid),
    enabled: Boolean(uid),
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, 'favorites'), where('buyerId', '==', uid), orderBy('createdAt', 'desc'), limit(100)),
      );
      return snap.docs.map((d) => fromDoc<Favorite>(d));
    },
    staleTime: 5 * 60_000,
    meta: { persist: true },
  });
}

export function useToggleFavorite(uid: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      targetType: 'seller' | 'dish';
      targetId: string;
      sellerId: string;
      title: string;
      isFavorite: boolean;
    }) => {
      const id = favoriteId(uid, input.targetType, input.targetId);
      if (input.isFavorite) {
        await deleteDoc(doc(db, 'favorites', id));
      } else {
        await setDoc(doc(db, 'favorites', id), {
          buyerId: uid,
          targetType: input.targetType,
          targetId: input.targetId,
          sellerId: input.sellerId,
          title: input.title.slice(0, 120),
          createdAt: serverTimestamp(),
        });
      }
    },
    onSuccess: () => void client.invalidateQueries({ queryKey: qk.favorites(uid) }),
  });
}
