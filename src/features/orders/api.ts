import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getAggregateFromServer,
  count,
  onSnapshot,
  orderBy,
  query,
  sum,
  Timestamp,
  where,
} from 'firebase/firestore';
import { useEffect } from 'react';
import type { OrderStatus } from '@shared/constants';
import { db } from '@/services/firebase/app';
import { api, type PlaceOrderInput } from '@/services/firebase/callables';
import { fromDocOrNull } from '@/services/firebase/converters';
import type { Order } from '@/types/models';
import { fetchPage } from '../pagination';
import { qk } from '../queryKeys';

const PAGE = 15;

export function useBuyerOrders(uid: string) {
  return useInfiniteQuery({
    queryKey: qk.buyerOrders(uid),
    enabled: Boolean(uid),
    initialPageParam: null as number | null,
    queryFn: ({ pageParam }) =>
      fetchPage<Order>(
        query(collection(db, 'orders'), where('buyerId', '==', uid), orderBy('createdAt', 'desc')),
        'createdAt',
        PAGE,
        pageParam,
      ),
    getNextPageParam: (last) => last.nextCursor,
    meta: { persist: true },
  });
}

export type SellerOrderFilter = 'active' | 'pending' | 'completed' | 'cancelled' | 'all';

const FILTER_STATUSES: Record<SellerOrderFilter, OrderStatus[] | null> = {
  active: ['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'disputed'],
  pending: ['pending'],
  completed: ['completed'],
  cancelled: ['cancelled'],
  all: null,
};

export function useSellerOrders(uid: string, filter: SellerOrderFilter) {
  return useInfiniteQuery({
    queryKey: qk.sellerOrders(uid, filter),
    enabled: Boolean(uid),
    initialPageParam: null as number | null,
    queryFn: ({ pageParam }) => {
      const statuses = FILTER_STATUSES[filter];
      const base = query(
        collection(db, 'orders'),
        where('sellerId', '==', uid),
        ...(statuses ? [where('status', 'in', statuses)] : []),
        orderBy('createdAt', 'desc'),
      );
      return fetchPage<Order>(base, 'createdAt', PAGE, pageParam);
    },
    getNextPageParam: (last) => last.nextCursor,
  });
}

/**
 * Live order document. A listener is used here (and only while the screen is
 * mounted) because buyers watch status changes in real time.
 */
export function useOrder(id: string | undefined) {
  const client = useQueryClient();
  const result = useQuery({
    queryKey: qk.order(id ?? ''),
    enabled: Boolean(id),
    queryFn: () =>
      new Promise<Order | null>((resolve, reject) => {
        const unsub = onSnapshot(
          doc(db, 'orders', id!),
          (snap) => {
            unsub();
            resolve(fromDocOrNull<Order>(snap));
          },
          reject,
        );
      }),
    meta: { persist: true },
  });

  useEffect(() => {
    if (!id) return undefined;
    return onSnapshot(
      doc(db, 'orders', id),
      (snap) => client.setQueryData(qk.order(id), fromDocOrNull<Order>(snap)),
      () => undefined,
    );
  }, [id, client]);

  return result;
}

export function usePlaceOrder(uid: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: PlaceOrderInput) => api.placeOrder(input),
    onSuccess: (_result, input) => {
      void client.invalidateQueries({ queryKey: qk.buyerOrders(uid) });
      void client.invalidateQueries({ queryKey: qk.sellerDishes(input.sellerId) });
      input.items.forEach((item) => void client.invalidateQueries({ queryKey: qk.dish(item.dishId) }));
    },
  });
}

export function useUpdateOrderStatus() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { orderId: string; status: OrderStatus; reason?: string; sellerNotes?: string }) =>
      api.updateOrderStatus(input),
    onSuccess: (_r, input) => {
      void client.invalidateQueries({ queryKey: qk.order(input.orderId) });
      void client.invalidateQueries({ queryKey: ['sellerOrders'] });
      void client.invalidateQueries({ queryKey: ['buyerOrders'] });
    },
  });
}

export interface EarningsSummary {
  today: { total: number; count: number };
  week: { total: number; count: number };
  month: { total: number; count: number };
  allTime: { total: number; count: number };
  pendingCount: number;
}

/** Server-side aggregations: a handful of reads regardless of order volume. */
export function useSellerEarnings(uid: string) {
  return useQuery({
    queryKey: qk.earnings(uid),
    enabled: Boolean(uid),
    staleTime: 60_000,
    queryFn: async (): Promise<EarningsSummary> => {
      const completed = query(
        collection(db, 'orders'),
        where('sellerId', '==', uid),
        where('status', '==', 'completed'),
      );
      const since = (days: number) => Timestamp.fromMillis(Date.now() - days * 86_400_000);
      const agg = async (days: number | null) => {
        const q = days === null ? completed : query(completed, where('completedAt', '>=', since(days)));
        const snap = await getAggregateFromServer(q, { total: sum('total'), count: count() });
        return { total: snap.data().total ?? 0, count: snap.data().count };
      };
      const pending = await getAggregateFromServer(
        query(collection(db, 'orders'), where('sellerId', '==', uid), where('status', '==', 'pending')),
        { count: count() },
      );
      const [today, week, month, allTime] = await Promise.all([agg(1), agg(7), agg(30), agg(null)]);
      return { today, week, month, allTime, pendingCount: pending.data().count };
    },
  });
}
