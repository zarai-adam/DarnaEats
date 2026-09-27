import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import type { MenuStatus } from '@shared/constants';
import { tunisDateKey } from '@shared/time';
import { db } from '@/services/firebase/app';
import { fromDoc, fromDocOrNull } from '@/services/firebase/converters';
import type { Menu } from '@/types/models';
import { qk } from '../queryKeys';

/** Today's published daily menus (one query thanks to denormalised dish summaries). */
export function useTodayMenus(max = 30) {
  const date = tunisDateKey();
  return useQuery({
    queryKey: qk.todayMenus(date),
    queryFn: async () => {
      const snap = await getDocs(
        query(
          collection(db, 'menus'),
          where('date', '==', date),
          where('status', '==', 'published'),
          where('sellerApproved', '==', true),
          limit(max),
        ),
      );
      return snap.docs.map((d) => fromDoc<Menu>(d));
    },
    staleTime: 5 * 60_000,
    meta: { persist: true },
  });
}

export function useMyMenus(uid: string) {
  return useQuery({
    queryKey: qk.myMenus(uid),
    enabled: Boolean(uid),
    queryFn: async () => {
      const snap = await getDocs(
        query(collection(db, 'menus'), where('sellerId', '==', uid), orderBy('date', 'desc'), limit(30)),
      );
      return snap.docs.map((d) => fromDoc<Menu>(d));
    },
  });
}

export function useMenu(id: string | undefined) {
  return useQuery({
    queryKey: qk.menu(id ?? ''),
    enabled: Boolean(id),
    queryFn: async () => fromDocOrNull<Menu>(await getDoc(doc(db, 'menus', id!))),
  });
}

export interface MenuInput {
  date: string;
  titleAr: string;
  titleFr: string;
  descriptionAr: string;
  descriptionFr: string;
  dishIds: string[];
  status: MenuStatus;
}

export function useSaveMenu(uid: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id?: string; input: MenuInput }) => {
      if (id) {
        await updateDoc(doc(db, 'menus', id), { ...input, updatedAt: serverTimestamp() });
        return id;
      }
      // One menu per seller per day keeps the feed simple.
      const menuId = `${uid}_${input.date}`;
      await setDoc(doc(db, 'menus', menuId), {
        ...input,
        sellerId: uid,
        sellerApproved: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return menuId;
    },
    onSuccess: (id) => {
      void client.invalidateQueries({ queryKey: qk.myMenus(uid) });
      void client.invalidateQueries({ queryKey: qk.menu(id) });
    },
  });
}

export function useDeleteMenu(uid: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDoc(doc(db, 'menus', id)),
    onSuccess: () => void client.invalidateQueries({ queryKey: qk.myMenus(uid) }),
  });
}
