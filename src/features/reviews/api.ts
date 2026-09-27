import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, orderBy, query, where } from 'firebase/firestore';
import type { ReportReason } from '@shared/constants';
import { db } from '@/services/firebase/app';
import { api } from '@/services/firebase/callables';
import type { Review } from '@/types/models';
import { fetchPage } from '../pagination';
import { qk } from '../queryKeys';

export function useSellerReviews(sellerId: string | undefined, pageSize = 10) {
  return useInfiniteQuery({
    queryKey: qk.sellerReviews(sellerId ?? ''),
    enabled: Boolean(sellerId),
    initialPageParam: null as number | null,
    queryFn: ({ pageParam }) =>
      fetchPage<Review>(
        query(
          collection(db, 'reviews'),
          where('sellerId', '==', sellerId),
          where('status', 'in', ['visible', 'flagged']),
          orderBy('createdAt', 'desc'),
        ),
        'createdAt',
        pageSize,
        pageParam,
      ),
    getNextPageParam: (last) => last.nextCursor,
    meta: { persist: true },
  });
}

/** Seller's own received reviews, including removed ones for transparency. */
export function useMyReceivedReviews(uid: string) {
  return useInfiniteQuery({
    queryKey: qk.myReviews(uid),
    enabled: Boolean(uid),
    initialPageParam: null as number | null,
    queryFn: ({ pageParam }) =>
      fetchPage<Review>(
        query(collection(db, 'reviews'), where('sellerId', '==', uid), orderBy('createdAt', 'desc')),
        'createdAt',
        15,
        pageParam,
      ),
    getNextPageParam: (last) => last.nextCursor,
  });
}

export function useSubmitReview() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { orderId: string; rating: number; comment?: string }) => api.submitReview(input),
    onSuccess: (_r, input) => {
      void client.invalidateQueries({ queryKey: qk.order(input.orderId) });
      void client.invalidateQueries({ queryKey: ['sellerReviews'] });
      void client.invalidateQueries({ queryKey: ['seller'] });
    },
  });
}

export function useRespondToReview(uid: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (input: { reviewId: string; response: string }) => api.respondToReview(input),
    onSuccess: () => void client.invalidateQueries({ queryKey: qk.myReviews(uid) }),
  });
}

export function useFlagReview() {
  return useMutation({
    mutationFn: (input: { reviewId: string; reason: ReportReason; description?: string }) => api.flagReview(input),
  });
}
