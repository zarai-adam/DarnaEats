import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { collection, count, doc, getAggregateFromServer, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { db } from '@/services/firebase/app';
import type { AppNotification } from '@/types/models';
import { fetchPage } from '../pagination';
import { qk } from '../queryKeys';

export function useNotifications(uid: string) {
  return useInfiniteQuery({
    queryKey: qk.notifications(uid),
    enabled: Boolean(uid),
    initialPageParam: null as number | null,
    queryFn: ({ pageParam }) =>
      fetchPage<AppNotification>(
        query(collection(db, 'notifications'), where('userId', '==', uid), orderBy('createdAt', 'desc')),
        'createdAt',
        20,
        pageParam,
      ),
    getNextPageParam: (last) => last.nextCursor,
  });
}

/** Unread badge count via a cheap server-side count aggregation. */
export function useUnreadNotificationCount(uid: string) {
  return useQuery({
    queryKey: qk.unreadNotifications(uid),
    enabled: Boolean(uid),
    staleTime: 60_000,
    queryFn: async () => {
      const snap = await getAggregateFromServer(
        query(collection(db, 'notifications'), where('userId', '==', uid), where('isRead', '==', false)),
        {
          count: count(),
        },
      );
      return snap.data().count;
    },
  });
}

export function useMarkNotificationRead(uid: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => updateDoc(doc(db, 'notifications', id), { isRead: true }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: qk.notifications(uid) });
      void client.invalidateQueries({ queryKey: qk.unreadNotifications(uid) });
    },
  });
}
